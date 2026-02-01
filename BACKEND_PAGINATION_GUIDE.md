# Backend Pagination Implementation Guide

## Overview
The pagination has been converted from **frontend-only** (fetching all data and hiding rows) to **backend-powered** (fetching only the requested page from the server).

## What Changed

### Backend Changes

#### 1. Enhanced Pagination Utility (`backend/utils/pagination.js`)
- Added `createPaginatedResponse()` function that returns standardized paginated responses
- Updated `parsePageParams()` to return `page` and `pageSize` values

#### 2. Updated Routes (Example: `backend/routes/inquiry.customer.route.js`)
- Routes now return total count and pagination metadata
- Response format:
```json
{
  "message": "Fetching customers successful",
  "result": [...], // Current page data
  "data": [...],   // Same as result
  "pagination": {
    "currentPage": 1,
    "pageSize": 12,
    "totalRows": 150,
    "totalPages": 13,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Frontend Changes

#### 1. Updated Pagination Module (`src/js/admin_pagination.js`)
- Now supports both frontend and backend pagination
- Added `fetchCallback` parameter to `initPagination()`
- Backend pagination fetches data from server when navigating pages
- Frontend pagination still works for legacy code

#### 2. Updated Admin Modules (Example: `inquiry_customers.js`)
- Fetch function now requests specific pages: `?page=1&pageSize=12`
- Data is cleared and re-rendered on each page change
- No more storing all data in frontend

## How to Implement in Your Modules

### Step 1: Update Your Backend Route

```javascript
const { parsePageParams, createPaginatedResponse } = require('../utils/pagination');

router.get('/your-endpoint', async (req, res) => {
  try {
    const { useLimit, limit, offset, page, pageSize } = parsePageParams(req);
    
    // Get total count
    const countResult = await db.query('SELECT COUNT(*) as total FROM your_table');
    const total = countResult[0]?.total || 0;
    
    // Get paginated data
    let sql = 'SELECT * FROM your_table ORDER BY created_at DESC';
    const params = [];
    
    if (useLimit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }
    
    const rows = await db.query(sql, params);
    
    // Return paginated response
    if (useLimit) {
      return res.status(200).json({
        message: 'Success',
        result: rows,
        ...createPaginatedResponse(rows, total, page, pageSize)
      });
    }
    
    return res.status(200).json({ message: 'Success', result: rows });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});
```

### Step 2: Update Your Frontend Module

Replace your existing fetch function:

```javascript
// ❌ OLD WAY - Fetches all data at once
async function fetchAllData() {
  const response = await fetch(`${API_BASE_URL}/your-endpoint`);
  const data = await response.json();
  
  data.result.forEach((item) => {
    // Render all items
    main.createAtSectionOne(...);
  });
  
  // Frontend pagination hides/shows rows
  pagination.refreshPagination(SECTION_NAME, 1);
}

// ✅ NEW WAY - Fetches only current page
async function fetchAllData() {
  // Define fetch callback
  const fetchCallback = async (page, pageSize) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/your-endpoint?page=${page}&pageSize=${pageSize}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Clear table before adding new page
      main.clearSectionOne(SECTION_NAME, 1);
      
      // Render current page data
      if (data.result && Array.isArray(data.result)) {
        data.result.forEach((item) => {
          main.createAtSectionOne(SECTION_NAME, [...], 1, (createResult) => {
            // Setup event listeners, etc.
          });
        });
      }
      
      // Return pagination info
      return {
        data: data.result || [],
        totalRows: data.pagination?.totalRows || 0,
      };
    } catch (error) {
      console.error('Error:', error);
      return { data: [], totalRows: 0 };
    }
  };
  
  // Initialize with backend pagination
  const pageSize = pagination.calculatePageSize(SECTION_NAME, 1) || 12;
  pagination.initPagination(SECTION_NAME, 1, pageSize, fetchCallback);
  
  // Create controls if needed
  setTimeout(() => {
    const existingPagination = document.getElementById(`${SECTION_NAME}PaginationContainer1`);
    if (!existingPagination) {
      pagination.createPaginationControls(SECTION_NAME, 1, 'blue');
    }
  }, 100);
  
  // Fetch first page
  await pagination.renderPage(SECTION_NAME, 1);
}
```

## Key Differences

| Aspect | Frontend Pagination | Backend Pagination |
|--------|-------------------|-------------------|
| **Data Fetching** | All at once | Page by page |
| **Memory Usage** | High (all data in browser) | Low (only current page) |
| **Network Usage** | One large request | Multiple small requests |
| **Performance** | Slow with large datasets | Fast with any dataset size |
| **Server Load** | Low (one query) | Moderate (multiple queries) |
| **Real-time Updates** | Manual refresh needed | Each page shows latest data |

## Testing Your Implementation

1. **Check Network Tab**: You should see requests like `?page=1&pageSize=12`
2. **Check Response**: Should include `pagination` object with `totalRows`, `totalPages`, etc.
3. **Navigate Pages**: Click next/prev buttons - data should refresh from server
4. **Check Performance**: Large datasets should load quickly (only 12 rows at a time)

## Modules Updated

✅ **inquiry_customers.js** - Customers tab (Tab 1) now uses backend pagination

## Modules Still Using Frontend Pagination

These modules still fetch all data and paginate in the frontend. Consider updating them:
- inquiry_reservations.js
- inquiry_checkins.js
- payments.js
- ecommerce_stock.js
- maintenance_equipment.js
- admin_stats.js (all tabs)

## Benefits of Backend Pagination

1. **Faster Initial Load** - Only fetches 12 rows instead of potentially thousands
2. **Lower Memory Usage** - Browser only holds current page in memory
3. **Better for Large Datasets** - No performance degradation with more data
4. **More Scalable** - Can handle millions of records efficiently
5. **Fresh Data** - Each page load gets latest data from database

## Troubleshooting

**Problem**: Pagination controls don't appear
- Solution: Ensure `createPaginationControls()` is called after data loads

**Problem**: Total count is wrong
- Solution: Check that backend returns `pagination.totalRows` correctly

**Problem**: Page navigation doesn't work
- Solution: Verify fetch callback is returning `{ data, totalRows }`

**Problem**: Loading indicator doesn't show
- Solution: Backend pagination automatically handles loading state

## Additional Notes

- Frontend pagination still works for modules that haven't been updated
- You can gradually migrate modules one at a time
- The pagination module automatically detects which mode to use based on whether a fetchCallback was provided
- Backend pagination is recommended for all tables with >50 rows
