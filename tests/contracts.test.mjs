import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SceneDirector,Camera,introBeat} from '../scenes.mjs';
import {validateLevel} from '../level-schema.mjs';
import {AssetLibrary,validateAtlasManifest,relativeAssetURL} from '../asset-loader.mjs';
import {layerOffset} from '../renderer.mjs';
const fixture=()=>JSON.parse(readFileSync(new URL('./fixtures/controller.json',import.meta.url)));
const atlas=()=>({version:1,assets:{sample:{src:'sample.png',width:8,height:4,frameWidth:4,frameHeight:4,columns:2,anchor:[2,4],animations:{idle:{frames:[0,1],fps:10,loop:true}}}}});
test('mandatory intro beats, audio cues, skip and ordered unlock/replay/portal scaffold',()=>{
 const d=new SceneDirector();assert.equal(d.state,'title');d.update({confirmPressed:true},1/120);
 assert.equal(d.state,'home-intro');assert.equal(d.music,'home');const beats=new Set(),events=new Set();
 for(let n=0;n<700;n++){beats.add(introBeat(d.time));d.update({},1/120);d.events.forEach(e=>events.add(e));}
 assert.deepEqual([...beats],['meditate','help','startled','run','departure']);assert(events.has('help'));assert(events.has('jetpack'));
 assert.equal(d.state,'map');assert.equal(d.selection,1);assert(!d.unlocked('stage2'));assert(!d.unlocked('portal'));
 for(const id of ['stage1','stage2','stage3']){
  d.confirm();assert.equal(d.requestedLevel,id);const level=fixture();level.id=id;d.setLevel(level);
  d.game.won=true;d.update({},1/120);assert(d.completed.has(id));assert.equal(d.state,'map');
 }
 d.confirm();assert.equal(d.state,'world2');assert.equal(d.music,'world2');d.confirm();assert.equal(d.state,'map');
 d.selection=1;d.confirm();assert.equal(d.requestedLevel,'stage1','replay');
 const skip=new SceneDirector();skip.confirm();skip.confirm();assert.equal(skip.state,'map');
});
test('pause freezes intro and stage; lethal boss retry returns stage scene',()=>{
 const d=new SceneDirector();d.confirm();d.update({pausePressed:true},1/120);const t=d.time;d.update({},1);assert.equal(d.time,t);
 d.update({confirmPressed:true},1/120);assert(!d.paused);d.setLevel(fixture());
 d.game.bossActive=true;d.state='boss';d.game.p.hp=1;d.game.p.y=1000;
 d.update({},1/120);assert.equal(d.state,'stage');assert.equal(d.game.retries,1);
});
test('camera tracks vertical/horizontal and clamps; clouds drift independently',()=>{
 const c=new Camera(),bounds={x:0,y:-800,w:2400,h:1200};c.follow({x:1200,y:-450,face:1,vx:240,vy:-300},bounds,1);
 assert(c.x>800);assert(c.y<-600);c.follow({x:-500,y:-2000,face:-1,vx:0,vy:0},bounds,1,true);assert.equal(c.x,0);assert.equal(c.y,-800);
 const a={x:0,y:0,factorX:.1,factorY:.1,driftX:2,repeatX:true},b={...a,factorX:.3,driftX:8};
 assert.notDeepEqual(layerOffset(a,{x:500,y:100},1,640),layerOffset(b,{x:500,y:100},1,640));
 assert.notDeepEqual(layerOffset(a,c,1,640),layerOffset(a,c,3,640));
});
test('schema rejects broken geometry, duplicate IDs and missing spider walls',()=>{
 assert(validateLevel(fixture()));for(const mutate of [l=>l.surfaces[0].w=0,l=>l.enemies[0].id=l.surfaces[0].id,l=>l.enemies.find(e=>e.type==='spider').wallId='missing']){
  const l=fixture();mutate(l);assert.throws(()=>validateLevel(l),/Invalid level/);
 }
});
test('atlas validator, dimension check and explicit missing-assets failure',async()=>{
 assert(validateAtlasManifest(atlas()));const wrong=atlas();wrong.assets.sample.animations.idle.frames=[99];assert.throws(()=>validateAtlasManifest(wrong));
 for(const path of ['https://other.invalid/a.png','../a.png','%2e%2e/a.png','/a.png','a.svg'])assert.throws(()=>relativeAssetURL(path,'https://example.test/art/manifest.json'));
 const lib=new AssetLibrary(),fetcher=async()=>({ok:true,json:async()=>atlas()});
 await lib.loadGroup('test','/art/manifest.json',{fetcher,imageLoader:async()=>({naturalWidth:8,naturalHeight:4})});
 assert(lib.get('test','sample'));assert.throws(()=>lib.get('test','missing'),/Missing PNG/);
 await assert.rejects(lib.loadGroup('test','/art/manifest.json',{fetcher,imageLoader:async()=>({naturalWidth:4,naturalHeight:4})}),/dimensions/);
 await assert.rejects(lib.loadGroup('characters','/no.json',{fetcher:async()=>({ok:false,status:404})}),/no vector fallback/);
});
test('PNG draw uses integer anchor, native frame size, nearest-neighbor and flip',async()=>{
 const lib=new AssetLibrary();await lib.loadGroup('test','/manifest.json',{fetcher:async()=>({ok:true,json:async()=>atlas()}),imageLoader:async()=>({naturalWidth:8,naturalHeight:4})});
 const calls=[],ctx={globalAlpha:1,save(){},restore(){},translate(...v){calls.push(['translate',...v]);},scale(...v){calls.push(['scale',...v]);},drawImage(...v){calls.push(['draw',...v.slice(1)]);}};
 lib.draw(ctx,'test','sample','idle',10.3,20.8,{time:.1,face:-1});
 assert.equal(ctx.imageSmoothingEnabled,false);assert.deepEqual(calls,[['translate',10,21],['scale',-1,1],['draw',4,0,4,4,-2,-4,4,4]]);
});
