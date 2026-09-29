/* Tier One v3 — look kit.
   Renders the original crest + portrait systems from data attributes, so the
   mockups carry no real badges or photos. Everything here is drawn from club
   colours, initials and a shirt number. Also: edition switch, heat meters,
   tally marks, sparklines, ticker loop. No dependencies. */
(function () {
  "use strict";

  /* ---- Edition (morning / late) ---------------------------------------- */
  var root = document.documentElement;
  var q = new URLSearchParams(location.search);
  var ed = q.get("edition");
  if (!ed) { try { ed = localStorage.getItem("t1-edition"); } catch (e) {} }
  if (ed === "late" || ed === "morning") root.setAttribute("data-edition", ed);
  function currentEdition() {
    var a = root.getAttribute("data-edition");
    if (a) return a;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "late" : "morning";
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-edition-toggle]");
    if (!t) return;
    var next = currentEdition() === "late" ? "morning" : "late";
    root.setAttribute("data-edition", next);
    try { localStorage.setItem("t1-edition", next); } catch (err) {}
    label();
  });
  function label() {
    document.querySelectorAll("[data-edition-toggle]").forEach(function (b) {
      var ar = root.lang === "ar";
      b.textContent = currentEdition() === "late" ? (ar ? "الطبعة المسائية" : "Late edition") : (ar ? "الطبعة الصباحية" : "Morning paper");
    });
  }

  /* ---- Club registry: colours + initials only --------------------------- */
  // shape: shield | round | point | heater ; pattern: solid | stripes | half | band | sash | chief | ring | hoops
  var CLUBS = {
    ARS: ["Arsenal", "#D5191F", "#FFFFFF", "#12264A", "heater", "chief"],
    AVL: ["Aston Villa", "#6A1535", "#94BEE5", "#FFFFFF", "shield", "half"],
    CHE: ["Chelsea", "#12449A", "#FFFFFF", "#FFFFFF", "round", "ring"],
    CRY: ["Crystal Palace", "#1B458F", "#C4122E", "#FFFFFF", "shield", "stripes"],
    LIV: ["Liverpool", "#C4122E", "#F0D98A", "#FFFFFF", "heater", "solid"],
    MCI: ["Manchester City", "#6CABDD", "#1C2C5B", "#1C2C5B", "round", "ring"],
    MUN: ["Manchester United", "#D0231B", "#15130F", "#FFFFFF", "point", "chief"],
    NEW: ["Newcastle United", "#1B1A18", "#F4F1EA", "#1B1A18", "shield", "stripes"],
    NFO: ["Nottingham Forest", "#D11F2D", "#FFFFFF", "#FFFFFF", "point", "sash"],
    TOT: ["Tottenham Hotspur", "#F4F1EA", "#132257", "#132257", "heater", "band"],
    BHA: ["Brighton", "#0057B8", "#FFFFFF", "#0057B8", "round", "stripes"],
    RMA: ["Real Madrid", "#F4F1EA", "#C9A13B", "#2D2A6E", "round", "ring"],
    FCB: ["Barcelona", "#A50044", "#004D98", "#F2C230", "point", "stripes"],
    ATM: ["Atlético Madrid", "#CB3524", "#F4F1EA", "#272E61", "point", "stripes"],
    BAY: ["Bayern München", "#DC052D", "#0066B2", "#FFFFFF", "round", "ring"],
    BVB: ["Borussia Dortmund", "#F7D117", "#15130F", "#15130F", "round", "solid"],
    B04: ["Bayer Leverkusen", "#E32221", "#15130F", "#FFFFFF", "shield", "half"],
    PSG: ["Paris Saint-Germain", "#0F2F63", "#DA291C", "#FFFFFF", "round", "band"],
    JUV: ["Juventus", "#15130F", "#F4F1EA", "#15130F", "heater", "stripes"],
    INT: ["Inter", "#0A5AA6", "#15130F", "#FFFFFF", "round", "stripes"],
    MIL: ["AC Milan", "#E0261E", "#15130F", "#FFFFFF", "heater", "stripes"],
    NAP: ["Napoli", "#1E9BD7", "#FFFFFF", "#FFFFFF", "round", "solid"],
    HIL: ["Al-Hilal", "#1E4FA0", "#FFFFFF", "#FFFFFF", "round", "ring"],
    SCP: ["Sporting CP", "#0A7A4C", "#F4F1EA", "#0A7A4C", "shield", "hoops"],
    BEN: ["Benfica", "#D4121C", "#F4F1EA", "#FFFFFF", "round", "ring"],
    EVE: ["Everton", "#123D8C", "#FFFFFF", "#FFFFFF", "heater", "solid"],
    PRS: ["Press", "#C9C1B0", "#8F887B", "#15130F", "round", "solid"],
    SUN: ["Sunderland", "#E1261C", "#F4F1EA", "#15130F", "shield", "stripes"]
  };
  window.T1_CLUBS = CLUBS;
  var uid = 0;

  var SHAPES = {
    heater: "M4 4h32v14c0 10-7 16-16 19C11 34 4 28 4 18z",
    shield: "M3 5l17-3 17 3v13c0 11-8 17-17 20C11 35 3 29 3 18z",
    point: "M4 3h32v19L20 38 4 22z",
    round: "M20 2a18 18 0 1 1 0 36a18 18 0 1 1 0-36z"
  };

  function crestSVG(code, opts) {
    var c = CLUBS[code] || [code, "#777", "#fff", "#fff", "shield", "solid"];
    var id = "cr" + (++uid);
    var p1 = c[1], p2 = c[2], tx = c[3], shape = SHAPES[c[4]], pat = c[5];
    var fill = "";
    switch (pat) {
      case "stripes": fill = '<rect width="40" height="40" fill="' + p1 + '"/>' + [8, 20, 32].map(function (x) { return '<rect x="' + (x - 3) + '" width="6" height="40" fill="' + p2 + '"/>'; }).join(""); break;
      case "half": fill = '<rect width="40" height="40" fill="' + p1 + '"/><rect x="20" width="20" height="40" fill="' + p2 + '"/>'; break;
      case "band": fill = '<rect width="40" height="40" fill="' + p1 + '"/><rect y="24" width="40" height="16" fill="' + p2 + '"/>'; break;
      case "sash": fill = '<rect width="40" height="40" fill="' + p1 + '"/><path d="M-4 30L30 -4h8L4 30z" fill="' + p2 + '" opacity=".95"/>'; break;
      case "chief": fill = '<rect width="40" height="40" fill="' + p1 + '"/><rect width="40" height="11" fill="' + p2 + '"/>'; break;
      case "hoops": fill = '<rect width="40" height="40" fill="' + p1 + '"/><rect y="12" width="40" height="5" fill="' + p2 + '"/><rect y="24" width="40" height="5" fill="' + p2 + '"/>'; break;
      case "ring": fill = '<rect width="40" height="40" fill="' + p1 + '"/><path d="' + shape + '" fill="none" stroke="' + p2 + '" stroke-width="5" transform="translate(20 20) scale(.78) translate(-20 -20)"/>'; break;
      default: fill = '<rect width="40" height="40" fill="' + p1 + '"/>';
    }
    var letters = code.length > 3 ? code.slice(0, 3) : code;
    // Initials sit on a plate so they read on stripes.
    var plate = (pat === "stripes" || pat === "hoops" || pat === "half" || pat === "sash")
      ? '<rect x="7" y="14.5" width="26" height="11" fill="' + (tx === "#FFFFFF" || tx === "#F4F1EA" ? "#15130F" : "#F4F1EA") + '"/>' : "";
    var plateTx = plate ? (tx === "#FFFFFF" || tx === "#F4F1EA" ? "#F4F1EA" : "#15130F") : tx;
    return '<svg viewBox="0 0 40 40" role="img" aria-label="' + c[0] + ' crest placeholder">' +
      '<defs><clipPath id="' + id + '"><path d="' + shape + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')">' + fill + plate + '</g>' +
      '<path d="' + shape + '" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="1"/>' +
      '<text x="20" y="' + (pat === "chief" ? 26.5 : 23.6) + '" text-anchor="middle" font-family="Archivo, sans-serif" font-stretch="62%" font-weight="800" font-size="10.5" letter-spacing=".2" fill="' + plateTx + '">' + letters + "</text></svg>";
  }

  // Head-and-shoulders silhouette, drawn once, reused. A reporter's file photo,
  // not a person: halftone-lit, club-coloured, number behind.
  var SIL = "M150 70c-31 0-50 24-50 58 0 26 9 46 22 57l-2 24c-30 7-66 18-86 38-19 19-26 58-30 113h292c-4-55-11-94-30-113-20-20-56-31-86-38l-2-24c13-11 22-31 22-57 0-34-19-58-50-58z";
  var HAIR = "M101 118c-2-34 18-56 50-56 30 0 50 18 50 50-6-10-16-18-30-21-10 8-28 10-44 6-10-2-20 6-26 21z";
  function portraitSVG(code, no, variant) {
    var W = variant === "wide" ? 600 : 300;
    var c = CLUBS[code] || ["", "#777", "#fff", "#fff"];
    var id = "pt" + (++uid);
    var bg = c[1], alt = c[2];
    var lightBg = /^#F|^#f/.test(bg);
    var inkC = "#16130F";
    var numC = lightBg ? inkC : alt;
    var dotC = lightBg ? c[3] : alt;
    if (lightBg && (dotC === "#FFFFFF" || dotC === "#F4F1EA")) dotC = inkC;
    return '<svg viewBox="0 0 ' + W + ' 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      "<defs>" +
      '<pattern id="' + id + 'd" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="2.1" fill="' + dotC + '"/></pattern>' +
      '<pattern id="' + id + 'b" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2.5" cy="2.5" r=".9" fill="rgba(0,0,0,.22)"/></pattern>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".25"/><stop offset=".8" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<mask id="' + id + 'm"><rect width="300" height="360" fill="url(#' + id + 'g)"/></mask>' +
      '<clipPath id="' + id + 'c"><path d="' + SIL + '"/></clipPath>' +
      "</defs>" +
      '<rect width="' + W + '" height="360" fill="' + bg + '"/>' +
      '<rect width="' + W + '" height="360" fill="url(#' + id + 'b)"/>' +
      '<text x="' + (variant === "left" ? 18 : W - 8) + '" y="' + (variant === "wide" ? 320 : 250) + '" text-anchor="' + (variant === "left" ? "start" : "end") + '" font-family="Archivo, sans-serif" font-stretch="62%" font-weight="900" font-size="' + (variant === "wide" ? 380 : 300) + '" letter-spacing="-8" fill="none" stroke="' + numC + '" stroke-width="3" opacity=".9">' + no + "</text>" +
      '<g transform="translate(' + (variant === "left" ? 34 : variant === "wide" ? 60 : -34) + ' 0)">' +
      '<path d="' + SIL + '" fill="' + inkC + '"/>' +
      '<g clip-path="url(#' + id + 'c)"><rect width="300" height="360" fill="url(#' + id + 'd)" mask="url(#' + id + 'm)"/></g>' +
      '<path d="' + HAIR + '" fill="' + inkC + '"/>' +
      '<path d="M122 209l28 34 28-34" fill="none" stroke="' + bg + '" stroke-width="7" stroke-linejoin="miter" opacity=".9"/>' +
      "</g></svg>";
  }

  function heat(el) {
    var v = +el.getAttribute("data-heat");
    var on = Math.round(v / 10);
    var bars = "";
    for (var i = 0; i < 10; i++) bars += '<i class="' + (i < on ? "on" : "") + '"></i>';
    el.classList.add("heat");
    if (v >= 70) el.classList.add("is-hot");
    el.innerHTML = '<span class="heat__n">' + v + '</span><span class="heat__bar" aria-hidden="true">' + bars + "</span>" +
      (el.hasAttribute("data-label") ? '<span class="heat__l">' + (el.getAttribute("data-label") || "HEAT") + "</span>" : "");
    el.setAttribute("aria-label", "Heat " + v + " of 100");
  }

  function tally(el) {
    var n = +el.getAttribute("data-n"), out = "";
    var groups = Math.floor(n / 5), rest = n % 5;
    function g(k, strike) {
      var w = k * 5 + 2, s = '<svg viewBox="0 0 ' + (strike ? 26 : w) + ' 16" style="height:16px">';
      for (var i = 0; i < k; i++) s += '<path d="M' + (2 + i * 5) + ' 1.5l' + (i % 2 ? .6 : -.5) + ' 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
      if (strike) s += '<path d="M.5 12L24 3.5" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>';
      return s + "</svg>";
    }
    for (var i = 0; i < groups; i++) out += g(4, true);
    if (rest) out += g(rest, false);
    el.classList.add("tally");
    el.innerHTML = out;
    el.setAttribute("aria-label", n + " day streak");
  }

  // Sparkline: data-points="3,5,9…" ; data-w / data-h; accent end dot.
  function spark(el) {
    var pts = el.getAttribute("data-points").split(",").map(Number);
    var w = +(el.getAttribute("data-w") || 72), h = +(el.getAttribute("data-h") || 22);
    var max = 100, n = pts.length, d = "";
    pts.forEach(function (v, i) {
      var x = (i / (n - 1)) * (w - 4) + 2, y = h - 2 - (v / max) * (h - 4);
      d += (i ? "H" + x.toFixed(1) + "V" : "M" + x.toFixed(1) + " ") + y.toFixed(1);
    });
    var lx = w - 2, ly = h - 2 - (pts[n - 1] / max) * (h - 4);
    el.innerHTML = '<svg viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="' + lx + '" cy="' + ly.toFixed(1) + '" r="2.6" fill="var(--accent)"/></svg>';
  }

  function tickers() {
    document.querySelectorAll(".ticker__track").forEach(function (t) {
      if (t.dataset.looped) return;
      t.innerHTML += t.innerHTML; t.dataset.looped = "1";
      t.lastElementChild && Array.prototype.slice.call(t.children, t.children.length / 2).forEach(function (c) { c.setAttribute("aria-hidden", "true"); });
    });
  }

  function run() {
    document.querySelectorAll("[data-crest]").forEach(function (el) {
      el.classList.add("crest");
      el.innerHTML = crestSVG(el.getAttribute("data-crest"));
    });
    document.querySelectorAll("[data-portrait]").forEach(function (el) {
      var p = el.getAttribute("data-portrait").split(":");
      el.classList.add("portrait");
      el.insertAdjacentHTML("afterbegin", portraitSVG(p[0], p[1] || "", p[2]));
    });
    document.querySelectorAll("[data-heat]").forEach(heat);
    document.querySelectorAll("[data-tally]").forEach(tally);
    document.querySelectorAll("[data-points]").forEach(spark);
    tickers();
    label();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  window.T1 = { crestSVG: crestSVG, portraitSVG: portraitSVG };
})();
