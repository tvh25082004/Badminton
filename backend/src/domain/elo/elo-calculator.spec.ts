import {
  kFactorFor,
  repeatedOpponentWeight,
  halfUpAwayFromZero,
  computeEloDelta,
  FORMAT_WEIGHTS,
} from './elo-calculator';

describe('Elo calculator (Requirement §11.2)', () => {
  describe('kFactorFor', () => {
    it('uses 64 for 0–5 matches, 48 for 6–10, 32 for 11–30, 24 after 30', () => {
      expect(kFactorFor(0)).toBe(64);
      expect(kFactorFor(5)).toBe(64);
      expect(kFactorFor(6)).toBe(48);
      expect(kFactorFor(10)).toBe(48);
      expect(kFactorFor(11)).toBe(32);
      expect(kFactorFor(30)).toBe(32);
      expect(kFactorFor(31)).toBe(24);
      expect(kFactorFor(100)).toBe(24);
    });
  });

  describe('halfUpAwayFromZero', () => {
    it('rounds 11.5 → 12 and -11.5 → -12', () => {
      expect(halfUpAwayFromZero(11.5)).toBe(12);
      expect(halfUpAwayFromZero(-11.5)).toBe(-12);
      expect(halfUpAwayFromZero(11.49)).toBe(11);
      expect(halfUpAwayFromZero(-11.49)).toBe(-11);
      expect(halfUpAwayFromZero(12)).toBe(12);
      expect(halfUpAwayFromZero(0)).toBe(0);
    });
  });

  describe('repeatedOpponentWeight', () => {
    it('1–2 → 1.0, 3 → 0.75, 4 → 0.50, ≥5 → 0.20', () => {
      expect(repeatedOpponentWeight(1)).toBe(1.0);
      expect(repeatedOpponentWeight(2)).toBe(1.0);
      expect(repeatedOpponentWeight(3)).toBe(0.75);
      expect(repeatedOpponentWeight(4)).toBe(0.5);
      expect(repeatedOpponentWeight(5)).toBe(0.2);
      expect(repeatedOpponentWeight(9)).toBe(0.2);
    });
  });

  describe('FORMAT_WEIGHTS', () => {
    it('BEST_OF_3 = 1.0, SINGLE_GAME_21 = 0.7', () => {
      expect(FORMAT_WEIGHTS.BEST_OF_3).toBe(1.0);
      expect(FORMAT_WEIGHTS.SINGLE_GAME_21).toBe(0.7);
    });
  });

  describe('computeEloDelta', () => {
    it('equal ratings → winner gains, loser loses by K factor', () => {
      const result = computeEloDelta({
        teamA: [
          { rating: 1200, ratedMatches: 0 },
          { rating: 1200, ratedMatches: 0 },
        ],
        teamB: [
          { rating: 1200, ratedMatches: 0 },
          { rating: 1200, ratedMatches: 0 },
        ],
        winner: 'A',
        format: 'BEST_OF_3',
        previousMeetingsWithin7d: 0,
      });
      expect(result.expectedA).toBeCloseTo(0.5, 5);
      expect(result.deltas.a1.delta).toBe(32); // 64 * (1 - 0.5) = 32
      expect(result.deltas.a2.delta).toBe(32);
      expect(result.deltas.b1.delta).toBe(-32);
      expect(result.deltas.b2.delta).toBe(-32);
    });

    it('applies SINGLE_GAME_21 weight 0.7: 64 * 0.5 * 0.7 = 22.4 → 22', () => {
      const result = computeEloDelta({
        teamA: [
          { rating: 1200, ratedMatches: 0 },
          { rating: 1200, ratedMatches: 0 },
        ],
        teamB: [
          { rating: 1200, ratedMatches: 0 },
          { rating: 1200, ratedMatches: 0 },
        ],
        winner: 'A',
        format: 'SINGLE_GAME_21',
        previousMeetingsWithin7d: 0,
      });
      expect(result.deltas.a1.delta).toBe(22);
      expect(result.deltas.b1.delta).toBe(-22);
    });

    it('applies repeated opponent weight: 64 * 0.5 * 0.2 = 6.4 → 6', () => {
      const result = computeEloDelta({
        teamA: [
          { rating: 1200, ratedMatches: 0 },
          { rating: 1200, ratedMatches: 0 },
        ],
        teamB: [
          { rating: 1200, ratedMatches: 0 },
          { rating: 1200, ratedMatches: 0 },
        ],
        winner: 'A',
        format: 'BEST_OF_3',
        previousMeetingsWithin7d: 5,
      });
      expect(result.repeatedOpponentWeight).toBe(0.2);
      expect(result.deltas.a1.delta).toBe(6);
    });

    it('underdog win: A (1000) beats B (1500) → A gains, B loses, expectedA < 0.5', () => {
      const result = computeEloDelta({
        teamA: [
          { rating: 1000, ratedMatches: 0 },
          { rating: 1000, ratedMatches: 0 },
        ],
        teamB: [
          { rating: 1500, ratedMatches: 0 },
          { rating: 1500, ratedMatches: 0 },
        ],
        winner: 'A',
        format: 'BEST_OF_3',
        previousMeetingsWithin7d: 0,
      });
      expect(result.expectedA).toBeLessThan(0.5);
      expect(result.deltas.a1.delta).toBe(61); // 64 * (1 - 0.0532) ≈ 60.6 → 61
      expect(result.deltas.b1.delta).toBe(-61);
      expect(result.deltas.a1.delta).toBeGreaterThan(0);
      expect(result.deltas.b1.delta).toBeLessThan(0);
    });

    it('sum of deltas is not necessarily zero when K factors differ', () => {
      const result = computeEloDelta({
        teamA: [
          { rating: 1200, ratedMatches: 0 },
          { rating: 1200, ratedMatches: 20 },
        ],
        teamB: [
          { rating: 1200, ratedMatches: 0 },
          { rating: 1200, ratedMatches: 40 },
        ],
        winner: 'A',
        format: 'BEST_OF_3',
        previousMeetingsWithin7d: 0,
      });
      const sum = Object.values(result.deltas).reduce((a, d) => a + d.delta, 0);
      expect(sum).not.toBe(0);
    });
  });
});
