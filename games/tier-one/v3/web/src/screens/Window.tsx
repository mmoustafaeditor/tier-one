// The window route (App.tsx mounts it for daily / room / play): every window is played in Blurt now (CONCEPT4.md §2).
// Kept as the route's entry point so App's lazy import stays; the screen is screens/Blurt.tsx on the 4.0 driver.
import type { Driver4 } from '../lib/driver';
import type { Chrome } from '../App';
import { BlurtScreen } from './Blurt';

export function WindowScreen({ driver, ...chrome }: { driver: Driver4 } & Chrome) {
  return <BlurtScreen driver={driver} {...chrome} />;
}
