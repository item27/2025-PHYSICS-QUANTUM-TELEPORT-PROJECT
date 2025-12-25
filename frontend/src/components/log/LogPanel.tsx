import './log.css';

interface Props {
  entries: string[];
}

function LogPanel({ entries }: Props) {
  return (
    <div className="log-panel">
      <div className="log-header">
        <p className="log-title">Журнал событий</p>
        <p className="log-subtitle">Сервер и клиент фиксируют ключевые моменты протокола.</p>
      </div>
      <ul className="log-list">
        {entries.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default LogPanel;
