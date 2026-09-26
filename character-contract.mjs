// One inventory for canonical assembly and the shipping completeness gate.
export const CHARACTER_ACTIONS=Object.freeze({
 kagebot:['idle','run-low','jump-rise','fall','frontflip','wall-hold','wall-climb','wall-jump','dash','sword-1','sword-2','sword-3','laser','hurt','finisher','meditate','startled','drone-depart'],
 'robot-butler':['idle','eyes-widen'],'jetpack-drone':['idle','boost'],
 zombie:['idle','walk','attack','hurt','defeat'],
 bear:['idle','walk','slash-windup','slash','hurt','defeat'],
 ghost:['hover','dive-windup','dive','hurt','defeat'],
 spider:['wall-idle','climb','venom-windup','spit','hurt','defeat'],
 'masked-mutant-boss':['idle','move','windup','slash','burst','hurt','defeat'],
});
export function missingCharacterActions(assets) {
 return Object.entries(CHARACTER_ACTIONS).flatMap(([id,names])=>names.filter(name=>!assets[id]?.animations?.[name]).map(name=>`${id}/${name}`));
}
