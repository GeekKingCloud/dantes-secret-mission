// Real delivered media with production rendering/audio, deliberately NO actors.
// Uses the shipping DOM/CSS/control handlers so mobile evidence is not a mock UI.
import {AssetLibrary} from '../asset-loader.mjs';
import {Renderer} from '../renderer.mjs';
import {AudioEngine,bindAudioVisibility} from '../audio.mjs';
import {SceneDirector} from '../scenes.mjs';
import {BrowserInput} from '../input.mjs';
const html=await(await fetch('../index.html')).text();
const doc=new DOMParser().parseFromString(html,'text/html');document.body.append(doc.querySelector('main'));
document.querySelector('#overlay').classList.add('hidden');
document.querySelector('.brand b').textContent='MEDIA LAB';
document.querySelector('.brand small').textContent='NOT FINAL GAME · ACTORS ABSENT';
document.querySelector('#status').textContent='TEST ONLY · DELIVERED PNG + PCM · NO ACTORS';
const canvas=document.querySelector('canvas'),assets=new AssetLibrary(),audio=new AudioEngine(),d=new SceneDirector(),input=new BrowserInput();
const visibility=bindAudioVisibility(audio,()=>{d.paused=true;});
for(const group of ['world','ui'])await assets.loadGroup(group,`../assets/${group}/manifest.json`);
const manifest=await(await fetch('../assets/world/manifest.json')).json();
const background=manifest.parallax_draw_order.map(id=>{const a=manifest.assets.find(a=>a.id===id);return {asset:id,x:a.logical_origin[0],y:a.logical_origin[1],factorX:a.parallax_factor,factorY:a.parallax_factor,driftX:a.drift_px_per_second,repeatX:a.repeat_x};});
const game={time:0,bossActive:false,boss:{alive:false},level:{background,surfaces:[{art:'roof-center',x:0,y:280,w:352,h:300},{art:'roof-center',x:432,y:212,w:420,h:380}],walls:[{art:'wall',x:432,y:228,w:48,h:364}],hazards:[{art:'spikes-top',x:526,y:192,w:64,h:20}],decor:[{asset:'lantern',x:307,y:280}],exit:{x:772,y:148,w:64,h:64,requiresBoss:true}}};
const renderer=new Renderer(canvas,assets),draw=assets.draw.bind(assets);let calls=[];
assets.draw=(ctx,group,id,animation,x,y,options)=>{calls.push({group,id,animation,x,y,time:options.time,alpha:options.alpha,scale:options.scale??assets.get(group,id).scale??1});draw(ctx,group,id,animation,x,y,options);};
let selected='home';
function render(scene,time=0,camera={x:0,y:0}){
 selected=scene;calls=[];const c=renderer.ctx;c.clearRect(0,0,640,360);c.imageSmoothingEnabled=false;
 if(scene==='home')renderer.homeScenery(time);
 else if(scene==='map'){d.time=time;d.selection=2;d.completed=new Set(['stage1']);renderer.map(d);}
 else if(scene==='map-complete'){d.time=time;d.selection=4;d.completed=new Set(['stage1','stage2','stage3']);renderer.map(d);}
 else if(scene==='rooftop'){game.time=time;game.bossActive=false;renderer.stageScenery(game,camera);renderer.hud({p:{hp:4,ammo:3},level:{title:'MEDIA TEST · NO ACTORS'},retries:0,bossActive:false});}
 else if(scene==='arena'){
   renderer.stageScenery({...game,time,bossActive:true,level:{...game.level,surfaces:[{art:'stone',x:0,y:320,w:640,h:40}],walls:[],hazards:[],decor:[],exit:{x:542,y:248,w:64,h:64,requiresBoss:true}}},camera);
 }else {d.state=scene==='title'?'title':'world2';d.time=time;renderer.draw(d);}
 c.fillStyle='#080f20dd';c.fillRect(0,342,640,18);renderer.text('ENVIRONMENT / AUDIO TEST — NO ACTORS — NOT FINAL GAME',10,354,10);
 return calls;
}
function sync(){audio.sync(visibility.visible&&!d.paused,d.music);}
d.state='home-intro';render('home',2.2);
document.querySelector('#sound').textContent='UNLOCK AUDIO';
document.querySelector('#sound').addEventListener('click',async()=>{try{if(!audio.ctx){await audio.start('../assets/audio/manifest.json');}else audio.musicMuted=!audio.musicMuted;sync();document.querySelector('#sound').textContent=audio.musicMuted?'MUSIC OFF':'MUSIC ON';}catch(e){window.mediaError=e.message;}});
document.querySelector('#sfx').addEventListener('click',()=>{audio.sfxMuted=!audio.sfxMuted;sync();});
document.querySelector('#pause').addEventListener('click',()=>{d.paused=!d.paused;sync();});
function state(){return {context:audio.ctx?.state,clock:audio.ctx?.currentTime,music:audio.musicName,starts:audio.starts,musicSources:audio.music?1:0,voices:audio.voices.size,decoded:audio.buffers.size,musicGain:audio.musicBus?.gain.value,sfxGain:audio.sfxBus?.gain.value,error:audio.error?.message,hidden:document.hidden,paused:d.paused,visible:visibility.visible,scene:d.state};}
window.media={assets,audio,d,render,calls:()=>calls,state,input:()=>({pending:[...input.pending],held:[...input.sources.values()]}),
 scene(name){d.state=name;if(name==='stage')d.game={level:{music:'stage1-approved'}};sync();return state();},
 track(name){d.state='stage';d.game={level:{music:name}};sync();},
 tick(dt=1/120){d.update({},dt);for(const event of d.events)audio.cue(event);sync();},
 cue:name=>audio.cue(name),sync,async decodeAll(){await Promise.all(Object.keys(audio.manifest.music).map(id=>audio.load(`music/${id}`)));return state();},
 async stop(){visibility.destroy();input.destroy();await audio.stop();}
};
window.addEventListener('pagehide',()=>audio.stop());
