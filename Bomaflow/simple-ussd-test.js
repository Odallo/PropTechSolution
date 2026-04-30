require('dotenv').config();

// Simple USSD Test Script
async function testUSSDFlow() {
    console.log('BomaFlow USSD Test');
    console.log('====================');
    
    const baseURL = 'http://localhost:3000';
    const phoneNumber = '254711111111'; // Mary
    const sessionId = `TEST-${Date.now()}`;
    
    console.log(`Testing with: ${phoneNumber}`);
    console.log(`Session: ${sessionId}`);
    console.log(`\n--- Test 1: Start USSD Session ---\n`);
    
    // Test 1: Start session
    try {
        const formData = new URLSearchParams();
        formData.append('phoneNumber', phoneNumber);
        formData.append('text', '');
        formData.append('sessionId', sessionId);

        const response = await fetch(`${baseURL}/ussd`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        const result = await response.text();
        console.log('Main Menu:');
        console.log(result);
        
        // Test 2: Make payment
        console.log(`\n--- Test 2: Make Payment ---\n`);
        
        const paymentData = new URLSearchParams();
        paymentData.append('phoneNumber', phoneNumber);
        paymentData.append('text', '1');
        paymentData.append('sessionId', sessionId);

        const paymentResponse = await fetch(`${baseURL}/ussd`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: paymentData
        });

        const paymentResult = await paymentResponse.text();
        console.log('Payment Response:');
        console.log(paymentResult);
        
        // Test 3: Repair request
        console.log(`\n--- Test 3: Repair Request ---\n`);
        
        const repairSessionId = `REPAIR-${Date.now()}`;
        const repairData = new URLSearchParams();
        repairData.append('phoneNumber', '254722222222'); // John
        repairData.append('text', '4');
        repairData.append('sessionId', repairSessionId);

        const repairResponse = await fetch(`${baseURL}/ussd`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: repairData
        });

        const repairResult = await repairResponse.text();
        console.log('Repair Menu:');
        console.log(repairResult);
        
        // Test 4: Water issue
        console.log(`\n--- Test 4: Water Issue ---\n`);
        
        const waterData = new URLSearchParams();
        waterData.append('phoneNumber', '254722222222');
        waterData.append('text', '4*1');
        waterData.append('sessionId', repairSessionId);

        const waterResponse = await fetch(`${baseURL}/ussd`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: waterData
        });

        const waterResult = await waterResponse.text();
        console.log('Water Issue Response:');
        console.log(waterResult);
        
        // Test 5: Balance check
        console.log(`\n--- Test 5: Balance Check ---\n`);
        
        const balanceSessionId = `BALANCE-${Date.now()}`;
        const balanceData = new URLSearchParams();
        balanceData.append('phoneNumber', '254733333333'); // Sarah
        balanceData.append('text', '2');
        balanceData.append('sessionId', balanceSessionId);

        const balanceResponse = await fetch(`${baseURL}/ussd`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: balanceData
        });

        const balanceResult = await balanceResponse.text();
        console.log('Balance Response:');
        console.log(balanceResult);
        
        console.log(`\nAll tests completed!`);
        console.log(`Check dashboard: http://localhost:3000/dashboard/254712345678`);
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Run the test
testUSSDFlow();
