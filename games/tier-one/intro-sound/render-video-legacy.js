// Renders the Semba intro soundtrack (4.13s, timed to semba-intro video events) to intro.wav with Playwright's Chromium.
// Mux: ffmpeg -i semba-intro.webm -i intro.wav -map 0:v -map 1:a -c:v copy -c:a libopus -b:a 96k -shortest out.webm (AAC for the .mp4).
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();
const b64=await p.evaluate(async()=>{
 const SR=48000, LEN=4.13, ctx=new OfflineAudioContext(2,Math.ceil(SR*LEN),SR);
 const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-14; comp.ratio.value=3.5; comp.attack.value=.003; comp.release.value=.25;
 const master=ctx.createGain(); master.gain.value=.9; master.connect(comp); comp.connect(ctx.destination);
 // simple reverb from decaying noise impulse
 const ir=ctx.createBuffer(2,SR*2.2,SR); for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3.2); }
 const verb=ctx.createConvolver(); verb.buffer=ir; const vg=ctx.createGain(); vg.gain.value=.22; verb.connect(vg); vg.connect(master);
 const nb=ctx.createBuffer(1,SR*5,SR); { const d=nb.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
 const rnd=(a,b)=>a+Math.random()*(b-a);
 function out(pan,wet){ const g=ctx.createGain(); const pn=ctx.createStereoPanner(); pn.pan.value=pan||0; g.connect(pn); pn.connect(master); if(wet){ const s=ctx.createGain(); s.gain.value=wet; pn.connect(s); s.connect(verb); } return g; }
 function envp(g,pts){ g.gain.setValueAtTime(pts[0][1],pts[0][0]); for(let i=1;i<pts.length;i++){ const [t,v,lin]=pts[i]; if(lin) g.gain.linearRampToValueAtTime(v,t); else g.gain.exponentialRampToValueAtTime(Math.max(v,1e-4),t); } }
 function osc(type,f,t0,t1,dest){ const o=ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f,t0); o.connect(dest); o.start(t0); o.stop(t1); return o; }
 function noise(t0,t1,dest){ const s=ctx.createBufferSource(); s.buffer=nb; s.connect(dest); s.start(t0,Math.random()); s.stop(t1); return s; }
 function filt(type,f,q,dest){ const b=ctx.createBiquadFilter(); b.type=type; b.frequency.value=f; b.Q.value=q; b.connect(dest); return b; }

 // 1) low drone the whole way (A1 + E2), dips before impact, swells after
 { const g=ctx.createGain(); g.connect(out(0,.3)); envp(g,[[0,1e-4],[0.25,.09],[2.3,.13,1],[2.46,.02],[2.53,.3],[3.4,.3,1],[4.13,1e-4]]);
   const lp=filt('lowpass',420,.8,g); osc('sawtooth',55,0,LEN,lp); osc('sawtooth',82.4,0,LEN,lp).detune.value=4; osc('sine',41.2,0,LEN,g); }
 // 2) low wind bed
 { const g=ctx.createGain(); g.connect(out(0,.2)); envp(g,[[0,1e-4],[.4,.022],[2.3,.03,1],[2.46,.005],[2.6,.08],[4.1,1e-4]]); const b=filt('bandpass',350,.7,g); b.frequency.setValueAtTime(300,0); b.frequency.linearRampToValueAtTime(520,2.4); noise(0,LEN,b); }
 // 3) neon power-on: crackle zaps + mains hum, fading as the glow dims (0 -> 1.4s)
 [[.03,-.2],[.09,.25],[.16,-.1],[.24,.15]].forEach(([t,pn])=>{ const g=ctx.createGain(); g.connect(out(pn,.25)); envp(g,[[t,1e-4],[t+.003,.35],[t+.05,1e-4]]); noise(t,t+.06,filt('highpass',2500,.7,g)); });
 { const g=ctx.createGain(); g.connect(out(0,.35)); envp(g,[[0,1e-4],[.06,.07],[.35,.05],[1.45,.003],[2.46,1e-4]]); const b=filt('bandpass',1200,1.2,g); osc('sawtooth',120,0,2.5,b); osc('square',240,0,2.5,b).detune.value=7;
   const fl=ctx.createOscillator(), fg=ctx.createGain(); fl.frequency.value=13; fg.gain.value=.03; fl.connect(fg); fg.connect(g.gain); fl.start(0); fl.stop(1.5); }
 // 4) tension riser 1.35 -> 2.46 then a hard cut (suck-in)
 { const g=ctx.createGain(); g.connect(out(0,.4)); envp(g,[[1.35,1e-4],[2.44,.16],[2.47,1e-4]]); const b=filt('bandpass',400,2.5,g); b.frequency.setValueAtTime(400,1.35); b.frequency.exponentialRampToValueAtTime(4200,2.46); noise(1.35,2.5,b); }
 { const g=ctx.createGain(); g.connect(out(0,.3)); envp(g,[[1.5,1e-4],[2.44,.06],[2.47,1e-4]]); const o=osc('sine',180,1.5,2.5,g); o.frequency.exponentialRampToValueAtTime(760,2.46); }
 // 5) IMPACT at 2.53: sub boom, body thump, dust blast
 const T=2.53;
 { const g=ctx.createGain(); g.connect(out(0,.15)); envp(g,[[T,1e-4],[T+.006,1],[T+1.4,1e-4]]); const o=osc('sine',95,T,T+1.5,g); o.frequency.exponentialRampToValueAtTime(30,T+.9); }
 { const g=ctx.createGain(); g.connect(out(0,.3)); envp(g,[[T,1e-4],[T+.004,.7],[T+.35,1e-4]]); const b=filt('lowpass',1800,.7,g); b.frequency.setValueAtTime(1800,T); b.frequency.exponentialRampToValueAtTime(140,T+.3); noise(T,T+.4,b); }
 { const g=ctx.createGain(); g.connect(out(0,.5)); envp(g,[[T,1e-4],[T+.03,.32],[T+.5,.14,1],[4.05,1e-4]]); const b=filt('bandpass',900,.6,g); b.frequency.setValueAtTime(1400,T); b.frequency.exponentialRampToValueAtTime(420,4.0); noise(T,LEN,b); }
 // 6) rock debris: clicky crackles scattered in stereo, thinning out
 for(let i=0;i<70;i++){ const t=T+.02+Math.pow(Math.random(),1.8)*1.25; const g=ctx.createGain(); g.connect(out(rnd(-.8,.8),.3)); const a=rnd(.05,.28)*(1-(t-T)/1.6); envp(g,[[t,1e-4],[t+.002,Math.max(a,.01)],[t+rnd(.02,.07),1e-4]]); noise(t,t+.09,filt('bandpass',rnd(900,4200),rnd(2,6),g)); }
 for(let i=0;i<10;i++){ const t=T+rnd(.25,1.2); const g=ctx.createGain(); g.connect(out(rnd(-.6,.6),.25)); envp(g,[[t,1e-4],[t+.004,.25],[t+.18,1e-4]]); const o=osc('sine',rnd(70,130),t,t+.2,g); o.frequency.exponentialRampToValueAtTime(40,t+.16); }
 // 7) neon re-ignites 2.7 -> 3.4: hum swell + bright metallic shing at peak glow
 { const g=ctx.createGain(); g.connect(out(0,.35)); envp(g,[[2.62,1e-4],[3.35,.07],[4.1,1e-4]]); const b=filt('bandpass',1300,1.4,g); osc('sawtooth',120,2.6,LEN,b); osc('square',240,2.6,LEN,b).detune.value=-6; }
 { const t=3.28; [[1,1],[2.76,.55],[5.4,.3],[8.93,.18]].forEach(([m,a],i)=>{ const g=ctx.createGain(); g.connect(out(i%2?.35:-.35,.7)); envp(g,[[t,1e-4],[t+.006,.09*a],[t+1.0,1e-4]]); osc('sine',880*m,t,t+1.05,g); }); }
 { const g=ctx.createGain(); g.connect(out(0,.6)); envp(g,[[2.75,1e-4],[3.25,.1],[3.45,1e-4]]); const b=filt('bandpass',3000,1,g); b.frequency.setValueAtTime(2200,2.75); b.frequency.exponentialRampToValueAtTime(7000,3.3); noise(2.75,3.5,b); }
 // 8) triumphant A-major chord swelling with the glow, fading at the end
 { const g=ctx.createGain(); g.connect(out(0,.55)); envp(g,[[2.6,1e-4],[3.35,.075],[3.8,.06,1],[4.12,1e-4]]); const lp=filt('lowpass',1600,.6,g); lp.frequency.setValueAtTime(500,2.6); lp.frequency.exponentialRampToValueAtTime(2400,3.35);
   [110,164.8,220,277.2,329.6].forEach((f,i)=>{ osc('sawtooth',f,2.6,LEN,lp).detune.value=(i%2?1:-1)*8; }); }
 const buf=await ctx.startRendering();
 const n=buf.length, ab=new ArrayBuffer(44+n*4), v=new DataView(ab); const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
 w(0,'RIFF');v.setUint32(4,36+n*4,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,SR,true);v.setUint32(28,SR*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*4,true);
 const L=buf.getChannelData(0),R=buf.getChannelData(1); let pk=0; for(let i=0;i<n;i++){ pk=Math.max(pk,Math.abs(L[i]),Math.abs(R[i])); } const norm=.89/pk;
 for(let i=0;i<n;i++){ v.setInt16(44+i*4,L[i]*norm*32767,true); v.setInt16(46+i*4,R[i]*norm*32767,true); }
 let s='';const u=new Uint8Array(ab);for(let i=0;i<u.length;i+=8192) s+=String.fromCharCode.apply(null,u.subarray(i,i+8192)); return btoa(s); });
fs.writeFileSync('/tmp/claude-0/intro2/intro.wav',Buffer.from(b64,'base64')); await b.close(); console.log('rendered');})();
