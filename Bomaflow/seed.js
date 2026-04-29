const db = require('./database');

async function seed() {
    console.log('🌱 Adding test users...');
    
    // First add landlord
    await db.saveUser('254712345678', 'James Landlord', 'Sunrise Apartments', 'Office', null);
    console.log('✅ Landlord added: James (254712345678)');
    
    // Then add tenants with landlord reference
    await db.saveUser('254711111111', 'Mary Wanjiku', 'Sunrise Apartments', 'A1', '254712345678');
    await db.saveUser('254722222222', 'John Otieno', 'Sunrise Apartments', 'B2', '254712345678');
    await db.saveUser('254733333333', 'Sarah Mwangi', 'Unity Towers', 'C3', '254799999999');
    
    // Add some payments for Mary
    await db.addPayment('254711111111', 200);
    await db.addPayment('254711111111', 200);
    await db.addPayment('254711111111', 200);
    
    console.log('✅ Test users added:');
    console.log('   Landlord: 254712345678');
    console.log('   Mary: 254711111111 (600 KES balance)');
    console.log('   John: 254722222222 (0 KES balance)');
    console.log('   Sarah: 254733333333 (0 KES balance)');
    
    const maryBalance = await db.getBalance('254711111111');
    console.log(`\n💰 Mary's balance: ${maryBalance} KES`);
}

seed().catch(console.error);