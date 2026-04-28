const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file
const dbPath = path.join(__dirname, 'bomaflow.db');
const db = new sqlite3.Database(dbPath);

// Initialize tables (run this once when server starts)
db.serialize(() => {
    // Users table: stores both tenants and landlords
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            phone TEXT PRIMARY KEY,
            role TEXT CHECK(role IN ('tenant', 'landlord')),
            name TEXT,
            building_name TEXT,
            house_number TEXT,
            landlord_phone TEXT
        )
    `);

    // Payments table: logs every daily micro-payment
    db.run(`
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT,
            amount INTEGER,
            date TEXT,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (phone) REFERENCES users(phone)
        )
    `);

    // Repairs table: maintenance requests
    db.run(`
        CREATE TABLE IF NOT EXISTS repairs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_phone TEXT,
            building_name TEXT,
            house_number TEXT,
            description TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT,
            FOREIGN KEY (tenant_phone) REFERENCES users(phone)
        )
    `);
});

// Helper functions for database operations

// Add or update a user
function saveUser(phone, role, name, building_name, house_number, landlord_phone = null) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT OR REPLACE INTO users (phone, role, name, building_name, house_number, landlord_phone)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        db.run(query, [phone, role, name, building_name, house_number, landlord_phone], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

// Get user by phone number
function getUser(phone) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Save a daily payment
function savePayment(phone, amount) {
    return new Promise((resolve, reject) => {
        const today = new Date().toISOString().split('T')[0];
        const query = `INSERT INTO payments (phone, amount, date) VALUES (?, ?, ?)`;
        db.run(query, [phone, amount, today], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

// Get total payments for a tenant in current month
function getMonthlyBalance(phone) {
    return new Promise((resolve, reject) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        
        const query = `
            SELECT SUM(amount) as total FROM payments 
            WHERE phone = ? 
            AND strftime('%Y', date) = ? 
            AND strftime('%m', date) = ?
        `;
        db.get(query, [phone, year.toString(), month.toString().padStart(2, '0')], (err, row) => {
            if (err) reject(err);
            else resolve(row?.total || 0);
        });
    });
}

// Save a repair request
function saveRepair(tenant_phone, building_name, house_number, description) {
    return new Promise((resolve, reject) => {
        const now = new Date().toISOString();
        const query = `
            INSERT INTO repairs (tenant_phone, building_name, house_number, description, created_at)
            VALUES (?, ?, ?, ?, ?)
        `;
        db.run(query, [tenant_phone, building_name, house_number, description, now], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

// Export all functions so server.js can use them
module.exports = {
    db,
    saveUser,
    getUser,
    savePayment,
    getMonthlyBalance,
    saveRepair
};