import {relativeAssetURL} from './asset-loader.mjs';
export class AudioEngine {
  constructor(){this.ctx=null;this.buffers=new Map();this.music=null;this.musicName=null;this.musicMuted=false;this.sfxMuted=false;this.loading=null;this.starts=0;}
  async start(url='assets/audio/manifest.json') {
    if(this.loading){await this.ctx.resume();return this.loading;}
    this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=.68;
    const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=8;
    this.master.connect(limiter).connect(this.ctx.destination);
    // Resume in the gesture, before asynchronous fetch/decode work.
    const resumed=this.ctx.resume();
    this.loading=(async()=>{
      const manifestURL=new URL(url,location.href).href,response=await fetch(manifestURL);
      if(!response.ok)throw new Error(`Missing audio manifest (${response.status})`);
      const manifest=await response.json();
      if(manifest.version!==1||!manifest.music||!manifest.sfx)throw new Error('Invalid audio manifest');
      await Promise.all(['music','sfx'].flatMap(group=>Object.entries(manifest[group]).map(async([name,entry])=>{
        if(!Number.isFinite(entry.gain)||entry.gain<0||entry.gain>1||group==='music'&&typeof entry.loop!=='boolean')throw new Error(`Invalid audio metadata: ${group}/${name}`);
        const res=await fetch(relativeAssetURL(entry.src,manifestURL,/\.(wav|ogg|mp3)$/i));
        if(!res.ok)throw new Error(`Missing audio: ${name}`);
        const buffer=await this.ctx.decodeAudioData(await res.arrayBuffer());
        if(entry.loopStart!==undefined&&(!(entry.loopStart>=0)||!(entry.loopEnd>entry.loopStart)||entry.loopEnd>buffer.duration))throw new Error(`Invalid audio loop: ${name}`);
        this.buffers.set(`${group}/${name}`,{...entry,buffer});
      })));
      await resumed;
    })();return this.loading;
  }
  source(entry){const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=entry.buffer;gain.gain.value=entry.gain;source.connect(gain).connect(this.master);source.onended=()=>{source.disconnect();gain.disconnect();};return source;}
  cue(name){const entry=this.buffers.get(`sfx/${name}`);if(!entry||this.sfxMuted||this.ctx.state!=='running')return;this.source(entry).start();}
  sync(active,name){
    if(!this.ctx)return;
    const desired=active&&!this.musicMuted?name:null;
    if(this.musicName!==desired&&this.music){this.music.stop();this.music=null;this.musicName=null;}
    if(!active){this.ctx.suspend();return;}
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
    const entry=this.buffers.get(`music/${desired}`);
    if(desired&&!this.music&&entry){const source=this.source(entry);source.loop=entry.loop;
      if(entry.loopStart!==undefined){source.loopStart=entry.loopStart;source.loopEnd=entry.loopEnd;}
      source.start();this.music=source;this.musicName=desired;this.starts++;
    }
  }
  stop(){if(this.music){this.music.stop();this.music=null;this.musicName=null;}this.ctx?.close();}
}
