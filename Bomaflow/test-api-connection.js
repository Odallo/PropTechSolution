require('dotenv').config();
const africastalking = require('africastalking');

// Test basic API connection
async function testAPIConnection() {
    console.log('Testing Africa\'s Talking API connection...');
    console.log('Username:', process.env.AFRICASTALKING_USERNAME);
    console.log('API Key:', process.env.AFRICASTALKING_API_KEY ? '✅ Loaded' : '❌ Missing');
    
    try {
        const credentials = {
            apiKey: process.env.AFRICASTALKING_API_KEY,
            username: process.env.AFRICASTALKING_USERNAME
        };
        
        const AT = africastalking(credentials);
        const sms = AT.SMS;
        
        // Test API by trying to get balance or checking service status
        console.log('Initializing SMS service...');
        
        // Try a simple test with minimal options
        const testOptions = {
            to: ['+254797706866'],
            message: 'Test message from BomaFlow',
            enqueue: true  // Try with enqueue option
        };
        
        console.log('Test options:', JSON.stringify(testOptions, null, 2));
        
        const response = await sms.send(testOptions);
        console.log('✅ API Response:', JSON.stringify(response, null, 2));
        
    } catch (error) {
        console.error('❌ API Connection failed:', error.message);
        console.error('Full error:', error);
        
        // Try alternative approach
        try {
            console.log('\nTrying alternative approach...');
            const AT = africastalking({
                apiKey: process.env.AFRICASTALKING_API_KEY,
                username: process.env.AFRICASTALKING_USERNAME
            });
            
            // Test without enqueue
            const altOptions = {
                to: ['254797706866'],
                message: 'Alternative test from BomaFlow'
            };
            
            const altResponse = await AT.SMS.send(altOptions);
            console.log('✅ Alternative API Response:', JSON.stringify(altResponse, null, 2));
            
        } catch (altError) {
            console.error('❌ Alternative approach also failed:', altError.message);
        }
    }
}

testAPIConnection();
