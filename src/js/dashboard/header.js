import modal from '../admin_main.js';
import dataSync from '../data_sync/content.js';

document.addEventListener('DOMContentLoaded', function () {
  const maxAnnouncementCount = 3;
  let announcementCount = 0;

  const mainBtn = Array.from(document.querySelectorAll('.section-main-btn')).find(
    (btn) => btn.dataset.section === 'dashboard'
  );
  mainBtn.addEventListener('click', () => {
    if (announcementCount == maxAnnouncementCount) {
      modal.toast('Delete an announcement first!', 'error');
      return;
    }
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
    modal.openModal(mainBtn, inputs, (result) => {
      createAnnouncement(result);
    });
  });
  const dashboardSubBtn = Array.from(document.querySelectorAll('.section-sub-btn')).find(
    (btn) => btn.dataset.section === 'dashboard'
  );
  // dashboardSubBtn.addEventListener("click", () => (window.location.href = "/"));

  function createAnnouncement(result) {
    announcementCount++;
    injectDataToAnnouncementItem(document.querySelector('.announcementBtn').cloneNode(true), result);
    dashboardHeaderContent.classList.add('hidden');
    dashboardSubBtn.classList.remove('hidden');

    modal.toast('Successfully created announcement!', 'success');
    modal.closeModal();
  }

  function updateAnnouncement(element, result) {
    injectDataToAnnouncementItem(element, result);

    modal.toast('Successfully updated announcement!', 'info');
    modal.closeModal();
  }

  function deleteAnnouncement(element) {
    element.remove();

    announcementCount--;
    if (announcementCount == 0) {
      dashboardHeaderContent.classList.remove('hidden');
      dashboardSubBtn.classList.add('hidden');
    }

    modal.toast('Successfully deleted announcement!', 'error');
    modal.closeConfirmationModal();
    modal.closeModal();
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
      modal.openModal(
        element,
        result,
        (result) => {
          updateAnnouncement(element, result);
          enqueueAnnouncement('Update');
        },
        () =>
          modal.openConfirmationModal('Delete announcement: ' + title, () => {
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
      dataSync.enqueue(action, data);
    }

    element.classList.remove('hidden');

    document.querySelector('.announcementBtn').parentElement.appendChild(element);
  }
});
