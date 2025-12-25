import CircuitView from '@components/circuit/CircuitView';
import LogPanel from '@components/log/LogPanel';
import QubitCard, { QubitView } from '@components/qubit/QubitCard';
import TeleportationSteps from '@components/steps/TeleportationSteps';
import PhysicsAlert from '@components/infobox/PhysicsAlert';
import { useDemoState } from '@state/demo/useDemoState';

function DemoPage() {
  const { qubits, steps, stepIndex, currentStep, log, advance, reset, isComplete, isAdvancing } = useDemoState();

  const hintByRole: Record<QubitView['role'], string> = {
    alice: currentStep.key === 'measure' ? 'Состояние не определено до измерения' : 'Квантовое состояние готовится к обмену',
    bob: currentStep.key === 'reconstruct' ? 'Коррекция — локальная операция' : 'Ожидает классические биты',
    charlie: 'Источник запутанности: общее поле для участников',
  };

  const phaseActive = (role: string) =>
    (role === 'alice' && (currentStep.key === 'entangle' || currentStep.key === 'combine')) ||
    (role === 'bob' && currentStep.key === 'reconstruct');

  const decoherence = (role: string) => role === 'alice' && currentStep.key === 'measure';

  const depth = (role: string) => {
    if (role === 'alice' && currentStep.key === 'measure') return 'idle';
    if (role === 'bob' && (currentStep.key === 'reconstruct' || currentStep.key === 'complete')) return 'active';
    return undefined;
  };

  const stepNotes = {
    entangle: {
      title: 'Общее поле запутанности',
      lines: ['Чарли готовит пару, которая принадлежит сразу обоим участникам.', 'Без общего поля протокол невозможен.'],
      icon: 'entangle' as const,
      tone: 'quantum' as const,
    },
    combine: {
      title: 'Объединение с неизвестным состоянием',
      lines: ['Состояние Алисы вплетается в пару.', 'Фаза ещё жива: никакой классики.'],
      icon: 'state' as const,
      tone: 'quantum' as const,
    },
    measure: {
      title: 'Измерение — необратимый шаг',
      lines: ['Коллапс уничтожает исходное состояние у Алисы.', 'В кадре остаются только классические биты.'],
      icon: 'measure' as const,
      tone: 'warning' as const,
    },
    send: {
      title: 'Классический канал',
      lines: ['Отправляются обычные биты.', 'Квантовой информации здесь больше нет.'],
      icon: 'classical' as const,
      tone: 'classical' as const,
    },
    reconstruct: {
      title: 'Локальная коррекция у Боба',
      lines: ['Боб применяет операцию только у себя.', 'Исходное состояние проявляется в его кубите.'],
      icon: 'correction' as const,
      tone: 'quantum' as const,
    },
    complete: {
      title: 'Готово: состояние появилось у Боба',
      lines: ['У Алисы его больше нет.', 'Протокол завершён корректно.'],
      icon: 'state' as const,
      tone: 'classical' as const,
    },
  };

  const info = stepNotes[currentStep.key as keyof typeof stepNotes];

  return (
    <div className={`grid-2 scene scene--${currentStep.key}`}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Демонстрация без сервера</p>
            <h2>Пошагово, локально</h2>
            <p className="subtitle">Переключайтесь по шагам и смотрите, как меняется состояние кубитов.</p>
          </div>
          <div className="actions">
            <button onClick={reset} className="ghost">Сбросить</button>
            <button onClick={advance} disabled={isComplete || isAdvancing}>
              {isComplete ? 'Готово' : isAdvancing ? 'Идёт переход...' : 'Следующий шаг'}
            </button>
          </div>
        </div>
        {info ? <PhysicsAlert title={info.title} lines={info.lines} icon={info.icon} tone={info.tone} /> : null}
        <TeleportationSteps steps={steps} activeIndex={stepIndex} />
      </section>

      <section className="panel">
        <h3>Состояния кубитов</h3>
        <p className="subtitle">Каждый блок — роль участника. Текст описывает их локальное состояние.</p>
        <div className="qubit-grid">
          {qubits.map((q) => (
            <QubitCard
              key={q.id}
              qubit={q}
              emphasis={q.role === 'alice' && currentStep.key === 'measure'}
              phaseActive={phaseActive(q.role)}
              decoherence={decoherence(q.role)}
              hint={hintByRole[q.role]}
              depth={depth(q.role)}
              showBloch={(q.role === 'alice' && currentStep.key !== 'complete') ||
                (q.role === 'bob' && (currentStep.key === 'reconstruct' || currentStep.key === 'complete'))}
            />
          ))}
        </div>
        <CircuitView qubits={qubits} stepLabel={currentStep.title} stepKey={currentStep.key} />
        <LogPanel entries={log} />
      </section>
    </div>
  );
}

export default DemoPage;
