package qubit

// Role enumerates a participant in the teleportation protocol.
type Role string

const (
	RoleAlice   Role = "alice"
	RoleBob     Role = "bob"
	RoleCharlie Role = "charlie"
)

// BlochState stores spherical coordinates of a qubit on the Bloch sphere.
// Angles are expressed in radians; radius is used to depict decoherence visually.
type BlochState struct {
	Theta  float64 `json:"theta"`
	Phi    float64 `json:"phi"`
	Radius float64 `json:"radius,omitempty"`
}

// Qubit describes a simplified qubit within the visualizer.
type Qubit struct {
	ID    string     `json:"id"`
	Role  Role       `json:"role"`
	State string     `json:"state"`
	Bloch BlochState `json:"bloch"`
}
