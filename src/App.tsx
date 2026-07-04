import GlobalControls from './components/GlobalControls';
import CostCenterList from './components/CostCenterList';
import KpiCards from './components/KpiCards';
import BurndownChart from './components/BurndownChart';
import CostCenterCharts from './components/CostCenterCharts';
import Warnings from './components/Warnings';
import StatusBar from './components/StatusBar';
import ThemeToggle from './components/ThemeToggle';
import PromoControl from './components/PromoControl';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>Copilot Enterprise Spend Simulator</h1>
          <div className="header-actions">
            <PromoControl />
            <ThemeToggle />
          </div>
        </div>
        <p className="slogan muted">
          Model a month of GitHub Copilot AI-credit spend across cost centers — size the included pool,
          set budgets and per-user limits, and see exactly where usage meters or gets blocked.
        </p>
        <StatusBar />
      </header>

      <div className="app-grid">
        <div className="col col-left">
          <GlobalControls />
        </div>
        <div className="col col-main">
          <KpiCards />
          <BurndownChart />
          <CostCenterList />
          <CostCenterCharts />
          <Warnings />
        </div>
      </div>
    </div>
  );
}
