# Серверные вычисления по шагам

В сетевом режиме состояние меняется на сервере. Это нужно, чтобы все клиенты видели **одинаковую картину**.

## Где это происходит

Главная логика — в `AdvanceStep`, где для каждого шага меняются статус и параметры визуализации.

```go
switch session.CurrentStep().Key {
case teleportation.StepEntangle:
    session.Qubits[2].Bloch = equatorBloch(session.HiddenState.Phi)
    session.Qubits[1].Bloch = equatorBloch(session.HiddenState.Phi + math.Pi/2)
case teleportation.StepCombine:
    session.Qubits[2].Bloch = equatorBloch(session.HiddenState.Phi + math.Pi/3)
case teleportation.StepMeasure:
    session.Qubits[0].Bloch = collapseBloch(session.HiddenState)
case teleportation.StepReconstruct:
    session.Qubits[1].Bloch = session.HiddenState
}
```

Источник: `internal/service/teleportation_service.go`

## Почему используется HiddenState

`HiddenState` хранит исходные параметры Алисы. Мы не показываем их напрямую, но используем как **источник истины** для визуального восстановления у Боба.

```go
session := &teleportation.SessionState{
    HiddenState:  unknownState,
    Qubits: []qubit.Qubit{
        {ID: "q1", Role: qubit.RoleAlice, Bloch: unknownState},
        {ID: "q2", Role: qubit.RoleBob, Bloch: bobBase},
        {ID: "q3", Role: qubit.RoleCharlie, Bloch: charlieBase},
    },
}
```

Источник: `internal/service/teleportation_service.go`
