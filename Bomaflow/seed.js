const db = require('./database');

async function seed() {
    console.log('🌱 Adding test users...');
    
    await db.saveUser('254711111111', 'Mary Wanjiku', 'Sunrise Apartments', 'A1');
    await db.saveUser('254722222222', 'John Otieno', 'Sunrise Apartments', 'B2');
    await db.saveUser('254733333333', 'Sarah Mwangi', 'Unity Towers', 'C3');
    
    // Add some payments for Mary
    await db.addPayment('254711111111', 200);
    await db.addPayment('254711111111', 200);
    await db.addPayment('254711111111', 200);
    
    console.log('✅ Test users added:');
    console.log('   Mary: 254711111111 (600 KES balance)');
    console.log('   John: 254722222222 (0 KES balance)');
    console.log('   Sarah: 254733333333 (0 KES balance)');
    
    // Show balances
    const maryBalance = await db.getBalance('254711111111');
    console.log(`\n💰 Mary's balance: ${maryBalance} KES`);
}

seed().catch(console.error);