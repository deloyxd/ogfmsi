import main from './admin_main.js';
import datasync from './admin_datasync.js';

// default codes:
let mainBtn, subBtn, sectionTwoMainBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  // change to right sectionName
  if (main.sharedState.sectionName != 'dashboard') return;
  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
  // this button is hidden initially, using this code will show it
  // subBtn.classList.remove('hidden'); 
  subBtn.addEventListener('click', subBtnFunction);
  // this button is disabled in this module, using this code will enable it
  // sectionTwoMainBtn = document.getElementById(`${main.sharedState.sectionName}SectionTwoMainBtn`);
  // sectionTwoMainBtn.addEventListener('click', sectionTwoMainBtnFunction);

  // not default code: sample of custom content setup
  setupChartOne();
  setupChartTwo();
});

const maxAnnouncementCount = 3;
let announcementCount = 0;

function mainBtnFunction() {
  if (announcementCount == maxAnnouncementCount) {
    main.toast('Delete an announcement first!', 'error');
    return;
  }

  mainBtn.dataset.title = 'Create Announcement 📢';
  mainBtn.dataset.subtitle = 'Announcement form';

  const inputs = {
    image: {
      src: '/src/images/carousel_image_2.jpg',
      type: 'live',
      short: [
        {
          placeholder: 'Title - Top',
          value: "💪 Let's go 🏋️‍♀️",
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
    createAnnouncement(result);
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
    element.dataset.title = 'Update Announcement 📌';
    element.dataset.subtitle = 'Announcement form';
    element.dataset.main = 'Update 📌';
    element.dataset.sub = 'Delete 💀';
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
        (result) => {
          updateAnnouncement(element, result);
          enqueueAnnouncement('Update');
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
      };
      if (actionType.toLowerCase().includes('create') || actionType.toLowerCase().includes('update')) {
        data.image = element.children[0].src;
        data.title = title;
        data.description = element.dataset.description;
      }
      datasync.enqueue(action, data);
    }

    element.classList.remove('hidden');

    document.querySelector('.announcementBtn').parentElement.appendChild(element);
  }
}

function subBtnFunction() {}

function setupChartOne() {
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

function setupChartTwo() {
  const chart = document.getElementById('dashboardChart2');
  const context = chart.getContext('2d');

  if (Chart.getChart('dashboardChart2')) {
    Chart.getChart('dashboardChart2')?.destroy();
  }

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
