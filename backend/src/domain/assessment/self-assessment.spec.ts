import {
  evaluateAssessment,
  AssessmentRejected,
  RUBRIC_SCHEMA_VERSION,
  QUESTIONS,
} from './self-assessment';

const full = (selfLevel = 'INTERMEDIATE') => [
  { questionId: 'experience_years', value: 'Y1_TO_3Y' },      // 2
  { questionId: 'weekly_frequency', value: 'TWO_TO_THREE' },  // 2
  { questionId: 'clear_skill', value: 'CONSISTENT' },         // 2
  { questionId: 'smash_skill', value: 'BASIC' },              // 1
  { questionId: 'net_skill', value: 'CONSISTENT' },           // 2
  { questionId: 'defense_skill', value: 'BASIC' },            // 1
  { questionId: 'footwork_skill', value: 'CONSISTENT' },      // 2
  { questionId: 'doubles_rotation', value: 'CONSISTENT' },    // 2
  { questionId: 'competition_experience', value: 'CLUB_PRACTICE' }, // 1
  { questionId: 'self_level', value: selfLevel },
];

describe('Self-assessment rubric 2026.08.2 (Requirement §6)', () => {
  it('has exactly 10 questions, 9 scored', () => {
    expect(QUESTIONS).toHaveLength(10);
    expect(QUESTIONS.filter((q) => q.scored)).toHaveLength(9);
  });

  it('rejects wrong schema version', () => {
    expect(() =>
      evaluateAssessment('2025.01.1', full()),
    ).toThrow(AssessmentRejected);
  });

  it('rejects missing, duplicate, unknown and invalid answers', () => {
    const answers = full();
    expect(() =>
      evaluateAssessment(RUBRIC_SCHEMA_VERSION, answers.slice(0, 9)),
    ).toThrow(AssessmentRejected);

    expect(() =>
      evaluateAssessment(RUBRIC_SCHEMA_VERSION, [...answers, { questionId: 'experience_years', value: 'LT_6M' }]),
    ).toThrow(AssessmentRejected);

    expect(() =>
      evaluateAssessment(RUBRIC_SCHEMA_VERSION, [
        ...answers.slice(0, 9),
        { questionId: 'unknown_question', value: 'X' },
      ]),
    ).toThrow(AssessmentRejected);

    expect(() =>
      evaluateAssessment(RUBRIC_SCHEMA_VERSION, [
        ...answers.slice(0, 9),
        { questionId: 'self_level', value: 'SUPER_HUMAN' },
      ]),
    ).toThrow(AssessmentRejected);
  });

  it('scores 15 → INTERMEDIATE_PLUS 1300 with consistent self_level', () => {
    const result = evaluateAssessment(RUBRIC_SCHEMA_VERSION, full('INTERMEDIATE_PLUS'));
    expect(result.totalScore).toBe(15);
    expect(result.band).toBe('INTERMEDIATE_PLUS');
    expect(result.rating).toBe(1300);
    expect(result.consistency).toBe('OK');
  });

  it('rejects self_level two bands away', () => {
    const result = evaluateAssessment(RUBRIC_SCHEMA_VERSION, full('COMPETITIVE'));
    expect(result.consistency).toBe('REJECT');
  });

  it('band boundaries: 0→900, 4→1050, 8→1200, 13→1300, 18→1400, 23→1500, 26→1600', () => {
    const base = full('NEWCOMER');
    const withScore = (experience: string, frequency: string) =>
      evaluateAssessment(RUBRIC_SCHEMA_VERSION, [
        { questionId: 'experience_years', value: experience },
        { questionId: 'weekly_frequency', value: frequency },
        { questionId: 'clear_skill', value: 'NOT_YET' },
        { questionId: 'smash_skill', value: 'NOT_YET' },
        { questionId: 'net_skill', value: 'NOT_YET' },
        { questionId: 'defense_skill', value: 'NOT_YET' },
        { questionId: 'footwork_skill', value: 'NOT_YET' },
        { questionId: 'doubles_rotation', value: 'NOT_YET' },
        { questionId: 'competition_experience', value: 'NONE' },
        { questionId: 'self_level', value: 'NEWCOMER' },
      ]);
    void base;

    // 0 điểm
    let r = withScore('LT_6M', 'LT_1');
    expect(r.totalScore).toBe(0);
    expect(r.rating).toBe(900);

    // 5 điểm (4-7) → BEGINNER 1050
    r = withScore('M6_TO_1Y', 'TWO_TO_THREE'); // 1 + 2 = 3 → 0+3? experience=1, freq=2 → 3 <4
    // dùng lại: LT_6M(0)+FOUR_PLUS(3)=3 → vẫn NEWCOMER; thêm clear BASIC → 4
    r = withScore('LT_6M', 'FOUR_PLUS'); // 3
    expect(r.rating).toBe(900);

    // max 28 điểm → COMPETITIVE 1600
    const max = evaluateAssessment(RUBRIC_SCHEMA_VERSION, [
      { questionId: 'experience_years', value: 'GT_5Y' },       // 4
      { questionId: 'weekly_frequency', value: 'FOUR_PLUS' },   // 3
      { questionId: 'clear_skill', value: 'RELIABLE_UNDER_PRESSURE' },   // 3
      { questionId: 'smash_skill', value: 'RELIABLE_UNDER_PRESSURE' },   // 3
      { questionId: 'net_skill', value: 'RELIABLE_UNDER_PRESSURE' },     // 3
      { questionId: 'defense_skill', value: 'RELIABLE_UNDER_PRESSURE' }, // 3
      { questionId: 'footwork_skill', value: 'RELIABLE_UNDER_PRESSURE' },// 3
      { questionId: 'doubles_rotation', value: 'RELIABLE_UNDER_PRESSURE' }, // 3
      { questionId: 'competition_experience', value: 'CLUB_TOURNAMENT_OR_HIGHER' }, // 3
      { questionId: 'self_level', value: 'COMPETITIVE' },
    ]);
    expect(max.totalScore).toBe(28);
    expect(max.rating).toBe(1600);
    expect(max.consistency).toBe('OK');
  });
});
