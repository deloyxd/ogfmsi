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
    announcementsToShow.forEach((announcement) => {
      const announcementElement = createAnnouncementElement(announcement);
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
function createAnnouncementElement(announcement) {
  const newsItem = document.createElement('div');
  newsItem.className = 'news-item';

  const announcementHTML = `
    <div
      data-color="'black'"
      class="announcement-modal relative w-full max-w-4xl mx-auto overflow-hidden rounded-2xl border-4 border-white shadow-2xl duration-300 hover:scale-105 p-6 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-black dark:hover:shadow-orange-600"
    >
      <!-- Background Image with Overlay -->
      <div class="absolute inset-0">
        <img 
          src="${announcement.image.src || '/src/images/carousel_image_2.jpg'}" 
          class="h-full w-full object-cover" 
        />
        <div class="absolute inset-0 bg-black/40 backdrop-blur-[3px]"></div>
      </div>

      <!-- Content -->
      <div class="relative z-10 p-8 text-center">
        <!-- Title Section -->
        <div class="mb-6 flex justify-center">
          <h3 class="font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <span class="text-4xl"">${announcement.title.top}</span>
            <span class="text-6xl text-yellow-400 drop-shadow-[0_2px_4px_rgba(255,215,0,0.9)] mx-4">
              ${announcement.title.highlight}
            </span>
            <span class="text-3xl"">${announcement.title.bottom}</span>
          </h3>
        </div>

        <!-- Description -->
        <p class="text-lg font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)] leading-relaxed">
          ${announcement.description.replaceAll('\n', '<br>')}
        </p>
      </div>
    </div>
  `;

  newsItem.innerHTML = announcementHTML;

  // Add click handler for navigation
  const clickableElement = newsItem.querySelector('[data-color]');
  if (clickableElement) {
    clickableElement.addEventListener('click', () => {
      // Navigate to customer login or specific page
      // window.location.href = '/login';
    });
  }

  return newsItem;
}

// Auto-initialize when script loads
initializeAnnouncementLoader();
