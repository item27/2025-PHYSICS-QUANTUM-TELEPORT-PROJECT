import PhysicsIcon, { PhysicsIconName } from '@components/icons/PhysicsIcon';
import './steps.css';

export type Step = {
  key: string;
  title: string;
  description: string;
};

interface Props {
  steps: Step[];
  activeIndex: number;
}

const stepIcon: Record<string, PhysicsIconName> = {
  entangle: 'entangle',
  combine: 'state',
  measure: 'measure',
  send: 'classical',
  reconstruct: 'correction',
  complete: 'state',
};

const stepTone: Record<string, 'quantum' | 'classical' | 'warning'> = {
  entangle: 'quantum',
  combine: 'quantum',
  measure: 'warning',
  send: 'classical',
  reconstruct: 'quantum',
  complete: 'classical',
};

function TeleportationSteps({ steps, activeIndex }: Props) {
  return (
    <div className="steps">
      {steps.map((step, index) => (
        <div
          key={step.key}
          className={`step ${index === activeIndex ? 'step--active' : ''}`}
          data-step-key={step.key}
        >
          <div className="step-index">{index + 1}</div>
          <div className="step-body">
            <div className={`step-icon step-icon--${stepTone[step.key] ?? 'quantum'}`}>
              <PhysicsIcon name={stepIcon[step.key] ?? 'state'} tone={stepTone[step.key] ?? 'quantum'} />
            </div>
            <div>
              <p className="step-title">{step.title}</p>
              <p className="step-description">{step.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TeleportationSteps;
