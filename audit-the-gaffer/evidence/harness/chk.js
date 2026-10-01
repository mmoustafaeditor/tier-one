(() => { const vw = innerWidth; const out = { dir: document.documentElement.dir, docW: document.documentElement.scrollWidth, vw, offRight: [], clipped: [] };
for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (!r.width) continue; const cs = getComputedStyle(e); if (cs.position === 'fixed') continue;
  const leaf = e.children.length === 0 && e.textContent.trim().length > 0;
  if (leaf && (r.right > vw + 2 ? true : r.left < -2) && out.offRight.length < 8) out.offRight.push(e.textContent.trim().slice(0, 30) + '@' + Math.round(r.left) + '-' + Math.round(r.right));
  if (leaf && e.textContent.trim().length > 3 && e.scrollWidth > e.clientWidth + 2 && ['hidden', 'clip'].includes(cs.overflowX) && out.clipped.length < 12) out.clipped.push(e.textContent.trim().slice(0, 40)); }
return out; })()
