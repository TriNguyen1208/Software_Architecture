
require('dotenv').config();
const amqp = require('amqplib');
const nodemailer = require('nodemailer');

// --- Nodemailer Setup ---
// In a real scenario, use real credentials via .env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER || 'test@gmail.com',
        pass: process.env.SMTP_PASS || 'password123'
    }
});

// --- RabbitMQ Setup ---
let channel, connection;

const initRabbitMQ = async () => {
    try {
        const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        connection = await amqp.connect(rabbitmqUrl);
        channel = await connection.createChannel();
        
        await channel.assertExchange('inventory-exchange', 'fanout', { durable: true });
        const q = await channel.assertQueue('notification-service-inventory-events', { durable: true });
        await channel.bindQueue(q.queue, 'inventory-exchange', '');
        const queueName = q.queue;

        console.log('[Notification Service] Đang lắng nghe trên queue:', queueName);

        channel.consume(queueName, (message) => {
            if (message !== null) {
                const event = JSON.parse(message.content.toString());
                console.log(`[Notification Service] Nhận được event: ${event.type} cho orderId: ${event.orderId}`);

                if (event.type === 'InventoryReserved') {
                    // Send success email
                    const mailOptions = {
                        from: process.env.SMTP_USER || 'test@gmail.com',
                        to: event.userId || 'customer@example.com',
                        subject: `Xác nhận đơn hàng #${event.orderId} thành công`,
                        text: `Cảm ơn bạn đã đặt hàng. Đơn hàng #${event.orderId} của bạn đã được xác nhận và đang được chuẩn bị.`
                    };

                    console.log(`[Notification Service] Đang gửi email xác nhận cho đơn hàng #${event.orderId}...`);

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('[Notification Service] Lỗi gửi email:', error);
                        } else {
                            console.log('[Notification Service] Email đã được gửi: ' + info.response);
                        }
                    });

                    console.log(`[Notification Service] (MOCK) Đã gửi email xác nhận cho đơn hàng #${event.orderId} tới ${mailOptions.to}`);
                } else if (event.type === 'InventoryFailed') {
                    // Send failure email
                    const mailOptions = {
                        from: process.env.SMTP_USER || 'test@gmail.com',
                        to: event.userId || 'customer@example.com',
                        subject: `Đơn hàng #${event.orderId} đã bị hủy`,
                        text: `Rất tiếc, mặt hàng bạn đặt đã hết. Đơn hàng #${event.orderId} đã bị hủy.`
                    };

                    console.log(`[Notification Service] Đang gửi email xin lỗi hết hàng cho đơn hàng #${event.orderId}...`);

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('[Notification Service] Lỗi gửi email:', error);
                        } else {
                            console.log('[Notification Service] Email đã được gửi: ' + info.response);
                        }
                    });

                    console.log(`[Notification Service] (MOCK) Đã gửi email xin lỗi cho đơn hàng #${event.orderId} tới ${mailOptions.to}`);
                }
                
                channel.ack(message);
            }
        });

        console.log('[Notification Service] RabbitMQ connected.');
    } catch (err) {
        console.error('Lỗi kết nối RabbitMQ, thử lại sau 5s...', err.message);
        setTimeout(initRabbitMQ, 5000);
    }
};

initRabbitMQ();
