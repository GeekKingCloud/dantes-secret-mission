// Real campaign simulation and PNG scenery, intentionally no actor rendering.
import {AssetLibrary} from '../asset-loader.mjs';
import {Renderer} from '../renderer.mjs';
import {SceneDirector} from '../scenes.mjs';
import {loadLevel} from '../level-schema.mjs';
import {STEP} from '../simulation.mjs';
const html=await(await fetch('../index.html')).text();
document.body.append(new DOMParser().parseFromString(html,'text/html').querySelector('main'));
document.querySelector('#overlay').classList.add('hidden');
document.querySelector('.brand b').textContent='LEVEL INTEGRATION LAB';
document.querySelector('.brand small').textContent='NO ACTORS · NOT FINAL GAME';
document.querySelector('#status').textContent='INPUT-ONLY CAMPAIGN · ACTOR-FREE SCENERY PROOF';
const assets=new AssetLibrary();for(const group of ['world','ui'])await assets.loadGroup(group,`../assets/${group}/manifest.json`);
const d=new SceneDirector(),r=new Renderer(document.querySelector('canvas'),assets);
const states=['title'];let calls=[];const draw=assets.draw.bind(assets);
assets.draw=(...args)=>{calls.push({group:args[1],id:args[2],x:args[4],y:args[5],alpha:args[6]?.alpha});draw(...args);};
function render(){calls=[];r.ctx.clearRect(0,0,640,360);r.ctx.imageSmoothingEnabled=false;
 if(['stage','boss'].includes(d.state)){r.stageScenery(d.game,d.camera);r.hud(d.game);}
 else if(d.state==='home-intro')r.homeScenery(d.time);else r.draw(d);
 r.ctx.fillStyle='#080f20ee';r.ctx.fillRect(0,342,640,18);r.text('ACTOR-FREE LEVEL PROOF — NOT FINAL GAME',12,354,10);
 return state();
}
function state(){return {scene:d.state,completed:[...d.completed],selection:d.selection,states,camera:{x:d.camera.x,y:d.camera.y},level:d.game?.level.id,hp:d.game?.p.hp,retries:d.game?.retries,won:d.game?.won,calls};}
async function tick(input){d.update(input,STEP);if(states.at(-1)!==d.state)states.push(d.state);
 if(d.requestedLevel){const id=d.requestedLevel;const level=await loadLevel(`../levels/${id}.json`);if(level.id!==id)throw Error('Level ID mismatch');d.setLevel(level);states.push(d.state);}
}
window.levelLab={state,render,async run(inputs){for(const i of inputs)await tick(i);return render();},assets};render();
