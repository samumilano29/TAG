export type PlayerStatus = 'active' | 'eliminated';
export type CompetitionStatus = 'active' | 'paused' | 'finished';
export type DailyStatus = 'running' | 'ended' | 'final_pending' | 'final_done';
export type TagStatus = 'pending' | 'confirmed' | 'rejected' | 'undone';

export interface Competition {
  id: string;
  name: string;
  timezone: string;
  start_time: string;
  end_time: string;
  current_day: number;
  status: CompetitionStatus;
  created_at: string;
}

export type PlayerRank = 'Unranked' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Champion' | 'Legend';
export type PlayerGrade = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';

export interface Player {
  id: string;
  name: string;
  status: PlayerStatus;
  eliminated_day: number | null;
  eliminated_at: string | null;
  claimed_device_id: string | null;
  sort_order: number;
  created_at: string;
  grade: PlayerGrade | null;
  rank: PlayerRank;
  xp: number;
  equipped_title: string | null;
}

export interface DailyGame {
  id: string;
  competition_id: string;
  day_number: number;
  date: string;
  status: DailyStatus;
  is_final: boolean;
  started_at: string | null;
  ended_at: string | null;
  eliminated_player_id: string | null;
  starting_it_ids: string[];
  final_it_ids: string[];
  created_at: string;
}

export interface ActiveTag {
  id: string;
  daily_game_id: string;
  current_it_player_id: string;
  tag_slot: number;
  started_at: string;
}

export interface Tag {
  id: string;
  daily_game_id: string;
  tag_slot: number;
  tagger_id: string;
  tagged_player_id: string;
  status: TagStatus;
  created_at: string;
  confirmed_at: string | null;
}

export interface Announcement {
  id: string;
  competition_id: string;
  daily_game_id: string | null;
  type: string;
  title: string;
  message: string;
  created_at: string;
}

export interface Schedule {
  startMin: number;
  endMin: number;
  curMin: number;
  localDate: string;
  weekday: string;
  windowActive: boolean;
}

export type Period5Type = '5A' | '5B';

export interface PlayerSchedule {
  period1: string;
  period2: string;
  period3: string;
  period4: string;
  period5Type: Period5Type;
  period5: string;
  period6: string;
  period7: string;
}

export interface PlayerScheduleRecord extends PlayerSchedule {
  playerId: string;
  scheduleCompleted: boolean;
  updatedAt: string;
}

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface PlayerJoinRequest {
  id: string;
  name: string;
  grade: PlayerGrade;
  status: JoinRequestStatus;
  requestedDeviceId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export type ReviveStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';

export interface Revive {
  id: string;
  challengerPlayerId: string;
  opponentPlayerId: string;
  grade: PlayerGrade;
  status: ReviveStatus;
  winnerPlayerId: string | null;
  loserPlayerId: string | null;
  requestedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
}

export type EventType = 'MOST_WANTED' | 'DOUBLE_BOUNTY' | 'SURVIVOR' | 'KING_OF_THE_DAY' | 'RIVALRY';
export type EventStatus = 'scheduled' | 'active' | 'completed' | 'failed' | 'expired';

export interface GameEvent {
  id: string;
  dailyGameId: string;
  eventType: EventType;
  status: EventStatus;
  selectedPlayerIds: string[];
  winnerPlayerId: string | null;
  rewardXp: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
}

export interface XpEvent {
  id: string;
  playerId: string;
  eventType: string;
  xpAmount: number;
  description: string | null;
  relatedTagId: string | null;
  relatedEventId: string | null;
  createdAt: string;
}

export interface DailyRecap {
  id: string;
  dailyGameId: string;
  dayNumber: number;
  topTaggerId: string | null;
  topTaggerCount: number;
  mostTaggedId: string | null;
  mostTaggedCount: number;
  eventType: string | null;
  eventWinnerId: string | null;
  revivesWon: number;
  playersEliminated: number;
  createdAt: string;
}

export interface PlayerTitleRecord {
  id: string;
  playerId: string;
  title: string;
  unlockedAt: string;
}

export interface PlayerStats {
  tagsMade: number;
  timesTagged: number;
  bountiesCollected: number;
  reviveWins: number;
  daysSurvived: number;
  survivorEventWins: number;
  kingOfTheDayWins: number;
  rivalryWins: number;
}

export interface ChatMessage {
  id: string;
  playerId: string | null;
  playerName: string;
  message: string;
  isSystem: boolean;
  createdAt: string;
}

export interface ActivityFeedItem {
  id: string;
  activityType: string;
  description: string;
  playerId: string | null;
  playerName: string | null;
  relatedTagId: string | null;
  relatedEventId: string | null;
  createdAt: string;
}

export interface AppUpdate {
  id: string;
  titleEn: string;
  titleEs: string;
  descriptionEn: string;
  descriptionEs: string;
  category: string;
  version: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SpecialEvent {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  hunterPlayerIds: string[];
  targetPlayerIds: string[];
  taggedPlayerIds: string[];
  objective: string;
  rewardXp: number;
  overrideRandom: boolean;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
}

export interface PlayerUpdateView {
  id: string;
  playerId: string;
  updateId: string;
  viewedAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'left_early' | 'unknown';

export interface AttendanceRecord {
  id: string;
  playerId: string;
  date: string;
  status: AttendanceStatus;
  leftAt: string | null;
  updatedAt: string;
}

export interface AttendanceAuditEntry {
  id: string;
  playerId: string;
  date: string;
  oldStatus: AttendanceStatus | null;
  newStatus: AttendanceStatus;
  oldLeftAt: string | null;
  newLeftAt: string | null;
  changedAt: string;
}

export interface GameSnapshot {
  serverTime: number;
  competition: Competition;
  players: Player[];
  today: DailyGame | null;
  activeTags: ActiveTag[];
  recentTags: Tag[];
  allTags: Tag[];
  allGames: DailyGame[];
  announcements: Announcement[];
  schedules: PlayerScheduleRecord[];
  schedule: Schedule;
  joinRequests: PlayerJoinRequest[];
  revives: Revive[];
  gameEvents: GameEvent[];
  xpEvents: XpEvent[];
  dailyRecaps: DailyRecap[];
  playerTitles: PlayerTitleRecord[];
  chatMessages: ChatMessage[];
  activityFeed: ActivityFeedItem[];
  appUpdates: AppUpdate[];
  specialEvents: SpecialEvent[];
  playerUpdateViews: PlayerUpdateView[];
  attendance: AttendanceRecord[];
}
