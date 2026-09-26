import {readFile} from 'node:fs/promises';
import {validateLevel} from '../level-schema.mjs';
const paths=process.argv.slice(2);
if(!paths.length){console.error('Usage: node tools/validate-levels.mjs <level.json> [...]');process.exitCode=1;}
for(const path of paths){try{const l=validateLevel(JSON.parse(await readFile(path,'utf8')));console.log(`VALID ${path}: ${l.id}, ${l.enemies.length} enemies, ${l.walls.length} walls`);}catch(error){console.error(error.message);process.exitCode=1;}}
