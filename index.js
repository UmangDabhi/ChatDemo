const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");
const fs = require("fs");
const CryptoJS = require("crypto-js");
const path = require("path"); // Import path module

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = 5000;

app.use(bodyParser.json());

// Load messages from file and decrypt
const loadMessages = (roomId) => {
  const filePath = `messages_${roomId}.json`;
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf8");
    const messages = JSON.parse(data);

    return messages;
  }
  return [];
};

// Save messages to file
const saveMessages = (roomId, messages) => {
  const filePath = `messages_${roomId}.json`;
  fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
};

// Handle socket connections
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("joinRoom", ({ roomId }) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);

    const messages = loadMessages(roomId);
    socket.emit("previousMessages", messages);
  });

  socket.on("sendMessage", ({ roomId, sender, message }) => {
    if (!message) {
      console.log("Empty message not sent.");
      return; // Don't proceed if message is empty
    }

    console.log("Received:", message);

    const messages = loadMessages(roomId);
    const newMessage = {
      sender,
      message: message,
      timestamp: new Date().toISOString(),
    };

    messages.push(newMessage);
    saveMessages(roomId, messages);

    io.to(roomId).emit("receiveMessage", {
      sender,
      message: message,
      timestamp: newMessage.timestamp,
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

console.log(path.join(__dirname, "public"));
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
