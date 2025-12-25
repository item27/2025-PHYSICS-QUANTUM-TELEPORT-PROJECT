package main

import (
	"log/slog"
	"net/http"
	"os"

	"quantum-teleport/internal/app"
	transporthttp "quantum-teleport/internal/transport/http"
	"quantum-teleport/pkg/logger"
)

func main() {
	log := logger.New()
	application := app.New(log)

	mux := application.Routes()
	handler := transporthttp.Middleware(mux, log)
	port := "8080"
	if p := os.Getenv("PORT"); p != "" {
		port = p
	}

	log.Info("starting server", slog.String("port", port))
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Error("server stopped", slog.String("error", err.Error()))
	}
}
