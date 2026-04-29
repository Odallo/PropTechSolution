require('dotenv').config();
const express = require('express');
const db = require('./database');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
        
        let response = `END ✅ Paid 200 KES!\nYour balance: ${balance} KES\n`;
        
        // Check if reached 6000 KES target
        const reachedTarget = await db.hasReachedTarget(phone);
        
        if (reachedTarget && balance >= 6000) {
            const user = await db.getUser(phone);
            const landlordPhone = user?.landlord_phone || '254712345678'; // fallback landlord number
            
            // Record month completion
            await db.completeMonth(phone, landlordPhone, 6000);
            
            response += `\n🎉 CONGRATULATIONS! 🎉\n`;
            response += `You've reached 6,000 KES!\n`;
            response += `Your rent payment has been processed.\n`;
            response += `Starting fresh for next month.`;
            
            // In the next step, we'll add real SMS here
            console.log(`📱 MONTH COMPLETE: Tenant ${phone} paid 6000 KES to landlord ${landlordPhone}`);
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
        // My Info
        const user = await db.getUser(phone);
        if (user) {
            const response = `END 📋 Name: ${user.name}\nBuilding: ${user.building}\nHouse: ${user.house}\nBalance: ${user.balance} KES`;
            return res.send(response);
        } else {
            const response = `END You are not registered. Please contact your landlord.`;
            return res.send(response);
        }
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