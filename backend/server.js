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

const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [
      process.env.CLIENT_URL,
      /\.vercel\.app$/,        // allows all *.vercel.app preview URLs
      "http://localhost:5173",
    ];
    if (!origin) return callback(null, true); // allow non-browser requests
    const isAllowed = allowed.some((pattern) =>
      pattern instanceof RegExp ? pattern.test(origin) : pattern === origin
    );
    isAllowed ? callback(null, true) : callback(new Error("CORS blocked"));
  },
  credentials: true,
};

connectDB();

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/auth",     authRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/messages", messageRoutes);
app.get("/health", (_, res) => res.json({ status: "ok" }));

const io = new Server(server, {
  cors: corsOptions,
});

initSocket(io);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));