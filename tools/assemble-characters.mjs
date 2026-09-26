// Explicit accepted inputs, one generated schema-v1 runtime manifest. No discovery.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateAtlasManifest,relativeAssetURL} from '../asset-loader.mjs';
import {missingCharacterActions} from '../character-contract.mjs';
const root=fileURLToPath(new URL('../assets/characters/',import.meta.url)),assets={};
if(!process.argv[2])throw Error('Supply accepted actor manifest filenames explicitly');
for(const name of process.argv.slice(2)){
 const path=resolve(name);if(dirname(path)!==root.slice(0,-1))throw Error('Actor inputs must share assets/characters directory');
 const manifest=validateAtlasManifest(JSON.parse(await readFile(path,'utf8')));
 for(const [id,a] of Object.entries(manifest.assets)){
  if(assets[id])throw Error(`Duplicate actor ${id}`);relativeAssetURL(a.src,new URL('../assets/characters/manifest.json',import.meta.url));assets[id]=a;
 }
}
const missing=missingCharacterActions(assets);
await writeFile(resolve(root,'manifest.json'),JSON.stringify({version:1,assets,missing},null,2)+'\n');
console.log(`Assembled ${Object.keys(assets).length} actors; ${missing.length} missing required actions. Shipping rejects incomplete inventory.`);
