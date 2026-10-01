// 3.x "One Byline" routes. 4.0 has no Feed or Rivals screen: the tray carries the real events, the accounts and
// bosses live in Lens › Profile, and the contacts are the DMs app. App.tsx maps { n: 'feed' } to Blurt and
// { n: 'rivals' } to Lens; this module keeps the DMs alias and the nav hook for older links.
export { setNav } from '../ui/connect';
export { DMsScreen as ContactsScreen } from './DMs';
