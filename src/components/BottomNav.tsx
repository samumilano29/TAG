import { Home, Trophy, MessageSquare, Calendar, HelpCircle, Bell, User, MoreHorizontal, Skull, Newspaper } from 'lucide-react';

export type Tab = 'home' | 'leaderboard' | 'chat' | 'events' | 'howto' | 'updates' | 'settings' | 'graveyard' | 'days' | 'announcements' | 'rules';

interface Props {
  tab: Tab;
  onChange: (t: Tab) => void;
  unreadUpdates?: number;
}

const mainTabs: { id: Tab; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', labelKey: 'nav.home', icon: Home },
  { id: 'leaderboard', labelKey: 'nav.leaderboard', icon: Trophy },
  { id: 'chat', labelKey: 'nav.chat', icon: MessageSquare },
  { id: 'events', labelKey: 'nav.events', icon: Calendar },
  { id: 'howto', labelKey: 'nav.howto', icon: HelpCircle },
  { id: 'updates', labelKey: 'nav.updates', icon: Bell },
  { id: 'settings', labelKey: 'nav.profile', icon: User },
];

const moreTabs: { id: Tab; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'days', labelKey: 'days.title', icon: Calendar },
  { id: 'announcements', labelKey: 'nav.more', icon: Newspaper },
  { id: 'graveyard', labelKey: 'nav.graveyard', icon: Skull },
  { id: 'rules', labelKey: 'rules.title', icon: HelpCircle },
];

import { useLang } from '@/lib/LanguageContext';

export function BottomNav({ tab, onChange, unreadUpdates }: Props) {
  const { t } = useLang();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-700 bg-ink-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {mainTabs.map((tl) => {
          const active = tab === tl.id;
          return (
            <button
              key={tl.id}
              onClick={() => onChange(tl.id)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 transition ${
                active ? 'text-blue-400' : 'text-ink-500'
              }`}
            >
              <div className="relative">
                <tl.icon className="h-4 w-4" />
                {tl.id === 'updates' && unreadUpdates && unreadUpdates > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-it text-[8px] font-bold text-white">
                    {unreadUpdates > 9 ? '9+' : unreadUpdates}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wide">{t(tl.labelKey as any)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
