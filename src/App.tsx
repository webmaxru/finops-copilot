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
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden>
              ◈
            </span>
            <h1 className="brand-name">Copilot Enterprise Spend Simulator</h1>
            <span className="brand-sub">FinOps · the meter</span>
          </div>
          <div className="topbar-actions">
            <PromoControl />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="app-inner">
        <section className="hero reveal">
          <div className="hero-intro">
            <div>
              <p className="eyebrow">GitHub Copilot · enterprise spend</p>
              <p className="hero-slogan">
                Model a month of GitHub Copilot AI-credit spend across cost centers — size the included
                pool, set budgets and per-user limits, and see exactly where usage meters or gets blocked.
              </p>
            </div>
            <StatusBar />
          </div>
          <KpiCards />
        </section>

        <div className="app-grid">
          <div className="col col-left reveal-2">
            <GlobalControls />
          </div>
          <div className="col col-main reveal-3">
            <BurndownChart />
            <CostCenterList />
            <CostCenterCharts />
            <Warnings />
          </div>
        </div>
      </main>
    </div>
  );
}
