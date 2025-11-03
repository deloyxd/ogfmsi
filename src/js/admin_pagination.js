/* Pagination utility for admin tables */
/* Default page size: 12 rows per page (between 10-15) */

const DEFAULT_PAGE_SIZE = 12;

// Store pagination state per section/tab
const paginationState = new Map();

/**
 * Get pagination key for a section/tab combination
 */
function getPaginationKey(sectionName, tabIndex) {
  return `${sectionName}_tab${tabIndex}`;
}

/**
 * Initialize pagination for a table
 */
export function initPagination(sectionName, tabIndex, pageSize = DEFAULT_PAGE_SIZE) {
  const key = getPaginationKey(sectionName, tabIndex);
  paginationState.set(key, {
    currentPage: 1,
    pageSize: Math.max(1, Math.min(100, pageSize)),
    totalRows: 0,
  });
}

/**
 * Get current pagination state
 */
export function getPaginationState(sectionName, tabIndex) {
  const key = getPaginationKey(sectionName, tabIndex);
  return paginationState.get(key) || { currentPage: 1, pageSize: DEFAULT_PAGE_SIZE, totalRows: 0 };
}

/**
 * Update pagination state
 */
function setPaginationState(sectionName, tabIndex, updates) {
  const key = getPaginationKey(sectionName, tabIndex);
  const current = paginationState.get(key) || {
    currentPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalRows: 0,
  };
  paginationState.set(key, { ...current, ...updates });
}

/**
 * Count visible rows in a table (excluding empty placeholder)
 */
function countTableRows(sectionName, tabIndex) {
  const emptyText = document.getElementById(`${sectionName}SectionOneListEmpty${tabIndex}`);
  if (!emptyText) return 0;
  const tbody = emptyText.closest('tbody');
  if (!tbody) return 0;
  const rows = Array.from(tbody.querySelectorAll('tr'));
  // Exclude the empty placeholder row and header row if present
  return rows.filter((row) => !row.contains(emptyText) && row.children.length > 0).length;
}

/**
 * Update pagination controls UI (exported for external use)
 */
export function updatePaginationControls(sectionName, tabIndex) {
  const state = getPaginationState(sectionName, tabIndex);
  const totalRows = countTableRows(sectionName, tabIndex);
  const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));

  // Update state with actual total
  setPaginationState(sectionName, tabIndex, { totalRows });

  const paginationContainer = document.getElementById(`${sectionName}PaginationContainer${tabIndex}`);
  if (!paginationContainer) return;

  const currentPageSpan = paginationContainer.querySelector('.pagination-current-page');
  const totalPagesSpan = paginationContainer.querySelector('.pagination-total-pages');
  const totalRowsSpan = paginationContainer.querySelector('.pagination-total-rows');

  if (currentPageSpan) currentPageSpan.textContent = state.currentPage;
  if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
  if (totalRowsSpan) totalRowsSpan.textContent = totalRows;

  // Update button states
  const prevBtn = paginationContainer.querySelector('.pagination-prev');
  const nextBtn = paginationContainer.querySelector('.pagination-next');
  const firstBtn = paginationContainer.querySelector('.pagination-first');
  const lastBtn = paginationContainer.querySelector('.pagination-last');

  if (prevBtn) {
    prevBtn.disabled = state.currentPage <= 1;
    prevBtn.classList.toggle('opacity-50', state.currentPage <= 1);
    prevBtn.classList.toggle('cursor-not-allowed', state.currentPage <= 1);
  }
  if (nextBtn) {
    nextBtn.disabled = state.currentPage >= totalPages;
    nextBtn.classList.toggle('opacity-50', state.currentPage >= totalPages);
    nextBtn.classList.toggle('cursor-not-allowed', state.currentPage >= totalPages);
  }
  if (firstBtn) {
    firstBtn.disabled = state.currentPage <= 1;
    firstBtn.classList.toggle('opacity-50', state.currentPage <= 1);
    firstBtn.classList.toggle('cursor-not-allowed', state.currentPage <= 1);
  }
  if (lastBtn) {
    lastBtn.disabled = state.currentPage >= totalPages;
    lastBtn.classList.toggle('opacity-50', state.currentPage >= totalPages);
    lastBtn.classList.toggle('cursor-not-allowed', state.currentPage >= totalPages);
  }

  // Show/hide pagination container
  // Show if there are more rows than page size OR if we're not on page 1
  if (totalRows > state.pageSize || state.currentPage > 1) {
    paginationContainer.classList.remove('hidden');
  } else {
    paginationContainer.classList.add('hidden');
  }
}

