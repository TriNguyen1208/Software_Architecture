
const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3002;

// --- SQLite Database Setup ---
const db = new sqlite3.Database('./inventory.sqlite');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stock INTEGER
    )`);

    // Insert default stock if not exists
    db.get('SELECT COUNT(*) as count FROM inventory', (err, row) => {
        if (row.count === 0) {
            db.run('INSERT INTO inventory (stock) VALUES (?)', [3]);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_users INTEGER
    )`);

    db.get('SELECT COUNT(*) as count FROM statistics', (err, row) => {
        if (row.count === 0) {
            db.run('INSERT INTO statistics (total_users) VALUES (?)', [0]);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS processed_events (
        eventId TEXT PRIMARY KEY
    )`);
});

// --- RabbitMQ Setup ---
let channel, connection;

const initRabbitMQ = async () => {
    try {
        const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        connection = await amqp.connect(rabbitmqUrl);
        channel = await connection.createChannel();
        
        const queueName = 'order-events';
        await channel.assertQueue(queueName, { durable: true });
        await channel.assertExchange('inventory-exchange', 'fanout', { durable: true });

        // Sử dụng prefetch để xử lý từng message một
        channel.prefetch(1);
        console.log('[Inventory Service] Đang lắng nghe trên queue:', queueName);

        channel.consume(queueName, async (message) => {
            if (message !== null) {
                const event = JSON.parse(message.content.toString());
                const eventId = `OrderCreated-${event.orderId}`;

                console.log(`[Inventory Service] Nhận được event: ${event.type} cho orderId: ${event.orderId}`);

                if (event.type === 'OrderCreated') {
                    // Check Idempotency
                    db.get('SELECT * FROM processed_events WHERE eventId = ?', [eventId], (err, row) => {
                        if (err) {
                            console.error(err);
                            channel.nack(message); // Yêu cầu retry nếu lỗi
                            return;
                        }
                        if (row) {
                            console.log(`[Inventory Service] Event ${eventId} đã được xử lý trước đó. Bỏ qua (Idempotency).`);
                            channel.ack(message);
                            return;
                        }

                        // Mark as processed
                        db.run('INSERT INTO processed_events (eventId) VALUES (?)', [eventId], (err) => {
                            if (err) {
                                console.error(err);
                                channel.nack(message);
                                return;
                            }

                            // Check Inventory
                            db.get('SELECT stock FROM inventory WHERE id = 1', (err, row) => {
                                if (err) {
                                    console.error(err);
                                    channel.nack(message);
                                    return;
                                }
                                const currentStock = row.stock;
                                const qty = event.quantity || 1;

                                if (currentStock >= qty) {
                                    // Đủ hàng -> Trừ kho và tăng user
                                    db.serialize(() => {
                                        db.run('UPDATE inventory SET stock = stock - ? WHERE id = 1', [qty]);
                                        db.run('UPDATE statistics SET total_users = total_users + 1 WHERE id = 1', (err) => {
                                            if (err) {
                                                console.error(err);
                                                channel.nack(message);
                                                return;
                                            }

                                            const replyEvent = {
                                                type: 'InventoryReserved',
                                                orderId: event.orderId,
                                                userId: event.userId
                                            };

                                            channel.publish('inventory-exchange', '', Buffer.from(JSON.stringify(replyEvent)));
                                            console.log(`[Inventory Service] Đã trừ kho và publish InventoryReserved cho orderId=${event.orderId}`);
                                            channel.ack(message);
                                        });
                                    });
                                } else {
                                    // Hết hàng
                                    const replyEvent = {
                                        type: 'InventoryFailed',
                                        orderId: event.orderId,
                                        userId: event.userId,
                                        reason: 'Out of stock'
                                    };

                                    channel.publish('inventory-exchange', '', Buffer.from(JSON.stringify(replyEvent)));
                                    console.log(`[Inventory Service] Không đủ kho, publish InventoryFailed cho orderId=${event.orderId}`);
                                    channel.ack(message);
                                }
                            });
                        });
                    });
                } else {
                    channel.ack(message); // Bỏ qua nếu không phải OrderCreated
                }
            }
        });

        console.log('[Inventory Service] RabbitMQ connected.');
    } catch (err) {
        console.error('Lỗi kết nối RabbitMQ, thử lại sau 5s...', err.message);
        setTimeout(initRabbitMQ, 5000);
    }
};

initRabbitMQ();

// --- API Endpoints ---
app.get('/api/dashboard', (req, res) => {
    db.get('SELECT stock FROM inventory WHERE id = 1', (err, invRow) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get('SELECT total_users FROM statistics WHERE id = 1', (err, statRow) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                stock: invRow.stock,
                totalUsers: statRow.total_users
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Inventory Service đang chạy trên cổng ${PORT}`);
});
