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
        balance INTEGER DEFAULT 0,
        landlord_phone TEXT,
        role TEXT DEFAULT 'tenant',
        monthly_rent INTEGER DEFAULT 6000
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT,
        amount INTEGER,
        date TEXT
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS repairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT,
        issue_type TEXT,
        description TEXT,
        date TEXT,
        status TEXT DEFAULT 'pending'
    )`);
});

// Helper functions
function saveUser(phone, name, building, house, landlord_phone = null, monthly_rent = 6000) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT OR REPLACE INTO users (phone, name, building, house, balance, landlord_phone, monthly_rent) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                [phone, name, building, house, 0, landlord_phone, monthly_rent], (err) => {
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

// Check if tenant has reached their personal monthly rent target
function hasReachedTarget(phone) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT balance, monthly_rent FROM users WHERE phone = ?`, [phone], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.balance >= (row.monthly_rent || 6000) : false);
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

// Get all tenants for a specific landlord
function getTenantsByLandlord(landlordPhone) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM users WHERE landlord_phone = ?`, [landlordPhone], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

// Get monthly payments for a tenant (detailed)
function getMonthlyPayments(phone) {
    return new Promise((resolve, reject) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        
        const query = `
            SELECT * FROM payments 
            WHERE phone = ? 
            AND strftime('%Y', date) = ? 
            AND strftime('%m', date) = ?
            ORDER BY date DESC
        `;
        db.all(query, [phone, year.toString(), month.toString().padStart(2, '0')], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

// Save repair request
function saveRepair(phone, issue_type, description) {
    return new Promise((resolve, reject) => {
        const date = new Date().toISOString().split('T')[0];
        db.run(`INSERT INTO repairs (phone, issue_type, description, date) VALUES (?, ?, ?, ?)`, 
               [phone, issue_type, description, date], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Get repair requests for landlord
function getLandlordRepairs(landlordPhone) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT r.*, u.name, u.house, u.building 
            FROM repairs r
            JOIN users u ON r.phone = u.phone
            WHERE u.landlord_phone = ?
            ORDER BY r.date DESC
            LIMIT 10
        `;
        db.all(query, [landlordPhone], (err, rows) => {
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
    getLandlordTenants,  // NEW
    getTenantsByLandlord, // NEW
    getMonthlyPayments,   // NEW
    saveRepair,          // NEW
    getLandlordRepairs   // NEW
};