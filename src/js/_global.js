/* This file handles all global functions and global data of the project */

import modal from './modal.js';

export const API_BASE_URL = 'http://localhost:5501/api';

export const playSFX = (sfxid) => {
  const sfx = document.getElementById(sfxid);
  sfx.play();
};

export default {
  API_BASE_URL,
  playSFX,
};

/* tailwind: dark mode color palette */
// 🔑 CLIENT
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#111626',
          800: '#2d2d2d',
          700: '#3d3d3d',
          600: '#4d4d4d',
        },
      },
    },
  },
};

function checkIfJsShouldNotRun(id) {
  let result = false;
  result = document.getElementById(id) == null;
  return result;
}

function setupLandingHeaderComponent() {
  setupClientLogo();
  setupDarkMode();
  setupLoginDropdown();
  setupMobileLoginDropdown();
}

function setupClientLogo() {
  document.querySelectorAll('.redirect-to-dashboard').forEach((button) => {
    button.addEventListener('click', function () {
      window.location.href = '/index.html';
    });
  });
  document.querySelectorAll('.redirect-to-login').forEach((button) => {
    button.addEventListener('click', function () {
      window.location.href = '/src/modules_html/customer_side/login.html';
    });
  });
  document.querySelectorAll('.redirect-to-demo').forEach((button) => {
    button.addEventListener('click', function () {
      showVideoModal();
    });
  });
}

function setupDarkMode() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const html = document.documentElement;

  // check for saved theme preference, otherwise use system preference
  if (
    localStorage.theme === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  // toggler
  themeToggleBtn.addEventListener('click', () => {
    html.classList.toggle('dark');
    localStorage.theme = html.classList.contains('dark') ? 'dark' : 'light';
  });
}

function setupLoginDropdown() {
  const dropdownToggle = document.getElementById('dropdown-toggle');
  const dropdownMenu = document.getElementById('dropdown-menu');

  // toggler
  dropdownToggle.addEventListener('click', function () {
    dropdownMenu.classList.toggle('hidden');
  });

  // close dropdown when clicking outside
  window.addEventListener('click', function (e) {
    if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.add('hidden');
    }
  });

  // attach the event listener to the "Admin Login" button
  const adminLoginBtn = document.getElementById('admin-login-btn');
  adminLoginBtn.addEventListener('click', () => {
    modal.showModal('adminLoginModal', 'loginBtn', 'cancelBtn');
    dropdownMenu.classList.add('hidden');
  });
}

function setupMobileLoginDropdown() {
  const mobileMenuBtn = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  const adminLoginBtn = document.getElementById('mobile-admin-login-btn');
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });
  adminLoginBtn.addEventListener('click', () => {
    modal.showModal('adminLoginModal', 'loginBtn', 'cancelBtn');
  });
}

function setupCarouselComponent() {
  setupWatchDemo();
  setupCarouselImages();
}

function setupWatchDemo() {
  const watchDemoBtn = document.getElementById('watchDemoBtn');
  const videoModal = document.getElementById('videoModal');
  const closeVideoBtn = document.getElementById('closeVideoBtn');
  const demoVideo = document.getElementById('demoVideo');

  // open video modal with animation
  watchDemoBtn.addEventListener('click', function () {
    showVideoModal();
  });

  // close video modal
  function closeVideo() {
    videoModal.classList.add('hidden');
    demoVideo.pause();
    demoVideo.currentTime = 0;
  }

  closeVideoBtn.addEventListener('click', function () {
    closeVideo();
  });

  // close modal when clicking outside the video
  videoModal.addEventListener('click', function (e) {
    if (e.target === videoModal) {
      closeVideo();
    }
  });

  // close modal with escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !videoModal.classList.contains('hidden')) {
      closeVideo();
    }
  });
}

function showVideoModal() {
  videoModal.classList.remove('hidden');
  demoVideo.muted = false;
  demoVideo.play().catch((e) => {
    console.log('Video play failed:', e);
  });
}

function setupCarouselImages() {
  const carousel = document.getElementById('carousel');
  const carouselItems = carousel.querySelectorAll('.carousel-item');
  let currentIndex = 0;

  function showSlide(index) {
    // hide all slides
    carouselItems.forEach((item) => item.classList.remove('active'));

    // ensure index wraps around
    currentIndex = (index + carouselItems.length) % carouselItems.length;

    // show current slide
    carouselItems[currentIndex].classList.add('active');
  }

  // auto-advance slides every 3 seconds
  setInterval(() => {
    showSlide(currentIndex + 1);
  }, 3000);

  carousel.addEventListener('click', function () {
    showVideoModal();
  });
}

