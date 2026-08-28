import { useEffect, useState } from 'react';
import { Skull, Trophy, X } from 'lucide-react';
import type { GameSnapshot, Player } from '@/lib/types';
import { playerById, activeCount } from '@/lib/selectors';

interface Props {
  snapshot: GameSnapshot;
  onDismiss: () => void;
}

type Phase = 'intro' | 'eliminated' | 'winner';

export function EndOfDayOverlay({ snapshot, onDismiss }: Props) {
  const today = snapshot.today;
  const [phase, setPhase] = useState<Phase>('intro');
  const [seenDay, setSeenDay] = useState<number | null>(null);

  // Only show for the most recent ended day, once per day.
  useEffect(() => {
    if (!today || today.status !== 'ended') return;
    const dismissed = Number(sessionStorage.getItem('tag-eod-dismissed') ?? '0');
    if (today.day_number <= dismissed) return;
    setSeenDay(today.day_number);
    setPhase('intro');
    const t1 = setTimeout(() => setPhase('eliminated'), 1800);
    return () => {
      clearTimeout(t1);
    };
  }, [today?.id, today?.status, today?.day_number]);

  if (!today || today.status !== 'ended' || seenDay !== today.day_number) return null;

  const eliminated = playerById(snapshot, today.eliminated_player_id);
  const remaining = activeCount(snapshot);
  const isLastElimination = remaining === 1;
  const winner = snapshot.players.find((p) => p.status === 'active');

  const dismiss = () => {
    sessionStorage.setItem('tag-eod-dismissed', String(today.day_number));
    setSeenDay(null);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-ink-950/95 px-5 text-center">
      <button
        onClick={dismiss}
        className="absolute right-4 top-4 rounded-full bg-ink-800 p-2 text-ink-400 active:scale-90"
      >
        <X className="h-5 w-5" />
      </button>

      {phase === 'intro' && (
        <div className="animate-scale-in">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-ink-400">End of day</p>
          <h1 className="mt-3 font-display text-6xl font-black text-white">DAY {today.day_number}</h1>
          <p className="mt-4 text-ink-500">Time's up…</p>
        </div>
      )}

      {phase === 'eliminated' && (
        <div className="animate-scale-in">
          {isLastElimination && winner ? (
            <>
              <Trophy className="mx-auto h-16 w-16 text-pending-bright" />
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.4em] text-pending-bright">Winner</p>
              <h1 className="mt-2 font-display text-6xl font-black text-white">{winner.name}</h1>
              <p className="mt-3 text-ink-400">is the last player standing and wins TAG!</p>
            </>
          ) : (
            <>
              <Skull className="mx-auto h-14 w-14 text-ink-400" />
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.4em] text-ink-400">Today's eliminated player</p>
              <h1 className="mt-2 animate-pulse font-display text-6xl font-black text-it-bright">
                {eliminated?.name ?? '—'}
              </h1>
              <p className="mt-4 text-lg text-white">has been eliminated.</p>
              <p className="mt-6 font-display text-3xl font-black text-safe-bright">{remaining} PLAYERS REMAINING</p>
            </>
          )}
        </div>
      )}

      <button
        onClick={dismiss}
        className="mt-10 rounded-xl border border-ink-600 px-6 py-2.5 text-sm font-semibold text-ink-300 active:scale-95"
      >
        Continue
      </button>
    </div>
  );
}
