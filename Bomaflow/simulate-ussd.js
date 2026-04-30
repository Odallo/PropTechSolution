require('dotenv').config();

// USSD Simulation Script
class USSDSimulator {
    constructor(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL;
        this.sessionId = null;
        this.phoneNumber = null;
    }

    // Start a new USSD session
    async startSession(phoneNumber) {
        this.phoneNumber = phoneNumber;
        this.sessionId = `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`Starting USSD session...`);
        console.log(`Phone: ${phoneNumber}`);
        console.log(`Session: ${this.sessionId}`);
        console.log(`Server: ${this.baseURL}`);
        console.log(`\n--- Dialing *384# ---\n`);
        
        try {
            const response = await this.sendRequest('');
            this.displayResponse(response);
            return response;
        } catch (error) {
            console.error('Failed to start session:', error.message);
            return null;
        }
    }

    // Send a USSD request
    async sendRequest(text) {
        const formData = new URLSearchParams();
        formData.append('phoneNumber', this.phoneNumber);
        formData.append('text', text);
        formData.append('sessionId', this.sessionId);

        const response = await fetch(`${this.baseURL}/ussd`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        return await response.text();
    }

    // Display USSD response
    displayResponse(response) {
        console.log(`Response:`);
        console.log(response);
        console.log(''); // Empty line for readability
    }

    // Simulate user input
    async userInput(input) {
        console.log(`User input: ${input}`);
        
        try {
            const response = await this.sendRequest(input);
            this.displayResponse(response);
            return response;
        } catch (error) {
            console.error('Failed to send input:', error.message);
            return null;
        }
    }

    // Complete payment simulation
    async simulatePayment(phoneNumber) {
        console.log(`\n=== PAYMENT SIMULATION ===`);
        
        // Start session
        await this.startSession(phoneNumber);
        
        // Wait a moment
        await this.sleep(1000);
        
        // Select payment option
        await this.userInput('1');
        
        return this.sessionId;
    }

    // Complete repair request simulation
    async simulateRepairRequest(phoneNumber, repairType = '1') {
        console.log(`\n=== REPAIR REQUEST SIMULATION ===`);
        
        // Start session
        await this.startSession(phoneNumber);
        
        // Wait a moment
        await this.sleep(1000);
        
        // Go to repair menu
        await this.userInput('4');
        
        // Wait a moment
        await this.sleep(1000);
        
        // Select repair type
        await this.userInput(repairType);
        
        return this.sessionId;
    }

    // Complete balance check simulation
    async simulateBalanceCheck(phoneNumber) {
        console.log(`\n=== BALANCE CHECK SIMULATION ===`);
        
        // Start session
        await this.startSession(phoneNumber);
        
        // Wait a moment
        await this.sleep(1000);
        
        // Check balance
        await this.userInput('2');
        
        return this.sessionId;
    }

    // Interactive mode
    async interactiveMode(phoneNumber) {
        console.log(`\n=== INTERACTIVE USSD MODE ===`);
        console.log(`Type 'quit' to exit`);
        console.log(`Type 'help' for commands`);
        
        await this.startSession(phoneNumber);
        
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const askQuestion = () => {
            rl.question('Enter USSD input: ', async (input) => {
                if (input.toLowerCase() === 'quit') {
                    rl.close();
                    return;
                }
                
                if (input.toLowerCase() === 'help') {
                    console.log('\nAvailable commands:');
                    console.log('1 - Make payment');
                    console.log('2 - Check balance');
                    console.log('3 - My info');
                    console.log('4 - Report repair');
                    console.log('4*1 - Water issue');
                    console.log('4*2 - Electrical problem');
                    console.log('4*3 - Structural issue');
                    console.log('4*4*Custom - Custom repair description');
                    console.log('quit - Exit simulation');
                    console.log('');
                    askQuestion();
                    return;
                }
                
                await this.userInput(input);
                askQuestion();
            });
        };

        askQuestion();
    }

    // Helper function for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Usage examples
async function main() {
    const simulator = new USSDSimulator();
    
    console.log('BomaFlow USSD Simulator');
    console.log('============================');
    
    // Test numbers
    const testNumbers = {
        mary: '254711111111',
        john: '254722222222',
        sarah: '254733333333'
    };
    
    // Example 1: Payment simulation
    console.log('\n1. Simulating Mary making a payment...');
    await simulator.simulatePayment(testNumbers.mary);
    
    // Example 2: Repair request simulation
    console.log('\n2. Simulating John reporting a water issue...');
    await simulator.simulateRepairRequest(testNumbers.john, '1');
    
    // Example 3: Balance check simulation
    console.log('\n3. Simulating Sarah checking balance...');
    await simulator.simulateBalanceCheck(testNumbers.sarah);
    
    // Example 4: Interactive mode (uncomment to use)
    // console.log('\n4. Starting interactive mode...');
    // await simulator.interactiveMode(testNumbers.mary);
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = USSDSimulator;