function setupNewsComponent() {
  // Section visibility tracking
  const sections = document.querySelectorAll('section');
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1,
  };

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  sections.forEach((section) => {
    sectionObserver.observe(section);
  });

  setupCycleComponent('.news-item');
}

function setupCycleComponent(id) {
  const items = document.querySelectorAll(id);
  if (items.length === 0) return;

  let currentIndex = 0;
  const cycleDuration = 1500;
  let cycleInterval;
  let isManualHover = false;

  function simulateHover(item) {
    item.classList.add('simulated-hover');

    const innerDiv = item.querySelector('div');
    if (innerDiv) {
      if (id.includes('news')) {
        innerDiv.classList.add('-translate-y-2');
        innerDiv.classList.add('shadow-[0_25px_50px_-12px_rgb(0_0_0_/_0.25)]'); // shadow-2xl
        innerDiv.classList.add(`shadow-${innerDiv.dataset.color}` + (innerDiv.dataset.color === `black` ? '' : `-600`));
      } else if (id.includes('feature')) {
        innerDiv.classList.add('shadow-[0_25px_50px_-12px_rgb(0_0_0_/_0.25)]');
        innerDiv.classList.add('scale-105');
      } else if (id.includes('class')) {
        innerDiv.classList.add('shadow-[0_10px_15px_-3px_rgb(0_0_0_/_0.25)]'); // shadow-lg
        innerDiv.classList.add(`shadow-orange-500`);
      } else if (id.includes('goal')) {
        innerDiv.classList.add('-translate-y-2');
        innerDiv.classList.add('shadow-[0_25px_50px_-12px_rgb(0_0_0_/_0.25)]');
        innerDiv.classList.add('scale-110');
        innerDiv.classList.add(`border-${innerDiv.dataset.color}-300`);
        innerDiv.classList.add(`shadow-${innerDiv.dataset.color}-500`);
      } else if (id.includes('location')) {
        innerDiv.classList.add('-translate-y-1');
        innerDiv.classList.add('shadow-[0_10px_15px_-3px_rgb(0_0_0_/_0.25)]'); // shadow-lg
        innerDiv.classList.add(`shadow-orange-500`);
      } else if (id.includes('pricing')) {
        innerDiv.classList.add(`shadow-orange-600`);
        innerDiv.classList.add('scale-105');
      }
    }
  }

  function removeHover(item) {
    item.classList.remove('simulated-hover');

    const innerDiv = item.querySelector('div');
    if (innerDiv) {
      if (id.includes('news')) {
        innerDiv.classList.remove('-translate-y-2');
        innerDiv.classList.remove('shadow-[0_25px_50px_-12px_rgb(0_0_0_/_0.25)]');
        innerDiv.classList.remove(
          `shadow-${innerDiv.dataset.color}` + (innerDiv.dataset.color === `black` ? '' : `-600`)
        );
      } else if (id.includes('feature')) {
        innerDiv.classList.remove('shadow-[0_25px_50px_-12px_rgb(0_0_0_/_0.25)]');
        innerDiv.classList.remove('scale-105');
      } else if (id.includes('class')) {
        innerDiv.classList.remove('shadow-[0_10px_15px_-3px_rgb(0_0_0_/_0.25)]');
        innerDiv.classList.remove(`shadow-orange-500`);
      } else if (id.includes('goal')) {
        innerDiv.classList.remove('-translate-y-2');
        innerDiv.classList.remove('shadow-[0_25px_50px_-12px_rgb(0_0_0_/_0.25)]');
        innerDiv.classList.remove('scale-110');
        innerDiv.classList.remove(`border-${innerDiv.dataset.color}-300`);
        innerDiv.classList.remove(`shadow-${innerDiv.dataset.color}-500`);
      } else if (id.includes('location')) {
        innerDiv.classList.remove('-translate-y-1');
        innerDiv.classList.remove('shadow-[0_10px_15px_-3px_rgb(0_0_0_/_0.25)]');
        innerDiv.classList.remove(`shadow-orange-500`);
      } else if (id.includes('pricing')) {
        innerDiv.classList.remove(`shadow-orange-600`);
        innerDiv.classList.remove('scale-105');
      }
    }
  }

  function cycleItems() {
    items.forEach((item) => removeHover(item));
    simulateHover(items[currentIndex]);
    currentIndex = (currentIndex + 1) % items.length;
  }

  function startCycling() {
    if (cycleInterval) clearInterval(cycleInterval);
    if (!isManualHover) {
      cycleInterval = setInterval(cycleItems, cycleDuration);
      cycleItems();
    }
  }

  // start the automatic cycling
  startCycling();

  items.forEach((item) => {
    item.addEventListener('mouseenter', function (e) {
      // only respond to real mouse events
      if (e.isTrusted) {
        isManualHover = true;
        clearInterval(cycleInterval);
        cycleInterval = null;
        items.forEach((goalItem) => removeHover(goalItem));
      }
    });

    item.addEventListener('mouseleave', function (e) {
      if (e.isTrusted) {
        isManualHover = false;
        currentIndex = (Array.from(items).indexOf(item) + 1) % items.length;
        startCycling();
      }
    });
  });
}

