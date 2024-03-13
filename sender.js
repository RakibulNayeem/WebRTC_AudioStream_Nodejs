const WebSocket = require('ws');
const wrtc = require('wrtc');
const fs = require('fs');

var connectedUser;
var conn = new WebSocket('ws://localhost:9090');
var yourConn;
var dataChannel;

conn.onopen = function () {
    console.log("Connected to the signaling server as sender");
    initializeSender();
};

conn.onmessage = function (msg) {
    console.log("Got message", msg.data);
    var data = JSON.parse(msg.data);

    switch (data.type) {
        case "offer":
            handleOffer(data.offer);
            break;
        case "answer":
            handleAnswer(data.answer);
            break;
        case "candidate":
            handleCandidate(data.candidate);
            break;
        case "leave":
            handleLeave();
            break;
        default:
            break;
    }
};

conn.onerror = function (err) {
    console.log("Got error", err);
};

function send(message) {
    if (conn.readyState === WebSocket.OPEN) {
        if (connectedUser) {
            message.name = connectedUser;
        }
        conn.send(JSON.stringify(message));
    } else {
        console.error("WebSocket is not open: readyState", conn.readyState);
    }
}

function initializeSender() {
    var configuration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        sdpSemantics: 'unified-plan',
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
    };

    yourConn = new wrtc.RTCPeerConnection(configuration);

    dataChannel = yourConn.createDataChannel("dataChannel");

    dataChannel.onopen = function () {
        console.log("Data channel opened");

         // Sending a message
        dataChannel.send("Hello, this is a test message from sender!");
       
    //    // Read and send the audio file
    //     const audioFilePath = './Symphony.opus';
    //     const audioFileData = fs.readFileSync(audioFilePath);
    //     dataChannel.send(audioFileData);
    //     console.log("Audio file sent");
    };

    dataChannel.onmessage = function (event){
        console.log("Data received from receiver: ", event.data, ", ", event.data.length, " bytes");
    }

    // Log ice candidate to the console
    yourConn.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('ice candidate in sender:');
            console.log(JSON.stringify(event.candidate));
            send({
                type: "candidate",
                candidate: event.candidate
            });
        }
    
    };


    yourConn.createOffer().then(function (offer) {
        console.log("Creating offer from sender.");
        return yourConn.setLocalDescription(offer);
    }).then(function () {
        send({
            type: "offer",
            offer: yourConn.localDescription
        });
    }).catch(function (error) {
        console.error("Error when creating an offer", error);
    });
}

function handleOffer(offer) {
    yourConn.setRemoteDescription(new wrtc.RTCSessionDescription(offer));

    yourConn.createAnswer().then(function (answer) {
        console.log("Creating answer from sender.");
        return yourConn.setLocalDescription(answer);
    }).then(function () {
        send({
            type: "answer",
            answer: yourConn.localDescription
        });
    }).catch(function (error) {
        console.error("Error when creating an answer", error);
    });
}

function handleAnswer(answer) {
    console.log("Handling answer in sender.");
    yourConn.setRemoteDescription(new wrtc.RTCSessionDescription(answer));
}

function handleCandidate(candidate) {
    console.log("Handling candidate in sender.");
    yourConn.addIceCandidate(new wrtc.RTCIceCandidate(candidate))
    .then(() => console.log("ICE candidate added successfully"))
    .catch(error => console.error("Failed to set ICE candidate.", error));
}

function handleLeave() {
    console.log("Peer disconnected.");
    // Handle disconnection if needed
}

// Trigger the connection setup
initializeSender();
