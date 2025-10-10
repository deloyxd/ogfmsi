import main from '../admin_main.js';
import accesscontrol from './maintenance_accesscontrol.js';
import { API_BASE_URL } from '../_global.js';

// default codes:
let mainBtn, subBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName != 'dashboard') return;
  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
  subBtn.addEventListener('click', subBtnFunction);
  setupChartOne();
  setupChartTwo();
  loadDashboardStats(); // Load dashboard stats
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

// Handles creation, update, and deletion of announcements
function mainBtnFunction() {
  if (announcementCount == maxAnnouncementCount) {
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
        {
          placeholder: 'Title - Top',
          value: `💪 Let's go 🏋️‍♀️`,
          required: true,
        },
        {
          placeholder: 'Title - Highlight',
          value: 'Fitworx',
          required: true,
        },
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
    main.openConfirmationModal('Announce', () => {
      createAnnouncement(result);
      main.closeConfirmationModal();
    });
  });

  let announcementBtn;

  // Creates a new announcement
  function createAnnouncement(result) {
    announcementCount++;
    announcementBtn = document.querySelector('.announcementBtn').cloneNode(true);
    injectDataToAnnouncementItem(announcementBtn, result);
    announcementBtn.parentElement.children[0].classList.add('hidden');
    subBtn.classList.remove('hidden');

    main.toast('Successfully created announcement!', 'success');
    main.closeModal();
  }

  // Updates an existing announcement
  function updateAnnouncement(element, result) {
    injectDataToAnnouncementItem(element, result);

    main.toast('Successfully updated announcement!', 'info');
    main.closeConfirmationModal();
    main.closeModal();
  }

  // Deletes an announcement
  function deleteAnnouncement(element) {
    announcementCount--;
    if (announcementCount == 0) {
      element.parentElement.children[0].classList.remove('hidden');
      subBtn.classList.add('hidden');
    }

    element.remove();

    main.toast('Successfully deleted announcement!', 'error');
    main.closeConfirmationModal();
    main.closeModal();
  }

  // Injects announcement data into the UI
  function injectDataToAnnouncementItem(element, result) {
    element.children[0].src = result.image.src;
    let title = '';
    element.children[2].querySelectorAll('p').forEach((p, i) => {
      result.image.short.forEach((input, index) => {
        if (index == i) {
          title += ' ' + input.value;
          p.textContent = input.value;
        }
      });
    });
    result.header.title = `Update Announcement ${getEmoji('📌', 26)}`;
    result.header.subtitle = 'Announcement form';
    result.footer = {};
    result.footer.main = `Update ${getEmoji('📌')}`;
    result.footer.sub = `Delete ${getEmoji('⚠️')}`;
    element.dataset.description = result.large[0].value;

    element.addEventListener('mouseenter', () => {
      element.classList.add('flash-effect');
    });
    element.addEventListener('mouseleave', () => {
      element.classList.remove('flash-effect');
    });
    element.onclick = () => {
      main.openModal(
        element,
        result,
        (updatedResult) => {
          main.openConfirmationModal('Update announcement: ' + title, () => {
            updateAnnouncement(element, updatedResult);
            enqueueAnnouncement('Update');
          });
        },
        () =>
          main.openConfirmationModal('Delete announcement: ' + title, () => {
            deleteAnnouncement(element);
            enqueueAnnouncement('Delete');
          })
      );
    };

    enqueueAnnouncement('Create');

    // Logs announcement actions
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
}

// Handles sub button logic
function subBtnFunction() {}

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
              backgroundColor: ['rgb(249, 115, 22)', 'rgb(194, 65, 12)'],
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
    '01': 0, '02': 0, '03': 0, '04': 0, '05': 0, '06': 0,
    '07': 0, '08': 0, '09': 0, '10': 0, '11': 0, '12': 0
  };
  
  if (!Array.isArray(monthlyPasses)) return Object.values(monthlyCounts);
  
  monthlyPasses.forEach(pass => {
    // Only count active passes
    if (Number(pass.customer_pending) !== 0) return;
    const startDate = new Date(pass.customer_start_date);
    if (isNaN(startDate.getTime())) return;
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    monthlyCounts[month]++;
  });
  
  return [
    monthlyCounts['01'], monthlyCounts['02'], monthlyCounts['03'], monthlyCounts['04'],
    monthlyCounts['05'], monthlyCounts['06'], monthlyCounts['07'], monthlyCounts['08'],
    monthlyCounts['09'], monthlyCounts['10'], monthlyCounts['11'], monthlyCounts['12']
  ];
}

