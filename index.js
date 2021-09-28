const { Server } = require("socket.io");
//key: gameId, value: {white:socket.id, black:socket.id}
let ongoingGames = new Map();
let emailToSocketMap = new Map();
const io = new Server(3001,{
    cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

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
    //TODO
    console.log(message.responder ,"has accepted the challenge from ", message.challengeSender);
  });
  socket.on("challenge-rejected", (message)=>{
    //TODO
    console.log(message.responder ,"has rejected the challenge from ", message.challengeSender);
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
  })
  socket.on("create-new-or-join-existing-game", (message) => {
    //console.log(message);
    let playerColor = "";
    if(ongoingGames.has(message.gameId)){
        let game = ongoingGames.get(message.gameId);
        if(game.hasOwnProperty("black") && !(game.hasOwnProperty("white"))){
            ongoingGames.set(message.gameId, {...game, white: socket.id});
            playerColor = "white";
        } 
        if(game.hasOwnProperty("white") && !(game.hasOwnProperty("black"))){
            ongoingGames.set(message.gameId, {...game, black: socket.id});
            playerColor = "black";
        } 
    }else{
        ongoingGames.set(message.gameId, {"white": socket.id});
        playerColor = "white";
    }
    //console.log(ongoingGames);
    socket.emit("playerColorSet", {playerColor});
});

socket.on("movedPiece", (message)=>{
    //console.log("movedPiece event occured");
    let boardState = message.boardState;
    let turn = message.turn;
    let game = ongoingGames.get(message.gameId);
    if(message.playerColor === "white"){
        io.to(game.black).emit("opponentMovedPiece", {boardState, turn});
    }else{
        io.to(game.white).emit("opponentMovedPiece", {boardState, turn});
    }
});
});
