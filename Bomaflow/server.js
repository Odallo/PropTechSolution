require('dotenv').config();
const express = require('express');
const db = require('./database');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// USSD webhook - Africa's Talking will call this
app.post('/ussd', async (req, res) => {
    const phone = req.body.phoneNumber;
    const text = req.body.text || '';
    
    console.log(`USSD Request from ${phone}: text = "${text}"`);
    
    // First menu (text is empty)
    if (text === '') {
        let user = await db.getUser(phone);
        let targetRent = user ? (user.monthly_rent || 6000) : 6000;
        let dailyAmount = Math.ceil(targetRent / 30);

        let response = `CON Welcome to BomaFlow!\n`;
        response += `1. Pay ${dailyAmount} KES\n`;
        response += `2. Check Balance\n`;
        response += `3. My Info\n`;
        response += `4. Report Repair`;
        return res.send(response);
    }
    
    // Handle menu choices
    if (text === '1') {
        let user = await db.getUser(phone);
        let targetRent = user ? (user.monthly_rent || 6000) : 6000;
        let dailyAmount = Math.ceil(targetRent / 30);

        // Initiate M-Pesa STK Push
        const mpesa = require('./mpesa');
        const accountReference = `BomaFlow-${phone.slice(-4)}`;
        
        try {
            const stkResult = await mpesa.sendSTKPush(phone, dailyAmount, accountReference);
            
            if (stkResult.success) {
                // Store pending payment for callback processing
                const pendingPayment = {
                    phone: phone,
                    amount: dailyAmount,
                    accountReference: accountReference,
                    merchantRequestID: stkResult.data.MerchantRequestID,
                    checkoutRequestID: stkResult.data.CheckoutRequestID,
                    timestamp: new Date().toISOString()
                };
                
                // For now, we'll store in memory (in production, use database)
                if (!global.pendingPayments) {
                    global.pendingPayments = {};
                }
                global.pendingPayments[stkResult.data.CheckoutRequestID] = pendingPayment;
                
                const response = `END M-Pesa payment initiated!\nAmount: ${dailyAmount} KES\nPlease enter your M-Pesa PIN to complete payment.\nReference: ${accountReference}`;
                return res.send(response);
            } else {
                const response = `END Payment failed: ${stkResult.message}\nPlease try again later or contact support.`;
                return res.send(response);
            }
        } catch (error) {
            console.error('M-Pesa STK Push error:', error.message);
            
            try {
                // Fallback to manual payment if M-Pesa fails
                await db.addPayment(phone, dailyAmount);
                const balance = await db.getBalance(phone);
                user = await db.getUser(phone);
                
                // Send SMS receipt
                const sms = require('./sms');
                await sms.sendPaymentReceipt(phone, dailyAmount, balance);
                
                let response = `END Paid ${dailyAmount} KES!\nYour balance: ${balance} KES\nSMS receipt sent.\n`;
                
                // Check if reached personal target
                const reachedTarget = await db.hasReachedTarget(phone);
                
                if (reachedTarget && balance >= targetRent) {
                    const landlordPhone = user?.landlord_phone || '254712345678';
                    
                    // Record month completion
                    await db.completeMonth(phone, landlordPhone, targetRent);
                    
                    // Send month completion SMS to both parties
                    await sms.sendMonthCompleteMessage(phone, user?.name || 'Tenant', landlordPhone, targetRent);
                    
                    response += `\nCONGRATULATIONS!\n`;
                    response += `You've reached ${targetRent} KES!\n`;
                    response += `Your rent payment has been processed.\n`;
                    response += `Starting fresh for next month.\n`;
                    response += `Check your phone for SMS!`;
                }
                
                return res.send(response);
                
            } catch (fallbackError) {
                console.error('Manual payment fallback error:', fallbackError.message);
                const response = `END Payment system temporarily unavailable.\nPlease try again later or contact your landlord directly.`;
                return res.send(response);
            }
        }
    }
    
    if (text === '2') {
        // Check balance
        const balance = await db.getBalance(phone);
        const response = `END Your current rent savings: ${balance} KES`;
        return res.send(response);
    }
    
    if (text === '3') {
        // My Info - auto-register if new user
        let user = await db.getUser(phone);
        
        if (!user) {
            // Auto-register new user with placeholder name and landlord
            await db.saveUser(phone, `User${phone.slice(-4)}`, 'Unknown Building', 'Unknown', '254712345678');
            user = await db.getUser(phone);
            const response = `END Welcome! You've been registered.\nName: ${user.name}\nBalance: 0 KES\n\nAsk your landlord to update your building details.`;
            return res.send(response);
        }
        
        const response = `END Name: ${user.name}\nBuilding: ${user.building}\nHouse: ${user.house}\nRent: ${user.monthly_rent || 6000} KES\nBalance: ${user.balance} KES\nLandlord: ${user.landlord_phone || 'Not set'}`;
        return res.send(response);
    }
    
    // Handle repair request
    if (text === '4') {
        let response = `CON Report Repair Issue:\n`;
        response += `1. Water Issue\n`;
        response += `2. Electrical Problem\n`;
        response += `3. Structural Issue\n`;
        response += `4. Other (Enter description)`;
        return res.send(response);
    }
    
    // Handle repair sub-menu
    if (text.startsWith('4*')) {
        const parts = text.split('*');
        const repairType = parts[1];
        let user = await db.getUser(phone);
        
        if (repairType === '1') {
            await db.saveRepair(phone, 'Water Issue', 'Water leak or plumbing problem reported via USSD');
            
            // Send SMS notification to landlord
            const sms = require('./sms');
            await sms.sendRepairNotification(user.landlord_phone, user.name, user.house, 'Water Issue', 'Water leak or plumbing problem');
            
            const response = `END Repair request submitted!\nIssue: Water Issue\nWe'll notify your landlord.\nReference: ${phone.slice(-4)}`;
            return res.send(response);
        }
        
        if (repairType === '2') {
            await db.saveRepair(phone, 'Electrical Problem', 'Electrical issue reported via USSD');
            
            // Send SMS notification to landlord
            const sms = require('./sms');
            await sms.sendRepairNotification(user.landlord_phone, user.name, user.house, 'Electrical Problem', 'Electrical issue reported via USSD');
            
            const response = `END Repair request submitted!\nIssue: Electrical Problem\nWe'll notify your landlord.\nReference: ${phone.slice(-4)}`;
            return res.send(response);
        }
        
        if (repairType === '3') {
            await db.saveRepair(phone, 'Structural Issue', 'Structural problem reported via USSD');
            
            // Send SMS notification to landlord
            const sms = require('./sms');
            await sms.sendRepairNotification(user.landlord_phone, user.name, user.house, 'Structural Issue', 'Structural problem reported via USSD');
            
            const response = `END Repair request submitted!\nIssue: Structural Issue\nWe'll notify your landlord.\nReference: ${phone.slice(-4)}`;
            return res.send(response);
        }
        
        if (repairType === '4') {
            const response = `CON Please describe your repair issue:\n(Max 100 characters)`;
            return res.send(response);
        }
        
        // Handle custom description (4*4 followed by description)
        if (parts[1] === '4' && parts[2]) {
            const description = parts[2].substring(0, 100); // Limit to 100 chars
            await db.saveRepair(phone, 'Other Issue', description);
            
            // Send SMS notification to landlord
            const sms = require('./sms');
            await sms.sendRepairNotification(user.landlord_phone, user.name, user.house, 'Other Issue', description);
            
            const response = `END Repair request submitted!\nIssue: ${description}\nWe'll notify your landlord.\nReference: ${phone.slice(-4)}`;
            return res.send(response);
        }
    }
    
    // Default fallback
    res.send(`END Invalid option. Try again.`);
});

