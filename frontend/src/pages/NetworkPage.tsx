import { useEffect, useRef, useState } from "react";
import CircuitView from "@components/circuit/CircuitView";
import LogPanel from "@components/log/LogPanel";
import QubitCard, { QubitView } from "@components/qubit/QubitCard";
import TeleportationSteps from "@components/steps/TeleportationSteps";
import PhysicsAlert from "@components/infobox/PhysicsAlert";
import {
  advanceSession,
  createSession,
  fetchSession,
  joinSession,
  leaveSession,
} from "@services/api";
import { connectToSession } from "@services/websocket";
import {
  ClientStatus,
  LocalView,
  SessionState,
  WSMessage,
} from "@state/network/types";

function NetworkPage() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [status, setStatus] = useState("Нет подключения");
  const [clientStatus, setClientStatus] = useState<ClientStatus>("idle");
  const [token, setToken] = useState<string>("");
  const [role, setRole] = useState<QubitView["role"] | "">("");
  const [local, setLocal] = useState<LocalView | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const isComplete = session
    ? session.stepIndex >= session.steps.length - 1
    : false;
  const activeStepKey = session?.steps[session.stepIndex]?.key;

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  const resetConnection = () => {
    socketRef.current?.close();
    socketRef.current = null;
  };

  const resetClient = () => {
    resetConnection();
    setToken("");
    setRole("");
    setLocal(null);
    setSession(null);
    setClientStatus("idle");
    setStatus("Нет подключения");
  };

  const handleCreate = async () => {
    if (
      clientStatus === "connected" ||
      clientStatus === "joining" ||
      clientStatus === "session_loaded"
    )
      return;
    resetClient();
    try {
      setStatus("Создаём сессию...");
      const created = await createSession();
      setSession(created);
      setSessionIdInput(created.id);
      setRole("");
      setToken("");
      setLocal(null);
      setClientStatus("session_loaded");
      setStatus("Сессия создана. Поделитесь ID и выберите свободную роль.");
    } catch (err) {
      console.error(err);
      setStatus("Ошибка создания сессии");
    }
  };

  const handleLookup = async () => {
    if (
      !sessionIdInput ||
      clientStatus === "connected" ||
      clientStatus === "joining"
    )
      return;
    resetConnection();
    try {
      setStatus("Ищем сессию...");
      const fetched = await fetchSession(sessionIdInput.trim());
      setSession(fetched);
      setRole("");
      setToken("");
      setLocal(null);
      setClientStatus("session_loaded");
      setStatus("Сессия найдена. Выберите свободную роль и подключитесь.");
    } catch (err) {
      console.error(err);
      setSession(null);
      setClientStatus("idle");
      setStatus("Сессия не найдена или недоступна");
    }
  };

  const bindWebSocket = (
    sessionId: string,
    roleName: string,
    sessionToken: string,
  ) => {
    const ws = connectToSession(
      sessionId,
      sessionToken,
      (payload: WSMessage) => {
        if (payload.type === "error") {
          setStatus(payload.message);
          setClientStatus("session_loaded");
          return;
        }
        setSession(payload.global);
        setLocal(payload.local);
        setRole(payload.local.role);
        setClientStatus("connected");
        setStatus(`Подключены как ${payload.local.role}`);
      },
    );
    ws.onopen = () => setStatus(`WebSocket подключается как ${roleName}`);
    ws.onclose = () => {
      setClientStatus("disconnected");
      setStatus("Соединение потеряно");
    };
    ws.onerror = () => {
      setClientStatus("disconnected");
      setStatus("Ошибка WebSocket");
    };
    socketRef.current = ws;
  };

  const handleJoin = async () => {
    if (!session || !role || clientStatus !== "session_loaded") return;
    const participant = session.participants[role];
    if (!participant || participant.taken) {
      setStatus("Эта роль уже занята");
      return;
    }
    try {
      setClientStatus("joining");
      setStatus("Подключаемся...");
      const joined = await joinSession(session.id, role, token || undefined);
      setToken(joined.token);
      bindWebSocket(session.id, role, joined.token);
    } catch (err) {
      console.error(err);
      setClientStatus("session_loaded");
      setStatus("Не удалось подключиться к роли");
    }
  };

  const handleReconnect = () => {
    if (!session || !token) return;
    setClientStatus("joining");
    setStatus("Переподключаемся...");
    bindWebSocket(session.id, role || "участник", token);
  };

  const handleAdvance = async () => {
    if (!session || !token || clientStatus !== "connected") return;
    if (isComplete) {
      setStatus("Процесс завершён");
      return;
    }
    try {
      const updated = await advanceSession(session.id, token);
      setSession(updated);
    } catch (err) {
      console.error(err);
      setStatus("Шаг недоступен для этой роли");
    }
  };

  const handleLeave = async () => {
    if (!session || !token) {
      resetClient();
      return;
    }
    try {
      const updated = await leaveSession(session.id, token);
      resetConnection();
      setToken("");
      setLocal(null);
      setRole("");
      setSession(updated);
      setClientStatus("session_loaded");
      setStatus(
        "Роль освобождена. Выберите новую роль или подключите другого участника.",
      );
    } catch (err) {
      console.error(err);
      setStatus("Не удалось покинуть сессию");
    }
  };

  const hintByRole: Record<QubitView['role'], string> = {
    alice: activeStepKey === 'measure' ? 'Исходное состояние уничтожено' : 'Готовит базис для измерения',
    bob: activeStepKey === 'reconstruct' ? 'Применяет локальные операции' : 'Ждёт классические биты',
  };

  const roleToStepGate: Record<string, string[]> = {
    alice: ['entangle', 'combine', 'measure'],
    bob: ['entangle', 'send_classical', 'reconstruct'],
  };

  const availableRoles = session
    ? Object.values(session.participants)
        .filter((p) => !p.taken)
        .map((p) => p.role)
    : [];

  const canAdvance = Boolean(
    session &&
      token &&
      role &&
      roleToStepGate[role]?.includes(activeStepKey ?? ""),
  );

  const phaseActive = (role: string) =>
    (role === 'alice' && (activeStepKey === 'entangle' || activeStepKey === 'combine')) ||
    (role === 'bob' && (activeStepKey === 'entangle' || activeStepKey === 'reconstruct'));

  const decoherence = (role: string) =>
    role === "alice" && activeStepKey === "measure";

  const depth = (role: string) => {
    if (role === "alice" && activeStepKey === "measure") return "idle";
    if (
      role === "bob" &&
      (activeStepKey === "reconstruct" || activeStepKey === "complete")
    )
      return "active";
    return undefined;
  };

  const stepNotes = {
    entangle: {
      title: 'Общее квантовое поле',
      lines: ['Алиса или Боб держат запутанную пару.', 'Это основа протокола: общее состояние двух точек.'],
      icon: 'entangle' as const,
      tone: 'quantum' as const,
    },
    combine: {
      title: "Вплетение состояния Алисы",
      lines: [
        "Алиса помещает свой кубит в общее поле.",
        "Фаза ещё движется, классики нет.",
      ],
      icon: "state" as const,
      tone: "quantum" as const,
    },
    measure: {
      title: "Коллапс и потеря исходного состояния",
      lines: [
        "Измерение уничтожает копию у Алисы.",
        "Дальше двигаются только классические биты.",
      ],
      icon: "measure" as const,
      tone: "warning" as const,
    },
    send: {
      title: "Классический канал",
      lines: [
        "Результат измерения - обычные биты.",
        "Передача не несёт квантовой информации.",
      ],
      icon: "classical" as const,
      tone: "classical" as const,
    },
    reconstruct: {
      title: "Локальная коррекция у Боба",
      lines: [
        "Боб применяет операцию только у себя.",
        "Исходное состояние рождается на его стороне.",
      ],
      icon: "correction" as const,
      tone: "quantum" as const,
    },
    complete: {
      title: "Завершение протокола",
      lines: [
        "Исходное состояние закреплено у Боба.",
        "У Алисы оно недоступно - процесс необратим.",
      ],
      icon: "state" as const,
      tone: "classical" as const,
    },
  };

  const info = activeStepKey
    ? stepNotes[activeStepKey as keyof typeof stepNotes]
    : null;

  return (
    <div className={`grid-2 scene scene--${activeStepKey ?? "idle"}`}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Сетевой режим</p>
            <h2>Сервер контролирует процесс</h2>
            <p className="subtitle">
              Подключитесь к бэкенду через WebSocket. Сервер - источник истины,
              клиент лишь отображает состояние.
            </p>
          </div>
          <div className="control-bar">
            {clientStatus === "idle" && (
              <>
                <button onClick={handleCreate}>Создать сессию</button>
                <div className="input-group">
                  <input
                    value={sessionIdInput}
                    onChange={(e) => setSessionIdInput(e.target.value)}
                    placeholder="Session ID"
                  />
                  <button onClick={handleLookup} disabled={!sessionIdInput}>
                    Проверить сессию
                  </button>
                </div>
              </>
            )}

            {clientStatus === "session_loaded" && (
              <>
                <div className="pill">ID: {session?.id}</div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as QubitView["role"])}
                  disabled={!session}
                >
                  <option value="">Выберите роль</option>
                  {['alice', 'bob'].map((r) => (
                    <option key={r} value={r} disabled={!availableRoles.includes(r as QubitView['role'])}>
                      {r}
                    </option>
                  ))}
                </select>
                <button onClick={handleJoin} disabled={!session || !role}>
                  Присоединиться
                </button>
              </>
            )}

            {clientStatus === "joining" && (
              <button disabled>Подключаемся…</button>
            )}

            {clientStatus === "connected" && (
              <>
                <div className="pill">ID: {session?.id}</div>
                <div className="pill">Роль: {role}</div>
                <button className="ghost" onClick={handleLeave}>
                  Покинуть сессию
                </button>
              </>
            )}

            {clientStatus === "disconnected" && (
              <>
                <div className="pill">ID: {session?.id}</div>
                <button onClick={handleReconnect} disabled={!token}>
                  Переподключиться
                </button>
                <button className="ghost" onClick={handleLeave}>
                  Покинуть сессию
                </button>
              </>
            )}
          </div>
        </div>
        {info ? (
          <PhysicsAlert
            title={info.title}
            lines={info.lines}
            icon={info.icon}
            tone={info.tone}
          />
        ) : null}
        <div className="status-line">
          <span className="dot" />
          <span>{status}</span>
          <span className="pill">Статус: {clientStatus}</span>
          {role && clientStatus === "connected" && (
            <span className="pill">Роль: {role}</span>
          )}
        </div>
        <div className="control-bar control-bar--secondary">
          <button
            onClick={handleAdvance}
            disabled={clientStatus !== "connected" || isComplete || !canAdvance}
          >
            {isComplete ? "Готово" : "Шаг моей роли"}
          </button>
        </div>
        {session ? (
          <div className="pill-row">
            {Object.values(session.participants).map((p) => (
              <span
                key={p.role}
                className={`pill ${p.taken ? "pill--busy" : "pill--free"}`}
                title={p.connected ? "Клиент online" : "Ожидаем подключение"}
              >
                {p.role} · {p.taken ? "занята" : "свободна"}{" "}
                {p.connected ? "· online" : ""}
              </span>
            ))}
          </div>
        ) : (
          <p className="placeholder">
            Создайте или найдите сессию, чтобы увидеть роли.
          </p>
        )}
        {session ? (
          <TeleportationSteps
            steps={session.steps}
            activeIndex={session.stepIndex}
          />
        ) : (
          <p className="placeholder">
            Создайте сессию, чтобы наблюдать обновления в реальном времени.
          </p>
        )}
      </section>

      <section className="panel">
        <h3>Состояния кубитов</h3>
        <p className="subtitle">
          Все изменения приходят от сервера. Клиент только показывает картину.
        </p>
        {session ? (
          <>
            <div className="qubit-grid">
              {session.qubits.map((q) => (
                <QubitCard
                  key={q.id}
                  qubit={q}
                  emphasis={
                    session.steps[session.stepIndex]?.key === "reconstruct"
                  }
                  phaseActive={phaseActive(q.role)}
                  decoherence={decoherence(q.role)}
                  hint={hintByRole[q.role]}
                  depth={depth(q.role)}
                  showBloch={
                    (q.role === "alice" && activeStepKey !== "complete") ||
                    (q.role === "bob" &&
                      (activeStepKey === "reconstruct" ||
                        activeStepKey === "complete"))
                  }
                />
              ))}
            </div>
            <CircuitView
              qubits={session.qubits}
              stepLabel={session.steps[session.stepIndex]?.title ?? ""}
              stepKey={session.steps[session.stepIndex]?.key}
            />
            <LogPanel entries={session.log} />
          </>
        ) : (
          <div className="placeholder">
            Нет активной сессии. Подключитесь, чтобы увидеть живые данные.
          </div>
        )}
      </section>
    </div>
  );
}

export default NetworkPage;
