import { useState } from 'react';
import { Trophy, Target, Medal, Zap, Crosshair, Heart } from 'lucide-react';
import type { GameSnapshot, Player, PlayerRank, AttendanceStatus } from '@/lib/types';
import { playerById } from '@/lib/selectors';
import { computePlayerStats, rankFromXp, RANK_COLORS } from '@/lib/xp';
import { useLanguage } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';

interface Props {
  snapshot: GameSnapshot;
}

type Tab = 'topTagger' | 'mostTagged' | 'xpRanking' | 'bountyHunters' | 'reviveWins';

interface RankEntry {
  player: Player;
  count: number;
}

function computeTopTaggers(snapshot: GameSnapshot): RankEntry[] {
  const counts = new Map<string, number>();
  for (const tag of snapshot.allTags) {
    if (tag.status !== 'confirmed' || !tag.tagger_id) continue;
    counts.set(tag.tagger_id, (counts.get(tag.tagger_id) ?? 0) + 1);
  }
  return buildRanking(snapshot, counts);
}

function computeMostTagged(snapshot: GameSnapshot): RankEntry[] {
  const counts = new Map<string, number>();
  for (const tag of snapshot.allTags) {
    if (tag.status !== 'confirmed' || !tag.tagged_player_id) continue;
    counts.set(tag.tagged_player_id, (counts.get(tag.tagged_player_id) ?? 0) + 1);
  }
  return buildRanking(snapshot, counts);
}

function buildRanking(snapshot: GameSnapshot, counts: Map<string, number>): RankEntry[] {
  const entries: RankEntry[] = [];
  for (const [playerId, count] of counts) {
    const player = playerById(snapshot, playerId);
    if (player) entries.push({ player, count });
  }
  return entries.sort((a, b) => b.count - a.count || a.player.sort_order - b.player.sort_order);
}

function computeXpRanking(snapshot: GameSnapshot): RankEntry[] {
  return snapshot.players
    .map((p) => ({ player: p, count: p.xp ?? 0 }))
    .sort((a, b) => b.count - a.count || a.player.sort_order - b.player.sort_order);
}

function computeBountyHunters(snapshot: GameSnapshot): RankEntry[] {
  const counts = new Map<string, number>();
  for (const ev of snapshot.xpEvents) {
    if (ev.eventType === 'BOUNTY' || ev.eventType === 'DOUBLE_BOUNTY') {
      counts.set(ev.playerId, (counts.get(ev.playerId) ?? 0) + 1);
    }
  }
  return buildRanking(snapshot, counts);
}

function computeReviveWins(snapshot: GameSnapshot): RankEntry[] {
  const counts = new Map<string, number>();
  for (const ev of snapshot.xpEvents) {
    if (ev.eventType === 'REVIVE_WIN') {
      counts.set(ev.playerId, (counts.get(ev.playerId) ?? 0) + 1);
    }
  }
  return buildRanking(snapshot, counts);
}

const RANK_COLORS_LOCAL: Record<PlayerRank, string> = {
  Unranked: 'text-ink-500',
  Bronze: 'text-orange-400',
  Silver: 'text-ink-300',
  Gold: 'text-pending-bright',
  Platinum: 'text-blue-400',
  Diamond: 'text-cyan-300',
  Champion: 'text-purple-400',
  Legend: 'text-pending-bright',
};

