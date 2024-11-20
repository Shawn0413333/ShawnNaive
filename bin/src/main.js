const Wallet = require('../../lib/operator/wallet');
const Blockchain = require('../../lib/blockchain');
const Miner = require('../../lib/miner');
const Node = require('../../lib/node');
const CryptoUtil = require('../../lib/util/cryptoUtil');
const CryptoEdDSAUtil = require('../../lib/util/cryptoEdDSAUtil');
const Transaction = require('../../lib/blockchain/transaction');
const R = require('ramda');
const prompt = require("prompt-sync")();





// 1. Registration of Blockchain & Wallet
let studentID = '20063043d';
let walletPassword = 'qwer123456';
let myWallet = Wallet.fromPassword(walletPassword);
let myPublicKey = myWallet.generateAddress();
let blockchain = new Blockchain (studentID + myPublicKey);
let miner = new Miner(blockchain);
let node = new Node(blockchain)


// View my wallet
console.log("Public key: " + myPublicKey); //Public Key or Address
console.log("Private key: " + myWallet.getSecretKeyByAddress(myPublicKey)); //Private Key
console.log("Balance: " + R.sum(R.map(R.prop('amount'), blockchain.getUnspentTransactionsForAddress(myPublicKey)))); //Balance


// 2a. Generation of attendance cert
let attendTime = new Date();
message = studentID + "\n" + attendTime ;

// Print the Attendance Cert, and request user for signing
console.log(message);
let inputPrivateKey = prompt("Please input your private key for signature:")



//delete?
// let inputPrivateKey = "3b735938645001ac2a61031e9ef38b8d6028702f9b48a526190032c58550e061c213f4924f36d6e9cd527be7134820c5034961e87c6988b76df6d92cd2d620b9037ebebc254e5ff50af83d7ca71d36325537fcf7359cac80294b5180c360aebe3c382f0857723661daa60e1ffe356a0cf48c8991f63f2b998396b818c7e71a1a0dabf1cbe2158752d83fb7bbbec32107db4b1ec6e6d7b128f074dddde65704c3261956e69ea84b14c1f569661e7352629438f9ab1915843794b8ea82477a0f5b21a665cd805aab22eeac0aa8ac2313cd42bdca62e02239a7f205ffe0a13962da502e33a270bec228aea5a806395c5d957edad57e39c46afc817750d760975dd67fd27481737e1acccb593b01d094f1c1a0ddaf80f3aea13b4afbf698a78466c68e9db8c18159e80363516a5f0fc6624d20aae839c3fffc638e2f1bfd08fcb591c8427ab81519c075d2c3273dca65d8f610ef2646fe2873135d0ccd4f47f35b4ccbabd1292bfcb61f6647e503e7ba4e35ef685673719b39be7cecb4370ffb987187959c7430f3addb9acc430f02b8f87bbe5f088e8252a2225f1cee242ec7e177e5801936be3294f77d96bcd1e4167bbd624b290e185f97bbb43b575e50c05abf84043c08845763d53a78055dac3eeaca708f37d32811ab12b3786434ce726ddefea83e308974d1ad7507ddf4266bf58236946938b21453731d1ffe4d58f18659";



// Encryption of signature
let messageHash = CryptoUtil.hash(message);
let tempKeyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(inputPrivateKey);
signature = CryptoEdDSAUtil.signHash(tempKeyPair,messageHash);

// Signature checking
let valid = CryptoEdDSAUtil.verifySignature(myPublicKey, signature, messageHash);

// if (!valid){
// }


//let newblock = miner.mine(message + "; Signature: " + signature);
cipher = message + "; Signature: " + signature;






blockchain.addTransaction(Transaction.fromJson({
    id: CryptoUtil.randomId(64),
    hash: null,
    type: 'COMP4142',
    data: cipher,
}));

let newblock = miner.mine(myPublicKey);
node.checkReceivedBlocks(newblock);


blockchain.addTransaction(Transaction.fromJson({
    id: CryptoUtil.randomId(64),
    hash: null,
    type: 'COMP4431',
    data: cipher,
}));

newblock = miner.mine(myPublicKey);
node.checkReceivedBlocks(newblock);


// //boardcast the mining to other users

