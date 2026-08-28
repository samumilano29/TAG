import { useState } from 'react';
import { X, Check, Lock, UserPlus, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Player, PlayerRank, PlayerJoinRequest, PlayerGrade } from '@/lib/types';
import { api } from '@/lib/api';
import { getDeviceId } from '@/lib/device';

const RANK_COLORS: Record<PlayerRank, string> = {
  Unranked: 'text-ink-500',
  Bronze: 'text-orange-400',
  Silver: 'text-ink-300',
  Gold: 'text-pending-bright',
  Platinum: 'text-blue-400',
  Diamond: 'text-cyan-300',
  Champion: 'text-purple-400',
  Legend: 'text-pending-bright',
};

const GRADES: PlayerGrade[] = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

interface Props {
  players: Player[];
  joinRequests: PlayerJoinRequest[];
  onClaim: (player: Player) => Promise<void>;
  onAdminLogin: (pin: string) => void;
}

export function PlayerSelect({ players, joinRequests, onClaim, onAdminLogin }: Props) {
  const [selected, setSelected] = useState<Player | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRequest, setShowRequest] = useState(false);

  const myDeviceId = getDeviceId();
  const myRequest = joinRequests.find((r) => r.requestedDeviceId === myDeviceId);

  const confirm = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await onClaim(selected);
    } catch (e) {
      const code = (e as any)?.code;
      setError(
        code === 'already_claimed'
          ? 'Someone is already using this name on another device. Ask the admin to reset it.'
          : 'Could not select this player. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-bg min-h-screen px-5 pt-12 pb-10">
      <div className="mx-auto max-w-md">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.35em] text-blue-400">TAG!</p>
        <h1 className="mt-3 text-center font-display text-5xl font-black text-white">WHO ARE YOU?</h1>
        <p className="mt-3 text-center text-sm text-ink-500">Tap your name to join the game.</p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {players.filter((p) => p.status !== 'eliminated').map((p) => {
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`relative flex h-24 items-center justify-center rounded-2xl border px-3 text-center font-display text-xl font-black transition active:scale-95 border-ink-700 bg-ink-800 text-white hover:border-blue-500 hover:bg-ink-700`}
              >
                {p.name}
                {p.rank !== 'Unranked' && (
                  <span className={`absolute right-2 top-2 text-[10px] font-black uppercase ${RANK_COLORS[p.rank]}`}>
                    {p.rank}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Join request status */}
        {myRequest && (
          <RequestStatusCard request={myRequest} />
        )}

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            onClick={() => setShowRequest(true)}
            className="flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-5 py-2.5 text-sm font-bold text-blue-400 transition active:scale-95"
          >
            <UserPlus className="h-4 w-4" /> Request to Join
          </button>

          <AdminLogin onAdminLogin={onAdminLogin} />
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-sm animate-slide-down rounded-3xl border border-ink-700 bg-ink-900 p-6 text-center">
            <h2 className="font-display text-3xl font-black text-white">
              ARE YOU {selected.name.toUpperCase()}?
            </h2>
            <p className="mt-2 text-sm text-ink-500">Your choice is saved on this device.</p>
            {error && <p className="mt-4 rounded-xl bg-it-deep/30 px-3 py-2 text-sm text-it-bright">{error}</p>}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setSelected(null);
                  setError(null);
                }}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-ink-600 py-3 font-semibold text-ink-200 transition active:scale-95"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                onClick={confirm}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-safe py-3 font-semibold text-white transition active:scale-95 disabled:opacity-60"
              >
                <Check className="h-4 w-4" /> {busy ? 'Saving…' : "Yes, that's me"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequest && (
        <RequestJoinModal
          existingPlayerNames={players.map((p) => p.name)}
          pendingRequestNames={joinRequests.filter((r) => r.status === 'pending').map((r) => r.name)}
          onCancel={() => setShowRequest(false)}
          onSubmit={async (name, grade) => {
            await api.requestJoin(name, grade);
            setShowRequest(false);
          }}
        />
      )}
    </div>
  );
}

