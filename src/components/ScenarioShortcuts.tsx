import { SCENARIOS } from '../model/scenarios';
import { useActiveScenarioId, useStore } from '../state/store';

/**
 * Quick-configure scenario shortcuts shown under the bill meter. Each is a
 * dotted-underline link that loads a preset of the existing inputs; the active
 * one (current config matches a preset) is rendered as a solid chip instead.
 */
export default function ScenarioShortcuts() {
  const applyScenario = useStore((s) => s.applyScenario);
  const activeId = useActiveScenarioId();

  return (
    <div className="scenarios" role="group" aria-label="Quick scenarios">
      <span className="scenarios__label">Scenarios</span>
      <div className="scenarios__links">
        {SCENARIOS.map((scenario) => {
          const active = scenario.id === activeId;
          return (
            <button
              key={scenario.id}
              type="button"
              className={`scenario-link${active ? ' is-active' : ''}`}
              aria-pressed={active}
              title={scenario.description}
              onClick={() => applyScenario(scenario.id)}
            >
              {scenario.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
