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

module.exports = { saveUser, getUser, addPayment, getBalance };