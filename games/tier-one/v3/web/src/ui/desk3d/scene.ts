// The desk (GOTY.md §9.2): the same set the films are shot in, live. A dark wooden desk seen from above at ~50°, a lamp
// making a warm pool on the papers (night) or morning light through a blind, a phone, a coffee, a pen. The lamp swings
// toward the pointer, the papers under it lift and lean away, the phone wakes up when the pointer comes near.
// Cheap on purpose: ~16 draw calls, one shadow-casting light at 1024², pixel ratio capped at 1.5, no post-processing.
// Everything is disposed by stop(). Typed loosely: three.js is loaded at runtime (loader.ts), not from node_modules.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ThreeNS } from './loader';

export type Tone = 'morning' | 'night';
export interface DeskHandle { stop: () => void; resize: () => void; setTone: (t: Tone) => void; frames: () => number; stats: () => DeskStats }
export interface DeskStats { frames: number; jsMsPerFrame: number; drawCalls: number; triangles: number }
// The runtime guard: if the first seconds run under this rate the desk stops itself and the loop plays instead.
const GUARD_MS = 3000, GUARD_FPS = 28;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => { const k = clamp(x, 0, 1); return k * k * (3 - 2 * k); };

// ---------- textures drawn on canvases (no files): wood grain, a newsprint page, the phone screen, a steam puff
function woodTexture(T: ThreeNS) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d')!;
  x.fillStyle = '#221A13'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { const y = (i * 7.3 + Math.sin(i * 1.7) * 9) % 512; x.strokeStyle = `rgba(${18 + (i % 5) * 4},${12 + (i % 3) * 3},8,${0.16 + (i % 4) * 0.05})`; x.lineWidth = 1 + (i % 3); x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(170, y + Math.sin(i) * 6, 340, y - Math.cos(i) * 6, 512, y + 2); x.stroke(); }
  for (let i = 0; i < 2200; i++) { x.fillStyle = `rgba(255,220,180,${Math.random() * 0.035})`; x.fillRect(Math.random() * 512, Math.random() * 512, 2, 1); }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 1.4); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
function paperTexture(T: ThreeNS, seed: number) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 362; const x = c.getContext('2d')!;
  x.fillStyle = '#EAE3D2'; x.fillRect(0, 0, 256, 362);
  x.fillStyle = '#2A241C'; x.fillRect(18, 18, 220, 6); // masthead rule
  x.fillRect(18, 34, 120 + (seed % 60), 22); // the headline block
  x.fillStyle = '#5A5246';
  for (let r = 0; r < 26; r++) { const y = 72 + r * 10.5; if (r % 9 === 8) continue; x.fillRect(18 + (r % 2 ? 112 : 0), y, 100 + ((seed * (r + 3)) % 8), 3); }
  x.fillStyle = '#C9BFAA'; x.fillRect(150, 34, 88, 60); // a photo block
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
function screenTexture(T: ThreeNS) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#1C2E44'); g.addColorStop(1, '#0E1622'); x.fillStyle = g; x.fillRect(0, 0, 128, 256);
  x.fillStyle = '#F4EFE4'; x.font = '700 36px Georgia, serif'; x.textAlign = 'center'; x.fillText('21:07', 64, 70);
  x.fillStyle = 'rgba(244,239,228,.85)'; x.fillRect(14, 120, 100, 34); x.fillStyle = '#FF5A36'; x.fillRect(14, 120, 6, 34);
  x.fillStyle = '#15130F'; x.fillRect(28, 128, 60, 5); x.fillRect(28, 138, 76, 4);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
function puffTexture(T: ThreeNS) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,245,230,.55)'); g.addColorStop(1, 'rgba(255,245,230,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}

