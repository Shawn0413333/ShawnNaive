1. For user 1, run a node in terminal:
node bin/naivecoin.js -p 3001 --name 1

2. For user 2, run the second node and add peers:
node bin/naivecoin.js -p 3002 --name 2 --peers http://localhost:3001

3. For each user, open a new terminal. Run the below command to start the app (), e.g.:
node bin/main.js -p 3001 -n 1
node bin/main.js -p 3002 -n 2
