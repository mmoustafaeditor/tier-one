// Minimal wikitext readers for the facts we need: squad templates, infobox kit colours and transfer-list tables.
// We only extract facts (names, numbers, positions, nationalities, dates, fees, clubs, citation URLs). No prose is kept.

/** '#REDIRECT [[Target]]' -> 'Target', else null. */
export function redirectTarget(text) {
  const m = /^\s*#REDIRECT\s*\[\[([^\]|#]+)/i.exec(text || '');
  return m ? m[1].trim() : null;
}

/** Split template/table params on top-level '|' (ignores pipes inside [[ ]] and {{ }}). */
export function splitTop(s) {
  const out = []; let depthL = 0, depthT = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (two === '[[') { depthL++; cur += two; i++; continue; }
    if (two === ']]') { depthL = Math.max(0, depthL - 1); cur += two; i++; continue; }
    if (two === '{{') { depthT++; cur += two; i++; continue; }
    if (two === '}}') { depthT = Math.max(0, depthT - 1); cur += two; i++; continue; }
    if (s[i] === '|' && !depthL && !depthT) { out.push(cur); cur = ''; continue; }
    cur += s[i];
  }
  out.push(cur);
  return out;
}

/** Split an inline table row on '||' outside templates and links. */
function splitCells(s) {
  const out = []; let d = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (two === '{{' || two === '[[') { d++; cur += two; i++; continue; }
    if ((two === '}}' || two === ']]') && d > 0) { d--; cur += two; i++; continue; }
    if (two === '||' && !d) { out.push(cur); cur = ''; i++; continue; }
    cur += s[i];
  }
  out.push(cur);
  return out;
}

/** Returns every top-level {{Name ...}} template body (without braces) whose name matches `re`, with its offset. */
export function findTemplates(text, re) {
  const out = [];
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] !== '{' || text[i + 1] !== '{') continue;
    let depth = 0, j = i;
    for (; j < text.length - 1; j++) {
      if (text[j] === '{' && text[j + 1] === '{') { depth++; j++; } else if (text[j] === '}' && text[j + 1] === '}') { depth--; j++; if (!depth) break; }
    }
    const body = text.slice(i + 2, j - 1);
    const name = body.split('|')[0].trim();
    if (re.test(name)) { out.push({ body, at: i }); i = j; }
  }
  return out;
}

export function params(body) {
  const parts = splitTop(body); const named = {}; const pos = [];
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq > 0 && /^[\w\s-]+$/.test(p.slice(0, eq))) named[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
    else pos.push(p.trim());
  }
  return { name: parts[0].trim(), named, pos };
}

const stripRefs = (s) => String(s || '').replace(/<ref[^>]*\/>/gi, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '').replace(/<!--[\s\S]*?-->/g, '');

/** First wiki link in s -> { title, text } (or null). */
export function firstLink(s) {
  const m = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/.exec(s || '');
  return m ? { title: m[1].trim(), text: plain(m[2] || m[1]) } : null;
}

