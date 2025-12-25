import PhysicsIcon, { PhysicsIconName } from '@components/icons/PhysicsIcon';
import './physics-alert.css';

type Tone = 'quantum' | 'classical' | 'warning';

interface Props {
  title: string;
  lines: string[];
  icon: PhysicsIconName;
  tone?: Tone;
}

function PhysicsAlert({ title, lines, icon, tone = 'quantum' }: Props) {
  return (
    <div className={`physics-alert physics-alert--${tone}`} role="status">
      <div className="physics-alert__icon">
        <PhysicsIcon name={icon} tone={tone} />
      </div>
      <div>
        <p className="physics-alert__title">{title}</p>
        {lines.map((line, idx) => (
          <p key={idx} className="physics-alert__line">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export default PhysicsAlert;
