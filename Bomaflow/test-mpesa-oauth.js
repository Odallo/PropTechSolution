require('dotenv').config();
const https = require('https');

// Test M-Pesa OAuth with different approaches
async function testOAuth() {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    
    console.log('=== M-Pesa OAuth Test ===');
    console.log('Consumer Key:', consumerKey ? 'Present' : 'Missing');
    console.log('Consumer Secret:', consumerSecret ? 'Present' : 'Missing');
    
    if (!consumerKey || !consumerSecret) {
        console.log('ERROR: M-Pesa credentials missing');
        return false;
    }
    
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    console.log('Auth header length:', auth.length);
    
    // Test 1: GET request (current approach)
    console.log('\n--- Test 1: GET Request ---');
    await testOAuthRequest('GET', auth);
    
    // Test 2: POST request (alternative approach)
    console.log('\n--- Test 2: POST Request ---');
    await testOAuthRequest('POST', auth);
    
    return true;
}

async function testOAuthRequest(method, auth) {
    return new Promise((resolve) => {
        const url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
        
        const options = {
            method: method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'User-Agent': 'BomaFlow/1.0',
                'Accept': 'application/json'
            }
        };
        
        console.log(`Making ${method} request...`);
        
        const req = https.request(url, options, (res) => {
            console.log(`Status: ${res.statusCode}`);
            console.log(`Content-Type: ${res.headers['content-type']}`);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log(`Response body: "${data}"`);
                console.log(`Response length: ${data.length}`);
                
                if (data && data.trim() !== '') {
                    try {
                        const parsed = JSON.parse(data);
                        console.log('✅ SUCCESS: Valid JSON response');
                        if (parsed.access_token) {
                            console.log(`✅ Access token found (${parsed.access_token.length} chars)`);
                        } else {
                            console.log('❌ No access token in response');
                        }
                    } catch (e) {
                        console.log('❌ JSON parse error:', e.message);
                    }
                } else {
                    console.log('❌ Empty response body');
                }
                
                resolve();
            });
        });
        
        req.on('error', (e) => {
            console.log('❌ Request error:', e.message);
            resolve();
        });
        
        req.end();
    });
}

testOAuth().then(() => {
    console.log('\n=== OAuth Test Complete ===');
}).catch(console.error);
