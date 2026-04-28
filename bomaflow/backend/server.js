require('dotenv').config();
const express = require('express');
const cors = require('cors');
const database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// USSD WEBHOOK
// Africa's Talking will POST to this endpoint when user dials *384#
app.post('/ussd', async (req, res) => {
    console.log('USSD Request received:', req.body);
    
    // Get data from Africa's Talking
    const sessionId = req.body.sessionId;
    const phone = req.body.phoneNumber;
    const text = req.body.text || ''; // text is empty for first menu
    
    let response = '';
    
    // Level 0: First menu (text is empty)
    if (text === '') {
        response = `CON Welcome to BomaFlow! 
1 Pay Daily Rent (200 KES)
2 Check My Balance
3 Report a Repair
4 Escalate Repair
5 Get Rent Receipt`;
        
        return res.send(response);
    }
    
    // Split the user's input by * to track menu level
    // e.g., "1*2" means user selected option 1, then option 2
    const input = text.split('*');
    const level = input.length;
    const choice = input[level - 1];
    
    // Level 1: Main menu choices
    if (level === 1) {
        switch(choice) {
            case '1':
                // Pay Daily Rent
                response = `CON Confirm payment:
Daily rent: 200 KES
1 Confirm
2 Cancel`;
                break;
                
            case '2':
                // Check Balance
                const balance = await database.getMonthlyBalance(phone);
                response = `END Your current balance this month: ${balance} KES
Keep saving daily to reach your rent target!`;
                break;
                
            case '3':
                // Report Repair
                response = `CON Describe the issue:
1 Water leak
2 Electrical problem
3 Broken appliance
4 Other (describe in next step)`;
                break;
                
            case '4':
                // Escalate Repair (to be implemented)
                response = `END Feature coming soon: Voice call to landlord.
Please report the repair first using option 3.`;
                break;
                
            case '5':
                // Get Receipt
                const currentBalance = await database.getMonthlyBalance(phone);
                response = `END BomaFlow Receipt
Phone: ${phone}
Amount saved this month: ${currentBalance} KES
Thank you for using BomaFlow!`;
                break;
                
            default:
                response = `END Invalid option. Please try again.`;
        }
        return res.send(response);
    }
    
    // Level 2: Sub-menu choices (when user has selected an option and is going deeper)
    if (level === 2) {
        const mainChoice = input[0];
        
        // Handle payment confirmation (main choice 1)
        if (mainChoice === '1' && choice === '1') {
            // Save the payment to database
            await database.savePayment(phone, 200);
            const newBalance = await database.getMonthlyBalance(phone);
            
            response = `END Payment successful!
200 KES saved
Total this month: ${newBalance} KES
SMS receipt has been sent to your phone.
            
Keep going! You're building your rent `;
            
            // Send SMS receipt (Bonus: use Africa's Talking SMS API here)
            console.log(`SMS receipt would be sent to ${phone}`);
        }
        else if (mainChoice === '1' && choice === '2') {
            response = `END Payment cancelled.`;
        }
        
        // Handle repair reporting (main choice 3)
        else if (mainChoice === '3') {
            let description = '';
            switch(choice) {
                case '1': description = 'Water leak'; break;
                case '2': description = 'Electrical problem'; break;
                case '3': description = 'Broken appliance'; break;
                default: description = 'Other issue';
            }
            
            // Get user details to know which building
            const user = await database.getUser(phone);
            const building = user?.building_name || 'Unknown Building';
            const house = user?.house_number || 'Unknown House';
            
            await database.saveRepair(phone, building, house, description);
            
            response = `END Repair reported: ${description}
Landlord has been notified.
Reference ID: ${Date.now()}
            
We'll follow up within 24 hours.`;
            
            // TODO: Send SMS to landlord
            console.log(`Repair report: ${building} - ${house}: ${description}`);
        }
        else {
            response = `END Invalid selection.`;
        }
        
        return res.send(response);
    }
    
    // Fallback for any unhandled cases
    response = `END Something went wrong. Please try again.`;
    res.send(response);
});

//HEALTH CHECK
app.get('/health', (req, res) => {
    res.json({ status: 'BomaFlow is running!', timestamp: new Date() });
});

//START SERVER
app.listen(PORT, () => {
    console.log(`BomaFlow backend running on http://localhost:${PORT}`);
    console.log(`USSD webhook endpoint: http://localhost:${PORT}/ussd`);
    console.log(`Database: bomaflow.db`);
});