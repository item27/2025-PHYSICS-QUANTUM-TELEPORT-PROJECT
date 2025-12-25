package service

import (
	"errors"
	"math"
	"math/rand"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"quantum-teleport/internal/domain/qubit"
	"quantum-teleport/internal/domain/teleportation"
	"quantum-teleport/pkg/utils"
)

// TeleportationService manages teleportation sessions and broadcasts.
type TeleportationService struct {
	mu         sync.RWMutex
	sessions   map[string]*teleportation.SessionState
	listeners  map[string]map[*websocket.Conn]qubit.Role
	stepPreset []teleportation.StepInfo
	ttl        time.Duration
}

// NewTeleportationService constructs a service with default steps.
func NewTeleportationService() *TeleportationService {
	steps := []teleportation.StepInfo{
		{Key: teleportation.StepEntangle, Title: "Подготовка запутанной пары", Description: "Чарли создаёт пару кубитов и отправляет по одному Алисе и Бобу."},
		{Key: teleportation.StepCombine, Title: "Объединение состояний", Description: "Алиса соединяет свой неизвестный кубит с полученной запутанной частицей."},
		{Key: teleportation.StepMeasure, Title: "Измерение Алисы", Description: "Алиса делает парное измерение, разрушая исходное состояние."},
		{Key: teleportation.StepSend, Title: "Классическая передача", Description: "Результаты измерения отправляются Бобу по обычному каналу связи."},
		{Key: teleportation.StepReconstruct, Title: "Восстановление у Боба", Description: "Боб применяет коррекции и получает состояние Алисы."},
		{Key: teleportation.StepComplete, Title: "Готово", Description: "Состояние успешно перенесено, исходник уничтожен."},
	}

	return &TeleportationService{
		sessions:   make(map[string]*teleportation.SessionState),
		listeners:  make(map[string]map[*websocket.Conn]qubit.Role),
		stepPreset: steps,
		ttl:        60 * time.Second,
	}
}

// CreateSession initializes a teleportation session.
func (s *TeleportationService) CreateSession() (*teleportation.SessionState, error) {
	id, err := utils.NewID()
	if err != nil {
		return nil, err
	}

	unknownState := randomBlochState()
	bobBase := qubit.BlochState{Theta: 0, Phi: 0, Radius: 1}
	charlieBase := equatorBloch(unknownState.Phi)

	participants := map[qubit.Role]teleportation.Participant{
		qubit.RoleAlice:   {Role: qubit.RoleAlice, Taken: false},
		qubit.RoleBob:     {Role: qubit.RoleBob, Taken: false},
		qubit.RoleCharlie: {Role: qubit.RoleCharlie, Taken: false},
	}

	now := time.Now()
	session := &teleportation.SessionState{
		ID:           id,
		StepIndex:    0,
		Steps:        append([]teleportation.StepInfo{}, s.stepPreset...),
		Participants: participants,
		HiddenState:  unknownState,
		Qubits: []qubit.Qubit{
			{ID: "q1", Role: qubit.RoleAlice, State: "Неизвестное состояние", Bloch: unknownState},
			{ID: "q2", Role: qubit.RoleBob, State: "Чистое состояние", Bloch: bobBase},
			{ID: "q3", Role: qubit.RoleCharlie, State: "Запутанная пара", Bloch: charlieBase},
		},
		Log: []string{"Сессия создана, роли свободны."},
	}

	s.mu.Lock()
	for role, p := range session.Participants {
		p.LastSeen = now
		session.Participants[role] = p
	}
	s.sessions[id] = session
	s.mu.Unlock()

	return session, nil
}

// GetSession fetches a session by ID.
func (s *TeleportationService) GetSession(id string) (*teleportation.SessionState, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	session, ok := s.sessions[id]
	if !ok {
		return nil, errors.New("session not found")
	}
	return session, nil
}

