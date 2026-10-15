export const FIELD_DEPTH = 900;
const MAX_SNOWFLAKES = 32;
const EMISSION_RATE = 22;
const PATH_SPACING = 18;
const GRAVITY = 85;
const PALETTE = [[36 / 255, 73 / 255, 216 / 255], [8 / 255, 122 / 255, 145 / 255]];

const smooth = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export function createParticleField(width, height, random = Math.random) {
  const count = MAX_SNOWFLAKES;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const angles = new Float32Array(count);
  const opacities = new Float32Array(count);
  const ages = new Float32Array(count);
  const lifetimes = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    colors.set(PALETTE[random() < 0.78 ? 0 : 1], index * 3);
  }
  return { width, height, count, random, positions, velocities, sizes, colors, angles, opacities, ages, lifetimes, next: 0, credit: 1, travel: 0 };
}

function emitSnowflakes(field, delta, pointer) {
  field.credit = Math.min(2, field.credit + delta * EMISSION_RATE);
  if (!pointer) return;
  const dx = pointer.x - pointer.previousX;
  const dy = pointer.y - pointer.previousY;
  const distance = Math.hypot(dx, dy);
  if (!pointer.fresh && distance === 0) return;
  field.travel += distance;
  const wanted = pointer.fresh ? 1 : Math.floor(field.travel / PATH_SPACING);
  if (!wanted) return;
  field.travel %= PATH_SPACING;
  const amount = Math.min(wanted, Math.floor(field.credit), 2);

  for (let number = 0; number < amount; number += 1) {
    const index = field.next;
    field.next = (field.next + 1) % field.count;
    const offset = index * 3;
    const fraction = (number + 1) / (amount + 1);
    const z = (field.random() - 0.5) * 120;
    const scale = FIELD_DEPTH / (FIELD_DEPTH - z);
    const x = pointer.previousX + dx * fraction + (field.random() - 0.5) * 10;
    const y = pointer.previousY + dy * fraction + (field.random() - 0.5) * 8;
    field.positions.set([(x - field.width / 2) / scale, (field.height / 2 - y) / scale, z], offset);
    // Only inherit velocity at birth. Air drag releases the flake from the path.
    const driftX = Math.max(-60, Math.min(60, pointer.vx * 0.1));
    const driftY = 18 + field.random() * 12 + Math.max(-30, Math.min(30, pointer.vy * 0.08));
    field.velocities.set([driftX / scale, -driftY / scale, 0], offset);
    field.sizes[index] = 22 + field.random() * 6;
    field.angles[index] = field.random() * Math.PI / 3;
    field.ages[index] = 0;
    field.lifetimes[index] = 1.05 + field.random() * 0.25;
    field.opacities[index] = 0;
    field.credit -= 1;
  }
}

export function stepParticleField(field, elapsed, pointer = null) {
  const delta = Math.max(0, Math.min(elapsed, 0.04));
  emitSnowflakes(field, delta, pointer);
  const drag = Math.exp(-2.4 * delta);
  let active = 0;

  for (let index = 0; index < field.count; index += 1) {
    const life = field.lifetimes[index];
    if (!life) continue;
    const age = field.ages[index] + delta;
    field.ages[index] = age;
    if (age >= life) {
      field.lifetimes[index] = 0;
      field.opacities[index] = 0;
      continue;
    }
    const offset = index * 3;
    const scale = FIELD_DEPTH / (FIELD_DEPTH - field.positions[offset + 2]);
    const gravity = GRAVITY / scale;
    field.positions[offset] += field.velocities[offset] * (1 - drag) / 2.4;
    field.velocities[offset] *= drag;
    field.positions[offset + 1] += field.velocities[offset + 1] * delta - gravity * delta * delta / 2;
    field.velocities[offset + 1] -= gravity * delta;
    field.opacities[index] = smooth(age / 0.07) * smooth((life - age) / 0.35);
    active += 1;
  }
  return active;
}

export function resetParticleField(field) {
  field.positions.fill(0);
  field.velocities.fill(0);
  field.opacities.fill(0);
  field.ages.fill(0);
  field.lifetimes.fill(0);
  field.next = 0;
  field.credit = 1;
  field.travel = 0;
}
