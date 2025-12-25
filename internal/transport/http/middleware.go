package http

import (
	"bufio"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"
)

// Middleware wraps HTTP handlers with CORS headers, OPTIONS support, and request logging.
func Middleware(next http.Handler, logger *slog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		origin := getAllowedOrigin(r)
		setCORSHeaders(w, r)

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			logger.Info("http request",
				slog.String("method", r.Method),
				slog.String("path", cleanPath(r.URL.Path)),
				slog.Int("status", http.StatusNoContent),
				slog.Duration("duration", time.Since(start)),
				slog.String("origin", origin),
				slog.Bool("preflight", true),
			)
			return
		}

		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)

		logger.Info("http request",
			slog.String("method", r.Method),
			slog.String("path", cleanPath(r.URL.Path)),
			slog.Int("status", recorder.status),
			slog.Duration("duration", time.Since(start)),
			slog.String("origin", origin),
		)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *statusRecorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	controller := http.NewResponseController(r.ResponseWriter)
	return controller.Hijack()
}

func (r *statusRecorder) Flush() {
	if f, ok := r.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func setCORSHeaders(w http.ResponseWriter, r *http.Request) {
	origin := getAllowedOrigin(r)
	if origin != "" {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}

	w.Header().Set("Vary", "Origin")

	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
}

func getAllowedOrigin(r *http.Request) string {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return ""
	}
	return origin
}

func cleanPath(p string) string {
	if strings.HasSuffix(p, "/") && len(p) > 1 {
		return strings.TrimSuffix(p, "/")
	}
	return p
}