function setupCalculatorsComponent() {
  setupBMICalculator();
  setupCalorieCalculator();
}

function setupBMICalculator() {
  document.getElementById('bmiForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const height = document.getElementById('height').value / 100;
    const weight = document.getElementById('weight').value;
    const bmi = weight / (height * height);

    let category = '';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi < 25) category = 'Normal weight';
    else if (bmi < 30) category = 'Overweight';
    else category = 'Obese';

    document.getElementById('bmiValue').textContent = bmi.toFixed(1);
    if (document.getElementById('bmiValue').textContent === 'NaN') {
      category = 'Error';
    }
    document.getElementById('bmiCategory').textContent = `Category: ${category}`;
    document.getElementById('bmiResult').classList.remove('hidden');
  });
}

function setupCalorieCalculator() {
  document.getElementById('calorieForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value;
    const activity = parseFloat(document.getElementById('activity').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);

    let bmr;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    const calories = Math.round(bmr * activity);

    document.getElementById('calorieValue').textContent = calories;
    if (document.getElementById('calorieValue').textContent === 'NaN') {
      document.getElementById('calorieDescription').textContent = 'You must calculate your BMI first';
    } else {
      document.getElementById('calorieDescription').textContent = 'Daily calories needed to maintain current weight';
    }

    document.getElementById('calorieResult').classList.remove('hidden');
  });
}

function setupLocationComponents() {
  const defaultLocation = [14.7669369, 121.0442142];
  const defaultZoom = 16;
  const map = L.map('map').setView(defaultLocation, defaultZoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  // 🔑 CLIENT
  const marker = L.marker([14.7669369, 121.0442142]).addTo(map);
  marker.bindPopup('<b>Fitworx Gym</b><br>Capt. F. S. Samano, Caloocan, Metro Manila').openPopup();

  const liveLocationBtn = document.getElementById('live-location');
  liveLocationBtn.addEventListener('click', function () {
    map.flyTo(defaultLocation, defaultZoom, {
      duration: 3,
      easeLinearity: 0.25,
      noMoveStart: false,
    });
    setTimeout(() => marker.openPopup(), 1500);
  });

  setupCycleComponent('.location-item');
}

function setupFAQandFeedbackComponent() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    const icon = item.querySelector('.faq-icon');

    question.addEventListener('click', () => {
      answer.classList.toggle('hidden');
      icon.classList.toggle('rotate-180');
    });
  });

  const feedbackForm = document.getElementById('feedback-form');
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const formData = new FormData(feedbackForm);
      const data = Object.fromEntries(formData.entries());

      // TODO, actual recieving of the feedback

      Swal.fire({
        title: 'Thank You!',
        text: 'Your feedback has been submitted successfully.',
        icon: 'success',
        confirmButtonText: 'OK',
      });

      feedbackForm.reset();
    });
  }
}

/* add new functions above 👆 */

document.addEventListener('DOMContentLoaded', function () {
  if (checkIfJsShouldNotRun('_global')) return;
  setupLandingHeaderComponent();
  setupCarouselComponent();
  setupNewsComponent();
  setupCycleComponent('.feature-item');
  setupCycleComponent('.class-a-item');
  setupCycleComponent('.class-b-item');
  setupCycleComponent('.goal-item');
  setupCalculatorsComponent();
  setupLocationComponents();
  setupFAQandFeedbackComponent();
  setupCycleComponent('.pricing-a-item');
  setTimeout(() => setupCycleComponent('.pricing-b-item'), 33);
  /* call newly created functions here 👆 */
});
