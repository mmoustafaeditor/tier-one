// Hand corrections to Wire settlement (DESIGN §16.1). Edit the object below.
// How stale rumours resolve without an entry here (wire.mjs › rumourState):
// - a transfer on record from the rumour's club since it was first seen → settles MOVED (automatic);
// - `status: "dead"` in the snapshot → settles NO on its lastSeen date;
// - window closed (calendar.mjs, per league when configured) + settleGraceH (72 h) with no move → settles NO;
// - a rumour that has left the snapshot (a refresh dropped it) → VOID once its window closes (stake back).
// Summer 2026 (window closed 1 Sep 2026): the 29 Sep 2026 snapshot carries no 2026-summer rumours; every summer saga
// that is still alive was re-filed for Winter 2027 (e.g. Lamine Camara, Folarin Balogun, whose deadline-day moves
// collapsed). Old 2026-summer calls settle by the rules above. Add an entry only when the automatic result is wrong.
export default {
  "_readme": "Hand corrections to Wire settlement (DESIGN.md §4.5, §16.1). Key = rumour id from data/seed/rumours.json. outcome: moved | stayed | void. clubId: destination club id, or \"other\" for a club not linked. fee: u20 | 20-50 | 50-80 | 80+ | free. at: ISO date the news was first reported (drives the late-wire rule and the lead bonus). Entries here win over the automatic settlement from the snapshot.",
  "_example": { "outcome": "moved", "clubId": "eng-chelsea", "fee": "50-80", "at": "2027-01-20" }
};
