// Hand corrections to Wire settlement (DESIGN §16.1). Edit the object below.
export default {
  "_readme": "Hand corrections to Wire settlement (DESIGN.md §4.5, §16.1). Key = rumour id from data/seed/rumours.json. outcome: moved | stayed | void. clubId: destination club id, or \"other\" for a club not linked. fee: u20 | 20-50 | 50-80 | 80+ | free. at: ISO date the news was first reported (drives the late-wire rule and the lead bonus). Entries here win over the automatic settlement from the snapshot.",
  "_example": { "outcome": "moved", "clubId": "eng-chelsea", "fee": "50-80", "at": "2027-01-20" }
};
