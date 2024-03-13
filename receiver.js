const WebSocket = require('ws');
const wrtc = require('wrtc');
const fs = require('fs');
//const speaker = require('speaker');

const { exec } = require('child_process');



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

      // Log ice candidate to the console
    yourConn.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('ice candidate in receiver:');
            console.log(JSON.stringify(event.candidate));
            send({
                type: "candidate",
                candidate: event.candidate
            });
        }
    };

    yourConn.ondatachannel = function (event) {
        dataChannel = event.channel;

        dataChannel.onopen = function () {
            console.log("Data channel opened");
            dataChannel.send("Hi, got your message in the receiver side!")
        };
        console.log("before data received");
        dataChannel.onmessage = function (event) {

            console.log("Data received from sender:", event.data,", ", event.data.length, " bytes");

            // Save the received audio file
            // const receivedAudioFilePath = './received_audio.opus';
            // fs.writeFileSync(receivedAudioFilePath, event.data);
            // console.log("Audio received");

            //  // Play the received audio file
            //  const speakerStream = fs.createReadStream(receivedAudioFilePath);
            //  speaker(speakerStream);

            // const mp3FilePath = './received_audio_symphony.opus';
            // try {
            //     fs.writeFileSync(mp3FilePath, event.data);
            //     console.log('File created:', mp3FilePath);
            // } catch (error) {
            //     console.error('Error writing file:', error);
            // }

            
        //     const command = `ffplay -nodisp -autoexit ${mp3FilePath}`;
        //  console.log("Audio received");
            

        //     const childProcess = exec(command, (error, stdout, stderr) => {
        //         if (error) {
        //             console.error(`ERR => ${error.message}`);
        //             return;
        //         }
        //         if (stderr) {
        //             console.error(`ERR => ${stderr}`);
        //             return;
        //         }
        //         console.log("playing started");
        //     });
            
            
        //     childProcess.on('exit', (code, signal) => {
        //         console.log("Child process exited");
        //     });
            
           
        };

        dataChannel.onclose = function () {
            console.log('Data channel is closed.');
        };
    
        dataChannel.onerror = function (error) {
            console.error('Data channel error:', error);
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
    yourConn.addIceCandidate(new wrtc.RTCIceCandidate(candidate))
    .then(() => console.log("ICE candidate added successfully"))
    .catch(error => console.error("Failed to set ICE candidate.", error));
}

function handleLeave() {
    console.log("Peer disconnected.");
    // Handle disconnection if needed
}

// Trigger the connection setup
initializeReceiver();
