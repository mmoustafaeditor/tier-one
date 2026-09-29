/* The Gaffer v2 look kit — draws the parts the mockups share:
   icon sprite, navigation, original crests, typographic portraits, charts,
   Arabic/RTL switch (?lang=ar) and the weighted drag on the tactics board.
   No network, no libraries. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = "http://www.w3.org/2000/svg";
  const q = new URLSearchParams(location.search);
  const AR = q.get("lang") === "ar";
  const K = (window.Kit = { AR });

  /* ---------------- i18n ---------------- */
  if (AR) {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  }
  function localize() {
    if (!AR) return;
    $$("[data-ar]").forEach((el) => (el.textContent = el.dataset.ar));
    $$("[data-ar-html]").forEach((el) => (el.innerHTML = el.dataset.arHtml));
    const R = { W: "ف", D: "ت", L: "خ" }; // فوز / تعادل / خسارة
    $$(".form b").forEach((b) => { b.textContent = R[b.textContent.trim()] || b.textContent; });
  }

  /* ---------------- icons (24px grid, 1.75 stroke) ---------------- */
  const ICONS = {
    today: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    squad: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4"/><path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17.5 14.9c1.9.7 3.1 2.4 3.5 5.1"/>',
    tactics: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M6.5 8.5l2 2m0-2-2 2"/><circle cx="16.5" cy="15.5" r="1.8"/><path d="M8 15c2.5 0 4-1 5.2-3.8M11.8 11.3l1.4-.1.3 1.4"/>',
    market: '<path d="M4 8h13M13.5 4.5 17 8l-3.5 3.5M20 16H7M10.5 12.5 7 16l3.5 3.5"/>',
    club: '<path d="M12 3 5 5.5v6.2c0 4.3 3 7.6 7 9.3 4-1.7 7-5 7-9.3V5.5z"/><path d="M9 11.5l2.2 2.2L15.5 9.5"/>',
    history: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5c0 3 1.2 4.3 3.2 4.6M16 6h3c0 3-1.2 4.3-3.2 4.6M12 13v3.5M8.5 20h7M9.5 20l.7-3.5h3.6l.7 3.5"/>',
    store: '<path d="M5 8h14l-1 12H6zM9 8V6.5a3 3 0 0 1 6 0V8"/>',
    ball: '<circle cx="12" cy="12" r="8.5"/><path d="m12 8 3 2.2-1.1 3.6h-3.8L9 10.2zM12 8V3.6M15 10.2l4-1.5M13.9 13.8l2.6 3.4M10.1 13.8l-2.6 3.4M9 10.2l-4-1.5"/>',
    chev: '<path d="m9.5 6 6 6-6 6"/>', back: '<path d="m14.5 6-6 6 6 6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.2"/>',
    heart: '<path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z"/>',
    bolt: '<path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12z"/>',
    doc: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M13.5 3.5V8H18M9.5 12.5h5M9.5 16h5"/>',
    medic: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
    star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
    trend: '<path d="M3.5 17 9 11.5l3.5 3.5 8-8M15 7h5.5v5.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    swap: '<path d="M7 4v16M7 4 4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>', pause: '<path d="M8 5.5v13M16 5.5v13"/>',
    ff: '<path d="M4 6v12l7.5-6zM12.5 6v12L20 12z"/>',
    whistle: '<path d="M3.5 11a4.5 4.5 0 1 0 9 0V8.5h8V6H9.5A6 6 0 0 0 3.5 11z"/><circle cx="8" cy="11" r="1.3"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    board: '<rect x="3.5" y="5" width="17" height="11" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
    fans: '<path d="M4 20v-3.5a3 3 0 0 1 3-3h1M20 20v-3.5a3 3 0 0 0-3-3h-1M8.5 20v-2.5a3.5 3.5 0 0 1 7 0V20"/><circle cx="12" cy="9.5" r="2.8"/><circle cx="6.5" cy="9.8" r="2"/><circle cx="17.5" cy="9.8" r="2"/>',
    room: '<path d="M4 20V9l8-5 8 5v11"/><path d="M8.5 20v-6h7v6M4 20h16"/>',
    pound: '<path d="M16.5 6.5A3.8 3.8 0 0 0 9 7.8V19M6.5 12.5h7M6.5 19h11"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    arrowr: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    grow: '<path d="M12 20v-8M12 12c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5zM12 14.5c0-3-2.3-5-5.5-5 0 3 2.3 5 5.5 5z"/>',
    handshake: '<path d="M3 11.5 7 7.5l3.5 1 2.5-1.5 4 1L21 11.5M7 7.5v6.5l4.5 4 1.8-1.4 1.6 1.2 1.6-1.6 1.5.4.9-2.1-4-4.3-2.4 1.4-2.3-2"/>',
    stadium: '<ellipse cx="12" cy="9" rx="8.5" ry="3.5"/><path d="M3.5 9v6c0 1.9 3.8 3.5 8.5 3.5s8.5-1.6 8.5-3.5V9"/>',
    grad: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4.3c1.4 1.4 3.3 2.2 5.5 2.2s4.1-.8 5.5-2.2v-4.3"/>',
    chat: '<path d="M4 5.5h16v10.5H10l-4.5 3.5V16H4z"/>',
    flag: '<path d="M5.5 21V4M5.5 4.5h12l-2.5 4 2.5 4h-12"/>',
    drag: '<circle cx="9" cy="6.5" r="1"/><circle cx="15" cy="6.5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="17.5" r="1"/><circle cx="15" cy="17.5" r="1"/>',
    ticket: '<path d="M3.5 7.5h17V10a2 2 0 0 0 0 4v2.5h-17V14a2 2 0 0 0 0-4z"/><path d="M14.5 7.5v9" stroke-dasharray="1.5 2"/>',
    shirt: '<path d="M8.5 3.5 4 6l1.5 4.5 2.5-1V20.5h8V9.5l2.5 1L20 6l-4.5-2.5a3.5 3.5 0 0 1-7 0z"/>',
  };
  function sprite() {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("style", "position:absolute;width:0;height:0");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join("");
    document.body.prepend(s);
  }
  K.icon = (n, cls = "") => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  function icons() {
    $$("[data-i]").forEach((el) => { el.insertAdjacentHTML(el.dataset.iPos === "end" ? "beforeend" : "afterbegin", K.icon(el.dataset.i, el.dataset.iCls || "")); });
  }

  /* ---------------- clubs (colours are facts; crests are original) ---------------- */
  const C = {
    AVL: ["Aston Villa", "#7A263A", "#95BFE5", "AV", "shield", "half"],
    NEW: ["Newcastle United", "#141414", "#F2F2F2", "NU", "round", "stripes"],
    ARS: ["Arsenal", "#DB0007", "#FFFFFF", "A", "shield", "plain"],
    LIV: ["Liverpool", "#C8102E", "#F6EB61", "LFC", "heater", "plain"],
    MCI: ["Manchester City", "#6CABDD", "#1C2C5B", "MC", "round", "plain"],
    CHE: ["Chelsea", "#034694", "#EE242C", "C", "round", "band"],
    TOT: ["Tottenham Hotspur", "#FFFFFF", "#132257", "TH", "heater", "plain"],
    MUN: ["Manchester United", "#DA291C", "#FBE122", "MU", "shield", "plain"],
    BHA: ["Brighton", "#0057B8", "#FFFFFF", "BH", "round", "stripes"],
    BOU: ["Bournemouth", "#DA291C", "#111111", "AFC", "heater", "stripes"],
    FUL: ["Fulham", "#FFFFFF", "#111111", "F", "shield", "band"],
    CRY: ["Crystal Palace", "#1B458F", "#C4122E", "CP", "shield", "stripes"],
    BRE: ["Brentford", "#E30613", "#FFFFFF", "B", "round", "stripes"],
    NFO: ["Nottingham Forest", "#DD0000", "#FFFFFF", "NF", "heater", "plain"],
    EVE: ["Everton", "#003399", "#FFFFFF", "E", "shield", "chev"],
    SUN: ["Sunderland", "#EB172B", "#FFFFFF", "S", "shield", "stripes"],
    PLY: ["Plymouth Argyle", "#00533E", "#FFFFFF", "PA", "heater", "chev"],
    POR: ["FC Porto", "#0A4595", "#FFFFFF", "P", "round", "half"],
    WHU: ["West Ham", "#7A263A", "#1BB1E7", "WH", "shield", "band"],
    LEE: ["Leeds United", "#FFFFFF", "#1D428A", "LU", "round", "band"],
    BUR: ["Burnley", "#6C1D45", "#99D6EA", "B", "heater", "half"],
    WOL: ["Wolves", "#FDB913", "#231F20", "W", "heater", "plain"],
  };
  K.clubs = C;
  function lum(hex) { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  const SHAPES = {
    shield: "M50 4 L92 14 V52 C92 80 72 98 50 108 C28 98 8 80 8 52 V14 Z",
    heater: "M10 8 H90 V46 C90 78 70 96 50 108 C30 96 10 78 10 46 Z",
    round: "M50 6 A50 50 0 1 1 49.9 6 Z",
  };
  K.crest = function (code, uid) {
    const c = C[code] || ["?", "#555", "#ccc", "?", "shield", "plain"];
    const [, a, b, ini, shape, pat] = c;
    const id = "cr" + code + (uid || Math.random().toString(36).slice(2, 7));
    const d = shape === "round" ? "M50 4 a52 52 0 1 0 .1 0Z" : SHAPES[shape];
    const vb = shape === "round" ? "-4 0 108 112" : "0 0 100 112";
    let fill = "";
    if (pat === "half") fill = `<rect x="0" y="0" width="50" height="112" fill="${a}"/><rect x="50" y="0" width="60" height="112" fill="${b}"/>`;
    else if (pat === "stripes") fill = `<rect width="110" height="112" fill="${a}"/>` + [0, 1, 2, 3, 4].map((i) => `<rect x="${6 + i * 20}" width="10" height="112" fill="${b}"/>`).join("");
    else if (pat === "band") fill = `<rect width="110" height="112" fill="${a}"/><path d="M-10 70 L110 20 V40 L-10 90Z" fill="${b}"/>`;
    else if (pat === "chev") fill = `<rect width="110" height="112" fill="${a}"/><path d="M0 44 L50 70 L100 44 V58 L50 84 L0 58Z" fill="${b}"/>`;
    else fill = `<rect width="110" height="112" fill="${a}"/>`;
    // initials sit on a plate so they read on any pattern
    const plateCol = pat === "plain" ? a : (lum(a) < lum(b) ? a : b);
    const txt = lum(plateCol) > 0.6 ? "#0B1A18" : "#FFFFFF";
    const fs = ini.length >= 3 ? 22 : ini.length === 2 ? 28 : 36;
    const plate = pat === "plain" ? "" : `<rect x="20" y="38" width="60" height="34" rx="6" fill="${plateCol}"/>`;
    return `<svg viewBox="${vb}" role="img" aria-label="${c[0]} crest (original)"><defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>
      <g clip-path="url(#${id})">${fill}${plate}<path d="M0 0H110V30C70 40 30 22 0 36Z" fill="#fff" opacity=".12"/></g>
      <path d="${d}" fill="none" stroke="${lum(a) > 0.8 ? "#0B1A18" : "rgba(255,255,255,.55)"}" stroke-width="3"/>
      <text x="50" y="${55 + fs * 0.35}" text-anchor="middle" font-family="Archivo, Arial" font-stretch="118%" font-weight="900" font-size="${fs}" fill="${txt}" letter-spacing="-1">${ini}</text></svg>`;
  };

  /* ---------------- portraits: faceless risograph busts in club kit ---------------- */
  function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  const HAIR = [
    "M40 44c0-14 9-22 20-22s20 8 20 22c-4-7-11-10-20-10s-16 3-20 10z", // crop
    "M39 46c-1-16 8-26 21-26 14 0 23 10 21 26-3-4-6-6-8-6-3-5-9-7-13-7s-10 2-13 7c-2 0-5 2-8 6z", // swept
    "M36 46c-4-18 8-30 24-30s28 12 24 30c-2-6-5-9-8-10 0-4-8-8-16-8s-16 4-16 8c-3 1-6 4-8 10z", // volume
    "M41 42c1-12 9-19 19-19s18 7 19 19c-5-4-12-5-19-5s-14 1-19 5z", // buzz
    "M38 46c-2-15 7-25 22-25s24 10 22 25l-3-7-4 4-3-6-5 4-4-6-4 6-5-4-3 6-4-4z", // curls
  ];
  /* Kit-back portrait: we never draw faces. A player is his shirt on the dressing-room peg —
     surname, number, club colours — lit by the floodlight. Works from 32px to full-bleed. */
  K.portrait = function (name, code, num, opt = {}) {
    const c = C[code] || ["", "#333", "#999", "", "shield", "plain"];
    const [, a, b, , , pat] = c;
    const h = hash(name);
    const u = "k" + (h % 99999) + Math.random().toString(36).slice(2, 6);
    const sur = (opt.surname || name.split(" ").slice(-1)[0]).toUpperCase();
    const n = String(num ?? "");
    const body = "M38 21C44 25.5 52 27 60 27s16-1.5 22-6l22 9.5 12 32-16 8-6-14V146H26V56.5l-6 14-16-8 12-32z";
    const sleeveL = "M16 30.5 33 23.4 26 56.5l-6 14-16-8z", sleeveR = "M104 30.5 87 23.4 94 56.5l6 14 16-8z";
    let fill = `<path d="${body}" fill="${a}"/>`;
    if (pat === "stripes") fill += `<g clip-path="url(#${u}c)">${[0,1,2,3,4,5].map(i => `<rect x="${14 + i * 18}" y="0" width="9" height="150" fill="${b}"/>`).join("")}</g>`;
    if (pat === "band") fill += `<g clip-path="url(#${u}c)"><rect x="0" y="122" width="120" height="8" fill="${b}"/></g>`;
    if (pat === "chev") fill += `<g clip-path="url(#${u}c)"><path d="M26 118 60 132 94 118v7L60 139 26 125z" fill="${b}"/></g>`;
    if (pat === "half") fill += `<path d="${sleeveL}" fill="${b}"/><path d="${sleeveR}" fill="${b}"/>`;
    const bodyLight = pat === "stripes" ? (lum(a) + lum(b)) / 2 > 0.5 : lum(a) > 0.62;
    const ink = pat === "stripes" ? (lum(a) < 0.4 ? a : b) : (bodyLight ? (lum(b) < 0.5 ? b : "#10201E") : (pat === "half" || lum(b) > 0.5 ? (lum(b) > 0.5 ? b : "#FFFFFF") : "#FFFFFF"));
    const plate = pat === "stripes" ? `<rect x="30" y="40" width="60" height="84" rx="4" fill="${lum(a) < 0.4 ? b : a}"/>` : "";
    const inkOnPlate = pat === "stripes" ? (lum(a) < 0.4 ? a : b) : ink;
    const fs = Math.min(13, (pat === "stripes" ? 54 : 60) / (sur.length * 0.8));
    return `<svg viewBox="0 0 120 150" role="img" aria-label="${name}, number ${n}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="${u}g" x1="0" y1="0" x2=".2" y2="1"><stop offset="0" stop-color="#11433C"/><stop offset="1" stop-color="#031A17"/></linearGradient>
        <radialGradient id="${u}r" cx=".5" cy="-.05" r=".85"><stop offset="0" stop-color="#E9FFF8" stop-opacity=".34"/><stop offset=".55" stop-color="#E9FFF8" stop-opacity="0"/></radialGradient>
        <linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
        <linearGradient id="${u}v" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
        <clipPath id="${u}c"><path d="${body}"/></clipPath>
      </defs>
      ${opt.bare ? "" : `<rect x="-120" y="-40" width="360" height="230" fill="url(#${u}g)"/>`}
      ${opt.bare ? "" : `<g fill="#CFFFF0">`}${opt.bare ? "" : Array.from({ length: 9 }, (_, i) => `<rect x="${-40 + ((h >> (i * 2)) % 10) * 20}" y="${((h >> (i + 5)) % 4) * 20}" width="20" height="20" opacity="${0.025 + ((h >> i) % 4) * 0.018}"/>`).join("")}${opt.bare ? "" : "</g>"}
      <path d="M60 4.5c0-3 4.2-3 4.2 0 0 2.2-4.2 2.6-4.2 5.3V12M34 24l26-12 26 12" fill="none" stroke="#9FC9BE" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
      <g filter="drop-shadow(0 6px 8px rgba(0,0,0,.45))">${fill}</g>
      ${plate}
      <text x="60" y="54" text-anchor="middle" font-family="Archivo, Arial" font-stretch="112%" font-weight="800" font-size="${fs.toFixed(1)}" fill="${inkOnPlate}" letter-spacing=".5">${sur}</text>
      ${n ? `<text x="60" y="${n.length > 1 ? 112 : 113}" text-anchor="middle" font-family="Archivo, Arial" font-stretch="${n.length > 1 ? 100 : 110}%" font-weight="800" font-size="${n.length > 1 ? 52 : 58}" fill="${inkOnPlate}" letter-spacing="-2">${n}</text>` : ""}
      <path d="M44 22.3c5 3.6 27 3.6 32 0" fill="none" stroke="${pat === "half" ? a : b}" stroke-width="3" stroke-linecap="round"/>
      <path d="M5 62.2 20 70M115 62.2 100 70" stroke="${pat === "half" ? a : b}" stroke-width="3"/>
      <path d="${body}" fill="url(#${u}s)"/><path d="${body}" fill="url(#${u}v)"/>
      <path d="M40 80c4 18 3 40 1 64M82 70c-3 22-2 50 0 74" stroke="#000" stroke-opacity=".10" stroke-width="3" fill="none"/>
      ${opt.bare ? "" : `<rect x="-120" y="-40" width="360" height="230" fill="url(#${u}r)"/>`}
    </svg>`;
  };
  function drawIdentity() {
    $$("[data-crest]").forEach((el) => { el.classList.add("crest"); el.innerHTML = K.crest(el.dataset.crest); });
    $$("[data-portrait]").forEach((el) => { el.classList.add("portrait"); el.innerHTML = K.portrait(el.dataset.portrait, el.dataset.club || "AVL", el.dataset.num, { bare: "bare" in el.dataset }); if ("bare" in el.dataset) el.style.background = "none"; });
  }

  /* ---------------- charts ---------------- */
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function svgEl(w, h) { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", `0 0 ${w} ${h}`); s.setAttribute("width", w); s.setAttribute("height", h); s.style.overflow = "visible"; return s; }
  function tip(el) { let t = el.querySelector(".tip"); if (!t) { t = document.createElement("div"); t.className = "tip"; el.appendChild(t); } return t; }

  /* Line / step chart. opt: {series:[{key,data:[y..],color,dash,label,area}], x:[labels], yMin,yMax, h, fmt, markers:[{i,label}], band:{lo:[],hi:[]}, ref:{y,label}} */
  K.line = function (el, opt) {
    const draw = () => {
      const W = Math.max(100, el.clientWidth || 200), H = opt.h || 160, P = { l: opt.padL ?? 30, r: 12, t: 12, b: 22 };
      const n = opt.x.length, all = opt.series.flatMap((s) => s.data.filter((v) => v != null)).concat(opt.band ? opt.band.hi : []);
      const y0 = opt.yMin ?? 0, y1 = opt.yMax ?? Math.max(...all) * 1.1;
      const X = (i) => { const t = P.l + (i / (n - 1)) * (W - P.l - P.r); return AR ? W - t + (P.l - P.r) : t; };
      const Y = (v) => P.t + (1 - (v - y0) / (y1 - y0)) * (H - P.t - P.b);
      const s = svgEl(W, H);
      let g = "";
      const ticks = opt.yTicks || [y0, (y0 + y1) / 2, y1];
      ticks.forEach((t) => { g += `<line x1="${AR ? P.r : P.l}" x2="${AR ? W - P.l : W - P.r}" y1="${Y(t)}" y2="${Y(t)}" stroke="${css("--dv-grid")}" />`;
        g += `<text x="${AR ? W - 2 : 2}" y="${Y(t) + 4}" font-size="10.5" fill="${css("--dv-axis")}" text-anchor="${AR ? "end" : "start"}" font-family="Instrument Sans">${opt.fmt ? opt.fmt(t) : t}</text>`; });
      opt.x.forEach((l, i) => { if (l !== "") g += `<text x="${X(i)}" y="${H - 4}" font-size="10.5" fill="${css("--dv-axis")}" text-anchor="middle" font-family="Instrument Sans">${l}</text>`; });
      if (opt.band) { const up = opt.band.hi.map((v, i) => v == null ? null : `${X(i)},${Y(v)}`).filter(Boolean); const dn = opt.band.lo.map((v, i) => v == null ? null : `${X(i)},${Y(v)}`).filter(Boolean).reverse();
        g += `<polygon points="${up.concat(dn).join(" ")}" fill="${opt.band.color || css("--dv-us")}" opacity=".16"/>`; }
      if (opt.ref) { g += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(opt.ref.y)}" y2="${Y(opt.ref.y)}" stroke="${opt.ref.color || css("--bad")}" stroke-dasharray="4 4" stroke-width="1.5"/><text x="${AR ? P.l + 4 : W - P.r}" y="${Y(opt.ref.y) - 6}" text-anchor="${AR ? "start" : "end"}" font-size="11" font-weight="600" fill="${opt.ref.color || css("--bad")}" font-family="Instrument Sans">${opt.ref.label}</text>`; }
      opt.series.forEach((se) => {
        const col = se.color || css(se.key === "them" ? "--dv-them" : "--dv-us");
        let d = "", started = false, last = null;
        se.data.forEach((v, i) => { if (v == null) return; if (opt.step && last != null) d += `L${X(i)},${Y(last)}`; d += (started ? "L" : "M") + `${X(i)},${Y(v)}`; started = true; last = v; });
        if (se.area) { const f = se.data.findIndex((v) => v != null); const l = se.data.length - 1 - [...se.data].reverse().findIndex((v) => v != null);
          g += `<path d="${d}L${X(l)},${Y(y0)}L${X(f)},${Y(y0)}Z" fill="${col}" opacity=".14"/>`; }
        g += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${se.w || 2}" stroke-linejoin="round" stroke-linecap="round" ${se.dash ? 'stroke-dasharray="5 4"' : ""}/>`;
        const li = se.data.length - 1 - [...se.data].reverse().findIndex((v) => v != null);
        if (se.label) g += `<circle cx="${X(li)}" cy="${Y(se.data[li])}" r="4" fill="${col}" stroke="${css("--surface-solid")}" stroke-width="2"/>`;
      });
      (opt.markers || []).forEach((m) => { g += `<g><line x1="${X(m.i)}" x2="${X(m.i)}" y1="${P.t}" y2="${H - P.b}" stroke="${m.color || css("--dv-axis")}" stroke-dasharray="2 3" opacity=".7"/><text x="${X(m.i) + (AR ? -4 : 4)}" y="${P.t + 9}" font-size="10.5" font-weight="700" fill="${m.color || css("--dv-axis")}" text-anchor="${AR ? "end" : "start"}" font-family="Instrument Sans">${m.label}</text></g>`; });
      s.innerHTML = g;
      // hover layer: crosshair + tooltip
      const hl = document.createElementNS(NS, "line"); hl.setAttribute("y1", P.t); hl.setAttribute("y2", H - P.b); hl.setAttribute("stroke", css("--ink-3")); hl.style.opacity = 0; s.appendChild(hl);
      s.addEventListener("pointermove", (e) => { const r = s.getBoundingClientRect(); let px = (e.clientX - r.left) * (W / r.width); if (AR) px = W - px + (P.l - P.r); const i = Math.max(0, Math.min(n - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (n - 1))));
        hl.setAttribute("x1", X(i)); hl.setAttribute("x2", X(i)); hl.style.opacity = 0.5; const t = tip(el); t.style.opacity = 1;
        t.innerHTML = `<b>${opt.tipX ? opt.tipX(i) : opt.x[i]}</b>` + opt.series.map((se) => se.data[i] == null ? "" : `<span><i style="background:${se.color || css(se.key === "them" ? "--dv-them" : "--dv-us")}"></i>${se.name || ""} ${opt.fmt ? opt.fmt(se.data[i]) : se.data[i]}</span>`).join("");
        t.style.insetInlineStart = Math.min(r.width - 140, Math.max(0, (AR ? W - X(i) : X(i)) * (r.width / W) - 60)) + "px"; });
      s.addEventListener("pointerleave", () => { hl.style.opacity = 0; tip(el).style.opacity = 0; });
      el.querySelector("svg")?.remove(); el.prepend(s);
    };
    draw(); new ResizeObserver(() => draw()).observe(el);
  };

  /* Momentum: bars above (us) / below (them) a centre line, one per 3 minutes. */
  K.momentum = function (el, data, opt = {}) {
    const draw = () => {
      const W = Math.max(200, el.clientWidth), H = opt.h || 70, n = opt.of || 30, bw = W / n;
      const s = svgEl(W, H); let g = `<line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="${css("--line-2")}"/>`;
      data.forEach((v, i) => { const x = AR ? W - (i + 1) * bw : i * bw; const hgt = Math.abs(v) * (H / 2 - 4);
        g += `<rect x="${x + 1}" y="${v >= 0 ? H / 2 - hgt : H / 2}" width="${bw - 2}" height="${Math.max(1, hgt)}" rx="2" fill="${css(v >= 0 ? "--dv-us" : "--dv-them")}" opacity="${0.55 + Math.abs(v) * 0.45}"><title>${(i + 1) * 3}′ ${v >= 0 ? "Villa" : "Newcastle"} pressure ${Math.round(Math.abs(v) * 100)}</title></rect>`; });
      (opt.events || []).forEach((e) => { const x = (AR ? W - e.i * bw : e.i * bw); g += `<g><circle cx="${x}" cy="${e.us ? 6 : H - 6}" r="5" fill="${css("--surface-solid")}" stroke="${css(e.us ? "--dv-us" : "--dv-them")}" stroke-width="2"/></g>`; });
      s.innerHTML = g; el.querySelector("svg")?.remove(); el.prepend(s);
    };
    draw(); new ResizeObserver(draw).observe(el);
  };

  /* Zone grid overlay on a pitch: rows × cols of values 0..1 */
  K.zones = function (el, grid, opt = {}) {
    const wrap = document.createElement("div"); wrap.className = "zones";
    wrap.style.gridTemplateColumns = `repeat(${grid[0].length}, 1fr)`;
    grid.forEach((row, r) => row.forEach((v, c) => { const d = document.createElement("i"); const lvl = v > 0.75 ? 4 : v > 0.5 ? 3 : v > 0.28 ? 2 : v > 0.1 ? 1 : 0; d.style.background = `var(--heat-${lvl})`;
      if (opt.labels && opt.labels[r] && opt.labels[r][c]) { d.textContent = opt.labels[r][c]; d.className = "zl"; }
      d.title = `${Math.round(v * 100)}% of ${opt.what || "possession"} in this zone`; wrap.appendChild(d); }));
    el.appendChild(wrap);
  };

  /* ---------------- tactics board: drag with weight ---------------- */
  K.board = function (board, slots, onDrop) {
    const toks = $$(".tok", board);
    let drag = null, raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
    const place = (t, x, y) => { t.style.left = x + "%"; t.style.top = y + "%"; };
    toks.forEach((t) => {
      t.addEventListener("pointerdown", (e) => { e.preventDefault(); t.setPointerCapture(e.pointerId); drag = t; t.classList.add("lift"); board.classList.add("dragging");
        const r = board.getBoundingClientRect(); cx = tx = ((e.clientX - r.left) / r.width) * 100; cy = ty = ((e.clientY - r.top) / r.height) * 100; loop(); });
      t.addEventListener("pointermove", (e) => { if (drag !== t) return; const r = board.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width) * 100; ty = ((e.clientY - r.top) / r.height) * 100; });
      const end = () => { if (drag !== t) return; cancelAnimationFrame(raf); t.classList.remove("lift"); board.classList.remove("dragging");
        let best = slots[0], bd = 1e9; slots.forEach((s) => { const d = (s.x - cx) ** 2 + (s.y - cy) ** 2; if (d < bd) { bd = d; best = s; } });
        t.classList.add("snap"); place(t, best.x, best.y); setTimeout(() => t.classList.remove("snap"), 420); drag = null; onDrop && onDrop(t, best); };
      t.addEventListener("pointerup", end); t.addEventListener("pointercancel", end);
      t.addEventListener("keydown", (e) => { const s = slots.find((s) => s.id === t.dataset.slot); if (!s) return; });
    });
    function loop() { // weight: the token trails the finger slightly (lerp), tilting in the direction of travel
      const k = 0.28; const vx = (tx - cx) * k, vy = (ty - cy) * k; cx += vx; cy += vy;
      if (drag) { place(drag, cx, cy); drag.style.setProperty("--tilt", Math.max(-10, Math.min(10, vx * 6)) + "deg"); }
      raf = requestAnimationFrame(loop);
    }
  };

  /* ---------------- nav + topbar ---------------- */
  const NAV = [
    ["today", "Today", "اليوم", "home.html"], ["squad", "Squad", "الفريق", "squad.html"], ["tactics", "Match", "المباراة", "tactics.html"],
    ["market", "Transfers", "الانتقالات", "recruitment.html"], ["club", "Club", "النادي", "office.html"],
  ];
  function nav() {
    const n = $("nav.nav"); if (!n) return; const cur = n.dataset.active;
    n.setAttribute("aria-label", AR ? "التنقل الرئيسي" : "Main");
    n.innerHTML = `<a class="nav-brand" href="index.html" aria-label="The Gaffer"><span data-crest="AVL" class="crest crest--sm" style="width:40px;height:40px"></span></a>` +
      NAV.map(([k, en, ar, href]) => `<a href="${href}" ${k === cur ? 'aria-current="page"' : ""}>${K.icon(k === "tactics" ? "whistle" : k)}<span>${AR ? ar : en}</span></a>`).join("") +
      `<span class="nav-sep"></span><a class="nav-extra" href="history.html" ${cur === "history" ? 'aria-current="page"' : ""}>${K.icon("history")}<span>${AR ? "المسيرة" : "Career"}</span></a>` +
      `<a class="nav-extra" href="store.html" ${cur === "store" ? 'aria-current="page"' : ""}>${K.icon("store")}<span>${AR ? "المتجر" : "Club Pass"}</span></a>`;
  }

  /* ---------------- boot ---------------- */
  function boot() { sprite(); localize(); nav(); icons(); drawIdentity(); document.dispatchEvent(new Event("kit:ready")); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
