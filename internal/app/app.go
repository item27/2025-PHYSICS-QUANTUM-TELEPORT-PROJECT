package app

import (
	"log/slog"
	"net/http"

	"quantum-teleport/internal/service"
	transporthttp "quantum-teleport/internal/transport/http"
	transportws "quantum-teleport/internal/transport/ws"
)

// App wires dependencies and exposes the HTTP server.
type App struct {
	Service    *service.TeleportationService
	HTTPRouter *transporthttp.Router
	WSHandler  *transportws.Handler
	Logger     *slog.Logger
}

// New creates the application composition root.
func New(logger *slog.Logger) *App {
	svc := service.NewTeleportationService()
	router := transporthttp.NewRouter(svc, logger)
	wsHandler := transportws.NewHandler(svc, logger)

	return &App{
		Service:    svc,
		HTTPRouter: router,
		WSHandler:  wsHandler,
		Logger:     logger,
	}
}

// Routes builds and returns the HTTP mux configured with handlers.
func (a *App) Routes() *http.ServeMux {
	mux := http.NewServeMux()
	a.HTTPRouter.Register(mux)
	mux.Handle("/api/ws", a.WSHandler)
	return mux
}
