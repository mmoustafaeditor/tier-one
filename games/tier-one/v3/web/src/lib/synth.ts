// @ts-nocheck
// The classic game's synth engine (Tier One 2.x), ported unchanged: every cue is synthesised with WebAudio, no files.
// Scenes (agentcall, salon, airport, monitor, kitman, fax) and voice babble come back from the old build.
const SYN=(()=>{
 let ctx=null, master=null, noiseBuf=null;
 function init(){
  if(ctx) return ctx; const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null;
  ctx=new AC(); const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-16; comp.knee.value=12; comp.ratio.value=4; comp.attack.value=.004; comp.release.value=.2;
  master=ctx.createGain(); master.gain.value=.85; master.connect(comp); comp.connect(ctx.destination);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  return ctx;
 }
 const rnd=(a,b)=>a+Math.random()*(b-a);
 function env(g,t,a,peak,dur,rel){ const e=.0001; g.gain.setValueAtTime(e,t); g.gain.exponentialRampToValueAtTime(Math.max(peak,e*2),t+a); g.gain.setValueAtTime(Math.max(peak,e*2),t+Math.max(a,dur-rel)); g.gain.exponentialRampToValueAtTime(e,t+dur); }
 function filt(type,f,q){ const b=ctx.createBiquadFilter(); b.type=type; b.frequency.value=f; if(q!=null) b.Q.value=q; return b; }
 function tone(f,t,dur,o={}){ const osc=ctx.createOscillator(); osc.type=o.type||'sine'; osc.frequency.setValueAtTime(f,t); if(o.to) osc.frequency.exponentialRampToValueAtTime(o.to,t+(o.slide||dur)); if(o.detune) osc.detune.value=o.detune;
  const g=ctx.createGain(); env(g,t,o.a||.005,o.g||.2,dur,o.r!=null?o.r:dur*.7); let n=osc; if(o.lp){ const b=filt('lowpass',o.lp,o.q||.7); osc.connect(b); n=b; } n.connect(g); g.connect(o.dest||master); osc.start(t); osc.stop(t+dur+.05); return {osc,g}; }
 function noise(t,dur,o={}){ const src=ctx.createBufferSource(); src.buffer=noiseBuf; src.loop=true; const b=filt(o.type||'bandpass',o.f||1000,o.q!=null?o.q:1); if(o.fto) b.frequency.exponentialRampToValueAtTime(o.fto,t+(o.fslide||dur));
  const g=ctx.createGain(); env(g,t,o.a||.005,o.g||.2,dur,o.r!=null?o.r:dur*.7); src.connect(b); b.connect(g); g.connect(o.dest||master); src.start(t,Math.random()*1.5); src.stop(t+dur+.05); return {src,b,g}; }
 function bell(f,t,dur,g){ [[1,1],[2.01,.5],[3.02,.25],[4.23,.12]].forEach(([m,a])=>tone(f*m,t,dur*(1.1-m*.12),{g:g*a,a:.002,r:dur*.95})); }
 function curve(k){ const n=256, c=new Float32Array(n); for(let i=0;i<n;i++){ const x=i*2/n-1; c[i]=(1+k)*x/(1+k*Math.abs(x)); } return c; }
 // gibberish "phone voice": formant-filtered sawtooth syllables through a telephone band + a little grit
 function babble(t0,dur,base){ const out=ctx.createGain(); out.gain.value=.32; const sh=ctx.createWaveShaper(); sh.curve=curve(6); const hp=filt('highpass',380,.7), lp=filt('lowpass',3200,.7);
  out.connect(sh); sh.connect(hp); hp.connect(lp); lp.connect(master); noise(t0,dur,{type:'bandpass',f:2400,q:.6,g:.005,a:.05,r:.1});
  let t=t0; while(t<t0+dur-.08){ const syl=rnd(.07,.16), f0=base*rnd(.85,1.35); const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(f0,t); o.frequency.linearRampToValueAtTime(f0*rnd(.75,1.3),t+syl);
   const f1=filt('bandpass',rnd(320,850),6), f2=filt('bandpass',rnd(900,2300),9); f1.frequency.linearRampToValueAtTime(rnd(320,850),t+syl); f2.frequency.linearRampToValueAtTime(rnd(900,2300),t+syl);
   const g=ctx.createGain(); env(g,t,.018,.9,syl,syl*.55); o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(out); o.start(t); o.stop(t+syl+.03);
   t+=syl+(Math.random()<.22?rnd(.08,.18):.012); } }
 function ring(t){ [0,.52].forEach(dt=>{ const st=t+dt, dur=.38; const g=ctx.createGain(); env(g,st,.01,.2,dur,.05); const lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.frequency.value=24; lg.gain.value=.11; lfo.connect(lg); lg.connect(g.gain);
   [400,450].forEach(f=>{ const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=f; o.connect(g); o.start(st); o.stop(st+dur+.03); }); lfo.start(st); lfo.stop(st+dur+.03); const lp=filt('lowpass',2600); g.connect(lp); lp.connect(master); }); }
 function click(t,g){ noise(t,.03,{type:'highpass',f:1800,g:g||.25,a:.001,r:.025}); tone(1600,t,.02,{type:'square',g:(g||.25)*.25,a:.001}); }
 function clippers(t,dur){ const g=ctx.createGain(); env(g,t,.06,.16,dur,.12); const lp=filt('lowpass',2800,1.2); g.connect(lp); lp.connect(master);
  const am=ctx.createOscillator(), amg=ctx.createGain(); am.frequency.value=120; amg.gain.value=.06; am.connect(amg); amg.connect(g.gain); am.start(t); am.stop(t+dur+.05);
  [[118,'sawtooth',1],[236,'square',.35],[59,'triangle',.6]].forEach(([f,ty,a])=>{ const o=ctx.createOscillator(); o.type=ty; o.frequency.setValueAtTime(f,t); [.3,.62,.95].forEach(c=>{ if(c<dur-.1){ o.frequency.setValueAtTime(f,t+c); o.frequency.linearRampToValueAtTime(f*.9,t+c+.06); o.frequency.linearRampToValueAtTime(f,t+c+.2); } }); const og=ctx.createGain(); og.gain.value=a; o.connect(og); og.connect(g); o.start(t); o.stop(t+dur+.05); });
  noise(t,dur,{type:'bandpass',f:3200,q:1.5,g:.05,a:.05,r:.1}); [.3,.62,.95].forEach(c=>{ if(c<dur-.1) noise(t+c,.18,{type:'bandpass',f:5200,q:1,g:.09,a:.01,r:.12}); }); }
 function snip(t){ noise(t,.045,{type:'highpass',f:4200,g:.3,a:.001,r:.04}); tone(3800,t,.03,{type:'triangle',g:.08,a:.001}); noise(t+.05,.03,{type:'highpass',f:5200,g:.18,a:.001,r:.025}); }
 function jet(t,dur){ noise(t,dur,{type:'lowpass',f:260,fto:3600,fslide:dur*.55,q:.9,g:.32,a:dur*.45,r:dur*.5}); const w=tone(2600,t+dur*.15,dur*.8,{to:1300,slide:dur*.8,g:.03,a:dur*.3,r:dur*.4}); noise(t,dur,{type:'lowpass',f:110,q:.5,g:.25,a:dur*.4,r:dur*.5}); }
 function boom(t,g){ tone(140,t,.7,{to:38,slide:.5,g:g||.55,a:.004,r:.6}); noise(t,.25,{type:'lowpass',f:900,fto:120,g:(g||.55)*.5,a:.002,r:.22}); }
 function stab(t,notes,ty,g,dur){ notes.forEach((f,i)=>tone(f,t,dur||.35,{type:ty||'sawtooth',g:(g||.08),a:.01,lp:2400,detune:i%2?6:-6})); }
 const N={C4:261.6,D4:293.7,E4:329.6,F4:349.2,G4:392,A4:440,Bb4:466.2,B4:493.9,C5:523.3,E5:659.3,G5:784,C6:1046.5};
 const P={
  pop:t=>{ tone(520,t,.09,{to:880,slide:.06,g:.16,a:.003}); click(t,.06); },
  tap:t=>click(t,.12),
  tick:t=>tone(1300,t,.035,{type:'square',g:.05,a:.001,lp:5000}),
  key:t=>{ noise(t,.028,{type:'bandpass',f:rnd(2500,4200),q:2,g:.14,a:.001,r:.024}); tone(rnd(160,240),t,.03,{type:'triangle',g:.05,a:.001}); },
  clock:(()=>{ let alt=false; return t=>{ alt=!alt; noise(t,.03,{type:'bandpass',f:alt?3200:2200,q:6,g:.35,a:.001,r:.028}); tone(alt?1900:1400,t,.04,{g:.07,a:.001}); }; })(),
  ding:t=>bell(1318.5,t,.9,.12),
  whoosh:t=>noise(t,.42,{type:'bandpass',f:380,fto:3200,fslide:.34,q:1.3,g:.28,a:.12,r:.25}),
  buzz:t=>{ tone(112,t,.34,{type:'square',g:.12,lp:900,detune:-8}); tone(115,t,.34,{type:'square',g:.1,lp:900,detune:8}); noise(t,.12,{type:'lowpass',f:300,g:.2}); },
  send:t=>{ noise(t,.3,{type:'bandpass',f:600,fto:4200,fslide:.26,q:1.4,g:.25,a:.06,r:.2}); bell(1568,t+.22,.6,.09); },
  good:(t,k)=>{ const m=Math.pow(2,Math.min(12,Math.max(0,k|0))/12); tone(N.E5*m,t,.16,{type:'triangle',g:.13}); tone(N.G5*m,t+.09,.28,{type:'triangle',g:.13}); }, /* k = streak step: +1 semitone each */
  star:t=>{ [N.C5,N.E5,N.G5,N.C6].forEach((f,i)=>tone(f,t+i*.06,.35,{type:'triangle',g:.1})); bell(2093,t+.26,.8,.06); },
  bad:t=>{ tone(196,t,.4,{type:'sawtooth',to:120,slide:.38,g:.15,lp:1100}); noise(t,.08,{type:'lowpass',f:400,g:.15}); },
  stamp:t=>{ boom(t,.25); noise(t,.06,{type:'bandpass',f:1600,q:.8,g:.2,a:.001}); },
  open:t=>{ noise(t,.5,{type:'bandpass',f:300,fto:2800,fslide:.4,q:1,g:.22,a:.25,r:.2}); boom(t+.42,.45); stab(t+.42,[N.C4,N.E4,N.G4,N.C5],'sawtooth',.06,.55); },
  dayhit:t=>{ noise(t,.3,{type:'bandpass',f:400,fto:2600,fslide:.28,q:1.2,g:.2,a:.2,r:.1}); boom(t+.26,.5); tone(N.C5,t+.3,.5,{type:'triangle',g:.08}); tone(N.G5,t+.3,.5,{type:'triangle',g:.05}); },
  siren:t=>{ boom(t,.55); for(let i=0;i<4;i++){ const st=t+.05+i*.28; tone(i%2?720:960,st,.26,{type:'sawtooth',g:.07,lp:1800,a:.02,r:.05}); } },
  reveal:t=>{ boom(t,.35); noise(t,.5,{type:'highpass',f:6000,g:.06,a:.002,r:.45}); },
  fanfare:t=>{ boom(t,.4); [[N.C4,0],[N.E4,.12],[N.G4,.24]].forEach(([f,d])=>stab(t+d,[f,f*2],'sawtooth',.07,.16)); stab(t+.38,[N.C4,N.E4,N.G4,N.C5],'sawtooth',.07,.9); noise(t+.38,1.1,{type:'highpass',f:7000,g:.07,a:.005,r:1}); },
  sad:t=>{ [[N.G4,0],[N.F4*1.0,.34],[N.E4,.68],[N.D4*.97,1.02]].forEach(([f,d],i)=>{ const x=tone(f,t+d,i===3?.9:.32,{type:'sawtooth',g:.15,lp:1300,a:.03}); if(i===3){ const l=ctx.createOscillator(), lg=ctx.createGain(); l.frequency.value=6; lg.gain.value=9; l.connect(lg); lg.connect(x.osc.frequency); l.start(t+d); l.stop(t+d+.95); } }); },
  agentcall:t=>{ ring(t); ring(t+1.1); click(t+2.08,.3); babble(t+2.18,1.35,rnd(130,170)); click(t+3.6,.22); },
  clippers:t=>{ click(t,.2); clippers(t+.05,1.25); snip(t+1.38); snip(t+1.55); },
  airport:t=>{ bell(N.G5,t,.7,.09); bell(N.E5,t+.28,.7,.09); bell(N.C5,t+.56,.9,.09); jet(t+.7,1.6); },
  monitor:t=>{ [0,.62,1.24].forEach(d=>{ tone(1000,t+d,.1,{g:.12,a:.003,r:.03}); tone(62,t+d+.02,.12,{g:.35,a:.004}); tone(55,t+d+.2,.1,{g:.25,a:.004}); }); },
  kitman:t=>{ noise(t,1.3,{type:'lowpass',f:180,q:.6,g:.22,a:.2,r:.4}); [[523,1],[1307,.6],[2210,.4],[3140,.25]].forEach(([f,a])=>tone(f,t+.45,.9,{g:.07*a,a:.001,r:.85})); boom(t+.45,.2); [0,1,2,3,4].forEach(i=>tone(rnd(4200,6200),t+.95+i*.05,.06,{g:.03,a:.001})); },
  typewriter:t=>{ for(let i=0;i<9;i++){ const st=t+i*rnd(.07,.12); noise(st,.03,{type:'bandpass',f:rnd(1800,3200),q:3,g:.3,a:.001,r:.025}); tone(rnd(140,200),st,.03,{type:'square',g:.04,a:.001,lp:800}); } noise(t+1.0,.18,{type:'bandpass',f:900,fto:2200,q:1,g:.12}); bell(2637,t+1.12,.6,.08); },
  register:t=>{ noise(t,.35,{type:'bandpass',f:1400,q:1.2,g:.2,a:.01,r:.2}); click(t+.3,.3); bell(2093,t+.36,.9,.12); bell(2637,t+.42,.9,.1); },
  // barber: busy salon chair. Scissors snipping in rhythm, a spray-bottle mist, a comb flick, and a short trimmer pass
  salon:t=>{ const snipAt=[0,.16,.32,.62,.78,1.18,1.34]; snipAt.forEach(d=>{ const st=t+d; noise(st,.035,{type:'bandpass',f:7200,q:4,g:.32,a:.001,r:.03}); tone(5400,st+.004,.09,{type:'sine',g:.035,a:.001,r:.085}); noise(st+.045,.02,{type:'highpass',f:6000,g:.14,a:.001,r:.018}); });
   [.46,.52].forEach(d=>noise(t+d,.1,{type:'highpass',f:3500,g:.2,a:.004,r:.07}));
   for(let i=0;i<6;i++) tone(rnd(2600,3400),t+.95+i*.018,.03,{type:'triangle',g:.03,a:.001});
   const tr=t+1.45, g=ctx.createGain(); env(g,tr,.03,.07,.42,.1); const hp=filt('bandpass',1800,.9); g.connect(hp); hp.connect(master); [[240,'square',1],[480,'sawtooth',.4]].forEach(([f,ty,a])=>{ const o=ctx.createOscillator(); o.type=ty; o.frequency.value=f; const og=ctx.createGain(); og.gain.value=a; o.connect(og); og.connect(g); o.start(tr); o.stop(tr+.45); }); noise(tr,.42,{type:'bandpass',f:6500,q:1,g:.05,a:.03,r:.1}); },
  // leak: an old newsroom fax spitting out the leaked document. Dial, handshake squeal, data warble, paper feeding out
  fax:t=>{ [[697,1209],[770,1336],[852,1477],[941,1336]].forEach(([a,b],i)=>{ const st=t+i*.09; tone(a,st,.07,{g:.05,a:.003,r:.01}); tone(b,st,.07,{g:.05,a:.003,r:.01}); });
   tone(2100,t+.42,.32,{g:.06,a:.01,r:.03});
   const w=ctx.createOscillator(), wg=ctx.createGain(); w.type='sine'; for(let i=0;i<14;i++) w.frequency.setValueAtTime(i%2?1650:1850,t+.78+i*.028); env(wg,t+.78,.01,.06,.4,.03); w.connect(wg); wg.connect(master); w.start(t+.78); w.stop(t+1.2);
   const dn=noise(t+1.18,.28,{type:'bandpass',f:1800,q:.8,g:.1,a:.01,r:.04}); const am=ctx.createOscillator(), ag=ctx.createGain(); am.frequency.value=38; ag.gain.value=.05; am.connect(ag); ag.connect(dn.g.gain); am.start(t+1.18); am.stop(t+1.48);
   const feed=t+1.5, fg=ctx.createGain(); env(fg,feed,.02,.06,.5,.08); const fm=ctx.createOscillator(); fm.type='sawtooth'; fm.frequency.value=92; const fl=filt('lowpass',700); fm.connect(fl); fl.connect(fg); fg.connect(master); fm.start(feed); fm.stop(feed+.52);
   for(let i=0;i<5;i++) noise(feed+.05+i*.09,.05,{type:'highpass',f:2800,g:.08,a:.004,r:.04}); noise(feed+.5,.12,{type:'bandpass',f:2400,q:.7,g:.16,a:.005,r:.1}); },
  sparkle:t=>{ [N.C5,N.E5,N.G5,N.C6,N.E5*2].forEach((f,i)=>tone(f,t+i*.05,.3,{type:'sine',g:.09,a:.004})); },
  /* ---- v2 cues (ds lane): short, synthesized, no files ---- */
  select:t=>{ noise(t,.008,{type:'highpass',f:3200,g:.07,a:.0008,r:.007}); tone(2300,t,.012,{g:.025,a:.001}); },
  thock:(t,o)=>{ const f={DONE:N.C5,HIJACK:N.E5,OFF:N.A4,FAKE:N.G4}[String(o||'').toUpperCase()]||N.C5; tone(f,t,.16,{type:'triangle',g:.16,a:.002,r:.14}); tone(f/2,t,.08,{g:.12,a:.002}); noise(t,.02,{type:'lowpass',f:900,g:.08,a:.001,r:.018}); },
  shred:t=>{ for(let i=0;i<8;i++){ const st=t+i*.065; noise(st,.055,{type:'bandpass',f:rnd(1600,3400),q:1.3,g:.15,a:.003,r:.045}); } noise(t,.6,{type:'lowpass',f:520,fto:160,fslide:.55,g:.12,a:.02,r:.3}); tone(72,t,.55,{type:'sawtooth',g:.035,lp:320}); },
  twist:t=>{ noise(t,.42,{type:'bandpass',f:3400,fto:260,fslide:.4,q:1.2,g:.22,a:.34,r:.06}); [N.E5,N.E5*Math.pow(2,1/12)].forEach(f=>tone(f,t+.4,.5,{type:'sawtooth',g:.05,lp:2600,a:.004,r:.4})); boom(t+.4,.22); },
  heartbeat:t=>{ tone(64,t,.12,{g:.42,a:.004,r:.1}); noise(t,.05,{type:'lowpass',f:170,g:.18,a:.002}); tone(56,t+.17,.14,{g:.3,a:.004,r:.12}); },
  whistle:t=>{ [[0,.2,2750],[.28,.6,2380]].forEach(([d,dur,f])=>{ const st=t+d, o=ctx.createOscillator(), lfo=ctx.createOscillator(), lg=ctx.createGain(), g=ctx.createGain(); o.type='sine'; o.frequency.value=f; lfo.frequency.value=34; lg.gain.value=f*.03; lfo.connect(lg); lg.connect(o.frequency); env(g,st,.012,.15,dur,.04); o.connect(g); g.connect(master); o.start(st); o.stop(st+dur+.05); lfo.start(st); lfo.stop(st+dur+.05); noise(st,dur,{type:'bandpass',f,q:5,g:.04,a:.01,r:.04}); }); },
  flip:t=>{ noise(t,.09,{type:'bandpass',f:800,fto:3600,fslide:.08,q:1,g:.17,a:.02,r:.05}); click(t+.085,.07); },
  count:(()=>{ let last=-1; return t=>{ if(t-last<.05) return; last=t; tone(1900,t,.02,{type:'square',g:.028,a:.001,lp:4200}); }; })(), /* ≤20 ticks/s */
  unlock:(t,r)=>{ r=String(r||'common').toLowerCase(); if(r==='legendary') r='legend';
   if(r==='shame'){ [[N.G4,0,.32],[N.G4*Math.pow(2,-3/12),.34,.6]].forEach(([f,d,dur])=>{ const st=t+d, o=ctx.createOscillator(), b=filt('lowpass',420,7), g=ctx.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(f,st); o.frequency.linearRampToValueAtTime(f*.97,st+dur); b.frequency.setValueAtTime(420,st); b.frequency.linearRampToValueAtTime(1900,st+dur*.35); b.frequency.linearRampToValueAtTime(360,st+dur); env(g,st,.02,.14,dur,dur*.4); o.connect(b); b.connect(g); g.connect(master); o.start(st); o.stop(st+dur+.05); }); return; }
   const n={common:2,rare:3,epic:4,legend:5}[r]||2; [N.C5,N.E5,N.G5,N.C6,N.E5*2].forEach((f,i)=>tone(f,t+i*.04,.22,{g:.06,a:.004}));
   [N.C5,N.E5,N.G5,N.C6,N.E5*2].slice(0,n).forEach((f,i)=>bell(f,t+.18+i*.05,.62,.07)); if(r==='legend'||r==='epic') noise(t+.2,r==='legend'?.66:.48,{type:'highpass',f:7500,g:.06,a:.01,r:.45}); },
  levelup:t=>{ [N.C5,N.E5,N.G5,N.C6].forEach((f,i)=>tone(f,t+i*.07,.26,{type:'triangle',g:.1,a:.004})); bell(N.G5*2,t+.3,.9,.08); noise(t+.28,.6,{type:'highpass',f:7000,g:.04,a:.005,r:.5}); }
 };
 // 3.3 HERE WE GO: a kick drum, a rising brass stab, the crowd swelling and a bell on top. ~1.3 s.
 P.herewego=t=>{ boom(t,.6); noise(t,1.3,{type:'bandpass',f:700,fto:1600,fslide:.9,q:.5,g:.16,a:.35,r:.6});
  [[N.C4,0],[N.E4,.09],[N.G4,.18]].forEach(([f,d])=>stab(t+d,[f,f*2],'sawtooth',.075,.14));
  stab(t+.3,[N.C4,N.G4,N.C5,N.E5],'sawtooth',.08,.95); boom(t+.3,.4); bell(N.C6,t+.34,1,.09); bell(N.G5*2,t+.46,.9,.06);
  noise(t+.3,1,{type:'highpass',f:7000,g:.07,a:.005,r:.9}); };
 // 3.3 STOP PRESS: a digital glitch stutter then the slam.
 P.glitch=t=>{ for(let i=0;i<6;i++){ const st=t+i*.045; tone(rnd(300,2400),st,.035,{type:'square',g:.05,a:.001,lp:4000}); noise(st,.03,{type:'highpass',f:rnd(2000,6000),g:.12,a:.001,r:.025}); } boom(t+.3,.5); noise(t+.3,.08,{type:'bandpass',f:1600,q:.8,g:.25,a:.001}); };
 P.voice=(t,a)=>{ const o=a||{}; babble(t,o.dur||1.2,o.base||150); };
 P.ringonce=t=>ring(t);
 P.snip=t=>snip(t);
 P.jetpass=t=>jet(t,1.4);
 P.boom=t=>boom(t,.4);
 function play(kind,arg){ const c=init(); if(!c) return; if(c.state==='suspended') c.resume(); const fn=P[kind]||P.pop; try{ fn(c.currentTime+.02,arg); }catch(e){ if(window.SFX_DEBUG) console.error('sfx '+kind,e); } }
 function unlock(){ const c=init(); if(c&&c.state==='suspended') c.resume(); }
 if(typeof window!=='undefined') ['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,unlock,{once:true,passive:true}));
 return {play,unlock};
})();
export default SYN;
