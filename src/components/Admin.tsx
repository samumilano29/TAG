import { useState } from 'react';
import {
  Lock,
  Play,
  Square,
  Pause,
  PlayCircle,
  RotateCcw,
  Undo2,
  Check,
  X,
  RefreshCw,
  Megaphone,
  Trophy,
  UserCog,
  UserPlus,
  Globe,
  Trash2,
  AlertTriangle,
  Award,
  Zap,
  Ban,
  CheckCircle,
  Plus,
  Swords,
  FileText,
  CalendarCheck,
  Clock,
  Users,
} from 'lucide-react';
import type { GameSnapshot, Player, PlayerRank, PlayerGrade, PlayerJoinRequest, Revive, AttendanceStatus } from '@/lib/types';
import { api } from '@/lib/api';
import { playerById } from '@/lib/selectors';

const RANKS: PlayerRank[] = ['Unranked', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Champion', 'Legend'];
const GRADES: PlayerGrade[] = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

const RANK_COLORS: Record<PlayerRank, string> = {
  Unranked: 'text-ink-400',
  Bronze: 'text-orange-400',
  Silver: 'text-ink-300',
  Gold: 'text-pending-bright',
  Platinum: 'text-blue-400',
  Diamond: 'text-cyan-300',
  Champion: 'text-purple-400',
  Legend: 'text-pending-bright',
};

interface Props {
  snapshot: GameSnapshot;
  onClose: () => void;
  onDone: () => void;
  onPinEntered?: (pin: string) => void;
}

export function Admin({ snapshot, onClose, onDone, onPinEntered }: Props) {
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [addPlayerError, setAddPlayerError] = useState<string | null>(null);
  const [rankTarget, setRankTarget] = useState<Player | null>(null);
  const [rankError, setRankError] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<PlayerJoinRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PlayerJoinRequest | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reviveWinnerTarget, setReviveWinnerTarget] = useState<Revive | null>(null);
  const [reviveBusy, setReviveBusy] = useState(false);
  const [reviveError, setReviveError] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>('present');
  const [editTimeTarget, setEditTimeTarget] = useState<{ playerId: string; leftAt: string } | null>(null);

  const run = async (action: string, payload: Record<string, unknown> = {}) => {
    setBusy(action);
    setError(null);
    setMsg(null);
    try {
      await api.admin(action, pin, payload);
      setMsg('Done.');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.admin('delete_player', pin, { player_id: deleteTarget.id });
      setDeleteSuccess(`${deleteTarget.name} has been removed from the game.`);
      setDeleteTarget(null);
      onDone();
    } catch (e) {
      const code = (e as any)?.code;
      setDeleteError(
        code === 'player_is_it'
          ? 'This player is currently IT. Transfer IT to another player before deleting them.'
          : 'Could not delete player. Try again.',
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!authed) {
    return (
      <div className="app-bg flex min-h-screen items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-3xl border border-ink-700 bg-ink-900 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-ink-300" />
              <h2 className="font-display text-2xl font-black text-white">Admin</h2>
            </div>
            <button onClick={onClose} className="rounded-full bg-ink-800 p-2 text-ink-400 active:scale-90">
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
            onClick={() => {
              if (!pin) return;
              setBusy('auth');
              api
                .admin('start_day', pin)
                .then(() => {
                  setAuthed(true);
                  setError(null);
                  onPinEntered?.(pin);
                })
                .catch(() => {
                  // A pin check that fails with "already_running" means the pin is valid.
                  setAuthed(true);
                  setError(null);
                  onPinEntered?.(pin);
                })
                .finally(() => setBusy(null));
            }}
            disabled={!pin || !!busy}
            className="mt-4 w-full rounded-xl bg-blue-500 py-3 font-bold text-white active:scale-95 disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </div>
      </div>
    );
  }

  const today = snapshot.today;
  const activePlayers = snapshot.players.filter((p) => p.status === 'active');
  const isFinalPending = today?.is_final && today.status === 'final_pending';

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 pb-6 pt-20">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-black text-white">ADMIN</h1>
        <button onClick={onClose} className="rounded-full bg-ink-800 p-2 text-ink-400 active:scale-90">
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && <p className="rounded-xl bg-it-deep/30 px-3 py-2 text-sm text-it-bright">{error}</p>}
      {msg && <p className="rounded-xl bg-safe-deep/20 px-3 py-2 text-sm text-safe-bright">{msg}</p>}

      {/* Day controls */}
      <Section title="Day controls">
        <AdminBtn icon={Play} label="Start day now" loading={busy === 'start_day'} onClick={() => run('start_day')} />
        <AdminBtn icon={Square} label="End day now" loading={busy === 'end_day'} onClick={() => run('end_day')} />
        {snapshot.competition.status === 'paused' ? (
          <AdminBtn icon={PlayCircle} label="Resume tagging" loading={busy === 'resume'} onClick={() => run('resume')} />
        ) : (
          <AdminBtn icon={Pause} label="Pause tagging" loading={busy === 'pause'} onClick={() => run('pause')} />
        )}
      </Section>

      {/* Attendance */}
      <Section title="Attendance">
        <AttendanceSection
          snapshot={snapshot}
          pin={pin}
          busy={busy}
          bulkMode={bulkMode}
          setBulkMode={setBulkMode}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          bulkStatus={bulkStatus}
          setBulkStatus={setBulkStatus}
          editTimeTarget={editTimeTarget}
          setEditTimeTarget={setEditTimeTarget}
          run={run}
          onDone={onDone}
        />
      </Section>

      {/* Player Requests */}
      {(() => {
        const pending = (snapshot.joinRequests ?? []).filter((r) => r.status === 'pending');
        return (
          <Section title="Player Requests">
            {pending.length === 0 && (
              <p className="text-sm text-ink-500">No pending player requests.</p>
            )}
            {pending.map((r) => (
              <div key={r.id} className="rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="font-semibold text-white">{r.name}</span>
                    <p className="text-xs text-ink-500">{r.grade}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => { setRejectTarget(r); setRequestError(null); }}
                      disabled={!!busy || requestBusy}
                      className="rounded-lg border border-it/40 bg-it-deep/20 px-2.5 py-1.5 text-xs font-bold text-it-bright active:scale-95 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => { setApproveTarget(r); setRequestError(null); }}
                      disabled={!!busy || requestBusy}
                      className="rounded-lg border border-safe/40 bg-safe-deep/15 px-2.5 py-1.5 text-xs font-bold text-safe-bright active:scale-95 disabled:opacity-50"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </Section>
        );
      })()}

      {/* Active Revives */}
      {(() => {
        const activeRevives = (snapshot.revives ?? []).filter((r) => r.status === 'accepted');
        return (
          <Section title="Active Revives">
            {activeRevives.length === 0 && (
              <p className="text-sm text-ink-500">No active revives.</p>
            )}
            {activeRevives.map((r) => {
              const challenger = playerById(snapshot, r.challengerPlayerId);
              const opponent = playerById(snapshot, r.opponentPlayerId);
              return (
                <div key={r.id} className="rounded-xl border border-pending/40 bg-pending/10 px-3 py-3">
                  <div className="text-center">
                    <p className="font-display text-lg font-black text-white">{challenger?.name} VS {opponent?.name}</p>
                    <p className="text-xs text-ink-500">{challenger?.grade} vs {opponent?.grade}</p>
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <button
                      onClick={() => { setReviveWinnerTarget(r); setReviveError(null); }}
                      disabled={!!busy || reviveBusy}
                      className="rounded-lg border border-safe/40 bg-safe-deep/15 py-2 text-xs font-bold text-safe-bright active:scale-95 disabled:opacity-50"
                    >
                      {challenger?.name} Won
                    </button>
                    <button
                      onClick={() => { setReviveWinnerTarget({ ...r, _winnerId: r.opponentPlayerId } as any); setReviveError(null); }}
                      disabled={!!busy || reviveBusy}
                      className="rounded-lg border border-safe/40 bg-safe-deep/15 py-2 text-xs font-bold text-safe-bright active:scale-95 disabled:opacity-50"
                    >
                      {opponent?.name} Won
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await api.admin('cancel_revive', pin, { revive_id: r.id });
                          onDone();
                        } catch (e) {
                          setError('Could not cancel revive.');
                        }
                      }}
                      disabled={!!busy || reviveBusy}
                      className="rounded-lg border border-it/40 bg-it-deep/20 py-2 text-xs font-bold text-it-bright active:scale-95 disabled:opacity-50"
                    >
                      Cancel Revive
                    </button>
                  </div>
                </div>
              );
            })}
          </Section>
        );
      })()}

      {/* Player Management */}
      <Section title="Player Management">
        <button
          onClick={() => { setShowAddPlayer(true); setAddPlayerError(null); }}
          disabled={!!busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" /> ADD PLAYER
        </button>

        {activePlayers.length === 0 && (
          <p className="text-center text-sm text-ink-500">No active players in the game.</p>
        )}
        {activePlayers.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5"
          >
            <div className="min-w-0">
              <span className="font-semibold text-white">{p.name}</span>
              <p className="text-xs text-ink-500">
                Rank: <span className={`font-bold ${RANK_COLORS[p.rank] ?? 'text-ink-400'}`}>{p.rank}</span>
                {p.grade && <span className="ml-1.5">· {p.grade}</span>}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={() => { setRankTarget(p); setRankError(null); }}
                disabled={!!busy || !!deleteBusy}
                className="flex items-center gap-1 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1.5 text-xs font-bold text-blue-400 active:scale-95 disabled:opacity-50"
              >
                <Award className="h-3.5 w-3.5" /> Rank
              </button>
              <button
                onClick={() => { setDeleteTarget(p); setDeleteError(null); }}
                disabled={!!busy || !!deleteBusy}
                className="flex items-center gap-1.5 rounded-lg border border-it/40 bg-it-deep/20 px-2.5 py-1.5 text-xs font-bold text-it-bright active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </Section>

      {/* Final day */}
      {isFinalPending && (
        <Section title="Final day — pick the winner">
          {activePlayers.map((p) => (
            <AdminBtn
              key={p.id}
              icon={Trophy}
              label={`Declare ${p.name} winner`}
              loading={busy === 'final_winner'}
              onClick={() => run('final_winner', { player_id: p.id })}
            />
          ))}
        </Section>
      )}

      {/* Change IT */}
      {today && today.status === 'running' && (
        <Section title="Change current IT">
          {(() => {
            const current = snapshot.activeTags.find((t) => t.tag_slot === 1);
            const curName = current ? playerById(snapshot, current.current_it_player_id)?.name : '—';
            return (
              <div className="rounded-xl border border-ink-700 bg-ink-800 p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-ink-500">
                  Now IT: <span className="text-white">{curName}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activePlayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => run('set_it', { player_id: p.id })}
                      disabled={!!busy}
                      className="rounded-lg bg-ink-700 px-2.5 py-1.5 text-xs font-semibold text-white active:scale-95 disabled:opacity-50"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </Section>
      )}

      {/* Recent tags — undo */}
      <Section title="Undo a recent tag">
        {snapshot.recentTags.filter((t) => t.status === 'confirmed').slice(0, 5).map((t) => (
          <AdminBtn
            key={t.id}
            icon={Undo2}
            label={`Undo: ${playerById(snapshot, t.tagger_id)?.name} → ${playerById(snapshot, t.tagged_player_id)?.name}`}
            loading={busy === 'undo_tag'}
            onClick={() => run('undo_tag', { tag_id: t.id })}
          />
        ))}
        {snapshot.recentTags.filter((t) => t.status === 'confirmed').length === 0 && (
          <p className="text-sm text-ink-500">No confirmed tags to undo.</p>
        )}
      </Section>

      {/* Restore player */}
      <Section title="Restore eliminated player">
        {snapshot.players
          .filter((p) => p.status === 'eliminated')
          .map((p) => (
            <AdminBtn
              key={p.id}
              icon={RotateCcw}
              label={`Restore ${p.name}`}
              loading={busy === 'restore_player'}
              onClick={() => run('restore_player', { player_id: p.id })}
            />
          ))}
        {snapshot.players.filter((p) => p.status === 'eliminated').length === 0 && (
          <p className="text-sm text-ink-500">No eliminated players.</p>
        )}
      </Section>

      {/* Rerun elimination */}
      {today && today.status === 'ended' && (
        <Section title="Re-run elimination">
          <AdminBtn
            icon={RefreshCw}
            label="Re-run today's random selection"
            loading={busy === 'rerun_elimination'}
            onClick={() => run('rerun_elimination')}
          />
        </Section>
      )}

      {/* Reset device */}
      <Section title="Reset a player's device">
        {snapshot.players.map((p) => (
          <button
            key={p.id}
            onClick={() => run('reset_device', { player_id: p.id })}
            disabled={!!busy}
            className="flex w-full items-center justify-between rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm active:scale-[0.98] disabled:opacity-50"
          >
            <span className="font-semibold text-white">{p.name}</span>
            <span className="text-xs text-ink-500">
              {p.claimed_device_id ? 'Reset' : 'Free'}
            </span>
          </button>
        ))}
      </Section>

      {/* Custom announcement */}
      <Section title="Custom announcement">
        <AnnounceForm onSend={(title, message) => run('announce', { title, message })} busy={!!busy} />
      </Section>

      {/* Event Management */}
      <Section title="Event Management">
        {(() => {
          const todayEvent = snapshot.gameEvents?.find((e) => e.dailyGameId === today?.id);
          if (!todayEvent) {
            return <p className="text-sm text-ink-500">No random event today.</p>;
          }
          const participants = todayEvent.selectedPlayerIds.map((id) => playerById(snapshot, id)).filter(Boolean) as Player[];
          const winner = todayEvent.winnerPlayerId ? playerById(snapshot, todayEvent.winnerPlayerId) : null;
          return (
            <div className="space-y-3">
              <div className="rounded-xl border border-ink-600 bg-ink-900 px-3 py-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-pending-bright" />
                  <span className="font-display text-lg font-black text-white">{todayEvent.eventType.replace(/_/g, ' ')}</span>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  Status: <span className="font-bold text-white">{todayEvent.status}</span>
                </p>
                {participants.length > 0 && (
                  <p className="mt-1 text-xs text-ink-500">
                    Participants: <span className="font-semibold text-white">{participants.map((p) => p.name).join(' vs ')}</span>
                  </p>
                )}
                {winner && (
                  <p className="mt-1 text-xs text-ink-500">
                    Winner: <span className="font-bold text-safe-bright">{winner.name}</span>
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-500">Reward: +{todayEvent.rewardXp} XP</p>
              </div>
              {todayEvent.status !== 'completed' && (
                <>
                  <AdminBtn
                    icon={CheckCircle}
                    label="Force complete (pick winner below)"
                    loading={busy === 'force_complete_event'}
                    onClick={() => {
                      const winnerId = prompt('Enter winner player ID (or leave empty for no winner):');
                      if (winnerId !== null) {
                        run('force_complete_event', { event_id: todayEvent.id, winner_player_id: winnerId || null });
                      }
                    }}
                  />
                  <AdminBtn
                    icon={Ban}
                    label="Cancel event"
                    loading={busy === 'cancel_event'}
                    onClick={() => run('cancel_event', { event_id: todayEvent.id })}
                  />
                </>
              )}
            </div>
          );
        })()}
      </Section>

      {/* Special Event Creator */}
      <Section title="Create Special Event">
        <SpecialEventCreator
          players={snapshot.players}
          busy={!!busy}
          onCreate={(payload) => run('create_special_event', payload)}
        />
      </Section>

      {/* Updates Manager */}
      <Section title="Updates Manager">
        <UpdatesManager
          updates={snapshot.appUpdates ?? []}
          busy={!!busy}
          onCreate={(payload) => run('create_update', payload)}
          onDelete={(id) => run('delete_update', { update_id: id })}
        />
      </Section>

      {/* Timezone */}
      <Section title="Timezone">
        <TimezoneForm
          current={snapshot.competition.timezone}
          onSave={(tz) => run('set_timezone', { timezone: tz })}
          busy={!!busy}
        />
      </Section>

      {/* Approve request modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-5">
          <div className="w-full max-w-sm animate-scale-in rounded-3xl border-2 border-safe/50 bg-ink-900 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-safe/20">
              <UserPlus className="h-8 w-8 text-safe-bright" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-black text-white">ACCEPT PLAYER?</h2>
            <p className="mt-2 text-sm text-ink-300">
              Add <span className="font-bold text-white">{approveTarget.name}</span> to the game?
            </p>
            {requestError && (
              <p className="mt-4 text-sm text-it-bright">{requestError}</p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setApproveTarget(null); setRequestError(null); }}
                disabled={requestBusy}
                className="flex-1 rounded-xl border border-ink-600 py-3 font-semibold text-ink-200 active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setRequestBusy(true);
                  setRequestError(null);
                  try {
                    await api.admin('approve_join_request', pin, { request_id: approveTarget.id });
                    onDone();
                    setApproveTarget(null);
                  } catch (e: any) {
                    setRequestError(
                      e?.code === 'name_exists'
                        ? 'A player with this name already exists.'
                        : 'Could not approve request. Try again.',
                    );
                  } finally {
                    setRequestBusy(false);
                  }
                }}
                disabled={requestBusy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-safe py-3 font-bold text-white active:scale-95 disabled:opacity-50"
              >
                {requestBusy ? 'Accepting…' : 'Accept Player'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject request modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-5">
          <div className="w-full max-w-sm animate-scale-in rounded-3xl border-2 border-it/60 bg-ink-900 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-it/20">
              <AlertTriangle className="h-8 w-8 text-it-bright" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-black text-white">REJECT PLAYER REQUEST?</h2>
            <p className="mt-2 text-sm text-ink-300">
              Decline <span className="font-bold text-white">{rejectTarget.name}</span>'s request to join?
            </p>
            {requestError && (
              <p className="mt-4 text-sm text-it-bright">{requestError}</p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setRejectTarget(null); setRequestError(null); }}
                disabled={requestBusy}
                className="flex-1 rounded-xl border border-ink-600 py-3 font-semibold text-ink-200 active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setRequestBusy(true);
                  setRequestError(null);
                  try {
                    await api.admin('reject_join_request', pin, { request_id: rejectTarget.id });
                    onDone();
                    setRejectTarget(null);
                  } catch (e) {
                    setRequestError('Could not reject request. Try again.');
                  } finally {
                    setRequestBusy(false);
                  }
                }}
                disabled={requestBusy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-it py-3 font-bold text-white active:scale-95 disabled:opacity-50"
              >
                {requestBusy ? 'Rejecting…' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revive winner confirmation modal */}
      {reviveWinnerTarget && (() => {
        const winnerId = (reviveWinnerTarget as any)._winnerId ?? reviveWinnerTarget.challengerPlayerId;
        const winner = playerById(snapshot, winnerId);
        const loser = playerById(snapshot, winnerId === reviveWinnerTarget.challengerPlayerId ? reviveWinnerTarget.opponentPlayerId : reviveWinnerTarget.challengerPlayerId);
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-5">
            <div className="w-full max-w-sm animate-scale-in rounded-3xl border-2 border-safe/50 bg-ink-900 p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-safe/20">
                <Trophy className="h-8 w-8 text-safe-bright" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-black text-white">CONFIRM REVIVE WINNER</h2>
              <p className="mt-2 text-sm text-ink-300">
                <span className="font-bold text-safe-bright">{winner?.name}</span> wins and returns to the game.<br />
                <span className="font-bold text-it-bright">{loser?.name}</span> remains eliminated.
              </p>
              {reviveError && <p className="mt-4 text-sm text-it-bright">{reviveError}</p>}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => { setReviveWinnerTarget(null); setReviveError(null); }}
                  disabled={reviveBusy}
                  className="flex-1 rounded-xl border border-ink-600 py-3 font-semibold text-ink-200 active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setReviveBusy(true);
                    setReviveError(null);
                    try {
                      await api.admin('complete_revive', pin, { revive_id: reviveWinnerTarget.id, winner_player_id: winnerId });
                      onDone();
                      setReviveWinnerTarget(null);
                    } catch (e: any) {
                      setReviveError('Could not complete revive. Try again.');
                    } finally {
                      setReviveBusy(false);
                    }
                  }}
                  disabled={reviveBusy}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-safe py-3 font-bold text-white active:scale-95 disabled:opacity-50"
                >
                  {reviveBusy ? 'Saving…' : 'Confirm Winner'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add player modal */}
      {showAddPlayer && (
        <AddPlayerModal
          existingNames={snapshot.players.map((p) => p.name)}
          busy={!!busy}
          error={addPlayerError}
          onCancel={() => { setShowAddPlayer(false); setAddPlayerError(null); }}
          onCreate={async (name, grade) => {
            setAddPlayerError(null);
            try {
              await api.admin('add_player', pin, { name, grade });
              onDone();
              setShowAddPlayer(false);
            } catch (e: any) {
              setAddPlayerError(
                e?.code === 'name_exists'
                  ? 'A player with this name already exists.'
                  : 'Could not create player. Try again.',
              );
            }
          }}
        />
      )}

      {/* Change rank modal */}
      {rankTarget && (
        <ChangeRankModal
          player={rankTarget}
          currentRank={rankTarget.rank}
          error={rankError}
          onCancel={() => { setRankTarget(null); setRankError(null); }}
          onSelect={async (rank) => {
            setRankError(null);
            try {
              await api.admin('set_rank', pin, { player_id: rankTarget.id, rank });
              onDone();
              setRankTarget(null);
            } catch (e) {
              setRankError('Could not change rank. Try again.');
            }
          }}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-5">
          <div className="w-full max-w-sm animate-scale-in rounded-3xl border-2 border-it/60 bg-ink-900 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-it/20">
              <AlertTriangle className="h-8 w-8 text-it-bright" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-black text-white">DELETE PLAYER?</h2>
            <p className="mt-2 text-sm text-ink-300">
              Are you sure you want to permanently remove{' '}
              <span className="font-bold text-white">{deleteTarget.name}</span> from the game?
            </p>
            {deleteError && (
              <div className="mt-4 rounded-xl border border-it/40 bg-it-deep/20 px-3 py-2.5 text-left">
                <p className="text-sm font-bold text-it-bright">Cannot Delete Player</p>
                <p className="mt-0.5 text-xs text-ink-300">{deleteError}</p>
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                disabled={deleteBusy}
                className="flex-1 rounded-xl border border-ink-600 py-3 font-semibold text-ink-200 active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteBusy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-it py-3 font-bold text-white active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> {deleteBusy ? 'Deleting…' : 'Delete Player'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete success modal */}
      {deleteSuccess && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-5">
          <div className="w-full max-w-sm animate-scale-in rounded-3xl border-2 border-safe/50 bg-ink-900 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-safe/20">
              <Check className="h-8 w-8 text-safe-bright" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-black text-white">PLAYER DELETED</h2>
            <p className="mt-2 text-sm text-ink-300">{deleteSuccess}</p>
            <button
              onClick={() => setDeleteSuccess(null)}
              className="mt-6 w-full rounded-xl bg-safe py-3 font-bold text-white active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function AdminBtn({
  icon: Icon,
  label,
  onClick,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-left text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
    >
      <Icon className="h-4 w-4 text-blue-400" />
      {loading ? 'Working…' : label}
    </button>
  );
}

function AnnounceForm({ onSend, busy }: { onSend: (title: string, message: string) => void; busy: boolean }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  return (
    <div className="space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
      />
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message"
        className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
      />
      <button
        onClick={() => title && onSend(title, message)}
        disabled={busy || !title}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
      >
        <Megaphone className="h-4 w-4" /> Send
      </button>
    </div>
  );
}

function AddPlayerModal({
  existingNames,
  busy,
  error,
  onCancel,
  onCreate,
}: {
  existingNames: string[];
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onCreate: (name: string, grade: PlayerGrade) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<PlayerGrade | ''>('');
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setLocalError('Name cannot be empty.'); return; }
    if (!grade) { setLocalError('Please select a grade.'); return; }
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setLocalError('A player with this name already exists.');
      return;
    }
    setLocalError(null);
    await onCreate(trimmed, grade);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-5">
      <div className="w-full max-w-sm animate-scale-in rounded-3xl border border-ink-700 bg-ink-900 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-400" />
            <h2 className="font-display text-2xl font-black text-white">ADD PLAYER</h2>
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
              placeholder="Enter player name"
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

          <p className="text-xs text-ink-500">New players start as <span className="font-bold text-ink-300">Unranked</span>. Use Change Rank to update later.</p>

          {(localError || error) && (
            <div className="rounded-xl border border-it/40 bg-it-deep/20 px-3 py-2.5">
              <p className="text-sm font-bold text-it-bright">PLAYER ALREADY EXISTS</p>
              <p className="mt-0.5 text-xs text-ink-300">{localError || error}</p>
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
            {busy ? 'Creating…' : 'Create Player'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangeRankModal({
  player,
  currentRank,
  error,
  onCancel,
  onSelect,
}: {
  player: Player;
  currentRank: PlayerRank;
  error: string | null;
  onCancel: () => void;
  onSelect: (rank: PlayerRank) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-5">
      <div className="w-full max-w-sm animate-scale-in rounded-3xl border border-ink-700 bg-ink-900 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-400" />
            <h2 className="font-display text-2xl font-black text-white">CHANGE RANK</h2>
          </div>
          <button onClick={onCancel} className="rounded-full bg-ink-800 p-2 text-ink-400 active:scale-90">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm text-ink-400">
          <span className="font-bold text-white">{player.name}</span> is currently{' '}
          <span className={`font-bold ${RANK_COLORS[currentRank] ?? 'text-ink-400'}`}>{currentRank}</span>.
        </p>

        {error && <p className="mt-3 text-sm text-it-bright">{error}</p>}

        <div className="mt-4 space-y-2">
          {RANKS.map((r) => (
            <button
              key={r}
              onClick={() => onSelect(r)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition active:scale-95 ${
                r === currentRank
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-ink-600 bg-ink-800 text-white'
              }`}
            >
              {r}
              {r === currentRank && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimezoneForm({
  current,
  onSave,
  busy,
}: {
  current: string;
  onSave: (tz: string) => void;
  busy: boolean;
}) {
  const [tz, setTz] = useState(current);
  return (
    <div className="flex gap-2">
      <input
        value={tz}
        onChange={(e) => setTz(e.target.value)}
        className="flex-1 rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
      />
      <button
        onClick={() => onSave(tz)}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg bg-ink-700 px-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
      >
        <Globe className="h-4 w-4" /> Save
      </button>
    </div>
  );
}

function SpecialEventCreator({
  players,
  busy,
  onCreate,
}: {
  players: Player[];
  busy: boolean;
  onCreate: (payload: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('07:14');
  const [endTime, setEndTime] = useState('14:25');
  const [objective, setObjective] = useState('tag_all');
  const [rewardXp, setRewardXp] = useState('100');
  const [overrideRandom, setOverrideRandom] = useState(true);
  const [hunterIds, setHunterIds] = useState<string[]>([]);
  const [targetIds, setTargetIds] = useState<string[]>([]);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const submit = () => {
    if (!name.trim() || hunterIds.length === 0 || targetIds.length === 0) return;
    onCreate({
      name: name.trim(),
      date,
      start_time: startTime,
      end_time: endTime,
      objective,
      reward_xp: parseInt(rewardXp) || 0,
      override_random: overrideRandom,
      hunter_player_ids: hunterIds,
      target_player_ids: targetIds,
    });
    setName('');
    setHunterIds([]);
    setTargetIds([]);
  };

  return (
    <div className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Event name (e.g. 2 vs Everybody)"
        className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        />
        <input
          type="number"
          value={rewardXp}
          onChange={(e) => setRewardXp(e.target.value)}
          placeholder="Reward XP"
          className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        />
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-300">
        <input
          type="checkbox"
          checked={overrideRandom}
          onChange={(e) => setOverrideRandom(e.target.checked)}
          className="h-4 w-4 accent-blue-500"
        />
        Override random event for this day
      </label>

      <div>
        <p className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase text-pending-bright">
          <Swords className="h-3 w-3" /> Hunters
        </p>
        <div className="flex flex-wrap gap-1.5">
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => setHunterIds((l) => toggle(l, p.id))}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                hunterIds.includes(p.id)
                  ? 'bg-pending text-ink-950'
                  : 'bg-ink-900 text-ink-400'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-bold uppercase text-blue-400">Targets</p>
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => setTargetIds((l) => toggle(l, p.id))}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                targetIds.includes(p.id)
                  ? 'bg-blue-500 text-white'
                  : 'bg-ink-900 text-ink-400'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={submit}
        disabled={busy || !name.trim() || hunterIds.length === 0 || targetIds.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-2.5 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> Create Special Event
      </button>
    </div>
  );
}

function UpdatesManager({
  updates,
  busy,
  onCreate,
  onDelete,
}: {
  updates: import('@/lib/types').AppUpdate[];
  busy: boolean;
  onCreate: (payload: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [titleEn, setTitleEn] = useState('');
  const [titleEs, setTitleEs] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descEs, setDescEs] = useState('');
  const [category, setCategory] = useState('new_feature');
  const [version, setVersion] = useState('');

  const submit = () => {
    if (!titleEn.trim() || !descEn.trim()) return;
    onCreate({
      title_en: titleEn.trim(),
      title_es: titleEs.trim() || titleEn.trim(),
      description_en: descEn.trim(),
      description_es: descEs.trim() || descEn.trim(),
      category,
      version: version.trim() || null,
      published: true,
    });
    setTitleEn('');
    setTitleEs('');
    setDescEn('');
    setDescEs('');
    setVersion('');
  };

  const categories = ['new_feature', 'rule', 'event', 'bug', 'improvement'];

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl border border-ink-700 bg-ink-900 p-3">
        <p className="text-xs font-bold uppercase text-blue-400">New Update</p>
        <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Title (English)" className="w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
        <input value={titleEs} onChange={(e) => setTitleEs(e.target.value)} placeholder="Título (Español)" className="w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
        <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} placeholder="Description (English)" rows={2} className="w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
        <textarea value={descEs} onChange={(e) => setDescEs(e.target.value)} placeholder="Descripción (Español)" rows={2} className="w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
        <div className="flex gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex-1 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
            {categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
          <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1.0" className="w-20 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
        </div>
        <button onClick={submit} disabled={busy || !titleEn.trim() || !descEn.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Publish Update
        </button>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase text-ink-400">Published Updates</p>
        {updates.length === 0 && <p className="text-sm text-ink-500">No updates yet.</p>}
        {updates.map((u) => (
          <div key={u.id} className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
            <FileText className="h-3.5 w-3.5 shrink-0 text-ink-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{u.titleEn}</p>
              <p className="text-[10px] text-ink-500">{u.category.replace(/_/g, ' ')}{u.version ? ` · v${u.version}` : ''}</p>
            </div>
            <button onClick={() => onDelete(u.id)} disabled={busy} className="text-ink-600 hover:text-it-bright active:scale-90 disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Attendance Section ----

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: 'bg-safe/20 text-safe-bright border-safe/40',
  absent: 'bg-it/20 text-it-bright border-it/40',
  left_early: 'bg-pending/20 text-pending-bright border-pending/40',
  unknown: 'bg-ink-700/50 text-ink-400 border-ink-600',
};

const STATUS_DOT: Record<AttendanceStatus, string> = {
  present: 'bg-safe',
  absent: 'bg-it',
  left_early: 'bg-pending-bright',
  unknown: 'bg-ink-500',
};

function formatLeftAt(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function AttendanceSection({
  snapshot, busy, bulkMode, setBulkMode, selectedIds, setSelectedIds,
  bulkStatus, setBulkStatus, editTimeTarget, setEditTimeTarget, run,
}: {
  snapshot: GameSnapshot;
  pin: string;
  busy: string | null;
  bulkMode: boolean;
  setBulkMode: (v: boolean) => void;
  selectedIds: Set<string>;
  setSelectedIds: (v: Set<string>) => void;
  bulkStatus: AttendanceStatus;
  setBulkStatus: (v: AttendanceStatus) => void;
  editTimeTarget: { playerId: string; leftAt: string } | null;
  setEditTimeTarget: (v: { playerId: string; leftAt: string } | null) => void;
  run: (action: string, payload?: Record<string, unknown>) => Promise<void>;
  onDone: () => void;
}) {
  const activePlayers = snapshot.players.filter((p) => p.status === 'active');
  const todayDate = snapshot.today?.date ?? new Date().toISOString().slice(0, 10);
  const todayAttendance = (snapshot.attendance ?? []).filter((a) => a.date === todayDate);
  const attendanceMap = new Map(todayAttendance.map((a) => [a.playerId, a]));
  const getStatus = (id: string): AttendanceStatus => attendanceMap.get(id)?.status ?? 'unknown';
  const getLeftAt = (id: string): string | null => attendanceMap.get(id)?.leftAt ?? null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handleBulkUpdate = async () => {
    const updates = Array.from(selectedIds).map((id) => ({ player_id: id, status: bulkStatus }));
    await run('bulk_attendance', { updates });
    setSelectedIds(new Set());
    setBulkMode(false);
  };

  const presentCount = activePlayers.filter((p) => getStatus(p.id) === 'present').length;
  const absentCount = activePlayers.filter((p) => getStatus(p.id) === 'absent').length;
  const leftCount = activePlayers.filter((p) => getStatus(p.id) === 'left_early').length;
  const unknownCount = activePlayers.filter((p) => getStatus(p.id) === 'unknown').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2">
        <CalendarCheck className="h-4 w-4 text-blue-400" />
        <span className="text-xs font-semibold text-ink-300">{todayDate}</span>
        <div className="ml-auto flex items-center gap-2.5 text-[10px] font-bold">
          <span className="text-safe-bright">{presentCount} P</span>
          <span className="text-it-bright">{absentCount} A</span>
          <span className="text-pending-bright">{leftCount} L</span>
          <span className="text-ink-500">{unknownCount} ?</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => run('mark_all_present')} disabled={!!busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-safe/40 bg-safe-deep/15 py-2 text-xs font-bold text-safe-bright active:scale-95 disabled:opacity-50">
          <Users className="h-3.5 w-3.5" /> Mark All Present
        </button>
        <button onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }} disabled={!!busy}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold active:scale-95 disabled:opacity-50 ${
            bulkMode ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-ink-600 bg-ink-800 text-ink-300'
          }`}>
          <Check className="h-3.5 w-3.5" /> {bulkMode ? 'Cancel Bulk' : 'Bulk Update'}
        </button>
      </div>

      {bulkMode && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/5 p-2.5">
          <span className="text-[10px] font-bold uppercase text-ink-400">Set selected to:</span>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as AttendanceStatus)}
            className="flex-1 rounded-lg border border-ink-600 bg-ink-800 px-2 py-1.5 text-xs text-white outline-none">
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="left_early">Left Early</option>
            <option value="unknown">Unknown</option>
          </select>
          <button onClick={handleBulkUpdate} disabled={!!busy || selectedIds.size === 0}
            className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-bold text-white active:scale-95 disabled:opacity-50">
            Update ({selectedIds.size})
          </button>
        </div>
      )}

      {activePlayers.length === 0 && (
        <p className="text-center text-sm text-ink-500">No active players to track.</p>
      )}

      {activePlayers.map((p) => {
        const status = getStatus(p.id);
        const leftAt = getLeftAt(p.id);
        const isSelected = selectedIds.has(p.id);
        return (
          <div key={p.id}
            className={`rounded-xl border px-3 py-2.5 transition-colors ${
              isSelected ? 'border-blue-500/60 bg-blue-500/10' : 'border-ink-700 bg-ink-900'
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                {bulkMode && (
                  <button onClick={() => toggleSelect(p.id)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-ink-600 bg-ink-800'
                    }`}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </button>
                )}
                <div className="min-w-0">
                  <span className="font-semibold text-white">{p.name}</span>
                  {leftAt && status === 'left_early' && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-pending-bright">
                      <Clock className="h-2.5 w-2.5" /> {formatLeftAt(leftAt)}
                    </span>
                  )}
                </div>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[status]}`}>
                <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
                {status === 'left_early' ? 'Left' : status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            {!bulkMode && (
              <div className="mt-2 flex gap-1.5">
                {(['present', 'absent', 'left_early'] as AttendanceStatus[]).map((s) => (
                  <button key={s} onClick={() => run('set_attendance', { player_id: p.id, status: s })} disabled={!!busy}
                    className={`flex-1 rounded-lg border py-1.5 text-[10px] font-bold active:scale-95 disabled:opacity-50 ${
                      status === s ? STATUS_STYLES[s] : 'border-ink-600 bg-ink-800 text-ink-400'
                    }`}>
                    {s === 'left_early' ? 'Left Early' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
                {status === 'left_early' && (
                  <button onClick={() => setEditTimeTarget({ playerId: p.id, leftAt: leftAt ?? new Date().toISOString() })} disabled={!!busy}
                    className="rounded-lg border border-ink-600 bg-ink-800 px-2 py-1.5 text-[10px] font-bold text-ink-400 active:scale-95 disabled:opacity-50">
                    <Clock className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {editTimeTarget && (
        <EditTimeModal target={editTimeTarget} onClose={() => setEditTimeTarget(null)}
          onSave={async (leftAtIso) => {
            await run('set_attendance', { player_id: editTimeTarget.playerId, status: 'left_early', left_at: leftAtIso });
            setEditTimeTarget(null);
          }}
          busy={!!busy} />
      )}
    </div>
  );
}

function EditTimeModal({ target, onClose, onSave, busy }: {
  target: { playerId: string; leftAt: string };
  onClose: () => void;
  onSave: (leftAtIso: string) => Promise<void>;
  busy: boolean;
}) {
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(target.leftAt);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const handleSave = async () => {
    const today = new Date().toISOString().slice(0, 10);
    await onSave(new Date(`${today}T${timeStr}:00`).toISOString());
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-5">
      <div className="w-full max-w-sm animate-scale-in rounded-3xl border-2 border-pending/50 bg-ink-900 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pending/20">
          <Clock className="h-7 w-7 text-pending-bright" />
        </div>
        <h2 className="mt-4 font-display text-xl font-black text-white">EDIT DEPARTURE TIME</h2>
        <p className="mt-2 text-sm text-ink-400">Set the time this player left.</p>
        <input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)}
          className="mt-4 w-full rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-center text-lg text-white outline-none focus:border-pending-bright" />
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} disabled={busy}
            className="flex-1 rounded-xl border border-ink-600 py-3 font-semibold text-ink-200 active:scale-95 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pending py-3 font-bold text-white active:scale-95 disabled:opacity-50">
            {busy ? 'Saving…' : 'Save Time'}
          </button>
        </div>
      </div>
    </div>
  );
}