/**
 * Render pagination controls HTML
 */
// Track if creation is in progress to prevent race conditions
const creationInProgress = new Set();

export function createPaginationControls(sectionName, tabIndex, mainColor = 'orange') {
  const key = getPaginationKey(sectionName, tabIndex);
  
  // If creation is already in progress for this key, skip
  if (creationInProgress.has(key)) {
    return;
  }
  
  // Check if pagination container already exists in DOM
  const existingPagination = document.getElementById(`${sectionName}PaginationContainer${tabIndex}`);
  if (existingPagination) {
    // If both DOM and state exist, don't create duplicate
    if (paginationState.has(key)) {
      return; // Already fully initialized
    }
    // If DOM exists but state doesn't, remove old DOM and recreate
    existingPagination.remove();
  }

  // If state exists but DOM doesn't, proceed to (re)create the DOM controls
  // This can happen if the table was re-rendered or controls were removed.
  // We intentionally do NOT early-return here to ensure controls are visible.

  // Mark as in progress
  creationInProgress.add(key);
  
  try {
    initPagination(sectionName, tabIndex);

    // Find the table parent to append pagination controls
    const emptyText = document.getElementById(`${sectionName}SectionOneListEmpty${tabIndex}`);
    if (!emptyText) {
      creationInProgress.delete(key);
      return;
    }

    const table = emptyText.closest('table');
    if (!table) {
      creationInProgress.delete(key);
      return;
    }

    const tableParent = table.closest('[data-sectionindex="1"]');
    if (!tableParent) {
      creationInProgress.delete(key);
      return;
    }

    // Double-check: make sure pagination doesn't already exist in this tableParent
    const existingInParent = tableParent.querySelector(`#${sectionName}PaginationContainer${tabIndex}`);
    if (existingInParent) {
      // Already exists in this parent, don't create duplicate
      creationInProgress.delete(key);
      return;
    }

    // Create pagination container
    const paginationContainer = document.createElement('div');
    paginationContainer.id = `${sectionName}PaginationContainer${tabIndex}`;
    paginationContainer.className = `pagination-container mt-4 flex items-center justify-between px-2 py-3 bg-gray-100 rounded-lg border border-gray-300`;
    paginationContainer.innerHTML = `
    <div class="flex items-center gap-2 text-sm text-gray-600">
      <span class="font-medium">Page</span>
      <span class="pagination-current-page font-bold text-gray-900">1</span>
      <span>of</span>
      <span class="pagination-total-pages font-bold text-gray-900">1</span>
      <span class="ml-2 text-gray-500">(<span class="pagination-total-rows">0</span> rows)</span>
    </div>
    <div class="flex items-center gap-1">
      <button 
        class="pagination-first px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="First page"
      >
        <i class="fas fa-angle-double-left"></i>
      </button>
      <button 
        class="pagination-prev px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Previous page"
      >
        <i class="fas fa-angle-left"></i>
      </button>
      <button 
        class="pagination-next px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Next page"
      >
        <i class="fas fa-angle-right"></i>
      </button>
      <button 
        class="pagination-last px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Last page"
      >
        <i class="fas fa-angle-double-right"></i>
      </button>
    </div>
  `;

    // Add event listeners
    const prevBtn = paginationContainer.querySelector('.pagination-prev');
    const nextBtn = paginationContainer.querySelector('.pagination-next');
    const firstBtn = paginationContainer.querySelector('.pagination-first');
    const lastBtn = paginationContainer.querySelector('.pagination-last');

    if (firstBtn) {
      firstBtn.addEventListener('click', () => goToPage(sectionName, tabIndex, 1));
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', () => goToPage(sectionName, tabIndex, 'prev'));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => goToPage(sectionName, tabIndex, 'next'));
    }
    if (lastBtn) {
      lastBtn.addEventListener('click', () => {
        const state = getPaginationState(sectionName, tabIndex);
        const totalRows = countTableRows(sectionName, tabIndex);
        const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
        goToPage(sectionName, tabIndex, totalPages);
      });
    }

    // Insert after table
    tableParent.appendChild(paginationContainer);

    // Initially hide - will be shown by updatePaginationControls when rows are added
    paginationContainer.classList.add('hidden');
    
    // Force an initial update to check if rows exist
    setTimeout(() => {
      updatePaginationControls(sectionName, tabIndex);
      // Remove from in-progress set after creation is complete
      creationInProgress.delete(key);
    }, 100);
  
  } catch (error) {
    // If error occurs, remove from in-progress set
    creationInProgress.delete(key);
    console.error('Error creating pagination controls:', error);
  }
}

