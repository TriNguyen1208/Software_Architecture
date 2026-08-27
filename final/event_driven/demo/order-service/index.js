
const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// --- SQLite Database Setup ---
const db = new sqlite3.Database('./orders.sqlite');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        quantity INTEGER,
        status TEXT
    )`);
});

// --- RabbitMQ Setup ---
let channel, connection;

const initRabbitMQ = async () => {
    try {
        const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        connection = await amqp.connect(rabbitmqUrl);
        channel = await connection.createChannel();
        
        await channel.assertExchange('inventory-exchange', 'fanout', { durable: true });
        const q = await channel.assertQueue('order-service-inventory-events', { durable: true });
        await channel.bindQueue(q.queue, 'inventory-exchange', '');
        const queueName = q.queue;
        
        // Declare order-events queue as well so we can publish to it
        await channel.assertQueue('order-events', { durable: true });

        console.log('[Order Service] Đang lắng nghe trên queue:', queueName);

        channel.consume(queueName, (message) => {
            if (message !== null) {
                const event = JSON.parse(message.content.toString());
                console.log(`[Order Service] Nhận được event: ${event.type} cho orderId: ${event.orderId}`);

                if (event.type === 'InventoryReserved') {
                    db.run('UPDATE orders SET status = ? WHERE id = ?', ['CONFIRMED', event.orderId], (err) => {
                        if (err) console.error(err);
                        else console.log(`[Order Service] Đã cập nhật trạng thái đơn hàng #${event.orderId} thành CONFIRMED`);
                    });
                } else if (event.type === 'InventoryFailed') {
                    db.run('UPDATE orders SET status = ? WHERE id = ?', ['CANCELLED', event.orderId], (err) => {
                        if (err) console.error(err);
                        else console.log(`[Order Service] Đã cập nhật trạng thái đơn hàng #${event.orderId} thành CANCELLED`);
                    });
                }
                
                channel.ack(message);
            }
        });

        console.log('[Order Service] RabbitMQ connected.');
    } catch (err) {
        console.error('Lỗi kết nối RabbitMQ, thử lại sau 5s...', err.message);
        setTimeout(initRabbitMQ, 5000);
    }
};

initRabbitMQ();

// --- API Endpoints ---
app.post('/api/orders', (req, res) => {
    const { userId, quantity } = req.body;

    // Lưu đơn hàng với trạng thái PENDING
    db.run('INSERT INTO orders (userId, quantity, status) VALUES (?, ?, ?)', [userId, quantity, 'PENDING'], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const orderId = this.lastID;

        // Publish event OrderCreated lên RabbitMQ
        const eventPayload = {
            type: 'OrderCreated',
            orderId: orderId,
            userId: userId,
            quantity: quantity
        };

        try {
            channel.sendToQueue('order-events', Buffer.from(JSON.stringify(eventPayload)));
            console.log(`[Order Service] Đã publish OrderCreated: orderId=${orderId}`);
            res.status(202).json({
                message: 'Đơn hàng đang được xử lý (Pending)',
                orderId: orderId,
                status: 'PENDING'
            });
        } catch (err) {
            console.error('Lỗi khi publish OrderCreated', err);
            res.status(500).json({ error: 'Failed to publish event' });
        }
    });
});

app.get('/api/orders', (req, res) => {
    db.all('SELECT * FROM orders ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Order Service đang chạy trên cổng ${PORT}`);
});
