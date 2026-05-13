const SESSION_HINT_KEY = 'libero:reader:has-session';

export function hasSessionHint(): boolean {
  return window.localStorage.getItem(SESSION_HINT_KEY) === 'true';
}

export function setSessionHint(): void {
  window.localStorage.setItem(SESSION_HINT_KEY, 'true');
}

export function clearSessionHint(): void {
  window.localStorage.removeItem(SESSION_HINT_KEY);
}
