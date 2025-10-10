/* Server-Timing middleware: exposes total app time per request */
const { getDbDuration } = require('../utils/request-context');

module.exports = function serverTiming() {
  return function serverTimingMiddleware(req, res, next) {
    let start;
    try {
      start = process.hrtime.bigint();
    } catch (e) {
      start = null;
    }

    const origEnd = res.end;

    res.end = function endOverride(chunk, encoding, cb) {
      try {
        const hasHr = start != null && typeof process.hrtime.bigint === 'function';
        const segments = [];

        if (hasHr) {
          const durNs = process.hrtime.bigint() - start;
          const durMs = Number(durNs) / 1e6;
          segments.push(`app;dur=${durMs.toFixed(1)}`);
        }

        // Append DB duration if available from request context
        try {
          const dbMs = Number(getDbDuration());
          if (Number.isFinite(dbMs) && dbMs >= 0) {
            segments.push(`db;dur=${dbMs.toFixed(1)}`);
          }
        } catch (_) {
          // ignore context errors
        }

        if (segments.length > 0) {
          const existing = res.getHeader('Server-Timing');
          const value = existing ? String(existing) + ', ' + segments.join(', ') : segments.join(', ');
          res.setHeader('Server-Timing', value);
        }

        if (!res.getHeader('Timing-Allow-Origin')) {
          res.setHeader('Timing-Allow-Origin', '*');
        }
      } catch (_) {
        try {
          if (!res.getHeader('Timing-Allow-Origin')) {
            res.setHeader('Timing-Allow-Origin', '*');
          }
        } catch (__) {
          // no-op
        }
      } finally {
        return origEnd.call(this, chunk, encoding, cb);
      }
    };

    next();
  };
};