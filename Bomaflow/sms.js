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
        // Format phone number (remove any + or leading 0)
        let formattedPhone = phoneNumber.toString();
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('+')) {
            formattedPhone = formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('254')) {
            formattedPhone = '254' + formattedPhone;
        }
        
        const options = {
            to: [formattedPhone],
            message: message,
            from: process.env.AFRICASTALKING_SENDER_ID || 'BomaFlow'
        };
        
        const response = await sms.send(options);
        console.log(`✅ SMS sent to ${formattedPhone}`);
        return response;
        
    } catch (error) {
        console.error(`❌ SMS failed to ${phoneNumber}:`, error);
        return null;
    }
}

// Send daily reminder to a tenant
async function sendDailyReminder(phone, name, balance) {
    const message = `🏠 BomaFlow: Hi ${name}! Time to save 200 KES for rent. Dial *384# now. Your current savings: ${balance} KES this month.`;
    return await sendSMS(phone, message);
}

// Send payment receipt
async function sendPaymentReceipt(phone, amount, newBalance) {
    const message = `💰 BomaFlow Receipt: You've paid ${amount} KES. Total savings this month: ${newBalance} KES. Keep going! Dial *384# to pay again.`;
    return await sendSMS(phone, message);
}

// Send month-end completion message
async function sendMonthCompleteMessage(tenantPhone, tenantName, landlordPhone, totalAmount) {
    // Message to tenant
    const tenantMessage = `🎉 BomaFlow: Congratulations ${tenantName}! You've completed this month's rent of ${totalAmount} KES. Your landlord has been notified. Starting fresh for next month. Well done! 💪`;
    await sendSMS(tenantPhone, tenantMessage);
    
    // Message to landlord
    const landlordMessage = `🏢 BomaFlow Alert: Tenant ${tenantName} has completed rent payment of ${totalAmount} KES. Payment is ready for collection.`;
    await sendSMS(landlordPhone, landlordMessage);
}

module.exports = {
    sendSMS,
    sendDailyReminder,
    sendPaymentReceipt,
    sendMonthCompleteMessage
};
