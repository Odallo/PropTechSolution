require('dotenv').config();
const { sendSMS, sendPaymentReceipt, sendRepairNotification } = require('./sms');

async function testSMSFunctionality() {
    console.log('=== Testing SMS Functionality ===');
    
    // Test 1: Basic SMS sending
    console.log('\n--- Test 1: Basic SMS ---');
    try {
        const result = await sendSMS('254712345678', 'Test message from BomaFlow');
        console.log('Basic SMS Result:', result);
        if (result) {
            console.log('✅ Basic SMS sent successfully');
        } else {
            console.log('❌ Basic SMS failed');
        }
    } catch (error) {
        console.log('❌ Basic SMS error:', error.message);
    }
    
    // Test 2: Payment receipt SMS
    console.log('\n--- Test 2: Payment Receipt SMS ---');
    try {
        const result = await sendPaymentReceipt('254712345678', 'Test Tenant', 267);
        console.log('Payment Receipt Result:', result);
        if (result) {
            console.log('✅ Payment receipt sent successfully');
        } else {
            console.log('❌ Payment receipt failed');
        }
    } catch (error) {
        console.log('❌ Payment receipt error:', error.message);
    }
    
    // Test 3: Repair notification SMS
    console.log('\n--- Test 3: Repair Notification SMS ---');
    try {
        const result = await sendRepairNotification('254712345678', 'Test Tenant', 'A1', 'Water Issue', 'Leaking tap');
        console.log('Repair Notification Result:', result);
        if (result) {
            console.log('✅ Repair notification sent successfully');
        } else {
            console.log('❌ Repair notification failed');
        }
    } catch (error) {
        console.log('❌ Repair notification error:', error.message);
    }
    
    console.log('\n=== SMS Test Complete ===');
}

testSMSFunctionality().catch(console.error);
