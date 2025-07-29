document.addEventListener('DOMContentLoaded', function () {
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
  }

  // Save button
  const saveBtn = document.getElementById('settingsSaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const name = document.getElementById('settingsDisplayName').value;
      const email = document.getElementById('settingsEmail').value;
      // Save logic here (localStorage, API, etc.)
      Toastify({
        text: "Settings saved!",
        duration: 2000,
        gravity: "top",
        position: "right",
        backgroundColor: "#4ade80",
      }).showToast();
    });
  }
});