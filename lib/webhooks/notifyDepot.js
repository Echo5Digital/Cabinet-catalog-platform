/**
 * Notifies the Cabinets & Remodeling Depot backend when an admin user is
 * created, updated, or deleted directly on this platform, so its own Users
 * page can mirror the change. Best-effort: a Depot outage must never fail
 * the request that triggered it, so every call site wraps this in try/catch
 * (or relies on the try/catch inside this function) and ignores the result.
 *
 * The `X-Sync-Source: catalog-platform` header lets the Depot recognize a
 * webhook that originated from ITS OWN prior sync call and skip re-firing
 * back here — without it, a Depot-initiated create could round-trip forever
 * (Depot creates -> notifies platform -> platform's own webhook -> notifies
 * Depot -> ...). See app/api/admin/users/route.js for where this header is
 * read on the way in.
 */
export async function notifyDepot(event, payload) {
  const url = process.env.DEPOT_WEBHOOK_URL;
  const serviceKey = process.env.SERVICE_API_KEY_CABINETS_DEPOT;
  if (!url || !serviceKey) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": serviceKey,
        "X-Sync-Source": "catalog-platform",
      },
      body: JSON.stringify({ event, ...payload }),
    });
  } catch (err) {
    console.error("[notifyDepot]", event, err);
  }
}
