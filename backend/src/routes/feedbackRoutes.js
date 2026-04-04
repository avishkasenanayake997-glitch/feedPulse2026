import express from "express";
import {
  createFeedback,
  getAllFeedback,
  updateFeedbackStatus,
} from "../controllers/feedbackController.js";

const router = express.Router();

// 🔥 CREATE FEEDBACK
router.post("/", createFeedback);

// 🔥 GET ALL FEEDBACK (with query support)
router.get("/", getAllFeedback);

// 🔥 UPDATE STATUS
router.patch("/:id", updateFeedbackStatus);

export default router;