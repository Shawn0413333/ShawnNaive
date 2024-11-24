const { exec } = require('child_process');
const CryptoUtil = require('../lib/util/cryptoUtil');
const Wallet = require('../lib/operator/wallet');
const prompt = require("prompt-sync")();

class App{
    constructor(port){
        this.PORT = port;
        this.wallet = new Wallet();
    }

    creatStudentWallet(studentId){
        // let wallet = new Wallet();
        let pk = null;

        // Get all wallet. See if any wallet has been registed.
        exec(`curl -s -X GET --header 'Accept: application/json' 'http://localhost:${this.PORT}/operator/wallets'`, (error, stdout, stderr) => {
            
            // If there is no wallet, register one.
            if (stdout == "[]"){

                // let password = prompt("Please input your passoword:");
                let password = "f f f f f";
                // Generation of wallet from password
                exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{"password": "${password}"}' 'http://localhost:${this.PORT}/operator/wallets'`, (error, stdout, stderr) => {
                    if(stdout){
                        // get Wallet ID
                        this.wallet.id = JSON.parse(stdout).id;

                        // If the wallet is successfully registered, generate the keypairs (public key and secret key)
                        exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' --header 'password: ${password}' 'http://localhost:${this.PORT}/operator/wallets/${this.wallet.id}/addresses'`, (error, stdout, stderr) => {
                            if(stdout){
                                pk = JSON.parse(stdout).address;
                                this.wallet.keyPairs[0] = this.wallet.getSecretKeyByAddress(pk);
                                this.wallet.keyPairs[1] = pk;
                                // Get the wallet
                                // exec(`curl -s -X GET --header 'Accept: application/json' 'http://localhost:${this.PORT}/operator/wallets/${wallet.id}'`, (error, stdout, stderr) => {
                                //     if(stdout){
                                //         let temp = JSON.parse(stdout);          

                                //         console.log("wallet testing: " + JSON.stringify(temp));
                                //         // console.log(`Wallet is initialized. Wallet ID: ${wallet.id}\nPublic Key: ${wallet.keyPairs[1]}\nWallet ID: ${wallet.keyPairs[0]}`);                                
                                //     };
                                // });
                                console.log("wallet testing: " + JSON.stringify(this.wallet));
                            };
                        });
                        // // Create transaction in the type of "registration" containing student ID and public key. Mine into blockchain
                        // exec(`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{"studentId": "${studentId}","publicKey": "${pk}"}' 'http://localhost:${this.PORT}/blockchain/registration'`, (error, stdout, stderr) => {
                        //     if(stdout){
                        //         exec(`curl -s -X POST --header 'Content-Type: application/json' -d '{ "rewardAddress":"${pk}" }' 'http://localhost:${this.PORT}/miner/mine'`, (error, stdout, stderr) => {
                        //             if(stdout){
                        //                 console.log("Student ID and public key is registered into blockchain.");
                        //                 return wallet;
                        //             };
                        //         });
                        //     };
                        // });
                    };
                });
            }
            // else {
            //     // If there has been a wallet, ask user to login the wallet
            //     wallet.id = prompt("Please input your wallet ID:");

            //     // Get wallet by ID
            //     exec(`curl -s -X GET --header 'Accept: application/json' 'http://localhost:${this.PORT}/operator/wallets/${wallet.id}'`, (error, stdout, stderr) => {
            //         if(stdout){
            //             wallet = JSON.parse(stdout);
            //         };
            //     });

            //     // Verify the user passoword
            //     inputPassword = prompt("Please input your passoword:");
            //     if(wallet.passwordHash == CryptoUtil.hash(inputPassword)){
            //         console.log("Incorrect password.");
            //         return wallet;
            //     }
            // }
        });

        return null;
        
        // return null;
    }
}
module.exports = App;