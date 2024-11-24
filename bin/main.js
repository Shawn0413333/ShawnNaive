#!/usr/bin/env node
const argv = require('yargs')
    .alias('p', 'port')
    .describe('p', 'HTTP port. (3001 by default)')
    .alias('n', 'name') 
    .describe('n', 'Your name')
    .argv;

const prompt = require("prompt-sync")();
const App = require('./app');

// PORT
const PORT = argv.port || 3001;
console.log(`using with the port ${PORT}`);
const dbName = argv.name || 1;
console.log(`using with the port ${dbName}`);


let app = new App(PORT, dbName);
let command = null;

// Function 1: Student information registration
let studentId = prompt("Please input your student ID:");
// let studentId = "20063043d";
app.creatStudentWallet(studentId).then((loginValid) => {
    if(loginValid == true){
        commands();
    }
}).catch(error => {
    console.error(error);
});

function commands() {
    app.getMenu();
    command = prompt("Please input your command (0-4): ");
    if (command == 0) {
        return;
    } else if (command == 1) {
        // Function 2: generation of attendance cert
        app.creatAttendanceCert(studentId).then(() => {
            commands();
        }).catch((error) => {
            console.error(error);
            commands();
        });
    }else if (command == 2) {
        // Function 3: Signature check + Mining attendance cert
        app.mineAttendanceCert().then(() => {
            commands();
        }).catch((error) => {
            console.error(error);
            commands();
        });
    }else if (command == 3) {
        // Function 4: Record query

    }else if (command == 4) {
        // View wallet
        app.viewWallet().then(() => {
            commands();
        }).catch((error) => {
            console.error(error);
            commands();
        });
    }else{
        commands();
    }
}
