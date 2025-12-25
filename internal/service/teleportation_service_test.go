package service

import (
	"strings"
	"testing"
	"time"

	"quantum-teleport/internal/domain/qubit"
)

func TestCreateSessionInitialState(t *testing.T) {
	service := NewTeleportationService()

	session, err := service.CreateSession()
	if err != nil {
		t.Fatalf("expected session, got error: %v", err)
	}

	if session.ID == "" {
		t.Fatal("expected session id to be generated")
	}
	if session.StepIndex != 0 {
		t.Fatalf("expected initial step index 0, got %d", session.StepIndex)
	}
	if len(session.Steps) == 0 {
		t.Fatal("expected default steps to be populated")
	}
	if len(session.Participants) != 2 {
		t.Fatalf("expected 2 participants, got %d", len(session.Participants))
	}
	for role, participant := range session.Participants {
		if participant.Taken {
			t.Fatalf("role %s should not be taken initially", role)
		}
	}
	if len(session.Qubits) != 2 {
		t.Fatalf("expected 2 qubits, got %d", len(session.Qubits))
	}
	if len(session.Log) == 0 {
		t.Fatal("expected session log to contain creation entry")
	}
	if session.HiddenState.Theta == 0 && session.HiddenState.Phi == 0 {
		t.Fatal("expected hidden state to be initialized")
	}
}

func TestJoinSessionAssignsTokenAndPreventsConflict(t *testing.T) {
	service := NewTeleportationService()
	session, _ := service.CreateSession()

	participant, err := service.JoinSession(session.ID, qubit.RoleAlice, "")
	if err != nil {
		t.Fatalf("expected successful join, got %v", err)
	}
	if participant.Token == "" {
		t.Fatal("expected token to be generated for participant")
	}

	_, err = service.JoinSession(session.ID, qubit.RoleAlice, "")
	if err == nil {
		t.Fatal("expected conflict when joining already taken role")
	}
	if !strings.Contains(err.Error(), "role already taken") {
		t.Fatalf("unexpected error message: %v", err)
	}
}

func TestJoinSessionTokenReuseWithinTTL(t *testing.T) {
	service := NewTeleportationService()
	session, _ := service.CreateSession()

	participant, err := service.JoinSession(session.ID, qubit.RoleBob, "")
	if err != nil {
		t.Fatalf("expected successful join, got %v", err)
	}

	reused, err := service.JoinSession(session.ID, qubit.RoleBob, participant.Token)
	if err != nil {
		t.Fatalf("expected token reuse to succeed, got %v", err)
	}
	if reused.Token != participant.Token {
		t.Fatalf("expected same token to be reused, got %s", reused.Token)
	}
}

func TestAdvanceStepHonorsRolePermissions(t *testing.T) {
	service := NewTeleportationService()
	session, _ := service.CreateSession()

	alice, _ := service.JoinSession(session.ID, qubit.RoleAlice, "")
	bob, _ := service.JoinSession(session.ID, qubit.RoleBob, "")

	afterEntangle, err := service.AdvanceStep(session.ID, bob.Token)
	if err != nil {
		t.Fatalf("expected bob to advance session, got %v", err)
	}
	if afterEntangle.StepIndex != 1 {
		t.Fatalf("expected step index 1 after first advance, got %d", afterEntangle.StepIndex)
	}
	if afterEntangle.Qubits[0].State != "Связан с парой" {
		t.Fatalf("expected alice qubit state to reflect combine step, got %s", afterEntangle.Qubits[0].State)
	}

	if _, err := service.AdvanceStep(session.ID, bob.Token); err == nil {
		t.Fatal("expected bob to be blocked on combine step")
	}

	afterCombine, err := service.AdvanceStep(session.ID, alice.Token)
	if err != nil {
		t.Fatalf("expected alice to advance combine step, got %v", err)
	}
	if afterCombine.StepIndex != 2 {
		t.Fatalf("expected step index 2 after combine, got %d", afterCombine.StepIndex)
	}
	if afterCombine.Qubits[0].State != "Измерен" {
		t.Fatalf("expected alice qubit state to reflect measurement, got %s", afterCombine.Qubits[0].State)
	}

	measureAdvance, err := service.AdvanceStep(session.ID, alice.Token)
	if err != nil {
		t.Fatalf("expected alice to advance measurement, got %v", err)
	}
	if measureAdvance.StepIndex != 3 {
		t.Fatalf("expected send step after measurement, got %d", measureAdvance.StepIndex)
	}

	sendStep, err := service.AdvanceStep(session.ID, bob.Token)
	if err != nil {
		t.Fatalf("expected bob to advance send step, got %v", err)
	}
	if sendStep.StepIndex != 4 {
		t.Fatalf("expected reconstruct step after send, got %d", sendStep.StepIndex)
	}

	finalState, err := service.AdvanceStep(session.ID, bob.Token)
	if err != nil {
		t.Fatalf("expected bob to complete reconstruction, got %v", err)
	}
	if finalState.StepIndex != len(session.Steps)-1 {
		t.Fatalf("expected final step reached, got %d", finalState.StepIndex)
	}
	if finalState.Qubits[1].State != "Состояние восстановлено" {
		t.Fatalf("expected bob qubit state to be restored, got %s", finalState.Qubits[1].State)
	}
}

func TestLeaveSessionReleasesRole(t *testing.T) {
	service := NewTeleportationService()
	session, _ := service.CreateSession()

	participant, _ := service.JoinSession(session.ID, qubit.RoleBob, "")

	beforeLeave := service.sessions[session.ID].Participants[qubit.RoleBob]
	beforeLeave.LastSeen = time.Now().Add(-time.Hour)
	service.sessions[session.ID].Participants[qubit.RoleBob] = beforeLeave

	updated, err := service.LeaveSession(session.ID, participant.Token)
	if err != nil {
		t.Fatalf("expected leave to succeed, got %v", err)
	}

	released := updated.Participants[qubit.RoleBob]
	if released.Taken || released.Token != "" || released.Connected {
		t.Fatalf("expected role to be released, got %+v", released)
	}
	if len(updated.Log) == 0 || !strings.Contains(updated.Log[len(updated.Log)-1], "Роль освобождена") {
		t.Fatalf("expected release event to be logged, log: %v", updated.Log)
	}
}
