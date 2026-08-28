import { Activity, Tag, Trophy, Heart, Target, Crown, Swords, Zap, Shield } from 'lucide-react';
import type { GameSnapshot } from '@/lib/types';
import { useLang } from '@/lib/LanguageContext';
import { formatClock } from '@/lib/time';

interface Props {
  snapshot: GameSnapshot;
  compact?: boolean;
  maxItems?: number;
}

function activityIcon(type: string) {
  if (type.startsWith('TAG')) return <Tag className="h-3.5 w-3.5 text-it-bright" />;
  if (type.includes('BOUNTY')) return <Target className="h-3.5 w-3.5 text-pending-bright" />;
  if (type.includes('SURVIVOR')) return <Shield className="h-3.5 w-3.5 text-safe-bright" />;
  if (type.includes('KING')) return <Crown className="h-3.5 w-3.5 text-pending-bright" />;
  if (type.includes('RIVALRY')) return <Swords className="h-3.5 w-3.5 text-blue-400" />;
  if (type.includes('REVIVE')) return <Heart className="h-3.5 w-3.5 text-safe-bright" />;
  if (type.includes('SPECIAL_EVENT')) return <Zap className="h-3.5 w-3.5 text-pending-bright" />;
  if (type.includes('XP')) return <Zap className="h-3.5 w-3.5 text-pending-bright" />;
  if (type.includes('EVENT')) return <Trophy className="h-3.5 w-3.5 text-blue-400" />;
  return <Activity className="h-3.5 w-3.5 text-ink-400" />;
}

export function ActivityFeed({ snapshot, compact, maxItems }: Props) {
  const { t } = useLang();
  const items = (snapshot.activityFeed ?? []).slice(0, maxItems ?? (compact ? 5 : 100));

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-ink-700 bg-ink-800/50 p-6 text-center">
        <p className="text-sm text-ink-500">{t('activity.empty')}</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {!compact && (
        <h1 className="font-display text-3xl font-black text-white">{t('activity.title')}</h1>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 ${
            compact ? '' : 'animate-fade-up'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-900/60">
            {activityIcon(item.activityType)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-200">{item.description}</p>
            <p className="text-[10px] text-ink-500">
              {formatClock(item.createdAt, snapshot.competition.timezone)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
