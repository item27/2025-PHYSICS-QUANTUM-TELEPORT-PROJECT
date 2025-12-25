# Проекция на 2D: как рисуется точка на сфере

Чтобы отрисовать сферу Блоха в 2D, мы переводим углы в координаты и добавляем лёгкий наклон и поворот. Это делает изображение глубже, но остаётся простым.

## Преобразование углов в координаты

```tsx
const x = Math.sin(vector.theta) * Math.cos(vector.phi) * r;
const y = Math.sin(vector.theta) * Math.sin(vector.phi) * r;
const z = Math.cos(vector.theta) * r;
```

Источник: `frontend/src/components/visuals/BlochSphere.tsx`

## Небольшой поворот для объёма

```tsx
const rotX = x * Math.cos(yaw) - y * Math.sin(yaw);
const rotY = x * Math.sin(yaw) + y * Math.cos(yaw);
const px = center + rotX * radius;
const py = center - (rotY * Math.cos(tilt) - z * Math.sin(tilt)) * radius;
```

Источник: `frontend/src/components/visuals/BlochSphere.tsx`

## Как использовать результат

Дальше мы просто рисуем линию от центра к точке и отмечаем её кругом — так получается «стрелка состояния».

```tsx
<line x1={center} y1={center} x2={point.x} y2={point.y} />
<circle cx={point.x} cy={point.y} r={6} />
```

Источник: `frontend/src/components/visuals/BlochSphere.tsx`
