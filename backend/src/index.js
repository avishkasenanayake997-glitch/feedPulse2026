import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import feedbackRoutes from "./routes/feedbackRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

const allowed = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) || [
  "http://localhost:3000",
];
app.use(
  cors({
    origin: allowed,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.use("/api/feedback", feedbackRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    data: { name: "FeedPulse API", version: "1.0.0" },
    error: null,
    message: "OK",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: "NOT_FOUND",
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    data: null,
    error: "SERVER_ERROR",
    message: err.message || "Internal server error",
  });
});

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.warn("Warning: MONGO_URI is not set");
}

mongoose
  .connect(mongoUri || "mongodb://127.0.0.1:27017/feedpulse")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
