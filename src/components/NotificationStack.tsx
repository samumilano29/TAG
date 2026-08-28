import type { LucideIcon } from 'lucide-react';
import { Megaphone, Skull, Zap, ShieldCheck, Trophy, X } from 'lucide-react';
import type { GameNotification } from '@/hooks/useNotifications';

interface Props {
  notifications: GameNotification[];
  onDismiss: (id: string) => void;
}

const toneStyles: Record<string, { border: string; bg: string; icon: LucideIcon; iconColor: string }> = {
  it: { border: 'border-it/60', bg: 'bg-it-deep/30', icon: Zap, iconColor: 'text-it-bright' },
  safe: { border: 'border-safe/50', bg: 'bg-safe-deep/20', icon: ShieldCheck, iconColor: 'text-safe-bright' },
  pending: { border: 'border-pending/60', bg: 'bg-pending/15', icon: Skull, iconColor: 'text-pending-bright' },
  info: { border: 'border-ink-600', bg: 'bg-ink-800', icon: Megaphone, iconColor: 'text-blue-400' },
  winner: { border: 'border-safe/70', bg: 'bg-safe-deep/30', icon: Trophy, iconColor: 'text-safe-bright' },
};

export function NotificationStack({ notifications, onDismiss }: Props) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-3 left-1/2 z-[70] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-3">
      {notifications.map((n) => {
        const style = toneStyles[n.tone] ?? toneStyles.info;
        const Icon = style.icon;
        return (
          <div
            key={n.id}
            className={`animate-slide-down rounded-2xl border ${style.border} ${style.bg} p-3 shadow-lg backdrop-blur`}
          >
            <div className="flex items-start gap-2.5">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-black text-white">{n.title}</p>
                {n.message && <p className="mt-0.5 text-xs text-ink-300">{n.message}</p>}
              </div>
              <button
                onClick={() => onDismiss(n.id)}
                className="shrink-0 rounded-full p-1 text-ink-400 active:scale-90"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
