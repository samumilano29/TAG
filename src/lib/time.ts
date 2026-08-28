import { useEffect, useState } from 'react';
import type { GameSnapshot } from '@/lib/types';

// A clock aligned to server time. We anchor to the server timestamp from the
// latest snapshot and advance using the local monotonic delta, so the
// countdown never depends on the phone's own wall clock being correct.
export function useServerClock(snapshot: GameSnapshot | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const anchorServer = snapshot?.serverTime ?? Date.now();
    const anchorLocal = Date.now();
    const tick = () => setNow(anchorServer + (Date.now() - anchorLocal));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [snapshot?.serverTime]);

  return now;
}

function localSecondsOfDay(snapshot: GameSnapshot, serverNow: number): number {
  const secComponent = Math.floor(serverNow / 1000) % 60;
  return snapshot.schedule.curMin * 60 + secComponent;
}

// Seconds until the daily end (2:20 PM). Negative once the window has closed.
export function secondsUntilEnd(snapshot: GameSnapshot, serverNow: number): number {
  const nowSec = localSecondsOfDay(snapshot, serverNow);
  return snapshot.schedule.endMin * 60 - nowSec;
}

// Seconds until the daily start (7:20 AM). Negative once started.
export function secondsUntilStart(snapshot: GameSnapshot, serverNow: number): number {
  const nowSec = localSecondsOfDay(snapshot, serverNow);
  return snapshot.schedule.startMin * 60 - nowSec;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatClock(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  });
}
