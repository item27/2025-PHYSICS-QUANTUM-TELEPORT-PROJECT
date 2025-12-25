import './bloch.css';

type BlochVector = {
  theta: number;
  phi: number;
  radius?: number;
};

interface Props {
  label: string;
  state: BlochVector;
  active?: boolean;
  collapsed?: boolean;
}

const tau = Math.PI * 2;
const toDegrees = (rad: number) => Math.round((rad * 180) / Math.PI);
const toPercent = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 100);

function project(vector: BlochVector, radius: number, tilt: number, yaw: number, center: number) {
  const r = Math.max(0, Math.min(vector.radius ?? 1, 1));
  const x = Math.sin(vector.theta) * Math.cos(vector.phi) * r;
  const y = Math.sin(vector.theta) * Math.sin(vector.phi) * r;
  const z = Math.cos(vector.theta) * r;
  const rotX = x * Math.cos(yaw) - y * Math.sin(yaw);
  const rotY = x * Math.sin(yaw) + y * Math.cos(yaw);
  const px = center + rotX * radius;
  const py = center - (rotY * Math.cos(tilt) - z * Math.sin(tilt)) * radius;

  return { x: px, y: py, z };
}

function BlochSphere({ label, state, active, collapsed }: Props) {
  const size = 180;
  const center = size / 2;
  const sphereRadius = 68;
  const tilt = 0.45;
  const yaw = 0.32;
  const point = project(state, sphereRadius, tilt, yaw, center);
  const vectorColor = collapsed ? 'var(--muted)' : active ? 'var(--accent-cyan)' : 'var(--accent-purple)';
  const backSegment = point.z < 0;
  const phiDisplay = ((state.phi % tau) + tau) % tau;
  const radiusPct = toPercent(state.radius ?? 1);
  const meridians = [0, 30, 60, 90, 120, 150];
  const parallels = [-45, -25, 0, 25, 45];
  const axes = {
    x: {
      start: project({ theta: Math.PI / 2, phi: Math.PI, radius: 1 }, sphereRadius, tilt, yaw, center),
      end: project({ theta: Math.PI / 2, phi: 0, radius: 1 }, sphereRadius, tilt, yaw, center),
    },
    y: {
      start: project({ theta: Math.PI / 2, phi: -Math.PI / 2, radius: 1 }, sphereRadius, tilt, yaw, center),
      end: project({ theta: Math.PI / 2, phi: Math.PI / 2, radius: 1 }, sphereRadius, tilt, yaw, center),
    },
    z: {
      start: project({ theta: Math.PI, phi: 0, radius: 1 }, sphereRadius, tilt, yaw, center),
      end: project({ theta: 0, phi: 0, radius: 1 }, sphereRadius, tilt, yaw, center),
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
          {meridians.map((angle) => (
            <ellipse
              key={`mer-${angle}`}
              cx={center}
              cy={center}
              rx={sphereRadius}
              ry={sphereRadius * Math.cos(tilt)}
              stroke="rgba(148,163,184,0.28)"
              strokeDasharray="4 6"
              fill="none"
              opacity={0.75}
              transform={`rotate(${angle} ${center} ${center})`}
            />
          ))}
          {parallels.map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const r = sphereRadius * Math.cos(rad);
            return (
              <ellipse
                key={`par-${deg}`}
                cx={center}
                cy={center - sphereRadius * Math.sin(rad) * Math.sin(tilt)}
                rx={r}
                ry={r * Math.cos(tilt)}
                stroke="rgba(148,163,184,0.2)"
                strokeDasharray="3 5"
                fill="none"
              />
            );
          })}
          <circle cx={center} cy={center} r={sphereRadius} fill="url(#bloch-shade)" opacity="0.35" />

          <line
            x1={axes.z.start.x}
            y1={axes.z.start.y}
            x2={axes.z.end.x}
            y2={axes.z.end.y}
            stroke="rgba(56,189,248,0.55)"
            strokeWidth={1.6}
            strokeDasharray="3 4"
          />
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
          <text x={axes.z.end.x - 8} y={axes.z.end.y - 12} className="bloch__axis">Z</text>
          <text x={axes.x.end.x + 10} y={axes.x.end.y + 4} className="bloch__axis">X</text>
          <text x={axes.y.end.x - 16} y={axes.y.end.y + 14} className="bloch__axis">Y</text>

          {backSegment && (
            <line
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke={vectorColor}
              strokeWidth={2}
              strokeDasharray="3 4"
              opacity={0.35}
            />
          )}
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
          θ {toDegrees(state.theta)}° · φ {toDegrees(phiDisplay)}° · r {radiusPct}%
        </span>
      </p>
    </div>
  );
}

export default BlochSphere;
