import { useEffect, useRef } from 'react';
import {
  Home, Trophy, MessageSquare, Calendar, History, HelpCircle, Bell,
  User, Settings as SettingsIcon, LogOut, X, Shield, Skull, BookOpen,
  Languages,
} from 'lucide-react';
import type { GameSnapshot, Player, PlayerRank } from '@/lib/types';
import { useLang } from '@/lib/LanguageContext';
import { isGameLive } from '@/lib/selectors';
import { getActiveEvent } from '@/lib/xp';
import { RANK_COLORS } from '@/lib/xp';
import type { Language } from '@/lib/i18n';
import { api } from '@/lib/api';

export type Tab = 'home' | 'leaderboard' | 'chat' | 'events' | 'eventHistory' | 'howto' | 'updates' | 'settings' | 'graveyard' | 'days' | 'announcements' | 'rules' | 'admin';

interface MenuItem {
  id: Tab;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  dot?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tab: Tab;
  onTabChange: (t: Tab) => void;
  snapshot: GameSnapshot;
  me: Player;
  unreadUpdates: number;
  unreadChat: number;
  hasActiveEvent: boolean;
  isAdmin: boolean;
  onOpenAdmin: () => void;
  onLogOut: () => void;
}

export function SlideMenu({
  open, onClose, tab, onTabChange,
  snapshot, me, unreadUpdates, unreadChat, hasActiveEvent,
  isAdmin, onOpenAdmin, onLogOut,
}: Props) {
  const { t, lang, setLang } = useLang();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: TouchEvent | MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open, onClose]);

  const handleSelect = (id: Tab) => {
    if (id === 'admin') {
      onOpenAdmin();
    } else {
      onTabChange(id);
    }
    onClose();
  };

  const meLatest = snapshot.players.find((p) => p.id === me.id) ?? me;

  const mainItems: MenuItem[] = [
    { id: 'home', labelKey: 'nav.home', icon: Home },
    { id: 'leaderboard', labelKey: 'nav.leaderboard', icon: Trophy },
    { id: 'chat', labelKey: 'nav.chat', icon: MessageSquare, badge: unreadChat },
    { id: 'events', labelKey: 'nav.events', icon: Calendar, dot: hasActiveEvent },
    { id: 'eventHistory', labelKey: 'menu.eventHistory', icon: History },
    { id: 'howto', labelKey: 'nav.howto', icon: HelpCircle },
    { id: 'updates', labelKey: 'nav.updates', icon: Bell, badge: unreadUpdates },
    { id: 'graveyard', labelKey: 'nav.graveyard', icon: Skull },
    { id: 'days', labelKey: 'days.title', icon: BookOpen },
    { id: 'settings', labelKey: 'menu.settings', icon: SettingsIcon },
  ];

  const adminItems: MenuItem[] = [
    { id: 'admin', labelKey: 'menu.adminDashboard', icon: Shield },
  ];

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    api.setLanguage(me.id, newLang).catch(() => {});
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 animate-fade-in"
          aria-hidden
        />
      )}

      {/* Slide-out panel */}
      <div
        ref={menuRef}
        className={`fixed left-0 top-0 z-50 flex h-full w-[300px] max-w-[85vw] flex-col border-r border-ink-700 bg-ink-900 shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-ink-800 p-2 text-ink-400 active:scale-90"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Player info */}
        <div className="border-b border-ink-700 px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
              <User className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 pr-8">
              <p className="truncate font-display text-xl font-black text-white">{meLatest.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm">
                <span className={`font-bold ${RANK_COLORS[meLatest.rank]}`}>{meLatest.rank}</span>
                <span className="text-ink-600">·</span>
                <span className="text-ink-400">{meLatest.xp ?? 0} XP</span>
              </p>
            </div>
          </div>
        </div>

        {/* Nav items — scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <nav className="space-y-1">
            {mainItems.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={tab === item.id}
                label={t(item.labelKey as any)}
                onClick={() => handleSelect(item.id)}
              />
            ))}
          </nav>

          {/* Admin section */}
          {isAdmin && (
            <div className="mt-4">
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                {t('menu.adminSection')}
              </p>
              <div className="space-y-1">
                {adminItems.map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    active={false}
                    label={t(item.labelKey as any)}
                    onClick={() => handleSelect(item.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer: language + log out */}
        <div className="border-t border-ink-700 px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <Languages className="h-4 w-4 text-ink-400" />
            <button
              onClick={() => handleLanguageChange('en')}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
                lang === 'en' ? 'bg-blue-500/20 text-blue-400' : 'text-ink-400'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => handleLanguageChange('es')}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
                lang === 'es' ? 'bg-blue-500/20 text-blue-400' : 'text-ink-400'
              }`}
            >
              ES
            </button>
          </div>
          <button
            onClick={onLogOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-ink-400 transition active:scale-95 hover:text-it-bright"
          >
            <LogOut className="h-4 w-4" />
            {t('menu.logOut')}
          </button>
        </div>
      </div>
    </>
  );
}

