const BUTTON_SELECTOR = '#subscription-form';

document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.querySelector(BUTTON_SELECTOR);
  if (!trigger) return;
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    openInfoModal();
  });
});

function openInfoModal() {
  const modalHTML = `
      <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300 z-50 hidden" id="monthlyPassInfoModal">
        <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
          <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-orange-500 to-orange-800 p-4 text-center text-white">
            <p class="text-xl font-medium">🎫 Membership Information</p>
          </div>
          <div class="p-6">
            <div class="text-left space-y-4">
              <h2 class="text-lg font-semibold text-orange-800">Before you start your fitness journey</h2>
              <ul class="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li><b>Payment Method:</b> GCash payments only - quick and secure</li>
                <li><b>Membership Rates:</b> Regular ₱950 | Student ₱850</li>
                <li><b>Instant Activation:</b> Membership starts after payment verification</li>
                <li><b>Keep Your Receipt:</b> Save your GCash reference number for verification</li>
                <li><b>Important Notice:</b> No refunds for incomplete or invalid payments</li>
              </ul>
              <label class="flex items-start gap-2 text-sm text-gray-800">
                <input id="mpolicyAgree" type="checkbox" class="mt-1" />
                <span>I agree to the membership policy and terms</span>
              </label>
              <p class="inline-validation-msg hidden mt-2 text-xs text-red-600"></p>
            </div>
          </div>
          <div class="flex gap-3 p-6">
            <button type="button" id="mpInfoCancel" class="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500">Cancel</button>
            <button type="button" id="mpInfoStart" class="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600">Start</button>
          </div>
        </div>
      </div>
    `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('monthlyPassInfoModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 10);

  const close = () => {
    modal.classList.remove('opacity-100');
    modal.children[0].classList.add('-translate-y-6');
    modal.children[0].classList.remove('scale-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.remove();
    }, 300);
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  document.getElementById('mpInfoCancel').addEventListener('click', close);
  document.getElementById('mpInfoStart').addEventListener('click', () => {
    const agree = /** @type {HTMLInputElement|null} */ (document.getElementById('mpolicyAgree'));
    const msg = /** @type {HTMLParagraphElement|null} */ (modal.querySelector('.inline-validation-msg'));
    if (!agree || !agree.checked) {
      if (msg) {
        msg.textContent = 'Please agree to the membership policy and terms to continue.';
        msg.classList.remove('hidden');
      }
      return;
    }
    close();
    openRegistrationModal();
  });
}

function openRegistrationModal() {
  const today = formatDateInput(new Date());
  const endDate = formatDateInput(addMonths(new Date(), 1));

  const formHtml = `
      <form id="membershipForm" class="text-left space-y-4">
        <div class="grid grid-cols-1 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Membership Type</label>
            <div class="flex gap-2">
              <label class="flex items-center gap-2 px-3 py-2 border rounded cursor-pointer">
                <input type="radio" name="membershipType" value="regular" checked />
                <span>🏋️ Regular Membership - ₱950</span>
              </label>
              <label class="flex items-center gap-2 px-3 py-2 border rounded cursor-pointer">
                <input type="radio" name="membershipType" value="student" />
                <span>🎓 Student Membership - ₱850</span>
              </label>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1" for="memberName">Member Name</label>
            <input id="memberName" name="memberName" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1" for="email">Email Address</label>
            <input id="email" name="email" type="email" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required />
          </div>

          <div id="studentFields" class="hidden">
            <label class="block text-xs font-semibold text-gray-700 mb-1" for="studentId">Student ID Picture (required for student)</label>
            <input id="studentId" name="studentId" type="file" accept="image/*" class="w-full text-sm" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1" for="profile">Profile Picture (required)</label>
            <input id="profile" name="profile" type="file" accept="image/*" class="w-full text-sm" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1" for="startDate">Start Date</label>
              <input id="startDate" name="startDate" type="date" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value="${today}" readonly />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1" for="endDate">End Date</label>
              <input id="endDate" name="endDate" type="date" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value="${endDate}" readonly />
            </div>
          </div>
        </div>
      </form>
    `;

  const modalHTML = `
      <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300 z-50 hidden" id="monthlyPassRegistrationModal">
        <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
          <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-orange-500 to-orange-800 p-4 text-center text-white">
            <p class="text-xl font-medium">📝 Registration Form</p>
          </div>
          <div class="p-6">
            ${formHtml}
            <p class="inline-validation-msg mt-2 text-xs text-red-600"></p>
          </div>
          <div class="flex gap-3 p-6">
            <button type="button" id="mpRegCancel" class="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500">Cancel</button>
            <button type="button" id="mpRegSubmit" class="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600">Continue to Payment</button>
          </div>
        </div>
      </div>
    `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('monthlyPassRegistrationModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 10);

  const close = () => {
    modal.classList.remove('opacity-100');
    modal.children[0].classList.add('-translate-y-6');
    modal.children[0].classList.remove('scale-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.remove();
    }, 300);
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  document.getElementById('mpRegCancel').addEventListener('click', close);

  const form = /** @type {HTMLFormElement|null} */ (document.getElementById('membershipForm'));
  const studentFields = /** @type {HTMLDivElement|null} */ (document.getElementById('studentFields'));
  if (form && studentFields) {
    const typeInputs = form.querySelectorAll('input[name="membershipType"]');
    const updateVariant = () => {
      const type = getSelectedMembershipType();
      if (type === 'student') studentFields.classList.remove('hidden');
      else studentFields.classList.add('hidden');
    };
    typeInputs.forEach((i) => i.addEventListener('change', updateVariant));
    updateVariant();
  }

  document.getElementById('mpRegSubmit').addEventListener('click', () => {
    const msg = /** @type {HTMLParagraphElement|null} */ (modal.querySelector('.inline-validation-msg'));
    if (!form || !msg) return;
    const membershipType = getSelectedMembershipType();
    const memberName = /** @type {HTMLInputElement} */ (form.querySelector('#memberName'))?.value?.trim();
    const email = /** @type {HTMLInputElement} */ (form.querySelector('#email'))?.value?.trim();
    const profile = /** @type {HTMLInputElement} */ (form.querySelector('#profile'))?.files?.[0] || null;
    const studentId = /** @type {HTMLInputElement} */ (form.querySelector('#studentId'))?.files?.[0] || null;
    const startDate = /** @type {HTMLInputElement} */ (form.querySelector('#startDate'))?.value;
    const endDate = /** @type {HTMLInputElement} */ (form.querySelector('#endDate'))?.value;

    if (!memberName) {
      msg.textContent = 'Please enter the Member Name.';
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = 'Please enter a valid Email Address.';
      return;
    }
    if (!profile) {
      msg.textContent = 'Profile Picture is required.';
      return;
    }
    if (membershipType === 'student' && !studentId) {
      msg.textContent = 'Student ID Picture is required for Student Membership.';
      return;
    }

    const prepared = prepareFormData({ membershipType, memberName, email, profile, studentId, startDate, endDate });
    console.log('[MonthlyPass] Prepared FormData for submission', debugFormData(prepared));
    close();
    openPaymentModal(prepared);
  });
}

function openPaymentModal(preparedRegistrationData) {
  const totalAmount = preparedRegistrationData.get('membershipType') === 'student' ? 850 : 950;
  const totalLabel = preparedRegistrationData.get('membershipType') === 'student' ? 'Total for Student: ₱850' : 'Total for Regular: ₱950';

  const modalHTML = `
      <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300 z-50 hidden" id="monthlyPassPaymentModal">
        <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
          <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-orange-500 to-orange-800 p-4 text-center text-white">
            <p class="text-xl font-medium">💳 Payment Details (GCash)</p>
          </div>
          <div class="p-6 text-left text-sm text-gray-800 space-y-3">
            <p class="font-semibold">${totalLabel}</p>
            <p>Scan QR Code below via GCash</p>
            <div class="flex items-center justify-center">
              <img src="/src/images/qr.jpg" alt="GCash QR Code" class="max-h-56 rounded-md border" />
            </div>
            <div class="space-y-1">
              <p class="font-semibold">Account Details:</p>
              <p>Name: Enzo Daniela</p>
              <p>Number: 09633226873</p>
            </div>
            <form id="paymentForm" class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="gcashRef">GCash Reference Number</label>
                <input id="gcashRef" name="gcashRef" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="gcashName">Account Name</label>
                <input id="gcashName" name="gcashName" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="gcashAmount">Amount Paid</label>
                <input id="gcashAmount" name="gcashAmount" type="text" inputmode="decimal" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="${totalAmount}" value="${totalAmount}" required />
              </div>
              <p class="text-xs text-gray-600">Please ensure all details are correct before submitting. Payment verification may take a few minutes.</p>
              <p class="inline-validation-msg mt-2 text-xs text-red-600"></p>
            </form>
          </div>
          <div class="flex gap-3 p-6">
            <button type="button" id="mpPayCancel" class="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500">Cancel</button>
            <button type="button" id="mpPaySubmit" class="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600">Submit Payment</button>
          </div>
        </div>
      </div>
    `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('monthlyPassPaymentModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 10);

  const close = () => {
    modal.classList.remove('opacity-100');
    modal.children[0].classList.add('-translate-y-6');
    modal.children[0].classList.remove('scale-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.remove();
    }, 300);
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  document.getElementById('mpPayCancel').addEventListener('click', close);
  document.getElementById('mpPaySubmit').addEventListener('click', () => {
    const form = /** @type {HTMLFormElement|null} */ (document.getElementById('paymentForm'));
    const msg = /** @type {HTMLParagraphElement|null} */ (modal.querySelector('.inline-validation-msg'));
    if (!form || !msg) return;
    const gcashRef = /** @type {HTMLInputElement} */ (form.querySelector('#gcashRef'))?.value?.trim();
    const gcashName = /** @type {HTMLInputElement} */ (form.querySelector('#gcashName'))?.value?.trim();
    const gcashAmountRaw = /** @type {HTMLInputElement} */ (form.querySelector('#gcashAmount'))?.value?.trim();

    if (!gcashRef || !gcashName || !gcashAmountRaw) {
      msg.textContent = 'Please fill in all payment details.';
      return;
    }

    const normalizeAmount = (val) => {
      const cleaned = String(val).replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      const normalized = parts.length > 1 ? parts[0] + '.' + parts[1] : parts[0];
      const num = Number(normalized);
      return Number.isFinite(num) ? num : NaN;
    };

    const gcashAmountNum = normalizeAmount(gcashAmountRaw);
    if (!Number.isFinite(gcashAmountNum)) {
      msg.textContent = 'Please enter a valid amount (numbers only).';
      return;
    }
    if (Math.abs(gcashAmountNum - totalAmount) > 0.009) {
      msg.textContent = `Amount must be exactly ₱${totalAmount}.`;
      return;
    }

    const paymentData = preparePaymentFormData({
      gcashRef,
      gcashName,
      gcashAmount: String(totalAmount),
      totalAmount,
    });
    console.log('[MonthlyPass] Prepared Payment FormData', debugFormData(paymentData));

    // Example merging for future submission
    const unified = new FormData();
    preparedRegistrationData.forEach((v, k) => unified.set('reg_' + k, v));
    paymentData.forEach((v, k) => unified.set('pay_' + k, v));
    console.log('[MonthlyPass] Unified FormData ready for API', debugFormData(unified));

    close();
    openConfirmationModal(preparedRegistrationData.get('membershipType'));
  });
}

function preparePaymentFormData(payload) {
  const data = new FormData();
  data.set('gcashRef', payload.gcashRef);
  data.set('gcashName', payload.gcashName);
  data.set('gcashAmount', payload.gcashAmount);
  data.set('totalExpected', String(payload.totalAmount));
  return data;
}

function openConfirmationModal(membershipType) {
  const isStudent = String(membershipType) === 'student';
  const message = isStudent
    ? 'We have sent a notification to the email you provided. You will receive verification once your payment is confirmed, and for student discounts, once your student ID is verified.'
    : 'We have sent a notification to the email you provided. You will receive verification once your payment is confirmed.';
  const modalHTML = `
      <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300 z-50 hidden" id="monthlyPassConfirmationModal">
        <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
          <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-orange-500 to-orange-800 p-4 text-center text-white">
            <p class="text-xl font-medium">✅ Confirmation</p>
          </div>
          <div class="p-6 text-left text-sm text-gray-800">
            ${message}
          </div>
          <div class="flex gap-3 p-6">
            <button type="button" id="mpConfOk" class="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600">OK</button>
          </div>
        </div>
      </div>
    `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('monthlyPassConfirmationModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 10);

  const close = () => {
    modal.classList.remove('opacity-100');
    modal.children[0].classList.add('-translate-y-6');
    modal.children[0].classList.remove('scale-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.remove();
    }, 300);
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  document.getElementById('mpConfOk').addEventListener('click', close);
}

function showInlineValidation(parent, message) {
  let el = parent.querySelector('.inline-validation-msg');
  if (!el) {
    el = document.createElement('p');
    el.className = 'inline-validation-msg mt-2 text-xs text-red-600';
    parent.appendChild(el);
  }
  el.textContent = message;
}

/**
 * @param {{membershipType: 'regular'|'student', memberName: string, email: string, profile: File, studentId: File|null, startDate: string, endDate: string}} payload
 */
function prepareFormData(payload) {
  const data = new FormData();
  data.set('membershipType', payload.membershipType);
  data.set('memberName', payload.memberName);
  data.set('email', payload.email);
  data.set('startDate', payload.startDate);
  data.set('endDate', payload.endDate);
  data.set('profile', payload.profile);
  if (payload.studentId) data.set('studentId', payload.studentId);
  return data;
}

// Placeholder for future backend integration
// async function submitRegistration(formData) {
//   const response = await fetch('/api/membership/register', { method: 'POST', body: formData });
//   if (!response.ok) throw new Error('Registration failed');
//   return await response.json();
// }

function getSelectedMembershipType() {
  const selected = /** @type {HTMLInputElement|null} */ (
    document.querySelector('input[name="membershipType"]:checked')
  );
  return selected?.value === 'student' ? 'student' : 'regular';
}

function addMonths(date, months) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function debugFormData(fd) {
  const out = {};
  fd.forEach((v, k) => {
    out[k] = v instanceof File ? { name: v.name, size: v.size, type: v.type } : v;
  });
  return out;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}