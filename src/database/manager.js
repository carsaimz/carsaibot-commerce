const Database = require('better-sqlite3');
const path = require('path');
const config = require('../../config/config');
const Logger = require('../utils/logger');

class DatabaseManager {
    static instance = null;

    constructor() {
        this.logger = new Logger();
        this.db = null;
    }

    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    initialize() {
        try {
            this.db = new Database(config.database.path, {
                verbose: this.logger.debug.bind(this.logger)
            });
            
            // Otimizações de performance
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('temp_store = MEMORY');
            this.db.pragma('mmap_size = 30000000000');
            this.db.pragma('page_size = 32768');
            
            this.createTables();
            return true;
        } catch (err) {
            this.logger.error('Erro ao conectar ao banco de dados:', err);
            return false;
        }
    }

    createTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT,
                phone TEXT UNIQUE,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                stock INTEGER DEFAULT 0,
                category TEXT,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                status TEXT DEFAULT 'pending',
                subtotal REAL,
                tax REAL,
                delivery_fee REAL,
                total REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,
            `CREATE TABLE IF NOT EXISTS order_items (
                order_id TEXT,
                product_id TEXT,
                quantity INTEGER,
                price REAL,
                total REAL,
                FOREIGN KEY (order_id) REFERENCES orders (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`,
            `CREATE TABLE IF NOT EXISTS services (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                duration INTEGER NOT NULL,
                category TEXT,
                availability TEXT,
                max_bookings INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS bookings (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                service_id TEXT,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (service_id) REFERENCES services (id)
            )`,
            `CREATE TABLE IF NOT EXISTS banned_users (
                user_id TEXT PRIMARY KEY,
                reason TEXT,
                banned_by TEXT,
                banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS warnings (
                user_id TEXT,
                group_id TEXT,
                reason TEXT,
                count INTEGER DEFAULT 1,
                last_warning TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, group_id)
            )`,
            `CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                target_id TEXT,
                type TEXT,
                rating INTEGER,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,
            `CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                type TEXT,
                title TEXT,
                message TEXT,
                reference_id TEXT,
                read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`
        ];

        this.db.transaction(() => {
            for (const table of tables) {
                this.db.prepare(table).run();
            }
        })();
    }

    // Métodos base de banco de dados
    run(sql, params = []) {
        try {
            return this.db.prepare(sql).run(params);
        } catch (err) {
            this.logger.error('Erro na execução SQL:', err);
            throw err;
        }
    }

    get(sql, params = []) {
        try {
            return this.db.prepare(sql).get(params);
        } catch (err) {
            this.logger.error('Erro na consulta SQL:', err);
            throw err;
        }
    }

    all(sql, params = []) {
        try {
            return this.db.prepare(sql).all(params);
        } catch (err) {
            this.logger.error('Erro na consulta SQL:', err);
            throw err;
        }
    }

    // Métodos para usuários
    addUser(user) {
        const sql = `INSERT INTO users (id, name, phone) VALUES (?, ?, ?)`;
        return this.run(sql, [user.id, user.name, user.phone]);
    }

    getUser(userId) {
        return this.get(`SELECT * FROM users WHERE id = ?`, [userId]);
    }

    updateUser(userId, updates) {
        const entries = Object.entries(updates);
        const sql = `UPDATE users SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`;
        return this.run(sql, [...entries.map(([_, v]) => v), userId]);
    }

    // Métodos para produtos
    addProduct(product) {
        const sql = `INSERT INTO products (id, name, description, price, stock, category, image_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`;
        return this.run(sql, [
            product.id,
            product.name,
            product.description,
            product.price,
            product.stock,
            product.category,
            product.image_url
        ]);
    }

    getProduct(productId) {
        return this.get(`SELECT * FROM products WHERE id = ?`, [productId]);
    }

    listProducts(category = null) {
        const sql = category
            ? `SELECT * FROM products WHERE category = ?`
            : `SELECT * FROM products`;
        return this.all(sql, category ? [category] : []);
    }

    updateProduct(productId, updates) {
        const entries = Object.entries(updates);
        const sql = `UPDATE products SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`;
        return this.run(sql, [...entries.map(([_, v]) => v), productId]);
    }

    // Métodos para pedidos
    createOrder(order) {
        const orderStmt = this.db.prepare(`
            INSERT INTO orders (id, user_id, status, subtotal, tax, delivery_fee, total)
            VALUES (?, ?, ?, ?, ?, ?, ?)`
        );

        const itemStmt = this.db.prepare(`
            INSERT INTO order_items (order_id, product_id, quantity, price, total)
            VALUES (?, ?, ?, ?, ?)`
        );

        const transaction = this.db.transaction((order) => {
            orderStmt.run([
                order.id,
                order.userId,
                order.status,
                order.subtotal,
                order.tax,
                order.deliveryFee,
                order.total
            ]);

            for (const item of order.items) {
                itemStmt.run([
                    order.id,
                    item.id,
                    item.quantity,
                    item.price,
                    item.total
                ]);
            }
        });

        transaction(order);
        return this.getOrder(order.id);
    }

    getOrder(orderId) {
        const order = this.get(`SELECT * FROM orders WHERE id = ?`, [orderId]);
        if (!order) return null;

        order.items = this.all(`
            SELECT oi.*, p.name, p.description
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ?`,
            [orderId]
        );

        return order;
    }

    // Métodos para moderação
    addToBanList(userId, reason, bannedBy) {
        const sql = `INSERT INTO banned_users (user_id, reason, banned_by)
                    VALUES (?, ?, ?)`;
        return this.run(sql, [userId, reason, bannedBy]);
    }

    isUserBanned(userId) {
        const row = this.get(`SELECT 1 FROM banned_users WHERE user_id = ?`, [userId]);
        return !!row;
    }

    addWarning(userId, groupId, reason) {
        const sql = `INSERT INTO warnings (user_id, group_id, reason)
                    VALUES (?, ?, ?)
                    ON CONFLICT(user_id, group_id)
                    DO UPDATE SET count = count + 1, last_warning = CURRENT_TIMESTAMP`;
        return this.run(sql, [userId, groupId, reason]);
    }

    getWarnings(userId, groupId) {
        return this.get(
            `SELECT * FROM warnings WHERE user_id = ? AND group_id = ?`,
            [userId, groupId]
        );
    }

    // Métodos para serviços
    addService(service) {
        const sql = `INSERT INTO services (
            id, name, description, price, duration,
            category, availability, max_bookings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        return this.run(sql, [
            service.id || Date.now().toString(),
            service.name,
            service.description,
            service.price,
            service.duration,
            service.category,
            service.availability,
            service.max_bookings
        ]);
    }

    getService(serviceId) {
        return this.get(`SELECT * FROM services WHERE id = ?`, [serviceId]);
    }

    listServices(category = null) {
        const sql = category
            ? `SELECT * FROM services WHERE category = ?`
            : `SELECT * FROM services`;
        return this.all(sql, category ? [category] : []);
    }

    updateService(serviceId, updates) {
        const entries = Object.entries(updates);
        const sql = `UPDATE services SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`;
        return this.run(sql, [...entries.map(([_, v]) => v), serviceId]);
    }

    deleteService(serviceId) {
        return this.run(`DELETE FROM services WHERE id = ?`, [serviceId]);
    }

    // Métodos para agendamentos
    createBooking(booking) {
        const sql = `INSERT INTO bookings (
            id, user_id, service_id, date, time,
            status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

        return this.run(sql, [
            booking.id || Date.now().toString(),
            booking.user_id,
            booking.service_id,
            booking.date,
            booking.time,
            booking.status || 'pending',
            booking.notes
        ]);
    }

    getBooking(bookingId) {
        return this.get(`
            SELECT b.*, s.name as service_name, s.price, s.duration
            FROM bookings b
            JOIN services s ON s.id = b.service_id
            WHERE b.id = ?
        `, [bookingId]);
    }

    getUserBookings(userId) {
        return this.all(`
            SELECT b.*, s.name as service_name, s.price, s.duration
            FROM bookings b
            JOIN services s ON s.id = b.service_id
            WHERE b.user_id = ?
            ORDER BY b.date DESC, b.time DESC
        `, [userId]);
    }

    getServiceBookings(serviceId, date) {
        return this.all(`
            SELECT b.*, u.name as user_name
            FROM bookings b
            JOIN users u ON u.id = b.user_id
            WHERE b.service_id = ? AND b.date = ?
            ORDER BY b.time ASC
        `, [serviceId, date]);
    }

    updateBooking(bookingId, updates) {
        const entries = Object.entries(updates);
        const sql = `UPDATE bookings SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`;
        return this.run(sql, [...entries.map(([_, v]) => v), bookingId]);
    }

    deleteBooking(bookingId) {
        return this.run(`DELETE FROM bookings WHERE id = ?`, [bookingId]);
    }

    // Métodos para categorias
    addCategory(category) {
        const sql = `INSERT INTO categories (name, type, description)
                    VALUES (?, ?, ?)`;
        return this.run(sql, [category.name, category.type, category.description]);
    }

    listCategories(type = null) {
        const sql = type
            ? `SELECT * FROM categories WHERE type = ?`
            : `SELECT * FROM categories`;
        return this.all(sql, type ? [type] : []);
    }

    // Métodos para avaliações
    addReview(review) {
        const sql = `INSERT INTO reviews (
            user_id, target_id, type, rating, comment
        ) VALUES (?, ?, ?, ?, ?)`;

        return this.run(sql, [
            review.user_id,
            review.target_id,
            review.type,
            review.rating,
            review.comment
        ]);
    }

    getReviews(targetId, type) {
        return this.all(`
            SELECT r.*, u.name as user_name
            FROM reviews r
            JOIN users u ON u.id = r.user_id
            WHERE r.target_id = ? AND r.type = ?
            ORDER BY r.created_at DESC
        `, [targetId, type]);
    }

    // Métodos para estatísticas
    getServiceStats(serviceId) {
        return this.get(`
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                AVG(CASE WHEN status = 'completed' THEN 
                    (SELECT rating FROM reviews 
                     WHERE target_id = ? AND type = 'service'
                     AND user_id = bookings.user_id)
                END) as avg_rating
            FROM bookings
            WHERE service_id = ?
        `, [serviceId, serviceId]);
    }

    getUserStats(userId) {
        return this.get(`
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                (SELECT COUNT(*) FROM reviews WHERE user_id = ?) as total_reviews,
                (SELECT AVG(rating) FROM reviews WHERE target_id = ? AND type = 'user') as avg_rating
            FROM bookings
            WHERE user_id = ?
        `, [userId, userId, userId]);
    }

    // Métodos para notificações
    addNotification(notification) {
        const sql = `INSERT INTO notifications (
            user_id, type, title, message, reference_id, read
        ) VALUES (?, ?, ?, ?, ?, ?)`;

        return this.run(sql, [
            notification.user_id,
            notification.type,
            notification.title,
            notification.message,
            notification.reference_id,
            false
        ]);
    }

    getUserNotifications(userId) {
        return this.all(`
            SELECT * FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [userId]);
    }

    markNotificationRead(notificationId) {
        return this.run(`
            UPDATE notifications
            SET read = true
            WHERE id = ?
        `, [notificationId]);
    }

    // Métodos para relatórios
    generateServiceReport(serviceId, startDate, endDate) {
        return this.all(`
            SELECT 
                date,
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                SUM(CASE WHEN status = 'completed' THEN
                    (SELECT price FROM services WHERE id = bookings.service_id)
                END) as revenue
            FROM bookings
            WHERE service_id = ?
                AND date BETWEEN ? AND ?
            GROUP BY date
            ORDER BY date ASC
        `, [serviceId, startDate, endDate]);
    }

    generateUserReport(userId, startDate, endDate) {
        return this.all(`
            SELECT 
                b.date,
                s.name as service_name,
                b.status,
                s.price,
                r.rating,
                r.comment
            FROM bookings b
            LEFT JOIN services s ON s.id = b.service_id
            LEFT JOIN reviews r ON r.target_id = b.id AND r.type = 'booking'
            WHERE b.user_id = ?
                AND b.date BETWEEN ? AND ?
            ORDER BY b.date ASC
        `, [userId, startDate, endDate]);
    }
}

module.exports = DatabaseManager;