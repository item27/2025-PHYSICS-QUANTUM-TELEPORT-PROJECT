package logger

import (
	"log/slog"
	"os"
)

// New creates a configured slog.Logger with JSON output suitable for backend services.
func New() *slog.Logger {
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	return slog.New(handler)
}
