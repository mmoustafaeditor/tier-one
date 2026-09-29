import { generateRealWorld } from '../src/sim/seed';
import { newCareer } from '../src/sim/season';
import { advance } from '../src/sim/clock';
import { seedAcademies, developDay, pathwayDay } from '../src/sim/youth';
let w = generateRealWorld(7);
let c = newCareer(w, 7, 'eng-aston-villa', 'Test', { age: 40, nationality: 'ENG' }, 2026);
w = seedAcademies(w, c);
for (let i = 0; i < 3; i++) { const s = advance(w, c); w = s.world; c = s.career; }
let t = performance.now();
for (let i = 0; i < 20; i++) developDay(w, c);
console.log('developDay ms', ((performance.now() - t) / 20).toFixed(1));
t = performance.now();
for (let i = 0; i < 20; i++) pathwayDay(c, w, c);
console.log('pathwayDay ms', ((performance.now() - t) / 20).toFixed(1));
t = performance.now();
for (let i = 0; i < 5; i++) { const s = advance(w, c); w = s.world; c = s.career; }
console.log('advance ms', ((performance.now() - t) / 5).toFixed(1));
