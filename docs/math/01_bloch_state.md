# Блоховское состояние: углы на сфере

В проекте кубит описывается простой структурой: два угла. Это нужно только для **визуализации**, а не для физической симуляции.

## Где это задаётся

### Backend (Go)

Функция `randomBlochState` выбирает случайный угол, но специально избегает полюсов - так точка на сфере выглядит заметнее.

```go
func randomBlochState() qubit.BlochState {
    theta := (0.2 * math.Pi) + r.Float64()*(0.6*math.Pi)
    phi := r.Float64() * 2 * math.Pi
    return qubit.BlochState{Theta: theta, Phi: phi}
}
```

Источник: `internal/service/teleportation_service.go`

### Frontend (Demo)

В демо-режиме есть такая же логика, чтобы состояние выглядело согласованно.

```ts
function randomBlochState(): BlochVector {
  const theta = 0.2 * Math.PI + Math.random() * 0.6 * Math.PI;
  const phi = Math.random() * 2 * Math.PI;
  return { theta, phi };
}
```

Источник: `frontend/src/state/demo/demoSteps.ts`

## Нормализация угла

Чтобы вращения оставались в пределах «круга», мы приводим `phi` к диапазону от 0 до полного оборота.

```ts
function normalizePhi(phi: number) {
  const tau = Math.PI * 2;
  const normalized = phi % tau;
  return normalized >= 0 ? normalized : normalized + tau;
}
```

Источник: `frontend/src/state/demo/demoSteps.ts`

## Коллапс после измерения

При измерении визуально фиксируем направление и показываем коллапс на полюсе сферы.

```go
func collapseBloch(initial qubit.BlochState) qubit.BlochState {
    if math.Cos(initial.Theta) >= 0 {
        return qubit.BlochState{Theta: 0, Phi: 0}
    }
    return qubit.BlochState{Theta: math.Pi, Phi: 0}
}
```

Источник: `internal/service/teleportation_service.go`
