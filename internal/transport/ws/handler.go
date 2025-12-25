package ws

import (
	"log/slog"
	"net/http"

	"github.com/gorilla/websocket"

	"quantum-teleport/internal/service"
)

// Handler upgrades HTTP connections to WebSocket and streams session updates.
type Handler struct {
	service  *service.TeleportationService
	logger   *slog.Logger
	upgrader websocket.Upgrader
}

// NewHandler constructs a WebSocket handler.
func NewHandler(service *service.TeleportationService, logger *slog.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

// ServeHTTP performs the upgrade and registers the connection.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session")
	if sessionID == "" {
		http.Error(w, "missing session", http.StatusBadRequest)
		return
	}
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "missing token", http.StatusBadRequest)
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error("upgrade failed", slog.String("error", err.Error()))
		return
	}

	session, role, err := h.service.RegisterListener(sessionID, token, conn)
	if err != nil {
		h.logger.Warn("session missing", slog.String("session", sessionID))
		_ = conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, "session not found"))
		_ = conn.Close()
		return
	}

	h.logger.Info("ws connected", slog.String("session", sessionID), slog.String("role", string(role)))
	h.service.WriteToListener(sessionID, conn, service.BroadcastMessage{
		Type:   "joined",
		Global: session,
		Local:  service.LocalView{Role: role},
	})
	h.service.Broadcast(sessionID)
	go h.readLoop(sessionID, conn)
}

func (h *Handler) readLoop(sessionID string, conn *websocket.Conn) {
	defer func() {
		h.service.UnregisterListener(sessionID, conn)
		_ = conn.Close()
		h.logger.Info("ws disconnected", slog.String("session", sessionID))
	}()

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			return
		}
	}
}
