import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getDeviceId, getSavedPlayerId, savePlayerId, clearPlayerId } from '@/lib/device';
import { useGame } from '@/hooks/useGame';
import { useServerClock } from '@/lib/time';
import type { Player, PlayerSchedule } from '@/lib/types';
import { playerById } from '@/lib/selectors';
import { getActiveEvent } from '@/lib/xp';
import { PlayerSelect } from '@/components/PlayerSelect';
import { Home } from '@/components/Home';
import { Days } from '@/components/Days';
import { Announcements } from '@/components/Announcements';
import { Rules } from '@/components/Rules';
import { Leaderboard } from '@/components/Leaderboard';
import { Graveyard } from '@/components/Graveyard';
import { Settings } from '@/components/Settings';
import { Admin } from '@/components/Admin';
import { Chat } from '@/components/Chat';
import { Updates } from '@/components/Updates';
import { HowToPlay } from '@/components/HowToPlay';
import { Events } from '@/components/Events';
import { SlideMenu, TopHeader, type Tab } from '@/components/SlideMenu';
import { TagModal } from '@/components/TagModal';
import { EndOfDayOverlay } from '@/components/EndOfDayOverlay';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationStack } from '@/components/NotificationStack';
import { ScheduleSetup } from '@/components/ScheduleSetup';
import { LanguageProvider } from '@/lib/LanguageContext';

function AppInner() {
  const { snapshot, loading, error, refresh } = useGame();
  const serverNow = useServerClock(snapshot);

  const [myId, setMyId] = useState<string | null>(() => getSavedPlayerId());
  const [tab, setTab] = useState<Tab>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState<string | null>(null);

  const me: Player | undefined = useMemo(
    () => (snapshot && myId ? playerById(snapshot, myId) : undefined),
    [snapshot, myId],
  );

  const mySchedule = useMemo(
    () => (snapshot && myId ? snapshot.schedules.find((s) => s.playerId === myId) : undefined),
    [snapshot, myId],
  );

  const needsSchedule = !!me && (!mySchedule || !mySchedule.scheduleCompleted);

  const { notifications, dismiss } = useNotifications(snapshot, me);

  const unreadUpdates = useMemo(() => {
    if (!snapshot || !me) return 0;
    const viewedIds = new Set((snapshot.playerUpdateViews ?? []).filter((v) => v.playerId === me.id).map((v) => v.updateId));
    return (snapshot.appUpdates ?? []).filter((u) => u.published && !viewedIds.has(u.id)).length;
  }, [snapshot, me]);

  const unreadChat = useMemo(() => {
    if (!snapshot || !me) return 0;
    const msgs = snapshot.chatMessages ?? [];
    if (msgs.length === 0) return 0;
    const lastViewed = me.lastChatViewedAt;
    if (!lastViewed) return msgs.filter((m) => !m.isSystem).length;
    const cutoff = new Date(lastViewed).getTime();
    return msgs.filter((m) => !m.isSystem && new Date(m.createdAt).getTime() > cutoff).length;
  }, [snapshot, me]);

  const hasActiveEvent = useMemo(() => {
    if (!snapshot) return false;
    const randomEvent = getActiveEvent(snapshot);
    const specialEvent = (snapshot.specialEvents ?? []).some((e) => e.status === 'active');
    return !!randomEvent || specialEvent;
  }, [snapshot]);

  const isAdmin = !!adminPin;

  const claim = useCallback(
    async (player: Player) => {
      await api.claim(player.id);
      savePlayerId(player.id);
      setMyId(player.id);
      refresh();
    },
    [refresh],
  );

  const saveSchedule = useCallback(
    async (schedule: PlayerSchedule) => {
      if (!myId) return;
      await api.saveSchedule(myId, schedule);
      refresh();
    },
    [myId, refresh],
  );

  const handleTag = useCallback(
    async (targetId: string) => {
      if (!me) return;
      await api.tag(me.id, targetId);
      refresh();
    },
    [me, refresh],
  );

  const handleLogOut = useCallback(() => {
    clearPlayerId();
    setMyId(null);
    setAdminPin(null);
    setTab('home');
    setMenuOpen(false);
  }, []);

  if (loading) {
    return (
      <div className="app-bg flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-400" />
          <p className="mt-4 font-display text-2xl font-black text-white">TAG!</p>
          <p className="mt-1 text-sm text-ink-500">Loading the game…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-bg flex min-h-screen items-center justify-center px-5">
        <div className="max-w-sm text-center">
          <p className="font-display text-3xl font-black text-white">Connection issue</p>
          <p className="mt-2 text-sm text-ink-400">{error}</p>
          <button
            onClick={refresh}
            className="mt-5 rounded-xl bg-blue-500 px-6 py-3 font-bold text-white active:scale-95"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  if (!me) {
    return (
      <>
        <PlayerSelect
          players={snapshot.players}
          joinRequests={snapshot.joinRequests ?? []}
          onClaim={claim}
          onAdminLogin={() => setShowAdmin(true)}
        />
        {showAdmin && <Admin snapshot={snapshot} onClose={() => setShowAdmin(false)} onDone={refresh} onPinEntered={setAdminPin} />}
      </>
    );
  }

  if (needsSchedule) {
    return <ScheduleSetup player={me} onSave={saveSchedule} />;
  }

  return (
    <div className="app-bg min-h-screen">
      <TopHeader open={menuOpen} onToggle={() => setMenuOpen((o) => !o)} snapshot={snapshot} me={me} />

      <SlideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        tab={tab}
        onTabChange={setTab}
        snapshot={snapshot}
        me={me}
        unreadUpdates={unreadUpdates}
        unreadChat={unreadChat}
        hasActiveEvent={hasActiveEvent}
        isAdmin={isAdmin}
        onOpenAdmin={() => setShowAdmin(true)}
        onLogOut={handleLogOut}
      />

      {tab === 'home' && (
        <Home snapshot={snapshot} me={me} serverNow={serverNow} onOpenTag={() => setShowTagModal(true)} />
      )}
      {tab === 'days' && <Days snapshot={snapshot} />}
      {tab === 'announcements' && <Announcements snapshot={snapshot} />}
      {tab === 'rules' && <Rules />}
      {tab === 'leaderboard' && <Leaderboard snapshot={snapshot} />}
      {tab === 'graveyard' && <Graveyard snapshot={snapshot} me={me} />}
      {tab === 'chat' && <Chat snapshot={snapshot} me={me} adminPin={adminPin} />}
      {tab === 'events' && <Events snapshot={snapshot} me={me} serverNow={serverNow} />}
      {tab === 'eventHistory' && <Events snapshot={snapshot} me={me} serverNow={serverNow} />}
      {tab === 'howto' && <HowToPlay snapshot={snapshot} />}
      {tab === 'updates' && <Updates snapshot={snapshot} me={me} />}
      {tab === 'settings' && (
        <Settings
          snapshot={snapshot}
          me={me}
          onSwitchPlayer={() => {
            setMyId(null);
            setAdminPin(null);
            setTab('home');
          }}
          onOpenAdmin={() => setShowAdmin(true)}
          onScheduleSaved={refresh}
        />
      )}

      {showTagModal && (
        <TagModal
          snapshot={snapshot}
          me={me}
          onClose={() => setShowTagModal(false)}
          onTag={handleTag}
        />
      )}

      <EndOfDayOverlay snapshot={snapshot} onDismiss={refresh} />

      <NotificationStack notifications={notifications} onDismiss={dismiss} />

      {showAdmin && <Admin snapshot={snapshot} onClose={() => setShowAdmin(false)} onDone={refresh} onPinEntered={setAdminPin} />}
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}

export default App;
