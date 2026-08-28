import type { ActiveTag, GameSnapshot, Player, Tag } from '@/lib/types';

export function playerById(snap: GameSnapshot, id: string | null | undefined): Player | undefined {
  if (!id) return undefined;
  return snap.players.find((p) => p.id === id);
}

export function itPlayers(snap: GameSnapshot): { slot: number; player: Player | undefined; since: string }[] {
  return [...snap.activeTags]
    .sort((a, b) => a.tag_slot - b.tag_slot)
    .map((t: ActiveTag) => ({ slot: t.tag_slot, player: playerById(snap, t.current_it_player_id), since: t.started_at }));
}

export function isGameLive(snap: GameSnapshot): boolean {
  return (
    snap.competition.status === 'active' &&
    !!snap.today &&
    snap.today.status === 'running' &&
    snap.schedule.windowActive
  );
}

export function isPlayerIt(snap: GameSnapshot, playerId: string | null): boolean {
  if (!playerId) return false;
  return snap.activeTags.some((t) => t.current_it_player_id === playerId);
}

export function myItSlot(snap: GameSnapshot, playerId: string | null): number | null {
  if (!playerId) return null;
  const t = snap.activeTags.find((a) => a.current_it_player_id === playerId);
  return t ? t.tag_slot : null;
}

export function activeCount(snap: GameSnapshot): number {
  return snap.players.filter((p) => p.status === 'active').length;
}

export function eliminatedCount(snap: GameSnapshot): number {
  return snap.players.filter((p) => p.status === 'eliminated').length;
}

export function lastConfirmedTag(snap: GameSnapshot): Tag | undefined {
  return snap.recentTags.find((t) => t.status === 'confirmed');
}

// Players this IT player is allowed to tag: active, not themselves, and not the player who just tagged them (no tag back).
export function taggableTargets(snap: GameSnapshot, playerId: string): Player[] {
  const lastConfirmed = snap.recentTags.find((t) => t.status === 'confirmed');
  const noTagBackId =
    lastConfirmed && lastConfirmed.tagged_player_id === playerId ? lastConfirmed.tagger_id : null;

  return snap.players.filter(
    (p) => p.status === 'active' && p.id !== playerId && p.id !== noTagBackId,
  );
}
