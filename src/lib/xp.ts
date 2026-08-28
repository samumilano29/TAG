import type { GameSnapshot, Player, PlayerRank, PlayerStats, GameEvent } from '@/lib/types';

export const RANK_THRESHOLDS: { rank: PlayerRank; min: number; max: number }[] = [
  { rank: 'Legend', min: 1500, max: Infinity },
  { rank: 'Champion', min: 1000, max: 1499 },
  { rank: 'Diamond', min: 750, max: 999 },
  { rank: 'Platinum', min: 500, max: 749 },
  { rank: 'Gold', min: 300, max: 499 },
  { rank: 'Silver', min: 150, max: 299 },
  { rank: 'Bronze', min: 50, max: 149 },
  { rank: 'Unranked', min: 0, max: 49 },
];

export function rankFromXp(xp: number): PlayerRank {
  for (const t of RANK_THRESHOLDS) {
    if (xp >= t.min) return t.rank;
  }
  return 'Unranked';
}

export function nextRankThreshold(rank: PlayerRank): number | null {
  const idx = RANK_THRESHOLDS.findIndex((t) => t.rank === rank);
  if (idx <= 0) return null;
  return RANK_THRESHOLDS[idx - 1].min;
}

export function rankProgress(xp: number): { rank: PlayerRank; currentMin: number; nextMin: number | null; progress: number } {
  const rank = rankFromXp(xp);
  const entry = RANK_THRESHOLDS.find((t) => t.rank === rank)!;
  const nextMin = nextRankThreshold(rank);
  if (nextMin === null) {
    return { rank, currentMin: entry.min, nextMin: null, progress: 1 };
  }
  const progress = Math.min(1, (xp - entry.min) / (nextMin - entry.min));
  return { rank, currentMin: entry.min, nextMin, progress };
}

export const RANK_COLORS: Record<PlayerRank, string> = {
  Unranked: 'text-ink-500',
  Bronze: 'text-orange-400',
  Silver: 'text-ink-300',
  Gold: 'text-pending-bright',
  Platinum: 'text-blue-400',
  Diamond: 'text-cyan-300',
  Champion: 'text-purple-400',
  Legend: 'text-pending-bright',
};

export const ALL_TITLES = [
  'Hunter', 'Bounty Hunter', 'Bounty King', 'Survivor', 'Untouchable',
  'Comeback', 'Revive King', 'Tag Machine', 'Most Wanted', 'King of the Day',
  'Rival', 'Legend',
] as const;

export type Title = typeof ALL_TITLES[number];

export const TITLE_REQUIREMENTS: Record<Title, string> = {
  Hunter: '25 successful tags',
  'Bounty Hunter': '3 Most Wanted bounties collected',
  'Bounty King': '10 Most Wanted bounties collected',
  Survivor: 'Survive 5 complete game days',
  Untouchable: 'Survive 3 consecutive days without being tagged',
  Comeback: 'Win your first Revive',
  'Revive King': 'Win 5 Revives',
  'Tag Machine': '50 successful tags',
  'Most Wanted': 'Be selected as Most Wanted 5 times',
  'King of the Day': 'Win a King of the Day event',
  Rival: 'Win 3 Rivalry events',
  Legend: 'Reach LEGEND Rank',
};

export function computePlayerStats(snapshot: GameSnapshot, playerId: string): PlayerStats {
  const confirmedTags = snapshot.allTags.filter((t) => t.status === 'confirmed');
  const tagsMade = confirmedTags.filter((t) => t.tagger_id === playerId).length;
  const timesTagged = confirmedTags.filter((t) => t.tagged_player_id === playerId).length;

  const xpEvents = snapshot.xpEvents.filter((e) => e.playerId === playerId);
  const bountiesCollected = xpEvents.filter((e) => e.eventType === 'BOUNTY' || e.eventType === 'DOUBLE_BOUNTY').length;
  const reviveWins = xpEvents.filter((e) => e.eventType === 'REVIVE_WIN').length;
  const survivorEventWins = xpEvents.filter((e) => e.eventType === 'SURVIVOR_WIN').length;
  const kingOfTheDayWins = xpEvents.filter((e) => e.eventType === 'KING_OF_THE_DAY').length;
  const rivalryWins = xpEvents.filter((e) => e.eventType === 'RIVALRY_WIN').length;

  const daysSurvived = snapshot.allGames.filter(
    (g) => g.status === 'ended' && g.eliminated_player_id !== playerId,
  ).length;

  return {
    tagsMade,
    timesTagged,
    bountiesCollected,
    reviveWins,
    daysSurvived,
    survivorEventWins,
    kingOfTheDayWins,
    rivalryWins,
  };
}

export function getPlayerTitles(snapshot: GameSnapshot, playerId: string): string[] {
  return snapshot.playerTitles
    .filter((t) => t.playerId === playerId)
    .map((t) => t.title);
}

export function getActiveEvent(snapshot: GameSnapshot): GameEvent | undefined {
  if (!snapshot.today) return undefined;
  return snapshot.gameEvents.find(
    (e) => e.dailyGameId === snapshot.today!.id && e.status === 'active',
  );
}

export function getEventPlayerNames(snapshot: GameSnapshot, event: GameEvent): string[] {
  return event.selectedPlayerIds.map((id) => playerById(snapshot, id)?.name ?? 'Unknown');
}

export function playerById(snapshot: GameSnapshot, id: string | null | undefined): Player | undefined {
  if (!id) return undefined;
  return snapshot.players.find((p) => p.id === id);
}
