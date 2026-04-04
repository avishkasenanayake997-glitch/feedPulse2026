import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import feedbackRoutes from "./routes/feedbackRoutes.js";
import authRoutes from "./routes/authRoutes.js"; // 🔥 NEW

dotenv.config();

const app = express();

// 🔥 MIDDLEWARE
app.use(cors());
app.use(express.json());

// 🔥 ROUTES
app.use("/api/feedback", feedbackRoutes);
app.use("/api/auth", authRoutes); // 🔥 NEW

// 🔥 TEST ROUTE
app.get("/", (req, res) => {
  res.send("API is running...");
});

// 🔥 DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("DB Error:", err));

// 🔥 SERVER
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});