function NavButton({
  item, active, label, onClick,
}: {
  item: MenuItem;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition active:scale-[0.98] ${
        active
          ? 'bg-blue-500/15 text-blue-400'
          : 'text-ink-300 hover:bg-ink-800'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1 text-sm font-semibold">{label}</span>
      {/* Badge count */}
      {item.badge && item.badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-it px-1.5 text-[10px] font-bold text-white">
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
      {/* Dot indicator */}
      {item.dot && !item.badge && (
        <span className="h-2 w-2 rounded-full bg-pending-bright shadow-[0_0_6px_1px_rgba(251,191,36,0.5)]" />
      )}
      {active && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
    </button>
  );
}

/** Compact top header with hamburger and status badge */
export function TopHeader({
  open, onToggle, snapshot, me,
}: {
  open: boolean;
  onToggle: () => void;
  snapshot: GameSnapshot;
  me: Player;
}) {
  const { t } = useLang();
  const live = isGameLive(snapshot);
  const paused = snapshot.competition.status === 'paused';
  const finished = snapshot.competition.status === 'finished';
  const activeEvent = getActiveEvent(snapshot);
  const activeSpecial = (snapshot.specialEvents ?? []).some((e) => e.status === 'active');

  let statusKey: string;
  let statusColor: string;
  if (paused) {
    statusKey = 'menu.status.paused';
    statusColor = 'text-pending-bright bg-pending/15';
  } else if (live && (activeEvent || activeSpecial)) {
    statusKey = 'menu.status.event';
    statusColor = 'text-pending-bright bg-pending/15';
  } else if (live) {
    statusKey = 'menu.status.live';
    statusColor = 'text-safe-bright bg-safe-deep/25';
  } else {
    statusKey = 'menu.status.closed';
    statusColor = 'text-ink-400 bg-ink-800';
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-ink-700 bg-ink-900/95 px-3 backdrop-blur">
      <button
        onClick={onToggle}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-300 transition active:scale-90 hover:bg-ink-800"
        aria-label="Menu"
      >
        <div className="space-y-1.5">
          <span className={`block h-0.5 w-5 rounded-full transition-all ${open ? 'translate-y-2 rotate-45 bg-blue-400' : 'bg-current'}`} />
          <span className={`block h-0.5 w-5 rounded-full transition-all ${open ? 'opacity-0' : 'bg-current'}`} />
          <span className={`block h-0.5 w-5 rounded-full transition-all ${open ? '-translate-y-2 -rotate-45 bg-blue-400' : 'bg-current'}`} />
        </div>
      </button>

      <p className="font-display text-lg font-black tracking-tight text-white">TAG</p>

      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusColor}`}>
        {t(statusKey as any)}
      </span>
    </header>
  );
}
