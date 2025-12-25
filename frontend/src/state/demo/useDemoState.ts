import { useMemo, useState } from "react";
import {
  collapseBloch,
  createInitialDemoState,
  demoSteps,
  equatorBloch,
} from "./demoSteps";
import { QubitView } from "@components/qubit/QubitCard";

export function useDemoState() {
  const [stepIndex, setStepIndex] = useState(0);
  const initial = useMemo(() => createInitialDemoState(), []);
  const [teleported, setTeleported] = useState<QubitView["bloch"]>(
    initial.teleported,
  );
  const [qubits, setQubits] = useState<QubitView[]>(initial.qubits);
  const [log, setLog] = useState<string[]>([
    "Запустите процесс, чтобы увидеть телепортацию без сервера.",
  ]);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const currentStep = useMemo(() => demoSteps[stepIndex], [stepIndex]);
  const isComplete = stepIndex >= demoSteps.length - 1;

  const advance = () => {
    if (isComplete || isAdvancing) return;
    const next = Math.min(stepIndex + 1, demoSteps.length - 1);
    const nextStep = demoSteps[next];
    const delay = nextStep.key === "measure" ? 520 : 360;

    setIsAdvancing(true);
    setTimeout(() => {
      setStepIndex(next);
      setQubits((state) => applyStep(state, nextStep.key, teleported));
      setLog((entries) => [
        ...entries,
        `Шаг: ${nextStep.title}`,
        nextStep.key === "measure"
          ? "Измерение разрушает исходное состояние - это необратимо."
          : "Локальная операция завершена.",
      ]);
      setIsAdvancing(false);
    }, delay);
  };

  const reset = () => {
    setStepIndex(0);
    const initialState = createInitialDemoState();
    setTeleported(initialState.teleported);
    setQubits(initialState.qubits);
    setLog(["Процесс сброшен. Новое состояние подготовлено."]);
    setIsAdvancing(false);
  };

  return {
    stepIndex,
    currentStep,
    steps: demoSteps,
    qubits,
    log,
    advance,
    reset,
    isComplete,
    isAdvancing,
  };
}

function applyStep(
  current: QubitView[],
  stepKey: string,
  teleported: QubitView["bloch"],
): QubitView[] {
  return current.map((qubit) => {
    switch (stepKey) {
    case 'entangle':
      if (qubit.role === 'bob')
        return { ...qubit, state: 'Запутанная пара готова', bloch: equatorBloch(teleported.phi + Math.PI / 2) };
      return qubit;
    case 'combine':
      if (qubit.role === 'alice') return { ...qubit, state: 'Связана с парой' };
      if (qubit.role === 'bob') return { ...qubit, bloch: equatorBloch(teleported.phi + Math.PI / 3) };
      return qubit;
    case 'measure':
      if (qubit.role === 'alice')
        return { ...qubit, state: 'Измерена, исходник уничтожен', bloch: collapseBloch(teleported) };
      return qubit;
    case 'send':
      return qubit;
    case 'reconstruct':
      if (qubit.role === 'bob') return { ...qubit, state: 'Применяет коррекцию', bloch: teleported };
      return qubit;
    case 'complete':
      if (qubit.role === 'bob') return { ...qubit, state: 'Состояние Алисы восстановлено', bloch: teleported };
      return qubit;
    default:
      return qubit;
    }
  });
}
