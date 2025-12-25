package http

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"quantum-teleport/internal/domain/qubit"
	"quantum-teleport/internal/service"
)

// Router registers HTTP handlers for REST endpoints.
type Router struct {
	service *service.TeleportationService
	logger  *slog.Logger
}

// NewRouter constructs a router with provided service.
func NewRouter(service *service.TeleportationService, logger *slog.Logger) *Router {
	return &Router{service: service, logger: logger}
}

// Register attaches handlers to the given ServeMux.
func (r *Router) Register(mux *http.ServeMux) {
	mux.HandleFunc("/healthz", r.handleHealth)
	mux.HandleFunc("/api/sessions", r.handleSessions)
	mux.HandleFunc("/api/sessions/", r.handleSessionByID)
}

func (r *Router) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func (r *Router) handleSessions(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodPost:
		r.createSession(w, req)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (r *Router) handleSessionByID(w http.ResponseWriter, req *http.Request) {
	id := strings.TrimPrefix(req.URL.Path, "/api/sessions/")
	if id == "" {
		http.NotFound(w, req)
		return
	}

	switch req.Method {
	case http.MethodGet:
		r.getSession(w, req, id)
	case http.MethodPost:
		switch {
		case strings.HasSuffix(req.URL.Path, "/advance"):
			r.advanceSession(w, req, strings.TrimSuffix(id, "/advance"))
		case strings.HasSuffix(req.URL.Path, "/join"):
			r.joinSession(w, req, strings.TrimSuffix(id, "/join"))
		case strings.HasSuffix(req.URL.Path, "/leave"):
			r.leaveSession(w, req, strings.TrimSuffix(id, "/leave"))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (r *Router) createSession(w http.ResponseWriter, _ *http.Request) {
	session, err := r.service.CreateSession()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	r.logger.Info("session created", slog.String("session", session.ID))
	writeJSON(w, session)
}

type joinRequest struct {
	Role  string `json:"role"`
	Token string `json:"token"`
}

type joinResponse struct {
	Token string `json:"token"`
	Role  string `json:"role"`
}

func (r *Router) joinSession(w http.ResponseWriter, req *http.Request, id string) {
	var body joinRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	participant, err := r.service.JoinSession(id, qubit.Role(strings.ToLower(body.Role)), body.Token)
	if err != nil {
		status := http.StatusConflict
		if err.Error() == "session not found" {
			status = http.StatusNotFound
		}
		http.Error(w, err.Error(), status)
		return
	}
	r.logger.Info("role joined", slog.String("session", id), slog.String("role", string(participant.Role)))
	writeJSON(w, joinResponse{Token: participant.Token, Role: string(participant.Role)})
}

func (r *Router) getSession(w http.ResponseWriter, _ *http.Request, id string) {
	session, err := r.service.GetSession(id)
	if err != nil {
		r.logger.Warn("session not found", slog.String("session", id))
		http.Error(w, "session not found", http.StatusNotFound)
		return
	}
	r.logger.Info("session fetched", slog.String("session", id))
	writeJSON(w, session)
}

type advanceRequest struct {
	Token string `json:"token"`
}

func (r *Router) advanceSession(w http.ResponseWriter, req *http.Request, id string) {
	var body advanceRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil || body.Token == "" {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	session, err := r.service.AdvanceStep(id, body.Token)
	if err != nil {
		r.logger.Warn("session advance failed", slog.String("session", id), slog.String("error", err.Error()))
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	r.logger.Info("session advanced", slog.String("session", id), slog.Int("step", session.StepIndex))
	writeJSON(w, session)
}

type leaveRequest struct {
	Token string `json:"token"`
}

func (r *Router) leaveSession(w http.ResponseWriter, req *http.Request, id string) {
	var body leaveRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil || body.Token == "" {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	session, err := r.service.LeaveSession(id, body.Token)
	if err != nil {
		status := http.StatusForbidden
		if err.Error() == "session not found" {
			status = http.StatusNotFound
		}
		http.Error(w, err.Error(), status)
		return
	}
	r.logger.Info("role left", slog.String("session", id))
	writeJSON(w, session)
}

func writeJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(payload)
}
