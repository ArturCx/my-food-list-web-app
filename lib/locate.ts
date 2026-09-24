/** Posição do usuário: navegador primeiro; se falhar ou demorar, estimativa por IP. */
export type Located = { lat: number; lng: number; approximate: boolean; accuracy?: number; city?: string };

export function locateUser(opts: { timeoutMs?: number } = {}): Promise<Located> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const browser = new Promise<Located>((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("sem geolocation"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, approximate: p.coords.accuracy > 5000, accuracy: p.coords.accuracy }),
      (e) => reject(e),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: timeoutMs },
    );
  });
  return browser.catch(async (err) => {
    const res = await fetch("/api/geo");
    if (!res.ok) throw err;
    const d = await res.json();
    return { lat: d.lat, lng: d.lng, approximate: true, city: d.city };
  });
}
