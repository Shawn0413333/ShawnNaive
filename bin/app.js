const { exec } = require('child_process');
const CryptoUtil = require('../lib/util/cryptoUtil');
const Wallet = require('../lib/operator/wallet');
const prompt = require("prompt-sync")();
const OPERATOR_FILE = 'wallets.json';
const Db = require('../lib/util/db');
const Wallets = require('../lib/operator/wallets');


class App {
    constructor(port, dbName) {
        this.PORT = port;
        this.db = new Db('data/' + dbName + '/' + OPERATOR_FILE, new Wallets());
        this.wallet = new Wallet();
    }

    creatStudentWallet(studentId) {
        return new Promise((resolve, reject) => {

            // Get all wallets. See if any wallet has been registered.
            exec(`curl -s -X GET --header 'Accept: application/json' 'http://localhost:${this.PORT}/operator/wallets'`, (error, stdout, stderr) => {

                // If there is no wallet, register one.
                if (stdout == "[]") {
                    let password = prompt("Please input your password: ");
                    // Generate wallet from password
                    exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{"password": "${password}"}' 'http://localhost:${this.PORT}/operator/wallets'`, (error, stdout, stderr) => {

                        if (stdout) {
                            // Get Wallet ID
                            this.wallet.id = JSON.parse(stdout).id; 

                            // Generate keypairs (public key and secret key)
                            exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' --header 'password: ${password}' 'http://localhost:${this.PORT}/operator/wallets/${this.wallet.id}/addresses'`, (error, stdout, stderr) => {

                                if (stdout) {
                                    // Get the wallet
                                    this.wallet = JSON.parse(JSON.stringify(this.db.read(Wallets)[0]));
                                    console.log(this.wallet);
                                    let pk = this.wallet.keyPairs[0].publicKey;

                                    // Create transaction in the type of "registration" containing student ID and public key. Mine into blockchain
                                    exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{"studentId": "${studentId}","publicKey": "${pk}"}' 'http://localhost:${this.PORT}/blockchain/registration'`, (error, stdout, stderr) => {

                                        if (stdout) {
                                            exec(`curl -s -X POST --header 'Content-Type: application/json' -d '{ "rewardAddress":"${pk}" }' 'http://localhost:${this.PORT}/miner/mine'`, (error, stdout, stderr) => {
                                        
                                                if (stdout) {
                                                    console.log("Student ID and public key is registered into blockchain.");
                                                    // resolve(this.wallet);
                                                    resolve(true);
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else {
                    // If there has been a wallet, ask user to login to the wallet
                    this.wallet = JSON.parse(JSON.stringify(this.db.read(Wallets)[0]));
                    let inputPassword = prompt("Please input your password: ");

                    // Verify the user password
                    if (this.wallet.passwordHash === CryptoUtil.hash(inputPassword)) {
                        console.log("Correct password.");
                        resolve(true);
                    } else {
                        console.log("Incorrect password.");
                        resolve(false);
                    }
                }
            });
        });
    }

    creatAttendanceCert(studentId){
        return new Promise((resolve, reject) => {

            // Ask for the course Id (as the event Id)
            let courseId = prompt("Please input the course ID:");

            // Generation of attendance certificate
            exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{"studentId": "${studentId}","eventId": "${courseId}"}' 'http://localhost:${this.PORT}/operator/generateAttendanceCert'`, (error, stdout, stderr) => {
                let certificate = stdout;
                console.log("The unsigned attandence certificate:");
                console.log(JSON.parse(stdout));

                if(stdout){
                    // Signing on attendance certificate
                    let inputSecretKey = prompt("Please confirm with the certificate.\nIf yes, input the secert key. If no, input 'no'\n");
                    // let inputSecretKey = "e06e2faeb6fb751f7668467eb384a406ab7a8a1106092c935ffcbe484a79b5e7eed6f0e8d5e991ce59cb229430026228383ae4c5e1ab4d6dc120005b8a5664ab518d38f354074a9b2381649e5e9306dec014a89b1d6e7dab26996b4dcf1abbaaab3bf112ecb52bb0d7647bfb0beb263d50026589f1c7dbef8b6a15d74a6784b0401089ee622e3c98e90c81803296e087248d9044b200841adc28527564dc0850ac4ece75a18f1d5e14141785011f4aff056c63bee1874a229dfc2f5b8f799ea9a58c3305ee16e2c046d0e61c782ae9ba65a2764c7a4ff53f15af1e3be13c67e2a4ed8270bd8670b5742148ac8486edb1b5639d883cb271a077ee729f3c4ceb240dcbeb5bd51cbe311a13a174a7481d0a00271a3cbdfbf8ada57af83e6439e83a11f8d681aa4df012f74f44417f8ff03a2d190f89edbeb9119da89e97f3552532932012e1a3ddfba1055d603969228dc71e8d5997425b3c90a45d9eb110ea403777f6d28fd484f4f8decb71b7fd4b9f7f4e4f1be87a70fb327e6c76f84690bec4c1fb357ee7b99e60603e5408829d14cc80509ca1a72430de44d0625d9b27248de7e87845b3544c0074f8b400c45cb99bceb38973e304d1f0aeef8588998d3537a43fb17241a294ac6a81557c562c433daca46187acd0b5dc43b7b5caf7dcaac042e61c835fd544b63e9f2fd4694646989689a92eec627983e8064140594a3fcc";
                    // let inputSecretKey = "testtestwrongsecret"; //delete

                    if (inputSecretKey != 'no'){
                        exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{"attendanceCert": ${certificate},"addressId": "${this.wallet.keyPairs[0].publicKey}","secretKey": "${inputSecretKey}"}' 'http://localhost:${this.PORT}/operator/signAttendanceCert'`, (error, stdout, stderr) => {
                            if(stdout){
                                certificate = stdout;
                                console.log("The signed attandence certificate:");
                                console.log(JSON.parse(stdout));

                                // create a unconfirmed transaction in the type of "attendance" + checking signature
                                exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '${certificate}' 'http://localhost:${this.PORT}/blockchain/attendance'`, (error, stdout, stderr) => {
                                    if(stdout){
                                        console.log("The attendance is added into transaction db.");
                                    }else{
                                        console.log("Transaction failed. Please check the validity of signature");
                                    }
                                    resolve();
                                });  
                            };
                        });  
                    }else{
                        console.log("The attendance certificate is discarded.");
                        resolve();
                    }        
                };
            });
        });
    }

    mineAttendanceCert(){
        return new Promise((resolve, reject) => {

            // get all unconfirmed transaction (attendance certificate)
            exec(`curl -s -X GET --header 'Accept: application/json' 'http://localhost:${this.PORT}/blockchain/transactions'`, (error, stdout, stderr) => {
                if (stdout == "[]"){
                    console.log("No unmined attandance certificate.")
                    resolve();
                }
                else{                
                    // mine unconfirmed transactions
                    exec(`curl -s -X POST --header 'Content-Type: application/json' -d '{ "rewardAddress":"${this.wallet.keyPairs[0].publicKey}" }' 'http://localhost:${this.PORT}/miner/mine'`, (error, stdout, stderr) => {
                        if (stdout){
                            console.log("A block containing valid attendance certificates has been mined into blockchain.\nAs mining reward, 100 points are saved into your wallet.")
                            
                            // get wallet balance
                            exec(`curl -s -X GET --header 'Accept: application/json' 'http://localhost:${this.PORT}/operator/${this.wallet.keyPairs[0].publicKey}/balance'`, (error, stdout, stderr) => {
                                if (stdout){
                                    console.log(`Balance: ${JSON.parse(stdout).balance}`)
                                }else{
                                    console.log("Retrival of balance fails.");
                                }
                                resolve();
                            });
                        }else{
                            console.log("Mining fails.")
                            resolve();
                        }
                    });
                }
            });
        });
    }

    viewWallet(){
        return new Promise((resolve, reject) => {
            // get wallet balance
            exec(`curl -s -X GET --header 'Accept: application/json' 'http://localhost:${this.PORT}/operator/${this.wallet.keyPairs[0].publicKey}/balance'`, (error, stdout, stderr) => {
                if (stdout){
                    let message = 
                    `Wallet Id: ${this.wallet.id}\n`+
                    `Public key: ${this.wallet.keyPairs[0].publicKey}\n`+
                    `Secret key: ${this.wallet.keyPairs[0].secretKey}\n`+
                    `Balance: ${JSON.parse(stdout).balance}`;       
                    console.log(message);
                }else{
                    console.log("Retrival of balance fails.");
                }
                resolve();
            });
        });
    }

    getMenu(){
        let list = 
        "**************************\n"+
        "0. Exit\n"+
        "1. Create attendance\n"+
        "2. Mine attendance\n"+
        "3. Record query\n"+
        "4. View wallet\n"+
        "**************************";
        console.log(list);
    }
}
module.exports = App;