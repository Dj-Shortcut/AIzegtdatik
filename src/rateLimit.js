export function createRateLimiter({ maxRequests = 20, windowMs = 60_000 } = {}) {
  const entries = new Map();

  return function checkRateLimit(identifier) {
    const now = Date.now();
    const current = entries.get(identifier);

    if (!current || current.resetAt <= now) {
      entries.set(identifier, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    if (current.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetAt: current.resetAt };
    }

    current.count += 1;
    return { allowed: true, remaining: maxRequests - current.count, resetAt: current.resetAt };
  };
}
