import './circuit.css';
import { QubitView } from '../qubit/QubitCard';

type StepKey =
  | 'entangle'
  | 'combine'
  | 'measure'
  | 'send'
  | 'reconstruct'
  | 'complete'
  | string;

interface Props {
  qubits: QubitView[];
  stepLabel: string;
  stepKey?: StepKey;
}

const roleAccent: Record<QubitView['role'], string> = {
  alice: '#7c3aed',
  bob: '#10b981',
};

const roleTitle: Record<QubitView['role'], string> = {
  alice: 'Алиса',
  bob: 'Боб',
};

type Connection = {
  id: string;
  from: QubitView['role'];
  to: QubitView['role'];
  label: string;
  active: boolean;
};

function resolveConnections(stepKey?: StepKey): Connection[] {
  return [
    {
      id: 'alice-bob-entangle',
      from: 'alice',
      to: 'bob',
      label: 'Запутанная пара',
      active: stepKey === 'entangle' || stepKey === 'combine',
    },
    {
      id: 'alice-bob-classical',
      from: 'alice',
      to: 'bob',
      label: 'Классические биты',
      active: stepKey === 'send',
    },
    {
      id: 'bob-result',
      from: 'bob',
      to: 'alice',
      label: 'Коррекция по результатам',
      active: stepKey === 'reconstruct' || stepKey === 'complete',
    },
  ];
}

function CircuitView({ qubits, stepLabel, stepKey }: Props) {
  const roles = new Set(qubits.map((q) => q.role));
  const connections = resolveConnections(stepKey).filter(
    (conn) => roles.has(conn.from) && roles.has(conn.to)
  );
  const entanglementActive =
    stepKey === 'entangle' || stepKey === 'combine' || stepKey === 'reconstruct' || stepKey === 'complete';

  return (
    <div className={`circuit circuit--${stepKey ?? 'idle'}`}>
      <div className={`circuit-field ${entanglementActive ? 'circuit-field--active' : ''}`} aria-hidden />
      <div className="circuit-header">
        <div>
          <p className="circuit-title">Визуализация связей</p>
          <p className="circuit-subtitle">Линии показывают, кто взаимодействует на выбранном шаге.</p>
        </div>
        <span className="circuit-step">{stepLabel}</span>
      </div>
      <div className="circuit-grid">
        {connections.map((conn) => (
          <div key={conn.id} className={`circuit-track ${conn.active ? 'active' : ''}`}>
            <div className="circuit-endpoint">
              <span className="circuit-node" style={{ background: roleAccent[conn.from] }} />
              <span className="circuit-role">{roleTitle[conn.from]}</span>
            </div>
            <div className="circuit-line">
              <span className="circuit-line-glow" />
              <span className="circuit-line-body" style={{ background: `linear-gradient(90deg, ${roleAccent[conn.from]}, ${roleAccent[conn.to]})` }} />
            </div>
            <div className="circuit-endpoint">
              <span className="circuit-node" style={{ background: roleAccent[conn.to] }} />
              <span className="circuit-role">{roleTitle[conn.to]}</span>
            </div>
            <div className="circuit-label">{conn.label}</div>
          </div>
        ))}
      </div>
      <div className="circuit-footnote">Контуры меняются в зависимости от шага, чтобы показать активные участки.</div>
    </div>
  );
}

export default CircuitView;
