module.exports.parsePageParams = function(req) { 
  const page = Number.parseInt(req.query.page, 10);
  const pageSize = Number.parseInt(req.query.pageSize ?? req.query.pagesize, 10);
  const limitAlias = Number.parseInt(req.query.limit, 10);
  const offsetAlias = Number.parseInt(req.query.offset, 10);
  let useLimit = false;
  let limit = 0;
  let offset = 0;
  let currentPage = 1;
  if (!Number.isNaN(page) && !Number.isNaN(pageSize)) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(100, Math.max(1, pageSize));
    limit = safeSize;
    offset = (safePage - 1) * safeSize;
    useLimit = true;
    currentPage = safePage;
  } else if (!Number.isNaN(limitAlias)) {
    const safeSize = Math.min(100, Math.max(1, limitAlias));
    limit = safeSize;
    offset = Number.isNaN(offsetAlias) ? 0 : Math.max(0, offsetAlias);
    useLimit = true;
  }
  return { useLimit, limit, offset, page: currentPage, pageSize: limit };
};

/**
 * Create standardized paginated response
 * @param {Array} data - The paginated data rows
 * @param {number} total - Total count of all rows
 * @param {number} page - Current page number
 * @param {number} pageSize - Number of items per page
 * @returns {Object} Paginated response object
 */
module.exports.createPaginatedResponse = function(data, total, page, pageSize) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  return {
    data,
    pagination: {
      currentPage: page,
      pageSize,
      totalRows: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};