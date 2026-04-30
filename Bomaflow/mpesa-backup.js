const https = require('https');
const crypto = require('crypto');
require('dotenv').config();

// M-Pesa configuration
const config = {
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    shortcode: process.env.MPESA_SHORTCODE,
    passkey: process.env.MPESA_PASSKEY,
    environment: process.env.MPESA_ENVIRONMENT || 'sandbox'
};

// M-Pesa API URLs
const MPESA_URLS = {
    sandbox: {
        oauth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        stkpush: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    },
    production: {
        oauth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        stkpush: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    }
};

// Get OAuth access token
async function getAccessToken() {
    return new Promise((resolve, reject) => {
        const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
        
        // Try using the full URL instead of hostname/path
        const url = config.environment === 'sandbox' 
            ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
            : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
        
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'User-Agent': 'BomaFlow/1.0',
                'Accept': 'application/json'
            }
        };
        
        console.log('OAuth URL:', url);
        console.log('OAuth Headers:', options.headers);
        
        const req = https.request(url, options, (res) => {
            let data = '';
            console.log('OAuth Response Status:', res.statusCode);
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log('OAuth Response Data:', data);
                try {
                    if (!data || data.trim() === '') {
                        reject(new Error('Empty response from OAuth endpoint'));
                        return;
                    }
                    const response = JSON.parse(data);
                    if (response.access_token) {
                        resolve(response.access_token);
                    } else {
                        reject(new Error('No access token in response'));
                    }
                } catch (error) {
                    console.error('OAuth JSON Parse Error:', error.message);
                    reject(new Error(`Failed to parse OAuth response: ${error.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('OAuth Request Error:', error.message);
            reject(error);
        });
        
        req.end();
    });
}

// Generate timestamp for STK Push
function getTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
}

// Generate password for STK Push
function getPassword() {
    const timestamp = getTimestamp();
    const passwordString = `${config.shortcode}${config.passkey}${timestamp}`;
    return Buffer.from(passwordString).toString('base64');
}

// Send STK Push request
async function sendSTKPush(phoneNumber, amount, accountReference, transactionDesc = 'BomaFlow Rent Payment') {
    try {
        // Format phone number (remove +254 if present and add 254)
        let formattedPhone = phoneNumber.toString();
        if (formattedPhone.startsWith('+254')) {
            formattedPhone = formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('254')) {
            formattedPhone = formattedPhone;
        } else if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        } else {
            formattedPhone = '254' + formattedPhone;
        }
        
        // Ensure phone number is 12 digits
        if (formattedPhone.length !== 12) {
            throw new Error('Invalid phone number format');
        }
        
        // Prepare STK Push request first
        const timestamp = getTimestamp();
        const password = getPassword();
        
        const requestBody = {
            BusinessShortCode: config.shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: config.shortcode,
            PhoneNumber: formattedPhone,
            CallBackURL: process.env.MPESA_CALLBACK_URL || 'https://your-domain.com/mpesa/callback',
            AccountReference: accountReference,
            TransactionDesc: transactionDesc
        };
        
        // Get access token and immediately use it
        const accessToken = await getAccessToken();
        
        // Make STK Push request
        const response = await makeSTKPushRequest(accessToken, requestBody);
        
        return {
            success: true,
            message: 'STK Push sent successfully',
            data: response
        };
        
    } catch (error) {
        console.error('STK Push error:', error.message);
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
}

// Make STK Push HTTP request
function makeSTKPushRequest(accessToken, requestBody) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(requestBody);
        
        // Try using full URL like OAuth
        const url = config.environment === 'sandbox' 
            ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
            : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
        
        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'BomaFlow/1.0',
                'Accept': 'application/json'
            }
        };
        
        console.log('STK Push URL:', url);
        console.log('STK Push Request:', JSON.stringify(requestBody, null, 2));
        
        const req = https.request(url, options, (res) => {
            let data = '';
            console.log('STK Push Response Status:', res.statusCode);
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log('STK Push Response Data:', data);
                try {
                    if (!data || data.trim() === '') {
                        reject(new Error('Empty response from M-Pesa API'));
                        return;
                    }
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    console.error('STK Push JSON Parse Error:', error.message);
                    reject(new Error(`Failed to parse M-Pesa response: ${error.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('STK Push Request Error:', error.message);
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

// Handle M-Pesa callback
function handleCallback(callbackData) {
    try {
        const { Body } = callbackData;
        const { stkCallback } = Body;
        
        const resultCode = stkCallback.ResultCode;
        const resultDesc = stkCallback.ResultDesc;
        const merchantRequestID = stkCallback.MerchantRequestID;
        const checkoutRequestID = stkCallback.CheckoutRequestID;
        
        if (resultCode === 0) {
            // Payment successful
            const callbackMetadata = stkCallback.CallbackMetadata;
            let amount, mpesaReceiptNumber, phoneNumber;
            
            callbackMetadata.Item.forEach(item => {
                switch (item.Name) {
                    case 'Amount':
                        amount = item.Value;
                        break;
                    case 'MpesaReceiptNumber':
                        mpesaReceiptNumber = item.Value;
                        break;
                    case 'PhoneNumber':
                        phoneNumber = item.Value;
                        break;
                }
            });
            
            return {
                success: true,
                resultCode,
                resultDesc,
                merchantRequestID,
                checkoutRequestID,
                amount,
                mpesaReceiptNumber,
                phoneNumber
            };
        } else {
            // Payment failed
            return {
                success: false,
                resultCode,
                resultDesc,
                merchantRequestID,
                checkoutRequestID
            };
        }
    } catch (error) {
        console.error('Callback processing error:', error);
        return {
            success: false,
            error: 'Failed to process callback'
        };
    }
}

module.exports = {
    sendSTKPush,
    handleCallback,
    getAccessToken
};
