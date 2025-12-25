import './mode-switcher.css';

interface Props {
  mode: 'demo' | 'network';
  onChange: (mode: 'demo' | 'network') => void;
}

function ModeSwitcher({ mode, onChange }: Props) {
  return (
    <div className="mode-switcher">
      <button
        type="button"
        className={mode === 'demo' ? 'active' : ''}
        onClick={() => onChange('demo')}
      >
        Демонстрация
      </button>
      <button
        type="button"
        className={mode === 'network' ? 'active' : ''}
        onClick={() => onChange('network')}
      >
        Сетевой режим
      </button>
    </div>
  );
}

export default ModeSwitcher;
