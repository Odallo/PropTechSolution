require('dotenv').config();
const USSDSimulator = require('./simulate-ussd');

// Interactive USSD Simulation
async function interactiveMode() {
    const simulator = new USSDSimulator();
    
    console.log('BomaFlow Interactive USSD Simulator');
    console.log('=======================================');
    console.log('Available test numbers:');
    console.log('1. Mary: 254711111111 (6000 KES rent)');
    console.log('2. John: 254722222222 (9000 KES rent)');
    console.log('3. Sarah: 254733333333 (15000 KES rent)');
    console.log('4. Custom number');
    
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const askPhone = () => {
        rl.question('\nSelect phone number (1-4): ', async (choice) => {
            let phoneNumber;
            
            switch(choice) {
                case '1':
                    phoneNumber = '254711111111';
                    break;
                case '2':
                    phoneNumber = '254722222222';
                    break;
                case '3':
                    phoneNumber = '254733333333';
                    break;
                case '4':
                    rl.question('Enter custom phone number: ', async (customPhone) => {
                        phoneNumber = customPhone;
                        await simulator.interactiveMode(phoneNumber);
                        rl.close();
                    });
                    return;
                default:
                    console.log('Invalid choice');
                    askPhone();
                    return;
            }
            
            console.log(`\nUsing: ${phoneNumber}`);
            await simulator.interactiveMode(phoneNumber);
            rl.close();
        });
    };
    
    askPhone();
}

// Run interactive mode
interactiveMode().catch(console.error);
