// Delegation (V2_DESIGN §2.5): seven departments, three levels each, and staff who can be wrong in a readable way.
import type { Bias, Career, Dept, DeptLevel, Duty, Staff, StaffRole } from '../model/types';
import { hash32 } from './rng';

export const DEPTS: Dept[] = ['matchprep', 'opposition', 'fitness', 'development', 'recruitment', 'contracts', 'commercial'];

// The old thirteen duties, grouped so the choice means something.
export const DEPT_DUTIES: Record<Dept, Duty[]> = {
  matchprep: ['lineup', 'tactics'],
  opposition: ['scouting'],
  fitness: ['training', 'medical'],
  development: ['academy', 'morale'],
  recruitment: ['signing', 'loans'],
  contracts: ['contracts', 'selling'],
  commercial: ['sponsors', 'tickets'],
};
export const DEPT_OF_DUTY = Object.fromEntries(Object.entries(DEPT_DUTIES).flatMap(([d, ds]) => ds.map((x) => [x, d]))) as Record<Duty, Dept>;

// Who runs each department.
export const DEPT_ROLE: Record<Dept, StaffRole> = {
  matchprep: 'assistant', opposition: 'scout', fitness: 'fitness', development: 'psychologist', recruitment: 'director', contracts: 'director', commercial: 'director',
};
export const DUTY_ROLE: Record<Duty, StaffRole> = {
  lineup: 'assistant', tactics: 'assistant', scouting: 'scout', training: 'fitness', medical: 'doctor', morale: 'psychologist',
  academy: 'scout', contracts: 'director', selling: 'director', signing: 'director', loans: 'director', sponsors: 'director', tickets: 'director',
};

// A new career: the money decisions wait for you, the rest runs itself.
export const DEFAULT_LEVEL: Record<Dept, DeptLevel> = {
  matchprep: 'staff', opposition: 'staff', fitness: 'staff', development: 'staff', recruitment: 'ask', contracts: 'ask', commercial: 'staff',
};

export const levelOf = (c: Career, d: Dept): DeptLevel => c.dept?.[d] ?? DEFAULT_LEVEL[d];
export const hasStaffFor = (c: Career, d: Duty) => !!c.ops?.staff[DUTY_ROLE[d]];
// The duty runs itself (staff act and log).
export const delegated = (c: Career, d: Duty) => levelOf(c, DEPT_OF_DUTY[d]) === 'staff' && hasStaffFor(c, d);
// The staff prepare it and wait for a yes.
export const asking = (c: Career, d: Duty) => levelOf(c, DEPT_OF_DUTY[d]) === 'ask' && hasStaffFor(c, d);

// Old careers had one on/off switch per duty: any duty of a department switched on hands that department to the staff.
export function deptsFromDuties(delegate: Partial<Record<Duty, boolean>> | undefined): Record<Dept, DeptLevel> {
  return Object.fromEntries(DEPTS.map((d) => [d, DEPT_DUTIES[d].some((x) => delegate?.[x]) ? 'staff' : 'me'])) as Record<Dept, DeptLevel>;
}

// Every member of staff has one bias. It is fixed by who they are (their id), so old saves get one without a migration.
export const BIASES: Bias[] = ['cautious', 'bold', 'youth', 'veteran', 'money', 'loyal'];
export const biasOf = (s: Staff | undefined): Bias | null => (s ? s.bias ?? BIASES[hash32(s.id) % BIASES.length] : null);
export const staffOf = (c: Career, role: StaffRole) => c.ops?.staff[role];
