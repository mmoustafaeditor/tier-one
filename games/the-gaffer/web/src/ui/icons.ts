// The Gaffer's own line icons, drawn to match the shared Semba set (24px grid, 2px round strokes, currentColor).
const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  transfers: svg('<path d="M4 8h13"/><path d="m14 4 4 4-4 4"/><path d="M20 16H7"/><path d="m10 12-4 4 4 4"/>'),
  club: svg('<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="M9 12h6"/><path d="M12 9v6"/>'),
  tactics: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="9" cy="9" r="1.5"/><circle cx="15" cy="15" r="1.5"/><path d="m10.5 10.5 3 3"/><path d="M15 7l2 2m0-2-2 2"/>'),
  training: svg('<path d="M6 8v8"/><path d="M18 8v8"/><path d="M3 10v4"/><path d="M21 10v4"/><path d="M6 12h12"/>'),
  medical: svg('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8"/><path d="M8 12h8"/>'),
  academy: svg('<path d="M12 21v-9"/><path d="M12 12c0-4 3-7 7-7 0 4-3 7-7 7z"/><path d="M12 14c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z"/>'),
  staff: svg('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4a3 3 0 0 1 0 6"/><path d="M18 14c2 .7 3 2.8 3 6"/>'),
  history: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M9 7h6"/><path d="M9 11h6"/>'),
  money: svg('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M7 9v6"/><path d="M17 9v6"/>'),
  sponsor: svg('<path d="M4 7h16v10H4z"/><path d="M8 11h8"/><path d="M8 14h5"/><path d="M12 3v4"/>'),
  stadium: svg('<ellipse cx="12" cy="8" rx="9" ry="3"/><path d="M3 8v7c0 1.7 4 3 9 3s9-1.3 9-3V8"/><path d="M8 11v7"/><path d="M16 11v7"/>'),
  board: svg('<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>'),
  whistle: svg('<circle cx="9" cy="14" r="5"/><path d="M13 11h8v4h-5"/><path d="M9 4v3"/><path d="M5.5 5.5 7 7"/>'),
  calendar: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>'),
  loan: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>'),
  shirt: svg('<path d="M8 3 4 5 2 10l3 1v10h14V11l3-1-2-5-4-2c0 1.7-1.3 3-3 3s-3-1.3-3-3z"/>'),
  ball: svg('<circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 4.5h-5L8 10z"/><path d="M12 3v4"/><path d="m21 10-5 0"/><path d="m3 10 5 0"/><path d="m7 20 2-5.5"/><path d="m17 20-2-5.5"/>'),
  heart: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  alert: svg('<path d="M12 3 2 20h20z"/><path d="M12 10v4"/><path d="M12 17h.01"/>'),
  chevron: svg('<path d="m9 6 6 6-6 6"/>'),
};
