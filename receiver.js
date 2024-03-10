const WebSocket = require('ws');
const wrtc = require('wrtc');

var connectedUser;
var conn = new WebSocket('ws://localhost:9090');
var yourConn;
var dataChannel;

conn.onopen = function () {
    console.log("Connected to the signaling server as receiver");
    initializeReceiver();
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

function initializeReceiver() {
    var configuration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        sdpSemantics: 'unified-plan',
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
    };

    yourConn = new wrtc.RTCPeerConnection(configuration);

    yourConn.ondatachannel = function (event) {
        dataChannel = event.channel;

        dataChannel.onopen = function () {
            console.log("Data channel opened");
            // Now you can send data over dataChannel
            dataChannel.send("Hello, I am Nayeem. I got your message Rakibul");
        };

        dataChannel.onmessage = function (event) {
            console.log("Data received from sender:", event.data);
        };
    };
}

function handleOffer(offer) {
    yourConn.setRemoteDescription(new wrtc.RTCSessionDescription(offer));

    yourConn.createAnswer().then(function (answer) {
        console.log("Creating answer from receiver.");
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
    console.log("Handling answer in receiver.");
    yourConn.setRemoteDescription(new wrtc.RTCSessionDescription(answer));
}

function handleCandidate(candidate) {
    console.log("Handling candidate in receiver.");
    yourConn.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
}

function handleLeave() {
    console.log("Peer disconnected.");
    // Handle disconnection if needed
}
