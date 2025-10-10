/* Server-Timing middleware: exposes total app time per request */

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
        if (start != null && typeof process.hrtime.bigint === 'function') {
          const durNs = process.hrtime.bigint() - start;
          const durMs = Number(durNs) / 1e6;
          const segment = `app;dur=${durMs.toFixed(1)}`;
          const existing = res.getHeader('Server-Timing');
          res.setHeader('Server-Timing', existing ? String(existing) + ', ' + segment : segment);
          if (!res.getHeader('Timing-Allow-Origin')) {
            res.setHeader('Timing-Allow-Origin', '*');
          }
        } else {
          if (!res.getHeader('Timing-Allow-Origin')) {
            res.setHeader('Timing-Allow-Origin', '*');
          }
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