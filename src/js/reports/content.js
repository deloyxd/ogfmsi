import modal from '../admin_main.js';
import dataSync from '../data_sync/content.js';

// Tab logic
const tabIds = [
  'reports_tab1',
  'reports_tab2',
  'reports_tab3',
  'reports_tab4',
  'reports_tab5',
];
const tabContentIds = [
  'reports_monthly_members',
  'reports_regular',
  'reports_student',
  'reports_supplements',
  'reports_reservation',
];
let currentActiveTab = 0;

function showTab(tabIndex) {
  tabIds.forEach((tabId, i) => {
    const tab = document.getElementById(tabId);
    const content = document.getElementById(tabContentIds[i]);
    if (tab && content) {
      if (i === tabIndex) {
        tab.classList.add('bg-gray-200');
        tab.classList.remove('bg-transparent');
        content.classList.remove('hidden');
      } else {
        tab.classList.remove('bg-gray-200');
        tab.classList.add('bg-transparent');
        content.classList.add('hidden');
      }
    }
  });
  currentActiveTab = tabIndex;
}

tabIds.forEach((tabId, i) => {
  const tab = document.getElementById(tabId);
  if (tab) {
    tab.addEventListener('click', () => showTab(i));
  }
});

// Show first tab by default
showTab(0);

// Search logic
const searchInput = document.getElementById('reportsSectionSearch');
if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase().trim();
    const content = document.getElementById(tabContentIds[currentActiveTab]);
    if (!content) return;
    const items = Array.from(content.querySelectorAll('.relative.grid'));
    items.forEach((item) => {
      if (item.textContent.toLowerCase().includes(searchTerm)) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
  });
}

// PDF Export logic
const exportBtn = document.getElementById('reportsExportPDF');
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    // Use html2pdf.js to export the current tab's content
    const content = document.getElementById(tabContentIds[currentActiveTab]);
    if (!content) return;
    html2pdf().set({
      margin: 0.5,
      filename: 'report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    }).from(content).save();
  });
}

// Table population stubs (to be replaced with real data logic)
export function populateReportsTab(tabIndex, data) {
  // Example: data = array of objects for the tab
  // You would clear the .relative.grid elements and fill with new rows
}

export default { showTab, populateReportsTab };
