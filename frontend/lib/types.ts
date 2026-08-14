export interface UserMe {
  id: string;
  phone: string;
  role: string;
  status: string;
  displayName?: string | null;
  profile?: PlayerProfile | null;
}

export interface PlayerProfile {
  id: string;
  userId: string;
  displayName?: string | null;
  region?: string | null;
  gender?: string | null;
  handedness?: string | null;
  position?: string | null;
  selfLevel?: string | null;
  band?: string | null;
}

export interface RatingProfile {
  id: string;
  userId: string;
  type: string;
  rating: number;
  ratingState: string;
  ratedMatches: number;
  uniqueOpponents: number;
  ratingDeviation: number;
  lastRankedAt?: string | null;
  confidence?: string;
  nextMilestone?: number;
}

export interface LeaderboardItem {
  rank: number;
  userId: string;
  rating: number;
  ratingDeviation: number;
  ratingState: string;
  ratedMatches: number;
  uniqueOpponents: number;
  displayName?: string | null;
  region?: string | null;
}

export interface Paginated<T> {
  items: T[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
  total?: number;
  page?: number;
  limit?: number;
}

export interface Session {
  id: string;
  title: string;
  hostId: string;
  venueId?: string | null;
  venue?: { name?: string; address?: string } | null;
  status: string;
  startAt?: string | null;
  endAt?: string | null;
  totalCost?: number | null;
  costSplit?: string | null;
  maxParticipants?: number | null;
  participantCount?: number;
}

export interface MatchPlayer {
  userId: string;
  team: 'A' | 'B';
  rosterConfirmed: boolean;
  deviceId?: string | null;
  displayName?: string | null;
  rating?: number | null;
  joinedAt?: string;
}

export interface Match {
  id: string;
  matchType: string;
  mode: string;
  format: string;
  status: string;
  creatorId: string;
  scheduledAt?: string | null;
  startedAt?: string | null;
  ratedAt?: string | null;
  players: MatchPlayer[];
  latestResult?: {
    id: string;
    scores: { teamA: number[]; teamB: number[] };
    status: string;
    confirmedByCount?: number;
  } | null;
  openDispute?: { id: string; status: string; reason?: string } | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  resourceType: string;
  resourceId?: string | null;
  deepLink?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface RatingTxn {
  id: string;
  type: string;
  ratingBefore: number;
  delta: number;
  ratingAfter: number;
  state: string;
  createdAt: string;
  match?: { id?: string | null; status?: string | null; format?: string | null } | null;
}
