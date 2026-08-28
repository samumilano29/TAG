import { useState } from 'react';
import { Clock, Zap, Hand, ShieldCheck, Skull, Users, ArrowRight, MapPin, Crown, Target, Swords, Star, Activity as ActivityIcon, ChevronRight } from 'lucide-react';
import type { GameSnapshot, Player, PlayerRank } from '@/lib/types';
import { PlayerScheduleModal } from '@/components/PlayerScheduleModal';
import { ActivityFeed } from '@/components/ActivityFeed';
import {
  itPlayers,
  isGameLive,
  isPlayerIt,
  lastConfirmedTag,
  playerById,
  activeCount,
  eliminatedCount,
} from '@/lib/selectors';
import { rankFromXp, rankProgress, RANK_COLORS, getActiveEvent, getEventPlayerNames, RANK_THRESHOLDS } from '@/lib/xp';
import { formatDuration, secondsUntilEnd, secondsUntilStart, formatClock } from '@/lib/time';
import { useLang } from '@/lib/LanguageContext';

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

interface Props {
  snapshot: GameSnapshot;
  me: Player;
  serverNow: number;
  onOpenTag: () => void;
}

function elapsed(sinceIso: string, serverNow: number): string {
  return formatDuration((serverNow - new Date(sinceIso).getTime()) / 1000);
}

