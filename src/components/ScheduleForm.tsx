import { useState } from 'react';
import type { PlayerSchedule, Period5Type } from '@/lib/types';

interface Props {
  initial?: PlayerSchedule;
  onSubmit: (schedule: PlayerSchedule) => Promise<void>;
  submitLabel: string;
  busy: boolean;
  error: string | null;
}

const empty: PlayerSchedule = {
  period1: '',
  period2: '',
  period3: '',
  period4: '',
  period5Type: '5A',
  period5: '',
  period6: '',
  period7: '',
};

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter building / area"
        className="w-full rounded-xl border border-ink-600 bg-ink-800 px-4 py-3.5 text-base text-white outline-none transition focus:border-blue-500"
      />
    </div>
  );
}

export function ScheduleForm({ initial, onSubmit, submitLabel, busy, error }: Props) {
  const [form, setForm] = useState<PlayerSchedule>(initial ?? empty);
  const [touched, setTouched] = useState(false);

  const set = (key: keyof PlayerSchedule, val: string | Period5Type) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const allFilled =
    form.period1.trim() &&
    form.period2.trim() &&
    form.period3.trim() &&
    form.period4.trim() &&
    form.period5.trim() &&
    form.period6.trim() &&
    form.period7.trim();

  const handleSubmit = async () => {
    if (!allFilled || busy) return;
    setTouched(true);
    await onSubmit(form);
  };

  return (
    <div className="space-y-4">
      <Field label="Period 1" value={form.period1} onChange={(v) => set('period1', v)} />
      <Field label="Period 2" value={form.period2} onChange={(v) => set('period2', v)} />
      <Field label="Period 3" value={form.period3} onChange={(v) => set('period3', v)} />
      <Field label="Period 4" value={form.period4} onChange={(v) => set('period4', v)} />

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-400">Period 5 Type</label>
        <div className="flex gap-3">
          {(['5A', '5B'] as Period5Type[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => set('period5Type', opt)}
              className={`flex-1 rounded-xl border py-3.5 font-display text-lg font-black transition active:scale-95 ${
                form.period5Type === opt
                  ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                  : 'border-ink-600 bg-ink-800 text-ink-400'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <Field label={`Period ${form.period5Type}`} value={form.period5} onChange={(v) => set('period5', v)} />
      <Field label="Period 6" value={form.period6} onChange={(v) => set('period6', v)} />
      <Field label="Period 7" value={form.period7} onChange={(v) => set('period7', v)} />

      {touched && error && (
        <p className="rounded-xl bg-it-deep/30 px-3 py-2 text-sm text-it-bright">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!allFilled || busy}
        className="w-full rounded-xl bg-safe py-3.5 font-display text-lg font-black text-white transition active:scale-95 disabled:opacity-40"
      >
        {busy ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}
