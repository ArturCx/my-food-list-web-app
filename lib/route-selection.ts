/** Seleção do "rolê de bares", guardada no navegador e compartilhada entre o painel e /rota. */
export const ROUTE_SELECTION_KEY = "mfl.route.selection";
export const ROUTE_MAX_STOPS = 15;
const EVENT = "mfl:route-selection";

export function readRouteSelection(): string[] {
  try { return JSON.parse(localStorage.getItem(ROUTE_SELECTION_KEY) ?? "[]"); } catch { return []; }
}

export function writeRouteSelection(slugs: string[]) {
  try { localStorage.setItem(ROUTE_SELECTION_KEY, JSON.stringify(slugs)); } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Avisa quando a seleção muda nesta aba (evento próprio) ou em outra (storage). */
export function subscribeRouteSelection(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}
