package teleportation

import (
	"time"

	"quantum-teleport/internal/domain/qubit"
)

// Step represents a stage of the teleportation protocol.
type Step string

const (
	StepEntangle    Step = "entangle"
	StepCombine     Step = "combine"
	StepMeasure     Step = "measure"
	StepSend        Step = "send_classical"
	StepReconstruct Step = "reconstruct"
	StepComplete    Step = "complete"
)

// StepInfo provides human-readable context for a protocol step.
type StepInfo struct {
	Key         Step   `json:"key"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

// Participant describes a bound client role within a session lobby.
type Participant struct {
	Role      qubit.Role `json:"role"`
	Token     string     `json:"-"`
	Taken     bool       `json:"taken"`
	Connected bool       `json:"connected"`
	LastSeen  time.Time  `json:"-"`
}

// SessionState aggregates the teleportation session status.
type SessionState struct {
	ID           string                     `json:"id"`
	StepIndex    int                        `json:"stepIndex"`
	Steps        []StepInfo                 `json:"steps"`
	Qubits       []qubit.Qubit              `json:"qubits"`
	Log          []string                   `json:"log"`
	Participants map[qubit.Role]Participant `json:"participants"`
	// HiddenState keeps the original unknown state to restore it after measurement collapse.
	HiddenState qubit.BlochState `json:"-"`
}

// NextStep advances the session to the next step when possible.
func (s *SessionState) NextStep() {
	if s.StepIndex < len(s.Steps)-1 {
		s.StepIndex++
	}
}

// CurrentStep returns the currently active step metadata.
func (s *SessionState) CurrentStep() StepInfo {
	if len(s.Steps) == 0 {
		return StepInfo{}
	}
	if s.StepIndex >= len(s.Steps) {
		return s.Steps[len(s.Steps)-1]
	}
	return s.Steps[s.StepIndex]
}
