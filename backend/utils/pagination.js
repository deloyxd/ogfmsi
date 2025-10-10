module.exports.parsePageParams = function(req) { 
  const page = Number.parseInt(req.query.page, 10);
  const pageSize = Number.parseInt(req.query.pageSize ?? req.query.pagesize, 10);
  const limitAlias = Number.parseInt(req.query.limit, 10);
  const offsetAlias = Number.parseInt(req.query.offset, 10);
  let useLimit = false;
  let limit = 0;
  let offset = 0;
  if (!Number.isNaN(page) && !Number.isNaN(pageSize)) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(100, Math.max(1, pageSize));
    limit = safeSize;
    offset = (safePage - 1) * safeSize;
    useLimit = true;
  } else if (!Number.isNaN(limitAlias)) {
    const safeSize = Math.min(100, Math.max(1, limitAlias));
    limit = safeSize;
    offset = Number.isNaN(offsetAlias) ? 0 : Math.max(0, offsetAlias);
    useLimit = true;
  }
  return { useLimit, limit, offset };
};