import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createParticleField, FIELD_DEPTH, resetParticleField, stepParticleField } from '../src/components/Particles/particleField.js';

const create = () => createParticleField(1440, 900, () => 0.5);
const pointer = { x: 720, y: 450, previousX: 720, previousY: 450, vx: 800, vy: 0, fresh: true };
function simulate(field, seconds, fps = 60) {
  for (let frame = 0; frame < Math.round(seconds * fps); frame += 1) stepParticleField(field, 1 / fps);
}
function screen(field, index = 0) {
  const offset = index * 3;
  const scale = FIELD_DEPTH / (FIELD_DEPTH - field.positions[offset + 2]);
  return { x: field.width / 2 + field.positions[offset] * scale, y: field.height / 2 - field.positions[offset + 1] * scale, z: field.positions[offset + 2] };
}

test('idle field contains no visible snowflakes and has a fixed small pool', () => {
  const field = create();
  assert.equal(field.count, 32);
  assert.equal(stepParticleField(field, 1 / 60), 0);
  assert(field.opacities.every((value) => value === 0));
});

test('a pointer movement creates a larger snowflake along the input path', () => {
  const field = create();
  assert.equal(stepParticleField(field, 1 / 60, pointer), 1);
  const first = screen(field);
  assert(Math.abs(first.x - pointer.x) < 3);
  assert(Math.abs(first.y - pointer.y) < 3);
  assert(field.sizes[0] >= 11 && field.sizes[0] <= 15);
  assert(field.opacities[0] > 0);
});

test('snowflake briefly inherits movement and air drag slows that horizontal motion', () => {
  const field = create();
  stepParticleField(field, 1 / 60, pointer);
  const first = screen(field);
  const initialSpeed = field.velocities[0];
  simulate(field, 0.3);
  assert(screen(field).x > first.x + 5);
  assert(field.velocities[0] > 0 && field.velocities[0] < initialSpeed);
  assert.equal(screen(field).z, first.z);
});

test('gravity accelerates snowflakes downward without springing upward', () => {
  const field = create();
  stepParticleField(field, 1 / 60, { ...pointer, vx: 0 });
  let previous = screen(field).y;
  const initialVelocity = field.velocities[1];
  for (let frame = 0; frame < 60; frame += 1) {
    stepParticleField(field, 1 / 60);
    const current = screen(field).y;
    assert(current > previous);
    previous = current;
  }
  assert(previous > pointer.y + 50 && previous < pointer.y + 100);
  assert(field.velocities[1] < initialVelocity);
});

test('stationary input does not continuously produce snowflakes', () => {
  const field = create();
  stepParticleField(field, 1 / 60, pointer);
  const next = field.next;
  for (let frame = 0; frame < 45; frame += 1) stepParticleField(field, 1 / 60, { ...pointer, fresh: false });
  assert.equal(field.next, next);
});

test('fast input is rate limited and never exceeds the snowflake pool', () => {
  const field = create();
  for (let frame = 0; frame < 600; frame += 1) {
    const x = 200 + (frame % 20) * 35;
    const active = stepParticleField(field, 1 / 60, { ...pointer, x, previousX: x - 35, fresh: false, vx: 1600 });
    assert(active <= 32);
    assert(field.positions.every(Number.isFinite));
  }
});

test('snowflakes smoothly fade out and all expire after the pointer leaves', () => {
  const field = create();
  stepParticleField(field, 1 / 60, pointer);
  simulate(field, 0.1);
  let previous = field.opacities[0];
  for (let frame = 0; frame < 90; frame += 1) {
    stepParticleField(field, 1 / 60);
    assert(field.opacities[0] <= previous + 0.00001);
    previous = field.opacities[0];
  }
  assert(field.opacities.every((value) => value === 0));
  assert.equal(stepParticleField(field, 1 / 60), 0);
});

test('30, 60 and 120 fps preserve the same falling trajectory', () => {
  const results = [30, 60, 120].map((fps) => {
    const field = create();
    stepParticleField(field, 1 / fps, pointer);
    simulate(field, 0.6 - 1 / fps, fps);
    return screen(field);
  });
  assert(Math.max(...results.map((point) => point.x)) - Math.min(...results.map((point) => point.x)) < 0.01);
  assert(Math.max(...results.map((point) => point.y)) - Math.min(...results.map((point) => point.y)) < 0.01);
});

test('reset clears snowflakes and allows a fresh interaction', () => {
  const field = create();
  stepParticleField(field, 1 / 60, pointer);
  resetParticleField(field);
  assert(field.positions.every((value) => value === 0));
  assert(field.opacities.every((value) => value === 0));
  assert.equal(stepParticleField(field, 1 / 60, pointer), 1);
});
