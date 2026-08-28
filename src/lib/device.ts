const KEY = 'tag-device-id';

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

const PLAYER_KEY = 'tag-player-id';

export function getSavedPlayerId(): string | null {
  return localStorage.getItem(PLAYER_KEY);
}

export function savePlayerId(id: string) {
  localStorage.setItem(PLAYER_KEY, id);
}

export function clearPlayerId() {
  localStorage.removeItem(PLAYER_KEY);
}
