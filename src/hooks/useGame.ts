import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import type { GameSnapshot } from '@/lib/types';

export function useGame() {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const snap = await api.state();
      setSnapshot(snap);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the game');
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => refresh(), 400);
  }, [refresh]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('tag-game')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_tags' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_games' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_schedules' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_join_requests' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revives' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_events' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_xp_events' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_recaps' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_titles' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_feed' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_updates' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_events' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_update_views' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, scheduleRefresh)
      .subscribe();

    // Poll periodically so the server-side schedule keeps advancing even
    // when no realtime event fires (e.g. crossing the 7:20 / 2:20 boundary).
    const poll = setInterval(() => refresh(), 20000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh, scheduleRefresh]);

  return { snapshot, loading, error, refresh };
}
