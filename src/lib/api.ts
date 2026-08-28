import { ANON_KEY, FUNCTION_URL } from '@/lib/supabase';
import { getDeviceId } from '@/lib/device';
import type { GameSnapshot, PlayerSchedule } from '@/lib/types';

async function call<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, device_id: getDeviceId(), ...payload }),
  });
  const data = await res.json().catch(() => ({ error: 'bad_response' }));
  if (!res.ok || (data && data.error)) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    (err as any).code = data?.error;
    (err as any).conflict = data?.conflict;
    throw err;
  }
  return data as T;
}

export const api = {
  state: () => call<GameSnapshot>('state'),
  claim: (player_id: string) => call('claim', { player_id }),
  tag: (tagger_id: string, tagged_player_id: string) => call('tag', { tagger_id, tagged_player_id }),
  admin: (adminAction: string, pin: string, payload: Record<string, unknown> = {}) =>
    call(`admin_${adminAction}`, { pin, ...payload }),
  requestJoin: (name: string, grade: string) => call('request_join', { name, grade }),
  saveSchedule: (player_id: string, schedule: PlayerSchedule) =>
    call('save_schedule', { player_id, schedule }),
  equipTitle: (player_id: string, title: string | null) =>
    call('equip_title', { player_id, title }),
  sendChat: (player_id: string, message: string) =>
    call('send_chat', { player_id, message }),
  markUpdateViewed: (player_id: string, update_id: string) =>
    call('mark_update_viewed', { player_id, update_id }),
  setLanguage: (player_id: string, language: string) =>
    call('set_language', { player_id, language }),
};

export const attendanceApi = {
  set: (pin: string, player_id: string, status: string, left_at?: string) =>
    api.admin('set_attendance', pin, { player_id, status, left_at }),
  bulk: (pin: string, updates: { player_id: string; status: string }[]) =>
    api.admin('bulk_attendance', pin, { updates }),
  markAllPresent: (pin: string) =>
    api.admin('mark_all_present', pin),
};

export const adminReviveApi = {
  createRevive: (pin: string, eliminated_player_id: string, opponent_player_id: string, winner_player_id: string, notes?: string) =>
    api.admin('create_revive', pin, { eliminated_player_id, opponent_player_id, winner_player_id, notes }),
};

export const manualTagApi = {
  create: (pin: string, tagger_id: string, tagged_player_id: string, tag_time?: string, note?: string) =>
    api.admin('manual_tag', pin, { tagger_id, tagged_player_id, tag_time, note }),
};
