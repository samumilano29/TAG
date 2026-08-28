import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2, Shield } from 'lucide-react';
import type { GameSnapshot, Player } from '@/lib/types';
import { api } from '@/lib/api';
import { useLang } from '@/lib/LanguageContext';
import { formatClock } from '@/lib/time';
import { RANK_COLORS } from '@/lib/xp';

interface Props {
  snapshot: GameSnapshot;
  me: Player;
  adminPin: string | null;
}

export function Chat({ snapshot, me, adminPin }: Props) {
  const { t, lang } = useLang();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = [...(snapshot.chatMessages ?? [])].reverse();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const send = useCallback(async () => {
    const msg = input.trim();
    if (!msg || busy) return;
    if (msg.length > 300) {
      setError(t('chat.tooLong'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.sendChat(me.id, msg);
      setInput('');
    } catch (e: any) {
      if (e?.code === 'spam_cooldown') setError(t('chat.spamWarning'));
      else setError(e?.message ?? 'Error');
    } finally {
      setBusy(false);
    }
  }, [input, busy, me.id, t]);

  const deleteMsg = useCallback(async (id: string) => {
    if (!adminPin) return;
    try {
      await api.admin('delete_chat_msg', adminPin, { message_id: id });
    } catch { /* ignore */ }
  }, [adminPin]);

  const playerRank = (playerId: string | null) => {
    if (!playerId) return null;
    const p = snapshot.players.find((pl) => pl.id === playerId);
    return p?.rank ?? null;
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 pb-6 pt-20" style={{ height: 'calc(100vh - 0px)' }}>
      <h1 className="font-display text-3xl font-black text-white">{t('chat.title')}</h1>

      <div ref={scrollRef} className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-ink-700 bg-ink-800/50 p-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-ink-500">{t('chat.empty')}</p>
          </div>
        ) : (
          messages.map((m) => {
            const isSystem = m.isSystem;
            const rank = playerRank(m.playerId);
            const rankColor = rank ? RANK_COLORS[rank as keyof typeof RANK_COLORS] : '';
            return (
              <div
                key={m.id}
                className={`flex flex-col gap-0.5 rounded-xl px-3 py-2 ${
                  isSystem ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-ink-900/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isSystem ? (
                    <Shield className="h-3.5 w-3.5 text-blue-400" />
                  ) : null}
                  <span className={`text-xs font-bold ${isSystem ? 'text-blue-400' : 'text-white'}`}>
                    {m.playerName}
                  </span>
                  {rank && rank !== 'Unranked' && !isSystem && (
                    <span className={`text-[9px] font-black uppercase ${rankColor}`}>{rank}</span>
                  )}
                  <span className="ml-auto text-[10px] text-ink-500">
                    {formatClock(m.createdAt, snapshot.competition.timezone)}
                  </span>
                  {adminPin && !isSystem && (
                    <button
                      onClick={() => deleteMsg(m.id)}
                      className="text-ink-600 hover:text-it-bright active:scale-90"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className={`text-sm ${isSystem ? 'text-blue-300 italic' : 'text-ink-200'}`}>
                  {m.message}
                </p>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="mt-2 text-xs text-it-bright">{error}</p>}

      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-ink-700 bg-ink-800 p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          maxLength={300}
          placeholder={t('chat.placeholder')}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-ink-500 focus:outline-none"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white active:scale-90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
