export type MatchFormat = 'BEST_OF_3' | 'SINGLE_GAME_21';

export const FORMAT_WEIGHTS: Record<MatchFormat, number> = {
  BEST_OF_3: 1.0,
  SINGLE_GAME_21: 0.7,
};

export interface PlayerRatingInput {
  rating: number;
  ratedMatches: number;
}

export interface MatchOutcome {
  teamA: PlayerRatingInput[];
  teamB: PlayerRatingInput[];
  winner: 'A' | 'B';
  format: MatchFormat;
  previousMeetingsWithin7d: number;
}

export interface PlayerDelta {
  rating: number;
  kFactor: number;
  delta: number;
  ratingAfter: number;
}

export interface EloResult {
  deltas: Record<'a1' | 'a2' | 'b1' | 'b2', PlayerDelta>;
  formatWeight: number;
  repeatedOpponentWeight: number;
  expectedA: number;
  algorithmVersion: string;
}

const ALGO_VERSION = 'elo.doubles.v1';

export function kFactorFor(ratedMatches: number): number {
  if (ratedMatches <= 5) return 64;
  if (ratedMatches <= 10) return 48;
  if (ratedMatches <= 30) return 32;
  return 24;
}

export function repeatedOpponentWeight(previousMeetings: number): number {
  if (previousMeetings <= 2) return 1.0;
  if (previousMeetings === 3) return 0.75;
  if (previousMeetings === 4) return 0.5;
  return 0.2;
}

/** round half away from zero: 11.5 -> 12, -11.5 -> -12 */
export function halfUpAwayFromZero(value: number): number {
  if (value >= 0) return Math.floor(value + 0.5);
  return Math.ceil(value - 0.5);
}

/**
 * MVP Elo for doubles (§11.2).
 * TeamRating = average of the two members. Delta per player uses their OWN K-factor,
 * so team deltas are not necessarily zero-sum.
 */
export function computeEloDelta(outcome: MatchOutcome): EloResult {
  const teamARating = (outcome.teamA[0].rating + outcome.teamA[1].rating) / 2;
  const teamBRating = (outcome.teamB[0].rating + outcome.teamB[1].rating) / 2;

  const expectedA = 1 / (1 + Math.pow(10, (teamBRating - teamARating) / 400));
  const expectedB = 1 - expectedA;

  const formatWeight = FORMAT_WEIGHTS[outcome.format];
  const repeatedWeight = repeatedOpponentWeight(outcome.previousMeetingsWithin7d);

  const actualA = outcome.winner === 'A' ? 1 : 0;
  const actualB = outcome.winner === 'B' ? 1 : 0;

  const compute = (p: PlayerRatingInput, actual: number, expected: number): PlayerDelta => {
    const k = kFactorFor(p.ratedMatches);
    const base = k * (actual - expected);
    const delta = halfUpAwayFromZero(base * formatWeight * repeatedWeight);
    return { rating: p.rating, kFactor: k, delta, ratingAfter: p.rating + delta };
  };

  return {
    deltas: {
      a1: compute(outcome.teamA[0], actualA, expectedA),
      a2: compute(outcome.teamA[1], actualA, expectedA),
      b1: compute(outcome.teamB[0], actualB, expectedB),
      b2: compute(outcome.teamB[1], actualB, expectedB),
    },
    formatWeight,
    repeatedOpponentWeight: repeatedWeight,
    expectedA,
    algorithmVersion: ALGO_VERSION,
  };
}
