const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);
const PORT = process.env.PORT || 7001;

app.use(express.static("public"));
app.get('/', (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

let connectedPeers = [];
let connectedPeersStrangers = [];
 

io.on('connection', (socket) => {
    connectedPeers.push(socket.id);
    console.log(connectedPeers);
    socket.on("pre-offer", (data) =>{
        console.log("pre offer come");
        const {calleePersonalCode, callType} = data;
        const connectedPeer = connectedPeers.find((peerSocketId) => 
            peerSocketId === calleePersonalCode
        );

        console.log(connectedPeer);

        if(connectedPeer){
            const data = {
                callerSocketId: socket.id,
                callType,
            };

            io.to(calleePersonalCode).emit('pre-offer', data);
        }
        else{
            const data = {preOfferAnswer: 'CALLEE_NOT_FOUND',};
            io.to(socket.id).emit('pre-offer-answer', data);
        } 

    });

    socket.on('pre-offer-answer', (data) => {
        console.log("pre offer answer come");
        console.log(data);
        const {callerSocketId} = data;
        const connectedPeer = connectedPeers.find(
            (peerSocketId) => peerSocketId === callerSocketId
        );

        if(connectedPeer){
            io.to(data.callerSocketId).emit('pre-offer-answer', data);
        }
    });

    socket.on('webRTC-signaling', (data) => {
        const {connectedUserSocketId} = data;

        const connectedPeer = connectedPeers.find(
            (peerSocketId) => peerSocketId ===  connectedUserSocketId
        );

        if(connectedPeer){
            io.to(connectedUserSocketId).emit("webRTC-signaling", data);
        }
    });

    socket.on('user-hanged-up', (data) => {
        const {connectedUserSocketId} = data;

        const connectedPeer = connectedPeers.find(
            (peerSocketId) => peerSocketId === connectedUserSocketId
        );
        if(connectedPeer){
            io.to(connectedUserSocketId).emit("user-hanged-up");
        }
    })
    
    socket.on("stranger-connection-status", (data) => {
        const {status} = data;
        if(status){
            connectedPeersStrangers.push(socket.id);
        }
        else{
            const newConnectionPeerStrangers = connectedPeersStrangers.filter((peerSocketId) => peerSocketId!= socket.id);
            connectedPeersStrangers = newConnectionPeerStrangers;
        }
        console.log(connectedPeersStrangers);
    })
    socket.on("get-stranger-socket-id",() => {
        let randomStrangerSocketId;
        const filteredConnectedPeersStrangers = connectedPeersStrangers.filter((peerSocketId) => peerSocketId != socket.id);
        if(filteredConnectedPeersStrangers.length > 0){
            randomStrangerSocketId = filteredConnectedPeersStrangers[Math.floor(Math.random() * filteredConnectedPeersStrangers.length)];
        }else{
            randomStrangerSocketId = null;
        }

        const data = {
            randomStrangerSocketId
        };
        io.to(socket.id).emit("stranger-socket-id", data);
    });

    socket.on("disconnect", () => {
        console.log("user disconnected");
        const newConnectedPeers = connectedPeers.filter((peerSocketId) => peerSocketId !== socket.id);
        connectedPeers = newConnectedPeers;
        console.log(connectedPeers);
    });
});

server.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
});
