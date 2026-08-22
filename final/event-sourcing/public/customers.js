const content = document.querySelector('#content');
const count = document.querySelector('#count');
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[char]));
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 });

async function loadCustomers() {
  try {
    const response = await fetch('/api/customers');
    if (!response.ok) throw new Error();
    const customers = await response.json();
    count.textContent = `${customers.length} khách hàng`;
    if (!customers.length) { content.innerHTML = '<div class="empty"><p>Chưa có khách hàng nào.</p><a class="text-link" href="/">Thêm khách hàng đầu tiên →</a></div>'; return; }
    content.innerHTML = `<table><thead><tr><th>Khách hàng</th><th>ID</th><th>Ngày sinh</th><th>Số dư</th><th></th></tr></thead><tbody>${customers.map((customer) => `<tr><td class="customer-name">${escapeHtml(customer.firstName)} ${escapeHtml(customer.lastName)}</td><td><span class="id-tag">${escapeHtml(customer.customerId)}</span></td><td>${new Date(`${customer.dateOfBirth}T00:00:00`).toLocaleDateString('vi-VN')}</td><td class="balance">${money.format(customer.balance)}</td><td class="row-actions"><a class="edit-link" href="/?edit=${encodeURIComponent(customer.id)}">Sửa</a><button class="delete-button" type="button" data-id="${escapeHtml(customer.id)}" data-name="${escapeHtml(customer.firstName)} ${escapeHtml(customer.lastName)}">Xóa</button></td></tr>`).join('')}</tbody></table>`;
  } catch { count.textContent = 'Không thể tải'; content.innerHTML = '<div class="empty"><p>Không thể tải dữ liệu. Hãy thử tải lại trang.</p></div>'; }
}
loadCustomers();

content.addEventListener('click', async (event) => {
  const deleteButton = event.target.closest('.delete-button');
  if (!deleteButton) return;
  const { id, name } = deleteButton.dataset;
  if (!window.confirm(`Bạn có chắc muốn xóa khách hàng ${name}?`)) return;
  deleteButton.disabled = true;
  deleteButton.textContent = 'Đang xóa...';
  try {
    const response = await fetch(`/api/customers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Không thể xóa khách hàng.');
    await loadCustomers();
  } catch (error) {
    window.alert(error.message);
    deleteButton.disabled = false;
    deleteButton.textContent = 'Xóa';
  }
});
