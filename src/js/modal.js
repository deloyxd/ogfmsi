import global from './_global.js';

let modal;

export async function showModal(type, confim, cancel) {
  const confirmBtn = document.getElementById(confim);
  const cancelBtn = document.getElementById(cancel);

  modal = document.getElementById(type);
  modal.classList.remove('hidden');

  modal.addEventListener('click', function (e) {
    if (e.target === modal) {
      cancelBtn.click();
    }
  });

  if (type.includes('admin')) {
    adminModalSetup(confirmBtn, cancelBtn);
    return;
  }

  confirmBtn.onclick = async () => {
    // todo
  };

  cancelBtn.onclick = () => {
    normalCancelFunction();
  };
}

export async function showSuccessModal(title, message) {
  const successModal = document.getElementById('successModal');
  const successTitle = document.getElementById('success-title');
  const successMessage = document.getElementById('success-message');

  successTitle.textContent = title;
  successMessage.textContent = message;
  successModal.classList.remove('hidden');

  global.playSFX('success-sfx');
}

export default {
  showModal,
  showSuccessModal,
};

function normalCancelFunction() {
  modal.classList.add('hidden');
}

function adminModalSetup(confirmBtn, cancelBtn) {
  const usernameInput = document.getElementById('admin-username');
  const passwordInput = document.getElementById('admin-password');
  const validationMessage = document.getElementById('validation-message');

  const handleUsernameEnterKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      passwordInput.focus();
    }
  };

  const handlePasswordEnterKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmBtn.click();
    }
  };

  usernameInput.addEventListener('keypress', handleUsernameEnterKey);
  passwordInput.addEventListener('keypress', handlePasswordEnterKey);

  confirmBtn.onclick = async () => {
    const username = usernameInput.value;
    const password = passwordInput.value;
    if (!username || !password) {
      validationMessage.textContent = 'All fields are required to proceed';
      validationMessage.classList.remove('hidden');
      return;
    }
    // show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        `;
    try {
      const response = await fetch(`${global.API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        // store the full name in sessionStorage
        sessionStorage.setItem('admin_full_name', data.admin.full_name);
        sessionStorage.setItem('role_name', data.admin.role_name);

        cancelBtn.click();

        // 🔑 CLIENT
        showSuccessModal('Workout time!', 'Loading your dashboard...');

        // redirect after delay
        setTimeout(() => {
          window.location.href = '/src/modules_html/admin_side/dashboard.html';
        }, 500);
      } else {
        validationMessage.textContent = data.error || 'Invalid credentials';
        validationMessage.classList.remove('hidden');
      }
    } catch (error) {
      /* 💀 DANGEROUS 💀 REMOVE BEFORE DEPLOYING TO PRODUCTION */
      console.error('Login error:', error); // 👈
      /* 💀 DANGEROUS 💀 REMOVE BEFORE DEPLOYING TO PRODUCTION */

      validationMessage.textContent = 'An error occurred during login';
      validationMessage.classList.remove('hidden');

      global.playSFX('error-sfx');
    }
    // reset button state
    loginBtn.disabled = false;
    loginBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" x2="3" y1="12" y2="12"></line>
            </svg>
            LET'S GO
        `;
    // 🔑 CLIENT
  };

  cancelBtn.onclick = () => {
    normalCancelFunction();
    usernameInput.value = '';
    passwordInput.value = '';
    usernameInput.removeEventListener('keypress', handleUsernameEnterKey);
    passwordInput.removeEventListener('keypress', handlePasswordEnterKey);
    validationMessage.classList.add('hidden');
  };
}