// Landlord Dashboard - View all tenants
app.get('/dashboard/:landlordPhone', async (req, res) => {
    const landlordPhone = req.params.landlordPhone;
    
    // Get landlord data (don't auto-create for demo)
    const landlord = await db.getUser(landlordPhone);
    
    // For demo purposes, allow dashboard access even if landlord doesn't exist
    // In production, you might want to restrict this to actual landlords only
    
    // Get all tenants for this landlord
    const tenants = await db.getTenantsByLandlord(landlordPhone);
    
    // Get payment history for each tenant
    for (let tenant of tenants) {
        tenant.payments = await db.getMonthlyPayments(tenant.phone);
        tenant.recentPayments = tenant.payments.slice(-5); // Last 5 payments
    }
    
    // Get total collected this month
    let totalCollected = 0;
    for (let tenant of tenants) {
        totalCollected += tenant.balance;
    }
    
    // Get repair requests for this landlord
    const repairs = await db.getLandlordRepairs(landlordPhone);
    
    res.render('dashboard', {
        landlordPhone,
        tenants,
        totalCollected,
        repairs,
        currentDate: new Date().toLocaleDateString()
    });
});

// API endpoint for dashboard (JSON version - for potential frontend AJAX)
app.get('/api/landlord/:landlordPhone', async (req, res) => {
    const landlordPhone = req.params.landlordPhone;
    const tenants = await db.getTenantsByLandlord(landlordPhone);
    
    res.json({
        landlord: landlordPhone,
        tenants: tenants,
        totalCollected: tenants.reduce((sum, t) => sum + t.balance, 0)
    });
});

