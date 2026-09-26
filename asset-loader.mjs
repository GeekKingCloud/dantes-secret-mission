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
export class AssetLibrary {
  constructor(){this.groups=new Map();}
  async loadGroup(group,url,{fetcher=fetch,imageLoader=loadImage}={}) {
    const manifestURL=new URL(url,globalThis.location?.href||'http://localhost/').href;
    const response=await fetcher(manifestURL);
    if(!response.ok)throw new MissingAssetError(`Missing ${group} manifest: ${url} (${response.status}). Import real PNG assets; no vector fallback.`);
    const manifest=validateAtlasManifest(await response.json());
    const entries=await Promise.all(Object.entries(manifest.assets).map(async([id,meta])=>{
      const image=await imageLoader(relativeAssetURL(meta.src,manifestURL));
      if(image.naturalWidth!==meta.width||image.naturalHeight!==meta.height)throw new MissingAssetError(`${group}/${id}: PNG dimensions disagree with manifest`);
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
  draw(ctx,group,id,animation,x,y,{time=0,face=1,alpha=1,weak=false}={}) {
    const asset=this.get(group,id,animation),a=asset.animations[animation];
    const index=Math.max(0,Math.floor(time*a.fps));
    const frame=a.frames[a.loop?index%a.frames.length:Math.min(index,a.frames.length-1)];
    const anchor=a.anchor||asset.anchor;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=alpha;
    ctx.translate(Math.round(x),Math.round(y));ctx.scale(face,1);
    if(weak&&!asset.redImage){
      const layer=new OffscreenCanvas(asset.width,asset.height),red=layer.getContext('2d');
      red.drawImage(asset.image,0,0);red.globalCompositeOperation='source-atop';
      red.fillStyle='rgba(255,40,48,.6)';red.fillRect(0,0,asset.width,asset.height);asset.redImage=layer;
    }
    ctx.drawImage(weak?asset.redImage:asset.image,(frame%asset.columns)*asset.frameWidth,Math.floor(frame/asset.columns)*asset.frameHeight,
      asset.frameWidth,asset.frameHeight,-Math.round(anchor[0]),-Math.round(anchor[1]),asset.frameWidth,asset.frameHeight);
    ctx.restore();
  }
}
