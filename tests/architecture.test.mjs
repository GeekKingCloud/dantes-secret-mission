import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../renderer.mjs';

function recorder(){
  const calls=[],r=new Renderer({getContext:()=>({fillRect(){}})},{});
  r.tile=(id,rect)=>calls.push({id,...rect});
  return {r,calls};
}
test('roof course keeps exact collision top, clips partial terminals, and never stacks roof rows',()=>{
  const {r,calls}=recorder(),s={x:13,y:-71,w:61,h:24,art:'roof-center'};
  r.terrain(s,0);
  const roofs=calls.filter(c=>c.id.startsWith('pilot-roof'));
  assert.equal(roofs.length,3);
  assert(roofs.every(c=>c.y===s.y&&c.h===16&&c.x>=s.x&&c.x+c.w<=s.x+s.w));
  assert.equal(roofs.find(c=>c.id==='pilot-roof-right').x,58);
  assert(calls.some(c=>c.id==='pilot-facade-band'&&c.y===-55&&c.h===8));
});
test('contiguous collision roof pieces have only exterior terminals',()=>{
  const {r,calls}=recorder(),pieces=[0,32,64].map(x=>({x,y:40,w:32,h:16,art:'roof-center'}));
  for(const s of pieces)r.terrain(s,0,pieces);
  assert.equal(calls.filter(c=>c.id==='pilot-roof-left').length,1);
  assert.equal(calls.filter(c=>c.id==='pilot-roof-right').length,1);
  assert.equal(calls.find(c=>c.id==='pilot-roof-right').x,80);
});
test('one-way beam stays thin and never gains a fake facade underneath',()=>{
  const {r,calls}=recorder();r.terrain({x:3,y:5,w:68,h:16,kind:'oneWay',art:'eave'},0);
  assert.equal(calls.length,3);assert(calls.every(c=>c.id.startsWith('pilot-beam')&&c.y===5&&c.h===8));
});
test('climb facade uses edge posts and sparse structural bands, not roof tiles',()=>{
  const {r,calls}=recorder();r.terrain({x:0,y:0,w:64,h:500,art:'wall'},0);
  assert(calls.every(c=>!c.id.includes('roof')));
  assert.equal(calls.filter(c=>c.id==='pilot-facade-left').length,1);
  assert.equal(calls.filter(c=>c.id==='pilot-facade-right').length,1);
  assert.deepEqual(calls.filter(c=>c.id==='pilot-facade-band').map(c=>c.y),[112,256,400]);
});
