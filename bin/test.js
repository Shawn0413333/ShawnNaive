#!/usr/bin/env node
const argv = require('yargs')
    .alias('p', 'port')
    .describe('p', 'HTTP port. (3001 by default)')
    .argv;

const prompt = require("prompt-sync")();
const App = require('./app');

// PORT
const PORT = argv.port || 3001;
console.log(`using with the port ${PORT}`);

let app = new App(PORT);

// Function 1: Student information registration
// let studentId = prompt("Please input your student ID:");
let studentId = "20063043d";
let wallet = app.creatStudentWallet(studentId);



// console.log(wallet);

