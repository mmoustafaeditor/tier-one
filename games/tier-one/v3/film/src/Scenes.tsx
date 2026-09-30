// The game's scenes as compositions: the same components the game plays, plus their sound.
import { ColdOpen, COLD_OPEN, COLD_OPEN_CAREER, type ColdOpenProps } from '../../web/src/film/scenes/ColdOpen';
import { SourceIntro, sourceIntroMeta, type SourceIntroProps } from '../../web/src/film/scenes/SourceIntro';
import { SeasonOpener, SEASON_OPENER, type SeasonOpenerProps } from '../../web/src/film/scenes/SeasonOpener';
import { HereWeGo, HERE_WE_GO, type HereWeGoProps } from '../../web/src/film/scenes/HereWeGo';
import { Film } from './Film';

export const ColdOpenFilm = (p: ColdOpenProps) => <Film cues={(p.cut === 'career' ? COLD_OPEN_CAREER : COLD_OPEN).cues}><ColdOpen {...p} /></Film>;
export const SourceIntroFilm = (p: SourceIntroProps) => <Film cues={sourceIntroMeta(p.src).cues}><SourceIntro {...p} /></Film>;
export const SeasonOpenerFilm = (p: SeasonOpenerProps) => <Film cues={SEASON_OPENER.cues}><SeasonOpener {...p} /></Film>;
export const HereWeGoFilm = (p: HereWeGoProps) => <Film cues={HERE_WE_GO.cues}><HereWeGo {...p} /></Film>;
