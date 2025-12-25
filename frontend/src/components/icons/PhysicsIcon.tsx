import './physics-icon.css';

export type PhysicsIconName =
  | 'entangle'
  | 'measure'
  | 'classical'
  | 'correction'
  | 'state';

interface Props {
  name: PhysicsIconName;
  size?: number;
  tone?: 'quantum' | 'classical' | 'warning';
}

function PhysicsIcon({ name, size = 18, tone = 'quantum' }: Props) {
  const stroke = tone === 'classical' ? '#f59e0b' : tone === 'warning' ? '#f87171' : '#7c3aed';

  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'physics-icon',
  };

  switch (name) {
    case 'entangle':
      return (
        <svg {...common}>
          <path d="M5 12c0-3.5 2.2-6.5 5-6.5s5 3 5 6.5-2.2 6.5-5 6.5S5 15.5 5 12Z" />
          <path d="M9 12c0-3.5 2.2-6.5 5-6.5S19 8.5 19 12s-2.2 6.5-5 6.5S9 15.5 9 12Z" />
          <circle cx="9" cy="12" r="0.8" />
          <circle cx="15" cy="12" r="0.8" />
        </svg>
      );
    case 'measure':
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="10" rx="2" />
          <path d="M8 10h8" />
          <path d="M12 8v6" />
          <circle cx="12" cy="16.5" r="1.2" />
        </svg>
      );
    case 'classical':
      return (
        <svg {...common}>
          <path d="M5 9h14" />
          <path d="M9 6h6" />
          <path d="M7 12h10" />
          <path d="M9 15h6" />
        </svg>
      );
    case 'correction':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="6" />
          <path d="M12 6v4m0 4v4" />
          <path d="M9 12h6" />
          <path d="M14.5 9.5 18 6" />
        </svg>
      );
    case 'state':
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 5c2 1.5 2 12.5 0 14" />
          <path d="M5 12h14" />
        </svg>
      );
  }
}

export default PhysicsIcon;
