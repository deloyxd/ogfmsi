// Announcement loader for index.html
import { listenToAnnouncements } from './announcements.js';

// Configuration
const ANNOUNCEMENT_CONTAINER_SELECTOR = '#announcements-container';
const MAX_DISPLAY_ANNOUNCEMENTS = 3;

/**
 * Initialize announcement loader
 */
export function initializeAnnouncementLoader() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAnnouncements);
  } else {
    loadAnnouncements();
  }
}

/**
 * Load announcements from Firebase or show "No announcements" message
 */
function loadAnnouncements() {
  try {
    // Listen to real-time updates from Firebase
    const unsubscribe = listenToAnnouncements((announcements) => {
      if (announcements && announcements.length > 0) {
        displayAnnouncements(announcements);
      } else {
        displayNoAnnouncementsMessage(document.querySelector(ANNOUNCEMENT_CONTAINER_SELECTOR));
      }
    });

    // Store unsubscribe function for cleanup if needed
    window.announcementUnsubscribe = unsubscribe;
  } catch (error) {
    console.error('Error loading announcements:', error);
    const container = document.querySelector(ANNOUNCEMENT_CONTAINER_SELECTOR);
    if (container) {
      displayNoAnnouncementsMessage(container);
    }
  }
}

/**
 * Display announcements from Firebase
 * @param {Array} announcements - Array of announcement objects
 */
function displayAnnouncements(announcements) {
  const container = document.querySelector(ANNOUNCEMENT_CONTAINER_SELECTOR);
  if (!container) {
    console.error('Announcement container not found');
    return;
  }

  // Clear existing announcements
  container.innerHTML = '';

  // Display up to MAX_DISPLAY_ANNOUNCEMENTS announcements
  const announcementsToShow = announcements.slice(0, MAX_DISPLAY_ANNOUNCEMENTS);

  if (announcementsToShow.length > 0) {
    announcementsToShow.forEach((announcement, index) => {
      const announcementElement = createAnnouncementElement(announcement, index);
      container.appendChild(announcementElement);
    });
  } else {
    // Display "No announcements" message
    displayNoAnnouncementsMessage(container);
  }
}

/**
 * Display "No announcements" message
 * @param {HTMLElement} container - The container element
 */
function displayNoAnnouncementsMessage(container) {
  const noAnnouncementsDiv = document.createElement('div');
  noAnnouncementsDiv.className = 'col-span-full flex items-center justify-center py-12';

  noAnnouncementsDiv.innerHTML = `
    <div class="text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mx-auto">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-600 mb-2">No announcements</h3>
      <p class="text-gray-500">Check back later for updates!</p>
    </div>
  `;

  container.appendChild(noAnnouncementsDiv);
}

/**
 * Create announcement DOM element
 * @param {Object} announcement - Announcement data
 * @param {number} index - Index for styling
 * @returns {HTMLElement} - Announcement element
 */
function createAnnouncementElement(announcement, index) {
  const newsItem = document.createElement('div');
  newsItem.className = 'news-item';

  // Determine colors and classes based on index
  const colorConfig = getColorConfig(index);
  
  // Build an optional image block to render UNDER the text content
  const hasImage = announcement && announcement.image && announcement.image.src;
  const altTitle = [
    announcement?.title?.top || '',
    announcement?.title?.highlight || '',
    announcement?.title?.bottom || '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const imageBlock = hasImage
    ? `
      <img
        src="${announcement.image.src}"
        alt="${altTitle || 'Announcement image'}"
        class="mt-4 w-full rounded-lg object-cover max-h-56"
      />
    `
    : '';

  const announcementHTML = `
    <div
      style="cursor: pointer"
      data-color="${colorConfig.color}"
      class="${colorConfig.classes}"
    >
      <!-- Icon removed as requested -->
      <div class="hidden"></div>
      <h3 class="mb-3 text-3xl font-bold ${colorConfig.titleColor}">
        ${announcement.title.top}
      </h3>
      <p class="text-xl ${colorConfig.textColor} mb-4">
        ${announcement.description}
      </p>
      ${imageBlock}
    </div>
  `;

  newsItem.innerHTML = announcementHTML;

  // Add click handler for navigation
  const clickableElement = newsItem.querySelector('[data-color]');
  if (clickableElement) {
    clickableElement.addEventListener('click', () => {
      // Navigate to customer login or specific page
      window.location.href = '/login';
    });
  }

  return newsItem;
}

/**
 * Get color configuration based on index
 * @param {number} index - Index for styling
 * @returns {Object} - Color configuration
 */
function getColorConfig(index) {
  const configs = [
    {
      color: 'orange',
      classes:
        'redirect-to-demo rounded-lg border border-orange-500 bg-orange-200 p-6 shadow-lg transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-orange-600 dark:hover:shadow-orange-300',
      iconBg: 'bg-gradient-to-br from-orange-500 to-red-500',
      titleColor: 'text-red-500',
      textColor: 'text-red-500 text-opacity-70',
      iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
    },
    {
      color: 'black',
      classes:
        'redirect-to-login transform rounded-lg border border-gray-900 bg-gradient-to-br from-orange-500 to-red-500 p-6 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black dark:hover:shadow-orange-600',
      iconBg: 'bg-white',
      titleColor: 'text-white',
      textColor: 'text-white text-opacity-70',
      iconPath:
        'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      color: 'orange',
      classes:
        'redirect-to-demo transform rounded-lg border border-orange-500 bg-orange-200 p-6 shadow-lg transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-orange-600 dark:hover:shadow-orange-300',
      iconBg: 'bg-gradient-to-br from-orange-500 to-red-500',
      titleColor: 'text-red-500',
      textColor: 'text-red-500 text-opacity-70',
      iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  ];

  return configs[index % configs.length];
}

// Auto-initialize when script loads
initializeAnnouncementLoader();
