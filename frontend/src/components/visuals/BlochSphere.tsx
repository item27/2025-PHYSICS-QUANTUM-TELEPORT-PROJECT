import './bloch.css';

type BlochVector = {
  theta: number;
  phi: number;
};

interface Props {
  label: string;
  state: BlochVector;
  active?: boolean;
  collapsed?: boolean;
}

const tau = Math.PI * 2;
const toDegrees = (rad: number) => Math.round((rad * 180) / Math.PI);

function project(vector: BlochVector, radius: number, center: number) {
  const x = Math.sin(vector.theta) * Math.cos(vector.phi);
  const y = Math.sin(vector.theta) * Math.sin(vector.phi);
  const px = center + x * radius;
  const py = center - y * radius;

  return { x: px, y: py };
}

function BlochSphere({ label, state, active, collapsed }: Props) {
  const size = 240;
  const center = size / 2;
  const sphereRadius = 92;
  const point = project(state, sphereRadius, center);
  const vectorColor = collapsed ? 'var(--muted)' : active ? 'var(--accent-cyan)' : 'var(--accent-purple)';
  const phiDisplay = ((state.phi % tau) + tau) % tau;
  const axes = {
    x: {
      start: project({ theta: Math.PI / 2, phi: Math.PI }, sphereRadius, center),
      end: project({ theta: Math.PI / 2, phi: 0 }, sphereRadius, center),
    },
    y: {
      start: project({ theta: Math.PI / 2, phi: -Math.PI / 2 }, sphereRadius, center),
      end: project({ theta: Math.PI / 2, phi: Math.PI / 2 }, sphereRadius, center),
    },
  };

  return (
    <div className={`bloch ${active ? 'bloch--active' : ''} ${collapsed ? 'bloch--collapsed' : ''}`}>
      <div className="bloch__sphere" aria-hidden>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="presentation">
          <defs>
            <radialGradient id="bloch-glow" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="rgba(124,58,237,0.35)" />
              <stop offset="40%" stopColor="rgba(56,189,248,0.16)" />
              <stop offset="100%" stopColor="rgba(15,23,42,0.5)" />
            </radialGradient>
            <linearGradient id="bloch-shade" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
            </linearGradient>
          </defs>

          <circle cx={center} cy={center} r={sphereRadius} fill="url(#bloch-glow)" stroke="rgba(148,163,184,0.35)" />
          <circle cx={center} cy={center} r={sphereRadius} fill="url(#bloch-shade)" opacity="0.35" />

          <line
            x1={axes.x.start.x}
            y1={axes.x.start.y}
            x2={axes.x.end.x}
            y2={axes.x.end.y}
            stroke="rgba(124,58,237,0.5)"
            strokeWidth={1.4}
            strokeDasharray="3 4"
          />
          <line
            x1={axes.y.start.x}
            y1={axes.y.start.y}
            x2={axes.y.end.x}
            y2={axes.y.end.y}
            stroke="rgba(16,185,129,0.55)"
            strokeWidth={1.4}
            strokeDasharray="3 4"
          />
          <text x={axes.x.end.x + 10} y={axes.x.end.y + 4} className="bloch__axis">X</text>
          <text x={axes.y.end.x - 16} y={axes.y.end.y + 14} className="bloch__axis">Y</text>

          <line x1={center} y1={center} x2={point.x} y2={point.y} stroke={vectorColor} strokeWidth={2.8} />
          <circle cx={point.x} cy={point.y} r={6} fill={vectorColor} stroke="rgba(255,255,255,0.3)" />
          <circle
            cx={point.x}
            cy={point.y}
            r={9}
            fill="none"
            stroke={vectorColor}
            strokeOpacity={0.35}
            strokeDasharray="2 6"
          />
        </svg>
      </div>
      <p className="bloch__label">
        {label}
        <span className="bloch__coords">
          θ {toDegrees(state.theta)}° · φ {toDegrees(phiDisplay)}°
        </span>
      </p>
    </div>
  );
}

export default BlochSphere;
