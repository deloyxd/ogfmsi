import main from '../admin_main.js';
import accesscontrol from './maintenance_accesscontrol.js';
import { API_BASE_URL, DEV_MODE, getEmoji } from '../_global.js';
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  canCreateAnnouncement,
  getAnnouncementCount,
  getAnnouncements,
} from '../landing_modules/announcements.js';
import customers from './inquiry_customers.js';
import { auth } from '../customer_login.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

// default codes:
let activated = false,
  mainBtn,
  subBtn,
  logout;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName != 'dashboard') return;
  let systemUserRole = sessionStorage.getItem('systemUserRole') || '';
  if (DEV_MODE) {
    sessionStorage.setItem('systemUserRole', 'developer');
    sessionStorage.setItem('systemUserFullname', 'Team Biboy');
    systemUserRole = sessionStorage.getItem('systemUserRole');
  } else {
    if (systemUserRole === '') {
      window.location.href = '/';
      return;
    }
  }
  const nameElement = document.getElementById('name');
  const roleElement = document.getElementById('role');
  if (nameElement && roleElement) {
    nameElement.innerText = sessionStorage.getItem('systemUserFullname') || 'Guest';
    roleElement.innerText = main.fixText(systemUserRole);
  }
  if (!activated) {
    mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
    mainBtn.addEventListener('click', mainBtnFunction);
    subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
    subBtn.addEventListener('click', subBtnFunction);
    logout = document.getElementById('logout');
    logout.addEventListener('click', (e) => {
      e.preventDefault();

      Swal.fire({
        title: 'Logout',
        text: 'Are you sure you want to log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Logout',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            sessionStorage.clear();
            window.location.href = '/';
            await signOut(auth);
          } catch (error) {
            console.error('Logout Error:', error);
            Swal.fire({
              icon: 'error',
              title: 'Logout Failed',
              text: error.message,
              confirmButtonColor: '#ef4444',
            });
          }
        }
      });
    });
    activated = true;
    setupChartOne();
    setupChartTwo();
    loadDashboardStats(); // Load dashboard stats
    main.toast(`Please wait while the system is initializing...`, 'info');
  }
});

document.addEventListener('newTab', function () {
  if (main.sharedState.sectionName != 'dashboard') return;
  if (main.sharedState.activeTab == 2) {
    document.getElementById(`dashboardSectionOneSearch`).parentElement.classList.remove('hidden');
    loadUpcomingRenewals();
  } else {
    document.getElementById(`dashboardSectionOneSearch`).parentElement.classList.add('hidden');
    if (main.sharedState.activeTab == 1) {
      loadMonthlyGrowthData();
    }
  }
  // Refresh dashboard stats when switching tabs
  refreshDashboardStats();
});

const maxAnnouncementCount = 3;
let announcementCount = 0;

// Initialize announcement count and load existing announcements on load
document.addEventListener('ogfmsiAdminMainLoaded', async function () {
  if (main.sharedState.sectionName != 'dashboard') return;
  try {
    announcementCount = await getAnnouncementCount();
    await loadExistingAnnouncements();
  } catch (error) {
    console.error('Error loading announcements:', error);
    announcementCount = 0;
  }
});

// Load existing announcements from Firebase
async function loadExistingAnnouncements() {
  try {
    const announcements = await getAnnouncements();
    const container = document.querySelector('.announcementBtn').parentElement;

    // 🔥 Prevent duplication: remove previously loaded announcement elements except the first (template)
    Array.from(container.querySelectorAll('.announcementBtn'))
      .slice(1)
      .forEach((el) => el.remove());

    if (announcements.length > 0) {
      // Hide the empty state
      const emptyState = container.children[0];
      if (emptyState) {
        emptyState.classList.add('hidden');
      }

      // Show the sub button
      if (subBtn) {
        subBtn.classList.remove('hidden');
      }

      // Create DOM elements for each announcement
      announcements.forEach((announcement) => {
        const announcementBtn = document.querySelector('.announcementBtn').cloneNode(true);

        const result = {
          header: {
            title: `Update Announcement ${getEmoji('📌', 26)}`,
            subtitle: 'Announcement form',
          },
          image: {
            src: announcement.image.src,
            type: announcement.image.type,
            short: [
              { placeholder: 'Title - Top', value: announcement.title.top, required: true },
              { placeholder: 'Title - Highlight', value: announcement.title.highlight, required: true },
              { placeholder: 'Title - Bottom', value: announcement.title.bottom, required: true },
            ],
          },
          large: [
            {
              placeholder: 'Description',
              value: announcement.description,
              required: true,
            },
          ],
          header: {
            title: announcement.header.title,
            subtitle: announcement.header.subtitle,
          },
        };

        injectDataToAnnouncementItem(announcementBtn, result, announcement.id);
        announcementBtn.classList.remove('hidden');
        container.appendChild(announcementBtn);
      });
    } else {
      // show empty state if none
      const emptyState = container.children[0];
      if (emptyState) {
        emptyState.classList.remove('hidden');
      }
    }
  } catch (error) {
    console.error('Error loading existing announcements:', error);
  }
}

