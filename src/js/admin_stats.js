import { API_BASE_URL } from './_global.js';
import { db } from './firebase.js';
import { collection, getDocs, query } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import customers from './admin_modules/inquiry_customers.js';

document.addEventListener('ogfmsiAdminMainLoaded', function () {
  document.querySelectorAll('.section-stats, .section-stats-base').forEach((sectionStats) => {
    if (!sectionStats.dataset.activated) {
      sectionStats.dataset.activated = '1';
      sectionStats.addEventListener('click', function (e) {
        const icon = e.target.closest('.section-stats-f');
        if (icon) {
          const rawType = icon.dataset.type;
          let type = rawType && rawType !== 'undefined' ? rawType : '';
          const section = sectionStats.dataset.section || '';
          // Fallback: use the visible header text if type is not provided in HTML
          if (!type) {
            try {
              const headerText = sectionStats.querySelector('.section-stats-h')?.textContent || '';
              type = headerText.trim();
            } catch (_) {}
          }
          if (!type) return;
          openStatsBreakdownModal({ section, type });
          return;
        }
        if (sectionStats.classList.contains('section-stats')) {
          sectionStats.children[2].classList.toggle('hidden');
          sectionStats.children[3].classList.toggle('hidden');
        }
      });
    }
  });
});

// Lightweight modal for stats breakdown
function ensureStatsBreakdownModal() {
  let modal = document.getElementById('stats-breakdown-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'stats-breakdown-modal';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.background = 'rgba(0,0,0,0.5)';
  modal.style.backdropFilter = 'blur(4px)';
  modal.style.display = 'none';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '99998';
  modal.style.opacity = '0';
  modal.style.transition = 'opacity 0.2s ease';

  const panel = document.createElement('div');
  panel.style.background = '#ffffff';
  panel.style.borderRadius = '16px';
  panel.style.width = 'min(96vw, 1050px)';
  panel.style.maxHeight = '85vh';
  panel.style.boxShadow = '0 20px 60px rgba(0,0,0,0.3), 0 0 1px rgba(0,0,0,0.1)';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.overflow = 'hidden';
  panel.style.transform = 'scale(0.95)';
  panel.style.transition = 'transform 0.2s ease';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.padding = '20px 24px';
  header.style.borderBottom = '2px solid #f3f4f6';
  header.style.background = 'linear-gradient(to bottom, #ffffff, #fafafa)';

  const title = document.createElement('div');
  title.id = 'stats-breakdown-title';
  title.style.fontWeight = '800';
  title.style.fontSize = '18px';
  title.style.color = '#111827';
  title.style.letterSpacing = '-0.01em';
  title.textContent = 'Breakdown';

  const close = document.createElement('button');
  close.textContent = '✕';
  close.style.fontSize = '18px';
  close.style.lineHeight = '18px';
  close.style.padding = '8px 10px';
  close.style.borderRadius = '10px';
  close.style.background = '#f3f4f6';
  close.style.border = 'none';
  close.style.color = '#6b7280';
  close.style.cursor = 'pointer';
  close.style.transition = 'all 0.15s ease';
  close.style.fontWeight = '600';
  close.addEventListener('mouseenter', () => {
    close.style.background = '#ef4444';
    close.style.color = '#ffffff';
    close.style.transform = 'scale(1.05)';
  });
  close.addEventListener('mouseleave', () => {
    close.style.background = '#f3f4f6';
    close.style.color = '#6b7280';
    close.style.transform = 'scale(1)';
  });
  close.addEventListener('click', () => {
    modal.style.opacity = '0';
    panel.style.transform = 'scale(0.95)';
    setTimeout(() => modal.style.display = 'none', 200);
  });

  header.appendChild(title);
  header.appendChild(close);

  const body = document.createElement('div');
  body.id = 'stats-breakdown-body';
  body.style.padding = '24px';
  body.style.overflow = 'auto';
  body.style.maxHeight = 'calc(85vh - 80px)';
  body.style.background = '#ffffff';
  body.innerHTML = `
    <div style="text-align:center;padding:40px 20px">
      <div style="display:inline-block;width:40px;height:40px;border:4px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:16px"></div>
      <div style="color:#6b7280;font-weight:600;font-size:14px">Loading breakdown...</div>
    </div>
  `;

  // Add keyframes for loading spinner
  if (!document.getElementById('stats-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'stats-modal-styles';
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      #stats-breakdown-body::-webkit-scrollbar {
        width: 8px;
      }
      #stats-breakdown-body::-webkit-scrollbar-track {
        background: #f3f4f6;
        border-radius: 10px;
      }
      #stats-breakdown-body::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 10px;
      }
      #stats-breakdown-body::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }
    `;
    document.head.appendChild(style);
  }

  panel.appendChild(header);
  panel.appendChild(body);
  modal.appendChild(panel);
  modal.addEventListener('click', (evt) => {
    if (evt.target === modal) {
      modal.style.opacity = '0';
      panel.style.transform = 'scale(0.95)';
      setTimeout(() => modal.style.display = 'none', 200);
    }
  });
  document.body.appendChild(modal);
  return modal;
}

function openStatsBreakdownModal({ section = '', type = '' } = {}) {
  const modal = ensureStatsBreakdownModal();
  const panel = modal.querySelector('div');
  const title = modal.querySelector('#stats-breakdown-title');
  const body = modal.querySelector('#stats-breakdown-body');
  title.textContent = `Breakdown${type ? ' · ' + type : ''}`;
  body.innerHTML = `
    <div style="text-align:center;padding:40px 20px">
      <div style="display:inline-block;width:40px;height:40px;border:4px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:16px"></div>
      <div style="color:#6b7280;font-weight:600;font-size:14px">Loading breakdown...</div>
    </div>
  `;
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.style.opacity = '1';
    panel.style.transform = 'scale(1)';
  }, 10);

  // Let modules populate the breakdown
  const evt = new CustomEvent('ogfmsi:statsBreakdown', {
    detail: {
      section,
      type,
      container: body,
      close: () => {
        modal.style.opacity = '0';
        panel.style.transform = 'scale(0.95)';
        setTimeout(() => modal.style.display = 'none', 200);
      },
      setTitle: (t) => (title.textContent = t),
    },
  });
  document.dispatchEvent(evt);

  // Fallback content if nothing handled it shortly
  setTimeout(() => {
    if (!body.dataset.filled) {
      body.innerHTML = `
        <div style="text-align:center;padding:40px 20px">
          <div style="width:64px;height:64px;margin:0 auto 20px;background:linear-gradient(135deg,#f3f4f6,#e5e7eb);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:32px">📊</div>
          <div style="color:#111827;font-weight:800;margin-bottom:8px;font-size:16px">No breakdown data available</div>
          <div style="color:#6b7280;font-size:14px;line-height:1.6">This section has not provided a breakdown yet.</div>
        </div>
      `;
    }
  }, 250);
}

document.addEventListener('ogfmsi:statsBreakdown', async (e) => {
  const { section, type, container, setTitle, close } = e.detail || {};
  const t = (type || '').toLowerCase();
  const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // Local day boundaries for accurate "today" filtering
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const isTodayLocal = (d) => {
    const dt = d ? new Date(d) : null;
    return dt instanceof Date && !isNaN(dt) && dt >= startOfToday && dt <= endOfToday;
  };

  async function getPayments(path) {
    const res = await fetch(`${API_BASE_URL}${path}`);
    const data = await res.json();
    return Array.isArray(data.result) ? data.result : [];
  }

  async function renderPaymentsBreakdown(list, filterFn, title, explain) {
    const rows = list.filter(filterFn);
    const total = rows.reduce((s, p) => {
      let displayAmount =
        s +
        (Number(p.payment_amount_paid_cash) || 0) +
        (Number(p.payment_amount_paid_cashless) || 0) -
        (Number(p.payment_amount_change) || 0);
      if (title === "Today's Cash Sales" || title === "Today's Cashless Sales") {
        if (p.payment_method === 'cash') {
          displayAmount = s + (Number(p.payment_amount_paid_cash) || 0) - (Number(p.payment_amount_change) || 0);
        } else if (p.payment_method === 'cashless') {
          displayAmount = s + (Number(p.payment_amount_paid_cashless) || 0);
        } else if (p.payment_method === 'hybrid') {
          if (title === "Today's Cash Sales") {
            displayAmount = s + (Number(p.payment_amount_paid_cash) || 0) - (Number(p.payment_amount_change) || 0);
          } else if (title === "Today's Cashless Sales") {
            displayAmount = s + (Number(p.payment_amount_paid_cashless) || 0);
          }
        }
      }
      return displayAmount;
    }, 0);
    const pageSize = 10;
    let currentPage = 1;
    let filteredRows = [];
    let currentPurpose = '';
    let currentDate = '';

    // Whitelisted purposes for this breakdown (plus method entries for the dropdown)
    let PURPOSE_FILTERS = [
      {
        value: 'daily-checkin',
        label: 'Daily check-in',
        match: (s) => s.includes('daily check-in'),
      },
      {
        value: 'online-facility',
        label: 'Online facility reservation fee',
        match: (s) => s.includes('online facility reservation fee'),
      },
      {
        value: 'manual-facility',
        label: 'Manual facility reservation fee',
        match: (s) => s.includes('manual facility reservation fee'),
      },
      {
        value: 'monthly-registration',
        label: 'Monthly registration fee',
        match: (s) => s.includes('monthly registration fee'),
      },
      {
        value: 'online-monthly-registration',
        label: 'Online monthly registration fee',
        match: (s) => s.includes('online monthly registration fee'),
      },
      {
        value: 'products',
        label: 'Product purchases',
        match: (s) => s.startsWith('purchasing '),
      },
      // Method-based options (no match function; used only for method filtering)
      {
        value: 'method-cash',
        label: 'Cash',
      },
      {
        value: 'method-cashless',
        label: 'Cashless',
      },
      {
        value: 'method-hybrid',
        label: 'Hybrid',
      },
    ];

    // For Product Sales breakdown, only keep the Product purchases purpose option (plus methods)
    if (title === 'Product Sales') {
      PURPOSE_FILTERS = [
        {
          value: 'products',
          label: 'Product purchases',
          match: (s) => s.startsWith('purchasing '),
        },
        { value: 'method-cash', label: 'Cash' },
        { value: 'method-cashless', label: 'Cashless' },
        { value: 'method-hybrid', label: 'Hybrid' },
      ];
    }

    function isWhitelistedPurpose(purposeRaw) {
      const s = String(purposeRaw || '').trim().toLowerCase();
      if (!s) return false;
      // Only purpose-based entries (with a match function) participate in whitelist
      return PURPOSE_FILTERS.some((f) => typeof f.match === 'function' && f.match(s));
    }

    // Start with only whitelisted purposes
    filteredRows = rows.filter((p) => isWhitelistedPurpose(p.payment_purpose));

    function renderPage(page) {
      const totalRows = filteredRows.length;
      const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

      if (page < 1) page = 1;
      if (page > totalPages) page = totalPages;
      currentPage = page;
      const start = (page - 1) * pageSize;
      const slice = filteredRows.slice(start, start + pageSize);

      const rowsHtml =
        slice
          .map((p) => {
            const date = (p.created_at && new Date(p.created_at)) || null;
            const dateText = date
              ? `${date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })} ${date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}`
              : '';
            const cash = Number(p.payment_amount_paid_cash) || 0;
            const cashless = Number(p.payment_amount_paid_cashless) || 0;
            const change = Number(p.payment_amount_change) || 0;
            let displayAmount = fmt(cash + cashless - change);
            if (title === "Today's Cash Sales" || title === "Today's Cashless Sales") {
              if (p.payment_method === 'cash') {
                displayAmount = fmt(cash - change);
              } else if (p.payment_method === 'cashless') {
                displayAmount = fmt(cashless);
              } else if (p.payment_method === 'hybrid') {
                if (title === "Today's Cash Sales") {
                  displayAmount = fmt(cash - change) + ' (Hybrid)';
                } else if (title === "Today's Cashless Sales") {
                  displayAmount = fmt(cashless) + ' (Hybrid)';
                }
              }
            }
            const method = (p.payment_method || '').toString().toUpperCase() || '-';
            return `
              <tr style="border-bottom:1px solid #e5e7eb">
                <td style="padding:10px 12px;font-family:monospace;font-size:12px;color:#374151">${p.payment_id || ''}</td>
                <td style="padding:10px 12px;font-size:13px;color:#111827;white-space:normal;word-break:break-word;">${(p.payment_purpose || '').trim() || 'Transaction'}</td>
                <td style="padding:10px 12px;font-size:12px;color:#4b5563">${dateText || ''}</td>
                <td style="padding:10px 12px;font-size:12px;color:#4b5563">${method}</td>
                <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#10b981">${displayAmount}</td>
              </tr>
            `;
          })
          .join('') ||
        '<tr><td colspan="5" style="padding:32px 12px;text-align:center;font-size:14px;color:#9ca3af">📭 No matching records found.</td></tr>';

      container.innerHTML = `
        <div style="background:linear-gradient(135deg,#3b82f6,#2563eb);padding:20px;border-radius:12px;margin-bottom:16px;box-shadow:0 4px 12px rgba(59,130,246,0.2);display:flex;flex-direction:column;gap:4px">
          <div style="font-weight:800;color:#ffffff;font-size:16px;letter-spacing:-0.01em">${title}</div>
          <div style="font-weight:800;color:#ffffff;font-size:24px;letter-spacing:-0.02em">${fmt(total)}</div>

          <div style="color:#dbeafe;font-size:12px">${totalRows} transaction${totalRows !== 1 ? 's' : ''}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:8px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#4b5563">
            <span>Date</span>
            <input type="date" data-role="filter-date" style="padding:5px 8px;border-radius:999px;border:1px solid #d1d5db;font-size:12px;background:#ffffff;color:#374151;outline:none" />
          </div>
          <select data-role="filter-purpose" style="padding:7px 10px;border-radius:999px;border:1px solid #d1d5db;font-size:12px;background:#ffffff;color:#374151;outline:none;max-width:320px">
            <option value="">All purposes</option>
            ${PURPOSE_FILTERS.map((f) => `<option value="${f.value}">${f.label}</option>`).join('')}
          </select>
        </div>

        <div style="border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;background:#ffffff">
          <div style="max-height:420px;overflow:auto">

            <table style="width:100%;border-collapse:collapse;font-size:13px;table-layout:auto">
              <thead style="background:#f9fafb;border-bottom:1px solid #e5e7eb">
                <tr>
                  <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.03em;text-transform:uppercase;white-space:nowrap;width:18%">ID</th>
                  <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.03em;text-transform:uppercase;white-space:nowrap;width:32%">Purpose</th>
                  <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.03em;text-transform:uppercase;white-space:nowrap;width:25%">Date / Time</th>
                  <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.03em;text-transform:uppercase;white-space:nowrap;width:10%">Method</th>
                  <th style="text-align:right;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.03em;text-transform:uppercase;white-space:nowrap;width:15%">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#4b5563">
            <div>Page ${page} of ${totalPages}</div>
            <div style="display:flex;gap:8px">
              <button data-role="first" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === 1 ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>First</button>
              <button data-role="prev" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === 1 ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Prev</button>
              <button data-role="next" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === totalPages ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Next</button>
              <button data-role="last" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === totalPages ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Last</button>
            </div>
          </div>
        </div>
      `;

      container.dataset.filled = '1';

      const firstBtn = container.querySelector('button[data-role="first"]');
      const prevBtn = container.querySelector('button[data-role="prev"]');
      const nextBtn = container.querySelector('button[data-role="next"]');
      const lastBtn = container.querySelector('button[data-role="last"]');

      if (firstBtn && page > 1) {
        firstBtn.addEventListener('click', () => renderPage(1));
      }
      if (prevBtn && page > 1) {
        prevBtn.addEventListener('click', () => renderPage(page - 1));
      }
      if (nextBtn && page < totalPages) {
        nextBtn.addEventListener('click', () => renderPage(page + 1));
      }
      if (lastBtn && page < totalPages) {
        lastBtn.addEventListener('click', () => renderPage(totalPages));
      }

      // Re-wire filters on each render so controls are interactive
      const purposeSelect = container.querySelector('select[data-role="filter-purpose"]');
      const dateInput = container.querySelector('input[data-role="filter-date"]');
      if (purposeSelect) purposeSelect.value = currentPurpose;
      if (dateInput) dateInput.value = currentDate;

      function applyFilters() {
        const selected = (purposeSelect?.value || '').toLowerCase();
        currentPurpose = selected;

        const dateVal = (dateInput?.value || '').trim();
        currentDate = dateVal;

        // First, only keep whitelisted purposes (purpose-based)
        let base = rows.filter((p) => isWhitelistedPurpose(p.payment_purpose));

        const def = PURPOSE_FILTERS.find((f) => f.value === selected);

        // If no specific filter selected, just use the base set
        if (!selected || !def) {
          filteredRows = base;
        } else if (!def.match) {
          // Method-based option (Cash / Cashless / Hybrid)
          let method = '';
          if (def.value === 'method-cash') method = 'cash';
          else if (def.value === 'method-cashless') method = 'cashless';
          else if (def.value === 'method-hybrid') method = 'hybrid';

          if (method) {
            filteredRows = base.filter(
              (p) => String(p.payment_method || '').toLowerCase() === method
            );
          } else {
            filteredRows = base;
          }
        } else {
          // Purpose-based option
          filteredRows = base.filter((p) => {
            const s = String(p.payment_purpose || '').trim().toLowerCase();
            return def.match(s);
          });
        }

        // Single date filter on created_at (exact day)
        if (dateVal) {
          filteredRows = filteredRows.filter((p) => {
            if (!p.created_at) return false;
            const d = new Date(p.created_at);
            if (!(d instanceof Date) || isNaN(d)) return false;
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const da = String(d.getDate()).padStart(2, '0');
            const dayStr = `${y}-${m}-${da}`;
            return dayStr === dateVal;
          });
        }

        renderPage(1);
      }

      if (purposeSelect) {
        purposeSelect.addEventListener('change', applyFilters);
      }
      if (dateInput) {
        dateInput.addEventListener('change', applyFilters);
      }
    }

    renderPage(1);
  }

  async function handleDashboard() {
    // Only handle when the source section is the dashboard
    if (String(section || '').toLowerCase() !== 'dashboard') return false;
    if (t.includes('overall total sales')) {
      const payments = await getPayments('/payment/complete');
      const isComplete = (p) => {
        const s = (p.payment_type || '').toLowerCase();
        return s.includes('service') || s.includes('sales');
      };
      await renderPaymentsBreakdown(
        payments,
        isComplete,
        'Overall Total Sales',
        'Sum of all completed payments: amount_paid_cash + amount_paid_cashless per transaction.'
      );
      return true;
    }
    if (t.includes('nearly') && t.includes('expiring') && t.includes('monthly')) {
      // Breakdown: Nearly Expiring Monthly Passes
      try {
        const [customersResponse, monthlyResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/inquiry/customers`),
          fetch(`${API_BASE_URL}/inquiry/monthly`),
        ]);

        if (!customersResponse.ok || !monthlyResponse.ok) {
          throw new Error(`HTTP error! status: ${customersResponse.status || monthlyResponse.status}`);
        }

        const customersData = await customersResponse.json();
        const monthlyData = await monthlyResponse.json();

        const customerMap = {};
        customersData.result.forEach((c) => {
          customerMap[c.customer_id] = c;
        });

        const today = new Date();
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(today.getDate() + 14);

        const upcoming = (Array.isArray(monthlyData.result) ? monthlyData.result : []).filter((m) => {
          const endDate = new Date(m.customer_end_date);
          if (!(endDate instanceof Date) || isNaN(endDate)) return false;
          if (Number(m.customer_pending) !== 0) return false;
          return endDate >= today && endDate <= twoWeeksFromNow;
        });

        const rows = upcoming
          .map((m) => {
            const c = customerMap[m.customer_id];
            if (!c) return null;
            const endDate = new Date(m.customer_end_date);
            const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            const daysText =
              daysLeft === 0 ? 'Ends today' : daysLeft === 1 ? 'Ends tomorrow' : `${daysLeft} days`;

            return {
              id: c.customer_id,
              name: `${c.customer_first_name || ''} ${c.customer_last_name || ''}`.trim(),
              contact: c.customer_contact || 'N/A',
              daysText,
              daysLeft,
            };
          })
          .filter(Boolean);

        const pageSize = 10;
        let currentPage = 1;
        let filtered = rows.slice();
        let currentFilter = '';

        function renderUpcoming(page) {
          const totalRows = filtered.length;
          const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
          if (page < 1) page = 1;
          if (page > totalPages) page = totalPages;
          currentPage = page;
          const start = (page - 1) * pageSize;
          const slice = filtered.slice(start, start + pageSize);

          const rowsHtml =
            slice
              .map((r) => {
                const contact = (r.contact || '').trim();
                const contactLine = contact && contact.toLowerCase() !== 'n/a'
                  ? `<div style="font-size:11px;color:#6b7280">${contact}</div>`
                  : '';
                return `
                <tr style="border-bottom:1px solid #e5e7eb">
                  <td style="padding:10px 12px;font-family:monospace;font-size:12px;color:#374151">id_${r.id || ''}</td>
                  <td style="padding:10px 12px;font-size:13px;color:#111827">${r.name || 'Customer'}${contactLine}</td>
                  <td style="padding:10px 12px;font-size:12px;color:#4b5563">${r.daysText || ''}</td>
                  <td style="padding:10px 12px;font-size:12px;color:#2563eb;text-align:right">
                    <button data-role="renew" data-id="${r.id || ''}" style="padding:6px 10px;border-radius:999px;border:1px solid #3b82f6;background:#eff6ff;color:#1d4ed8;font-size:12px;cursor:pointer">Renew</button>
                  </td>
                </tr>
              `;
              })
              .join('') ||
            '<tr><td colspan="4" style="padding:32px 12px;text-align:center;font-size:14px;color:#9ca3af">📭 No nearly expiring monthly passes.</td></tr>';

          container.innerHTML = `
            <div style="margin-bottom:16px;padding:12px 14px;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:12px">
              <div style="font-weight:700;font-size:14px">Nearly Expiring Monthly Passes</div>
              <div style="font-size:12px;opacity:.9">${totalRows} customer${totalRows === 1 ? '' : 's'} within 14 days</div>
            </div>
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:8px">
              <select data-role="filter-days" style="padding:7px 10px;border-radius:999px;border:1px solid #d1d5db;font-size:12px;background:#ffffff;color:#374151;outline:none">
                <option value="">All passes</option>
                <option value="today">Ends today</option>
                <option value="tomorrow">Ends tomorrow</option>
                <option value="0-3">0-3 days</option>
                <option value="4-7">4-7 days</option>
                <option value="8-14">8-14 days</option>
              </select>
            </div>
            <div style="border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;background:#ffffff">
              <div style="max-height:420px;overflow:auto">
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                  <thead style="background:#f9fafb;border-bottom:1px solid #e5e7eb">
                    <tr>
                      <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.05em;text-transform:uppercase">Customer ID</th>
                      <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.05em;text-transform:uppercase">Customer</th>
                      <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.05em;text-transform:uppercase">Expires After</th>
                      <th style="text-align:right;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.05em;text-transform:uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#4b5563">
                <div>Page ${page} of ${totalPages}</div>
                <div style="display:flex;gap:8px">
                  <button data-role="first" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === 1 ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>First</button>
                  <button data-role="prev" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === 1 ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Prev</button>
                  <button data-role="next" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === totalPages ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Next</button>
                  <button data-role="last" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === totalPages ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Last</button>
                </div>
              </div>
            </div>
          `;

          container.dataset.filled = '1';

          const firstBtn = container.querySelector('button[data-role="first"]');
          const prevBtn = container.querySelector('button[data-role="prev"]');
          const nextBtn = container.querySelector('button[data-role="next"]');
          const lastBtn = container.querySelector('button[data-role="last"]');

          if (firstBtn && page > 1) {
            firstBtn.addEventListener('click', () => renderUpcoming(1));
          }
          if (prevBtn && page > 1) {
            prevBtn.addEventListener('click', () => renderUpcoming(page - 1));
          }
          if (nextBtn && page < totalPages) {
            nextBtn.addEventListener('click', () => renderUpcoming(page + 1));
          }
          if (lastBtn && page < totalPages) {
            lastBtn.addEventListener('click', () => renderUpcoming(totalPages));
          }

          // Wire renew buttons
          container.querySelectorAll('button[data-role="renew"]').forEach((btn) => {
            const id = btn.getAttribute('data-id');
            if (!id) return;
            btn.addEventListener('click', () => {
              try {
                customers.startRenewCustomer(id);
                close?.();
              } catch (_) {}
            });
          });

          // Wire filter dropdown
          const filterSelect = container.querySelector('select[data-role="filter-days"]');
          if (filterSelect) filterSelect.value = currentFilter;

          function applyFilter() {
            const v = (filterSelect?.value || '').toLowerCase();
            currentFilter = v;

            if (!v) {
              filtered = rows.slice();
            } else if (v === 'today') {
              filtered = rows.filter((r) => r.daysLeft === 0);
            } else if (v === 'tomorrow') {
              filtered = rows.filter((r) => r.daysLeft === 1);
            } else if (v === '0-3') {
              filtered = rows.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 3);
            } else if (v === '4-7') {
              filtered = rows.filter((r) => r.daysLeft >= 4 && r.daysLeft <= 7);
            } else if (v === '8-14') {
              filtered = rows.filter((r) => r.daysLeft >= 8 && r.daysLeft <= 14);
            } else {
              filtered = rows.slice();
            }

            renderUpcoming(1);
          }

          if (filterSelect) {
            filterSelect.addEventListener('change', applyFilter);
          }
        }

        renderUpcoming(1);
      } catch (err) {
        console.error('Error loading nearly expiring monthly passes breakdown:', err);
        container.innerHTML = `
          <div style="text-align:center;padding:40px 20px">
            <div style="width:64px;height:64px;margin:0 auto 20px;background:linear-gradient(135deg,#f3f4f6,#e5e7eb);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:32px">📭</div>
            <div style="color:#111827;font-weight:800;margin-bottom:8px;font-size:16px">Unable to load nearly expiring passes</div>
            <div style="color:#6b7280;font-size:14px;line-height:1.6">Please try again later.</div>
          </div>
        `;
        container.dataset.filled = '1';
      }
      return true;
    }

    if (t.includes('gym') && t.includes('revenue')) {
      const payments = await getPayments('/payment/complete');
      const isGym = (p) => {
        const s = (p.payment_purpose || '').toLowerCase();
        const s2 = (p.payment_type || '').toLowerCase();
        return !s.includes('reservation') && s2.includes('service');
      };
      await renderPaymentsBreakdown(
        payments,
        isGym,
        'Gym Revenue',
        'Filtered by purpose including monthly, membership, gym, pass, subscription. Total = cash + cashless per transaction.'
      );
      return true;
    }
    if (t.includes('reservation') && t.includes('revenue')) {
      const payments = await getPayments('/payment/complete');
      const isRes = (p) => {
        const s = (p.payment_purpose || '').toLowerCase();
        const s2 = (p.payment_type || '').toLowerCase();
        return s.includes('reservation') && s2.includes('service');
      };
      await renderPaymentsBreakdown(
        payments,
        isRes,
        'Reservation Revenue',
        'Filtered by purpose including reservation, booking, facility, class, session. Total = cash + cashless per transaction.'
      );
      return true;
    }
    if (t.includes('product') && t.includes('sales')) {
      const payments = await getPayments('/payment/sales');
      const isProd = (p) => {
        const s = (p.payment_type || '').toLowerCase();
        return s.includes('sales');
      };
      await renderPaymentsBreakdown(
        payments,
        isProd,
        'Product Sales',
        'Product Sales Transactions Log. Total = cash + cashless per transaction.'
      );
      return true;
    }
    return false;
  }

  async function handlePayments() {
    if (t.includes('avg') && t.includes('overall') && t.includes('total')) {
      const list = await getPayments('/payment/complete');
      const sumAmt = (p) =>
        (Number(p.payment_amount_paid_cash) || 0) +
        (Number(p.payment_amount_paid_cashless) || 0) -
        (Number(p.payment_amount_change) || 0);
      const todaysCash = list
        .filter((p) => String(p.payment_method || '').toLowerCase() === 'cash' && isTodayLocal(p.created_at))
        .reduce((s, p) => s + sumAmt(p), 0);
      const todaysCashless = list
        .filter((p) => String(p.payment_method || '').toLowerCase() === 'cashless' && isTodayLocal(p.created_at))
        .reduce((s, p) => s + sumAmt(p), 0);
      const total = todaysCash + todaysCashless;
      try {
        setTitle('Avg Overall Total');
      } catch (e) {}
      container.innerHTML = `
        <div style="background:linear-gradient(135deg,#0ea5e9,#2563eb);padding:20px;border-radius:12px;margin-bottom:12px;color:#fff">
          <div style="font-weight:800;margin-bottom:6px;font-size:16px">Avg Overall Total</div>
          <div style="font-weight:900;font-size:28px">${fmt(total)}</div>
          <div style="color:#dbeafe;font-size:13px;margin-top:8px">Today's Cash (${fmt(todaysCash)}) + Today's Cashless (${fmt(todaysCashless)})</div>
        </div>
      `;
      container.dataset.filled = '1';
      return true;
    }
    if (t.includes('overall total sales')) {
      const list = await getPayments('/payment/complete');
      const todaysCash = list
        .filter(
          (p) =>
            (String(p.payment_method || '').toLowerCase() === 'cash' ||
              String(p.payment_method || '').toLowerCase() === 'hybrid') &&
            isTodayLocal(p.created_at)
        )
        .reduce((s, p) => s + (Number(p.payment_amount_paid_cash) || 0) - (Number(p.payment_amount_change) || 0), 0);
      const todaysCashless = list
        .filter(
          (p) =>
            (String(p.payment_method || '').toLowerCase() === 'cashless' ||
              String(p.payment_method || '').toLowerCase() === 'hybrid') &&
            isTodayLocal(p.created_at)
        )
        .reduce((s, p) => s + (Number(p.payment_amount_paid_cashless) || 0), 0);
      const total = todaysCash + todaysCashless;
      try {
        setTitle('Avg Overall Total');
      } catch (e) {}
      container.innerHTML = `
        <div style="background:linear-gradient(135deg,#0ea5e9,#2563eb);padding:20px;border-radius:12px;margin-bottom:12px;color:#fff">
          <div style="font-weight:800;margin-bottom:6px;font-size:16px">Avg Overall Total</div>
          <div style="font-weight:900;font-size:28px">${fmt(total)}</div>
          <div style="color:#dbeafe;font-size:13px;margin-top:8px">Today's Cash (${fmt(todaysCash)}) + Today's Cashless (${fmt(todaysCashless)})</div>
        </div>
      `;
      container.dataset.filled = '1';
      return true;
    }
    if (t.includes('cash sales today')) {
      const list = await getPayments('/payment/complete');
      await renderPaymentsBreakdown(
        list,
        (p) =>
          (String(p.payment_method || '').toLowerCase() === 'cash' ||
            String(p.payment_method || '').toLowerCase() === 'hybrid') &&
          isTodayLocal(p.created_at),
        "Today's Cash Sales",
        'Filter: payment_method = cash AND created_at is today.'
      );
      return true;
    }
    if (t.includes('cashless sales today')) {
      const list = await getPayments('/payment/complete');
      await renderPaymentsBreakdown(
        list,
        (p) =>
          (String(p.payment_method || '').toLowerCase() === 'cashless' ||
            String(p.payment_method || '').toLowerCase() === 'hybrid') &&
          isTodayLocal(p.created_at),
        "Today's Cashless Sales",
        'Filter: payment_method = cashless AND created_at is today.'
      );
      return true;
    }
    if (t.includes('average daily sales')) {
      const list = await getPayments('/payment/complete');

      const filtered = list.filter((p) => {
        const type = String(p.payment_type || '').toLowerCase();
        return type === 'sales' || type === 'service';
      });

      const totalIncome = filtered.reduce((sum, p) => {
        return sum + (Number(p.payment_amount_to_pay) || 0);
      }, 0);

      const distinctDays = new Set();
      filtered.forEach((p) => {
        const day = String(p.created_at || '').slice(0, 10);
        if (day) distinctDays.add(day);
      });

      const totalDays = Math.max(distinctDays.size, 1);
      const averageDaily = totalIncome / totalDays;

      const byDay = new Map();
      filtered.forEach((p) => {
        const day = String(p.created_at || '').slice(0, 10);
        const amt = Number(p.payment_amount_to_pay) || 0;
        byDay.set(day, (byDay.get(day) || 0) + amt);
      });

      const entries = Array.from(byDay.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
      const pageSize = 10;
      let currentPage = 1;

      function renderDaily(page) {
        const totalRows = entries.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        currentPage = page;
        const start = (page - 1) * pageSize;
        const slice = entries.slice(start, start + pageSize);
        const rowsHtml =
          slice
            .map(
              ([day, sum]) => `
              <tr style="border-bottom:1px solid #e5e7eb">
                <td style="padding:10px 12px;font-size:13px;color:#111827">${day}</td>
                <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#10b981;text-align:right">${fmt(sum)}</td>
              </tr>
            `
            )
            .join('') ||
          '<tr><td colspan="2" style="padding:32px 12px;text-align:center;font-size:14px;color:#9ca3af">📭 No records found.</td></tr>';

        container.innerHTML = `
          <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:20px;border-radius:12px;margin-bottom:16px;box-shadow:0 4px 12px rgba(139,92,246,0.2)">
            <div style="font-weight:800;color:#ffffff;margin-bottom:6px;font-size:16px;letter-spacing:-0.01em">Average Daily Sales</div>
            <div style="font-weight:800;color:#ffffff;font-size:28px;letter-spacing:-0.02em">${fmt(averageDaily)}</div>
            <div style="color:#ede9fe;font-size:13px;margin-top:8px">${distinctDays.size} distinct day${distinctDays.size !== 1 ? 's' : ''}</div>
          </div>
          <div style="border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;background:#ffffff">
            <div style="max-height:420px;overflow:auto">
              <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead style="background:#f9fafb;border-bottom:1px solid #e5e7eb">
                  <tr>
                    <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.05em;text-transform:uppercase">Day</th>
                    <th style="text-align:right;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.05em;text-transform:uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#4b5563">
              <div>Page ${page} of ${totalPages}</div>
              <div style="display:flex;gap:8px">
                <button data-role="first" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === 1 ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>First</button>
                <button data-role="prev" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === 1 ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Prev</button>
                <button data-role="next" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === totalPages ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Next</button>
                <button data-role="last" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === totalPages ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Last</button>
              </div>
            </div>
          </div>
        `;

        container.dataset.filled = '1';

        const firstBtn = container.querySelector('button[data-role="first"]');
        const prevBtn = container.querySelector('button[data-role="prev"]');
        const nextBtn = container.querySelector('button[data-role="next"]');
        const lastBtn = container.querySelector('button[data-role="last"]');

        if (firstBtn && page > 1) {
          firstBtn.addEventListener('click', () => renderDaily(1));
        }
        if (prevBtn && page > 1) {
          prevBtn.addEventListener('click', () => renderDaily(page - 1));
        }
        if (nextBtn && page < totalPages) {
          nextBtn.addEventListener('click', () => renderDaily(page + 1));
        }
        if (lastBtn && page < totalPages) {
          lastBtn.addEventListener('click', () => renderDaily(totalPages));
        }
      }

      renderDaily(1);
      return true;
    }

    if (t.includes('average weekly sales')) {
      const list = await getPayments('/payment/complete');

      const filtered = list.filter((p) => {
        const type = String(p.payment_type || '').toLowerCase();
        return type === 'sales' || type === 'service';
      });

      const totalIncome = filtered.reduce((sum, p) => {
        return sum + (Number(p.payment_amount_to_pay) || 0);
      }, 0);

      const distinctWeeks = new Set();
      function getYearWeek(date) {
        const d = new Date(date);
        const thursday = new Date(d);
        thursday.setDate(d.getDate() + (4 - (d.getDay() || 7)));
        const yearStart = new Date(thursday.getFullYear(), 0, 1);
        const weekNum = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
        return `${thursday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      }

      filtered.forEach((p) => {
        const week = getYearWeek(p.created_at || new Date());
        distinctWeeks.add(week);
      });

      const totalWeeks = Math.max(distinctWeeks.size, 1);
      const averageWeekly = totalIncome / totalWeeks;

      const byWeek = new Map();
      filtered.forEach((p) => {
        const week = getYearWeek(p.created_at || new Date());
        const amt = Number(p.payment_amount_to_pay) || 0;
        byWeek.set(week, (byWeek.get(week) || 0) + amt);
      });

      const entries = Array.from(byWeek.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
      const pageSize = 10;
      let currentPage = 1;

      function renderWeekly(page) {
        const totalRows = entries.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        currentPage = page;
        const start = (page - 1) * pageSize;
        const slice = entries.slice(start, start + pageSize);
        const rowsHtml =
          slice
            .map(
              ([week, sum]) => `
              <tr style="border-bottom:1px solid #e5e7eb">
                <td style="padding:10px 12px;font-size:13px;color:#111827">${week}</td>
                <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#10b981;text-align:right">${fmt(sum)}</td>
              </tr>
            `
            )
            .join('') ||
          '<tr><td colspan="2" style="padding:32px 12px;text-align:center;font-size:14px;color:#9ca3af">📭 No records found.</td></tr>';

        container.innerHTML = `
          <div style="background:linear-gradient(135deg,#ec4899,#db2777);padding:20px;border-radius:12px;margin-bottom:16px;box-shadow:0 4px 12px rgba(236,72,153,0.2)">
            <div style="font-weight:800;color:#ffffff;margin-bottom:6px;font-size:16px;letter-spacing:-0.01em">Average Weekly Sales</div>
            <div style="font-weight:800;color:#ffffff;font-size:28px;letter-spacing:-0.02em">${fmt(averageWeekly)}</div>
            <div style="color:#fce7f3;font-size:13px;margin-top:8px">${distinctWeeks.size} distinct week${distinctWeeks.size !== 1 ? 's' : ''}</div>
          </div>
          <div style="border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;background:#ffffff">
            <div style="max-height:420px;overflow:auto">
              <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead style="background:#f9fafb;border-bottom:1px solid #e5e7eb">
                  <tr>
                    <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.05em;text-transform:uppercase">Week</th>
                    <th style="text-align:right;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.05em;text-transform:uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#4b5563">
              <div>Page ${page} of ${totalPages}</div>
              <div style="display:flex;gap:8px">
                <button data-role="first" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === 1 ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>First</button>
                <button data-role="prev" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === 1 ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Prev</button>
                <button data-role="next" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === totalPages ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Next</button>
                <button data-role="last" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === totalPages ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Last</button>
              </div>
            </div>
          </div>
        `;

        container.dataset.filled = '1';

        const firstBtn = container.querySelector('button[data-role="first"]');
        const prevBtn = container.querySelector('button[data-role="prev"]');
        const nextBtn = container.querySelector('button[data-role="next"]');
        const lastBtn = container.querySelector('button[data-role="last"]');

        if (firstBtn && page > 1) {
          firstBtn.addEventListener('click', () => renderWeekly(1));
        }
        if (prevBtn && page > 1) {
          prevBtn.addEventListener('click', () => renderWeekly(page - 1));
        }
        if (nextBtn && page < totalPages) {
          nextBtn.addEventListener('click', () => renderWeekly(page + 1));
        }
        if (lastBtn && page < totalPages) {
          lastBtn.addEventListener('click', () => renderWeekly(totalPages));
        }
      }

      renderWeekly(1);
      return true;
    }

    if (t.includes('average monthly sales')) {
      const list = await getPayments('/payment/complete');

      const filtered = list.filter((p) => {
        const type = String(p.payment_type || '').toLowerCase();
        return type === 'sales' || type === 'service';
      });

      const totalIncome = filtered.reduce((sum, p) => {
        return sum + (Number(p.payment_amount_to_pay) || 0);
      }, 0);

      const distinctMonths = new Set();
      filtered.forEach((p) => {
        const month = String(p.created_at || '').slice(0, 7);
        if (month) distinctMonths.add(month);
      });

      const totalMonths = Math.max(distinctMonths.size, 1);
      const averageMonthly = totalIncome / totalMonths;

      const byMon = new Map();
      filtered.forEach((p) => {
        const month = String(p.created_at || '').slice(0, 7);
        const amt = Number(p.payment_amount_to_pay) || 0;
        byMon.set(month, (byMon.get(month) || 0) + amt);
      });

      const entries = Array.from(byMon.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
      const pageSize = 10;
      let currentPage = 1;

      function renderMonthly(page) {
        const totalRows = entries.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        currentPage = page;
        const start = (page - 1) * pageSize;
        const slice = entries.slice(start, start + pageSize);
        const rowsHtml =
          slice
            .map(
              ([month, sum]) => `
              <tr style="border-bottom:1px solid #e5e7eb">
                <td style="padding:10px 12px;font-size:13px;color:#111827">${month}</td>
                <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#10b981;text-align:right">${fmt(sum)}</td>
              </tr>
            `
            )
            .join('') ||
          '<tr><td colspan="2" style="padding:32px 12px;text-align:center;font-size:14px;color:#9ca3af">📭 No records found.</td></tr>';

        container.innerHTML = `
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:20px;border-radius:12px;margin-bottom:16px;box-shadow:0 4px 12px rgba(245,158,11,0.2)">
            <div style="font-weight:800;color:#ffffff;margin-bottom:6px;font-size:16px;letter-spacing:-0.01em">Average Monthly Sales</div>
            <div style="font-weight:800;color:#ffffff;font-size:28px;letter-spacing:-0.02em">${fmt(averageMonthly)}</div>
            <div style="color:#fef3c7;font-size:13px;margin-top:8px">${distinctMonths.size} distinct month${distinctMonths.size !== 1 ? 's' : ''}</div>
          </div>
          <div style="border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;background:#ffffff">
            <div style="max-height:420px;overflow:auto">
              <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead style="background:#f9fafb;border-bottom:1px solid #e5e7eb">
                  <tr>
                    <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.05em;text-transform:uppercase">Month</th>
                    <th style="text-align:right;padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.05em;text-transform:uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#4b5563">
              <div>Page ${page} of ${totalPages}</div>
              <div style="display:flex;gap:8px">
                <button data-role="first" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === 1 ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>First</button>
                <button data-role="prev" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === 1 ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Prev</button>
                <button data-role="next" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === totalPages ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Next</button>
                <button data-role="last" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:12px;cursor:pointer;min-width:64px" ${page === totalPages ? 'disabled style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:12px;cursor:default;min-width:64px"' : ''}>Last</button>
              </div>
            </div>
          </div>
        `;

        container.dataset.filled = '1';

        const firstBtn = container.querySelector('button[data-role="first"]');
        const prevBtn = container.querySelector('button[data-role="prev"]');
        const nextBtn = container.querySelector('button[data-role="next"]');
        const lastBtn = container.querySelector('button[data-role="last"]');

        if (firstBtn && page > 1) {
          firstBtn.addEventListener('click', () => renderMonthly(1));
        }
        if (prevBtn && page > 1) {
          prevBtn.addEventListener('click', () => renderMonthly(page - 1));
        }
        if (nextBtn && page < totalPages) {
          nextBtn.addEventListener('click', () => renderMonthly(page + 1));
        }
        if (lastBtn && page < totalPages) {
          lastBtn.addEventListener('click', () => renderMonthly(totalPages));
        }
      }

      renderMonthly(1);
      return true;
    }

    return false;
  }

  if (await handleDashboard()) return;
  if (await handlePayments()) return;
});