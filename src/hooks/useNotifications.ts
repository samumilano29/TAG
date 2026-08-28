import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameSnapshot, Announcement, Player } from '@/lib/types';

export interface GameNotification {
  id: string;
  title: string;
  message: string;
  tone: 'it' | 'safe' | 'pending' | 'info' | 'winner';
}

const DISMISS_MS = 6000;

export function useNotifications(snapshot: GameSnapshot | null, me: Player | undefined) {
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const prevSnap = useRef<GameSnapshot | null>(null);
  const prevAnnouncementIds = useRef<Set<string>>(new Set());
  const prevMyIt = useRef<boolean>(false);
  const prevMyStatus = useRef<string>('');

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const push = useCallback((n: GameNotification) => {
    setNotifications((prev) => [...prev, n]);
    setTimeout(() => dismiss(n.id), DISMISS_MS);
  }, [dismiss]);

  useEffect(() => {
    if (!snapshot) return;

    // First load — seed seen sets, don't fire notifications for existing state.
    if (!prevSnap.current) {
      prevSnap.current = snapshot;
      prevAnnouncementIds.current = new Set(snapshot.announcements.map((a) => a.id));
      prevMyIt.current = snapshot.activeTags.some((t) => t.current_it_player_id === me?.id);
      prevMyStatus.current = me?.status ?? '';
      return;
    }

    const prev = prevSnap.current;

    // 1. New announcements
    const newAnnouncements = snapshot.announcements.filter(
      (a: Announcement) => !prevAnnouncementIds.current.has(a.id),
    );
    for (const a of newAnnouncements) {
      let tone: GameNotification['tone'] = 'info';
      if (a.type === 'day_start') tone = 'safe';
      else if (a.type === 'day_result' || a.type === 'final_day') tone = 'pending';
      else if (a.type === 'winner') tone = 'winner';
      push({ id: `ann-${a.id}`, title: a.title, message: a.message, tone });
    }
    prevAnnouncementIds.current = new Set(snapshot.announcements.map((a) => a.id));

    // 2. I became IT
    const amItNow = snapshot.activeTags.some((t) => t.current_it_player_id === me?.id);
    if (amItNow && !prevMyIt.current && me) {
      push({
        id: `it-${Date.now()}`,
        title: "YOU'RE IT!",
        message: 'Tag a safe player before time runs out.',
        tone: 'it',
      });
    }
    prevMyIt.current = amItNow;

    // 4. I got eliminated
    const myStatus = me?.status ?? '';
    if (myStatus === 'eliminated' && prevMyStatus.current !== 'eliminated') {
      push({
        id: `elim-${me?.id}-${Date.now()}`,
        title: 'YOU WERE ELIMINATED',
        message: 'Better luck next time. You can still watch the game.',
        tone: 'pending',
      });
    }
    prevMyStatus.current = myStatus;

    prevSnap.current = snapshot;
  }, [snapshot, me, push]);

  return { notifications, dismiss };
}
