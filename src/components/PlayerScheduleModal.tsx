import { X, MapPin } from 'lucide-react';
import type { Player, PlayerScheduleRecord } from '@/lib/types';

interface Props {
  player: Player;
  schedule: PlayerScheduleRecord | undefined;
  onClose: () => void;
}

export function PlayerScheduleModal({ player, schedule, onClose }: Props) {
  const rows: { label: string; value: string }[] = schedule
    ? [
        { label: 'Period 1', value: schedule.period1 },
        { label: 'Period 2', value: schedule.period2 },
        { label: 'Period 3', value: schedule.period3 },
        { label: 'Period 4', value: schedule.period4 },
        { label: `Period ${schedule.period5Type}`, value: schedule.period5 },
        { label: 'Period 6', value: schedule.period6 },
        { label: 'Period 7', value: schedule.period7 },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-sm animate-slide-down rounded-t-3xl border border-ink-700 bg-ink-900 p-5 pb-8 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-600 bg-ink-800">
              <MapPin className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="font-display text-2xl font-black text-white">{player.name.toUpperCase()}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-ink-800 p-2 text-ink-400 active:scale-90">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-ink-500">Schedule</p>

        {!schedule || !schedule.scheduleCompleted ? (
          <div className="mt-4 rounded-2xl border border-ink-700 bg-ink-800 p-5 text-center">
            <MapPin className="mx-auto h-6 w-6 text-ink-600" />
            <p className="mt-2 text-sm text-ink-400">Schedule unavailable.</p>
            <p className="mt-1 text-xs text-ink-500">{player.name} hasn't set up their schedule yet.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-xl border border-ink-700 bg-ink-800 px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">{row.label}</span>
                <span className="text-sm font-semibold text-white">{row.value || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
