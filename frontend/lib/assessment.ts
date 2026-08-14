export interface AssessmentOption {
  value: string;
  label: string;
}

export interface AssessmentQuestion {
  id: string;
  label: string;
  hint?: string;
  options: AssessmentOption[];
}

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'experience_years',
    label: 'Bạn chơi cầu lông được bao lâu?',
    options: [
      { value: 'LT_6M', label: 'Dưới 6 tháng' },
      { value: 'M6_TO_1Y', label: '6 tháng – 1 năm' },
      { value: 'Y1_TO_3Y', label: '1 – 3 năm' },
      { value: 'Y3_TO_5Y', label: '3 – 5 năm' },
      { value: 'GT_5Y', label: 'Trên 5 năm' },
    ],
  },
  {
    id: 'weekly_frequency',
    label: 'Tần suất chơi mỗi tuần?',
    options: [
      { value: 'LT_1', label: 'Chưa tới 1 buổi/tuần' },
      { value: 'ONE', label: '1 buổi/tuần' },
      { value: 'TWO_TO_THREE', label: '2 – 3 buổi/tuần' },
      { value: 'FOUR_PLUS', label: '4 buổi trở lên/tuần' },
    ],
  },
  {
    id: 'clear_skill',
    label: 'Kỹ thuật cầu cao sâu (clear)',
    options: [
      { value: 'NOT_YET', label: 'Chưa thành thạo' },
      { value: 'BASIC', label: 'Cơ bản' },
      { value: 'CONSISTENT', label: 'Ổn định' },
      { value: 'RELIABLE_UNDER_PRESSURE', label: 'Chuẩn xác cả khi bị ép' },
    ],
  },
  {
    id: 'smash_skill',
    label: 'Kỹ thuật đập cầu (smash)',
    options: [
      { value: 'NOT_YET', label: 'Chưa thành thạo' },
      { value: 'BASIC', label: 'Cơ bản' },
      { value: 'CONSISTENT', label: 'Ổn định' },
      { value: 'RELIABLE_UNDER_PRESSURE', label: 'Chuẩn xác cả khi bị ép' },
    ],
  },
  {
    id: 'net_skill',
    label: 'Kỹ thuật lưới (net/drop)',
    options: [
      { value: 'NOT_YET', label: 'Chưa thành thạo' },
      { value: 'BASIC', label: 'Cơ bản' },
      { value: 'CONSISTENT', label: 'Ổn định' },
      { value: 'RELIABLE_UNDER_PRESSURE', label: 'Chuẩn xác cả khi bị ép' },
    ],
  },
  {
    id: 'defense_skill',
    label: 'Khả năng phòng thủ',
    options: [
      { value: 'NOT_YET', label: 'Chưa thành thạo' },
      { value: 'BASIC', label: 'Cơ bản' },
      { value: 'CONSISTENT', label: 'Ổn định' },
      { value: 'RELIABLE_UNDER_PRESSURE', label: 'Chuẩn xác cả khi bị ép' },
    ],
  },
  {
    id: 'footwork_skill',
    label: 'Di chuyển chân (footwork)',
    options: [
      { value: 'NOT_YET', label: 'Chưa thành thạo' },
      { value: 'BASIC', label: 'Cơ bản' },
      { value: 'CONSISTENT', label: 'Ổn định' },
      { value: 'RELIABLE_UNDER_PRESSURE', label: 'Chuẩn xác cả khi bị ép' },
    ],
  },
  {
    id: 'doubles_rotation',
    label: 'Xoay vòng đánh đôi',
    options: [
      { value: 'NOT_YET', label: 'Chưa thành thạo' },
      { value: 'BASIC', label: 'Cơ bản' },
      { value: 'CONSISTENT', label: 'Ổn định' },
      { value: 'RELIABLE_UNDER_PRESSURE', label: 'Chuẩn xác cả khi bị ép' },
    ],
  },
  {
    id: 'competition_experience',
    label: 'Kinh nghiệm thi đấu',
    options: [
      { value: 'NONE', label: 'Chưa thi đấu giải nào' },
      { value: 'CLUB_PRACTICE', label: 'Đấu tập trong câu lạc bộ' },
      { value: 'RECREATIONAL_TOURNAMENT', label: 'Giải phong trào' },
      { value: 'CLUB_TOURNAMENT_OR_HIGHER', label: 'Giải CLB hoặc cao hơn' },
    ],
  },
  {
    id: 'self_level',
    label: 'Bạn tự nhận mình ở trình độ nào?',
    hint: 'Câu này không chấm điểm — dùng để đối chiếu với kết quả đánh giá.',
    options: [
      { value: 'NEWCOMER', label: 'Mới bắt đầu' },
      { value: 'BEGINNER', label: 'Sơ cấp' },
      { value: 'INTERMEDIATE', label: 'Trung cấp' },
      { value: 'INTERMEDIATE_PLUS', label: 'Trung cấp khá' },
      { value: 'ADVANCED', label: 'Nâng cao' },
      { value: 'COMPETITIVE', label: 'Thi đấu' },
    ],
  },
];

export const ASSESSMENT_SCHEMA_VERSION = '2026.08.2';
