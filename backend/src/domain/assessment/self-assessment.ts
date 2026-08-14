export const RUBRIC_SCHEMA_VERSION = '2026.08.2';

export type Band =
  | 'NEWCOMER'
  | 'BEGINNER'
  | 'INTERMEDIATE'
  | 'INTERMEDIATE_PLUS'
  | 'ADVANCED'
  | 'COMPETITIVE';

export type QuestionId =
  | 'experience_years'
  | 'weekly_frequency'
  | 'clear_skill'
  | 'smash_skill'
  | 'net_skill'
  | 'defense_skill'
  | 'footwork_skill'
  | 'doubles_rotation'
  | 'competition_experience'
  | 'self_level';

export interface QuestionDef {
  id: QuestionId;
  scored: boolean;
  validValues: string[];
  points: Record<string, number>;
}

export const QUESTIONS: QuestionDef[] = [
  {
    id: 'experience_years',
    scored: true,
    validValues: ['LT_6M', 'M6_TO_1Y', 'Y1_TO_3Y', 'Y3_TO_5Y', 'GT_5Y'],
    points: { LT_6M: 0, M6_TO_1Y: 1, Y1_TO_3Y: 2, Y3_TO_5Y: 3, GT_5Y: 4 },
  },
  {
    id: 'weekly_frequency',
    scored: true,
    validValues: ['LT_1', 'ONE', 'TWO_TO_THREE', 'FOUR_PLUS'],
    points: { LT_1: 0, ONE: 1, TWO_TO_THREE: 2, FOUR_PLUS: 3 },
  },
  {
    id: 'clear_skill',
    scored: true,
    validValues: ['NOT_YET', 'BASIC', 'CONSISTENT', 'RELIABLE_UNDER_PRESSURE'],
    points: { NOT_YET: 0, BASIC: 1, CONSISTENT: 2, RELIABLE_UNDER_PRESSURE: 3 },
  },
  {
    id: 'smash_skill',
    scored: true,
    validValues: ['NOT_YET', 'BASIC', 'CONSISTENT', 'RELIABLE_UNDER_PRESSURE'],
    points: { NOT_YET: 0, BASIC: 1, CONSISTENT: 2, RELIABLE_UNDER_PRESSURE: 3 },
  },
  {
    id: 'net_skill',
    scored: true,
    validValues: ['NOT_YET', 'BASIC', 'CONSISTENT', 'RELIABLE_UNDER_PRESSURE'],
    points: { NOT_YET: 0, BASIC: 1, CONSISTENT: 2, RELIABLE_UNDER_PRESSURE: 3 },
  },
  {
    id: 'defense_skill',
    scored: true,
    validValues: ['NOT_YET', 'BASIC', 'CONSISTENT', 'RELIABLE_UNDER_PRESSURE'],
    points: { NOT_YET: 0, BASIC: 1, CONSISTENT: 2, RELIABLE_UNDER_PRESSURE: 3 },
  },
  {
    id: 'footwork_skill',
    scored: true,
    validValues: ['NOT_YET', 'BASIC', 'CONSISTENT', 'RELIABLE_UNDER_PRESSURE'],
    points: { NOT_YET: 0, BASIC: 1, CONSISTENT: 2, RELIABLE_UNDER_PRESSURE: 3 },
  },
  {
    id: 'doubles_rotation',
    scored: true,
    validValues: ['NOT_YET', 'BASIC', 'CONSISTENT', 'RELIABLE_UNDER_PRESSURE'],
    points: { NOT_YET: 0, BASIC: 1, CONSISTENT: 2, RELIABLE_UNDER_PRESSURE: 3 },
  },
  {
    id: 'competition_experience',
    scored: true,
    validValues: [
      'NONE',
      'CLUB_PRACTICE',
      'RECREATIONAL_TOURNAMENT',
      'CLUB_TOURNAMENT_OR_HIGHER',
    ],
    points: { NONE: 0, CLUB_PRACTICE: 1, RECREATIONAL_TOURNAMENT: 2, CLUB_TOURNAMENT_OR_HIGHER: 3 },
  },
  {
    id: 'self_level',
    scored: false,
    validValues: ['NEWCOMER', 'BEGINNER', 'INTERMEDIATE', 'INTERMEDIATE_PLUS', 'ADVANCED', 'COMPETITIVE'],
    points: {},
  },
];

