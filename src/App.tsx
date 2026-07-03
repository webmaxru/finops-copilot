import GlobalControls from './components/GlobalControls';
import CostCenterList from './components/CostCenterList';
import KpiCards from './components/KpiCards';
import BurndownChart from './components/BurndownChart';
import Timeline from './components/Timeline';
import CostCenterCharts from './components/CostCenterCharts';
import Warnings from './components/Warnings';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Copilot Enterprise Spend Simulator</h1>
        <p className="muted">
          Simulate monthly GitHub Copilot spend for Business + Enterprise seats across cost centers.
          Adjust the inputs, then press play to watch the included credit pool drain and metered cost
          grow until it hits your limits.
        </p>
      </header>

      <div className="app-grid">
        <div className="col col-left">
          <GlobalControls />
          <CostCenterList />
        </div>
        <div className="col col-main">
          <KpiCards />
          <BurndownChart />
          <Timeline />
          <CostCenterCharts />
          <Warnings />
        </div>
      </div>
    </div>
  );
}
