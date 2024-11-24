const { exec } = require('child_process');
const CryptoUtil = require('../lib/util/cryptoUtil');
const Wallet = require('../lib/operator/wallet');
const prompt = require("prompt-sync")();


const OPERATOR_FILE = 'wallets.json';
const Db = require('../lib/util/db');
const Wallets = require('../lib/operator/wallets');


class App {
    constructor(port, dbName = "1") {
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
                                    let pk = this.wallet.keyPairs[0].publicKey;

                                    // Create transaction in the type of "registration" containing student ID and public key. Mine into blockchain
                                    exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{"studentId": "${studentId}","publicKey": "${pk}"}' 'http://localhost:${this.PORT}/blockchain/registration'`, (error, stdout, stderr) => {

                                        if (stdout) {
                                            exec(`curl -s -X POST --header 'Content-Type: application/json' -d '{ "rewardAddress":"${pk}" }' 'http://localhost:${this.PORT}/miner/mine'`, (error, stdout, stderr) => {
                                        
                                                if (stdout) {
                                                    console.log("Student ID and public key is registered into blockchain.");
                                                    resolve(this.wallet);
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
                        resolve(this.wallet);
                    } else {
                        console.log("Incorrect password.");
                        resolve(null);
                    }
                }
            });
        });
    }

    creatAttendanceCert(){

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



// class App{
//     constructor(port, dbName = "1"){
//         this.PORT = port;
//         this.db = new Db('data/' + dbName + '/' + OPERATOR_FILE, new Wallets());
//         this.wallet = new Wallet();

//     }

//     creatStudentWallet(studentId){

//         // Get all wallet. See if any wallet has been registed.
//         exec(`curl -s -X GET --header 'Accept: application/json' 'http://localhost:${this.PORT}/operator/wallets'`, (error, stdout, stderr) => {
            
//             // If there is no wallet, register one.
//             if (stdout == "[]"){
//                 // let password = prompt("Please input your passoword:");
//                 let password = "f f f f f";
//                 // Generation of wallet from password
//                 exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{"password": "${password}"}' 'http://localhost:${this.PORT}/operator/wallets'`, (error, stdout, stderr) => {
//                     if(stdout){
//                         // get Wallet ID
//                         this.wallet.id = JSON.parse(stdout).id;

//                         // If the wallet is successfully registered, generate the keypairs (public key and secret key)
//                         exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' --header 'password: ${password}' 'http://localhost:${this.PORT}/operator/wallets/${this.wallet.id}/addresses'`, (error, stdout, stderr) => {
//                             if(stdout){
//                                 // get the wallet
//                                 this.wallet = JSON.parse(JSON.stringify(this.db.read(Wallets)[0]));
//                                 let pk = this.wallet.keyPairs[0].publicKey;

//                                 // Create transaction in the type of "registration" containing student ID and public key. Mine into blockchain
//                                 exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{"studentId": "${studentId}","publicKey": "${pk}"}' 'http://localhost:${this.PORT}/blockchain/registration'`, (error, stdout, stderr) => {
//                                     if(stdout){
//                                         exec(`curl -s -X POST --header 'Content-Type: application/json' -d '{ "rewardAddress":"${pk}" }' 'http://localhost:${this.PORT}/miner/mine'`, (error, stdout, stderr) => {
//                                             if(stdout){
//                                                 console.log("Student ID and public key is registered into blockchain.");
//                                                 return this.wallet;
//                                             };
//                                         });
//                                     };
//                                 });
//                             };
//                         });
//                     };
//                 });
//             }
//             else {
//                 // If there has been a wallet, ask user to login the wallet
//                 this.wallet = JSON.parse(JSON.stringify(this.db.read(Wallets)[0]));
//                 // let inputPassword = prompt("Please input your passoword:");
//                 let inputPassword = "f f f f f";

//                 // Verify the user passoword
//                 if(this.wallet.passwordHash == CryptoUtil.hash(inputPassword)){
//                     console.log("Correct password.");
//                     return this.wallet;
//                 }else{
//                     console.log("Incorrect password.");
//                 }
//             }
//         });

//         return null;
//     }

// }
// module.exports = App;