/**
 * Navigate to a specific page
 */
export function goToPage(sectionName, tabIndex, targetPage) {
  const state = getPaginationState(sectionName, tabIndex);
  let newPage = targetPage;

  if (targetPage === 'prev') {
    newPage = Math.max(1, state.currentPage - 1);
  } else if (targetPage === 'next') {
    const totalRows = countTableRows(sectionName, tabIndex);
    const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
    newPage = Math.min(totalPages, state.currentPage + 1);
  }

  setPaginationState(sectionName, tabIndex, { currentPage: newPage });
  renderPage(sectionName, tabIndex);
  updatePaginationControls(sectionName, tabIndex);
}

/**
 * Render rows for current page
 */
export function renderPage(sectionName, tabIndex, skipSearchCheck = false) {
  const state = getPaginationState(sectionName, tabIndex);
  const emptyText = document.getElementById(`${sectionName}SectionOneListEmpty${tabIndex}`);
  if (!emptyText) return;

  // Check if search is active - if so, don't apply pagination filtering
  const searchInput = document.getElementById(`${sectionName}SectionOneSearch`);
  const isSearching = searchInput && searchInput.value.trim() !== '';
  
  if (isSearching && !skipSearchCheck) {
    // Search is active - pagination is handled by search logic
    return;
  }

  const tbody = emptyText.closest('tbody');
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll('tr'));
  // Filter out the empty placeholder row and get visible rows (not hidden by search)
  const dataRows = rows.filter((row) => {
    if (row.contains(emptyText)) return false;
    if (row.children.length === 0) return false;
    // If search is active, only include rows that match (not hidden by search)
    if (isSearching) {
      return !row.classList.contains('hidden');
    }
    return true;
  });

  if (dataRows.length === 0) {
    emptyText.parentElement.classList.remove('hidden');
    updatePaginationControls(sectionName, tabIndex);
    return;
  }

  // Hide empty placeholder
  emptyText.parentElement.classList.add('hidden');

  // Apply pagination only if not searching
  if (!isSearching) {
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;

    dataRows.forEach((row, index) => {
      if (index >= startIndex && index < endIndex) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  }

  updatePaginationControls(sectionName, tabIndex);
}

/**
 * Reset pagination to page 1 (e.g., after search or data reload)
 */
export function resetPagination(sectionName, tabIndex) {
  setPaginationState(sectionName, tabIndex, { currentPage: 1 });
  renderPage(sectionName, tabIndex);
}

// Debounce pagination refresh to batch updates
let refreshTimeouts = new Map();

/**
 * Update pagination when rows are added/removed (debounced)
 */
export function refreshPagination(sectionName, tabIndex) {
  const key = getPaginationKey(sectionName, tabIndex);
  
  // Clear existing timeout
  if (refreshTimeouts.has(key)) {
    clearTimeout(refreshTimeouts.get(key));
  }
  
  // Set new timeout to batch updates
  const timeout = setTimeout(() => {
    renderPage(sectionName, tabIndex);
    updatePaginationControls(sectionName, tabIndex); // Ensure controls visibility is updated
    refreshTimeouts.delete(key);
  }, 10);
  
  refreshTimeouts.set(key, timeout);
}

/**
 * Clear pagination state (e.g., when switching sections)
 */
export function clearPagination(sectionName, tabIndex) {
  const key = getPaginationKey(sectionName, tabIndex);
  paginationState.delete(key);
  
  // Clear any timeout for this pagination
  if (refreshTimeouts.has(key)) {
    clearTimeout(refreshTimeouts.get(key));
    refreshTimeouts.delete(key);
  }
  
  const paginationContainer = document.getElementById(`${sectionName}PaginationContainer${tabIndex}`);
  if (paginationContainer) {
    paginationContainer.remove();
  }
}

