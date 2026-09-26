import {missingCharacterActions} from './character-contract.mjs';
export class MissingAssetError extends Error {}
export function relativeAssetURL(src,manifestURL,extension=/\.png$/i) {
  if(typeof src!=='string'||!extension.test(src)||src.startsWith('/')||src.includes('..')||src.includes(':')||src.includes('\\'))
    throw new MissingAssetError(`Unsafe or unsupported asset URL in ${manifestURL}`);
  const url=new URL(src,manifestURL);
  if(!url.href.startsWith(new URL('.',manifestURL).href))throw new MissingAssetError('Asset escapes manifest directory');
  return url.href;
}
export function validateAtlasManifest(manifest) {
  if(manifest?.version!==1||!manifest.assets||typeof manifest.assets!=='object')throw new MissingAssetError('Expected PNG atlas manifest version 1');
  for(const [id,a] of Object.entries(manifest.assets)) {
    for(const key of ['width','height','frameWidth','frameHeight','columns'])
      if(!Number.isInteger(a[key])||a[key]<=0)throw new MissingAssetError(`${id}: invalid ${key}`);
    if(a.width%a.frameWidth||a.height%a.frameHeight||a.columns!==a.width/a.frameWidth)
      throw new MissingAssetError(`${id}: inconsistent atlas grid`);
    const anchor=v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite);
    if(!anchor(a.anchor))throw new MissingAssetError(`${id}: missing feet anchor`);
    if(!a.animations||!Object.keys(a.animations).length)throw new MissingAssetError(`${id}: missing animations`);
    const count=a.columns*a.height/a.frameHeight;
    for(const [name,animation] of Object.entries(a.animations)) {
      if(!Array.isArray(animation.frames)||!animation.frames.length||animation.frames.some(f=>!Number.isInteger(f)||f<0||f>=count)||
        !(animation.fps>0)||!Number.isFinite(animation.fps)||typeof animation.loop!=='boolean'||(animation.anchor&&!anchor(animation.anchor)))
        throw new MissingAssetError(`${id}/${name}: invalid animation`);
    }
  }
  return manifest;
}
export async function loadImage(url) {
  const image=new Image();image.src=url;
  try{await image.decode();}catch{throw new MissingAssetError(`Missing PNG: ${url}`);}
  return image;
}
// World/UI have one accepted production schema. Actor atlases retain their
// separately owned established contract; neither reader accepts legacy aliases.
export function environmentEntries(manifest) {
  if(manifest?.schema_version!==2||manifest.path_base!=='assets/'||!Array.isArray(manifest.assets))throw new MissingAssetError('Expected environment manifest schema 2, assets-root paths');
  const ids=new Set();
  const entries=manifest.assets.map(a=>{
    if(typeof a.id!=='string'||ids.has(a.id))throw new MissingAssetError('Duplicate/invalid environment ID');ids.add(a.id);
    const count=a.frame_count??1,w=a.frame_width??a.width,h=a.frame_height??a.height;
    const meta={src:a.path,width:a.width,height:a.height,frameWidth:w,frameHeight:h,columns:a.width/w,anchor:a.anchor,
      scale:a.display_scale??1,opaqueBounds:a.opaque_bbox,textSafe:a.text_safe_rect,
      animations:{idle:{frames:Array.from({length:count},(_,n)=>n),fps:count===1?1:a.fps,loop:count>1?a.loop:false}}};
    if(!(meta.scale>0)||!Number.isFinite(meta.scale)||!Number.isInteger(count)||count<1)throw new MissingAssetError(`${a.id}: invalid scale/frame count`);
    validateAtlasManifest({version:1,assets:{[a.id]:meta}});
    return [a.id,meta];
  });
  for(const id of manifest.required_ids||[])if(!ids.has(id))throw new MissingAssetError(`Missing environment asset ${id}`);
  return entries;
}
export class AssetLibrary {
  constructor(){this.groups=new Map();}
  async loadGroup(group,url,{fetcher=fetch,imageLoader=loadImage}={}) {
    const manifestURL=new URL(url,globalThis.location?.href||'http://localhost/').href;
    const response=await fetcher(manifestURL);
    if(!response.ok)throw new MissingAssetError(`Missing ${group} manifest: ${url} (${response.status}). Import real PNG assets; no vector fallback.`);
    const manifest=await response.json();
    const environment=group==='world'||group==='ui';
    const records=environment?environmentEntries(manifest):Object.entries(validateAtlasManifest(manifest).assets);
    const base=environment?new URL('../',manifestURL).href:manifestURL;
    const entries=await Promise.all(records.map(async([id,meta])=>{
      const image=await imageLoader(relativeAssetURL(meta.src,base));
      if(image.naturalWidth!==meta.width||image.naturalHeight!==meta.height)throw new MissingAssetError(`${group}/${id}: PNG dimensions disagree with manifest`);
      if(meta.projectileVisual){
        const v=meta.projectileVisual;validateAtlasManifest({version:1,assets:{projectile:v}});
        v.image=await imageLoader(relativeAssetURL(v.src,base));
        if(v.image.naturalWidth!==v.width||v.image.naturalHeight!==v.height)throw new MissingAssetError(`${id}: projectile dimensions disagree`);
      }
      return [id,{...meta,image}];
    }));
    this.groups.set(group,new Map(entries));
  }
  get(group,id,animation='idle') {
    const asset=this.groups.get(group)?.get(id);
    if(!asset)throw new MissingAssetError(`Missing PNG asset: ${group}/${id}`);
    if(!asset.animations[animation])throw new MissingAssetError(`Missing PNG animation: ${group}/${id}/${animation}`);
    return asset;
  }
  requireCharacters() {
    const missing=missingCharacterActions(Object.fromEntries(this.groups.get('characters')||[]));
    if(missing.length)throw new MissingAssetError(`Missing accepted character animations: ${missing.join(', ')}. No actor fallback.`);
  }
  draw(ctx,group,id,animation,x,y,options={}) {this.drawAsset(ctx,this.get(group,id,animation),animation,x,y,options);}
  drawProjectile(ctx,id,x,y,time){this.drawAsset(ctx,this.get('characters',id,'spit').projectileVisual,'fly',x,y,{time});}
  drawAsset(ctx,asset,animation,x,y,{time=0,face=1,alpha=1,weak=false,scale,frame:selectedFrame}={}) {
    const a=asset.animations[animation];
    scale??=asset.scale??1;
    const index=Math.max(0,Math.floor(time*a.fps));
    const frame=selectedFrame??a.frames[a.loop?index%a.frames.length:Math.min(index,a.frames.length-1)];
    if(!Number.isInteger(frame)||frame<0||frame>=asset.columns*asset.height/asset.frameHeight)throw new MissingAssetError('Invalid selected atlas frame');
    const anchor=a.anchor||asset.anchor;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=alpha;
    ctx.translate(Math.round(x),Math.round(y));ctx.scale(face,1);
    if(weak&&!asset.redImage){
      const layer=new OffscreenCanvas(asset.width,asset.height),red=layer.getContext('2d');
      red.drawImage(asset.image,0,0);red.globalCompositeOperation='source-atop';
      red.fillStyle='rgba(255,40,48,.6)';red.fillRect(0,0,asset.width,asset.height);asset.redImage=layer;
    }
    ctx.drawImage(weak?asset.redImage:asset.image,(frame%asset.columns)*asset.frameWidth,Math.floor(frame/asset.columns)*asset.frameHeight,
      asset.frameWidth,asset.frameHeight,-Math.round(anchor[0]*scale),-Math.round(anchor[1]*scale),Math.round(asset.frameWidth*scale),Math.round(asset.frameHeight*scale));
    ctx.restore();
  }
}
