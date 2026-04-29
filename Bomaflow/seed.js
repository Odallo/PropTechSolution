const db = require('./database');

// Override saveUser to include role (temporary fix)
// For now, we'll manually insert using raw SQL since our saveUser doesn't have role
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'bomaflow.db');
const rawDb = new sqlite3.Database(dbPath);

async function seed() {
    console.log('🌱 Adding test users with roles...');
    
    // Drop and recreate tables with role column
    rawDb.serialize(() => {
        rawDb.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'tenant'`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Role column added or already exists');
            }
        });
    });
    
    // Wait a bit for the ALTER to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Add landlord
    await db.saveUser('254712345678', 'James Landlord', 'Sunrise Apartments', 'Office', null);
    
    // Manually update landlord role
    rawDb.run(`UPDATE users SET role = 'landlord' WHERE phone = '254712345678'`);
    
    // Add tenants
    await db.saveUser('254711111111', 'Mary Wanjiku', 'Sunrise Apartments', 'A1', '254712345678');
    await db.saveUser('254722222222', 'John Otieno', 'Sunrise Apartments', 'B2', '254712345678');
    await db.saveUser('254733333333', 'Sarah Mwangi', 'Unity Towers', 'C3', '254799999999');
    
    // Set tenant roles
    rawDb.run(`UPDATE users SET role = 'tenant' WHERE phone = '254711111111'`);
    rawDb.run(`UPDATE users SET role = 'tenant' WHERE phone = '254722222222'`);
    rawDb.run(`UPDATE users SET role = 'tenant' WHERE phone = '254733333333'`);
    
    // Add a second landlord
    await db.saveUser('254799999999', 'Peter Landlord', 'Unity Towers', 'Office', null);
    rawDb.run(`UPDATE users SET role = 'landlord' WHERE phone = '254799999999'`);
    
    // Add some payments for Mary
    await db.addPayment('254711111111', 200);
    await db.addPayment('254711111111', 200);
    await db.addPayment('254711111111', 200);
    
    console.log('✅ Test users added:');
    console.log('   Landlord 1: 254712345678 (Sunrise Apartments)');
    console.log('   Landlord 2: 254799999999 (Unity Towers)');
    console.log('   Mary: 254711111111 (600 KES balance)');
    console.log('   John: 254722222222 (0 KES balance)');
    console.log('   Sarah: 254733333333 (0 KES balance)');
    
    const maryBalance = await db.getBalance('254711111111');
    console.log(`\n💰 Mary's balance: ${maryBalance} KES`);
    
    rawDb.close();
}

seed().catch(console.error);