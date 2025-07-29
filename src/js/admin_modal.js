async function loadModal() {
  const response = await fetch('admin_modal.html');
  const html = await response.text();
  document.getElementById('admin_modal').innerHTML = html;
}

loadModal();
