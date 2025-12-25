import { Step } from '@components/steps/TeleportationSteps';
import { QubitView } from '@components/qubit/QubitCard';

export const demoSteps: Step[] = [
  {
    key: 'entangle',
    title: 'Подготовка запутанной пары',
    description: 'Алиса или Боб создают общую пару. Без общей запутанности телепортация невозможна.',
  },
  {
    key: 'combine',
    title: 'Объединение с неизвестным состоянием',
    description: 'Алиса связывает свой кубит с частицей из пары. Состояния переплетены, но ещё не переданы.',
  },
  {
    key: 'measure',
    title: 'Измерение Алисы',
    description: 'Измеряя пару кубитов, Алиса разрушает исходное состояние. Оно больше не существует у отправителя.',
  },
  {
    key: 'send',
    title: 'Классическая передача',
    description: 'Результат измерения превращается в два обычных бита. Их отправляют по классическому каналу.',
  },
  {
    key: 'reconstruct',
    title: 'Коррекция у Боба',
    description: 'Боб применяет коррекцию по полученным битам. Его кубит принимает исходное состояние Алисы.',
  },
  {
    key: 'complete',
    title: 'Готово',
    description: 'Телепортация завершена: состояние восстановлено у Боба и исчезло у Алисы.',
  },
];

type BlochVector = QubitView['bloch'];

function normalizePhi(phi: number) {
  const tau = Math.PI * 2;
  const normalized = phi % tau;
  return normalized >= 0 ? normalized : normalized + tau;
}

function randomBlochState(): BlochVector {
  const theta = 0.2 * Math.PI + Math.random() * 0.6 * Math.PI; // избегаем полюсов для наглядности
  const phi = Math.random() * 2 * Math.PI;
  return { theta, phi };
}

export function collapseBloch(initial: BlochVector): BlochVector {
  if (Math.cos(initial.theta) >= 0) {
    return { theta: 0, phi: 0 };
  }
  return { theta: Math.PI, phi: 0 };
}

export function equatorBloch(phi: number): BlochVector {
  return { theta: Math.PI / 2, phi: normalizePhi(phi) };
}

export function createInitialDemoState() {
  const teleported = randomBlochState();
  const bob = { theta: 0, phi: 0 };

  const qubits: QubitView[] = [
    { id: '1', role: 'alice', state: 'Неизвестное состояние', bloch: teleported },
    { id: '2', role: 'bob', state: 'Чистое состояние', bloch: bob },
  ];

  return { qubits, teleported };
}
