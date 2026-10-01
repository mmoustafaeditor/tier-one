// 4.1 cut the DMs/contacts page (UI41 §Cut): sources live on the player screen. This module keeps the nav hook App uses
// and a ContactsScreen that only sends an old link to today's Daily Challenge, until the shell drops the route.
import { useEffect } from 'react';
import type { Chrome } from '../App';
export { setNav } from '../ui/connect';

export function ContactsScreen(chrome: Chrome) {
  useEffect(() => { chrome.go({ n: 'daily' }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