/** Wikitext -> plain display text (links -> label, sortname -> "First Last", drops other templates, refs, markup). */
export function plain(s) {
  let t = stripRefs(s);
  t = t.replace(/\{\{\s*sortname\s*\|([^|}]*)\|([^|}]*)[^}]*\}\}/gi, (_, a, b) => (a.trim() + ' ' + b.trim()).trim());
  t = t.replace(/\{\{\s*(?:nowrap|small|nobold)\s*\|([^{}]*)\}\}/gi, '$1');
  for (let k = 0; k < 4; k++) t = t.replace(/\{\{[^{}]*\}\}/g, '');
  t = t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, '$1');
  t = t.replace(/'''?/g, '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

/** Citation URLs (`url=`) found in a chunk of wikitext, deduped. */
export function citeUrls(s) {
  const out = new Set();
  for (const m of String(s || '').matchAll(/\burl\s*=\s*(https?:\/\/[^\s|}<]+)/gi)) out.add(m[1]);
  return [...out];
}

// ---------- infobox ----------
const hex = (v) => { const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(String(v || '').trim()); if (!m) return null; let h = m[1].toUpperCase(); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return '#' + h; };

/** Club infobox facts: display name and kit colours (primary = home body, secondary = first distinct of shorts/sleeves/socks). */
export function parseInfobox(text) {
  const box = findTemplates(text, /^infobox football club/i)[0];
  if (!box) return {};
  const { named } = params(box.body);
  const body = hex(named.body1), others = [named.shorts1, named.leftarm1, named.socks1].map(hex).filter(Boolean);
  const secondary = others.find((c) => c !== body) || null;
  return {
    clubname: plain(named.clubname || '') || null,
    fullname: plain(named.fullname || '') || null,
    colors: body ? [body, secondary] : null,
  };
}

// ---------- squads ----------
const SKIP_HEAD = /academy|under[- ]?\d|u-?\d\d|reserve|youth|\bb\b|\bii\b|development|women|retired|former|notable|record|staff|management|captain|award|hall of fame|international|world cup/i;
const LOAN_HEAD = /loan/i;
const POS = { GK: 'GK', DF: 'DF', MF: 'MF', FW: 'FW' };

function headings(text) {
  const hs = [];
  for (const m of text.matchAll(/^(={2,5})\s*([^=\n]+?)\s*\1\s*$/gm)) hs.push({ at: m.index, level: m[1].length, title: m[2].trim() });
  return hs;
}

/**
 * Parse {{Fs player}} / {{Football squad player}} rows. Each row gets a `section` of 'first' | 'loanOut'.
 * Rows under academy/youth/reserve/"former" headings are dropped.
 */
export function parseSquad(text) {
  const hs = headings(text);
  const rows = [];
  for (const { body, at } of findTemplates(text, /^(fs player|football squad player)$/i)) {
    // heading chain above the row: nearest heading plus its parents (e.g. "B Team" > "Current squad")
    const chain = []; let lvl = 99;
    for (let k = hs.length - 1; k >= 0; k--) if (hs[k].at < at && hs[k].level < lvl) { chain.push(hs[k]); lvl = hs[k].level; }
    const head = chain.length ? chain[0].title : '';
    const clean = (t) => t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');
    // a loan heading keeps the row as loaned-out; academy/youth/former headings anywhere in the chain drop it
    if (chain.slice(0, 3).some((x) => SKIP_HEAD.test(clean(x.title)) && !LOAN_HEAD.test(x.title))) continue;
    const { named } = params(body);
    const nameRaw = named.name || '';
    const link = firstLink(nameRaw);
    const name = plain(nameRaw);
    if (!name) continue;
    const other = named.other || '';
    let section = LOAN_HEAD.test(head) ? 'loanOut' : 'first';
    let loanTo = null, loanFrom = null, loanUntil = null;
    const mTo = /on loan (?:to|at)\s*(\[\[[^\]]+\]\]|[^,;<]+)/i.exec(other);
    const mFrom = /on loan from\s*(\[\[[^\]]+\]\]|[^,;<]+)/i.exec(other);
    const mUntil = /until\s+([^<\]|]+?)\s*$/i.exec(plain(other));
    if (mTo) { section = 'loanOut'; loanTo = firstLink(mTo[1]) || { title: null, text: plain(mTo[1]) }; }
    if (mFrom) loanFrom = firstLink(mFrom[1]) || { title: null, text: plain(mFrom[1]) };
    if (mUntil) loanUntil = mUntil[1].trim();
    const noRaw = plain(named.no || named.number || '');
    const no = /^\d{1,3}$/.test(noRaw) ? Number(noRaw) : null;
    rows.push({
      section, heading: head, name, ref: link && link.title ? link.title : null,
      nat: (plain(named.nat || '') || '').toUpperCase().slice(0, 3) || null,
      pos: POS[(plain(named.pos || '') || '').toUpperCase()] || null,
      no, captain: /\bcaptain\b/i.test(other) && !/vice/i.test(other), viceCaptain: /vice-captain/i.test(other),
      loanTo, loanFrom, loanUntil, other,
    });
  }
  return rows;
}

// ---------- transfer lists ("List of English football transfers summer 2026") ----------
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
export function parseDate(s) {
  const dts = /\{\{\s*dts\s*\|(?:[^|}]*=[^|}]*\|)*\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i.exec(s || '');
  if (dts) return `${dts[1]}-${dts[2].padStart(2, '0')}-${dts[3].padStart(2, '0')}`;
  const t = plain(s);
  let m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(t);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/.exec(t);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[3]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  m = /(\d{4})-(\d{2})-(\d{2})/.exec(t);
  return m ? m[0] : null;
}

/** Player cell -> { name, ref }. {{sortname|First|Last|dab=footballer}} links to "First Last (footballer)" unless nolink. */
export function playerCell(cell) {
  const so = findTemplates(cell, /^sort$/i)[0];
  if (so) { const parts = splitTop(so.body); cell = parts.slice(2).join('|') || cell; }
  const sn = findTemplates(cell, /^sortname$/i)[0];
  if (sn) {
    const { named, pos } = params(sn.body);
    const name = (pos[0] + ' ' + pos[1]).trim();
    const nolink = named.nolink && named.nolink !== '';
    const ref = nolink ? null : (pos[2] ? pos[2].trim() : name + (named.dab ? ` (${named.dab})` : ''));
    return { name: plain(name), ref };
  }
  const link = firstLink(cell);
  return { name: plain(cell), ref: link ? link.title : null };
}

/** Parse a fee cell -> { text, type: 'transfer'|'loan'|'free'|'undisclosed'|'end-of-loan', amount?: {value, currency} } */
export function parseFee(cell) {
  const text = plain(cell).replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();
  let type = 'transfer';
  if (/end of loan|loan return|return from loan/.test(lower)) type = 'end-of-loan';
  else if (/loan/.test(lower)) type = 'loan';
  else if (/^free|free transfer/.test(lower)) type = 'free';
  else if (/undisclosed/.test(lower)) type = 'undisclosed';
  const m = /([£€$])\s?(\d+(?:\.\d+)?)\s*(m|million|k|bn)?/i.exec(text);
  let amount = null;
  if (m) {
    const mult = /k/i.test(m[3] || '') ? 1e3 : /bn/i.test(m[3] || '') ? 1e9 : 1e6;
    amount = { value: Math.round(Number(m[2]) * mult), currency: { '£': 'GBP', '€': 'EUR', $: 'USD' }[m[1]] };
    if (type === 'undisclosed') type = 'transfer';
  }
  return { text: text.slice(0, 60), type, amount };
}

/**
 * Rows of every wikitable with columns like Date | Player | Moving from | Moving to | Fee.
 * Handles rowspan'd date cells. Returns [{ date, player:{name,ref}, from:{title,text}, to:{title,text}, fee, urls }].
 */
export function parseTransferTables(text) {
  const out = [];
  for (const tm of text.matchAll(/\{\|[^\n]*wikitable[\s\S]*?\n\|\}/g)) {
    const table = tm[0];
    const head = (table.match(/^!.*$/gm) || []).map((h) => plain(h.replace(/^!+/, '')).toLowerCase());
    const col = (re) => head.findIndex((h) => re.test(h));
    const ci = { date: col(/date/), player: col(/player|name/), from: col(/from/), to: col(/to\b/), fee: col(/fee/) };
    if (ci.player < 0 || ci.from < 0 || ci.to < 0) continue;
    const loanTable = ci.fee < 0 && head.some((h) => /end date|until|return/.test(h));
    const rows = table.split(/\n\|-[^\n]*/).slice(1);
    let carryDate = null, carryLeft = 0;
    for (const r of rows) {
      const cells = [];
      const open = (c) => (c.match(/\{\{/g) || []).length - (c.match(/\}\}/g) || []).length + (c.match(/\[\[/g) || []).length - (c.match(/\]\]/g) || []).length;
      for (const line of r.split('\n')) {
        // a line inside an unfinished template/link (multi-line citations) belongs to the previous cell
        if (cells.length && open(cells[cells.length - 1]) > 0) { cells[cells.length - 1] += '\n' + line; continue; }
        if (!line.startsWith('|') || line.startsWith('|}')) { if (cells.length && !line.startsWith('!') && !line.startsWith('|}')) cells[cells.length - 1] += '\n' + line; continue; }
        cells.push(...splitCells(line.slice(1)));
      }
      if (!cells.length) continue;
      const cleanCell = (c) => { const parts = splitTop(c); return parts.length > 1 && /=/.test(parts[0]) && !/\[\[|\{\{/.test(parts[0]) ? parts.slice(1).join('|') : c; };
      let list = cells.map((c) => c);
      if (ci.date >= 0) {
        const rs = /rowspan\s*=\s*"?(\d+)/i.exec(list[0] || '');
        const looksDate = parseDate(cleanCell(list[0] || ''));
        if (list.length >= head.length && looksDate) { carryDate = looksDate; carryLeft = rs ? Number(rs[1]) - 1 : 0; }
        else if (list.length === head.length - 1) { list = [null, ...list]; if (carryLeft > 0) carryLeft--; }
        else if (list.length < head.length - 1) continue; // several spanned cells: too ambiguous, skip
      }
      const get = (i) => (i >= 0 && list[i] != null ? cleanCell(list[i]) : '');
      const date = ci.date >= 0 ? (parseDate(get(ci.date)) || carryDate) : null;
      const player = playerCell(get(ci.player));
      if (!player.name) continue;
      const club = (c) => { const l = firstLink(c.replace(/\{\{\s*flagg?[^}]*\}\}/gi, '')); return { title: l ? l.title : null, text: plain(c) }; };
      out.push({ date, player, from: club(get(ci.from)), to: club(get(ci.to)), fee: loanTable ? { text: 'Loan', type: 'loan', amount: null } : parseFee(get(ci.fee)), urls: citeUrls(r).slice(0, 3) });
    }
  }
  return out;
}

/**
 * Per-club "In:/Out:" squad-template lists (Spanish, German and French transfer-list articles):
 *   === [[Club]] ===  '''In:''' {{fs player|...|other=from [[X]]}}<ref>…date=…</ref>  '''Out:''' {{fs player|...|other=to [[Y]]}}
 * Returns the same row shape as parseTransferTables. Rows without a from/to club (released, retired) are skipped.
 */
export function parseInOutLists(text) {
  const out = [];
  const hs = [...text.matchAll(/^(={2,4})\s*(.+?)\s*\1\s*$/gm)].map((m) => ({ at: m.index, level: m[1].length, raw: m[2] }));
  // named references defined once and reused: <ref name="x">{{cite … date=…}}</ref>
  const refDate = new Map(), refUrl = new Map();
  for (const m of text.matchAll(/<ref\s+name\s*=\s*"?([^">\/]+?)"?\s*>([\s\S]*?)<\/ref>/gi)) {
    const d = /\|\s*date\s*=\s*([^|}]+)/i.exec(m[2]); if (d) refDate.set(m[1].trim(), parseDate(d[1]));
    const u = citeUrls(m[2]); if (u.length) refUrl.set(m[1].trim(), u[0]);
  }
  for (const { body, at } of findTemplates(text, /^(fs player|football squad player)$/i)) {
    const h = [...hs].reverse().find((x) => x.at < at && x.level >= 3);
    if (!h) continue;
    const clubLink = firstLink(h.raw) || { title: plain(h.raw), text: plain(h.raw) };
    const { named } = params(body);
    const other = named.other || '';
    const first = plain(other).split(',')[0].trim().toLowerCase();
    // loan returns, releases, retirements are not transfers
    if (!first || /loan return|end of loan|returned|retired|released|free agent|terminated|fired|promoted|recalled/.test(first)) continue;
    const m = /^\s*(on (?:a )?(?:season-long )?loan from|on (?:a )?(?:season-long )?loan to|from|to)\s+(?:\{\{[^}]*\}\}\s*)?(\[\[[^\]]+\]\]|[^,;]+)/i.exec(other);
    if (!m) continue;
    const party = firstLink(m[2]) || { title: null, text: plain(m[2]) };
    const isLoan = /loan/i.test(m[1]);
    const dirIn = /from$/i.test(m[1]);
    const end = text.indexOf('\n', at);
    const tail = text.slice(at, end > 0 ? end : at + 2000);
    const dm = /\|\s*date\s*=\s*([^|}]+)/i.exec(tail);
    const rn = /<ref\s+name\s*=\s*"?([^">\/]+?)"?\s*\/?>/i.exec(tail);
    const link = firstLink(named.name || '');
    const urls = citeUrls(tail);
    if (!urls.length && rn && refUrl.get(rn[1].trim())) urls.push(refUrl.get(rn[1].trim()));
    out.push({
      date: (dm && parseDate(dm[1])) || (rn && refDate.get(rn[1].trim())) || null,
      player: { name: plain(named.name || ''), ref: link ? link.title : null },
      from: dirIn ? party : clubLink, to: dirIn ? clubLink : party,
      fee: { text: isLoan ? 'Loan' : 'Undisclosed', type: isLoan ? 'loan' : 'undisclosed', amount: null },
      urls: urls.slice(0, 3),
    });
  }
  return out;
}