// JoinSession reserves a role and returns a connection token.
func (s *TeleportationService) JoinSession(id string, role qubit.Role, existingToken string) (teleportation.Participant, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	session, ok := s.sessions[id]
	if !ok {
		return teleportation.Participant{}, errors.New("session not found")
	}

	participant, exists := session.Participants[role]
	if !exists {
		return teleportation.Participant{}, errors.New("role unsupported")
	}
	if participant.Token != "" {
		if existingToken != "" && existingToken == participant.Token {
			participant.LastSeen = time.Now()
			session.Participants[role] = participant
			s.broadcastLocked(session)
			return participant, nil
		}
		if participant.Connected || time.Since(participant.LastSeen) < s.ttl {
			return teleportation.Participant{}, errors.New("role already taken")
		}
	}

	token, err := utils.NewID()
	if err != nil {
		return teleportation.Participant{}, err
	}
	participant.Token = token
	participant.Taken = true
	participant.LastSeen = time.Now()
	session.Participants[role] = participant
	session.Log = append(session.Log, "Роль закреплена: "+string(role))

	s.broadcastLocked(session)
	return participant, nil
}

// AdvanceStep moves a session forward when the role is allowed for the step.
func (s *TeleportationService) AdvanceStep(id string, token string) (*teleportation.SessionState, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	session, ok := s.sessions[id]
	if !ok {
		return nil, errors.New("session not found")
	}

	role, err := s.validateTokenLocked(session, token)
	if err != nil {
		return nil, err
	}

	if session.StepIndex >= len(session.Steps)-1 {
		return session, nil
	}

	current := session.CurrentStep().Key
	if !allowedForStep(current, role) {
		return nil, errors.New("role not permitted for step")
	}

	session.StepIndex++
	session.Log = append(session.Log, "Шаг: "+session.CurrentStep().Title)

	switch session.CurrentStep().Key {
	case teleportation.StepEntangle:
		session.Qubits[2].State = "Запутанная пара готова"
		session.Qubits[2].Bloch = equatorBloch(session.HiddenState.Phi)
		session.Qubits[1].Bloch = equatorBloch(session.HiddenState.Phi + math.Pi/2)
	case teleportation.StepCombine:
		session.Qubits[0].State = "Связан с парой"
		session.Qubits[2].Bloch = equatorBloch(session.HiddenState.Phi + math.Pi/3)
	case teleportation.StepMeasure:
		session.Qubits[0].State = "Измерен"
		session.Qubits[0].Bloch = collapseBloch(session.HiddenState)
	case teleportation.StepSend:
		session.Log = append(session.Log, "Классические биты отправлены Бобу")
	case teleportation.StepReconstruct:
		session.Qubits[1].State = "Получает коррекцию"
		session.Qubits[1].Bloch = session.HiddenState
	case teleportation.StepComplete:
		session.Qubits[1].State = "Состояние восстановлено"
		session.Qubits[1].Bloch = session.HiddenState
	}

	s.broadcastLocked(session)
	return session, nil
}

// LeaveSession releases a participant role and broadcasts the update.
func (s *TeleportationService) LeaveSession(id string, token string) (*teleportation.SessionState, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	session, ok := s.sessions[id]
	if !ok {
		return nil, errors.New("session not found")
	}

	var role qubit.Role
	for r, p := range session.Participants {
		if p.Token == token {
			role = r
			break
		}
	}
	if role == "" {
		return nil, errors.New("unknown participant token")
	}

	participant := session.Participants[role]
	participant.Token = ""
	participant.Taken = false
	participant.Connected = false
	participant.LastSeen = time.Now()
	session.Participants[role] = participant
	session.Log = append(session.Log, "Роль освобождена: "+string(role))

	conns := s.listeners[id]
	for conn, r := range conns {
		if r == role {
			_ = conn.Close()
			delete(conns, conn)
		}
	}

	s.broadcastLocked(session)
	return session, nil
}

