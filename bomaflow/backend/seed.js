const database = require('./database');

async function seedDatabase() {
    console.log('🌱 Seeding database with test data...');
    
    // Sample Landlord
    await database.saveUser(
        '254712345678',  // phone
        'landlord',       // role
        'James Otieno',   // name
        'Sunrise Apartments', // building_name
        null,             // house_number (landlord doesn't have one)
        null              // landlord_phone (self)
    );
    console.log('✅ Landlord added: James Otieno (254712345678)');
    
    // Sample Tenants (all in Sunrise Apartments)
    const tenants = [
        { phone: '254711111111', name: 'Mary Wanjiku', house: 'A1' },
        { phone: '254722222222', name: 'John Kimani', house: 'B3' },
        { phone: '254733333333', name: 'Sarah Omondi', house: 'C2' },
        { phone: '254744444444', name: 'Peter Mutua', house: 'A4' }
    ];
    
    for (const tenant of tenants) {
        await database.saveUser(
            tenant.phone,
            'tenant',
            tenant.name,
            'Sunrise Apartments',
            tenant.house,
            '254712345678'  // landlord's phone
        );
        console.log(`✅ Tenant added: ${tenant.name} (${tenant.phone}) - House ${tenant.house}`);
    }
    
    // Add some sample payments for Mary (so she has a balance)
    await database.savePayment('254711111111', 200);
    await database.savePayment('254711111111', 200);
    await database.savePayment('254711111111', 200);
    console.log('✅ Sample payments added for Mary Wanjiku (600 KES balance)');
    
    // Add a sample repair request
    await database.saveRepair(
        '254722222222',
        'Sunrise Apartments',
        'B3',
        'Water leak in bathroom'
    );
    console.log('✅ Sample repair request added for John Kimani');
    
    console.log('\n🎉 Seeding complete!');
    console.log('\n📱 Test these numbers with USSD:');
    console.log('   Mary (has balance): 254711111111');
    console.log('   John (has repair): 254722222222');
    console.log('   Sarah (new user): 254733333333');
    console.log('\n🔧 To test:');
    console.log('   curl -X POST http://localhost:3000/ussd \\');
    console.log('     -d "phoneNumber=254711111111" \\');
    console.log('     -d "text=" \\');
    console.log('     -d "sessionId=test123"');
}

// Run the seeding
seedDatabase().catch(console.error);