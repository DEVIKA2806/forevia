/**
 * Small in-memory limiter, keyed by the AUTHENTICATED user id (so it must
 * run after requireAuth). Each AI request costs money, so one account
 * can't hammer the provider through this API.
 *
 * Limits: in-memory and per server process. It resets on restart and is
 * not shared between several server instances. Fine for a single
 * instance; use a shared store (e.g. Redis) if the API is scaled out.
 */
function userRateLimit({ windowMs, max }) {
  const hits = new Map(); // userId -> [timestamps within window]

  return function limiter(req, res, next) {
    const now = Date.now();
    const key = req.user.id;
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);

    if (recent.length >= max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((recent[0] + windowMs - now) / 1000)
      );
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        message: `You've generated insights several times recently. Please try again in ${Math.ceil(
          retryAfterSeconds / 60
        )} minute(s).`,
        retryAfterSeconds,
      });
    }

    recent.push(now);
    hits.set(key, recent);

    // Drop idle users so the map can't grow without bound.
    if (hits.size > 5000) {
      for (const [id, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(id);
      }
    }
    next();
  };
}

module.exports = userRateLimit;
