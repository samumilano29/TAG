import { useState } from 'react';
import { MapPin } from 'lucide-react';
import type { Player, PlayerSchedule } from '@/lib/types';
import { ScheduleForm } from '@/components/ScheduleForm';

interface Props {
  player: Player;
  onSave: (schedule: PlayerSchedule) => Promise<void>;
}

export function ScheduleSetup({ player, onSave }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (schedule: PlayerSchedule) => {
    setBusy(true);
    setError(null);
    try {
      await onSave(schedule);
    } catch {
      setError('Could not save schedule. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-bg min-h-screen">
      <div className="mx-auto max-w-md px-4 pb-16 pt-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-600 bg-ink-800">
            <MapPin className="h-7 w-7 text-blue-400" />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.35em] text-blue-400">SET UP YOUR SCHEDULE</p>
          <h1 className="mt-2 font-display text-4xl font-black text-white">WHERE ARE YOU?</h1>
          <p className="mt-2 text-sm text-ink-400">
            Enter the building or area where you normally are during each period. This helps other players find you.
          </p>
        </div>

        <div className="mt-6">
          <ScheduleForm
            onSubmit={handleSave}
            submitLabel="SAVE & ENTER GAME"
            busy={busy}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
