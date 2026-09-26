import {Pad} from './gamepad.mjs';
// Queue input edges across render frames; deliver once on the next physics step.
export function runSteps(acc, pending, update, quantum=1/120){
 let first=true;
 while(acc>=quantum){
  const edges=first?new Set(pending):new Set();
  if(first)pending.clear();
  const keepGoing=update(edges);
  acc-=quantum;
  first=false;
  if(keepGoing===false)break;
 }
 return acc;
}

const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'climb',KeyW:'climb',Space:'jump',KeyJ:'attack',KeyK:'dash',KeyL:'laser',KeyF:'finish',Escape:'pause',KeyP:'pause',Enter:'confirm'};
export class BrowserInput {
 constructor(target=window,root=document){
  this.sources=new Map();this.pending=new Set();this.pad=new Pad();this.lastPad=new Set();this.target=target;
  this.down=e=>{const key=keys[e.code];if(!key)return;e.preventDefault();if(!e.repeat)this.set(`key:${e.code}`,key,true);};
  this.up=e=>{const key=keys[e.code];if(key){e.preventDefault();this.set(`key:${e.code}`,key,false);}};
  this.blur=()=>this.clear();target.addEventListener('keydown',this.down);target.addEventListener('keyup',this.up);target.addEventListener('blur',this.blur);
  for(const button of root.querySelectorAll('[data-key]')){
   const key=button.dataset.key;
   button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);this.set(`touch:${e.pointerId}`,key,true);});
   for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>this.set(`touch:${e.pointerId}`,key,false));
  }
 }
 set(source,key,down){if(down){if(!this.sources.has(source))this.pending.add(key);this.sources.set(source,key);}else this.sources.delete(source);}
 poll(pads){const state=this.pad.poll(pads);for(const key of state.pressed)this.pending.add(key);
  for(const key of ['left','right','climb'])if(state.held.has(key)&&!this.lastPad.has(key))this.pending.add(key);
  this.lastPad=state.held;return new Set([...this.sources.values(),...state.held]);}
 clear(){this.sources.clear();this.pending.clear();this.lastPad.clear();this.pad.clear();}
 snapshot(held,edges){const i={};for(const key of ['left','right','climb','jump'])i[key]=held.has(key);
  for(const key of ['jump','attack','dash','laser','finish','pause','confirm','left','right'])i[`${key}Pressed`]=edges.has(key);return i;}
 destroy(){this.clear();this.target.removeEventListener('keydown',this.down);this.target.removeEventListener('keyup',this.up);this.target.removeEventListener('blur',this.blur);}
}
