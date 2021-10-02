const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
  origin: "*",
  methods: ["GET", "POST"]
}
});
//key: gameId, value: {white:socket.id, black:socket.id}
let ongoingGames = new Map();
let emailToSocketMap = new Map();


io.on("connection", (socket) => {
  //console.log(socket.id);
  socket.on("register-client", (message) => {
      console.log("Registering client with email: ", message.email);
    emailToSocketMap.set(message.email, socket.id);
    let result = Array.from(emailToSocketMap.keys());
    console.log(result);
    socket.broadcast.emit("available-players-received", {emails: result});
  });
  socket.on("get-available-players", () => {
      let result = Array.from(emailToSocketMap.keys());
      console.log(result);
    socket.emit("available-players-received", {emails: result});
  });
  socket.on("new-challenge", (message) => {
      //console.log("new challenge: ", message);
      let sender = message.sender;
      let recepientSocket = emailToSocketMap.get(message.recepient);
      io.to(recepientSocket).emit("new-challenge-received", {sender});
  });
  socket.on("challenge-accepted", (message)=>{
    console.log(message.responder ,"has accepted the challenge from ", message.challengeSender, "gameId: ", message.gameId);
    let challengeSender = emailToSocketMap.get(message.challengeSender);
    let otherPlayerColor = (message.playerColor === "white") ? "black" : "white";
    io.to(challengeSender).emit("new-game-created", { gameId: message.gameId, playerColor: otherPlayerColor});
    let otherPlayerSocketId = emailToSocketMap.get(message.challengeSender);
    if(message.playerColor === "white")
      ongoingGames.set(message.gameId, {white: socket.id, black: otherPlayerSocketId});
    else
      ongoingGames.set(message.gameId, {white: otherPlayerSocketId, black: socket.id});
  });
  socket.on("challenge-rejected", (message)=>{
    console.log(message.responder ,"has rejected the challenge from ", message.challengeSender);
    let challengeSender = emailToSocketMap.get(message.challengeSender);
    io.to(challengeSender).emit("new-game-request-rejected", { responder: message.responder});
});
  socket.on("disconnect", ()=>{
      console.log("connection closed");
      //TODO: remove the email from the map
      let emailToRemove = "";
      for (let [key, value] of emailToSocketMap.entries()) {
        if (value === socket.id)
          emailToRemove = key;
      }
      console.log("removing: ", emailToRemove);
      emailToSocketMap.delete(emailToRemove);
      let result = Array.from(emailToSocketMap.keys());
      socket.broadcast.emit("available-players-received", {emails: result});
  });
  socket.on("movedPiece", (message) => {
    console.log("movedPiece event occured");
    let boardState = message.boardState;
    let turn = message.turn;
    let game = ongoingGames.get(message.gameId);
    if(message.playerColor === "white"){
        io.to(game.black).emit("opponentMovedPiece", {boardState, turn});
    }else{
        io.to(game.white).emit("opponentMovedPiece", {boardState, turn});
    }
  });

  socket.on("opponentPlayerUnderCheckMate", (message) => {
    let game = ongoingGames.get(message.gameId);
    if(message.playerColor === "white"){
      io.to(game.white).emit("playerUnderCheckMate");
    }else{
      io.to(game.black).emit("playerUnderCheckMate");
  }
  });

  socket.on("opponentPlayerUnderStaleMate", (message) => {
    let game = ongoingGames.get(message.gameId);
    if(message.playerColor === "white"){
      io.to(game.white).emit("playerUnderStaleMate");
    }else{
      io.to(game.black).emit("playerUnderStaleMate");
  }

  });
});

httpServer.listen(process.env.PORT || 3001);