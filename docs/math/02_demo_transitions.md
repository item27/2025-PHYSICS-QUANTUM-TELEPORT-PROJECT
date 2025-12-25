# Демо-режим: как двигаются углы между шагами

Демо-режим не симулирует квантовую механику, но **визуально показывает** ключевые изменения. Для этого мы слегка вращаем фазу и фиксируем коллапс.

## Смещение фазы при запутывании

После шага `entangle` Боб получает фазовый сдвиг, чтобы подчеркнуть общую пару.

```ts
case 'entangle':
  if (qubit.role === 'bob') return { ...qubit, bloch: equatorBloch(teleported.phi + Math.PI / 2) };
```

Источник: `frontend/src/state/demo/useDemoState.ts`

## Дополнительный поворот на шаге объединения

Алиса помечается как «связанная», а Боб получает небольшой дополнительный поворот - это подчёркивает изменение состояния пары.

```ts
case 'combine':
  if (qubit.role === 'alice') return { ...qubit, state: 'Связана с парой' };
  if (qubit.role === 'bob') return { ...qubit, bloch: equatorBloch(teleported.phi + Math.PI / 3) };
```

Источник: `frontend/src/state/demo/useDemoState.ts`

## Коллапс при измерении

После измерения визуально «схлопываем» состояние Алисы.

```ts
case 'measure':
  if (qubit.role === 'alice')
    return { ...qubit, state: 'Измерена, исходник уничтожен', bloch: collapseBloch(teleported) };
```

Источник: `frontend/src/state/demo/useDemoState.ts`

## Восстановление у Боба

На шагах `reconstruct` и `complete` возвращаем исходное состояние на кубит Боба.

```ts
case 'reconstruct':
  if (qubit.role === 'bob') return { ...qubit, state: 'Применяет коррекцию', bloch: teleported };
case 'complete':
  if (qubit.role === 'bob') return { ...qubit, state: 'Состояние Алисы восстановлено', bloch: teleported };
```

Источник: `frontend/src/state/demo/useDemoState.ts`
