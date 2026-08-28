import { Skull, Clock, Swords, Check, X } from 'lucide-react';
import type { GameSnapshot, Player, Revive } from '@/lib/types';
import { playerById } from '@/lib/selectors';
import { useLang } from '@/lib/LanguageContext';

interface Props {
  snapshot: GameSnapshot;
  me: Player;
}

export function Graveyard({ snapshot, me }: Props) {
  const { t } = useLang();

  const eliminated = snapshot.players
    .filter((p) => p.status === 'eliminated')
    .sort((a, b) => (a.eliminated_day ?? 0) - (b.eliminated_day ?? 0));

  const myReviveHistory = (snapshot.revives ?? []).filter(
    (r) =>
      r.challengerPlayerId === me.id ||
      r.opponentPlayerId === me.id,
  );

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 pb-6 pt-20">
      <div className="flex items-center gap-2">
        <Skull className="h-6 w-6 text-ink-400" />
        <h1 className="font-display text-4xl font-black text-white">{t('graveyard.title').toUpperCase()}</h1>
      </div>

      {me.status === 'eliminated' && (
        <div className="rounded-2xl border border-ink-600 bg-ink-800 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            {t('graveyard.reviveAdminOnly')}
          </p>
        </div>
      )}

      {eliminated.length === 0 ? (
        <p className="text-center text-sm text-ink-500">{t('graveyard.empty')}</p>
      ) : (
        <div className="space-y-2">
          {eliminated.map((p) => {
            const elimBy = p.eliminated_by
              ? playerById(snapshot, p.eliminated_by)
              : null;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-4 ${
                  p.id === me.id
                    ? 'border-blue-500/40 bg-blue-500/5'
                    : 'border-ink-700 bg-ink-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-black text-white">{p.name}</p>
                    <p className="text-xs text-ink-500">
                      {p.grade ?? '—'} · {t('days.eliminated')} — {t('days.title')} {p.eliminated_day ?? '?'}
                    </p>
                    {p.eliminated_at && (
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-500">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(p.eliminated_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </p>
                    )}
                    {elimBy && (
                      <p className="mt-0.5 text-[10px] text-ink-500">
                        {t('graveyard.eliminatedBy')}: {elimBy.name}
                      </p>
                    )}
                    {p.elimination_reason && (
                      <p className="text-[10px] text-ink-500">
                        {t('graveyard.eliminationReason')}: {p.elimination_reason}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full border border-it/40 bg-it/20 px-2 py-0.5 text-[10px] font-black uppercase text-it-bright">
                    {t('home.youAreEliminated').replace('YOU ARE ', '')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {myReviveHistory.length > 0 && (
        <div className="rounded-2xl border border-ink-700 bg-ink-800 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
            {t('graveyard.reviveHistory')}
          </p>
          <div className="space-y-2">
            {myReviveHistory.map((r) => (
              <ReviveHistoryItem key={r.id} revive={r} snapshot={snapshot} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviveHistoryItem({ revive, snapshot }: { revive: Revive; snapshot: GameSnapshot }) {
  const challenger = playerById(snapshot, revive.challengerPlayerId);
  const opponent = playerById(snapshot, revive.opponentPlayerId);
  const winner = revive.winnerPlayerId ? playerById(snapshot, revive.winnerPlayerId) : null;
  const isWin = revive.status === 'completed' && winner?.id === revive.challengerPlayerId;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
      <Swords className="h-3.5 w-3.5 shrink-0 text-pending-bright" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">
          {challenger?.name} vs {opponent?.name}
        </p>
        <p className="text-[10px] text-ink-500">
          {revive.status === 'completed' && winner
            ? `${t('admin.winner')}: ${winner.name}`
            : revive.status}
        </p>
      </div>
      {revive.status === 'completed' && (
        <span className={`flex h-5 w-5 items-center justify-center rounded-full ${isWin ? 'bg-safe/20' : 'bg-it/20'}`}>
          {isWin ? <Check className="h-3 w-3 text-safe-bright" /> : <X className="h-3 w-3 text-it-bright" />}
        </span>
      )}
    </div>
  );
}
