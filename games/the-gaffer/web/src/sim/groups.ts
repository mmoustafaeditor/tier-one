import type { Position } from '../model/types';
// Position groups: 0 goalkeepers, 1 defenders, 2 midfielders, 3 attackers.
export const GROUP_OF: Record<Position, number> = { GK: 0, CB: 1, LB: 1, RB: 1, CDM: 2, CM: 2, CAM: 2, LW: 3, RW: 3, ST: 3 };
