import { useState } from 'react';
import { Trophy, Target, Crown, Swords, Shield, Zap, Users, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { GameSnapshot, Player, SpecialEvent, GameEvent } from '@/lib/types';
import { useLang } from '@/lib/LanguageContext';
import { formatClock, formatDuration } from '@/lib/time';
import { secondsUntilEnd } from '@/lib/time';

interface Props {
  snapshot: GameSnapshot;
  me: Player;
  serverNow: number;
}

function eventTypeLabel(lang: 'en' | 'es', type: string): string {
  const map: Record<string, { en: string; es: string }> = {
    MOST_WANTED: { en: 'Most Wanted', es: 'Most Wanted' },
    DOUBLE_BOUNTY: { en: 'Double Bounty', es: 'Double Bounty' },
    SURVIVOR: { en: 'Survivor Challenge', es: 'Desafío de Supervivencia' },
    KING_OF_THE_DAY: { en: 'King of the Day', es: 'Rey del Día' },
    RIVALRY: { en: 'Rivalry', es: 'Rivalidad' },
  };
  return map[type]?.[lang] ?? type.replace(/_/g, ' ');
}

function eventStatusBadge(lang: 'en' | 'es', status: string) {
  const map: Record<string, { en: string; es: string; color: string }> = {
    active: { en: 'Active', es: 'Activo', color: 'text-safe-bright bg-safe-deep/20' },
    completed: { en: 'Completed', es: 'Completado', color: 'text-blue-400 bg-blue-500/15' },
    failed: { en: 'Incomplete', es: 'Incompleto', color: 'text-it-bright bg-it-deep/20' },
    expired: { en: 'Expired', es: 'Expirado', color: 'text-ink-400 bg-ink-700/40' },
    cancelled: { en: 'Cancelled', es: 'Cancelado', color: 'text-ink-400 bg-ink-700/40' },
  };
  const entry = map[status] ?? map.expired;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${entry.color}`}>
      {entry[lang]}
    </span>
  );
}

function eventIcon(type: string) {
  if (type === 'MOST_WANTED' || type === 'DOUBLE_BOUNTY') return <Target className="h-5 w-5 text-it-bright" />;
  if (type === 'SURVIVOR') return <Shield className="h-5 w-5 text-safe-bright" />;
  if (type === 'KING_OF_THE_DAY') return <Crown className="h-5 w-5 text-pending-bright" />;
  if (type === 'RIVALRY') return <Swords className="h-5 w-5 text-blue-400" />;
  return <Trophy className="h-5 w-5 text-blue-400" />;
}

function SpecialEventCard({ event, snapshot, lang, serverNow }: { event: SpecialEvent; snapshot: GameSnapshot; lang: 'en' | 'es'; serverNow: number }) {
  const hunters = event.hunterPlayerIds
    .map((id) => snapshot.players.find((p) => p.id === id)?.name ?? 'Unknown')
    .join(' + ');
  const taggedSet = new Set(event.taggedPlayerIds);
  const total = event.targetPlayerIds.length;
  const done = taggedSet.size;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const targets = event.targetPlayerIds.map((id) => snapshot.players.find((p) => p.id === id)).filter(Boolean) as Player[];

  const endTimeStr = event.endTime;
  const [eh, em] = endTimeStr.split(':').map(Number);
  const endSec = eh * 3600 + em * 60;
  const now = new Date(serverNow);
  const tz = snapshot.competition.timezone;
  const localParts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(now);
  const hPart = localParts.find((p) => p.type === 'hour')?.value ?? '0';
  const mPart = localParts.find((p) => p.type === 'minute')?.value ?? '0';
  const sPart = localParts.find((p) => p.type === 'second')?.value ?? '0';
  const nowSec = parseInt(hPart) * 3600 + parseInt(mPart) * 60 + parseInt(sPart);
  const timeLeft = Math.max(0, endSec - nowSec);

  const isCompleted = event.status === 'completed';
  const isFailed = event.status === 'failed' || event.status === 'expired';
  const isActive = event.status === 'active';

  return (
    <div className={`rounded-2xl border-2 p-5 ${
      isCompleted ? 'border-safe/50 bg-safe-deep/15' :
      isFailed ? 'border-it/50 bg-it-deep/15' :
      'border-pending/50 bg-pending/10'
    }`}>
      <div className="text-center">
        <p className="font-display text-2xl font-black text-white">{event.name.toUpperCase()}</p>
        <p className="mt-1 text-sm font-bold text-pending-bright">{hunters} {lang === 'es' ? 'vs Todos' : 'vs Everybody'}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-300">
          {lang === 'es' ? 'Etiquetados' : 'Tagged'}: {done} / {total}
        </span>
        {isActive && timeLeft > 0 && (
          <span className="flex items-center gap-1 text-xs text-ink-400">
            <Clock className="h-3 w-3" /> {formatDuration(timeLeft)}
          </span>
        )}
      </div>

      <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink-700">
        <div
          className={`h-full rounded-full transition-all ${isCompleted ? 'bg-safe' : isFailed ? 'bg-it' : 'bg-pending'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {targets.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {targets.map((p) => {
            const tagged = taggedSet.has(p.id);
            return (
              <div key={p.id} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs ${
                tagged ? 'bg-safe-deep/20 text-safe-bright' : 'bg-ink-900/60 text-ink-400'
              }`}>
                {tagged ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5 opacity-40" />}
                <span className="truncate">{p.name}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 text-center">
        {isCompleted && <p className="font-display text-lg font-black text-safe-bright">{lang === 'es' ? '¡COMPLETADO!' : 'COMPLETED!'}</p>}
        {isFailed && <p className="font-display text-lg font-black text-it-bright">{lang === 'es' ? 'INCOMPLETO' : 'INCOMPLETE'}</p>}
        {isActive && <p className="text-xs text-ink-400">{lang === 'es' ? 'Sin tag back contra los cazadores' : 'No tag back against hunters'}</p>}
      </div>
    </div>
  );
}

export function Events({ snapshot, me, serverNow }: Props) {
  const { t, lang } = useLang();
  const gameEvents = (snapshot.gameEvents ?? []).filter((e) => e.dailyGameId);
  const specialEvents = snapshot.specialEvents ?? [];
  const activeSpecial = specialEvents.find((e) => e.status === 'active' || e.status === 'scheduled');
  const pastSpecials = specialEvents.filter((e) => e.status === 'completed' || e.status === 'failed' || e.status === 'expired');
  const todayEvents = gameEvents.filter((e) => snapshot.today && e.dailyGameId === snapshot.today.id);

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6 pt-20">
      <h1 className="font-display text-3xl font-black text-white">{t('events.title')}</h1>

      {/* Active special event */}
      {activeSpecial && (
        <SpecialEventCard event={activeSpecial} snapshot={snapshot} lang={lang} serverNow={serverNow} />
      )}

      {/* Today's random event */}
      {todayEvents.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-ink-400">{t('events.today')}</p>
          {todayEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} snapshot={snapshot} lang={lang} />
          ))}
        </div>
      )}

      {/* Event History */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-ink-400">{t('events.history')}</p>
        {pastSpecials.length > 0 && (
          <div className="space-y-2">
            {pastSpecials.map((ev) => (
              <SpecialEventCard key={ev.id} event={ev} snapshot={snapshot} lang={lang} serverNow={serverNow} />
            ))}
          </div>
        )}
        {gameEvents.length > 0 ? (
          <div className="space-y-2">
            {gameEvents.slice(0, 20).map((ev) => (
              <EventCard key={ev.id} event={ev} snapshot={snapshot} lang={lang} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-ink-700 bg-ink-800 p-4 text-center">
            <p className="text-sm text-ink-500">{t('events.noEvents')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event, snapshot, lang }: { event: GameEvent; snapshot: GameSnapshot; lang: 'en' | 'es' }) {
  const names = (event.selectedPlayerIds ?? [])
    .map((id) => snapshot.players.find((p) => p.id === id)?.name ?? 'Unknown');
  const winner = event.winnerPlayerId
    ? snapshot.players.find((p) => p.id === event.winnerPlayerId)?.name ?? null
    : null;
  const game = snapshot.allGames.find((g) => g.id === event.dailyGameId);

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900/60">
          {eventIcon(event.eventType)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-sm font-black text-white">{eventTypeLabel(lang, event.eventType)}</p>
            {eventStatusBadge(lang, event.status)}
          </div>
          {names.length > 0 && <p className="text-xs text-ink-400">{names.join(' vs ')}</p>}
          {game && <p className="text-[10px] text-ink-500">Day {game.day_number} · {formatClock(event.createdAt, snapshot.competition.timezone)}</p>}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="flex items-center gap-1 text-xs text-pending-bright"><Zap className="h-3 w-3" /> +{event.rewardXp} XP</span>
        {winner && <span className="text-xs text-safe-bright">★ {winner}</span>}
      </div>
    </div>
  );
}
