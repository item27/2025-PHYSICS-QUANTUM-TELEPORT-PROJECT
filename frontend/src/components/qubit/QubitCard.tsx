import BlochSphere from '@components/visuals/BlochSphere';
import './qubit.css';

export type QubitView = {
  id: string;
  role: 'alice' | 'bob' | 'charlie';
  state: string;
  bloch: {
    theta: number;
    phi: number;
    radius?: number;
  };
};

const roleLabels: Record<QubitView['role'], string> = {
  alice: 'Алиса',
  bob: 'Боб',
  charlie: 'Чарли',
};

const roleAccent: Record<QubitView['role'], string> = {
  alice: '#7c3aed',
  bob: '#10b981',
  charlie: '#38bdf8',
};

interface Props {
  qubit: QubitView;
  emphasis?: boolean;
  phaseActive?: boolean;
  decoherence?: boolean;
  hint?: string;
  depth?: 'active' | 'idle';
  showBloch?: boolean;
}

function QubitCard({ qubit, emphasis, phaseActive, decoherence, hint, depth, showBloch }: Props) {
  return (
    <div
      className={`qubit-card${emphasis ? ' qubit-card--emphasis' : ''}${
        phaseActive ? ' qubit-card--phase' : ''
      }${decoherence ? ' qubit-card--decoherence' : ''}${
        depth ? ` qubit-card--${depth}` : ''
      }`}
    >
      <div className="qubit-phase-ring" aria-hidden />
      <div className="qubit-header" style={{ borderColor: roleAccent[qubit.role] }}>
        <div className="qubit-dot" style={{ background: roleAccent[qubit.role] }} />
        <div>
          <p className="qubit-label">{roleLabels[qubit.role]}</p>
          <p className="qubit-id">Кубит {qubit.id}</p>
        </div>
      </div>
      {showBloch ? (
        <BlochSphere
          label={phaseActive ? 'Фаза жива' : decoherence ? 'Коллапс' : 'Реальное состояние'}
          state={qubit.bloch}
          active={phaseActive}
          collapsed={decoherence}
        />
      ) : null}
      <p className="qubit-state">{qubit.state}</p>
      {hint ? <p className="qubit-hint">{hint}</p> : null}
    </div>
  );
}

export default QubitCard;
