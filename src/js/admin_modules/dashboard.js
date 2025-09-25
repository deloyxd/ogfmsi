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
});

const maxAnnouncementCount = 3;
let announcementCount = 0;

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
  function createAnnouncement(result) {
    announcementCount++;
    announcementBtn = document.querySelector('.announcementBtn').cloneNode(true);
    injectDataToAnnouncementItem(announcementBtn, result);
    announcementBtn.parentElement.children[0].classList.add('hidden');
    subBtn.classList.remove('hidden');

    main.toast('Successfully created announcement!', 'success');
    main.closeModal();
  }

  function updateAnnouncement(element, result) {
    injectDataToAnnouncementItem(element, result);

    main.toast('Successfully updated announcement!', 'info');
    main.closeConfirmationModal();
    main.closeModal();
  }

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

function subBtnFunction() {}

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

async function setupChartOne() {
  const chart = document.getElementById('dashboardChart1');
  const context = chart.getContext('2d');

  if (Chart.getChart('dashboardChart1')) {
    Chart.getChart('dashboardChart1')?.destroy();
  }

  try {
    // Fetch real customer data
    const response = await fetch(`${API_BASE_URL}/inquiry/customers`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Process customer data to get monthly registration counts
    const monthlyData = processCustomerDataForChart(data.result);
    
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
            legend: {
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)',
              },
            },
            x: {
              grid: {
                display: false,
              },
            },
          },
        },
      });
    }, 50);
  } catch (error) {
    console.error('Failed to load real chart data:', error);
    // Fallback to original hardcoded data
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
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }, 50);
  }
}

async function setupChartTwo() {
  const chart = document.getElementById('dashboardChart2');
  const context = chart.getContext('2d');

  if (Chart.getChart('dashboardChart2')) {
    Chart.getChart('dashboardChart2')?.destroy();
  }

  try {
    // Fetch real customer data
    const response = await fetch(`${API_BASE_URL}/inquiry/customers`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Process customer data to get customer rate distribution
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
              backgroundColor: [
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
          plugins: {
            legend: {
              position: 'bottom',
            },
          },
        },
      });
    }, 50);
  } catch (error) {
    console.error('Failed to load real chart data:', error);
    // Fallback to original hardcoded data
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
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  }, 50);
  }
}

// Process customer data to create monthly registration counts
function processCustomerDataForChart(customers) {
  const monthlyCounts = {
    '01': 0, '02': 0, '03': 0, '04': 0, '05': 0, '06': 0,
    '07': 0, '08': 0, '09': 0, '10': 0, '11': 0, '12': 0
  };
  
  customers.forEach(customer => {
    const registrationDate = new Date(customer.created_at);
    const month = String(registrationDate.getMonth() + 1).padStart(2, '0');
    monthlyCounts[month]++;
  });
  
  return [
    monthlyCounts['01'], monthlyCounts['02'], monthlyCounts['03'], monthlyCounts['04'],
    monthlyCounts['05'], monthlyCounts['06'], monthlyCounts['07'], monthlyCounts['08'],
    monthlyCounts['09'], monthlyCounts['10'], monthlyCounts['11'], monthlyCounts['12']
  ];
}

// Process customer data to get rate distribution
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

// Load monthly customer growth data for tab 1
async function loadMonthlyGrowthData() {
  try {
    const response = await fetch(`${API_BASE_URL}/inquiry/customers`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Process customer data to get monthly registration counts
    const monthlyData = processCustomerDataForChart(data.result);
    
    // Clear existing content and recreate chart with real data
    const contentContainer = document.querySelector('[data-sectionindex="1"][data-tabindex="1"]');
    if (contentContainer) {
      contentContainer.innerHTML = '<canvas id="dashboardChart1"></canvas>';
      setupChartOneWithRealData(monthlyData);
    }
    
    console.log('Monthly growth data loaded:', monthlyData);
  } catch (error) {
    console.error('Failed to load monthly growth data:', error);
    // Fallback to original chart if data loading fails
    const contentContainer = document.querySelector('[data-sectionindex="1"][data-tabindex="1"]');
    if (contentContainer) {
      contentContainer.innerHTML = '<canvas id="dashboardChart1"></canvas>';
      setupChartOne();
    }
  }
}

// Setup chart with real data
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
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }, 50);
}

