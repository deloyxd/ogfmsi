import main from '../admin_main.js';
import { API_BASE_URL } from '../_global.js';

const SECTION_NAME = 'maintenance-accesscontrol';

let activated = false,
  mainBtn;

document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName != SECTION_NAME) return;

  if (!activated) {
    activated = true;
    mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
    mainBtn.addEventListener('click', mainBtnFunction);

    fetchAllSystemUsers();
  }
});

function fetchAllSystemUsers() {
  main.deleteAllAtSectionOne(SECTION_NAME, 1, async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/admin/users`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      const systemUsers = data.result;
      systemUsers.forEach((systemUser) => {
        const columnsData = [
          'id_' + systemUser.admin_id,
          {
            type: 'object_username',
            data: [systemUser.admin_image_url, systemUser.admin_full_name, systemUser.admin_username],
          },
          main.fixText(systemUser.admin_role),
        ];
        main.createAtSectionOne(SECTION_NAME, columnsData, 1, async (createResult) => {
          // Add event listeners for Update and Delete buttons
          const btns = createResult.children[createResult.children.length - 1].children[0];
          const updateBtn = btns.querySelector('#userUpdateBtn');
          const deleteBtn = btns.querySelector('#userDeleteBtn');

          if (updateBtn) {
            updateBtn.addEventListener('click', () => handleUpdateUser(systemUser));
          }

          if (deleteBtn) {
            deleteBtn.addEventListener('click', () => handleDeleteUser(systemUser));
          }
        });
      });
      if (main.sharedState.sectionName === SECTION_NAME) main.toast('Successfully loaded accounts!', 'success');
    } catch (_) {}
  });
}

const USER_ROLES = [
  {
    value: 'admin',
    label: 'Administrative',
  },
  {
    value: 'staff',
    label: 'Staff (Front Desk/Cashier/Maintenance)',
  },
];

function mainBtnFunction() {
  const inputs = {
    header: {
      title: `Create System User ${getEmoji('🔧', 26)}`,
      subtitle: 'System User Form',
    },
    image: {
      src: '/src/images/client_logo.jpg',
      type: 'normal',
      short: [
        {
          placeholder: 'Full Name',
          value: '',
          required: true,
        },
        {
          placeholder: 'Username',
          value: '',
          required: true,
        },
        {
          placeholder: 'Password',
          value: '',
          required: true,
        },
      ],
    },
    spinner: [
      {
        label: 'User Role',
        placeholder: 'Select user role',
        selected: 0,
        required: true,
        options: USER_ROLES,
      },
    ],
    footer: {
      main: 'Create System User',
    },
  };

  main.openModal(mainBtn, inputs, async (result) => {
    main.closeModal(async () => {
      const fullName = result.image.short[0].value;
      const username = result.image.short[1].value;
      const password = result.image.short[2].value;
      const role = main.getSelectedSpinner(result.spinner[0]);

      if (!fullName || !username || !password || !role) {
        main.toast('Please fill all required fields', 'error');
        return;
      }

      try {
        main.sharedState.moduleLoad = SECTION_NAME;
        window.showGlobalLoading?.();

        // Generate a unique ID for the new user
        const adminId = 'A' + Date.now() + Math.floor(Math.random() * 1000);

        const resp = await fetch(`${API_BASE_URL}/admin/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_id: adminId,
            admin_image_url: result.image.src,
            admin_full_name: fullName,
            admin_username: username,
            admin_role: role,
            admin_password: password,
          }),
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);

        main.toast('Admin user created successfully!', 'success');

        // Refresh the entire user list to show the new user
        fetchAllSystemUsers();
      } catch (e) {
        console.error('Create admin error:', e);
        main.toast(String(e.message || e), 'error');
      } finally {
        window.hideGlobalLoading?.();
      }
    });
  });
}

