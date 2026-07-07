#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Pull GitHub Copilot FinOps Simulator engagement analytics from Azure
    Application Insights to the terminal, and/or open the dashboard in the portal.

.DESCRIPTION
    Runs a set of KQL queries against the cookieless Application Insights resource
    and prints them as tables. With -Open it also launches the Azure Portal
    dashboard in your browser. Requires the Azure CLI (`az login`) and the
    application-insights extension (auto-installed on first use).

.EXAMPLE
    pwsh scripts/analytics.ps1                # engagement summary, last 30 days
    pwsh scripts/analytics.ps1 -Days 7        # last 7 days
    pwsh scripts/analytics.ps1 -Open          # print summary AND open the dashboard
    pwsh scripts/analytics.ps1 -OpenOnly      # just open the dashboard
#>
[CmdletBinding()]
param(
    [int]$Days = 30,
    [switch]$Open,
    [switch]$OpenOnly,
    [string]$ResourceGroup = 'finops-copilot-rg',
    [string]$AppInsights   = 'finops-copilot-ai',
    [string]$DashboardName = 'finops-copilot-engagement'
)

$ErrorActionPreference = 'Stop'

function Get-Az([string[]]$AzArgs) {
    # Capture stdout only (discard stderr) so CLI warnings never corrupt JSON parsing.
    $out = & az @AzArgs 2>$null
    if ($LASTEXITCODE -ne 0) { throw "az $($AzArgs -join ' ') failed (exit $LASTEXITCODE)" }
    return ($out | Out-String).Trim()
}

Write-Host 'Resolving Application Insights resource...' -ForegroundColor DarkGray
$appId  = Get-Az @('monitor','app-insights','component','show','--app',$AppInsights,'-g',$ResourceGroup,'--query','appId','-o','tsv')
$subId  = Get-Az @('account','show','--query','id','-o','tsv')
$tenant = Get-Az @('account','show','--query','tenantId','-o','tsv')

$dashboardId  = "/subscriptions/$subId/resourceGroups/$ResourceGroup/providers/Microsoft.Portal/dashboards/$DashboardName"
$dashboardUrl = "https://portal.azure.com/#@$tenant/dashboard/arm$dashboardId"

function Open-Dashboard {
    Write-Host "Opening dashboard: $dashboardUrl" -ForegroundColor Green
    Start-Process $dashboardUrl
}

if ($OpenOnly) { Open-Dashboard; return }

# name = 'key' extraction pulls the property off customDimensions; single quotes
# keep the KQL free of escaping so it round-trips cleanly through the CLI.
$queries = @(
    @{ Title = 'Overview (page views, sessions, events)';
       Query = "union pageViews, customEvents | summarize PageViews=countif(itemType=='pageView'), Events=countif(itemType=='customEvent'), Sessions=dcount(session_Id), Countries=dcount(client_CountryOrRegion)" },
    @{ Title = 'Engagement per visit (events/session, dwell seconds)';
       Query = "union pageViews, customEvents | summarize events=count(), start=min(timestamp), stop=max(timestamp) by session_Id | extend dwellSec=datetime_diff('second', stop, start) | summarize Sessions=count(), MedianEventsPerSession=percentile(events,50), MedianDwellSec=percentile(dwellSec,50), AvgDwellSec=round(avg(dwellSec),1)" },
    @{ Title = 'Key events (by name)';
       Query = "customEvents | summarize Events=count(), Sessions=dcount(session_Id) by Event=name | sort by Events desc" },
    @{ Title = 'Most-adjusted inputs';
       Query = "customEvents | where name == 'Input Changed' | summarize Changes=count() by Input=tostring(customDimensions.key) | sort by Changes desc" },
    @{ Title = 'Scenarios applied';
       Query = "customEvents | where name == 'Scenario Applied' | summarize Applied=count() by Scenario=tostring(customDimensions.scenarioId) | sort by Applied desc" },
    @{ Title = 'Cost-center actions';
       Query = "customEvents | where name startswith 'Cost Center' | summarize Count=count() by Action=name | sort by Count desc" },
    @{ Title = 'Outbound clicks';
       Query = "customEvents | where name == 'Outbound Click' | summarize Clicks=count() by Target=tostring(customDimensions.label) | sort by Clicks desc" },
    @{ Title = 'Sessions per day';
       Query = "union pageViews, customEvents | summarize Sessions=dcount(session_Id), Events=count() by Day=bin(timestamp, 1d) | sort by Day asc" },
    @{ Title = 'Top countries';
       Query = "pageViews | summarize Sessions=dcount(session_Id) by Country=client_CountryOrRegion | sort by Sessions desc | take 15" },
    @{ Title = 'Browser & OS';
       Query = "pageViews | summarize Sessions=dcount(session_Id) by Browser=client_Browser, OS=client_OS | sort by Sessions desc | take 20" }
)

Write-Host ("`nGitHub Copilot FinOps Simulator - engagement (last {0} days)" -f $Days) -ForegroundColor White
Write-Host ("App Insights: {0}  |  RG: {1}" -f $AppInsights, $ResourceGroup) -ForegroundColor DarkGray

foreach ($q in $queries) {
    Write-Host "`n== $($q.Title) ==" -ForegroundColor Cyan
    try {
        $json = Get-Az @('monitor','app-insights','query','--app',$appId,'--analytics-query',$q.Query,'--offset',"$($Days)d",'-o','json')
        $table = ($json | ConvertFrom-Json).tables[0]
        if (-not $table -or $table.rows.Count -eq 0) {
            Write-Host '  (no data yet)' -ForegroundColor DarkGray
            continue
        }
        $cols = @($table.columns.name)
        $rows = foreach ($row in $table.rows) {
            $o = [ordered]@{}
            for ($i = 0; $i -lt $cols.Count; $i++) { $o[$cols[$i]] = $row[$i] }
            [pscustomobject]$o
        }
        ($rows | Format-Table -AutoSize | Out-String).TrimEnd() | Write-Host
    }
    catch {
        Write-Host "  query failed: $_" -ForegroundColor Red
    }
}

Write-Host "`nDashboard: $dashboardUrl" -ForegroundColor DarkGray
if ($Open) { Open-Dashboard }
