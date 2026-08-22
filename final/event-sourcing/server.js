const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATABASE_FILE = process.env.DATABASE_FILE || path.join(__dirname, 'data', 'customer-events.db');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8'
};

const db = new DatabaseSync(DATABASE_FILE);
const requiredColumns = ['event_id', 'event_type', 'event_name', 'event_data', 'created_at'];
const existingColumns = db.prepare('PRAGMA table_info(customer_events)').all().map((column) => column.name);

// Tự chuyển dữ liệu từ schema cũ (nếu có) sang schema Event Store mới.
if (existingColumns.length && !requiredColumns.every((column) => existingColumns.includes(column))) {
  db.exec(`
    BEGIN;
    ALTER TABLE customer_events RENAME TO customer_events_legacy;
    CREATE TABLE customer_events (
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_name TEXT NOT NULL,
      event_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO customer_events (event_id, event_type, event_name, event_data, created_at)
    SELECT customer_id, 'Customer', event_type, payload, occurred_at
    FROM customer_events_legacy;
    DROP TABLE customer_events_legacy;
    COMMIT;
  `);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_events (
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_name TEXT NOT NULL,
    event_data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_customer_events_event_id_created_at
    ON customer_events (event_id, created_at);
  CREATE TABLE IF NOT EXISTS customers (
    event_id TEXT PRIMARY KEY,
    snapshot_data TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_event_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_customers_status_updated_at
    ON customers (status, updated_at DESC);
`);

const insertEvent = db.prepare(`
  INSERT INTO customer_events (event_id, event_type, event_name, event_data, created_at)
  VALUES (?, ?, ?, ?, ?)
`);
const eventsForCustomer = db.prepare(`
  SELECT rowid, event_id, event_type, event_name, event_data, created_at
  FROM customer_events WHERE event_id = ? ORDER BY created_at ASC, rowid ASC
`);
const allEvents = db.prepare(`
  SELECT rowid, event_id, event_type, event_name, event_data, created_at
  FROM customer_events ORDER BY created_at ASC, rowid ASC
`);
const upsertCustomerSnapshot = db.prepare(`
  INSERT INTO customers (event_id, snapshot_data, status, created_at, updated_at, last_event_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(event_id) DO UPDATE SET
    snapshot_data = excluded.snapshot_data,
    status = excluded.status,
    updated_at = excluded.updated_at,
    last_event_at = excluded.last_event_at
`);
const activeCustomerSnapshots = db.prepare(`
  SELECT event_id, snapshot_data FROM customers
  WHERE status = 'active' ORDER BY created_at DESC
`);
const customerSnapshot = db.prepare(`
  SELECT event_id, snapshot_data FROM customers WHERE event_id = ?
`);

function stateFromEvents(events) {
  let customer = {};
  let isCreated = false;
  for (const event of events) {
    const payload = JSON.parse(event.event_data);
    if (event.event_name === 'CustomerCreated') {
      customer = { id: event.event_id, ...payload, status: 'active', createdAt: event.created_at, updatedAt: event.created_at };
      isCreated = true;
    }
    if (event.event_name === 'CustomerUpdated' && isCreated) customer = { ...customer, ...payload, updatedAt: event.created_at };
    if (event.event_name === 'CustomerDeleted' && isCreated) {
      customer = { ...customer, status: 'deleted', updatedAt: event.created_at };
      break;
    }
  }
  return isCreated ? customer : null;
}

function compactCustomer(eventId) {
  const events = eventsForCustomer.all(eventId);
  const customer = stateFromEvents(events);
  if (!customer || !events.length) return null;
  const lastEvent = events.at(-1);
  upsertCustomerSnapshot.run(
    customer.id,
    JSON.stringify(customer),
    customer.status,
    customer.createdAt,
    customer.updatedAt,
    lastEvent.created_at
  );
  return customer;
}

function getCustomers() {
  return activeCustomerSnapshots.all().map((row) => JSON.parse(row.snapshot_data));
}

function getCustomer(id) {
  return stateFromEvents(eventsForCustomer.all(id));
}

function getCustomerSnapshot(id) {
  const row = customerSnapshot.get(id);
  return row ? JSON.parse(row.snapshot_data) : null;
}

function getEventHistory(id) {
  return eventsForCustomer.all(id)
    .map((event) => ({
      eventId: event.event_id,
      eventType: event.event_type,
      eventName: event.event_name,
      eventData: JSON.parse(event.event_data),
      createdAt: event.created_at
    }))
    .reverse();
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function validCustomer(input) {
  const customer = {
    firstName: String(input.firstName || '').trim(),
    lastName: String(input.lastName || '').trim(),
    customerId: String(input.customerId || '').trim(),
    dateOfBirth: String(input.dateOfBirth || '').trim(),
    balance: Number(input.balance)
  };
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(customer.dateOfBirth)
    && !Number.isNaN(new Date(`${customer.dateOfBirth}T00:00:00`).getTime());
  return customer.firstName && customer.lastName && customer.customerId && validDate && Number.isFinite(customer.balance) && customer.balance >= 0
    ? customer : null;
}

async function readRequestBody(req, res) {
  let rawBody = '';
  for await (const chunk of req) rawBody += chunk;
  try { return JSON.parse(rawBody); } catch {
    sendJson(res, 400, { message: 'Dữ liệu gửi lên không hợp lệ.' });
    return null;
  }
}

function isDuplicateCustomerCode(customerId, excludedId = null) {
  return getCustomers().some((customer) => customer.customerId.toLowerCase() === customerId.toLowerCase() && customer.id !== excludedId);
}

function appendEvent(customerId, eventType, payload) {
  const occurredAt = new Date().toISOString();
  insertEvent.run(customerId, 'Customer', eventType, JSON.stringify(payload), occurredAt);
  pendingCustomerIds.add(customerId);
  return occurredAt;
}

// Background worker: gộp nhiều event thành một snapshot trong bảng customers.
const pendingCustomerIds = new Set();
function processPendingCustomers() {
  for (const eventId of pendingCustomerIds) {
    compactCustomer(eventId);
    pendingCustomerIds.delete(eventId);
  }
}

for (const row of allEvents.all()) pendingCustomerIds.add(row.event_id);
processPendingCustomers(); // dựng snapshot khi app vừa khởi động
setInterval(processPendingCustomers, 1000).unref();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/customers' && req.method === 'GET') return sendJson(res, 200, getCustomers());

    const customerIdMatch = url.pathname.match(/^\/api\/customers\/([\w-]{36})$/);
    const customerEventsMatch = url.pathname.match(/^\/api\/customers\/([\w-]{36})\/events$/);
    if (customerEventsMatch && req.method === 'GET') {
      const events = getEventHistory(customerEventsMatch[1]);
      if (!events.length) return sendJson(res, 404, { message: 'Không tìm thấy lịch sử khách hàng.' });
      return sendJson(res, 200, events);
    }

    if (customerIdMatch && req.method === 'GET') {
      const customer = getCustomerSnapshot(customerIdMatch[1]);
      if (!customer || customer.status === 'deleted') return sendJson(res, 404, { message: 'Không tìm thấy khách hàng.' });
      return sendJson(res, 200, customer);
    }

    if (url.pathname === '/api/customers' && req.method === 'POST') {
      const input = await readRequestBody(req, res);
      if (!input) return;
      const customer = validCustomer(input);
      if (!customer) return sendJson(res, 400, { message: 'Vui lòng nhập đầy đủ thông tin hợp lệ. Số dư phải từ 0 trở lên.' });
      if (isDuplicateCustomerCode(customer.customerId)) return sendJson(res, 409, { message: 'ID khách hàng đã tồn tại.' });

      const id = randomUUID();
      const createdAt = appendEvent(id, 'CustomerCreated', customer);
      processPendingCustomers();
      return sendJson(res, 201, { id, ...customer, createdAt });
    }

    if (customerIdMatch && req.method === 'PUT') {
      const input = await readRequestBody(req, res);
      if (!input) return;
      const customer = validCustomer(input);
      if (!customer) return sendJson(res, 400, { message: 'Vui lòng nhập đầy đủ thông tin hợp lệ. Số dư phải từ 0 trở lên.' });
      const id = customerIdMatch[1];
      const previousCustomer = getCustomer(id);
      if (!previousCustomer || previousCustomer.status === 'deleted') return sendJson(res, 404, { message: 'Không tìm thấy khách hàng.' });
      if (isDuplicateCustomerCode(customer.customerId, id)) return sendJson(res, 409, { message: 'ID khách hàng đã tồn tại.' });

      const updatedAt = appendEvent(id, 'CustomerUpdated', customer);
      processPendingCustomers();
      return sendJson(res, 200, { ...previousCustomer, ...customer, updatedAt });
    }

    if (customerIdMatch && req.method === 'DELETE') {
      const id = customerIdMatch[1];
      const customer = getCustomer(id);
      if (!customer || customer.status === 'deleted') return sendJson(res, 404, { message: 'Không tìm thấy khách hàng.' });

      const deletedAt = appendEvent(id, 'CustomerDeleted', { reason: 'Deleted from customer list' });
      processPendingCustomers();
      return sendJson(res, 200, { message: `Đã xoá khách hàng ${customer.firstName} ${customer.lastName}.`, deletedAt });
    }

    if (req.method !== 'GET') return sendJson(res, 405, { message: 'Method not allowed' });
    const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const filePath = path.resolve(PUBLIC_DIR, requested);
    if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return sendJson(res, 403, { message: 'Forbidden' });
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') return sendJson(res, 404, { message: 'Không tìm thấy trang yêu cầu.' });
    console.error(error);
    sendJson(res, 500, { message: 'Đã có lỗi xảy ra trên máy chủ.' });
  }
});

server.listen(PORT, () => console.log(`Ứng dụng Event Sourcing đang chạy tại http://localhost:${PORT}`));