export function Leaderboard({ snapshot }: Props) {
  const [tab, setTab] = useState<Tab>('topTagger');
  const { lang } = useLanguage();

  const todayDate = snapshot.today?.date ?? new Date().toISOString().slice(0, 10);
  const attendanceMap = new Map(
    (snapshot.attendance ?? []).filter((a) => a.date === todayDate).map((a) => [a.playerId, a.status]),
  );
  const getAttendance = (playerId: string): AttendanceStatus => attendanceMap.get(playerId) ?? 'unknown';

  const topTaggers = computeTopTaggers(snapshot);
  const mostTagged = computeMostTagged(snapshot);
  const xpRanking = computeXpRanking(snapshot);
  const bountyHunters = computeBountyHunters(snapshot);
  const reviveWinners = computeReviveWins(snapshot);

  const tabs: { id: Tab; label: string; icon: typeof Trophy }[] = [
    { id: 'topTagger', label: 'Top Tagger', icon: Trophy },
    { id: 'mostTagged', label: 'Most Tagged', icon: Target },
    { id: 'xpRanking', label: 'XP Ranking', icon: Zap },
    { id: 'bountyHunters', label: 'Bounty Hunters', icon: Crosshair },
    { id: 'reviveWins', label: 'Revive Wins', icon: Heart },
  ];

  const currentData = {
    topTagger: { entries: topTaggers, tone: 'safe' as const, unit: 'tags' },
    mostTagged: { entries: mostTagged, tone: 'it' as const, unit: 'times' },
    xpRanking: { entries: xpRanking, tone: 'xp' as const, unit: 'XP' },
    bountyHunters: { entries: bountyHunters, tone: 'xp' as const, unit: 'bounties' },
    reviveWins: { entries: reviveWinners, tone: 'xp' as const, unit: 'wins' },
  }[tab];

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 pb-6 pt-20">
      <h1 className="font-display text-4xl font-black text-white">LEADERBOARD</h1>

      {/* Tab selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition active:scale-95 ${
              tab === t.id
                ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                : 'border-ink-700 bg-ink-800 text-ink-400'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-ink-700 bg-ink-800 p-5">
        {currentData.entries.length === 0 ? (
          <p className="text-center text-sm text-ink-500">No data yet.</p>
        ) : (
          <div className="space-y-2">
            {currentData.entries.map((entry, i) => (
              <LeaderboardRow
                key={entry.player.id}
                rank={i + 1}
                player={entry.player}
                count={entry.count}
                unit={currentData.unit}
                tone={currentData.tone}
                attendanceStatus={getAttendance(entry.player.id)}
                lang={lang}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const ATTENDANCE_DOT: Record<AttendanceStatus, string> = {
  present: 'bg-safe',
  absent: 'bg-it',
  left_early: 'bg-pending-bright',
  unknown: 'bg-ink-600',
};

function LeaderboardRow({
  rank,
  player,
  count,
  unit,
  tone,
  attendanceStatus,
  lang,
}: {
  rank: number;
  player: Player;
  count: number;
  unit: string;
  tone: 'safe' | 'it' | 'xp';
  attendanceStatus: AttendanceStatus;
  lang: 'en' | 'es';
}) {
  const medalColor = rank === 1 ? 'text-pending-bright' : rank === 2 ? 'text-ink-300' : rank === 3 ? 'text-orange-400' : 'text-ink-500';
  const countColor = tone === 'safe' ? 'text-safe-bright' : tone === 'it' ? 'text-it-bright' : 'text-pending-bright';
  return (
    <div className="flex items-center gap-3 rounded-xl bg-ink-900/60 px-3 py-2.5">
      <div className="flex w-8 items-center justify-center">
        {rank <= 3 ? (
          <Medal className={`h-5 w-5 ${medalColor}`} />
        ) : (
          <span className={`text-sm font-black ${medalColor}`}>{rank}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-white">{player.name}</span>
          {player.equipped_title && (
            <span className="shrink-0 text-[10px] font-bold uppercase text-blue-400">{player.equipped_title}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-black uppercase ${RANK_COLORS_LOCAL[player.rank]}`}>
            {player.rank}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${ATTENDANCE_DOT[attendanceStatus]}`} />
            <span className="text-[9px] text-ink-500">{t(lang, `attendance.${attendanceStatus === 'left_early' ? 'leftEarlyShort' : attendanceStatus}`)}</span>
          </span>
        </div>
      </div>
      <span className={`font-display text-lg font-black tabular-nums ${countColor}`}>
        {count}
        <span className="ml-1 text-xs font-normal text-ink-500">{unit}</span>
      </span>
    </div>
  );
}
