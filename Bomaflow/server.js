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
        let response = `CON Welcome to BomaFlow!\n`;
        response += `1. Pay 200 KES\n`;
        response += `2. Check Balance\n`;
        response += `3. My Info`;
        return res.send(response);
    }
    
    // Handle menu choices
    if (text === '1') {
        // Pay 200 KES
        await db.addPayment(phone, 200);
        const balance = await db.getBalance(phone);
        const user = await db.getUser(phone);
        
        // Send SMS receipt
        const sms = require('./sms');
        await sms.sendPaymentReceipt(phone, 200, balance);
        
        let response = `END ✅ Paid 200 KES!\nYour balance: ${balance} KES\nSMS receipt sent.\n`;
        
        // Check if reached 6000 KES target
        const reachedTarget = await db.hasReachedTarget(phone);
        
        if (reachedTarget && balance >= 6000) {
            const landlordPhone = user?.landlord_phone || '254712345678';
            
            // Record month completion
            await db.completeMonth(phone, landlordPhone, 6000);
            
            // Send month completion SMS to both parties
            await sms.sendMonthCompleteMessage(phone, user?.name || 'Tenant', landlordPhone, 6000);
            
            response += `\n🎉 CONGRATULATIONS! 🎉\n`;
            response += `You've reached 6,000 KES!\n`;
            response += `Your rent payment has been processed.\n`;
            response += `Starting fresh for next month.\n`;
            response += `Check your phone for SMS!`;
        }
        
        return res.send(response);
    }
    
    if (text === '2') {
        // Check balance
        const balance = await db.getBalance(phone);
        const response = `END 💰 Your current rent savings: ${balance} KES\nKeep going!`;
        return res.send(response);
    }
    
    if (text === '3') {
        // My Info - auto-register if new user
        let user = await db.getUser(phone);
        
        if (!user) {
            // Auto-register new user with placeholder name and landlord
            await db.saveUser(phone, `User${phone.slice(-4)}`, 'Unknown Building', 'Unknown', '254712345678');
            user = await db.getUser(phone);
            const response = `END 📋 Welcome! You've been registered.\nName: ${user.name}\nBalance: 0 KES\n\nAsk your landlord to update your building details.`;
            return res.send(response);
        }
        
        const response = `END 📋 Name: ${user.name}\nBuilding: ${user.building}\nHouse: ${user.house}\nBalance: ${user.balance} KES\nLandlord: ${user.landlord_phone || 'Not set'}`;
        return res.send(response);
    }
    
    // Default fallback
    res.send(`END Invalid option. Try again.`);
});

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'BomaFlow API is running', status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ BomaFlow running on http://localhost:${PORT}`);
    console.log(`📱 USSD endpoint: POST http://localhost:${PORT}/ussd`);
});