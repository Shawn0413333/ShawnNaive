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
//let studentId = prompt("Please input your student ID:");
let studentId = "20063043d";
// app.creatStudentWallet(studentId).then(wallet => {
//     // console.log(wallet);
//     // add the below stuff here


// }).catch(error => {
//     console.error(error);
// });



let command = null;

function commands() {
    app.getMenu();
    command = prompt("Please input your command (0-4): ");
    if (command == 0) {
        return;
    } else if (command == 1) {
        // Function 2: generation of attendance cert
        app.creatAttendanceCert(studentId).then(() => {
            // After creatAttendanceCert resolves, show the menu again
            commands();
        }).catch((error) => {
            console.error(error);
            commands();
        });
    }else if (command == 2) {
        // Function 3: Signature check + Mining attendance cert
        


        
        // // Function 2: generation of attendance cert
        // app.creatAttendanceCert(studentId).then(() => {
        //     // After creatAttendanceCert resolves, show the menu again
        //     commands();
        // }).catch((error) => {
        //     console.error(error);
        //     commands();
        // });
    }
}

commands();
