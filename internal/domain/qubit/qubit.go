package qubit

// Role enumerates a participant in the teleportation protocol.
type Role string

const (
	RoleAlice Role = "alice"
	RoleBob   Role = "bob"
)

// BlochState stores spherical coordinates of a qubit on the Bloch sphere.
// Angles are expressed in radians.
type BlochState struct {
	Theta float64 `json:"theta"`
	Phi   float64 `json:"phi"`
}

// Qubit describes a simplified qubit within the visualizer.
type Qubit struct {
	ID    string     `json:"id"`
	Role  Role       `json:"role"`
	State string     `json:"state"`
	Bloch BlochState `json:"bloch"`
}
