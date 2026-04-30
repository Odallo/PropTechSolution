require('dotenv').config();
const { sendSMS } = require('./sms');

async function testSMS() {
    console.log('Testing SMS functionality...');
    console.log('API Key:', process.env.AFRICASTALKING_API_KEY ? 'Loaded' : 'Missing');
    console.log('Username:', process.env.AFRICASTALKING_USERNAME);
    console.log('Sender ID:', process.env.AFRICASTALKING_SENDER_ID);
    
    //real phone number
    const testPhones = [
        '+254797706866',  // Your real number with +
        '254797706866',   // Your real number without +
        '0797706866',     // Local format
        '797706866'       // Without prefix
    ];
    
    for (const phone of testPhones) {
        console.log(`\n--- Testing with: ${phone} ---`);
        const testMessage = `BomaFlow Test: Testing SMS with ${phone}`;
        
        try {
            const result = await sendSMS(phone, testMessage);
            
            if (result) {
                console.log('SMS sent successfully!');
                console.log('Response:', JSON.stringify(result, null, 2));
                break; // Stop if successful
            } else {
                console.log('SMS failed to send');
            }
        } catch (error) {
            console.error('Test failed:', error.message);
        }
    }
}

// Run the test
testSMS();
