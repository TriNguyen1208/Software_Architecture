const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const { EventStoreDBClient, jsonEvent, FORWARDS, START } = require('@eventstore/db-client');
const amqp = require('amqplib');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

let db; // SQLite database for Read Model
let esdb; // EventStoreDB client for Write Model
let amqpChannel; // RabbitMQ channel
const RABBITMQ_EXCHANGE = 'customers_exchange';
const RABBITMQ_QUEUE = 'customers_read_model_queue';

// Initialize connections and Read Model database
const initServices = async () => {
  // 1. Initialize SQLite (Read Model)
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = await open({
    filename: path.join(dataDir, 'database_read.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS customers_read (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      fullname TEXT NOT NULL,
      lastname TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      balance REAL NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Initialize EventStoreDB (KurrentDB)
  const esdbConnectionString = process.env.EVENTSTORE_CONNECTION_STRING || 'esdb://localhost:2113?tls=false';
  esdb = EventStoreDBClient.connectionString(esdbConnectionString);
  console.log('Connected to EventStoreDB');

  // 3. Initialize RabbitMQ
  const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  try {
    const connection = await amqp.connect(rabbitUrl);
    amqpChannel = await connection.createChannel();
    
    // Set up Exchange and Queue
    await amqpChannel.assertExchange(RABBITMQ_EXCHANGE, 'fanout', { durable: true });
    await amqpChannel.assertQueue(RABBITMQ_QUEUE, { durable: true });
    await amqpChannel.bindQueue(RABBITMQ_QUEUE, RABBITMQ_EXCHANGE, '');
    
    console.log('Connected to RabbitMQ');

    // 4. Start Consumer for Read Model updates
    amqpChannel.consume(RABBITMQ_QUEUE, async (msg) => {
      if (msg !== null) {
        try {
          const eventMessage = JSON.parse(msg.content.toString());
          await handleEventForReadModel(eventMessage);
          console.log(`[Worker] Đã nhận và cập nhật Read Model thành công sự kiện: ${eventMessage.eventType} (AggregateID: ${eventMessage.aggregateId})`);
          amqpChannel.ack(msg);
        } catch (err) {
          console.error('[Worker] Lỗi xử lý tin nhắn từ RabbitMQ:', err);
          // Nack message if there is an error to retry
          amqpChannel.nack(msg);
        }
      }
    });

  } catch (err) {
    console.error('Failed to connect to RabbitMQ. It might not be ready yet.', err);
    // In a real app, you'd add retry logic here.
  }
};

// Handler to update the SQLite Read Model based on events
const handleEventForReadModel = async (eventMessage) => {
  const { eventType, aggregateId, payload } = eventMessage;
  
  if (eventType === 'CustomerCreated') {
    await db.run(
      'INSERT INTO customers_read (id, customer_id, fullname, lastname, date_of_birth, balance) VALUES (?, ?, ?, ?, ?, ?)',
      [aggregateId, payload.customer_id, payload.fullname, payload.lastname, payload.date_of_birth, payload.balance]
    );
  } else if (eventType === 'CustomerUpdated') {
    // Dynamically build update query based on changes
    const changes = payload.changes;
    if (Object.keys(changes).length === 0) return;
    
    const setClauses = [];
    const values = [];
    for (const [key, val] of Object.entries(changes)) {
      setClauses.push(`${key} = ?`);
      values.push(val.new);
    }
    
    values.push(aggregateId);
    const query = `UPDATE customers_read SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await db.run(query, values);

  } else if (eventType === 'CustomerDeleted') {
    await db.run('DELETE FROM customers_read WHERE id = ?', [aggregateId]);
  }
};

// Helper to rebuild current customer state from EventStoreDB for validation/commands
const buildCustomerState = async (aggregateId) => {
  const streamName = `customer-${aggregateId}`;
  try {
    const events = await esdb.readStream(streamName, {
      fromRevision: START,
      direction: FORWARDS,
      maxCount: 1000
    });

    let state = null;
    for await (const resolvedEvent of events) {
      const { type, data } = resolvedEvent.event;
      if (type === 'CustomerCreated') {
        state = { id: aggregateId, ...data, date_of_birth: new Date(data.date_of_birth).toISOString().split('T')[0] };
      } else if (type === 'CustomerUpdated' && state) {
        const changes = data.changes;
        for (const [key, val] of Object.entries(changes)) {
          state[key] = val.new;
        }
      } else if (type === 'CustomerDeleted') {
        state = null;
      }
    }
    return state;
  } catch (err) {
    if (err.type === 'stream-not-found') {
      return null;
    }
    throw err;
  }
};

// Routes

// 1. Get all customers (CQRS: Read from SQLite Read Model, O(1) query)
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await db.all('SELECT * FROM customers_read ORDER BY updated_at DESC');
    res.json(customers);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 2. Add a new customer (CQRS: Write to EventStoreDB, publish to RabbitMQ)
app.post('/api/customers', async (req, res) => {
  try {
    const { customer_id, fullname, lastname, date_of_birth, balance } = req.body;
    
    if (!customer_id || !fullname || !lastname || !date_of_birth || balance === undefined) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const aggregateId = uuidv4();
    const streamName = `customer-${aggregateId}`;
    const payload = { customer_id, fullname, lastname, date_of_birth, balance };

    // Create event
    const event = jsonEvent({
      type: 'CustomerCreated',
      data: payload,
    });

    // Append to EventStoreDB
    await esdb.appendToStream(streamName, [event]);

    // Publish to RabbitMQ
    if (amqpChannel) {
      const message = JSON.stringify({
        eventId: event.id,
        eventType: 'CustomerCreated',
        aggregateId,
        payload
      });
      amqpChannel.publish(RABBITMQ_EXCHANGE, '', Buffer.from(message));
    }

    res.status(201).json({ id: aggregateId, ...payload });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 3. Update a customer
app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, fullname, lastname, date_of_birth, balance } = req.body;
    
    if (!customer_id || !fullname || !lastname || !date_of_birth || balance === undefined) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    // Command validation: check current state from Event Store
    const currentCustomer = await buildCustomerState(id);
    if (!currentCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const changes = {};

    if (currentCustomer.customer_id !== customer_id) {
      changes.customer_id = { old: currentCustomer.customer_id, new: customer_id };
    }
    if (currentCustomer.fullname !== fullname) {
      changes.fullname = { old: currentCustomer.fullname, new: fullname };
    }
    if (currentCustomer.lastname !== lastname) {
      changes.lastname = { old: currentCustomer.lastname, new: lastname };
    }
    
    const oldDate = new Date(currentCustomer.date_of_birth).toISOString().split('T')[0];
    if (oldDate !== date_of_birth) {
      changes.date_of_birth = { old: oldDate, new: date_of_birth };
    }
    
    const oldBalance = parseFloat(currentCustomer.balance);
    const newBalance = parseFloat(balance);
    if (oldBalance !== newBalance) {
      changes.balance = { old: oldBalance, new: newBalance };
    }

    if (Object.keys(changes).length === 0) {
      return res.json(currentCustomer);
    }

    const payload = { changes };
    const event = jsonEvent({
      type: 'CustomerUpdated',
      data: payload,
    });
    
    const streamName = `customer-${id}`;
    await esdb.appendToStream(streamName, [event]);

    // Publish to RabbitMQ
    if (amqpChannel) {
      const message = JSON.stringify({
        eventId: event.id,
        eventType: 'CustomerUpdated',
        aggregateId: id,
        payload
      });
      amqpChannel.publish(RABBITMQ_EXCHANGE, '', Buffer.from(message));
    }

    // Return the updated projection
    res.json({ ...currentCustomer, ...req.body });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 4. Delete a customer
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const currentCustomer = await buildCustomerState(id);
    if (!currentCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const payload = { id };
    const event = jsonEvent({
      type: 'CustomerDeleted',
      data: payload,
    });

    const streamName = `customer-${id}`;
    await esdb.appendToStream(streamName, [event]);

    if (amqpChannel) {
      const message = JSON.stringify({
        eventId: event.id,
        eventType: 'CustomerDeleted',
        aggregateId: id,
        payload
      });
      amqpChannel.publish(RABBITMQ_EXCHANGE, '', Buffer.from(message));
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 5. Get audit log (events) for a specific customer from EventStoreDB
app.get('/api/customers/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    const streamName = `customer-${id}`;
    
    const events = [];
    try {
      const readResult = await esdb.readStream(streamName, {
        fromRevision: START,
        direction: FORWARDS,
        maxCount: 1000
      });
      for await (const resolvedEvent of readResult) {
        events.push({
          event_id: resolvedEvent.event.id,
          aggregate_id: id,
          event_type: resolvedEvent.event.type,
          payload: resolvedEvent.event.data,
          created_at: resolvedEvent.event.created
        });
      }
    } catch (err) {
      if (err.type !== 'stream-not-found') throw err;
    }
    
    res.json(events);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 6. Get ALL audit logs globally
app.get('/api/events', async (req, res) => {
  try {
    // In EventStoreDB, reading $all requires the user to have admin privileges 
    // or specific configuration (EVENTSTORE_RUN_PROJECTIONS=All helps).
    // The @eventstore/db-client has a readAll method.
    const events = [];
    try {
      const readResult = await esdb.readAll({
        fromPosition: START,
        direction: FORWARDS,
        maxCount: 100 // Limiting for safety in this demo
      });
      
      for await (const resolvedEvent of readResult) {
        // Filter out system events (which start with $)
        if (!resolvedEvent.event.type.startsWith('$')) {
          const streamId = resolvedEvent.event.streamId;
          const aggId = streamId.startsWith('customer-') ? streamId.split('-')[1] : streamId;
          
          events.push({
            event_id: resolvedEvent.event.id,
            aggregate_id: aggId,
            event_type: resolvedEvent.event.type,
            payload: resolvedEvent.event.data,
            created_at: resolvedEvent.event.created
          });
        }
      }
    } catch (err) {
      console.error('Error reading $all from EventStoreDB', err);
    }
    
    res.json(events);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Reconnection logic and startup
const startServer = async () => {
  // Try to initialize services with retries for RabbitMQ / EventStore (basic delay)
  const MAX_RETRIES = 5;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await initServices();
      break;
    } catch (e) {
      console.log(`Failed to init services, retrying in 5 seconds... (${i+1}/${MAX_RETRIES})`);
      await new Promise(res => setTimeout(res, 5000));
    }
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

startServer().catch(err => {
  console.error("Failed to start application", err);
});
