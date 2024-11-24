const { exec } = require('child_process');
const Wallet = require('../lib/operator/wallet');
const prompt = require("prompt-sync")();
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).argv;


// Initialization of wallet
let walletID = null, pk = null, sk = null, password = "string", passwordHash = null;

const PORT = argv.port || 3001;
console.log(`using with the port ${PORT}`);

let studentID = prompt("Please input your student ID:");

// Get wallets
exec(`curl -s -X GET --header 'Accept: application/json' 'http://localhost:${PORT}/operator/wallets'`, (error, stdout, stderr) => {

    if (stdout == "[]"){
        // If there is no wallet, register a new wallet
        password = prompt("Please input your passoword:");

        // const res = `curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{\"password\": \"${password}\"}' 'http://localhost:3001/operator/wallets'`;
        exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{\"password\": \"${password}\"}' 'http://localhost:${PORT}/operator/wallets'`, (error, stdout, stderr) => {
            if(stdout){
                // generate the wallet ID
                walletID = JSON.parse(stdout).id;

                // generate the keypairs
                exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' --header 'password: ${password}' 'http://localhost:${PORT}/operator/wallets/${walletID}/addresses'`, (error, stdout, stderr) => {
                    if(stdout){
                        // get the public key and secret key
                        exec(`curl -s -X GET --header 'Accept: application/json' 'http://localhost:${PORT}/operator/wallets/${walletID}/addresses'`, (error, stdout, stderr) => {
                            if(stdout){
                                let keypairs = JSON.parse(stdout);
                                sk = keypairs[0];
                                pk = keypairs[1];                                
                            };
                        });
                    };
                });
                console.log(`Wallet is initialized. Wallet ID: ${walletID}\nPublic Key: ${pk}\nWallet ID: ${sk}\n `);

                // register student ID and public key into blockchain
                exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{"studentId": "${studentID}","publicKey": "${pk}"}' 'http://localhost:${PORT}/blockchain/registration'`, (error, stdout, stderr) => {
                    if(stdout){
                        exec(`curl -s -X POST --header 'Content-Type: application/json' -d '{ "rewardAddress":"${pk}" }' 'http://localhost:${PORT}/miner/mine'`, (error, stdout, stderr) => {
                            if(stdout){
                                console.log("Student ID and public key is registered into blockchain.");
                            };
                        });
                    };
                });
            };
        });
    }
    else {
        // If there has been a wallet
        walletID = prompt("Please input your walletID:");
        // get wallet by ID
        let wallet = null;
        exec(`curl -s -X GET --header 'Accept: application/json' 'http://localhost:${PORT}/operator/wallets/${walletID}'`, (error, stdout, stderr) => {
            if(stdout){
                wallet = JSON.parse(stdout);
                passwordHash = wallet.passwordHash;
            };
        });
        inputPassword = prompt("Please input your passoword:");
        if(!passwordHash == inputPassword){
            console.log("Incorrect password.");
            return;
        }
        sk = wallet.keyPairs[0];
        pk = wallet.keyPairs[1];   
    }
});

let command = prompt("Please input your command:");

// add true loop here //delete
if (command == "1"){
    // 1. create attendance
    let courseId = prompt("Please input the course ID:");

    // generation of attendance certificate
    exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{"studentId": "${studentID}","eventId": "${courseId}"}' 'http://localhost:${PORT}/operator/generateAttendanceCert'`, (error, stdout, stderr) => {
        let certificate = JSON.parse(stdout);
        if(stdout){
            // signing on attendance certificate
            let ifSign = prompt("Please confirm with the certificate.\nIf yes, input the secert key. If no, input 'no'");
            if (!ifSign == 'no'){
                exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{"attendanceCert": ${certificate},"addressId": "${pk}","secretKey": "${sk}"}' 'http://localhost:${PORT}/operator/signAttendanceCert'`, (error, stdout, stderr) => {
                    if(stdout){
                        certificate = JSON.parse(stdout);
                        console.log("The attendance certificate is signed.");

                        // create a unconfirmed transaction in the type of "attendance" + checking signature
                        exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '${certificate}' 'http://localhost:${PORT}/blockchain/attendance'`, (error, stdout, stderr) => {
                            if(stdout){
                                console.log("The attendance is added into transaction db.");
                            }else{
                                console.log("Transaction failed. Please check the validity of signature");
                            }
                        });  
                    };
                });  
            }else{
                console.log("The attendance certificate is discarded.");
            }        
        };
    });
}else if(command == "2"){
    // 2. mine attendance

    // get all unconfirmed transaction (attendance certificate)
    exec(`curl -s -X GET --header 'Accept: application/json' 'http://localhost:${PORT}/blockchain/transactions'`, (error, stdout, stderr) => {
        if (stdout == "[]"){
            console.log("No unmined attandance certificate.")

        }else{                
            // mine unconfirmed transactions
            exec(`curl -s -X POST --header 'Content-Type: application/json' -d '{ "rewardAddress":"${pk}" }' 'http://localhost:${PORT}/miner/mine'`, (error, stdout, stderr) => {
                if (stdout){
                    console.log("A block containing valid attendance certificates has been mined into blockchain.\n As mining reward, 100 points are saved into your wallet.")
                    
                    // get wallet balance
                    exec(`curl -s -X GET --header 'Accept: application/json' 'http://localhost:${PORT}/operator/${pk}/balance'`, (error, stdout, stderr) => {
                        if (stdout){
                            console.log(`Balance: ${stdout}`)
                        }
                    });
                }else{
                    console.log("Mining fails.")
                }
            });
        }
    });
}

// action menu
// 1. create attendance (student)
// 2. mine attendance (student)
// 3. record query (teacher)



// if (error) {
//     console.error(`Error executing command: ${error.message}`);
//     return;
// }
// if (stderr) {
//     console.error(`stderr: ${stderr}`);
//     return;
// }