export function log(action, data) {
  // Only attempt to render log rows when the Maintenance Access Control section is active.
  // This avoids errors when other modules (e.g., Dashboard) call log() while the
  // section's DOM is not mounted yet.
  if (main.sharedState.sectionName !== SECTION_NAME) {
    // Optionally: queue logs for later rendering if needed.
    // For now, safely no-op to prevent runtime errors.
    return;
  }

  const columnsData = [
    'id_U288343611137',
    {
      type: 'object_role',
      data: ['', 'Jestley', 'Admin'],
    },
    action.module + (action.submodule ? ': ' + action.submodule : ''),
    action.description,
    'custom_datetime_today',
  ];
  main.createAtSectionOne(SECTION_NAME, columnsData, 4, (editedResult) => {
    const btns = editedResult.children[editedResult.children.length - 1].children[0];
    const actionDetailsBtn = btns.querySelector('#actionDetailsBtn');
    actionDetailsBtn.addEventListener('click', () => main.openModal('gray', getInputs(data), main.closeModal));

    main.createNotifDot(SECTION_NAME, 'sub');
    main.createNotifDot(SECTION_NAME, 4);
  });
}

export default { log };

function handleUpdateUser(systemUser) {
  const inputs = {
    header: {
      title: `Update System User ${getEmoji('🔧', 26)}`,
      subtitle: 'Edit User Information',
    },
    image: {
      src: systemUser.admin_image_url,
      type: 'normal',
      short: [
        {
          placeholder: 'Full Name',
          value: systemUser.admin_full_name,
          required: true,
        },
        {
          placeholder: 'Username',
          value: systemUser.admin_username,
          required: true,
        },
        {
          placeholder: 'Password (leave blank to keep current)',
          value: '',
          required: false,
        },
      ],
    },
    spinner: [
      {
        label: 'User Role',
        placeholder: 'Select user role',
        selected: USER_ROLES.findIndex((role) => role.value === systemUser.admin_role) + 1,
        required: true,
        options: USER_ROLES,
      },
    ],
    footer: {
      main: 'Update System User',
    },
  };

  main.openModal(mainBtn, inputs, (result) => {
    main.closeModal(() => {
      const fullName = result.image.short[0].value;
      const username = result.image.short[1].value;
      const password = result.image.short[2].value;
      const role = main.getSelectedSpinner(result.spinner[0]);

      if (!fullName || !username || !role) {
        main.toast('Please fill all required fields', 'error');
        return;
      }

      try {
        main.sharedState.moduleLoad = SECTION_NAME;
        window.showGlobalLoading?.();

        const updateData = {
          admin_id: systemUser.admin_id,
          admin_image_url: result.image.src,
          admin_full_name: fullName,
          admin_username: username,
          admin_role: role,
        };

        // Only include password if provided
        if (password && password.trim() !== '') {
          updateData.admin_password = password;
        }

        fetch(`${API_BASE_URL}/admin/users/${systemUser.admin_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })
          .then((resp) => resp.json())
          .then((data) => {
            if (!data.error) {
              main.toast('User updated successfully!', 'success');
              fetchAllSystemUsers(); // Refresh the list
            } else {
              throw new Error(data.error);
            }
          })
          .catch((err) => {
            console.error('Update user error:', err);
            main.toast(String(err.message || err), 'error');
          })
          .finally(() => {
            window.hideGlobalLoading?.();
          });
      } catch (e) {
        console.error('Update user error:', e);
        main.toast(String(e.message || e), 'error');
        window.hideGlobalLoading?.();
      }
    });
  });
}

function handleDeleteUser(systemUser) {
  const inputs = {
    header: {
      title: `Delete System User ${getEmoji('🔧', 26)}`,
      subtitle: 'Confirm User Deletion',
    },
    image: {
      src: systemUser.admin_image_url,
      type: 'normal',
      locked: true,
      short: [
        { placeholder: 'Full Name', value: systemUser.admin_full_name, locked: true },
        { placeholder: 'Username', value: systemUser.admin_username, locked: true },
        { placeholder: 'Role', value: systemUser.admin_role, locked: true },
      ],
    },
    short: [
      {
        placeholder: 'Warning',
        value: 'This action cannot be undone. The user will be permanently deleted.',
        locked: true,
      },
    ],
    footer: {
      main: 'Confirm Delete',
      sub: 'Cancel',
    },
  };

  main.openModal(mainBtn, inputs, (result) => {
    if (result.footer.main) {
      main.closeModal(() => {
        try {
          main.sharedState.moduleLoad = SECTION_NAME;
          window.showGlobalLoading?.();

          fetch(`${API_BASE_URL}/admin/users/${systemUser.admin_id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          })
            .then((resp) => resp.json())
            .then((data) => {
              if (!data.error) {
                main.toast('User deleted successfully!', 'success');
                fetchAllSystemUsers(); // Refresh the list
              } else {
                throw new Error(data.error);
              }
            })
            .catch((err) => {
              console.error('Delete user error:', err);
              main.toast(String(err.message || err), 'error');
            })
            .finally(() => {
              window.hideGlobalLoading?.();
            });
        } catch (e) {
          console.error('Delete user error:', e);
          main.toast(String(e.message || e), 'error');
          window.hideGlobalLoading?.();
        }
      });
    } else {
      main.closeModal();
    }
  });
}

