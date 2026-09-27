import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AssetLibrary,environmentEntries} from '../asset-loader.mjs';
import {validateAudioManifest} from '../audio.mjs';
import {LevelSimulation} from '../simulation.mjs';
import {updateEnemy} from '../enemies.mjs';
const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const world=json('../assets/world/manifest.json'),ui=json('../assets/ui/manifest.json'),audio=json('../assets/audio/manifest.json');
test('production environment inventory: 57 unique IDs including 13 verified native modules',()=>{
 const records=[...environmentEntries(world),...environmentEntries(ui)];assert.equal(records.length,57);assert.equal(new Set(records.map(([id])=>id)).size,57);
 const modules=json('../assets/world/terrain/polish-pilot/modules.json').assets;
 assert.equal(modules.length,13);
 for(const source of modules){
  const a=world.assets.find(a=>a.id===source.id);assert(a,source.id);
  assert(world.required_ids.includes(a.id));
  for(const key of ['path','width','height','anchor','opaque_bbox'])assert.deepEqual(a[key],source[key]);
  const bytes=readFileSync(new URL('../assets/'+a.path,import.meta.url));
  assert.equal(bytes.readUInt32BE(16),16);assert.equal(bytes.readUInt32BE(20),a.id.includes('beam')?8:16);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
  const missing=structuredClone(world);missing.assets=missing.assets.filter(v=>v.id!==a.id);
  assert.throws(()=>environmentEntries(missing),/Missing environment asset/);
 }
 const altered=structuredClone(world);altered.assets[0].size=[1,1];assert.equal(environmentEntries(altered)[0][1].width,altered.assets[0].width);
 assert.throws(()=>environmentEntries({version:1,assets:{}}));
 const duplicate=structuredClone(world);duplicate.assets.push(duplicate.assets[0]);assert.throws(()=>environmentEntries(duplicate),/Duplicate/);
 const wrong=structuredClone(world);wrong.assets.find(a=>a.id==='portal-animation').frame_count=99;assert.throws(()=>environmentEntries(wrong));
});
test('environment paths use assets root, PNG dimensions and display scale are enforced',async()=>{
 const lib=new AssetLibrary(),paths=[];
 await lib.loadGroup('world','https://example.test/game/assets/world/manifest.json',{fetcher:async()=>({ok:true,json:async()=>world}),imageLoader:async url=>{paths.push(url);const a=world.assets.find(a=>url.endsWith(a.path));return {naturalWidth:a.width,naturalHeight:a.height};}});
 assert(paths.every(p=>p.startsWith('https://example.test/game/assets/world/')));assert.equal(lib.get('world','sky').scale,4);assert.equal(lib.get('world','portal-animation').animations.idle.frames.length,8);
 const calls=[],ctx={globalAlpha:1,save(){},restore(){},translate(){},scale(){},drawImage(...args){calls.push(args.slice(1));}};
 lib.draw(ctx,'world','home-interior','idle',0,0);assert.deepEqual(calls[0].slice(-4).map(v=>v===0?0:v),[0,0,640,360]);assert.equal(ctx.imageSmoothingEnabled,false);
});
test('single production audio format validates all delivered PCM and preserves approved bytes',()=>{
 assert(validateAudioManifest(audio));assert.equal(Object.keys(audio.music).length,10);assert.equal(Object.keys(audio.sfx).length,19);
 assert.throws(()=>validateAudioManifest({version:1,music:{},sfx:{}}));
 const invalid=structuredClone(audio);invalid.music.home.loop_end_frame_exclusive=invalid.music.home.frames+1;assert.throws(()=>validateAudioManifest(invalid),/loop markers/);
 const bytes=readFileSync(new URL('../assets/audio/music/stage1-approved.wav',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'2d182f7a8194b231352ee80bbeac0dbefa634b085f0749134a6436dac0dd8a85');
});
test('new PCM cues are event-entry hooks, without changing combat timing or collision',()=>{
 const level=json('./fixtures/controller.json'),g=new LevelSimulation(level),spider=g.enemies.find(e=>e.type==='spider');
 g.p.x=spider.x-20;g.p.y=spider.y;updateEnemy(spider,g,1/120);assert(g.events.includes('spider-windup'));g.events=[];updateEnemy(spider,g,1/120);assert(!g.events.includes('spider-windup'));
 g.boss.active=true;g.p.x=g.boss.x-40;g.p.y=g.boss.y;g.boss.face=-1;updateEnemy(g.boss,g,1/120);assert(g.events.includes('boss-windup'));
 g.events=[];g.hitEnemy(g.boss,100);assert(g.events.includes('portal-open'));assert(!g.events.includes('portal'));
});
