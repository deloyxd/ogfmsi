document.addEventListener('ogfmsiAdminMainLoaded', function () {
  document.querySelectorAll('.section-stats, .section-stats-base').forEach((sectionStats) => {
    if (!sectionStats.dataset.activated) {
      sectionStats.dataset.activated = '1';
      sectionStats.addEventListener('click', function (e) {
        const icon = e.target.closest('.section-stats-f');
        if (icon) {
          const type = icon.dataset.type || '';
          const section = sectionStats.dataset.section || '';
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
  modal.style.background = 'rgba(0,0,0,0.4)';
  modal.style.display = 'none';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '99998';

  const panel = document.createElement('div');
  panel.style.background = 'white';
  panel.style.borderRadius = '10px';
  panel.style.width = 'min(92vw, 720px)';
  panel.style.maxHeight = '80vh';
  panel.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.overflow = 'hidden';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.padding = '12px 16px';
  header.style.borderBottom = '1px solid #e5e7eb';

  const title = document.createElement('div');
  title.id = 'stats-breakdown-title';
  title.style.fontWeight = '700';
  title.style.fontSize = '14px';
  title.textContent = 'Breakdown';

  const close = document.createElement('button');
  close.textContent = '✕';
  close.style.fontSize = '16px';
  close.style.lineHeight = '16px';
  close.style.padding = '6px 8px';
  close.style.borderRadius = '8px';
  close.style.background = '#f3f4f6';
  close.style.cursor = 'pointer';
  close.addEventListener('click', () => (modal.style.display = 'none'));

  header.appendChild(title);
  header.appendChild(close);

  const body = document.createElement('div');
  body.id = 'stats-breakdown-body';
  body.style.padding = '16px';
  body.style.overflow = 'auto';
  body.style.maxHeight = 'calc(80vh - 52px)';
  body.innerHTML = '<div style="text-align:center;color:#6b7280;font-weight:600">Loading…</div>';

  panel.appendChild(header);
  panel.appendChild(body);
  modal.appendChild(panel);
  modal.addEventListener('click', (evt) => {
    if (evt.target === modal) modal.style.display = 'none';
  });
  document.body.appendChild(modal);
  return modal;
}

function openStatsBreakdownModal({ section = '', type = '' } = {}) {
  const modal = ensureStatsBreakdownModal();
  const title = modal.querySelector('#stats-breakdown-title');
  const body = modal.querySelector('#stats-breakdown-body');
  title.textContent = `Breakdown${type ? ' · ' + type : ''}`;
  body.innerHTML = '<div style="text-align:center;color:#6b7280;font-weight:600">Loading…</div>';
  modal.style.display = 'flex';

  // Let modules populate the breakdown
  const evt = new CustomEvent('ogfmsi:statsBreakdown', {
    detail: {
      section,
      type,
      container: body,
      close: () => (modal.style.display = 'none'),
      setTitle: (t) => (title.textContent = t),
    },
  });
  document.dispatchEvent(evt);

  // Fallback content if nothing handled it shortly
  setTimeout(() => {
    if (!body.dataset.filled) {
      body.innerHTML =
        '<div style="color:#111827;font-weight:700;margin-bottom:8px">No breakdown data available</div>' +
        '<div style="color:#6b7280">This section has not provided a breakdown yet.</div>';
    }
  }, 250);
}
