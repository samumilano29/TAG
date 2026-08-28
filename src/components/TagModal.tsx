import { useState } from 'react';
import { X, Hand, AlertTriangle } from 'lucide-react';
import type { GameSnapshot, Player } from '@/lib/types';
import { taggableTargets } from '@/lib/selectors';

interface Props {
  snapshot: GameSnapshot;
  me: Player;
  onClose: () => void;
  onTag: (targetId: string) => Promise<void>;
}

export function TagModal({ snapshot, me, onClose, onTag }: Props) {
  const targets = taggableTargets(snapshot, me.id);
  const [confirmTarget, setConfirmTarget] = useState<Player | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitTag = async () => {
    if (!confirmTarget) return;
    setBusy(true);
    setError(null);
    try {
      await onTag(confirmTarget.id);
      onClose();
    } catch (e) {
      const code = (e as any)?.code;
      setError(
        code === 'no_tag_back'
          ? 'NO TAG BACK — you cannot tag the player who just tagged you.'
          : 'Could not send the tag. Try again.',
      );
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-md animate-slide-down flex-col rounded-3xl border border-ink-700 bg-ink-900">
        <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
          <div>
            <h2 className="font-display text-2xl font-black text-white">TAG SOMEONE</h2>
            <p className="text-xs text-ink-500">Pick the safe player you just touched.</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-ink-800 p-2 text-ink-300 active:scale-90">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="mx-5 mt-4 rounded-xl bg-it-deep/30 px-3 py-2 text-sm text-it-bright">{error}</p>}

        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-5">
          {targets.length === 0 && (
            <p className="col-span-2 py-8 text-center text-sm text-ink-500">No taggable players right now.</p>
          )}
          {targets.map((p) => (
            <button
              key={p.id}
              onClick={() => setConfirmTarget(p)}
              disabled={!!busy}
              className="flex h-20 items-center justify-center gap-2 rounded-2xl border border-ink-700 bg-ink-800 font-display text-lg font-black text-white transition hover:border-safe active:scale-95 disabled:opacity-50"
            >
              <Hand className="h-4 w-4 text-safe" /> {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tagger confirmation */}
      {confirmTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-5">
          <div className="w-full max-w-sm animate-scale-in rounded-3xl border-2 border-it/50 bg-ink-900 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-it/20">
              <AlertTriangle className="h-8 w-8 text-it-bright" />
            </div>
            <h2 className="mt-4 font-display text-3xl font-black text-white">TAG {confirmTarget.name.toUpperCase()}?</h2>
            <p className="mt-2 text-sm text-ink-300">
              Are you sure you tagged <span className="font-bold text-white">{confirmTarget.name}</span>?
            </p>
            <p className="mt-1 text-xs text-ink-500">This is final — they will become IT immediately.</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                disabled={busy}
                className="flex-1 rounded-xl border border-ink-600 py-3 font-semibold text-ink-200 active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitTag}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-it py-3 font-bold text-white active:scale-95 disabled:opacity-50"
              >
                <Hand className="h-4 w-4" /> {busy ? 'Tagging…' : 'Confirm Tag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
