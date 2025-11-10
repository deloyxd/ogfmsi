import { API_BASE_URL } from './_global.js';
import { db } from './firebase.js';
import { collection, getDocs, query } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

document.addEventListener('ogfmsiAdminMainLoaded', function () {
  document.querySelectorAll('.section-stats, .section-stats-base').forEach((sectionStats) => {
    if (!sectionStats.dataset.activated) {
      sectionStats.dataset.activated = '1';
      sectionStats.addEventListener('click', function (e) {
        const icon = e.target.closest('.section-stats-f');
        if (icon) {
          const rawType = icon.dataset.type;
          const type = rawType && rawType !== 'undefined' ? rawType : '';
          const section = sectionStats.dataset.section || '';
          if (!type) return; // no breakdown for this stat
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
  panel.style.width = 'min(92vw, 750px)';
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
  const { section, type, container, setTitle } = e.detail || {};
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
    const total = rows.reduce((s, p) => s + (Number(p.payment_amount_paid_cash) || 0) + (Number(p.payment_amount_paid_cashless) || 0), 0);
    const htmlRows = rows
      .map((p) => {
        const date = (p.created_at && new Date(p.created_at)) || null;
        const dateText = date
          ? `${date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })} ${date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}`
          : '';
        const cash = Number(p.payment_amount_paid_cash) || 0;
        const cashless = Number(p.payment_amount_paid_cashless) || 0;
        return `
          <div style="background:#ffffff;border:1px solid #e5e7eb;padding:16px;border-radius:12px;margin-bottom:12px;transition:all 0.2s ease;box-shadow:0 1px 2px rgba(0,0,0,0.05)" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';this.style.borderColor='#d1d5db'" onmouseleave="this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)';this.style.borderColor='#e5e7eb'">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:8px">
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;color:#111827;font-size:15px;margin-bottom:4px;line-height:1.4">${(p.payment_purpose || '').trim()}</div>
                <div style="color:#6b7280;font-size:13px;line-height:1.5">ID: <span style="font-family:monospace;background:#f9fafb;padding:2px 6px;border-radius:4px;font-size:12px">${p.payment_id || ''}</span></div>
              </div>
              <div style="font-weight:800;color:#10b981;font-size:17px;white-space:nowrap">${fmt(cash + cashless)}</div>
            </div>
            ${dateText ? `<div style="color:#9ca3af;font-size:12px;margin-top:8px;padding-top:8px;border-top:1px solid #f3f4f6">🕐 ${dateText}</div>` : ''}
          </div>`;
      })
      .join('');
    container.innerHTML = `
      <div style="background:linear-gradient(135deg,#3b82f6,#2563eb);padding:20px;border-radius:12px;margin-bottom:24px;box-shadow:0 4px 12px rgba(59,130,246,0.2)">
        <div style="font-weight:800;color:#ffffff;margin-bottom:6px;font-size:16px;letter-spacing:-0.01em">${title}</div>
        <div style="font-weight:800;color:#ffffff;font-size:28px;letter-spacing:-0.02em">${fmt(total)}</div>
        <div style="color:#dbeafe;font-size:13px;margin-top:8px">${rows.length} transaction${rows.length !== 1 ? 's' : ''}</div>
      </div>
      <div>${htmlRows || '<div style="text-align:center;padding:40px 20px;color:#9ca3af;font-size:14px">📭 No matching records found.</div>'}</div>
    `;
    container.dataset.filled = '1';
  }

  async function handleDashboard() {
    // Only handle when the source section is the dashboard
    if (String(section || '').toLowerCase() !== 'dashboard') return false;
    if (t.includes('overall total sales')) {
      const payments = await getPayments('/payment/complete');
      await renderPaymentsBreakdown(
        payments,
        () => true,
        'Overall Total Sales',
        'Sum of all completed payments: amount_paid_cash + amount_paid_cashless per transaction.'
      );
      return true;
    }
    if (t.includes('gym') && t.includes('revenue')) {
      const payments = await getPayments('/payment/complete');
      const isGym = (p) => {
        const s = (p.payment_purpose || '').toLowerCase();
        return s.includes('monthly') || s.includes('membership') || s.includes('gym') || s.includes('pass') || s.includes('subscription');
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
        return s.includes('reservation') || s.includes('booking') || s.includes('facility') || s.includes('class') || s.includes('session');
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
      await renderPaymentsBreakdown(
        payments,
        () => true,
        'Product Sales',
        'Sales Transactions Log. Total = cash + cashless per transaction.'
      );
      return true;
    }
    if (t.includes('active') && t.includes('monthly') && t.includes('customer')) {
      const [monthlyRes, archivedRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inquiry/monthly`),
        fetch(`${API_BASE_URL}/inquiry/archived`),
      ]);
      const monthlyData = await monthlyRes.json();
      const archivedData = await archivedRes.json().catch(() => ({ result: [] }));
      const monthly = Array.isArray(monthlyData.result) ? monthlyData.result : [];
      const archived = Array.isArray(archivedData.result) ? archivedData.result : [];
      const archivedIds = new Set(archived.map((c) => String(c.customer_id)));
      const rows = monthly
        .filter((m) => Number(m.customer_pending) === 0)
        .filter((m) => !archivedIds.has(String(m.customer_id)));
      const html = rows
      .map((m) => {
        return `
        <div style="background:#ffffff;border:1px solid #e5e7eb;padding:16px;border-radius:12px;margin-bottom:12px;transition:all 0.2s ease;box-shadow:0 1px 2px rgba(0,0,0,0.05)" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';this.style.borderColor='#d1d5db'" onmouseleave="this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)';this.style.borderColor='#e5e7eb'">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">👤</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;color:#111827;font-size:15px;margin-bottom:2px">${(m.customer_first_name || '')} ${(m.customer_last_name || '')}</div>
              <div style="color:#6b7280;font-size:12px">ID: <span style="font-family:monospace;background:#f9fafb;padding:2px 6px;border-radius:4px">${m.customer_id || ''}</span></div>
            </div>
          </div>
        </div>`;
      })
      .join('');
    container.innerHTML = `
      <div style="background:linear-gradient(135deg,#10b981,#059669);padding:20px;border-radius:12px;margin-bottom:24px;box-shadow:0 4px 12px rgba(16,185,129,0.2)">
        <div style="font-weight:800;color:#ffffff;margin-bottom:6px;font-size:16px;letter-spacing:-0.01em">Active Monthly Customers</div>
        <div style="font-weight:800;color:#ffffff;font-size:28px;letter-spacing:-0.02em">${rows.length}</div>
        <div style="color:#d1fae5;font-size:13px;margin-top:8px">Active memberships</div>
      </div>
      <div>${html || '<div style="text-align:center;padding:40px 20px;color:#9ca3af;font-size:14px">📭 No active monthly customers.</div>'}</div>
    `;
    container.dataset.filled = '1';
    return true;
    }
    if (t.includes('active') && t.includes('reservation') && !t.includes('revenue')) {
      try {
        const q = query(collection(db, 'reservations'));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const now = new Date();
        const parseDate = (mmddyyyy, time) => {
          if (!mmddyyyy) return null;
          const [m, d, y] = String(mmddyyyy).split('-').map((n) => parseInt(n, 10));
          const [hh, mm] = String(time || '00:00').split(':').map((n) => parseInt(n, 10));
          const dt = new Date(y || 1970, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
          return isNaN(dt) ? null : dt;
        };

        const active = (list || [])
          .filter((r) => String(r.status || '').toLowerCase() !== 'canceled')
          .filter((r) => {
            const end = parseDate(r.date, r.endTime);
            return end && end > now;
          });

        const rows = active
          .sort((a, b) => {
            const ad = parseDate(a.date, a.startTime) || new Date(0);
            const bd = parseDate(b.date, b.startTime) || new Date(0);
            return ad - bd;
          })
          .map((r) => {
            const start = parseDate(r.date, r.startTime);
            const end = parseDate(r.date, r.endTime);
            const when = start
              ? `${start.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })} · ${start.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })} – ${end ? end.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}`
              : '';
            const amount = Number(r.amount) || 0;
            const typeLabel = typeof r.reservationType === 'number'
              ? ['Basketball', 'Zumba'][r.reservationType] || String(r.reservationType)
              : String(r.reservationType || '').trim();
            return `
              <div style="background:#ffffff;border:1px solid #e5e7eb;padding:16px;border-radius:12px;margin-bottom:12px;transition:all 0.2s ease;box-shadow:0 1px 2px rgba(0,0,0,0.05)" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';this.style.borderColor='#d1d5db'" onmouseleave="this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)';this.style.borderColor='#e5e7eb'">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:8px">
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:700;color:#111827;font-size:15px;margin-bottom:4px;line-height:1.4">${(r.customerName || '').trim()}</div>
                    <div style="color:#6b7280;font-size:13px;line-height:1.5">${typeLabel} • ${when}</div>
                    <div style="color:#9ca3af;font-size:12px;margin-top:6px">ID: <span style="font-family:monospace;background:#f9fafb;padding:2px 6px;border-radius:4px">${r.id || ''}</span></div>
                  </div>
                  <div style="font-weight:800;color:#2563eb;font-size:15px;white-space:nowrap">${amount ? `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}</div>
                </div>
              </div>`;
          })
          .join('');

        container.innerHTML = `
          <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:20px;border-radius:12px;margin-bottom:24px;box-shadow:0 4px 12px rgba(37,99,235,0.2)">
            <div style="font-weight:800;color:#ffffff;margin-bottom:6px;font-size:16px;letter-spacing:-0.01em">Active Reservations</div>
            <div style="font-weight:800;color:#ffffff;font-size:28px;letter-spacing:-0.02em">${active.length}</div>
            <div style="color:#bfdbfe;font-size:13px;margin-top:8px">Upcoming reservations</div>
          </div>
          <div>${rows || '<div style="text-align:center;padding:40px 20px;color:#9ca3af;font-size:14px">📭 No active reservations.</div>'}</div>
        `;
        container.dataset.filled = '1';
      } catch (err) {
        container.innerHTML = `
          <div style=\"text-align:center;padding:40px 20px\">
            <div style=\"width:64px;height:64px;margin:0 auto 20px;background:linear-gradient(135deg,#fee2e2,#fecaca);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:32px\">✕</div>
            <div style=\"color:#991b1b;font-weight:700;margin-bottom:8px;font-size:16px\">Failed to load</div>
            <div style=\"color:#7f1d1d;font-size:14px\">Could not fetch active reservations.</div>
          </div>
        `;
        container.dataset.filled = '1';
      }
      return true;
    }
    return false;
  }

  async function handlePayments() {
    if (t.includes('avg') && t.includes('overall') && t.includes('total')) {
      const list = await getPayments('/payment/complete');
      const sumAmt = (p) => (Number(p.payment_amount_paid_cash) || 0) + (Number(p.payment_amount_paid_cashless) || 0);
      const todaysCash = list
        .filter((p) => String(p.payment_method || '').toLowerCase() === 'cash' && isTodayLocal(p.created_at))
        .reduce((s, p) => s + sumAmt(p), 0);
      const todaysCashless = list
        .filter((p) => String(p.payment_method || '').toLowerCase() === 'cashless' && isTodayLocal(p.created_at))
        .reduce((s, p) => s + sumAmt(p), 0);
      const total = todaysCash + todaysCashless;
      try { setTitle('Avg Overall Total'); } catch (e) {}
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
    if (t.includes("overall total sales")) {
      const list = await getPayments('/payment/complete');
      const sumAmt = (p) => (Number(p.payment_amount_paid_cash) || 0) + (Number(p.payment_amount_paid_cashless) || 0);
      const todaysCash = list
        .filter((p) => String(p.payment_method || '').toLowerCase() === 'cash' && isTodayLocal(p.created_at))
        .reduce((s, p) => s + sumAmt(p), 0);
      const todaysCashless = list
        .filter((p) => String(p.payment_method || '').toLowerCase() === 'cashless' && isTodayLocal(p.created_at))
        .reduce((s, p) => s + sumAmt(p), 0);
      const total = todaysCash + todaysCashless;
      try { setTitle('Avg Overall Total'); } catch (e) {}
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
        (p) => String(p.payment_method || '').toLowerCase() === 'cash' && isTodayLocal(p.created_at),
        "Today's Cash Sales",
        'Filter: payment_method = cash AND created_at is today.'
      );
      return true;
    }
    if (t.includes('cashless sales today')) {
      const list = await getPayments('/payment/complete');
      await renderPaymentsBreakdown(
        list,
        (p) => String(p.payment_method || '').toLowerCase() === 'cashless' && isTodayLocal(p.created_at),
        "Today's Cashless Sales",
        'Filter: payment_method = cashless AND created_at is today.'
      );
      return true;
    }
    if (t.includes('average daily sales')) {
      const list = await getPayments('/payment/complete');
      // Exclude canceled payments and limit to last 30 days to match Payments metrics
      const nowLocal = new Date();
      const startWindow = new Date(nowLocal);
      startWindow.setDate(startWindow.getDate() - 29); // inclusive 30-day window including today
      const toLocalDateStr = (d) => new Date(d).toLocaleDateString('en-CA'); // YYYY-MM-DD
      const startKey = toLocalDateStr(startWindow);

      const filtered = list.filter((p) => {
        if (String(p.payment_type || '').toLowerCase() === 'canceled') return false;
        const key = String(p.created_at || '').slice(0, 10);
        return key >= startKey; // only last 30 days
      });

      const byDay = new Map();
      filtered.forEach((p) => {
        const day = String(p.created_at || '').slice(0, 10);
        const amt = (Number(p.payment_amount_paid_cash) || 0) + (Number(p.payment_amount_paid_cashless) || 0);
        byDay.set(day, (byDay.get(day) || 0) + amt);
      });
      const entries = Array.from(byDay.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
      const avg = entries.length ? entries.reduce((s, [, v]) => s + v, 0) / entries.length : 0;
      const html = entries
        .map(([day, sum]) => `
          <div style="background:#ffffff;border:1px solid #e5e7eb;padding:14px 16px;border-radius:10px;margin-bottom:10px;transition:all 0.2s ease;box-shadow:0 1px 2px rgba(0,0,0,0.05)" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';this.style.borderColor='#d1d5db'" onmouseleave="this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)';this.style.borderColor='#e5e7eb'">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:16px">
              <div style="color:#374151;font-weight:600;font-size:14px">${day}</div>
              <div style="font-weight:800;color:#10b981;font-size:16px">${fmt(sum)}</div>
            </div>
          </div>
        `)
        .join('');
      container.innerHTML = `
        <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:20px;border-radius:12px;margin-bottom:24px;box-shadow:0 4px 12px rgba(139,92,246,0.2)">
          <div style="font-weight:800;color:#ffffff;margin-bottom:6px;font-size:16px;letter-spacing:-0.01em">Average Daily Sales</div>
          <div style="font-weight:800;color:#ffffff;font-size:28px;letter-spacing:-0.02em">${fmt(avg)}</div>
          <div style="color:#ede9fe;font-size:13px;margin-top:8px">${entries.length} day${entries.length !== 1 ? 's' : ''} recorded</div>
        </div>
        <div>${html || '<div style="text-align:center;padding:40px 20px;color:#9ca3af;font-size:14px">📭 No records found.</div>'}</div>
      `;
      container.dataset.filled = '1';
      return true;
    }
    if (t.includes('average weekly sales')) {
      const list = await getPayments('/payment/complete');
      function isoWeek(d) {
        const date = new Date(Date.UTC(new Date(d).getFullYear(), new Date(d).getMonth(), new Date(d).getDate()));
        const dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return `${date.getUTCFullYear()}-W${String(Math.ceil(((date - yearStart) / 86400000 + 1) / 7)).padStart(2, '0')}`;
      }
      const byWeek = new Map();
      list.forEach((p) => {
        const key = isoWeek(p.created_at || new Date());
        const amt = (Number(p.payment_amount_paid_cash) || 0) + (Number(p.payment_amount_paid_cashless) || 0);
        byWeek.set(key, (byWeek.get(key) || 0) + amt);
      });
      const entries = Array.from(byWeek.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
      const avg = entries.length ? entries.reduce((s, [, v]) => s + v, 0) / entries.length : 0;
      const html = entries
        .map(([w, sum]) => `
          <div style="background:#ffffff;border:1px solid #e5e7eb;padding:14px 16px;border-radius:10px;margin-bottom:10px;transition:all 0.2s ease;box-shadow:0 1px 2px rgba(0,0,0,0.05)" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';this.style.borderColor='#d1d5db'" onmouseleave="this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)';this.style.borderColor='#e5e7eb'">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:16px">
              <div style="color:#374151;font-weight:600;font-size:14px">${w}</div>
              <div style="font-weight:800;color:#10b981;font-size:16px">${fmt(sum)}</div>
            </div>
          </div>
        `)
        .join('');
      container.innerHTML = `
        <div style="background:linear-gradient(135deg,#ec4899,#db2777);padding:20px;border-radius:12px;margin-bottom:24px;box-shadow:0 4px 12px rgba(236,72,153,0.2)">
          <div style="font-weight:800;color:#ffffff;margin-bottom:6px;font-size:16px;letter-spacing:-0.01em">Average Weekly Sales</div>
          <div style="font-weight:800;color:#ffffff;font-size:28px;letter-spacing:-0.02em">${fmt(avg)}</div>
          <div style="color:#fce7f3;font-size:13px;margin-top:8px">${entries.length} week${entries.length !== 1 ? 's' : ''} recorded</div>
        </div>
        <div>${html || '<div style="text-align:center;padding:40px 20px;color:#9ca3af;font-size:14px">📭 No records found.</div>'}</div>
      `;
      container.dataset.filled = '1';
      return true;
    }
    if (t.includes('average monthly sales')) {
      const list = await getPayments('/payment/complete');
      const byMon = new Map();
      list.forEach((p) => {
        const key = String(p.created_at || '').slice(0, 7);
        const amt = (Number(p.payment_amount_paid_cash) || 0) + (Number(p.payment_amount_paid_cashless) || 0);
        byMon.set(key, (byMon.get(key) || 0) + amt);
      });
      const entries = Array.from(byMon.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
      const avg = entries.length ? entries.reduce((s, [, v]) => s + v, 0) / entries.length : 0;
      const html = entries
        .map(([m, sum]) => `
          <div style="background:#ffffff;border:1px solid #e5e7eb;padding:14px 16px;border-radius:10px;margin-bottom:10px;transition:all 0.2s ease;box-shadow:0 1px 2px rgba(0,0,0,0.05)" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';this.style.borderColor='#d1d5db'" onmouseleave="this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)';this.style.borderColor='#e5e7eb'">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:16px">
              <div style="color:#374151;font-weight:600;font-size:14px">${m}</div>
              <div style="font-weight:800;color:#10b981;font-size:16px">${fmt(sum)}</div>
            </div>
          </div>
        `)
        .join('');
      container.innerHTML = `
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:20px;border-radius:12px;margin-bottom:24px;box-shadow:0 4px 12px rgba(245,158,11,0.2)">
          <div style="font-weight:800;color:#ffffff;margin-bottom:6px;font-size:16px;letter-spacing:-0.01em">Average Monthly Sales</div>
          <div style="font-weight:800;color:#ffffff;font-size:28px;letter-spacing:-0.02em">${fmt(avg)}</div>
          <div style="color:#fef3c7;font-size:13px;margin-top:8px">${entries.length} month${entries.length !== 1 ? 's' : ''} recorded</div>
        </div>
        <div>${html || '<div style="text-align:center;padding:40px 20px;color:#9ca3af;font-size:14px">📭 No records found.</div>'}</div>
      `;
      container.dataset.filled = '1';
      return true;
    }
    return false;
  }

  if (await handleDashboard()) return;
  if (await handlePayments()) return;
});