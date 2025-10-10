'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

/**
 * Initialize a per-request context using AsyncLocalStorage.
 * Stores an object like: { dbMs: 0 }
 * Must be registered early in the middleware chain (before routes).
 */
function withRequestContext() {
  return function requestContextMiddleware(req, res, next) {
    storage.run({ dbMs: 0 }, () => next());
  };
}

/**
 * Add database duration (in milliseconds) to the current request context.
 * No-ops if no context is active.
 * @param {number} ms
 */
function addDbDuration(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return;
  const ctx = storage.getStore();
  if (ctx) {
    ctx.dbMs = (ctx.dbMs || 0) + ms;
  }
}

/**
 * Get the aggregated database duration for the current request context.
 * @returns {number} milliseconds (0 if no context)
 */
function getDbDuration() {
  const ctx = storage.getStore();
  return ctx && typeof ctx.dbMs === 'number' ? ctx.dbMs : 0;
}

/**
 * Access the raw context object (if any).
 * @returns {object | undefined}
 */
function getContext() {
  return storage.getStore();
}

module.exports = {
  storage,
  withRequestContext,
  addDbDuration,
  getDbDuration,
  getContext,
};