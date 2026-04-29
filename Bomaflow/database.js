const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'bomaflow.db');
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        phone TEXT PRIMARY KEY,
        name TEXT,
        building TEXT,
        house TEXT,
        balance INTEGER DEFAULT 0
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT,
        amount INTEGER,
        date TEXT
    )`);
});

// Helper functions
function saveUser(phone, name, building, house) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT OR REPLACE INTO users (phone, name, building, house, balance) 
                VALUES (?, ?, ?, ?, 0)`, [phone, name, building, house], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function getUser(phone) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM users WHERE phone = ?`, [phone], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function addPayment(phone, amount) {
    const date = new Date().toISOString().split('T')[0];
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO payments (phone, amount, date) VALUES (?, ?, ?)`, 
               [phone, amount, date], (err) => {
            if (err) reject(err);
            else {
                // Update user balance
                db.run(`UPDATE users SET balance = balance + ? WHERE phone = ?`, [amount, phone], (err2) => {
                    if (err2) reject(err2);
                    else resolve();
                });
            }
        });
    });
}

function getBalance(phone) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT balance FROM users WHERE phone = ?`, [phone], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.balance : 0);
        });
    });
}

// Check if tenant has reached monthly rent target (6000 KES)
function hasReachedTarget(phone) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT balance FROM users WHERE phone = ?`, [phone], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.balance >= 6000 : false);
        });
    });
}

// Complete month - reset balance and record payment
function completeMonth(phone, landlordPhone, amount) {
    return new Promise((resolve, reject) => {
        // Start a transaction (both operations must succeed together)
        db.serialize(() => {
            db.run(`UPDATE users SET balance = balance - ? WHERE phone = ?`, [amount, phone], (err) => {
                if (err) reject(err);
            });
            db.run(`INSERT INTO payments (phone, amount, date, status) VALUES (?, ?, ?, 'completed')`, 
                   [phone, amount, new Date().toISOString().split('T')[0]], (err) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    });
}

// Get all tenants for a landlord
function getLandlordTenants(landlordPhone) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM users WHERE building IN 
                (SELECT building FROM users WHERE phone = ?) AND phone != ?`, 
                [landlordPhone, landlordPhone], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

module.exports = { 
    saveUser, 
    getUser, 
    addPayment, 
    getBalance,
    hasReachedTarget,    // NEW
    completeMonth,       // NEW
    getLandlordTenants   // NEW
};