require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

// Initialize Express app
const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "http://localhost:3000" })); // Match frontend URL
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log(err));

// Define Message Schema and Model (Includes Room Field)
const messageSchema = new mongoose.Schema({
  room: String,
  user: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

// Define Chat Room Schema and Model
const chatRoomSchema = new mongoose.Schema({
  name: { type: String, unique: true }, // Room names must be unique
});
const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);

// Includes displayName field
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  displayName: { type: String, required: false },
});
const User = mongoose.model("User", userSchema);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Handle socket connections
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join a specific chat room
  socket.on("joinRoom", async (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);

    // Fetch previous messages for that room
    const messages = await Message.find({ room });
    socket.emit("previousMessages", messages);
  });

  // Handle new messages in a room
  socket.on("sendMessage", async (data) => {
    try {
      // Find user by email
      const user = await User.findOne({ email: data.user });
  
      // Use displayName if available, otherwise use email
      const senderName = user?.displayName || data.user;
  
      const newMessage = new Message({
        room: data.room,
        user: senderName, // Store display name instead of email
        text: data.text,
      });
  
      await newMessage.save();
  
      // Broadcast message to users in that room
      io.to(data.room).emit("receiveMessage", newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });  

  // Leave a chat room
  socket.on("leaveRoom", (room) => {
    socket.leave(room);
    console.log(`User ${socket.id} left room: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// API Route to create a new chat room (Prevents Duplicates)
app.post("/chatrooms", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Chat room name is required" });

  try {
    const existingRoom = await ChatRoom.findOne({ name });
    if (existingRoom) return res.status(400).json({ error: "Chat room already exists" });

    const newRoom = new ChatRoom({ name });
    await newRoom.save();
    res.json(newRoom);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// API Route to get all chat rooms
app.get("/chatrooms", async (req, res) => {
  try {
    const rooms = await ChatRoom.find();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch chat rooms" });
  }
});

// API Route to get messages for a specific chat room
app.get("/messages/:room", async (req, res) => {
  const { room } = req.params;
  const messages = await Message.find({ room });
  res.json(messages);
});

// API Route to create or update user display name
app.post("/users", async (req, res) => {
  const { email, displayName } = req.body;
  if (!email || !displayName) {
    return res.status(400).json({ error: "Email and display name are required" });
  }

  try {
    let user = await User.findOne({ email });
    if (user) {
      user.displayName = displayName;
      await user.save();
    } else {
      user = new User({ email, displayName });
      await user.save();
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// API Route to get user display name by email
app.get("/users/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ displayName: user.displayName });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/users/:email", async (req, res) => {
  const { email } = req.params;
  const { displayName } = req.body;

  if (!displayName) {
    return res.status(400).json({ error: "Display name is required" });
  }

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { displayName },
      { new: true, upsert: true } // Ensure user is created if not found
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error updating display name:", error);
    res.status(500).json({ error: "Failed to update display name" });
  }
});


// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));