// Processes customer data into rate distribution
function processCustomerRateData(customers) {
  let regular = 0;
  let student = 0;
  
  customers.forEach(customer => {
    if (customer.customer_rate === 'regular') {
      regular++;
    } else if (customer.customer_rate === 'student') {
      student++;
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
  existingDynamicRows.forEach(row => row.remove());
  
  try {
    const [customersResponse, monthlyResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/inquiry/customers`),
      fetch(`${API_BASE_URL}/inquiry/monthly`)
    ]);
    
    if (!customersResponse.ok || !monthlyResponse.ok) {
      throw new Error(`HTTP error! status: ${customersResponse.status || monthlyResponse.status}`);
    }
    
    const customersData = await customersResponse.json();
    const monthlyData = await monthlyResponse.json();
    
    const customerMap = {};
    customersData.result.forEach(customer => {
      customerMap[customer.customer_id] = customer;
    });
    
    const today = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);
    
    const upcomingRenewals = monthlyData.result.filter(monthlyCustomer => {
      const endDate = new Date(monthlyCustomer.customer_end_date);
      return endDate >= today && endDate <= twoWeeksFromNow && monthlyCustomer.customer_pending === 0;
    });
    
    const tabContainer = document.querySelector('[data-sectionindex="1"][data-tabindex="2"]');
    const emptyText = tabContainer ? tabContainer.querySelector('[id*="Empty"]') : document.getElementById('dashboardSectionOneListEmpty2');
    
    if (emptyText) {
      const tableBody = emptyText.parentElement;
      const allRows = Array.from(tableBody.querySelectorAll('tr'));
      allRows.forEach(row => {
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
      
      upcomingRenewals.forEach(monthlyCustomer => {
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
              customer.customer_contact || 'N/A'
            ],
          },
          daysText,
        ];
        
        main.createAtSectionOne('dashboard', columnsData, 2, (createResult) => {
          const renewBtn = createResult.querySelector('#renewBtn');
          if (renewBtn) {
            renewBtn.addEventListener('click', () => handleRenewal(customer.customer_id));
          }
          
          createResult.dataset.customerId = customer.customer_id;
          createResult.dataset.endDate = monthlyCustomer.customer_end_date;
          createResult.dataset.daysLeft = daysLeft;
          createResult.classList.add('dynamic-renewal-row');
        });
      });
    }
    
    console.log('Upcoming renewals loaded:', upcomingRenewals);
  } catch (error) {
    console.error('Failed to load upcoming renewals:', error);
    const tabContainer = document.querySelector('[data-sectionindex="1"][data-tabindex="2"]');
    const emptyText = tabContainer ? tabContainer.querySelector('[id*="Empty"]') : document.getElementById('dashboardSectionOneListEmpty2');
    if (emptyText) {
      emptyText.classList.remove('hidden');
    }
  }
}

// Handles customer renewal actions
function handleRenewal(customerId) {
  main.toast(`Renewal process initiated for customer ${customerId}`, 'info');
}

// ===== Dashboard Stats Calculation =====

// Cache for dashboard stats data
let dashboardStatsCache = {
  payments: [],
  monthlyCustomers: [],
  reservations: []
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
      active_reservations: 0
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
    active_reservations: getActiveReservationsCount()
  };

  updateDashboardStatsDisplay(stats);
}

// Calculates gym revenue from payment data (membership fees, gym services)
function calculateGymRevenue(payments) {
  if (!Array.isArray(payments) || payments.length === 0) return 0;

  let totalGymRevenue = 0;

  payments.forEach(payment => {
    if (!payment) return;
    
    // Check if payment is related to gym services (membership, monthly pass, etc.)
    const purpose = (payment.payment_purpose || '').toLowerCase();
    const isGymService = purpose.includes('monthly') || 
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

    salesPayments.forEach(payment => {
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

  payments.forEach(payment => {
    if (!payment) return;
    
    // Check if payment is related to reservations
    const purpose = (payment.payment_purpose || '').toLowerCase();
    const isReservation = purpose.includes('reservation') || 
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

  payments.forEach(payment => {
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
      
      // Debug: log the label to see what we're matching against
      console.log('Dashboard stat label:', label);
      
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
      } else {
        // Fallback: if no match found, log it for debugging
        console.log('No match found for label:', label);
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
    active_reservations: getActiveReservationsCount()
  };

  updateDashboardStatsDisplay(stats);
}