// Handles creation, update, and deletion of announcements
async function mainBtnFunction() {
  const canCreate = await canCreateAnnouncement();
  if (!canCreate) {
    main.toast('Delete an announcement first!', 'error');
    return;
  }

  const inputs = {
    header: {
      title: `Create Announcement ${getEmoji('📢', 26)}`,
      subtitle: 'Announcement form',
    },
    image: {
      src: '/src/images/carousel_image_2.jpg',
      type: 'live',
      short: [
        { placeholder: 'Title - Top', value: `💪 Let's go 🏋️‍♀️`, required: true },
        { placeholder: 'Title - Highlight', value: 'Fitworx', required: true },
        { placeholder: 'Title - Bottom', value: 'Gym!', required: true },
      ],
    },
    large: [
      {
        placeholder: 'Description',
        required: true,
        value:
          '📌 Description Sample\n\n✍ This is a sample announcement. You can freely edit any of these fields.\n\n📣 Any announcements will be displayed on the landing page of your website.',
      },
    ],
  };

  main.openModal(mainBtn, inputs, (result) => {
    main.openConfirmationModal('Announce', async () => {
      await createAnnouncementHandler(result);
      main.closeConfirmationModal();
    });
  });

  async function createAnnouncementHandler(result) {
    try {
      const announcementData = {
        title: {
          top: result.image.short[0].value,
          highlight: result.image.short[1].value,
          bottom: result.image.short[2].value,
        },
        description: result.large[0].value,
        image: {
          src: result.image.src,
          type: result.image.type,
        },
        header: {
          title: result.header.title,
          subtitle: result.header.subtitle,
        },
      };

      const announcementId = await createAnnouncement(announcementData);
      announcementCount++;

      const announcementBtn = document.querySelector('.announcementBtn').cloneNode(true);
      injectDataToAnnouncementItem(announcementBtn, result, announcementId);
      announcementBtn.parentElement.children[0].classList.add('hidden');
      subBtn.classList.remove('hidden');

      main.toast('Successfully created announcement!', 'success');
      main.closeModal();
    } catch (error) {
      console.error('Error creating announcement:', error);
      main.toast('Failed to create announcement!', 'error');
    }
  }
}

// ✅ Used by injectDataToAnnouncementItem
async function updateAnnouncementHandler(element, result) {
  try {
    const announcementId = element.dataset.announcementId;
    if (!announcementId) throw new Error('No announcement ID found');

    const updateData = {
      title: {
        top: result.image.short[0].value,
        highlight: result.image.short[1].value,
        bottom: result.image.short[2].value,
      },
      description: result.large[0].value,
      image: {
        src: result.image.src,
        type: result.image.type,
      },
      header: {
        title: result.header.title,
        subtitle: result.header.subtitle,
      },
    };

    await updateAnnouncement(announcementId, updateData);
    injectDataToAnnouncementItem(element, result, announcementId);

    main.toast('Successfully updated announcement!', 'info');
    main.closeConfirmationModal();
    main.closeModal();
  } catch (error) {
    console.error('Error updating announcement:', error);
    main.toast('Failed to update announcement!', 'error');
  }
}

