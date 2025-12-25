package e2e

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"quantum-teleport/internal/app"
	"quantum-teleport/internal/domain/qubit"
	"quantum-teleport/internal/domain/teleportation"
	"quantum-teleport/internal/service"
	transporthttp "quantum-teleport/internal/transport/http"
)

func TestTeleportationEndToEndWithWebsocketBroadcasts(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	application := app.New(logger)

	server := httptest.NewServer(transporthttp.Middleware(application.Routes(), logger))
	defer server.Close()

	session := createSession(t, server.URL)
	alice := joinRole(t, server.URL, session.ID, "alice", "")
	bob := joinRole(t, server.URL, session.ID, "bob", "")

	aliceConn := dialWebsocket(t, server.URL, session.ID, alice)
	defer aliceConn.Close()
	expectJoined(t, aliceConn, session.ID, qubit.RoleAlice)
	waitForStep(t, aliceConn, 0)

	bobConn := dialWebsocket(t, server.URL, session.ID, bob)
	defer bobConn.Close()
	expectJoined(t, bobConn, session.ID, qubit.RoleBob)
	waitForStep(t, bobConn, 0)

	session = advanceSession(t, server.URL, session.ID, bob)
	if session.StepIndex != 1 {
		t.Fatalf("expected bob to move to combine step, got %d", session.StepIndex)
	}
	waitForStep(t, aliceConn, 1)
	waitForStep(t, bobConn, 1)

	session = advanceSession(t, server.URL, session.ID, alice)
	if session.StepIndex != 2 {
		t.Fatalf("expected alice to reach measure step, got %d", session.StepIndex)
	}
	waitForStep(t, aliceConn, 2)
	waitForStep(t, bobConn, 2)

	session = advanceSession(t, server.URL, session.ID, alice)
	if session.StepIndex != 3 {
		t.Fatalf("expected send step after alice measurement, got %d", session.StepIndex)
	}
	measured := waitForStep(t, aliceConn, 3)
	if measured.Local.State != "Измерен" {
		t.Fatalf("expected alice local state to reflect measurement, got %s", measured.Local.State)
	}
	waitForStep(t, bobConn, 3)

	session = advanceSession(t, server.URL, session.ID, bob)
	if session.StepIndex != 4 {
		t.Fatalf("expected reconstruct step after bob send, got %d", session.StepIndex)
	}
	waitForStep(t, aliceConn, 4)
	waitForStep(t, bobConn, 4)

	session = advanceSession(t, server.URL, session.ID, bob)
	if session.StepIndex != len(session.Steps)-1 {
		t.Fatalf("expected session completion, got %d", session.StepIndex)
	}
	completed := waitForStep(t, bobConn, session.StepIndex)
	if completed.Local.State != "Состояние восстановлено" {
		t.Fatalf("expected bob to see restored state, got %s", completed.Local.State)
	}
}

func createSession(t *testing.T, baseURL string) teleportation.SessionState {
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

func dialWebsocket(t *testing.T, baseURL, sessionID, token string) *websocket.Conn {
	t.Helper()

	wsURL, err := url.Parse(baseURL)
	if err != nil {
		t.Fatalf("invalid base url: %v", err)
	}
	wsURL.Scheme = "ws"
	wsURL.Path = "/api/ws"
	query := wsURL.Query()
	query.Set("session", sessionID)
	query.Set("token", token)
	wsURL.RawQuery = query.Encode()

	conn, _, err := websocket.DefaultDialer.Dial(wsURL.String(), nil)
	if err != nil {
		t.Fatalf("failed to connect websocket: %v", err)
	}
	return conn
}

func expectJoined(t *testing.T, conn *websocket.Conn, sessionID string, role qubit.Role) {
	t.Helper()

	msg := readMessage(t, conn)
	if msg.Type != "joined" {
		t.Fatalf("expected joined message, got %s", msg.Type)
	}
	if msg.Global == nil || msg.Global.ID != sessionID {
		t.Fatalf("expected session %s in joined payload, got %+v", sessionID, msg.Global)
	}
	if msg.Local.Role != role {
		t.Fatalf("expected local role %s, got %s", role, msg.Local.Role)
	}
}

func waitForStep(t *testing.T, conn *websocket.Conn, expectedStep int) service.BroadcastMessage {
	t.Helper()

	deadline := time.Now().Add(2 * time.Second)
	for {
		if err := conn.SetReadDeadline(deadline); err != nil {
			t.Fatalf("failed to set deadline: %v", err)
		}

		msg := readMessage(t, conn)
		if msg.Global != nil && msg.Global.StepIndex == expectedStep {
			return msg
		}
	}
}

func readMessage(t *testing.T, conn *websocket.Conn) service.BroadcastMessage {
	t.Helper()

	var msg service.BroadcastMessage
	if err := conn.ReadJSON(&msg); err != nil {
		t.Fatalf("failed to read websocket message: %v", err)
	}
	return msg
}
