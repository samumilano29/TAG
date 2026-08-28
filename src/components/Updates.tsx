import { useEffect, useCallback } from 'react';
import { Sparkles, ShieldCheck, Calendar, Bug, Wrench, Bell } from 'lucide-react';
import type { GameSnapshot, Player } from '@/lib/types';
import { api } from '@/lib/api';
import { useLang } from '@/lib/LanguageContext';
import { formatClock } from '@/lib/time';

interface Props {
  snapshot: GameSnapshot;
  me: Player;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  new_feature: Sparkles,
  rule: ShieldCheck,
  event: Calendar,
  bug: Bug,
  improvement: Wrench,
};

const CATEGORY_COLORS: Record<string, string> = {
  new_feature: 'text-pending-bright bg-pending/10 border-pending/30',
  rule: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  event: 'text-it-bright bg-it-deep/15 border-it/30',
  bug: 'text-safe-bright bg-safe-deep/10 border-safe/30',
  improvement: 'text-ink-300 bg-ink-700/40 border-ink-600',
};

export function Updates({ snapshot, me }: Props) {
  const { t, lang } = useLang();
  const updates = (snapshot.appUpdates ?? []).filter((u) => u.published);
  const viewedIds = new Set((snapshot.playerUpdateViews ?? []).filter((v) => v.playerId === me.id).map((v) => v.updateId));

  const markViewed = useCallback(async (id: string) => {
    try { await api.markUpdateViewed(me.id, id); } catch { /* ignore */ }
  }, [me.id]);

  useEffect(() => {
    updates.forEach((u) => {
      if (!viewedIds.has(u.id)) markViewed(u.id);
    });
  }, [updates, viewedIds, markViewed]);

  if (updates.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 pb-6 pt-20">
        <h1 className="font-display text-3xl font-black text-white">{t('updates.title')}</h1>
        <div className="mt-6 rounded-2xl border border-ink-700 bg-ink-800 p-6 text-center">
          <Bell className="mx-auto h-8 w-8 text-ink-500" />
          <p className="mt-2 text-sm text-ink-500">{t('updates.empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-3 px-4 pb-6 pt-20">
      <h1 className="font-display text-3xl font-black text-white">{t('updates.title')}</h1>

      {updates.map((u) => {
    const isNew = !viewedIds.has(u.id);
    const Icon = CATEGORY_ICONS[u.category] ?? Wrench;
    const colorClass = CATEGORY_COLORS[u.category] ?? CATEGORY_COLORS.improvement;
    const title = lang === 'es' ? u.titleEs : u.titleEn;
    const desc = lang === 'es' ? u.descriptionEs : u.descriptionEn;
    const catLabel = t(`updates.category.${u.category === 'new_feature' ? 'new' : u.category === 'rule' ? 'rule' : u.category === 'event' ? 'event' : u.category === 'bug' ? 'bug' : 'improvement'}` as any);
    return (
            <div key={u.id} className="animate-fade-up rounded-2xl border border-ink-700 bg-ink-800 p-4">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg font-black text-white">{title}</p>
                    {isNew && (
                      <span className="rounded-full bg-pending px-2 py-0.5 text-[9px] font-black uppercase text-ink-950">
                        {t('updates.newBadge')}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase ${colorClass.split(' ')[0]}`}>{catLabel}</span>
                    {u.version && <span className="text-[10px] text-ink-500">v{u.version}</span>}
                    <span className="text-[10px] text-ink-500">{formatClock(u.createdAt, snapshot.competition.timezone)}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-300">{desc}</p>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