function getInputs(actionData) {
  if (actionData.type.includes('user')) {
    const userFirstName = actionData.name.split(':://')[0];
    const userLastName = actionData.name.split(':://')[1];
    const inputs = {
      header: {
        title: `View Action Details ${getEmoji('🔧', 26)}`,
        subtitle: 'User ID: ' + actionData.id,
      },
      image: {
        src: actionData.image,
        type: 'normal',
        locked: true,
        short: [
          { placeholder: 'First name', value: userFirstName, locked: true },
          { placeholder: 'Last name', value: userLastName, locked: true },
          { placeholder: 'Email / contact', value: actionData.contact, locked: true },
        ],
      },
      footer: {
        main: 'Exit view',
      },
    };
    if (actionData.type.includes('transaction'))
      inputs.short = [
        {
          placeholder: 'Amount paid',
          value: actionData.amount ? actionData.amount : 'Not yet paid',
          locked: true,
        },
      ];
    return inputs;
  }

  if (actionData.type.includes('transaction')) {
    const inputs = {
      header: {
        title: `View Action Details ${getEmoji('🔧', 26)}`,
        subtitle: 'Transaction ID: ' + actionData.id,
      },
      short: [
        { placeholder: 'User ID', value: actionData.user_id, locked: true },
        { placeholder: 'Payment type', value: actionData.payment_type, locked: true },
        { placeholder: 'Payment amount', value: main.encodePrice(actionData.payment_amount), locked: true },
        { placeholder: 'Payment reference number', value: actionData.payment_refnum, locked: true },
        { placeholder: 'Payment rate', value: actionData.payment_rate, locked: true },
        { placeholder: 'Payment purpose', value: actionData.purpose, locked: true },
      ],
      footer: {
        main: 'Exit view',
      },
    };
    return inputs;
  }

  if (actionData.type.includes('product')) {
    const inputs = {
      header: {
        title: `View Action Details ${getEmoji('🔧', 26)}`,
        subtitle: 'Product ID: ' + actionData.id,
      },
      image: {
        src: actionData.image,
        type: 'normal',
        locked: true,
        short: [
          { placeholder: 'Product name', value: actionData.name, locked: true },
          { placeholder: 'Price', value: actionData.price, locked: true },
        ],
      },
      short: [
        {
          placeholder: 'Measurement',
          value: actionData.measurement != '' ? actionData.measurement : 'N/A',
          locked: true,
        },
        {
          placeholder: 'Measurement unit',
          value: actionData.measurementUnit != '' ? actionData.measurementUnit : 'N/A',
          locked: true,
        },
        { placeholder: 'Product category ID', value: actionData.category, locked: true },
      ],
      footer: {
        main: 'Exit view',
      },
    };

    if (!actionData.type.includes('delete')) {
      inputs.image.short.push({ placeholder: 'Quantity', value: actionData.quantity, locked: true });
    }

    return inputs;
  }
}
