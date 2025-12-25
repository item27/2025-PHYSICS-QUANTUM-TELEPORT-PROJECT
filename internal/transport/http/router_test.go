package http

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"log/slog"

	"quantum-teleport/internal/domain/teleportation"
	"quantum-teleport/internal/service"
)

func TestRouterTeleportationFlow(t *testing.T) {
	svc := service.NewTeleportationService()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	mux := http.NewServeMux()
	NewRouter(svc, logger).Register(mux)
	server := httptest.NewServer(mux)
	defer server.Close()

	session := createSessionRequest(t, server.URL)

	aliceToken := joinRole(t, server.URL, session.ID, "alice", "")
	bobToken := joinRole(t, server.URL, session.ID, "bob", "")

	session = advanceSession(t, server.URL, session.ID, bobToken)
	if session.StepIndex != 1 {
		t.Fatalf("expected to be on combine step, got %d", session.StepIndex)
	}

	session = advanceSession(t, server.URL, session.ID, aliceToken)
	if session.StepIndex != 2 {
		t.Fatalf("expected to be on measure step, got %d", session.StepIndex)
	}

	session = advanceSession(t, server.URL, session.ID, aliceToken)
	if session.StepIndex != 3 {
		t.Fatalf("expected to reach send step after measurement, got %d", session.StepIndex)
	}

	session = advanceSession(t, server.URL, session.ID, bobToken)
	session = advanceSession(t, server.URL, session.ID, bobToken)
	if session.StepIndex != len(session.Steps)-1 {
		t.Fatalf("expected final step reached via HTTP flow, got %d", session.StepIndex)
	}

	fetched := getSessionRequest(t, server.URL, session.ID)
	if fetched.ID != session.ID || fetched.StepIndex != session.StepIndex {
		t.Fatalf("expected fetched session to match progressed session")
	}
}

func createSessionRequest(t *testing.T, baseURL string) teleportation.SessionState {
	t.Helper()

	resp, err := http.Post(baseURL+"/api/sessions", "application/json", nil)
	if err != nil {
		t.Fatalf("failed to create session: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var session teleportation.SessionState
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil {
		t.Fatalf("failed to decode session: %v", err)
	}
	return session
}

func joinRole(t *testing.T, baseURL, sessionID, role, token string) string {
	t.Helper()

	body := map[string]string{"role": role, "token": token}
	payload, _ := json.Marshal(body)

	resp, err := http.Post(baseURL+"/api/sessions/"+sessionID+"/join", "application/json", bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("failed to join role %s: %v", role, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected join status 200, got %d", resp.StatusCode)
	}

	var result map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode join response: %v", err)
	}
	return result["token"]
}

func advanceSession(t *testing.T, baseURL, sessionID, token string) teleportation.SessionState {
	t.Helper()

	body := map[string]string{"token": token}
	payload, _ := json.Marshal(body)

	resp, err := http.Post(baseURL+"/api/sessions/"+sessionID+"/advance", "application/json", bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("failed to advance session: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected advance status 200, got %d", resp.StatusCode)
	}

	var session teleportation.SessionState
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil {
		t.Fatalf("failed to decode advanced session: %v", err)
	}
	return session
}

func getSessionRequest(t *testing.T, baseURL, sessionID string) teleportation.SessionState {
	t.Helper()

	resp, err := http.Get(baseURL + "/api/sessions/" + sessionID)
	if err != nil {
		t.Fatalf("failed to fetch session: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected get status 200, got %d", resp.StatusCode)
	}

	var session teleportation.SessionState
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil {
		t.Fatalf("failed to decode session response: %v", err)
	}
	return session
}
