import { Calendar, Skull, Target, ShieldCheck, Crown, Swords, Trophy, Heart } from 'lucide-react';
import type { GameSnapshot, Player, EventType } from '@/lib/types';
import { playerById } from '@/lib/selectors';

interface Props {
  snapshot: GameSnapshot;
}

const EVENT_ICONS: Record<string, typeof Target> = {
  MOST_WANTED: Target,
  DOUBLE_BOUNTY: Target,
  SURVIVOR: ShieldCheck,
  KING_OF_THE_DAY: Crown,
  RIVALRY: Swords,
};

export function Days({ snapshot }: Props) {
  const games = [...snapshot.allGames].sort((a, b) => b.day_number - a.day_number);
  const recapsByGameId = new Map(snapshot.dailyRecaps.map((r) => [r.dailyGameId, r]));
  const eventsByGameId = new Map(
    snapshot.gameEvents.map((e) => [e.dailyGameId, e]),
  );

  if (games.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 pt-20 text-center text-ink-500">
        <Calendar className="mx-auto h-10 w-10 text-ink-600" />
        <p className="mt-4 font-display text-2xl font-black text-white">No days yet</p>
        <p className="mt-1 text-sm">The first day begins at 7:14 AM.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6 pt-20">
      <h1 className="font-display text-4xl font-black text-white">DAYS</h1>
      {games.map((g) => {
        const starting = g.starting_it_ids.map((id) => playerById(snapshot, id)).filter(Boolean) as Player[];
        const final = g.final_it_ids.map((id) => playerById(snapshot, id)).filter(Boolean) as Player[];
        const eliminated = playerById(snapshot, g.eliminated_player_id);
        const isFinal = g.is_final;
        const recap = recapsByGameId.get(g.id);
        const event = eventsByGameId.get(g.id);

        return (
          <div key={g.id} className="rounded-2xl border border-ink-700 bg-ink-800 p-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-2xl font-black text-white">
                {isFinal ? 'FINAL DAY' : `DAY ${g.day_number}`}
              </p>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  g.status === 'running'
                    ? 'bg-safe/20 text-safe-bright'
                    : g.status === 'final_pending'
                      ? 'bg-pending/20 text-pending-bright'
                      : 'bg-ink-700 text-ink-400'
                }`}
              >
                {g.status === 'running' ? 'Live' : g.status === 'final_pending' ? 'Pending' : 'Ended'}
              </span>
            </div>

            {starting.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Starting IT</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {starting.map((p) => (
                    <span key={p.id} className="rounded-lg bg-it-deep/30 px-3 py-1 text-sm font-semibold text-it-bright">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {final.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Final IT</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {final.map((p) => (
                    <span key={p.id} className="rounded-lg bg-it-deep/30 px-3 py-1 text-sm font-semibold text-it-bright">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {eliminated && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-ink-600 bg-ink-900/60 px-3 py-2.5">
                <Skull className="h-4 w-4 text-ink-400" />
                <p className="text-sm font-semibold text-ink-300">
                  <span className="text-white">{eliminated.name}</span> eliminated
                </p>
              </div>
            )}

            {/* Daily Recap */}
            {recap && (
              <div className="mt-3 rounded-xl border border-ink-600 bg-ink-900/40 px-3 py-3">
                <p className="font-display text-sm font-black uppercase tracking-wider text-blue-400">Day {g.day_number} Recap</p>
                <div className="mt-2 space-y-1.5">
                  {recap.topTaggerId && (
                    <RecapRow label="Top Tagger" value={`${playerById(snapshot, recap.topTaggerId)?.name ?? '—'} — ${recap.topTaggerCount} tags`} />
                  )}
                  {recap.mostTaggedId && (
                    <RecapRow label="Most Tagged" value={`${playerById(snapshot, recap.mostTaggedId)?.name ?? '—'} — ${recap.mostTaggedCount} times`} />
                  )}
                  {recap.eventType && (
                    <RecapRow label="Random Event" value={recap.eventType.replace(/_/g, ' ')} />
                  )}
                  {recap.eventWinnerId && (
                    <RecapRow label="Event Winner" value={playerById(snapshot, recap.eventWinnerId)?.name ?? '—'} />
                  )}
                  <RecapRow label="Revives Won" value={`${recap.revivesWon}`} />
                  <RecapRow label="Players Eliminated" value={`${recap.playersEliminated}`} />
                </div>
              </div>
            )}

            {/* Event History */}
            {event && (
              <div className="mt-2 rounded-xl border border-ink-600 bg-ink-900/40 px-3 py-3">
                <p className="font-display text-sm font-black uppercase tracking-wider text-pending-bright">Event History</p>
                <div className="mt-2">
                  <EventHistoryRow event={event} snapshot={snapshot} />
                </div>
              </div>
            )}

            {isFinal && g.status === 'final_pending' && (
              <p className="mt-3 rounded-xl bg-pending/15 px-3 py-2 text-sm text-pending-bright">
                Final day — awaiting admin decision.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-ink-500">{label}</span>
      <span className="text-xs font-semibold text-white">{value}</span>
    </div>
  );
}

function EventHistoryRow({ event, snapshot }: { event: any; snapshot: GameSnapshot }) {
  const Icon = EVENT_ICONS[event.eventType] ?? Target;
  const winner = event.winnerPlayerId ? playerById(snapshot, event.winnerPlayerId) : null;
  const target = event.selectedPlayerIds?.[0] ? playerById(snapshot, event.selectedPlayerIds[0]) : null;
  const players = event.selectedPlayerIds?.map((id: string) => playerById(snapshot, id)?.name ?? '—') ?? [];

  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-pending-bright" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-white">{event.eventType.replace(/_/g, ' ')}</p>
        {event.eventType === 'RIVALRY' && players.length >= 2 && (
          <p className="text-xs text-ink-400">{players.join(' vs ')}</p>
        )}
        {target && event.eventType !== 'RIVALRY' && event.eventType !== 'KING_OF_THE_DAY' && (
          <p className="text-xs text-ink-400">Target: {target.name}</p>
        )}
        {event.status === 'completed' && winner && (
          <p className="text-xs font-semibold text-safe-bright">
            {event.eventType === 'SURVIVOR' ? 'Survived!' : `Winner: ${winner.name}`}
          </p>
        )}
        {event.status === 'failed' && (
          <p className="text-xs font-semibold text-it-bright">Failed</p>
        )}
        {event.status === 'expired' && (
          <p className="text-xs text-ink-500">Expired — no one completed it</p>
        )}
        {event.status === 'active' && (
          <p className="text-xs font-semibold text-pending-bright">In progress…</p>
        )}
      </div>
    </div>
  );
}
