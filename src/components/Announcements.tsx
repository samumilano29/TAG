import { Megaphone } from 'lucide-react';
import type { GameSnapshot } from '@/lib/types';

interface Props {
  snapshot: GameSnapshot;
}

const typeStyles: Record<string, string> = {
  day_start: 'border-safe/40 bg-safe-deep/15',
  day_result: 'border-it/40 bg-it-deep/15',
  final_day: 'border-pending/50 bg-pending/15',
  winner: 'border-safe/60 bg-safe-deep/25',
  info: 'border-ink-700 bg-ink-800',
  custom: 'border-blue-500/40 bg-blue-500/10',
};

export function Announcements({ snapshot }: Props) {
  const items = snapshot.announcements;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 pt-20 text-center text-ink-500">
        <Megaphone className="mx-auto h-10 w-10 text-ink-600" />
        <p className="mt-4 font-display text-2xl font-black text-white">No announcements yet</p>
        <p className="mt-1 text-sm">Game updates will appear here in real time.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-3 px-4 pb-6 pt-20">
      <h1 className="font-display text-4xl font-black text-white">ANNOUNCEMENTS</h1>
      {items.map((a, i) => (
        <div
          key={a.id}
          className={`animate-fade-up rounded-2xl border p-4 ${typeStyles[a.type] ?? typeStyles.info}`}
          style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
        >
          <div className="flex items-start gap-3">
            <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-ink-300" />
            <div className="min-w-0">
              <p className="font-display text-lg font-black text-white">{a.title}</p>
              {a.message && <p className="mt-1 text-sm text-ink-300">{a.message}</p>}
              <p className="mt-2 text-xs text-ink-500">
                {new Date(a.created_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
