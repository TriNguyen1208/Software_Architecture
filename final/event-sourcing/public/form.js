const form = document.querySelector('#customer-form');
const message = document.querySelector('#message');
const submitButton = form.querySelector('button');
const editId = new URLSearchParams(window.location.search).get('edit');
const pageTitle = document.querySelector('#page-title');
const pageSubtitle = document.querySelector('#page-subtitle');
const cancelEdit = document.querySelector('#cancel-edit');
const eventHistory = document.querySelector('#event-history');
const eventList = document.querySelector('#event-list');

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[char]));
}

async function showEventHistory() {
  const response = await fetch(`/api/customers/${editId}/events`);
  const events = await response.json();
  if (!response.ok) throw new Error(events.message || 'Không thể tải lịch sử event.');
  eventHistory.classList.remove('hidden');
  eventList.innerHTML = events.map((event, index) => `<article class="event-item ${index === 0 ? 'latest-event' : ''}"><div><strong>${escapeHtml(event.eventName)}</strong>${index === 0 ? '<span class="latest-label">Mới nhất — đang được áp dụng</span>' : ''}<p>${escapeHtml(event.createdAt)}</p></div><code>${escapeHtml(JSON.stringify(event.eventData))}</code></article>`).join('');
}

async function prepareEdit() {
  if (!editId) return;
  pageTitle.textContent = 'Chỉnh sửa khách hàng';
  pageSubtitle.textContent = 'Cập nhật thông tin và lưu thay đổi vào MongoDB.';
  submitButton.textContent = 'Cập nhật khách hàng';
  cancelEdit.classList.remove('hidden');
  try {
    const response = await fetch(`/api/customers/${editId}`);
    const customer = await response.json();
    if (!response.ok) throw new Error(customer.message || 'Không tìm thấy khách hàng cần sửa.');
    Object.entries(customer).forEach(([key, value]) => {
      if (form.elements[key]) form.elements[key].value = value;
    });
    await showEventHistory();
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('error');
    submitButton.disabled = true;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  message.className = 'message';
  submitButton.disabled = true;
  submitButton.textContent = 'Đang lưu...';
  const values = Object.fromEntries(new FormData(form));
  values.balance = Number(values.balance);
  try {
    const response = await fetch(editId ? `/api/customers/${editId}` : '/api/customers', { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Không thể lưu thông tin.');
    if (editId) {
      message.textContent = `Đã cập nhật khách hàng ${result.firstName} ${result.lastName}.`;
      setTimeout(() => { window.location.href = '/customers.html'; }, 700);
    } else {
      form.reset();
      message.textContent = `Đã lưu khách hàng ${result.firstName} ${result.lastName}.`;
    }
    message.classList.add('success');
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = editId ? 'Cập nhật khách hàng' : 'Lưu khách hàng';
  }
});

prepareEdit();
