require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const initSocket = require("./socket");

const authRoutes    = require("./routes/auth");
const userRoutes    = require("./routes/user");
const messageRoutes = require("./routes/message");

const app    = express();
const server = http.createServer(app);

const PORT       = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

connectDB();

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.use("/api/auth",     authRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/messages", messageRoutes);
app.get("/health", (_, res) => res.json({ status: "ok" }));

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] },
});

initSocket(io);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
