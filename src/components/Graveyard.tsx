import { useState } from 'react';
import { Skull, Swords, Clock, Check, X, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { GameSnapshot, Player, Revive, PlayerGrade } from '@/lib/types';
import { api } from '@/lib/api';
import { playerById } from '@/lib/selectors';

interface Props {
  snapshot: GameSnapshot;
  me: Player;
}

export function Graveyard({ snapshot, me }: Props) {
  const [showRevivePicker, setShowRevivePicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const eliminated = snapshot.players
    .filter((p) => p.status === 'eliminated')
    .sort((a, b) => (a.eliminated_day ?? 0) - (b.eliminated_day ?? 0));

  const myRevive = getMyRevive(snapshot.revives ?? [], me.id);
  const iAmEliminated = me.status === 'eliminated';

  const handleRequestRevive = async (opponentId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.requestRevive(me.id, opponentId);
      setShowRevivePicker(false);
      setSuccess('Revive request sent!');
    } catch (e: any) {
      setError(
        e?.code === 'revive_already_active'
          ? 'You or your opponent already have an active revive.'
          : 'Could not send revive request. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptRevive = async (reviveId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.acceptRevive(reviveId, me.id);
      setSuccess('Revive accepted! Waiting for admin result.');
    } catch (e: any) {
      setError('Could not accept revive. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeclineRevive = async (reviveId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.declineRevive(reviveId, me.id);
      setSuccess('Revive request declined.');
    } catch (e: any) {
      setError('Could not decline revive. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 pb-6 pt-20">
      <div className="flex items-center gap-2">
        <Skull className="h-6 w-6 text-ink-400" />
        <h1 className="font-display text-4xl font-black text-white">GRAVEYARD</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-it/40 bg-it-deep/20 px-3 py-2.5 text-sm text-it-bright">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-safe/40 bg-safe-deep/15 px-3 py-2.5 text-sm text-safe-bright">{success}</div>
      )}

      {/* My revive status (if eliminated) */}
      {iAmEliminated && (
        <MyReviveStatus
          me={me}
          myRevive={myRevive}
          snapshot={snapshot}
          busy={busy}
          onRequestRevive={() => { setShowRevivePicker(true); setError(null); }}
          onAccept={handleAcceptRevive}
          onDecline={handleDeclineRevive}
        />
      )}

      {/* Eliminated players list */}
      {eliminated.length === 0 ? (
        <p className="text-center text-sm text-ink-500">No eliminated players yet.</p>
      ) : (
        <div className="space-y-2">
          {eliminated.map((p) => {
            const playerRevive = getMyRevive(snapshot.revives ?? [], p.id);
            const reviveStatus = getReviveStatusLabel(playerRevive, p.id);
            const isMe = p.id === me.id;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-4 ${
                  isMe
                    ? 'border-blue-500/40 bg-blue-500/5'
                    : 'border-ink-700 bg-ink-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-black text-white">{p.name}</p>
                    <p className="text-xs text-ink-500">
                      {p.grade ?? '—'} · Eliminated — Day {p.eliminated_day ?? '?'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black uppercase ${reviveStatus.color}`}>
                      {reviveStatus.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Revive opponent picker modal */}
      {showRevivePicker && (
        <RevivePickerModal
          snapshot={snapshot}
          me={me}
          busy={busy}
          onCancel={() => setShowRevivePicker(false)}
          onSelect={handleRequestRevive}
        />
      )}
    </div>
  );
}

function getMyRevive(revives: Revive[], playerId: string): Revive | undefined {
  return revives.find(
    (r) =>
      (r.challengerPlayerId === playerId || r.opponentPlayerId === playerId) &&
      ['pending', 'accepted'].includes(r.status),
  );
}

function getReviveStatusLabel(revive: Revive | undefined, playerId: string): { label: string; color: string } {
  if (!revive) return { label: 'Available for Revive', color: 'text-ink-400' };
  if (revive.status === 'accepted') return { label: 'Revive Active', color: 'text-pending-bright' };
  if (revive.status === 'pending') {
    if (revive.opponentPlayerId === playerId) return { label: 'Revive Request', color: 'text-blue-400' };
    return { label: 'Request Pending', color: 'text-pending-bright' };
  }
  return { label: 'Available for Revive', color: 'text-ink-400' };
}

function MyReviveStatus({
  me,
  myRevive,
  snapshot,
  busy,
  onRequestRevive,
  onAccept,
  onDecline,
}: {
  me: Player;
  myRevive: Revive | undefined;
  snapshot: GameSnapshot;
  busy: boolean;
  onRequestRevive: () => void;
  onAccept: (reviveId: string) => Promise<void>;
  onDecline: (reviveId: string) => Promise<void>;
}) {
  if (!myRevive) {
    // Check if there are eligible opponents
    const eligible = snapshot.players.filter(
      (p) =>
        p.status === 'eliminated' &&
        p.id !== me.id &&
        !getMyRevive(snapshot.revives ?? [], p.id),
    );

    return (
      <div className="rounded-2xl border border-ink-600 bg-ink-800 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Revive Status</p>
        {eligible.length > 0 ? (
          <>
            <p className="mt-2 font-display text-xl font-black text-safe-bright">ELIGIBLE FOR REVIVE</p>
            <button
              onClick={onRequestRevive}
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-safe py-3 font-bold text-white active:scale-95 disabled:opacity-50"
            >
              <Swords className="h-5 w-5" /> REQUEST REVIVE
            </button>
          </>
        ) : (
          <p className="mt-2 font-display text-xl font-black text-ink-400">NOT CURRENTLY ELIGIBLE</p>
        )}
      </div>
    );
  }

  if (myRevive.status === 'accepted') {
    const challenger = playerById(snapshot, myRevive.challengerPlayerId);
    const opponent = playerById(snapshot, myRevive.opponentPlayerId);
    return (
      <div className="rounded-2xl border-2 border-pending/50 bg-pending/10 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-pending-bright">Revive Active</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <span className="font-display text-2xl font-black text-white">{challenger?.name}</span>
          <span className="text-lg font-black text-pending-bright">VS</span>
          <span className="font-display text-2xl font-black text-white">{opponent?.name}</span>
        </div>
        <p className="mt-2 text-xs text-ink-400">Grade: {myRevive.grade}</p>
        <p className="mt-1 text-sm text-ink-300">Waiting for admin result…</p>
      </div>
    );
  }

  // Pending — check if I'm the opponent (received a challenge) or the challenger
  if (myRevive.opponentPlayerId === me.id) {
    const challenger = playerById(snapshot, myRevive.challengerPlayerId);
    return (
      <div className="rounded-2xl border-2 border-blue-500/50 bg-blue-500/10 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Revive Request</p>
        <p className="mt-2 text-sm text-white">
          <span className="font-bold">{challenger?.name}</span> challenged you to a Revive.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => onDecline(myRevive.id)}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-it/50 py-3 font-bold text-it-bright active:scale-95 disabled:opacity-50"
          >
            <X className="h-4 w-4" /> Decline
          </button>
          <button
            onClick={() => onAccept(myRevive.id)}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-safe py-3 font-bold text-white active:scale-95 disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Accept
          </button>
        </div>
      </div>
    );
  }

  // I'm the challenger, waiting for response
  return (
    <div className="rounded-2xl border border-pending/40 bg-pending/10 p-5 text-center">
      <Clock className="mx-auto h-6 w-6 text-pending-bright" />
      <p className="mt-2 font-display text-lg font-black text-pending-bright">REVIVE REQUEST PENDING</p>
      <p className="mt-1 text-sm text-ink-400">
        Waiting for {playerById(snapshot, myRevive.opponentPlayerId)?.name} to accept.
      </p>
    </div>
  );
}

function RevivePickerModal({
  snapshot,
  me,
  busy,
  onCancel,
  onSelect,
}: {
  snapshot: GameSnapshot;
  me: Player;
  busy: boolean;
  onCancel: () => void;
  onSelect: (opponentId: string) => Promise<void>;
}) {
  const eligible = snapshot.players.filter(
    (p) =>
      p.status === 'eliminated' &&
      p.id !== me.id &&
      !getMyRevive(snapshot.revives ?? [], p.id),
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-5">
      <div className="w-full max-w-sm animate-scale-in rounded-3xl border border-ink-700 bg-ink-900 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-safe-bright" />
            <h2 className="font-display text-2xl font-black text-white">REQUEST REVIVE</h2>
          </div>
          <button onClick={onCancel} className="rounded-full bg-ink-800 p-2 text-ink-400 active:scale-90">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-ink-400">Choose an opponent:</p>

        {eligible.length === 0 ? (
          <p className="mt-4 text-center text-sm text-ink-500">
            No eligible opponents available.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {eligible.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                disabled={busy}
                className="flex w-full items-center justify-between rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
              >
                <span>{p.name}</span>
                <span className="text-xs text-ink-500">
                  {p.grade ?? '—'} · Day {p.eliminated_day ?? '?'}
                </span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onCancel}
          className="mt-4 w-full rounded-xl border border-ink-600 py-3 font-semibold text-ink-200 active:scale-95"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