export function Home({ snapshot, me, serverNow, onOpenTag }: Props) {
  const { t } = useLang();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const live = isGameLive(snapshot);
  const tz = snapshot.competition.timezone;
  const its = itPlayers(snapshot);
  const meLatest = playerById(snapshot, me.id) ?? me;
  const iAmIt = isPlayerIt(snapshot, me.id);
  const iAmEliminated = meLatest.status === 'eliminated';
  const last = lastConfirmedTag(snapshot);

  const secToEnd = secondsUntilEnd(snapshot, serverNow);
  const secToStart = secondsUntilStart(snapshot, serverNow);
  const closingSoon = live && secToEnd <= 600;

  const isFinalDay = snapshot.today?.is_final && snapshot.today.status === 'final_pending';
  const paused = snapshot.competition.status === 'paused';
  const finished = snapshot.competition.status === 'finished';

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 pb-6 pt-20">
      {/* Schedule strip */}
      {finished ? (
        <Banner tone="safe" title="COMPETITION COMPLETE" sub="See the final results in Days." icon={<ShieldCheck className="h-5 w-5" />} />
      ) : isFinalDay ? (
        <Banner tone="pending" title="FINAL DAY" sub="Only two remain. The admin decides the finale." icon={<Zap className="h-5 w-5" />} />
      ) : paused ? (
        <Banner tone="pending" title="GAME PAUSED" sub="Tagging is off until the admin resumes." icon={<Clock className="h-5 w-5" />} />
      ) : live ? (
        <div
          className={`rounded-2xl border p-5 text-center transition ${
            closingSoon ? 'animate-pulse-red border-it bg-it-deep/25' : 'border-ink-700 bg-ink-800'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-400">Time left today</p>
          <p className={`mt-1 font-display text-5xl font-black tabular-nums ${closingSoon ? 'text-it-bright' : 'text-white'}`}>
            {formatDuration(secToEnd)}
          </p>
          <p className="mt-1 text-xs text-ink-500">Game ends at {snapshot.schedule.weekday === 'Wed' ? '1:15 PM' : '2:25 PM'}</p>
        </div>
      ) : secToStart > 0 ? (
        <div className="rounded-2xl border border-ink-700 bg-ink-800 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-400">Game starts at 7:14 AM</p>
          <p className="mt-1 font-display text-5xl font-black tabular-nums text-white">{formatDuration(secToStart)}</p>
          <p className="mt-1 text-xs text-ink-500">until tagging goes live</p>
        </div>
      ) : (
        <Banner tone="ink" title="GAME OVER FOR TODAY" sub="Tagging is closed until tomorrow at 7:14 AM." icon={<Clock className="h-5 w-5" />} />
      )}

      {/* My status */}
      {iAmEliminated ? (
        <div className="rounded-2xl border-2 border-ink-500 bg-ink-800/60 p-5 text-center">
          <Skull className="mx-auto h-10 w-10 text-ink-400" />
          <p className="mt-2 font-display text-3xl font-black text-ink-200">YOU ARE ELIMINATED</p>
          <p className="mt-1 text-sm text-ink-500">Eliminated on Day {meLatest.eliminated_day}. Visit the Graveyard to request a Revive.</p>
        </div>
      ) : iAmIt ? (
        <div className="animate-pulse-red rounded-2xl border-2 border-it bg-it-deep/25 p-5 text-center">
          <p className="font-display text-4xl font-black text-it-bright">YOU'RE IT</p>
          <p className="mt-1 text-sm text-white/80">Tag a safe player with a light touch, then log it here.</p>
          {live && (
            <button
              onClick={onOpenTag}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-it py-3 font-display text-lg font-black text-white active:scale-95"
            >
              <Hand className="h-5 w-5" /> TAG SOMEONE
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-safe bg-safe-deep/20 p-5 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-safe-bright" />
          <p className="mt-1 font-display text-4xl font-black text-safe-bright">YOU ARE SAFE</p>
          <p className="mt-1 text-sm text-white/70">Stay alert — anyone IT could come for you.</p>
        </div>
      )}

      {/* Random Event Card */}
      {(() => {
        const event = getActiveEvent(snapshot);
        if (!event) return null;
        const names = getEventPlayerNames(snapshot, event);
        const eventIcon = event.eventType === 'MOST_WANTED' || event.eventType === 'DOUBLE_BOUNTY'
          ? <Target className="h-6 w-6 text-it-bright" />
          : event.eventType === 'SURVIVOR'
            ? <ShieldCheck className="h-6 w-6 text-safe-bright" />
            : event.eventType === 'KING_OF_THE_DAY'
              ? <Crown className="h-6 w-6 text-pending-bright" />
              : <Swords className="h-6 w-6 text-blue-400" />;
        const isDouble = event.eventType === 'DOUBLE_BOUNTY';
        return (
          <div className={`rounded-2xl border-2 p-5 text-center ${isDouble ? 'border-pending bg-pending/10' : 'border-it/50 bg-it-deep/15'}`}>
            <div className="flex items-center justify-center gap-2">
              {eventIcon}
              <p className="font-display text-sm font-black uppercase tracking-[0.3em] text-ink-400">Random Event</p>
            </div>
            <p className="mt-2 font-display text-2xl font-black text-white">{event.eventType.replace(/_/g, ' ')}</p>
            {names.length > 0 && (
              <p className="mt-1 text-lg font-bold text-white">{names.join(' vs ')}</p>
            )}
            <p className="mt-2 text-sm text-ink-400">
              Reward: <span className="font-bold text-pending-bright">+{event.rewardXp} bonus XP</span>
            </p>
          </div>
        );
      })()}

      {/* Special Event Card */}
      {(() => {
        const special = (snapshot.specialEvents ?? []).find((e) => e.status === 'active' || e.status === 'scheduled');
        if (!special) return null;
        const hunters = special.hunterPlayerIds
          .map((id) => playerById(snapshot, id)?.name ?? 'Unknown')
          .join(' + ');
        const taggedSet = new Set(special.taggedPlayerIds);
        const total = special.targetPlayerIds.length;
        const done = taggedSet.size;
        const pct = total > 0 ? (done / total) * 100 : 0;
        const targets = special.targetPlayerIds.map((id) => playerById(snapshot, id)).filter(Boolean) as Player[];
        const isCompleted = special.status === 'completed';
        const isFailed = special.status === 'failed';
        return (
          <div className={`rounded-2xl border-2 p-5 ${
            isCompleted ? 'border-safe/50 bg-safe-deep/15' :
            isFailed ? 'border-it/50 bg-it-deep/15' :
            'border-pending/50 bg-pending/10'
          }`}>
            <div className="text-center">
              <p className="font-display text-2xl font-black text-white">{special.name.toUpperCase()}</p>
              <p className="mt-1 text-sm font-bold text-pending-bright">{hunters} vs Everybody</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-300">Tagged: {done} / {total}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink-700">
              <div className={`h-full rounded-full transition-all ${isCompleted ? 'bg-safe' : isFailed ? 'bg-it' : 'bg-pending'}`} style={{ width: `${pct}%` }} />
            </div>
            {targets.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-1">
                {targets.slice(0, 10).map((p) => {
                  const tagged = taggedSet.has(p.id);
                  return (
                    <div key={p.id} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${tagged ? 'bg-safe-deep/20 text-safe-bright' : 'bg-ink-900/60 text-ink-400'}`}>
                      <span>{tagged ? '✓' : '○'}</span><span className="truncate">{p.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* My rank progress */}
      {!iAmEliminated && (() => {
        const rp = rankProgress(meLatest.xp ?? 0);
        return (
          <div className="rounded-2xl border border-ink-700 bg-ink-800 p-4">
            <div className="flex items-center justify-between">
              <span className={`font-display text-lg font-black ${RANK_COLORS_LOCAL[rp.rank]}`}>{rp.rank.toUpperCase()}</span>
              <span className="text-sm text-ink-400">{meLatest.xp ?? 0} XP</span>
            </div>
            {rp.nextMin !== null ? (
              <>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-700">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${rp.progress * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-ink-500">{rp.nextMin - (meLatest.xp ?? 0)} XP to {RANK_THRESHOLDS.find(t => t.min === rp.nextMin)?.rank}</p>
              </>
            ) : (
              <p className="mt-2 text-xs font-bold text-pending-bright">MAX RANK</p>
            )}
          </div>
        );
      })()}

      {/* Currently IT */}
      {its.length > 0 && (() => {
        const it = its[0];
        return (
          <div>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.3em] text-ink-400">Currently IT</p>
            <div className="rounded-2xl border border-it/60 bg-it-deep/20 p-5 text-center">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-it-bright shadow-[0_0_10px_2px_rgba(239,68,68,0.6)]" />
              <p className="mt-2 font-display text-3xl font-black text-white">{it.player?.name ?? '—'}</p>
              {live && <p className="mt-1 text-xs tabular-nums text-it-bright">IT for {elapsed(it.since, serverNow)}</p>}
            </div>
          </div>
        );
      })()}

      {/* Last tag */}
      {last && (
        <div className="flex items-center justify-between rounded-2xl border border-ink-700 bg-ink-800 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Last tag</p>
            <p className="mt-0.5 flex items-center gap-2 font-semibold text-white">
              {playerById(snapshot, last.tagger_id)?.name}
              <ArrowRight className="h-4 w-4 text-ink-500" />
              {playerById(snapshot, last.tagged_player_id)?.name}
            </p>
          </div>
          <p className="text-sm text-ink-400">{last.confirmed_at ? formatClock(last.confirmed_at, tz) : ''}</p>
        </div>
      )}

      {/* Activity Feed */}
      {(snapshot.activityFeed ?? []).length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-ink-400">
              <ActivityIcon className="h-3.5 w-3.5" /> {t('home.activityFeed')}
            </p>
          </div>
          <ActivityFeed snapshot={snapshot} compact maxItems={4} />
        </div>
      )}

      {/* Roster */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-ink-400">
            <Users className="h-3.5 w-3.5" /> Roster
          </p>
          <p className="text-xs text-ink-400">
            <span className="text-safe-bright">{activeCount(snapshot)} active</span>
            <span className="mx-1.5 text-ink-600">·</span>
            <span className="text-ink-400">{eliminatedCount(snapshot)} out</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[...snapshot.players]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((p) => {
              const it = isPlayerIt(snapshot, p.id);
              const out = p.status === 'eliminated';
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlayer(p)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition active:scale-95 ${
                    out
                      ? 'border-ink-700 bg-ink-800/40 text-ink-500'
                      : it
                        ? 'border-it/50 bg-it-deep/20 text-white'
                        : 'border-safe/30 bg-safe-deep/10 text-white'
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      out ? 'bg-ink-600' : it ? 'bg-it-bright' : 'bg-safe-bright'
                    }`}
                  />
                  <span className={`truncate ${out ? 'line-through' : ''}`}>{p.name}</span>
                  {p.rank !== 'Unranked' && !out && (
                    <span className={`ml-auto text-[10px] font-black uppercase ${RANK_COLORS[p.rank]}`}>
                      {p.rank}
                    </span>
                  )}
                  {p.id === me.id && p.rank === 'Unranked' && <span className="ml-auto text-[10px] uppercase text-ink-500">you</span>}
                  {p.id === me.id && p.rank !== 'Unranked' && <span className="text-[10px] uppercase text-ink-500">·</span>}
                </button>
              );
            })}
        </div>
      </div>

      {selectedPlayer && (
        <PlayerScheduleModal
          player={selectedPlayer}
          schedule={snapshot.schedules.find((s) => s.playerId === selectedPlayer.id)}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}

function Banner({
  tone,
  title,
  sub,
  icon,
}: {
  tone: 'safe' | 'pending' | 'ink';
  title: string;
  sub: string;
  icon: React.ReactNode;
}) {
  const tones = {
    safe: 'border-safe/50 bg-safe-deep/20 text-safe-bright',
    pending: 'border-pending/50 bg-pending/15 text-pending-bright',
    ink: 'border-ink-700 bg-ink-800 text-ink-200',
  }[tone];
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${tones}`}>
      {icon}
      <div>
        <p className="font-display text-xl font-black">{title}</p>
        <p className="text-sm opacity-80">{sub}</p>
      </div>
    </div>
  );
}
