export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const approach = (v, target, amount) => v + clamp(target - v, -amount, amount);
export const rect = (x, y, w, h) => ({x, y, w, h});
export const bodyBox = (p, size) => rect(p.x - size.w / 2, p.y - size.h, size.w, size.h);
export const overlap = (a, b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
export const solids = level => [...level.surfaces.filter(s => s.kind === 'solid'), ...level.walls];

// Axis sweeps prevent a fast dash tunnelling through even a one-pixel wall.
export function moveBody(p, size, level, dx, dy) {
  let hitX = 0, hitY = 0;
  const box = bodyBox(p, size);
  let travel = dx;
  for (const s of solids(level)) {
    if (box.y >= s.y+s.h || box.y+box.h <= s.y) continue;
    if (dx > 0 && box.x+box.w <= s.x+.001 && box.x+box.w+travel >= s.x) {
      travel = Math.min(travel, s.x-(box.x+box.w)); hitX = 1;
    } else if (dx < 0 && box.x >= s.x+s.w-.001 && box.x+travel <= s.x+s.w) {
      travel = Math.max(travel, s.x+s.w-box.x); hitX = -1;
    }
  }
  p.x += travel;
  const moved = bodyBox(p, size);
  travel = dy;
  for (const s of [...level.surfaces, ...level.walls]) {
    if (moved.x >= s.x+s.w || moved.x+moved.w <= s.x) continue;
    if (dy >= 0 && moved.y+moved.h <= s.y+.001 && moved.y+moved.h+travel >= s.y) {
      travel = Math.min(travel, s.y-(moved.y+moved.h)); hitY = 1;
    } else if (s.kind !== 'oneWay' && dy < 0 && moved.y >= s.y+s.h-.001 && moved.y+travel <= s.y+s.h) {
      travel = Math.max(travel, s.y+s.h-moved.y); hitY = -1;
    }
  }
  p.y += travel;
  return {hitX, hitY};
}
export function wallContact(p, size, level) {
  const b = bodyBox(p, size);
  for (const w of level.walls) {
    if (!w.climbable || b.y >= w.y+w.h || b.y+b.h <= w.y+1) continue;
    if (Math.abs(b.x+b.w-w.x) < 1.1) return 1;
    if (Math.abs(b.x-w.x-w.w) < 1.1) return -1;
  }
  return 0;
}
