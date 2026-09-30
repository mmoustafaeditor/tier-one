// The ~25 s portrait launch trailer: a cold line, a contact calls, the first night at the paper, the rumour mill,
// the HERE WE GO payoff, and the end card. Each shot is its own node (editable in Studio); the inner negative `from`
// trims the head of a scene so the trailer cuts in on the action.
import { Sequence, useVideoConfig } from 'remotion';
import { ColdOpenFilm, HereWeGoFilm, SeasonOpenerFilm, SourceIntroFilm } from './Scenes';
import { EndCard, OpeningLine } from './Cards';

export const Trailer = () => {
  const { fps } = useVideoConfig();
  return <>
    <Sequence name="Opening line" durationInFrames={60} premountFor={fps}>
      <OpeningLine line="Every transfer starts as a whisper." />
    </Sequence>
    <Sequence name="A contact calls" from={60} durationInFrames={120} premountFor={fps}>
      <Sequence from={-30} layout="none">
        <SourceIntroFilm src="barber" name="The barber" trait="Hears everything the street hears. Repeats most of it." line="“Chair three swears he’s signing. Chair four swears he isn’t.”" calling="Incoming call" unknown="Unknown number" />
      </Sequence>
    </Sequence>
    <Sequence name="First night at the paper" from={180} durationInFrames={240} premountFor={fps}>
      <Sequence from={-60} layout="none">
        <ColdOpenFilm byline="Sam Carter" byLabel="By Sam Carter" paper="Tier One" edition="The Transfer Edition" memo="From the editor’s desk" note="Desk’s yours from tonight. Five people will call you with tips. Believe two of them." sign="— The Editor" headline="Sam Carter joins the transfer desk" dateline="Wed 30 Sep 2026" sources={['The kit man', 'The barber', 'The agent', 'The airport spotter', 'The physio']} stamp="TIER ONE" cut="full" />
      </Sequence>
    </Sequence>
    <Sequence name="The rumour mill" from={420} durationInFrames={120} premountFor={fps}>
      <Sequence from={-60} layout="none">
        <SeasonOpenerFilm title="The Rumour Mill" kicker="New season" dates="2 Sep – 31 Dec 2026" accent="#FF9A1F" clippings={['Striker spotted at the airport', 'Agent flies in for talks', 'Medical booked for Monday', 'Barber says the fee is agreed', 'New shirt number printed', 'Club denies everything']} />
      </Sequence>
    </Sequence>
    <Sequence name="Here we go" from={540} durationInFrames={140} premountFor={fps}>
      <Sequence from={-20} layout="none">
        <HereWeGoFilm byline="Sam Carter" handle="@samcarter" player="Rafa Leão" club="Real Madrid" clubColor="#1B458F" date="31 Dec" post="Rafa Leão to Real Madrid. Contracts signed, medical done." hwg="HERE WE GO!" called="Called it first" tag="Tier One" />
      </Sequence>
    </Sequence>
    <Sequence name="End card" from={680} durationInFrames={70} premountFor={fps}>
      <EndCard title="Tier One." cta="Play free at" url="sembagames.app/tier-one" />
    </Sequence>
  </>;
};
