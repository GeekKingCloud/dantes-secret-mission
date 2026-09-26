const fail = message => { throw new Error(`Invalid level: ${message}`); };
const finite = (value, name) => { if (!Number.isFinite(value)) fail(name); };
const text = (value, name) => { if (typeof value !== 'string' || !value.trim()) fail(name); };
const array = (value, name) => { if (!Array.isArray(value)) fail(name); };
const point = (p, name) => { if (!p) fail(name); finite(p.x,`${name}.x`); finite(p.y,`${name}.y`); };
const rectangle = (r, name) => { point(r,name); finite(r.w,`${name}.w`); finite(r.h,`${name}.h`); if(r.w<=0||r.h<=0)fail(`${name} positive size`); };
const spawn = (s, name) => { point(s,name); if(![-1,1].includes(s.face))fail(`${name}.face`); };
const flag = (v, name) => { if(typeof v!=='boolean')fail(name); };
export function validateLevel(l) {
  if(l?.version!==1)fail('version must be 1');
  text(l.id,'id');text(l.title,'title');rectangle(l.bounds,'bounds');rectangle(l.camera,'camera');
  if(l.camera.w<640||l.camera.h<360)fail('camera must fit 640x360');
  spawn(l.spawn,'spawn');
  for(const key of ['surfaces','walls','hazards','enemies','checkpoints','background','decor'])array(l[key],key);
  const ids = new Set();
  const identify = o => {text(o.id,'object.id');if(ids.has(o.id))fail(`duplicate ${o.id}`);ids.add(o.id);};
  for(const s of l.surfaces){identify(s);rectangle(s,s.id);if(!['solid','oneWay'].includes(s.kind))fail(`${s.id}.kind`);text(s.art,`${s.id}.art`);}
  for(const w of l.walls){identify(w);rectangle(w,w.id);flag(w.climbable,`${w.id}.climbable`);text(w.art,`${w.id}.art`);}
  for(const h of l.hazards){identify(h);rectangle(h,h.id);if(!['spikes','pit'].includes(h.type))fail(`${h.id}.type`);if(!Number.isInteger(h.damage)||h.damage<1)fail(`${h.id}.damage`);if(h.type==='spikes')text(h.art,`${h.id}.art`);}
  for(const e of l.enemies){
    identify(e);spawn(e,e.id);if(!['zombie','bear','ghost','spider'].includes(e.type))fail(`${e.id}.type`);
    finite(e.patrol?.min,`${e.id}.patrol.min`);finite(e.patrol?.max,`${e.id}.patrol.max`);
    if(e.patrol.min>=e.patrol.max)fail(`${e.id}.patrol order`);
    if(e.type==='spider'&&!l.walls.some(w=>w.id===e.wallId&&w.climbable))fail(`${e.id}.wallId`);
  }
  for(const cp of l.checkpoints){identify(cp);rectangle(cp,cp.id);spawn(cp.spawn,`${cp.id}.spawn`);}
  if(l.boss!==null){const b=l.boss;if(!b)fail('boss must be object or null');identify(b);spawn(b,b.id);if(b.type!=='masked-mutant-boss')fail('boss.type');rectangle(b.arena,'boss.arena');rectangle(b.trigger,'boss.trigger');}
  rectangle(l.exit,'exit');flag(l.exit.requiresBoss,'exit.requiresBoss');if(l.exit.requiresBoss&&!l.boss)fail('exit requires a boss');
  for(const b of l.background){text(b.asset,'background.asset');point(b,'background');for(const k of ['factorX','factorY','driftX'])finite(b[k],`background.${k}`);flag(b.repeatX,'background.repeatX');}
  for(const d of l.decor){point(d,'decor');text(d.asset,'decor.asset');}
  if(!['stage1-approved','stage2','stage3'].includes(l.music))fail('music');
  return l;
}
export async function loadLevel(url, fetcher=fetch) {
  const res=await fetcher(url);
  if(!res.ok)throw new Error(`Missing level data: ${url} (${res.status}). No fixture substitution.`);
  return validateLevel(await res.json());
}
