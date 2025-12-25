package utils

import (
	"crypto/rand"
	"encoding/hex"
)

// NewID generates a short random identifier for sessions and entities.
func NewID() (string, error) {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
