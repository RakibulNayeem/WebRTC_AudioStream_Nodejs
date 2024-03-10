// Require the WebSocket library
const WebSocket = require('ws');

// Create a WebSocket server at port 9090
const wss = new WebSocket.Server({ port: 9090 });

// Object to store connected users
const users = {};

// Function to send a message to a specific connection
function sendTo(connection, message) {
    connection.send(JSON.stringify(message));
}

// Auto-incrementing counter for generating unique user names
let userIdCounter = 1;

// When a user connects to the server
wss.on('connection', function (connection) {
    console.log("User connected");

    // Generate a unique user name
    const userName = "User" + userIdCounter++;

    // Assign the generated user name to the connection
    connection.name = userName;

    // Add the user to the users object
    users[userName] = connection;

    // Send a welcome message with the generated user name
    sendTo(connection, {
        type: "hello",
        message: "Hello world",
        name: userName
    });

    // When the server receives a message from a connected user
    connection.on('message', function (message) {
        let data;

        // Accepting only JSON messages
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON");
            data = {};
        }

        // Switch based on the type of the user message
        switch (data.type) {
            case "offer":
                console.log("In server.js: got offer from sender");

                // Broadcast the offer to all connected users
                for (const userConnection of Object.values(users)) {
                    if (userConnection !== connection) {
                        sendTo(userConnection, {
                            type: "offer",
                            offer: data.offer,
                            name: connection.name
                        });
                    }
                }
                break;

            case "answer":
                // // Forward the answer to the offerer
                 //console.log("In server.js: got answer from receiver");
                // const offererConnection = users[data.name];
                // if (offererConnection) {
                //     sendTo(offererConnection, {
                //         type: "answer",
                //         answer: data.answer
                //     });
                // }

                // Broadcast the answer to all connected users
                console.log("In server.js: got answer from receiver");
                for (const userConnection of Object.values(users)) {
                    if (userConnection !== connection) {
                        sendTo(userConnection, {
                            type: "answer",
                            answer: data.answer,
                            name: connection.name
                        });
                    }
                }
                break;

            case "candidate":
                // // Forward the ICE candidate to the other user
                // const candidateConnection = users[data.name];
                // if (candidateConnection) {
                //     sendTo(candidateConnection, {
                //         type: "candidate",
                //         candidate: data.candidate
                //     });
                // }

                // Broadcast the candidate to all connected users
                console.log("In server.js: handling candidate in server");
                for (const userConnection of Object.values(users)) {
                    if (userConnection !== connection) {
                        sendTo(userConnection, {
                            type: "candidate",
                            candidate: data.candidate,
                            name: connection.name
                        });
                    }
                }
                break;

            case "leave":
                // Handle user disconnection
                console.log("Disconnecting from", data.name);
                const disconnectedConnection = users[data.name];
                if (disconnectedConnection) {
                    disconnectedConnection.otherName = null;
                    sendTo(disconnectedConnection, {
                        type: "leave"
                    });
                }
                break;

            default:
                sendTo(connection, {
                    type: "error",
                    message: "Command not found: " + data.type
                });
                break;
        }
    });

    // When a user exits, for example, closes a browser window
    connection.on("close", function () {
        if (connection.name) {
            delete users[connection.name];

            if (connection.otherName) {
                console.log("Disconnecting from ", connection.otherName);
                const otherConnection = users[connection.otherName];
                if (otherConnection) {
                    otherConnection.otherName = null;
                    sendTo(otherConnection, {
                        type: "leave"
                    });
                }
            }
        }
    });
});

console.log("WebSocket server is running on port 9090");
