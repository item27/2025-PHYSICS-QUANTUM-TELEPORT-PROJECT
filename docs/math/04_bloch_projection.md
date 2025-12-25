# Проекция на 2D: плоская схема Блоха

Чтобы отрисовать схему Блоха в 2D, мы переводим углы в координаты на плоскости без дополнительного наклона и поворота.

## Преобразование углов в координаты

```tsx
const x = Math.sin(vector.theta) * Math.cos(vector.phi);
const y = Math.sin(vector.theta) * Math.sin(vector.phi);
```

Источник: `frontend/src/components/visuals/BlochSphere.tsx`

## Плоская проекция в координаты SVG

```tsx
const px = center + x * radius;
const py = center - y * radius;
```

Источник: `frontend/src/components/visuals/BlochSphere.tsx`

## Как использовать результат

Дальше мы просто рисуем линию от центра к точке и отмечаем её кругом - так получается «стрелка состояния».

```tsx
<line x1={center} y1={center} x2={point.x} y2={point.y} />
<circle cx={point.x} cy={point.y} r={6} />
```

Источник: `frontend/src/components/visuals/BlochSphere.tsx`