const QUESTION_MAP = new Map<QuestionId, QuestionDef>(
  QUESTIONS.map((q) => [q.id, q]),
);

const BAND_ORDER: Band[] = [
  'NEWCOMER',
  'BEGINNER',
  'INTERMEDIATE',
  'INTERMEDIATE_PLUS',
  'ADVANCED',
  'COMPETITIVE',
];

const BAND_RATINGS: Array<{ max: number; band: Band; rating: number }> = [
  { max: 3, band: 'NEWCOMER', rating: 900 },
  { max: 7, band: 'BEGINNER', rating: 1050 },
  { max: 12, band: 'INTERMEDIATE', rating: 1200 },
  { max: 17, band: 'INTERMEDIATE_PLUS', rating: 1300 },
  { max: 22, band: 'ADVANCED', rating: 1400 },
  { max: 25, band: 'COMPETITIVE', rating: 1500 },
  { max: 28, band: 'COMPETITIVE', rating: 1600 },
];

export interface AssessmentAnswer {
  questionId: string;
  value: string;
}

export interface AssessmentResult {
  schemaVersion: string;
  totalScore: number;
  band: Band;
  rating: number;
  selfLevelBand: Band | null;
  consistency: 'OK' | 'REJECT';
}

export type AssessmentError = 'INVALID_SCHEMA' | 'MISSING_QUESTION' | 'UNKNOWN_QUESTION' | 'DUPLICATE_QUESTION' | 'INVALID_VALUE' | 'INCONSISTENT';

export class AssessmentRejected extends Error {
  constructor(readonly reason: AssessmentError) {
    super(`Assessment rejected: ${reason}`);
  }
}

export function evaluateAssessment(
  schemaVersion: string,
  answers: AssessmentAnswer[],
): AssessmentResult {
  if (schemaVersion !== RUBRIC_SCHEMA_VERSION) {
    throw new AssessmentRejected('INVALID_SCHEMA');
  }

  const expectedIds = QUESTIONS.map((q) => q.id);
  const seen = new Set<string>();
  const byId = new Map<string, string>();

  for (const a of answers) {
    if (seen.has(a.questionId)) throw new AssessmentRejected('DUPLICATE_QUESTION');
    seen.add(a.questionId);
    const def = QUESTION_MAP.get(a.questionId as QuestionId);
    if (!def) throw new AssessmentRejected('UNKNOWN_QUESTION');
    if (!def.validValues.includes(a.value)) throw new AssessmentRejected('INVALID_VALUE');
    byId.set(a.questionId, a.value);
  }

  for (const id of expectedIds) {
    if (!seen.has(id)) throw new AssessmentRejected('MISSING_QUESTION');
  }

  let totalScore = 0;
  for (const q of QUESTIONS) {
    if (q.scored) totalScore += q.points[byId.get(q.id) as string] ?? 0;
  }

  const bandEntry = BAND_RATINGS.find((e) => totalScore <= e.max);
  if (!bandEntry) throw new AssessmentRejected('INVALID_VALUE');
  const band = bandEntry.band;
  const rating = bandEntry.rating;

  const selfLevelValue = byId.get('self_level') as string;
  const selfLevelBand = selfLevelValue as Band;
  const diff = Math.abs(BAND_ORDER.indexOf(selfLevelBand) - BAND_ORDER.indexOf(band));

  return {
    schemaVersion,
    totalScore,
    band,
    rating,
    selfLevelBand,
    consistency: diff <= 1 ? 'OK' : 'REJECT',
  };
}