export function buildDesk(T: ThreeNS, canvas: HTMLCanvasElement, tone0: Tone, onFirstFrame: () => void, onSlow?: () => void): DeskHandle {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.82;
  renderer.setClearColor(0x0c0a08, 1);
  const scene = new T.Scene();
  scene.fog = new T.Fog(0x0c0a08, 140, 260);
  const cam = new T.PerspectiveCamera(34, 1, 1, 500);
  const CAM = { x: 0, y: 108, z: 84 }; // high and back: the desk is the set under the paper, not the subject
  cam.position.set(CAM.x, CAM.y, CAM.z); cam.lookAt(0, 0, -12);

  const disposables: { dispose: () => void }[] = [];
  const mat = (o: Record<string, unknown>) => { const m = new T.MeshStandardMaterial(o); disposables.push(m); return m; };
  const geo = (g: any) => { disposables.push(g); return g; };
  const tex = (t: any) => { disposables.push(t); return t; };

  // the desk
  const desk = new T.Mesh(geo(new T.BoxGeometry(240, 4, 140)), mat({ map: tex(woodTexture(T)), roughness: 0.78, metalness: 0.05 }));
  desk.position.y = -2; desk.receiveShadow = true; scene.add(desk);
  // the far wall (dark, catches a little light so the frame has depth)
  const wall = new T.Mesh(geo(new T.PlaneGeometry(400, 160)), mat({ color: 0x1a1512, roughness: 1 }));
  wall.position.set(0, 60, -78); scene.add(wall);

  // lights: the room, the window, the lamp
  const amb = new T.HemisphereLight(0x8899bb, 0x2a1c12, 0.25); scene.add(amb);
  const win = new T.DirectionalLight(0xffe6c4, 1.6); win.position.set(70, 90, 40); win.castShadow = true;
  win.shadow.mapSize.set(1024, 1024); Object.assign(win.shadow.camera, { left: -90, right: 90, top: 70, bottom: -70, near: 10, far: 260 }); win.shadow.bias = -0.0005; scene.add(win);
  const lampLight = new T.SpotLight(0xffb668, 620, 170, 0.58, 0.6, 1.4);
  lampLight.position.set(-52, 46, -24); lampLight.castShadow = true; lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.bias = -0.0008; lampLight.shadow.camera.near = 8; lampLight.shadow.camera.far = 140;
  const lampTarget = new T.Object3D(); lampTarget.position.set(-8, 0, -2); scene.add(lampTarget); lampLight.target = lampTarget; scene.add(lampLight);
  const bulbGlow = new T.PointLight(0xffc98a, 40, 60, 2); bulbGlow.position.set(-50, 40, -22); scene.add(bulbGlow);

  // the lamp: base, arm, and the head that swings
  const metal = mat({ color: 0x2a2622, roughness: 0.45, metalness: 0.7 });
  const base = new T.Mesh(geo(new T.CylinderGeometry(8, 9, 2, 32)), metal); base.position.set(-58, 1, -34); base.castShadow = true; scene.add(base);
  const arm = new T.Mesh(geo(new T.CylinderGeometry(0.9, 0.9, 50, 12)), metal); arm.position.set(-55, 26, -30); arm.rotation.z = 0.16; arm.rotation.x = -0.12; arm.castShadow = true; scene.add(arm);
  const head = new T.Group(); head.position.set(-52, 50, -26); scene.add(head);
  const shade = new T.Mesh(geo(new T.ConeGeometry(11, 13, 40, 1, true)), new T.MeshStandardMaterial({ color: 0x1f1b17, roughness: 0.5, metalness: 0.5, side: T.DoubleSide, emissive: 0xffa550, emissiveIntensity: 0 }));
  disposables.push(shade.material); shade.rotation.x = Math.PI; shade.position.y = -3; shade.castShadow = true; head.add(shade);
  const bulb = new T.Mesh(geo(new T.SphereGeometry(2.6, 16, 12)), new T.MeshBasicMaterial({ color: 0xffe2b0 })); disposables.push(bulb.material); bulb.position.y = -7; head.add(bulb);
  head.rotation.x = 0.35; head.rotation.z = -0.25;

  // the papers: a loose stack under the lamp, each its own sheet
  const sheets: { m: any; x: number; z: number; r: number; y: number; lift: number; phase: number }[] = [];
  const sheetGeo = geo(new T.BoxGeometry(21, 0.25, 29.7));
  const P = [[-18, -4, 0.35], [-6, 6, -0.18], [8, -10, 0.12], [-30, 14, -0.42], [2, 20, 0.07]];
  P.forEach(([x, z, r], i) => {
    const m = new T.Mesh(sheetGeo, mat({ map: tex(paperTexture(T, 17 + i * 31)), color: 0xb9b2a4, roughness: 0.92 }));
    m.position.set(x, 0.14 + i * 0.26, z); m.rotation.y = r; m.castShadow = true; m.receiveShadow = true; scene.add(m);
    sheets.push({ m, x, z, r, y: m.position.y, lift: 0, phase: i * 1.7 });
  });
  // the phone: dark slab, a screen that wakes
  const phone = new T.Group(); phone.position.set(30, 0, 4); phone.rotation.y = -0.5; scene.add(phone);
  const body = new T.Mesh(geo(new T.BoxGeometry(7.2, 0.8, 14.6)), mat({ color: 0x0d0d10, roughness: 0.3, metalness: 0.6 })); body.position.y = 0.4; body.castShadow = true; phone.add(body);
  const screenMat = new T.MeshStandardMaterial({ map: tex(screenTexture(T)), emissiveMap: null, emissive: 0x9fd0ff, emissiveIntensity: 0.0, color: 0x000000, roughness: 0.2 }); disposables.push(screenMat);
  const screen = new T.Mesh(geo(new T.PlaneGeometry(6.4, 13.6)), screenMat); screen.rotation.x = -Math.PI / 2; screen.position.y = 0.82; phone.add(screen);
  const screenGlow = new T.PointLight(0x9fd0ff, 0, 22, 2); screenGlow.position.set(0, 3, 0); phone.add(screenGlow);
  // the coffee: a paper cup, the liquid, steam
  const cup = new T.Mesh(geo(new T.CylinderGeometry(4.2, 3.4, 9.5, 28, 1, true)), mat({ color: 0xEDE6D8, roughness: 0.85, side: T.DoubleSide })); cup.position.set(44, 4.75, -18); cup.castShadow = true; scene.add(cup);
  const liquid = new T.Mesh(geo(new T.CircleGeometry(4, 28)), mat({ color: 0x2a170c, roughness: 0.25, metalness: 0.1 })); liquid.rotation.x = -Math.PI / 2; liquid.position.set(44, 8.6, -18); scene.add(liquid);
  const puffMat = new T.SpriteMaterial({ map: tex(puffTexture(T)), transparent: true, depthWrite: false, opacity: 0.5 }); disposables.push(puffMat);
  const puffs = Array.from({ length: 3 }, (_, i) => { const s = new T.Sprite(puffMat); s.scale.set(6, 6, 1); s.position.set(44, 12, -18); scene.add(s); return { s, t: i / 3 }; });
  // a pen
  const pen = new T.Mesh(geo(new T.CylinderGeometry(0.45, 0.45, 15, 10)), mat({ color: 0xD2381B, roughness: 0.4 })); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.9; pen.position.set(-2, 0.5, 30); pen.castShadow = true; scene.add(pen);

  // ---------- the tone: night = lamp on, room dark; morning = window light, lamp off
  let tone: Tone = tone0;
  const setTone = (t: Tone) => {
    tone = t;
    const night = t === 'night';
    lampLight.intensity = night ? 620 : 0; bulbGlow.intensity = night ? 26 : 0; bulb.material.color.set(night ? 0xffe2b0 : 0x6a5f50);
    (shade.material as any).emissiveIntensity = night ? 0.9 : 0;
    win.intensity = night ? 0.12 : 1.7; win.color.set(night ? 0x6f86b8 : 0xffe6c4);
    amb.intensity = night ? 0.14 : 0.45; amb.color.set(night ? 0x506080 : 0xbfd0ee);
    renderer.setClearColor(night ? 0x0a0806 : 0x171310, 1); scene.fog.color.set(night ? 0x0a0806 : 0x171310);
    lampLight.castShadow = night; win.castShadow = !night;
  };
  setTone(tone0);

  // ---------- the pointer: normalised viewport coords and the point it hits on the desk
  const ptr = { nx: 0, ny: 0, x: 0, z: 0, on: false, last: performance.now() };
  const ray = new T.Raycaster(); const plane = new T.Plane(new T.Vector3(0, 1, 0), 0); const hit = new T.Vector3(); const v2 = new T.Vector2();
  const onMove = (e: PointerEvent) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    ptr.nx = (e.clientX / innerWidth) * 2 - 1; ptr.ny = -((e.clientY / innerHeight) * 2 - 1); ptr.on = true; ptr.last = performance.now();
    v2.set(ptr.nx, ptr.ny); ray.setFromCamera(v2, cam);
    if (ray.ray.intersectPlane(plane, hit)) { ptr.x = clamp(hit.x, -110, 110); ptr.z = clamp(hit.z, -70, 70); }
  };
  const onLeave = () => { ptr.on = false; };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  document.addEventListener('mouseleave', onLeave);

  // ---------- the loop
  let raf = 0, frames = 0, running = true, first = false, prev = performance.now(), jsMs = 0, firstAt = 0, guarded = !!(window as { __T1_DESK_NO_GUARD?: boolean }).__T1_DESK_NO_GUARD;
  const target = { lx: -8, lz: -2, cx: 0, cy: CAM.y };
  const size = () => {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  };
  size();
  const tick = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    if (document.visibilityState === 'hidden') return;
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    const t = now / 1000;
    const k = 1 - Math.pow(0.001, dt); // frame-rate independent ease (~90 % per 0.7 s)
    const on = ptr.on && now - ptr.last < 6000;
    // the lamp swings toward the pointer, the camera drifts a little with it
    target.lx = on ? -8 + ptr.nx * 22 : -8; target.lz = on ? -2 + -ptr.ny * 14 : -2;
    lampTarget.position.x += (target.lx - lampTarget.position.x) * k; lampTarget.position.z += (target.lz - lampTarget.position.z) * k;
    head.rotation.z += ((-0.25 + (on ? ptr.nx : 0) * -0.22) - head.rotation.z) * k;
    head.rotation.x += ((0.35 + (on ? ptr.ny : 0) * 0.16) - head.rotation.x) * k;
    target.cx = on ? ptr.nx * 3 : 0; target.cy = CAM.y + (on ? ptr.ny * 1.8 : 0);
    cam.position.x += (target.cx - cam.position.x) * k; cam.position.y += (target.cy - cam.position.y) * k; cam.lookAt(0, 0, -12);
    if (tone === 'night') lampLight.intensity = 620 + Math.sin(t * 17) * 4 + Math.sin(t * 3.1) * 7; // the filament breathes
    // the papers: breathe, and lift and lean away from the pointer when it is over them
    for (const s of sheets) {
      const d = on ? Math.hypot(ptr.x - s.x, ptr.z - s.z) : 99;
      const want = smooth(1 - d / 26);
      s.lift += (want - s.lift) * k;
      s.m.position.y = s.y + Math.sin(t * 0.9 + s.phase) * 0.08 + s.lift * 1.6;
      const ax = on ? (ptr.z - s.z) : 0, az = on ? (ptr.x - s.x) : 0;
      s.m.rotation.x = -Math.sign(ax) * s.lift * 0.07; s.m.rotation.z = Math.sign(az) * s.lift * 0.07; s.m.rotation.y = s.r + Math.sin(t * 0.5 + s.phase) * 0.01;
    }
    // the phone: wakes when the pointer comes near, and pings once a while on its own
    const pd = on ? Math.hypot(ptr.x - phone.position.x, ptr.z - phone.position.z) : 99;
    const ping = Math.max(0, Math.sin(t * 0.35) - 0.94) * 12;
    const wake = clamp(smooth(1 - pd / 30) * 1.8 + ping, 0, 2.2);
    screenMat.emissiveIntensity += (wake - screenMat.emissiveIntensity) * k * 1.6; screenGlow.intensity = screenMat.emissiveIntensity * 6;
    // the steam
    for (const p of puffs) { p.t = (p.t + dt * 0.22) % 1; p.s.position.set(44 + Math.sin(t * 1.3 + p.t * 6) * 1.2, 11 + p.t * 16, -18); p.s.scale.setScalar(4 + p.t * 9); p.s.material.opacity = 0.32 * (1 - p.t) * (tone === 'night' ? 1 : 0.6); }
    const r0 = performance.now(); renderer.render(scene, cam); jsMs += performance.now() - r0; frames++;
    if (!first) { first = true; firstAt = now; onFirstFrame(); }
    else if (!guarded && now - firstAt > GUARD_MS) { guarded = true; if ((frames / (now - firstAt)) * 1000 < GUARD_FPS) { stop(); onSlow?.(); return; } }
  };
  raf = requestAnimationFrame(tick);

  const stop = () => {
    running = false; cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); document.removeEventListener('mouseleave', onLeave);
    disposables.forEach((d) => { try { d.dispose(); } catch { /* */ } });
    scene.clear(); renderer.dispose();
    try { renderer.forceContextLoss(); } catch { /* */ }
  };
  const stats = (): DeskStats => ({ frames, jsMsPerFrame: frames ? +(jsMs / frames).toFixed(2) : 0, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles });
  return { stop, resize: size, setTone, frames: () => frames, stats };
}
