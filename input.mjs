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