// Simple landing page with demo links
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>BomaFlow</title>
            <style>
                body { font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; }
                h1 { color: #2c3e50; }
                .demo-links { margin-top: 30px; }
                a { display: block; margin: 10px 0; color: #3498db; text-decoration: none; }
                a:hover { text-decoration: underline; }
                .code { background: #f4f4f4; padding: 10px; border-radius: 5px; font-family: monospace; }
            </style>
        </head>
        <body>
            <h1>BomaFlow</h1>
            <p>Micro-savings for rent. Pay your daily portion to hit your monthly rent target.</p>
            
            <h2>Landlord Dashboard:</h2>
            <div class="demo-links">
                <a href="/dashboard/254712345678">James Landlord (Sunrise Apartments)</a>
            </div>
            
            <h2>USSD Testing:</h2>
            <div class="code">
                curl -X POST http://localhost:3000/ussd -d "phoneNumber=254711111111" -d "text=" -d "sessionId=test"
            </div>
            
            <h2>Test Numbers:</h2>
            <ul>
                <li>Mary (Tenant): 254711111111 (600 KES balance, 6,000 KES rent)</li>
                <li>John (Tenant): 254722222222 (0 KES balance, 9,000 KES rent)</li>
                <li>Sarah (Tenant): 254733333333 (0 KES balance, 15,000 KES rent)</li>
            </ul>
        </body>
        </html>
    `);
});

// Tenant Management API Endpoints

// Add new tenant
app.post('/api/tenants', async (req, res) => {
    try {
        const { phone, name, building, house, monthlyRent, landlordPhone } = req.body;
        
        // Validate required fields
        if (!phone || !name || !building || !house || !landlordPhone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: phone, name, building, house, landlordPhone' 
            });
        }
        
        // Validate phone number format
        if (!/^254\d{9}$/.test(phone)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid phone number format. Use format: 254XXXXXXXXX' 
            });
        }
        
        // Add tenant
        const result = await db.addTenant(phone, name, building, house, landlordPhone, monthlyRent);
        
        res.json({ 
            success: true, 
            message: 'Tenant added successfully',
            tenant: result
        });
        
    } catch (error) {
        console.error('Error adding tenant:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to add tenant' 
        });
    }
});

// Remove tenant
app.delete('/api/tenants/:phone', async (req, res) => {
    try {
        const phone = req.params.phone;
        
        // Validate phone number format
        if (!/^254\d{9}$/.test(phone)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid phone number format' 
            });
        }
        
        // Remove tenant
        const result = await db.removeTenant(phone);
        
        if (result.deleted) {
            res.json({ 
                success: true, 
                message: 'Tenant removed successfully' 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: 'Tenant not found' 
            });
        }
        
    } catch (error) {
        console.error('Error removing tenant:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to remove tenant' 
        });
    }
});

// Update tenant
app.put('/api/tenants/:phone', async (req, res) => {
    try {
        const phone = req.params.phone;
        const updates = req.body;
        
        // Update tenant
        const result = await db.updateTenant(phone, updates);
        
        if (result.updated) {
            res.json({ 
                success: true, 
                message: 'Tenant updated successfully' 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: 'Tenant not found or no valid fields to update' 
            });
        }
        
    } catch (error) {
        console.error('Error updating tenant:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to update tenant' 
        });
    }
});

// M-Pesa Callback endpoint
app.post('/mpesa/callback', async (req, res) => {
    try {
        const mpesa = require('./mpesa');
        const callbackData = req.body;
        
        console.log('M-Pesa callback received:', JSON.stringify(callbackData, null, 2));
        
        // Process the callback
        const result = mpesa.handleCallback(callbackData);
        
        if (result.success) {
            // Payment successful - process the payment
            const { checkoutRequestID, amount, phoneNumber } = result;
            
            // Check if this is a pending payment from our system
            if (global.pendingPayments && global.pendingPayments[checkoutRequestID]) {
                const pendingPayment = global.pendingPayments[checkoutRequestID];
                
                // Add payment to database
                await db.addPayment(pendingPayment.phone, amount);
                const balance = await db.getBalance(pendingPayment.phone);
                const user = await db.getUser(pendingPayment.phone);
                
                // Send SMS receipt
                const sms = require('./sms');
                await sms.sendPaymentReceipt(pendingPayment.phone, amount, balance);
                
                // Check if reached target
                const targetRent = user ? (user.monthly_rent || 6000) : 6000;
                const reachedTarget = await db.hasReachedTarget(pendingPayment.phone);
                
                if (reachedTarget && balance >= targetRent) {
                    const landlordPhone = user?.landlord_phone || '254712345678';
                    
                    // Record month completion
                    await db.completeMonth(pendingPayment.phone, landlordPhone, targetRent);
                    
                    // Send month completion SMS
                    await sms.sendMonthCompleteMessage(pendingPayment.phone, user?.name || 'Tenant', landlordPhone, targetRent);
                }
                
                // Remove from pending payments
                delete global.pendingPayments[checkoutRequestID];
                
                console.log(`Payment processed: ${amount} KES from ${pendingPayment.phone}`);
            }
        } else {
            // Payment failed
            console.log(`Payment failed: ${result.resultDesc}`);
        }
        
        // Always respond to M-Pesa callback
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
        
    } catch (error) {
        console.error('M-Pesa callback error:', error);
        res.json({ ResultCode: 1, ResultDesc: 'Failed' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`BomaFlow running on http://localhost:${PORT}`);
    console.log(`USSD endpoint: POST http://localhost:${PORT}/ussd`);
    console.log(`M-Pesa callback: POST http://localhost:${PORT}/mpesa/callback`);
});