func allowedForStep(step teleportation.Step, role qubit.Role) bool {
	switch step {
	case teleportation.StepEntangle:
		return role == qubit.RoleCharlie
	case teleportation.StepCombine:
		return role == qubit.RoleAlice
	case teleportation.StepMeasure:
		return role == qubit.RoleAlice
	case teleportation.StepSend:
		return role == qubit.RoleBob
	case teleportation.StepReconstruct:
		return role == qubit.RoleBob
	case teleportation.StepComplete:
		return false
	default:
		return false
	}
}

func (s *TeleportationService) validateTokenLocked(session *teleportation.SessionState, token string) (qubit.Role, error) {
	for role, p := range session.Participants {
		if p.Token == token {
			return role, nil
		}
	}
	return "", errors.New("unknown participant token")
}

// RegisterListener binds a WebSocket connection to a session.
func (s *TeleportationService) RegisterListener(sessionID string, token string, conn *websocket.Conn) (*teleportation.SessionState, qubit.Role, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	session, ok := s.sessions[sessionID]
	if !ok {
		return nil, "", errors.New("session not found")
	}

	role, err := s.validateTokenLocked(session, token)
	if err != nil {
		return nil, "", err
	}

	if _, exists := s.listeners[sessionID]; !exists {
		s.listeners[sessionID] = make(map[*websocket.Conn]qubit.Role)
	}
	s.listeners[sessionID][conn] = role

	participant := session.Participants[role]
	participant.Connected = true
	participant.LastSeen = time.Now()
	session.Participants[role] = participant

	return session, role, nil
}

// UnregisterListener removes a WebSocket connection from updates.
func (s *TeleportationService) UnregisterListener(sessionID string, conn *websocket.Conn) {
	s.mu.Lock()
	role, ok := s.listeners[sessionID][conn]
	if ok {
		participant := s.sessions[sessionID].Participants[role]
		participant.Connected = false
		participant.LastSeen = time.Now()
		s.sessions[sessionID].Participants[role] = participant
	}
	delete(s.listeners[sessionID], conn)
	session := s.sessions[sessionID]
	s.mu.Unlock()

	if session != nil {
		s.broadcastLocked(session)
	}
}

// Broadcast pushes the latest session view to all listeners.
func (s *TeleportationService) Broadcast(sessionID string) {
	s.mu.RLock()
	session := s.sessions[sessionID]
	s.mu.RUnlock()
	if session != nil {
		s.broadcastLocked(session)
	}
}

// LocalView carries role-specific data.
type LocalView struct {
	Role  qubit.Role `json:"role"`
	State string     `json:"state"`
}

// BroadcastMessage wraps global and local data for clients.
type BroadcastMessage struct {
	Type   string                      `json:"type"`
	Global *teleportation.SessionState `json:"global"`
	Local  LocalView                   `json:"local"`
}

func randomBlochState() qubit.BlochState {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	theta := (0.2 * math.Pi) + r.Float64()*(0.6*math.Pi) // избегаем полюсов для наглядности
	phi := r.Float64() * 2 * math.Pi
	return qubit.BlochState{Theta: theta, Phi: phi, Radius: 1}
}

func equatorBloch(phi float64) qubit.BlochState {
	normalized := math.Mod(phi, 2*math.Pi)
	if normalized < 0 {
		normalized += 2 * math.Pi
	}
	return qubit.BlochState{Theta: math.Pi / 2, Phi: normalized, Radius: 1}
}

func collapseBloch(initial qubit.BlochState) qubit.BlochState {
	if math.Cos(initial.Theta) >= 0 {
		return qubit.BlochState{Theta: 0, Phi: 0, Radius: 0.68}
	}
	return qubit.BlochState{Theta: math.Pi, Phi: 0, Radius: 0.68}
}

// broadcastLocked sends the current session state to all listeners with scoped local data.
func (s *TeleportationService) broadcastLocked(session *teleportation.SessionState) {
	conns := s.listeners[session.ID]
	for conn, role := range conns {
		local := LocalView{Role: role}
		for _, qb := range session.Qubits {
			if qb.Role == role {
				local.State = qb.State
			}
		}
		_ = conn.WriteJSON(BroadcastMessage{Type: "state_update", Global: session, Local: local})
	}
}
