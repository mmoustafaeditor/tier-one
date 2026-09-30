// Compositions: every game scene in portrait (1080×1920) and landscape (1920×1080), the launch trailer and the
// HERE WE GO share clip. The scene components are the game's own files (../web/src/film/scenes).
import { Composition, Folder } from 'remotion';
import { ColdOpenFilm, HereWeGoFilm, SeasonOpenerFilm, SourceIntroFilm } from './Scenes';
import { Trailer } from './Trailer';

export const RemotionRoot = () => <>
  <Composition id="Trailer" component={Trailer} width={1080} height={1920} fps={30} durationInFrames={750} />
  <Composition id="HereWeGoClip" component={HereWeGoFilm} width={1080} height={1920} fps={30} durationInFrames={180}
    defaultProps={{ byline: 'Sam Carter', handle: '@samcarter', player: 'Rafa Leão', club: 'Real Madrid', clubColor: '#1B458F', date: '31 Dec 2026', post: 'Rafa Leão to Real Madrid. Contracts signed, medical done.', hwg: 'HERE WE GO!', called: 'Called it first', tag: 'Tier One', rtl: false }} />
  <Folder name="Portrait">
    <Composition id="ColdOpen" component={ColdOpenFilm} width={1080} height={1920} fps={30} durationInFrames={300}
      defaultProps={{ byline: 'Sam Carter', byLabel: 'By Sam Carter', paper: 'Tier One', edition: 'The Transfer Edition', memo: 'From the editor’s desk', note: 'Desk’s yours from tonight. Five people will call you with tips. Believe two of them.', sign: '— The Editor', headline: 'Sam Carter joins the transfer desk', dateline: 'Wed 30 Sep 2026', sources: ['The kit man', 'The barber', 'The agent', 'The airport spotter', 'The physio'], stamp: 'TIER ONE', cut: 'full' as const, rtl: false }} />
    <Composition id="ColdOpenCareer" component={ColdOpenFilm} width={1080} height={1920} fps={30} durationInFrames={144}
      defaultProps={{ byline: 'Sam Carter', byLabel: 'By Sam Carter', paper: 'Sam’s Blog', edition: 'Night desk', memo: 'From the editor’s desk', note: 'New paper, same rules. Get it right before anyone else does.', sign: '— The Editor', headline: 'Sam’s Blog opens for business', dateline: 'Wed 30 Sep 2026', sources: ['The kit man', 'The barber', 'The agent', 'The airport spotter', 'The physio'], stamp: 'TIER ONE', cut: 'career' as const, rtl: false }} />
    <Composition id="SourceIntro" component={SourceIntroFilm} width={1080} height={1920} fps={30} durationInFrames={180}
      defaultProps={{ src: 'spotter' as const, name: 'The airport spotter', trait: 'Lives at arrivals. Never wrong about a private jet.', line: '“Tail number checks out. Landed eight minutes ago.”', calling: 'Incoming call', unknown: 'Unknown number', rtl: false }} />
    <Composition id="SourceIntroArabic" component={SourceIntroFilm} width={1080} height={1920} fps={30} durationInFrames={180}
      defaultProps={{ src: 'barber' as const, name: 'الحلاق', trait: 'بيسمع كل اللي الشارع بيسمعه. وبيعيد أغلبه.', line: '«اللي على الكرسي تلاتة حالف إنه هيمضي، واللي على أربعة حالف إنه لأ.»', calling: 'مكالمة جاية', unknown: 'رقم مش متسجّل', rtl: true }} />
    <Composition id="SeasonOpener" component={SeasonOpenerFilm} width={1080} height={1920} fps={30} durationInFrames={180}
      defaultProps={{ title: 'The Rumour Mill', kicker: 'New season', dates: '2 Sep – 31 Dec 2026', accent: '#FF9A1F', clippings: ['Striker spotted at the airport', 'Agent flies in for talks', 'Medical booked for Monday', 'Barber says the fee is agreed', 'New shirt number printed', 'Club denies everything'], rtl: false }} />
  </Folder>
  <Folder name="Landscape">
    <Composition id="ColdOpenWide" component={ColdOpenFilm} width={1920} height={1080} fps={30} durationInFrames={300}
      defaultProps={{ byline: 'Sam Carter', byLabel: 'By Sam Carter', paper: 'Tier One', edition: 'The Transfer Edition', memo: 'From the editor’s desk', note: 'Desk’s yours from tonight. Five people will call you with tips. Believe two of them.', sign: '— The Editor', headline: 'Sam Carter joins the transfer desk', dateline: 'Wed 30 Sep 2026', sources: ['The kit man', 'The barber', 'The agent', 'The airport spotter', 'The physio'], stamp: 'TIER ONE', cut: 'full' as const, rtl: false }} />
    <Composition id="SourceIntroWide" component={SourceIntroFilm} width={1920} height={1080} fps={30} durationInFrames={180}
      defaultProps={{ src: 'physio' as const, name: 'The physio', trait: 'Sees the medicals. Says less than she knows.', line: '“Knee’s fine. Heart’s fine. The paperwork’s the problem.”', calling: 'Incoming call', unknown: 'Unknown number', rtl: false }} />
    <Composition id="SeasonOpenerWide" component={SeasonOpenerFilm} width={1920} height={1080} fps={30} durationInFrames={180}
      defaultProps={{ title: 'The Rumour Mill', kicker: 'New season', dates: '2 Sep – 31 Dec 2026', accent: '#FF9A1F', clippings: ['Striker spotted at the airport', 'Agent flies in for talks', 'Medical booked for Monday', 'Barber says the fee is agreed', 'New shirt number printed', 'Club denies everything'], rtl: false }} />
  </Folder>
</>;
