// Diagnostic scenarios only. Not imported by the shipping runtime.
export function combatFixture(base,type='bear') {
  const level=structuredClone(base);level.id='combat-fixture';level.title='COMBAT LAB — NOT CAMPAIGN ART';
  level.spawn={x:100,y:300,face:-1};level.enemies=[{id:'target',type,x:170,y:300,face:-1,patrol:{min:150,max:400}}];
  level.boss=null;level.exit.requiresBoss=false;return level;
}
export const bearSequence=[
  [0,{laserPressed:true}], [1,{right:true}], [2,{attackPressed:true}],
  [22,{attackPressed:true}], [52,{attackPressed:true}],
  [105,{dashPressed:true}], [130,{left:true}], [131,{finishPressed:true}],
];
