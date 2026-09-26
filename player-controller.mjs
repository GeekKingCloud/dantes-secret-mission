import {approach, bodyBox, moveBody, wallContact} from './geometry.mjs';

export const BODY = Object.freeze({w:18, h:42});
export const FEEL = Object.freeze({
  run:240, groundAccel:2600, brake:3300, airAccel:1800,
  jump:430, doubleJump:390, jumpCut:175, riseGravity:1350, fallGravity:1900,
  apexGravity:900, apexBand:45, terminal:720, coyote:.10, buffer:.12,
  wallClimb:110, wallSlide:75, wallKick:280, wallJump:410, kickLock:.14,
  dashSpeed:760, dashTime:.20, dashCooldown:.65, dashIframes:.20,
});
export class PlayerController {
  constructor(spawn) {
    Object.assign(this, spawn, {vx:0, vy:0, on:false, wall:0, coyote:0,
      buffer:0, airJumps:1, dash:0, dashCD:0, dashInv:0, inv:0,
      kick:0, flip:0, hurt:0, hp:4, ammo:4, pose:'idle', events:[]});
  }
  get box() { return bodyBox(this, BODY); }
  update(i, level, dt) {
    this.events = [];
    for (const key of ['coyote','buffer','dashCD','dashInv','inv','kick','flip','hurt'])
      this[key] = Math.max(0, this[key]-dt);
    if (this.on) this.coyote = FEEL.coyote;
    if (i.jumpPressed) this.buffer = FEEL.buffer;
    const direction = Number(!!i.right)-Number(!!i.left);
    const wasWall = this.wall;
    this.wall = this.kick > 0 ? 0 : wallContact(this, BODY, level);
    if (this.wall) this.airJumps = 1;
    if (direction && !this.dash && !this.kick && !this.hurt) this.face = direction;

    // Ground dash cancels sword in combat; jump cancels dash, hurt cancels both.
    // A wall/air press is deliberately NOT buffered into a later ground dash.
    if (i.dashPressed && this.on && !this.dashCD && !this.hurt) {
      this.dash = FEEL.dashTime;
      this.dashCD = FEEL.dashCooldown;
      this.dashInv = FEEL.dashIframes;
      this.vy = 0;
      this.events.push('dash');
    }
    if (this.buffer && !this.hurt && (this.wall || this.coyote || this.airJumps)) {
      this.jump();
    }
    if (!i.jump && this.vy < -FEEL.jumpCut) this.vy = -FEEL.jumpCut;

    if (this.dash > 0) {
      this.vx = this.face*FEEL.dashSpeed;
      this.vy = 0;
    } else if (!this.kick && !this.hurt) {
      this.vx = approach(this.vx, direction*FEEL.run,
        (this.on ? direction ? FEEL.groundAccel : FEEL.brake : FEEL.airAccel)*dt);
    }
    if (!this.dash) {
      if (this.wall && !this.hurt && (i.climb || direction === this.wall)) {
        this.vy = i.climb ? -FEEL.wallClimb : Math.min(0, this.vy);
      } else {
        const gravity = this.vy < 0 ? FEEL.riseGravity : FEEL.fallGravity;
        const apex = i.jump && Math.abs(this.vy) < FEEL.apexBand;
        this.vy = Math.min(FEEL.terminal, this.vy+(apex ? FEEL.apexGravity : gravity)*dt);
        if (this.wall) this.vy = Math.min(this.vy, FEEL.wallSlide);
      }
    }
    const dashDt = this.dash ? Math.min(this.dash, dt) : dt;
    const collision = moveBody(this, BODY, level, this.vx*dashDt, this.vy*dt);
    this.on = collision.hitY === 1;
    if (collision.hitY) this.vy = 0;
    if (collision.hitX) { this.vx = 0; this.dash = 0; }
    else this.dash = Math.max(0, this.dash-dt);
    if (this.dash < 1e-9) this.dash = 0;
    this.wall = this.on || this.kick ? 0 : wallContact(this, BODY, level);
    if (this.wall && !wasWall) this.events.push('wall-contact');
    if (this.on) {
      this.airJumps = 1; this.flip = 0;
      // A buffered press is fulfilled on the actual landing tick.
      if (this.buffer && !this.hurt) this.jump();
    }
    this.pose = this.hurt ? 'hurt' : this.dash ? 'dash' : this.kick ? 'wall-jump' :
      this.wall ? i.climb ? 'wall-climb' : 'wall-hold' : this.flip ? 'frontflip' :
      !this.on ? this.vy < 0 ? 'jump-rise' : 'fall' : Math.abs(this.vx)>8 ? 'run-low' : 'idle';
  }
  jump() {
    const wall = this.wall;
    const double = !wall && !this.coyote && !this.on;
    if (wall) {
      this.vx = -wall*FEEL.wallKick; this.vy = -FEEL.wallJump;
      this.face = -wall; this.kick = FEEL.kickLock;
    } else {
      this.vy = -(double ? FEEL.doubleJump : FEEL.jump);
      if (double) { this.airJumps = 0; this.flip = .42; }
    }
    this.buffer = 0; this.coyote = 0; this.on = false; this.wall = 0;
    this.dash = 0; this.dashInv = 0;
    this.events.push(double ? 'doublejump' : 'jump');
  }
}