// ✅ Used by injectDataToAnnouncementItem
async function deleteAnnouncementHandler(element) {
  try {
    const announcementId = element.dataset.announcementId;
    if (!announcementId) throw new Error('No announcement ID found');

    await deleteAnnouncement(announcementId);
    announcementCount--;

    if (announcementCount === 0) {
      element.parentElement.children[0].classList.remove('hidden');
      subBtn.classList.add('hidden');
    }

    element.remove();
    main.toast('Successfully deleted announcement!', 'error');
    main.closeConfirmationModal();
    main.closeModal();
  } catch (error) {
    console.error('Error deleting announcement:', error);
    main.toast('Failed to delete announcement!', 'error');
  }
}

// ✅ make injectDataToAnnouncementItem globally available
function injectDataToAnnouncementItem(element, inputs, announcementId = null) {
  element.children[0].src = inputs.image.src;
  let title = '';
  element.children[2].querySelectorAll('p').forEach((p, i) => {
    inputs.image.short.forEach((input, index) => {
      if (index == i) {
        title += ' ' + input.value;
        p.textContent = input.value;
      }
    });
  });
  inputs.header.title = `Update Announcement ${getEmoji('📌', 26)}`;
  inputs.header.subtitle = 'Announcement form';
  inputs.footer = {};
  inputs.footer.main = `Update ${getEmoji('📌')}`;
  inputs.footer.sub = `Delete ${getEmoji('⚠️')}`;
  element.dataset.description = inputs.large[0].value;

  if (announcementId) {
    element.dataset.announcementId = announcementId;
  }

  element.addEventListener('mouseenter', () => element.classList.add('flash-effect'));
  element.addEventListener('mouseleave', () => element.classList.remove('flash-effect'));

  element.onclick = () => {
    main.openModal(
      element,
      inputs,
      (updatedResult) => {
        main.openConfirmationModal('Update announcement: ' + title, async () => {
          await updateAnnouncementHandler(element, updatedResult);
          enqueueAnnouncement('Update');
        });
      },
      () => {
        main.openConfirmationModal('Delete announcement: ' + title, async () => {
          await deleteAnnouncementHandler(element);
          enqueueAnnouncement('Delete');
        });
      }
    );
  };

  enqueueAnnouncement('Create');

  function enqueueAnnouncement(actionType) {
    const action = {
      module: 'Dashboard',
      submodule: 'Announcement',
      description: `${actionType} announcement`,
    };
    const data = {
      id: announcementCount,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      type: 'user',
    };
    if (actionType.toLowerCase().includes('create') || actionType.toLowerCase().includes('update')) {
      data.image = element.children[0].src;
      data.title = title;
      data.description = element.dataset.description;
    }
    accesscontrol.log(action, data);
  }

  element.classList.remove('hidden');
  document.querySelector('.announcementBtn').parentElement.appendChild(element);
}

// Handles sub button logic
function subBtnFunction() {
  window.open('/', '_blank');
}

// Fetches announcements from backend
async function fetchAnnouncements() {
  try {
    const response = await fetch(`${global.API_BASE_URL}/announcements`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Data from backend:', data);
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }
}

// Sets up first dashboard chart
async function setupChartOne() {
  const chart = document.getElementById('dashboardChart1');
  const context = chart.getContext('2d');

  if (Chart.getChart('dashboardChart1')) {
    Chart.getChart('dashboardChart1')?.destroy();
  }

  try {
    const response = await fetch(`${API_BASE_URL}/inquiry/monthly`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const monthlyData = processMonthlyDataForChart(data.result);

    setTimeout(() => {
      new Chart(context, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [
            {
              label: 'Active Monthly Pass (Click to toggle)',
              data: monthlyData,
              borderColor: '#f97316',
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              borderWidth: 3,
              fill: true,
              pointBackgroundColor: '#fff',
              pointBorderColor: '#f97316',
              pointRadius: 5,
              pointHoverRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: { mode: 'index', intersect: false },
          },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
            x: { grid: { display: false } },
          },
        },
      });
    }, 50);
  } catch (error) {
    console.error('Failed to load real chart data:', error);
    setTimeout(() => {
      new Chart(context, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [
            {
              label: 'Active Monthly Pass (Click to toggle)',
              data: [120, 190, 170, 220, 260, 300, 350, 400, 380, 420, 450, 500],
              borderColor: '#f97316',
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              borderWidth: 3,
              fill: true,
              pointBackgroundColor: '#fff',
              pointBorderColor: '#f97316',
              pointRadius: 5,
              pointHoverRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: { mode: 'index', intersect: false },
          },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
            x: { grid: { display: false } },
          },
        },
      });
    }, 50);
  }
}

