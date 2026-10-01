// Navigation copy added by the UI/UX pass (audit-the-gaffer/THE_GAFFER_INFORMATION_ARCHITECTURE.md). English is the
// reference; lang-nav-{ar,es,fr}.ts are type-checked against it.
export const NV_EN = {
  squadAreas: 'Squad areas',
  players: 'Players', room: 'Dressing room', training: 'Training', medical: 'Medical', academy: 'Academy',
  news: 'Inbox & news', settings: 'Settings',
  inboxLine: (n: number): string => (n ? `${n} new in your inbox` : 'Inbox & news'),
};
export type NVStrings = typeof NV_EN;
