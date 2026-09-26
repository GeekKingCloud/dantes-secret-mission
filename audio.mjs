import {relativeAssetURL} from './asset-loader.mjs';

export function bindAudioVisibility(audio,onSuspend) {
  const state={visible:!document.hidden};
  const suspend=()=>{state.visible=false;onSuspend();audio.sync(false,audio.request.name);};
  const focus=()=>{state.visible=!document.hidden;};
  const visibility=()=>document.hidden?suspend():focus();
  window.addEventListener('blur',suspend);window.addEventListener('focus',focus);
  document.addEventListener('visibilitychange',visibility);
  state.destroy=()=>{window.removeEventListener('blur',suspend);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);};
  return state;
}

export function validateAudioManifest(m) {
  if(m?.schema_version!==1||m.paths_relative_to!=='assets/audio'||!m.music||!m.sfx)throw new Error('Expected production audio manifest schema 1');
  for(const group of ['music','sfx'])for(const [id,e] of Object.entries(m[group])) {
    if(typeof e.file!=='string'||!e.file.endsWith('.wav')||!Number.isInteger(e.frames)||e.frames<=0||e.sample_rate!==44100||e.channels!==2||e.pcm_bits!==16)throw new Error(`Invalid PCM metadata: ${group}/${id}`);
    if(group==='music'&&(typeof e.loop!=='boolean'||e.loop&&(!(e.loop_start_frame>=0)||!(e.loop_end_frame_exclusive>e.loop_start_frame)||e.loop_end_frame_exclusive>e.frames)))throw new Error(`Invalid loop markers: ${id}`);
  }
  for(const key of ['suggested_music_gain','suggested_sfx_gain'])if(!(m.runtime?.[key]>=0&&m.runtime[key]<=1))throw new Error(`Invalid mix gain: ${key}`);
  return m;
}

export class AudioEngine {
  constructor(){
    this.ctx=null;this.buffers=new Map();this.loads=new Map();this.voices=new Set();
    this.music=null;this.musicName=null;this.musicMuted=false;this.sfxMuted=false;
    this.loading=null;this.starts=0;this.request={active:false,name:null};this.epoch=0;
    this.token=0;this.victory=false;this.error=null;this.closed=false;
  }
  async start(url='assets/audio/manifest.json') {
    if(this.closed)throw new Error('Audio engine is closed');
    if(!this.ctx){
      this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=.68;
      this.musicBus=this.ctx.createGain();this.sfxBus=this.ctx.createGain();
      this.musicBus.connect(this.master);this.sfxBus.connect(this.master);
      this.limiter=this.ctx.createDynamicsCompressor();this.limiter.threshold.value=-12;this.limiter.ratio.value=8;
      this.master.connect(this.limiter).connect(this.ctx.destination);
      this.manifestURL=new URL(url,location.href).href;
      this.loading=(async()=>{
        const response=await fetch(this.manifestURL);if(!response.ok)throw new Error(`Missing audio manifest (${response.status})`);
        this.manifest=validateAudioManifest(await response.json());
        // Short cues are ready before the intro. Long music decodes on demand.
        await Promise.all([...Object.keys(this.manifest.sfx).map(id=>`sfx/${id}`),'music/help','music/jetpack'].map(key=>this.load(key)));
      })();
    }
    // Called directly inside the gesture; never defer unlock until after fetch.
    await this.ctx.resume();await this.loading;
    this.sync(this.request.active,this.request.name);
  }
  async load(key) {
    if(this.loads.has(key))return this.loads.get(key);
    const [group,id]=key.split('/'),entry=this.manifest[group]?.[id];
    if(!entry)throw new Error(`Missing audio cue ${key}`);
    const pending=(async()=>{
      const response=await fetch(relativeAssetURL(entry.file,this.manifestURL,/\.wav$/i));
      if(!response.ok)throw new Error(`Missing PCM: ${key}`);
      const buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());
      if(buffer.numberOfChannels!==entry.channels||Math.abs(buffer.duration-entry.frames/entry.sample_rate)>1/buffer.sampleRate)throw new Error(`Decoded PCM disagrees with manifest: ${key}`);
      const result={...entry,buffer};this.buffers.set(key,result);return result;
    })();this.loads.set(key,pending);return pending;
  }
  source(entry,bus) {
    const source=this.ctx.createBufferSource();source.buffer=entry.buffer;source.connect(bus);return source;
  }
  async cue(event) {
    if(event==='victory'){this.victory=true;return;}
    if(['retry','boss-start'].includes(event))return;
    const key=event==='help'||event==='jetpack'?`music/${event}`:event==='checkpoint'?'sfx/victory':`sfx/${event}`;
    if(!this.ctx||!this.loading||this.sfxMuted||!this.request.active)return;
    const epoch=this.epoch;await this.loading;const entry=await this.load(key);
    if(this.closed||epoch!==this.epoch||this.sfxMuted||!this.request.active)return;
    if(this.voices.size>=8){const oldest=this.voices.values().next().value;oldest.stop();this.voices.delete(oldest);}
    const source=this.source(entry,this.sfxBus);this.voices.add(source);
    source.onended=()=>{this.voices.delete(source);source.disconnect();};source.start();
  }
  sync(active,name) {
    if(this.request.active!==active)this.epoch++;
    this.request={active,name};if(!this.ctx||!this.manifest||this.closed)return;
    this.musicBus.gain.value=this.musicMuted?0:this.manifest.runtime.suggested_music_gain;
    this.sfxBus.gain.value=this.sfxMuted?0:this.manifest.runtime.suggested_sfx_gain;
    if(!active||this.musicMuted&&this.sfxMuted){if(this.ctx.state==='running')this.ctx.suspend().catch(e=>this.error=e);return;}
    if(this.ctx.state==='suspended')this.ctx.resume().catch(e=>this.error=e);
    if(name!=='overworld')this.victory=false;
    const desired=this.victory?'victory':name;
    if(this.musicName===desired)return;
    const token=++this.token;this.music?.stop();this.music?.disconnect();this.music=null;this.musicName=desired;
    if(!desired)return;
    this.load(`music/${desired}`).then(entry=>{
      if(this.closed||token!==this.token)return;
      const source=this.source(entry,this.musicBus);source.loop=entry.loop;
      if(entry.loop){source.loopStart=entry.loop_start_frame/entry.sample_rate;source.loopEnd=entry.loop_end_frame_exclusive/entry.sample_rate;}
      this.music=source;this.starts++;
      source.onended=()=>{
        source.disconnect();if(this.music!==source)return;this.music=null;
        // One-shots remain completed until the scene changes; never restart each RAF.
        if(desired==='victory'){this.victory=false;this.sync(this.request.active,this.request.name);}
      };source.start();
    }).catch(error=>{this.error=error;});
  }
  async stop(){
    this.closed=true;this.token++;this.epoch++;
    this.music?.stop();this.music=null;for(const source of this.voices)source.stop();this.voices.clear();
    if(this.ctx&&this.ctx.state!=='closed')await this.ctx.close();
  }
}