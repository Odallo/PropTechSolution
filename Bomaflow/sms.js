const africastalking = require('africastalking');

// Initialize Africa's Talking
const credentials = {
    apiKey: process.env.AFRICASTALKING_API_KEY,
    username: process.env.AFRICASTALKING_USERNAME
};

const AT = africastalking(credentials);
const sms = AT.SMS;

// Send SMS to a single recipient
async function sendSMS(phoneNumber, message) {
    try {
        // Format phone number for Africa's Talking - keep + sign for validation
        let formattedPhone = phoneNumber.toString();
        
        // If starts with 0, replace with +254
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '+254' + formattedPhone.substring(1);
        }
        // If doesn't start with +254, add +254
        else if (!formattedPhone.startsWith('+254')) {
            formattedPhone = '+254' + formattedPhone;
        }
        
        // Ensure it's exactly 13 characters (+254 + 9 digits)
        if (formattedPhone.length !== 13) {
            throw new Error(`Invalid phone number format: ${phoneNumber}`);
        }
        
        // Use enqueue option for better delivery - try without custom sender ID first
        const options = {
            to: [formattedPhone],
            message: message,
            enqueue: true
        };
        
        console.log(`Attempting to send SMS to ${formattedPhone}...`);
        console.log('Options:', JSON.stringify(options, null, 2));
        
        const response = await sms.send(options);
        console.log(`SMS sent successfully to ${formattedPhone}`);
        return response;
        
    } catch (error) {
        console.error(`SMS failed to ${phoneNumber}:`, error.message);
        
        // Try with sender ID if first attempt failed
        try {
            let retryPhone = phoneNumber.toString();
            if (retryPhone.startsWith('+')) {
                retryPhone = retryPhone.substring(1);
            }
            if (retryPhone.startsWith('0')) {
                retryPhone = '254' + retryPhone.substring(1);
            }
            if (!retryPhone.startsWith('254')) {
                retryPhone = '254' + retryPhone;
            }
            
            const optionsWithSender = {
                to: [retryPhone],
                message: message,
                from: process.env.AFRICASTALKING_SENDER_ID || 'BomaFlow'
            };
            
            console.log(`Retrying with sender ID for ${retryPhone}...`);
            const response = await sms.send(optionsWithSender);
            console.log(`SMS sent successfully to ${retryPhone} with sender ID`);
            return response;
        } catch (retryError) {
            console.error(`Retry failed:`, retryError.message);
            return null;
        }
    }
}

// Send daily reminder to a tenant
async function sendDailyReminder(phone, name, balance, dailyAmount) {
    const message = `BomaFlow: Hi ${name}. Time to save ${dailyAmount} KES for rent. Dial *384# now. Your current savings: ${balance} KES this month.`;
    return await sendSMS(phone, message);
}

// Send payment receipt
async function sendPaymentReceipt(phone, amount, newBalance) {
    const message = `BomaFlow Receipt: You've paid ${amount} KES. Total savings this month: ${newBalance} KES. Dial *384# to pay again.`;
    return await sendSMS(phone, message);
}

// Send repair notification to landlord
async function sendRepairNotification(landlordPhone, tenantName, house, issueType, description) {
    const message = `BomaFlow Repair Alert: ${tenantName} (House ${house}) reported ${issueType}. ${description}. Please check your dashboard for details.`;
    return await sendSMS(landlordPhone, message);
}

// Send month-end completion message
async function sendMonthCompleteMessage(tenantPhone, tenantName, landlordPhone, totalAmount) {
    // Message to tenant
    const tenantMessage = `BomaFlow: Congratulations ${tenantName}. You've completed this month's rent of ${totalAmount} KES. Your landlord has been notified. Starting fresh for next month.`;
    await sendSMS(tenantPhone, tenantMessage);
    
    // Message to landlord
    const landlordMessage = `BomaFlow Alert: Tenant ${tenantName} has completed rent payment of ${totalAmount} KES. Payment is ready for collection.`;
    await sendSMS(landlordPhone, landlordMessage);
}

module.exports = { 
    sendSMS, 
    sendDailyReminder, 
    sendPaymentReceipt, 
    sendRepairNotification,
    sendMonthCompleteMessage 
};