// Load upcoming renewals data for tab 2 - FIXED VERSION
async function loadUpcomingRenewals() {
  // Clear any existing dynamic rows first (additional safety measure)
  const existingDynamicRows = document.querySelectorAll('.dynamic-renewal-row');
  existingDynamicRows.forEach(row => row.remove());
  
  try {
    // Fetch both customer data and monthly data
    const [customersResponse, monthlyResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/inquiry/customers`),
      fetch(`${API_BASE_URL}/inquiry/monthly`)
    ]);
    
    if (!customersResponse.ok || !monthlyResponse.ok) {
      throw new Error(`HTTP error! status: ${customersResponse.status || monthlyResponse.status}`);
    }
    
    const customersData = await customersResponse.json();
    const monthlyData = await monthlyResponse.json();
    
    // Create a map of customer data for quick lookup
    const customerMap = {};
    customersData.result.forEach(customer => {
      customerMap[customer.customer_id] = customer;
    });
    
    // Filter customers whose membership expires within 14 days
    const today = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);
    
    const upcomingRenewals = monthlyData.result.filter(monthlyCustomer => {
      const endDate = new Date(monthlyCustomer.customer_end_date);
      return endDate >= today && endDate <= twoWeeksFromNow && monthlyCustomer.customer_pending === 0;
    });
    
    // Get the table container - find it more reliably
    const tabContainer = document.querySelector('[data-sectionindex="1"][data-tabindex="2"]');
    const emptyText = tabContainer ? tabContainer.querySelector('[id*="Empty"]') : document.getElementById('dashboardSectionOneListEmpty2');
    
    if (emptyText) {
      // Get the table body (parent element)
      const tableBody = emptyText.parentElement;
      
      // Clear ALL existing rows more reliably - remove all TR elements except the empty text row
      const allRows = Array.from(tableBody.querySelectorAll('tr'));
      allRows.forEach(row => {
        if (row !== emptyText) {
          row.remove();
        }
      });
      
      // Hide empty text if we have data
      if (upcomingRenewals.length > 0) {
        emptyText.classList.add('hidden');
      } else {
        emptyText.classList.remove('hidden');
        return;
      }
      
      // Add new rows using the existing table structure
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
          // Set up the renewal button
          const renewBtn = createResult.querySelector('#renewBtn');
          if (renewBtn) {
            renewBtn.addEventListener('click', () => handleRenewal(customer.customer_id));
          }
          
          // Store customer data for reference
          createResult.dataset.customerId = customer.customer_id;
          createResult.dataset.endDate = monthlyCustomer.customer_end_date;
          createResult.dataset.daysLeft = daysLeft;
          
          // Add a class to identify dynamically created rows - THIS IS KEY FOR PREVENTING DUPLICATES
          createResult.classList.add('dynamic-renewal-row');
        });
      });
    }
    
    console.log('Upcoming renewals loaded:', upcomingRenewals);
  } catch (error) {
    console.error('Failed to load upcoming renewals:', error);
    // Show empty state if API fails
    const tabContainer = document.querySelector('[data-sectionindex="1"][data-tabindex="2"]');
    const emptyText = tabContainer ? tabContainer.querySelector('[id*="Empty"]') : document.getElementById('dashboardSectionOneListEmpty2');
    if (emptyText) {
      emptyText.classList.remove('hidden');
    }
  }
}

// Handle renewal button click
function handleRenewal(customerId) {
  main.toast(`Renewal process initiated for customer ${customerId}`, 'info');
  // Here you can add the actual renewal logic
  // For now, just show a toast notification
}