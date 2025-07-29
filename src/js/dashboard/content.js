import modal from '../admin_main.js'; // for renewal, todo

const active = dashboard_tab1.className;
const inactive = dashboard_tab2.className;

const context1 = dashboardChart1.getContext('2d');
const context2 = dashboardChart2.getContext('2d');
let contextChart1 = null;
let contextChart2 = null;

let lastTabSwitchTime = 0;
const TAB_SWITCH_DELAY = 1000;
let activeTimeout = null;

function showTab(tabIndex) {
  const now = Date.now();
  if (now - lastTabSwitchTime < TAB_SWITCH_DELAY) {
    return;
  }
  lastTabSwitchTime = now;

  if (activeTimeout) {
    clearTimeout(activeTimeout);
    activeTimeout = null;
  }

  dashboard_tab1.replaceWith(dashboard_tab1.cloneNode(true));
  dashboard_tab2.replaceWith(dashboard_tab2.cloneNode(true));
  const newTab1 = document.getElementById('dashboard_tab1');
  const newTab2 = document.getElementById('dashboard_tab2');

  if (tabIndex === 1) {
    newTab1.className = active;
    newTab2.className = inactive;
  } else if (tabIndex === 2) {
    newTab1.className = inactive;
    newTab2.className = active;
  }

  if (tabIndex == 1) {
    newTab1.children[0].classList.remove('text-gray-300');
    newTab1.children[1].classList.remove('hidden');
    newTab1.children[2].classList.add('hidden');
    newTab2.children[0].classList.add('text-gray-300');
    newTab2.children[1].classList.add('hidden');
    newTab2.children[2].classList.remove('hidden');
  } else {
    newTab1.children[0].classList.add('text-gray-300');
    newTab1.children[1].classList.add('hidden');
    newTab1.children[2].classList.remove('hidden');
    newTab2.children[0].classList.remove('text-gray-300');
    newTab2.children[1].classList.remove('hidden');
    newTab2.children[2].classList.add('hidden');
  }

  activeTimeout = setTimeout(() => {
    if (tabIndex == 1) {
      newTab2.children[0].classList.remove('text-gray-300');
      newTab2.children[1].classList.remove('hidden');
      newTab2.children[2].classList.add('hidden');
    } else {
      newTab1.children[0].classList.remove('text-gray-300');
      newTab1.children[1].classList.remove('hidden');
      newTab1.children[2].classList.add('hidden');
    }
    activeTimeout = null;
  }, TAB_SWITCH_DELAY);

  newTab1.addEventListener('click', () => {
    showTab(1);
  });

  newTab2.addEventListener('click', () => {
    showTab(2);
  });

  if (contextChart1) {
    contextChart1.destroy();
    contextChart1 = null;
  }

  if (tabIndex === 1) {
    dashboardChart1.classList.remove('hidden');
    dashboardSection1Search.parentElement.classList.add('hidden');
    dashboard_renewal.classList.add('hidden');

    setTimeout(() => {
      contextChart1 = new Chart(context1, {
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
  } else if (tabIndex === 2) {
    dashboardChart1.classList.add('hidden');
    dashboardSection1Search.parentElement.classList.remove('hidden');
    dashboardSection1Search.value = '';
    dashboardSection1Search.addEventListener('input', (event) => {
      const searchTerm = event.target.value.toLowerCase().trim();
      const children = dashboard_renewal.children;

      for (let i = 3; i < children.length; i++) {
        const child = children[i];
        const textContent = child.textContent.toLowerCase();

        if (textContent.includes(searchTerm)) {
          child.classList.remove('hidden');
        } else {
          child.classList.add('hidden');
        }
      }
    });
    dashboardSection1Search.dispatchEvent(new Event('input'));
    showTab2Content();
  }
}

function showTab2Content() {
  dashboard_renewal.classList.remove('hidden');
}

function handleRenew(userId) {
  const user = tab2sampleData.find((u) => u.id === userId);

  // todo

  tab2sampleData = tab2sampleData.filter((u) => u.id !== userId);
  showTab2Content();
}

function setupChart2() {
  if (contextChart2) {
    contextChart2.destroy();
    contextChart2 = null;
  }

  contextChart2 = new Chart(context2, {
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
}

document.addEventListener('DOMContentLoaded', function () {
  showTab(1);
  setupChart2();
});
