// function login() {
//     let login_mode = prompt("For new registration, input 0 \n For existing user, input 1:");
//     if (login_mode == 0){
//         // Account()
//         studentID = prompt("Please input your student ID:");
//         let account = new Account (studentID);
//     }
//     else if (login_mode == 1){
//         const studentID = prompt("Please input your student ID:");
//         // pendign
//     }
// }

const Wallet = require('../../lib/operator/wallet');
const Blockchain = require('../../lib/blockchain');
const Miner = require('../../lib/miner');
const Node = require('../../lib/node');
const CryptoUtil = require('../../lib/util/cryptoUtil');
const CryptoEdDSAUtil = require('../../lib/util/cryptoEdDSAUtil');
const Transaction = require('../../lib/blockchain/transaction');





// 1. Registration of Blockchain & Wallet
let studentID = '20063043d';
let walletPassword = 'qwer123456';
let myWallet = Wallet.fromPassword(walletPassword);
let myPublicKey = myWallet.generateAddress();
let blockchain = new Blockchain (studentID + myPublicKey);
let miner = new Miner(blockchain);
let node = new Node(blockchain)


//View my wallet
// console.log("Public key: " + myPublicKey); //Public Key or Address
// console.log("Private key: " + myWallet.getSecretKeyByAddress(myPublicKey)); //Private Key
// console.log("Balance: " + R.sum(R.map(R.prop('amount'), blockchain.getUnspentTransactionsForAddress(myPublicKey)))); //Balance


// 2a. Generation of attendance cert
let attendTime = new Date();
message = studentID + "\n" + attendTime ;

// Print the Attendance Cert, and request user for signing
console.log(message);
let inputPrivateKey = prompt("Please input your private key for signature:")

// Encryption of signature
let messageHash = CryptoUtil.hash(message);
let tempKeyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(inputPrivateKey);
signature = CryptoEdDSAUtil.signHash(tempKeyPair,messageHash);

// Add the Signature checking here (func3)?? e.g. if (inputPrivateKey == myWallet.getSecretKeyByAddress(myPublicKey))
let valid = CryptoEdDSAUtil.verifySignature(myPublicKey, signature, messageHash);
// if (!valid){
// }


//let newblock = miner.mine(message + "; Signature: " + signature);
cipher = message + "; Signature: " + signature;

let newblock = miner.mine(myPublicKey);
blockchain.addTransaction(Transaction.fromJson({
    id: CryptoUtil.randomId(64),
    hash: null,
    type: 'COMP4142',
    data: cipher,
}));

node.checkReceivedBlocks(newblock)


//boardcast the mining to other users

