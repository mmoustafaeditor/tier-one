// Renders the EPIC Semba Studios intro soundtrack (trailer style) with Playwright's Chromium (OfflineAudioContext).
// Timed to the real-time intro animation in tier-one/index.html (#boot script, same beat times):
//   0.00-0.45 neon power-on (electric zaps + mains hum)   0.30 braam #1 (dark, low)
//   0.45-1.35 dim / tension drone + heartbeat               1.35-2.46 riser (noise sweep, Shepard glide, ratchet, reverse whoosh)
//   2.46-2.53 silent beat (hard cut)                        2.53 IMPACT (sub drop, punch, crack, braam #2, metal hit, debris)
//   2.70-3.40 neon re-ignites (zaps, shimmer, "shing")      2.80-4.80 triumphant pad + hall reverb tail
// Usage:  cd /tmp/claude-0 && NODE_PATH=$(npm root -g) node <repo>/games/tier-one/intro-sound/render.js out.wav
// Embed: python3 embed.py out.wav  (encodes MP3 192k, which every browser + the Android WebView plays, and swaps the base64
// BOOT_SND string in the #boot script of tier-one/index.html).
// (render-video-legacy.js is the older, "friendly" soundtrack that is muxed into tier-one/semba-intro.{webm,mp4}.)
const {chromium}=require('playwright');const fs=require('fs');
const OUT=process.argv[2]||'intro.wav';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();
const b64=await p.evaluate(async()=>{
 const SR=48000, LEN=4.8, ctx=new OfflineAudioContext(2,Math.ceil(SR*LEN),SR);
 let seed=17; const R=()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; }; const rnd=(a,b)=>a+R()*(b-a);
 // master: bus -> soft clip -> glue compressor -> brickwall-ish limiter
 const bus=ctx.createGain(); bus.gain.value=.8;
 const sh=ctx.createWaveShaper(); { const n=2048, c=new Float32Array(n); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=Math.tanh(x*1.6)/Math.tanh(1.6); } sh.curve=c; sh.oversample='4x'; }
 const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-14; comp.ratio.value=2; comp.attack.value=.004; comp.release.value=.3; comp.knee.value=8;
 const lim=ctx.createDynamicsCompressor(); lim.threshold.value=-4; lim.ratio.value=20; lim.attack.value=.001; lim.release.value=.12; lim.knee.value=0;
 bus.connect(sh); sh.connect(comp); comp.connect(lim); lim.connect(ctx.destination);
 // silent beat: duck the whole mix (reverb tails too) 2.46 -> 2.53
 const duck=ctx.createGain(); duck.connect(bus); duck.gain.setValueAtTime(1,0); duck.gain.setValueAtTime(1,2.455); duck.gain.linearRampToValueAtTime(.012,2.468); duck.gain.setValueAtTime(.012,2.526); duck.gain.linearRampToValueAtTime(1,2.531);
 // big hall: decorrelated stereo noise, exponential decay, darkening over time
 function hall(sec,decay){ const ir=ctx.createBuffer(2,Math.ceil(SR*sec),SR); for(let c=0;c<2;c++){ const d=ir.getChannelData(c); let lp=0; for(let i=0;i<d.length;i++){ const t=i/SR, k=Math.min(.95,.25+t*.35); lp=lp*k+(R()*2-1)*(1-k); d[i]=lp*Math.exp(-t/decay)*(i<SR*.012?i/(SR*.012):1)*2.2; } } const cv=ctx.createConvolver(); cv.buffer=ir; return cv; }
 const verb=hall(3.6,.85), vg=ctx.createGain(); vg.gain.value=.55; verb.connect(vg); vg.connect(duck);
 const nb=ctx.createBuffer(2,SR*6,SR); for(let c=0;c<2;c++){ const d=nb.getChannelData(c); for(let i=0;i<d.length;i++) d[i]=R()*2-1; }
 function out(pan,wet){ const g=ctx.createGain(); const pn=ctx.createStereoPanner(); pn.pan.value=pan||0; g.connect(pn); pn.connect(duck); if(wet){ const s=ctx.createGain(); s.gain.value=wet; pn.connect(s); s.connect(verb); } return g; }
 function env(g,pts){ g.gain.setValueAtTime(pts[0][1],pts[0][0]); for(let i=1;i<pts.length;i++){ const [t,v,lin]=pts[i]; if(lin) g.gain.linearRampToValueAtTime(v,t); else g.gain.exponentialRampToValueAtTime(Math.max(v,1e-4),t); } }
 function osc(type,f,t0,t1,dest,det){ const o=ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f,t0); if(det) o.detune.value=det; o.connect(dest); o.start(t0); o.stop(t1); return o; }
 function noise(t0,t1,dest){ const s=ctx.createBufferSource(); s.buffer=nb; s.connect(dest); s.start(t0,R()*2); s.stop(t1); return s; }
 function filt(type,f,q,dest){ const b=ctx.createBiquadFilter(); b.type=type; b.frequency.value=f; b.Q.value=q; b.connect(dest); return b; }
 function drive(k,dest){ const w=ctx.createWaveShaper(), n=1024, c=new Float32Array(n); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=Math.tanh(x*k); } w.curve=c; w.oversample='2x'; w.connect(dest); return w; }
 // braam: stacked detuned saws through an opening/closing lowpass with drive (brass-like trailer horn) + sub
 function braam(t,dur,notes,peak,open,pan){ const g=ctx.createGain(); g.connect(out(pan||0,.5)); env(g,[[t,1e-4],[t+.05,peak],[t+.35,peak*.8,1],[t+dur,1e-4]]);
   const lp=filt('lowpass',140,3.5,drive(2.4,g)); lp.frequency.setValueAtTime(140,t); lp.frequency.exponentialRampToValueAtTime(open,t+.12); lp.frequency.exponentialRampToValueAtTime(open*.28,t+dur*.8);
   notes.forEach(f=>{ [-14,-5,5,14].forEach(d=>{ const o=osc('sawtooth',f*.985,t,t+dur+.05,lp,d); o.frequency.exponentialRampToValueAtTime(f,t+.09); }); });
   const sub=ctx.createGain(); sub.connect(out(0,.1)); env(sub,[[t,1e-4],[t+.04,peak*1.3],[t+dur,1e-4]]); osc('sine',notes[0],t,t+dur+.05,sub); }
 function zap(t,pn,a){ const g=ctx.createGain(); g.connect(out(pn,.3)); env(g,[[t,1e-4],[t+.002,a],[t+.012,a*.3],[t+.018,a*.7],[t+.06,1e-4]]); noise(t,t+.07,filt('highpass',1800,.8,g));
   const g2=ctx.createGain(); g2.connect(out(pn,.3)); env(g2,[[t,1e-4],[t+.003,a*.5],[t+.08,1e-4]]); const o=osc('square',rnd(90,160),t,t+.09,filt('bandpass',900,2,g2)); o.frequency.exponentialRampToValueAtTime(40,t+.08); }
 function hum(t0,t1,pts,pan){ const g=ctx.createGain(); g.connect(out(pan||0,.3)); env(g,pts); const bp=filt('bandpass',1100,1.1,g); osc('sawtooth',120,t0,t1,bp); osc('square',240,t0,t1,bp,6); osc('sawtooth',60,t0,t1,filt('lowpass',300,.7,g)); }
 const A1=55, E2=82.41, A2=110, C3=130.81, E3=164.81, A3=220, Cs4=277.18, E4=329.63, A4=440;

 // 1) NEON POWER-ON 0.00-0.45: crackling zaps as the tube strikes, then mains hum
 [[.04,-.3,.5],[.09,.3,.35],[.13,-.1,.6],[.2,.2,.4],[.24,0,.7],[.33,-.2,.3]].forEach(([t,pn,a])=>zap(t,pn,a));
 hum(0,2.5,[[0,1e-4],[.1,.04],[.28,.07],[.5,.03],[1.4,.012,1],[2.44,.008,1],[2.46,1e-4]],.05);
 { const g=ctx.createGain(); g.connect(out(0,.3)); env(g,[[.24,1e-4],[.25,.55],[.9,1e-4]]); const o=osc('sine',80,.24,.95,g); o.frequency.exponentialRampToValueAtTime(34,.8); }
 // 2) BRAAM #1 at 0.30 (dark, A minor)
 braam(.3,1.5,[A1,E2,A2,C3],.13,1100,0);
 // 3) TENSION DRONE 0.3-2.46: sub + beating fifths, filter creeping open; two heartbeat thumps
 { const g=ctx.createGain(); g.connect(out(0,.35)); env(g,[[.3,1e-4],[.9,.035],[2.4,.1,1],[2.46,1e-4]]); const lp=filt('lowpass',260,.9,g); lp.frequency.setValueAtTime(260,.3); lp.frequency.exponentialRampToValueAtTime(900,2.45);
   osc('sawtooth',A1,.3,2.5,lp,-7); osc('sawtooth',A1,.3,2.5,lp,7); osc('sawtooth',E2,.3,2.5,lp,3); osc('sine',A1/2,.3,2.5,g); }
 [.95,1.2].forEach(t=>{ const g=ctx.createGain(); g.connect(out(0,.15)); env(g,[[t,1e-4],[t+.008,.35],[t+.35,1e-4]]); const o=osc('sine',70,t,t+.4,g); o.frequency.exponentialRampToValueAtTime(38,t+.3); });
 // 4) RISER 1.35-2.46
 { const g=ctx.createGain(); g.connect(out(0,.45)); env(g,[[1.35,1e-4],[2.3,.16],[2.455,.3],[2.462,1e-4]]); const bp=filt('bandpass',300,1.6,g); bp.frequency.setValueAtTime(300,1.35); bp.frequency.exponentialRampToValueAtTime(7000,2.455); noise(1.35,2.47,bp); }
 [55,110,220,440,880].forEach((f,i)=>{ const g=ctx.createGain(); g.connect(out(i%2?.25:-.25,.4)); const a=[.035,.05,.05,.032,.018][i]; env(g,[[1.35,1e-4],[2.44,a],[2.462,1e-4]]); const o=osc('sawtooth',f,1.35,2.47,filt('lowpass',2500,.7,g),i*3); o.frequency.exponentialRampToValueAtTime(f*2.6,2.455); });
 { let t=1.6, dt=.16; while(t<2.44){ const g=ctx.createGain(); g.connect(out(rnd(-.4,.4),.25)); const a=.08+(t-1.6)*.35; env(g,[[t,1e-4],[t+.002,a],[t+.035,1e-4]]); noise(t,t+.04,filt('bandpass',rnd(2500,4500),5,g));
   const k=ctx.createGain(); k.connect(out(0,.1)); env(k,[[t,1e-4],[t+.004,a*1.4],[t+.09,1e-4]]); const o=osc('sine',120,t,t+.1,k); o.frequency.exponentialRampToValueAtTime(45,t+.08); t+=dt; dt=Math.max(.035,dt*.82); } }
 { const g=ctx.createGain(); g.connect(out(0,.2)); env(g,[[1.9,1e-4],[2.455,.45],[2.462,1e-4]]); const lp=filt('lowpass',600,.7,g); lp.frequency.setValueAtTime(600,1.9); lp.frequency.exponentialRampToValueAtTime(9000,2.455); noise(1.9,2.47,lp); }
 // 5) IMPACT at 2.53
 const T=2.53;
 { const g=ctx.createGain(); g.connect(out(0,.08)); env(g,[[T,1e-4],[T+.004,1.1],[T+.5,.6,1],[T+1.9,1e-4]]); const o=osc('sine',72,T,T+2,g); o.frequency.exponentialRampToValueAtTime(26,T+1.5); }
 { const g=ctx.createGain(); g.connect(out(0,.2)); env(g,[[T,1e-4],[T+.002,1],[T+.18,1e-4]]); const o=osc('sine',190,T,T+.2,drive(3,g)); o.frequency.exponentialRampToValueAtTime(48,T+.09); }
 { const g=ctx.createGain(); g.connect(out(0,.5)); env(g,[[T,1e-4],[T+.002,.9],[T+.07,1e-4]]); noise(T,T+.08,filt('highpass',1500,.7,g)); }
 { const g=ctx.createGain(); g.connect(out(0,.4)); env(g,[[T,1e-4],[T+.004,.8],[T+.5,1e-4]]); const lp=filt('lowpass',2400,.7,g); lp.frequency.setValueAtTime(2400,T); lp.frequency.exponentialRampToValueAtTime(120,T+.45); noise(T,T+.55,lp); }
 braam(T,1.9,[A1,E2,A2,C3,E3],.42,2600,-.12); braam(T+.004,1.9,[A1*2,E2*2,A2*2],.14,3200,.14);
 [1,2.32,4.25,6.63,9.38,12.7].forEach((m,i)=>{ const g=ctx.createGain(); g.connect(out(i%2?.3:-.3,.6)); env(g,[[T,1e-4],[T+.003,.09/(1+i*.4)],[T+1.4-i*.12,1e-4]]); osc('sine',196*m,T,T+1.5,g); });
 { const g=ctx.createGain(); g.connect(out(0,.6)); env(g,[[T,1e-4],[T+.04,.22],[T+.6,.09,1],[4.4,1e-4]]); const bp=filt('bandpass',1500,.6,g); bp.frequency.setValueAtTime(1600,T); bp.frequency.exponentialRampToValueAtTime(380,4.3); noise(T,4.5,bp); }
 // 6) DEBRIS: stereo crackles + low rock thumps, thinning out
 for(let i=0;i<90;i++){ const t=T+.02+Math.pow(R(),1.7)*1.4; const g=ctx.createGain(); g.connect(out(rnd(-.9,.9),.35)); const a=rnd(.04,.22)*(1-(t-T)/1.7); env(g,[[t,1e-4],[t+.002,Math.max(a,.01)],[t+rnd(.02,.07),1e-4]]); noise(t,t+.09,filt('bandpass',rnd(900,5200),rnd(2,7),g)); }
 for(let i=0;i<12;i++){ const t=T+rnd(.2,1.3); const g=ctx.createGain(); g.connect(out(rnd(-.7,.7),.3)); env(g,[[t,1e-4],[t+.004,.22],[t+.2,1e-4]]); const o=osc('sine',rnd(70,140),t,t+.22,g); o.frequency.exponentialRampToValueAtTime(40,t+.18); }
 // 7) NEON RE-IGNITES 2.70-3.40
 [[2.72,.25,.35],[2.79,-.25,.45],[2.84,.1,.3],[2.93,-.1,.5],[3.02,.2,.3]].forEach(([t,pn,a])=>zap(t,pn,a));
 hum(2.7,LEN,[[2.7,1e-4],[3.05,.07],[3.6,.05],[4.6,1e-4]],-.05);
 { const g=ctx.createGain(); g.connect(out(0,.7)); env(g,[[2.75,1e-4],[3.25,.16],[3.4,1e-4]]); const bp=filt('bandpass',2400,1,g); bp.frequency.setValueAtTime(2000,2.75); bp.frequency.exponentialRampToValueAtTime(9000,3.3); noise(2.75,3.45,bp); }
 { const t=3.28; [[1,1],[2.01,.6],[2.76,.5],[5.4,.3],[8.93,.2]].forEach(([m,a],i)=>{ const g=ctx.createGain(); g.connect(out(i%2?.4:-.4,.9)); env(g,[[t,1e-4],[t+.004,.09*a],[t+1.5,1e-4]]); osc('sine',A4*2*m,t,t+1.55,g); });
   const g=ctx.createGain(); g.connect(out(0,.8)); env(g,[[t,1e-4],[t+.005,.12],[t+.5,1e-4]]); noise(t,t+.55,filt('highpass',6000,.7,g)); }
 [A4*2,E4*4,Cs4*4,A4*4].forEach((f,i)=>{ const g=ctx.createGain(); g.connect(out(i%2?.5:-.5,.9)); env(g,[[2.9,1e-4],[3.45,.022],[4.7,1e-4]]); osc('sine',f,2.9,LEN,g,i*4-6);
   const lf=ctx.createOscillator(), lg=ctx.createGain(); lf.frequency.value=6+i; lg.gain.value=.008; lf.connect(lg); lg.connect(g.gain); lf.start(2.9); lf.stop(LEN); });
 // 8) TRIUMPHANT PAD (A major resolution) swelling with the glow, into the tail
 { const g=ctx.createGain(); g.connect(out(0,.6)); env(g,[[2.8,1e-4],[3.35,.11],[3.9,.085,1],[4.75,1e-4]]); const lp=filt('lowpass',500,.6,g); lp.frequency.setValueAtTime(500,2.8); lp.frequency.exponentialRampToValueAtTime(2600,3.35); lp.frequency.exponentialRampToValueAtTime(900,4.7);
   [A2,E3,A3,Cs4,E4].forEach((f,i)=>{ osc('sawtooth',f,2.8,LEN,lp,(i%2?1:-1)*9); osc('sawtooth',f,2.8,LEN,lp,(i%2?-1:1)*4); }); }
 { const g=ctx.createGain(); g.connect(out(0,.2)); env(g,[[2.9,1e-4],[3.4,.3],[4.7,1e-4]]); osc('sine',A1,2.9,LEN,g); }

 const buf=await ctx.startRendering();
 const n=buf.length, L=buf.getChannelData(0),Rr=buf.getChannelData(1); let pk=0; for(let i=0;i<n;i++){ pk=Math.max(pk,Math.abs(L[i]),Math.abs(Rr[i])); } const norm=.93/pk;
 const fade=Math.floor(SR*.25); for(let i=0;i<fade;i++){ const k=i/fade; L[n-1-i]*=k; Rr[n-1-i]*=k; }
 const ab=new ArrayBuffer(44+n*4), v=new DataView(ab); const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
 w(0,'RIFF');v.setUint32(4,36+n*4,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,SR,true);v.setUint32(28,SR*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*4,true);
 for(let i=0;i<n;i++){ v.setInt16(44+i*4,Math.max(-1,Math.min(1,L[i]*norm))*32767,true); v.setInt16(46+i*4,Math.max(-1,Math.min(1,Rr[i]*norm))*32767,true); }
 let s='';const u=new Uint8Array(ab);for(let i=0;i<u.length;i+=8192) s+=String.fromCharCode.apply(null,u.subarray(i,i+8192)); return btoa(s); });
fs.writeFileSync(OUT,Buffer.from(b64,'base64')); await b.close(); console.log('rendered',OUT);})();