// Sets up second dashboard chart
async function setupChartTwo() {
  const chart = document.getElementById('dashboardChart2');
  const context = chart.getContext('2d');

  if (Chart.getChart('dashboardChart2')) {
    Chart.getChart('dashboardChart2')?.destroy();
  }

  try {
    const response = await fetch(`${API_BASE_URL}/inquiry/customers`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const rateData = processCustomerRateData(data.result);

    setTimeout(() => {
      new Chart(context, {
        type: 'pie',
        data: {
          labels: ['Regular', 'Student'],
          datasets: [
            {
              label: 'Customer Rate Distribution',
              data: [rateData.regular, rateData.student],
              backgroundColor: ['rgba(219, 99, 12, 1)', 'rgb(194, 65, 12)'],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
        },
      });

      function getSmartGreeting() {
        const hour = new Date().getHours();
        let baseGreeting;

        // Time-based greetings
        if (hour < 12) {
          baseGreeting = 'Good morning';
        } else if (hour < 18) {
          baseGreeting = 'Good afternoon';
        } else {
          baseGreeting = 'Good evening';
        }

        // Random variations for each time period
        const morningVariations = [
          'Good morning',
          'Rise and shine',
          'Top of the morning',
          'Morning glory',
          'A beautiful morning',
          'Ready for a great day',
          'Hope you slept well',
        ];

        const afternoonVariations = [
          'Good afternoon',
          'What a fine afternoon',
          'Greetings',
          'Hope your day is going well',
          'Afternoon delights',
          'Making great progress',
          'Productive afternoon',
        ];

        const eveningVariations = [
          'Good evening',
          'Welcome back',
          'Hello',
          'Evening breeze',
          'Winding down nicely',
          'Hope you had a great day',
          'Perfect evening',
        ];

        let variations;
        if (hour < 12) {
          variations = morningVariations;
        } else if (hour < 18) {
          variations = afternoonVariations;
        } else {
          variations = eveningVariations;
        }

        return variations[Math.floor(Math.random() * variations.length)];
      }

      // Usage
      const greetings = getSmartGreeting();
      main.toast(
        `${greetings}, ${sessionStorage.getItem('systemUserFullname')}! The system is now ready to serve you!`,
        'success'
      );
    }, 50);
  } catch (error) {
    console.error('Failed to load real chart data:', error);
    setTimeout(() => {
      new Chart(context, {
        type: 'pie',
        data: {
          labels: ['Ages 16-19', 'Ages 20-25', 'Ages 26-30', 'Ages 30-35', 'Ages 35+'],
          datasets: [
            {
              label: 'User Count',
              data: [120, 190, 170, 220, 260],
              backgroundColor: [
                'rgb(254, 215, 170)',
                'rgb(253, 186, 116)',
                'rgb(251, 146, 60)',
                'rgb(249, 115, 22)',
                'rgb(194, 65, 12)',
              ],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
        },
      });
    }, 50);
  }
}

// Processes monthly pass data into counts of ACTIVE passes per start month
function processMonthlyDataForChart(monthlyPasses) {
  const monthlyCounts = {
    '01': 0,
    '02': 0,
    '03': 0,
    '04': 0,
    '05': 0,
    '06': 0,
    '07': 0,
    '08': 0,
    '09': 0,
    10: 0,
    11: 0,
    12: 0,
  };

  if (!Array.isArray(monthlyPasses)) return Object.values(monthlyCounts);

  monthlyPasses.forEach((pass) => {
    // Only count active passes
    if (Number(pass.customer_pending) !== 0) return;
    const startDate = new Date(pass.customer_start_date);
    if (isNaN(startDate.getTime())) return;
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    monthlyCounts[month]++;
  });

  return [
    monthlyCounts['01'],
    monthlyCounts['02'],
    monthlyCounts['03'],
    monthlyCounts['04'],
    monthlyCounts['05'],
    monthlyCounts['06'],
    monthlyCounts['07'],
    monthlyCounts['08'],
    monthlyCounts['09'],
    monthlyCounts['10'],
    monthlyCounts['11'],
    monthlyCounts['12'],
  ];
}

// Processes customer data into rate distribution
function processCustomerRateData(customers) {
  let regular = 0;
  let student = 0;

  customers.forEach((customer) => {
    if (customer.customer_type !== 'archived') {
      if (customer.customer_rate === 'regular') {
        regular++;
      } else if (customer.customer_rate === 'student') {
        student++;
      }
    }
  });

  return { regular, student };
}

// Loads monthly customer growth data
async function loadMonthlyGrowthData() {
  try {
    const response = await fetch(`${API_BASE_URL}/inquiry/monthly`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const monthlyData = processMonthlyDataForChart(data.result);

    const contentContainer = document.querySelector('[data-sectionindex="1"][data-tabindex="1"]');
    if (contentContainer) {
      contentContainer.innerHTML = '<canvas id="dashboardChart1"></canvas>';
      setupChartOneWithRealData(monthlyData);
    }

    // console.log('Monthly growth data loaded:', monthlyData);
  } catch (error) {
    console.error('Failed to load monthly growth data:', error);
    const contentContainer = document.querySelector('[data-sectionindex="1"][data-tabindex="1"]');
    if (contentContainer) {
      contentContainer.innerHTML = '<canvas id="dashboardChart1"></canvas>';
      setupChartOne();
    }
  }
}

// Sets up chart one with real data
function setupChartOneWithRealData(monthlyData) {
  const chart = document.getElementById('dashboardChart1');
  const context = chart.getContext('2d');

  if (Chart.getChart('dashboardChart1')) {
    Chart.getChart('dashboardChart1')?.destroy();
  }

  setTimeout(() => {
    new Chart(context, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
          {
            label: 'Active Monthly Pass (Click to toggle)',
            data: monthlyData,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            borderWidth: 3,
            fill: true,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#f97316',
            pointRadius: 5,
            pointHoverRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
          x: { grid: { display: false } },
        },
      },
    });
  }, 50);
}

// Loads upcoming renewals within 14 days
async function loadUpcomingRenewals() {
  const existingDynamicRows = document.querySelectorAll('.dynamic-renewal-row');
  existingDynamicRows.forEach((row) => row.remove());

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
    customersData.result.forEach((customer) => {
      customerMap[customer.customer_id] = customer;
    });

    const today = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);

    const upcomingRenewals = monthlyData.result.filter((monthlyCustomer) => {
      const endDate = new Date(monthlyCustomer.customer_end_date);
      return endDate >= today && endDate <= twoWeeksFromNow && monthlyCustomer.customer_pending === 0;
    });

    const tabContainer = document.querySelector('[data-sectionindex="1"][data-tabindex="2"]');
    const emptyText = tabContainer
      ? tabContainer.querySelector('[id*="Empty"]')
      : document.getElementById('dashboardSectionOneListEmpty2');

    if (emptyText) {
      const tableBody = emptyText.parentElement;
      const allRows = Array.from(tableBody.querySelectorAll('tr'));
      allRows.forEach((row) => {
        if (row !== emptyText) {
          row.remove();
        }
      });

      if (upcomingRenewals.length > 0) {
        emptyText.classList.add('hidden');
      } else {
        emptyText.classList.remove('hidden');
        return;
      }

      upcomingRenewals.forEach((monthlyCustomer) => {
        const customer = customerMap[monthlyCustomer.customer_id];
        if (!customer) {
          console.warn(`Customer data not found for ID: ${monthlyCustomer.customer_id}`);
          return;
        }

        const endDate = new Date(monthlyCustomer.customer_end_date);
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        const daysText = daysLeft === 1 ? '1 day' : `${daysLeft} days`;

        const columnsData = [
          'id_' + customer.customer_id,
          {
            type: 'object_contact',
            data: [
              customer.customer_image_url || '/src/images/client_logo.jpg',
              customer.customer_first_name + ' ' + customer.customer_last_name,
              customer.customer_contact || 'N/A',
            ],
          },
          daysText,
        ];

        main.createAtSectionOne('dashboard', columnsData, 2, (createResult) => {
          const renewBtn = createResult.querySelector('#renewBtn');
          if (renewBtn) {
            renewBtn.addEventListener('click', () => customers.startRenewCustomer(customer.customer_id));
          }

          createResult.dataset.customerId = customer.customer_id;
          createResult.dataset.endDate = monthlyCustomer.customer_end_date;
          createResult.dataset.daysLeft = daysLeft;
          createResult.classList.add('dynamic-renewal-row');
        });
      });
    }
  } catch (error) {
    console.error('Failed to load upcoming renewals:', error);
    const tabContainer = document.querySelector('[data-sectionindex="1"][data-tabindex="2"]');
    const emptyText = tabContainer
      ? tabContainer.querySelector('[id*="Empty"]')
      : document.getElementById('dashboardSectionOneListEmpty2');
    if (emptyText) {
      emptyText.classList.remove('hidden');
    }
  }
}

// ===== Dashboard Stats Calculation =====

// Cache for dashboard stats data
let dashboardStatsCache = {
  payments: [],
  monthlyCustomers: [],
  reservations: [],
};

// Fetches and processes all dashboard stats data
async function loadDashboardStats() {
  try {
    // Fetch payment data for earnings calculations
    const paymentsResponse = await fetch(`${API_BASE_URL}/payment/complete`);

    if (!paymentsResponse.ok) {
      throw new Error(`HTTP error! status: ${paymentsResponse.status}`);
    }

    const paymentsData = await paymentsResponse.json();
    dashboardStatsCache.payments = Array.isArray(paymentsData.result) ? paymentsData.result : [];

    // Calculate and update stats
    await computeAndUpdateDashboardStats();
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
    // Set default values on error
    updateDashboardStatsDisplay({
      gym_revenue: 0,
      product_sales: 0,
      reservation_revenue: 0,
      overall_total_sales: 0,
      active_monthly_customers: 0,
      active_reservations: 0,
    });
  }
}

// Computes dashboard stats from cached data
async function computeAndUpdateDashboardStats() {
  const stats = {
    gym_revenue: calculateGymRevenue(dashboardStatsCache.payments),
    product_sales: await calculateProductSales(dashboardStatsCache.payments),
    reservation_revenue: calculateReservationRevenue(dashboardStatsCache.payments),
    overall_total_sales: calculateOverallTotalSales(dashboardStatsCache.payments),
    active_monthly_customers: getActiveMonthlyCustomersCount(),
    active_reservations: getActiveReservationsCount(),
  };

  updateDashboardStatsDisplay(stats);
}

// Calculates gym revenue from payment data (membership fees, gym services)
function calculateGymRevenue(payments) {
  if (!Array.isArray(payments) || payments.length === 0) return 0;

  let totalGymRevenue = 0;

  payments.forEach((payment) => {
    if (!payment) return;

    // Check if payment is related to gym services (membership, monthly pass, etc.)
    const purpose = (payment.payment_purpose || '').toLowerCase();
    const isGymService =
      purpose.includes('monthly') ||
      purpose.includes('membership') ||
      purpose.includes('gym') ||
      purpose.includes('pass') ||
      purpose.includes('subscription');

    if (isGymService) {
      const paidCash = Number(payment.payment_amount_paid_cash) || 0;
      const paidCashless = Number(payment.payment_amount_paid_cashless) || 0;
      totalGymRevenue += paidCash + paidCashless;
    }
  });

  return totalGymRevenue;
}

// Calculates product sales from Sales Transactions Log data
async function calculateProductSales(payments) {
  try {
    // Fetch sales transactions from the Sales Transactions Log
    const response = await fetch(`${API_BASE_URL}/payment/sales`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const salesData = await response.json();
    const salesPayments = Array.isArray(salesData.result) ? salesData.result : [];

    let totalProductSales = 0;

    salesPayments.forEach((payment) => {
      if (!payment) return;

      const paidCash = Number(payment.payment_amount_paid_cash) || 0;
      const paidCashless = Number(payment.payment_amount_paid_cashless) || 0;
      totalProductSales += paidCash + paidCashless;
    });

    return totalProductSales;
  } catch (error) {
    console.error('Failed to fetch sales transactions for product sales calculation:', error);
    return 0;
  }
}

// Calculates reservation revenue from payment data (facility bookings, classes, etc.)
function calculateReservationRevenue(payments) {
  if (!Array.isArray(payments) || payments.length === 0) return 0;

  let totalReservationRevenue = 0;

  payments.forEach((payment) => {
    if (!payment) return;

    // Check if payment is related to reservations
    const purpose = (payment.payment_purpose || '').toLowerCase();
    const isReservation =
      purpose.includes('reservation') ||
      purpose.includes('booking') ||
      purpose.includes('facility') ||
      purpose.includes('class') ||
      purpose.includes('session');

    if (isReservation) {
      const paidCash = Number(payment.payment_amount_paid_cash) || 0;
      const paidCashless = Number(payment.payment_amount_paid_cashless) || 0;
      totalReservationRevenue += paidCash + paidCashless;
    }
  });

  return totalReservationRevenue;
}

// Calculates overall total sales from all payment data
function calculateOverallTotalSales(payments) {
  if (!Array.isArray(payments) || payments.length === 0) return 0;

  let totalSales = 0;

  payments.forEach((payment) => {
    if (!payment) return;

    const paidCash = Number(payment.payment_amount_paid_cash) || 0;
    const paidCashless = Number(payment.payment_amount_paid_cashless) || 0;
    totalSales += paidCash + paidCashless;
  });

  return totalSales;
}

// Gets active monthly customers count from DOM (same logic as inquiry_customers.js)
function getActiveMonthlyCustomersCount() {
  try {
    const emptyText = document.getElementById('inquiry-customersSectionOneListEmpty2');
    if (!emptyText) return 0;
    const items = emptyText.parentElement.parentElement.children;
    return Math.max(0, items.length - 1);
  } catch (error) {
    console.error('Error counting active monthly customers:', error);
    return 0;
  }
}

// Gets active reservations count from DOM (same logic as inquiry_customers.js)
function getActiveReservationsCount() {
  try {
    const emptyText = document.getElementById('inquiry-reservationsSectionOneListEmpty2');
    if (!emptyText) return 0;
    const items = emptyText.parentElement.parentElement.children;
    return Math.max(0, items.length - 1);
  } catch (error) {
    console.error('Error counting active reservations:', error);
    return 0;
  }
}

// Updates dashboard stats display
function updateDashboardStatsDisplay(stats) {
  try {
    const statElements = document.querySelectorAll('#dashboardSectionStats');
    if (!statElements || statElements.length < 1) return;

    statElements.forEach((card) => {
      const header = card.querySelector('.section-stats-h');
      const valueEl = card.querySelector('.section-stats-c');
      if (!header || !valueEl) return;

      const label = (header.textContent || '').toLowerCase();

      if (label.includes('overall') && label.includes('total') && label.includes('sales')) {
        valueEl.textContent = main.encodePrice(stats.overall_total_sales || 0);
      } else if (label.includes('gym') && label.includes('revenue')) {
        valueEl.textContent = main.encodePrice(stats.gym_revenue || 0);
      } else if (label.includes('reservation') && label.includes('revenue')) {
        valueEl.textContent = main.encodePrice(stats.reservation_revenue || 0);
      } else if (label.includes('product') && label.includes('sales')) {
        valueEl.textContent = main.encodePrice(stats.product_sales || 0);
      } else if (label.includes('monthly') && label.includes('customer')) {
        valueEl.textContent = stats.active_monthly_customers || 0;
      } else if (label.includes('reservation') && !label.includes('revenue')) {
        valueEl.textContent = stats.active_reservations || 0;
      }
    });
  } catch (error) {
    console.error('Error updating dashboard stats display:', error);
  }
}

// Helper function to get ISO week number
function getIsoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

// Refreshes dashboard stats (called when new payments are added)
export async function refreshDashboardStats() {
  const stats = {
    gym_revenue: calculateGymRevenue(dashboardStatsCache.payments),
    product_sales: await calculateProductSales(dashboardStatsCache.payments),
    reservation_revenue: calculateReservationRevenue(dashboardStatsCache.payments),
    overall_total_sales: calculateOverallTotalSales(dashboardStatsCache.payments),
    active_monthly_customers: getActiveMonthlyCustomersCount(),
    active_reservations: getActiveReservationsCount(),
  };

  updateDashboardStatsDisplay(stats);
}
