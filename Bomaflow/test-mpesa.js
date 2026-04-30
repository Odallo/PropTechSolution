require('dotenv').config();
const mpesa = require('./mpesa');

async function testMpesaIntegration() {
    console.log('Testing M-Pesa Integration...');
    console.log(`Environment: ${process.env.MPESA_ENVIRONMENT}`);
    console.log(`Consumer Key: ${process.env.MPESA_CONSUMER_KEY ? 'Loaded' : 'Missing'}`);
    console.log(`Consumer Secret: ${process.env.MPESA_CONSUMER_SECRET ? 'Loaded' : 'Missing'}`);
    console.log('Shortcode:', process.env.MPESA_SHORTCODE);
    console.log(`Passkey: ${process.env.MPESA_PASSKEY ? 'Loaded' : 'Missing'}`);
    
    // Test access token
    try {
        console.log('\n--- Testing Access Token ---');
        const accessToken = await mpesa.getAccessToken();
        console.log('Access token obtained successfully');
        console.log(`Token length: ${accessToken.length}`);
    } catch (error) {
        console.error(`Failed to get access token: ${error.message}`);
        return;
    }
    
    // Test STK Push (with test phone number)
    try {
        console.log('\n--- Testing STK Push ---');
        const testPhone = '254711111111'; // Mary's number
        const testAmount = 1; // Test with 1 KES
        const accountRef = 'TEST-BomaFlow';
        
        const result = await mpesa.sendSTKPush(testPhone, testAmount, accountRef);
        
        if (result.success) {
            console.log('STK Push sent successfully');
            console.log(`MerchantRequestID: ${result.data.MerchantRequestID}`);
            console.log(`CheckoutRequestID: ${result.data.CheckoutRequestID}`);
            console.log(`CustomerMessage: ${result.data.CustomerMessage}`);
        } else {
            console.error(`STK Push failed: ${result.message}`);
        }
    } catch (error) {
        console.error(`STK Push error: ${error.message}`);
    }
}

// Run the test
testMpesaIntegration();
