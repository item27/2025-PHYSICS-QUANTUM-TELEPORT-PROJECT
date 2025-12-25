import './theme-toggle.css';

interface Props {
  theme: 'dark' | 'light';
  onToggle: (theme: 'dark' | 'light') => void;
}

function ThemeToggle({ theme, onToggle }: Props) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const label = theme === 'dark' ? 'Тёмная' : 'Светлая';

  return (
    <button className="theme-toggle ghost" type="button" onClick={() => onToggle(nextTheme)}>
      <span className="theme-indicator" aria-hidden>
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
      <span>Тема: {label}</span>
    </button>
  );
}

export default ThemeToggle;
