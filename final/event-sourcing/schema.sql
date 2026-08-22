CREATE TABLE customer_events (
  event_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(50) NOT NULL,
  event_data JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_events_event_id_created_at
  ON customer_events (event_id, created_at);

-- Snapshot/read model: background worker gộp chuỗi event thành 1 bản ghi customer.
CREATE TABLE customers (
  event_id VARCHAR(36) PRIMARY KEY,
  snapshot_data JSON NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  last_event_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_customers_status_updated_at
  ON customers (status, updated_at DESC);
