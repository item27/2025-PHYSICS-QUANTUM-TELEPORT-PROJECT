import { QubitView } from '@components/qubit/QubitCard';
import { Step } from '@components/steps/TeleportationSteps';

export type SessionState = {
  id: string;
  stepIndex: number;
  steps: Step[];
  qubits: QubitView[];
  log: string[];
  participants: Record<string, Participant>;
};

export type Participant = {
  role: QubitView['role'];
  taken: boolean;
  connected: boolean;
};

export type LocalView = {
  role: QubitView['role'];
  state: string;
};

export type WSMessage =
  | { type: 'joined'; global: SessionState; local: LocalView }
  | { type: 'state_update'; global: SessionState; local: LocalView }
  | { type: 'error'; message: string };

export type ClientStatus =
  | 'idle'
  | 'session_loaded'
  | 'joining'
  | 'connected'
  | 'disconnected';
