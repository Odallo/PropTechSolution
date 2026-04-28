const database = require('./database');

async function simulateMonthOfPayments(tenantPhone) {
    console.log(`💰 Simulating 30 days of payments for ${tenantPhone}...\n`);
    
    // Get tenant info
    const tenant = await database.getUser(tenantPhone);
    if (!tenant) {
        console.log(`❌ Tenant ${tenantPhone} not found. Run seed.js first.`);
        return;
    }
    
    console.log(`Tenant: ${tenant.name} (${tenant.house})`);
    console.log(`Building: ${tenant.building_name}\n`);
    
    let totalSaved = 0;
    const dailyAmount = 200;
    const daysInMonth = 30;
    
    // Simulate daily payments
    for (let day = 1; day <= daysInMonth; day++) {
        await database.savePayment(tenantPhone, dailyAmount);
        totalSaved += dailyAmount;
        
        if (day % 5 === 0 || day === daysInMonth) {
            console.log(`Day ${day}: Saved ${dailyAmount} KES | Total: ${totalSaved} KES`);
        }
    }
    
    console.log(`\n📊 MONTH SUMMARY for ${tenant.name}:`);
    console.log(`   Total saved: ${totalSaved} KES`);
    console.log(`   Daily amount: ${dailyAmount} KES × ${daysInMonth} days`);
    console.log(`   Rent target: 6,000 KES`);
    
    if (totalSaved >= 6000) {
        console.log(`   ✅ Rent target achieved! Ready for month-end payment.`);
    } else {
        const short = 6000 - totalSaved;
        console.log(`   ⚠️ Short by ${short} KES. Need to save extra.`);
    }
    
    // Check final balance in database
    const finalBalance = await database.getMonthlyBalance(tenantPhone);
    console.log(`\n💾 Database balance: ${finalBalance} KES`);
    
    // Simulate month-end trigger
    console.log(`\n📱 MONTH-END ACTION:`);
    console.log(`   SMS to tenant ${tenantPhone}:`);
    console.log(`   "🎉 Congratulations! You've saved ${totalSaved} KES this month.`);
    console.log(`    Your landlord will receive payment on the 1st. Thank you for using BomaFlow!"`);
    
    console.log(`\n   SMS to landlord ${tenant.landlord_phone}:`);
    console.log(`   "🏢 Tenant ${tenant.name} (${tenant.house}) has saved ${totalSaved} KES.`);
    console.log(`    Reply CONFIRM to release payment to your account."`);
}

// Run for Mary (254711111111)
simulateMonthOfPayments('254711111111').catch(console.error);