function RequestStatusCard({ request }: { request: PlayerJoinRequest }) {
  if (request.status === 'approved') {
    return (
      <div className="mt-5 rounded-2xl border border-safe/40 bg-safe-deep/15 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-safe-bright" />
          <p className="font-display text-sm font-black text-safe-bright">APPROVED</p>
        </div>
        <p className="mt-1 text-xs text-ink-300">
          {request.name} — you can now select your name to join the game.
        </p>
      </div>
    );
  }
  if (request.status === 'rejected') {
    return (
      <div className="mt-5 rounded-2xl border border-it/40 bg-it-deep/15 p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-it-bright" />
          <p className="font-display text-sm font-black text-it-bright">REQUEST DECLINED</p>
        </div>
        <p className="mt-1 text-xs text-ink-300">
          {request.name} — your request was not approved. You may submit a new request.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-5 rounded-2xl border border-pending/40 bg-pending/10 p-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-pending-bright" />
        <p className="font-display text-sm font-black text-pending-bright">JOIN REQUEST</p>
      </div>
      <p className="mt-1 text-xs text-ink-300">
        {request.name} — Pending Admin Approval
      </p>
    </div>
  );
}

function RequestJoinModal({
  existingPlayerNames,
  pendingRequestNames,
  onCancel,
  onSubmit,
}: {
  existingPlayerNames: string[];
  pendingRequestNames: string[];
  onCancel: () => void;
  onSubmit: (name: string, grade: PlayerGrade) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<PlayerGrade | ''>('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setLocalError('Name cannot be empty.'); return; }
    if (!grade) { setLocalError('Please select a grade.'); return; }

    const lower = trimmed.toLowerCase();
    if (existingPlayerNames.some((n) => n.toLowerCase() === lower)) {
      setLocalError('That name is already being used.');
      return;
    }
    if (pendingRequestNames.some((n) => n.toLowerCase() === lower)) {
      setLocalError('Your request is waiting for Admin approval.');
      return;
    }

    setLocalError(null);
    setServerError(null);
    setBusy(true);
    try {
      await onSubmit(trimmed, grade);
      setSuccess(true);
    } catch (e: any) {
      const code = e?.code;
      setServerError(
        code === 'name_exists'
          ? 'That name is already being used.'
          : code === 'request_pending'
            ? 'Your request is waiting for Admin approval.'
            : 'Could not send request. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-5">
        <div className="w-full max-w-sm animate-scale-in rounded-3xl border border-safe/50 bg-ink-900 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-safe/20">
            <CheckCircle2 className="h-8 w-8 text-safe-bright" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-black text-white">REQUEST SENT</h2>
          <p className="mt-2 text-sm text-ink-300">Your request has been sent to the Admin.</p>
          <button
            onClick={onCancel}
            className="mt-6 w-full rounded-xl bg-safe py-3 font-bold text-white active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-5">
      <div className="w-full max-w-sm animate-scale-in rounded-3xl border border-ink-700 bg-ink-900 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-400" />
            <h2 className="font-display text-2xl font-black text-white">REQUEST TO JOIN</h2>
          </div>
          <button onClick={onCancel} className="rounded-full bg-ink-800 p-2 text-ink-400 active:scale-90">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-400">Player Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1.5 w-full rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-400">Grade</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={`rounded-xl border py-2.5 text-sm font-bold transition active:scale-95 ${
                    grade === g
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                      : 'border-ink-600 bg-ink-800 text-ink-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {(localError || serverError) && (
            <div className="rounded-xl border border-it/40 bg-it-deep/20 px-3 py-2.5">
              <p className="text-sm font-bold text-it-bright">
                {serverError ? 'REQUEST ALREADY PENDING' : 'PLAYER ALREADY EXISTS'}
              </p>
              <p className="mt-0.5 text-xs text-ink-300">{localError || serverError}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-ink-600 py-3 font-semibold text-ink-200 active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 font-bold text-white active:scale-95 disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminLogin({ onAdminLogin }: { onAdminLogin: (pin: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!pin) return;
    setBusy(true);
    setError(null);
    try {
      await api.admin('start_day', pin);
      onAdminLogin(pin);
    } catch (e: any) {
      if (e?.message === 'already_running' || e?.message === 'unauthorized') {
        if (e?.message === 'already_running') {
          onAdminLogin(pin);
          return;
        }
        setError('Wrong pin. Try again.');
      } else {
        onAdminLogin(pin);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-semibold text-ink-500 transition hover:text-ink-300 active:scale-95"
      >
        <Lock className="h-4 w-4" /> Admin login
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5">
          <div className="w-full max-w-sm animate-scale-in rounded-3xl border border-ink-700 bg-ink-900 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-ink-300" />
                <h2 className="font-display text-2xl font-black text-white">Admin</h2>
              </div>
              <button onClick={() => { setOpen(false); setPin(''); setError(null); }} className="rounded-full bg-ink-800 p-2 text-ink-400 active:scale-90">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm text-ink-400">Enter the admin pin to manage the game.</p>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Pin"
              className="mt-4 w-full rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-white outline-none focus:border-blue-500"
            />
            {error && <p className="mt-3 text-sm text-it-bright">{error}</p>}
            <button
              onClick={submit}
              disabled={!pin || busy}
              className="mt-4 w-full rounded-xl bg-blue-500 py-3 font-bold text-white active:scale-95 disabled:opacity-50"
            >
              {busy ? 'Checking…' : 'Unlock'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
