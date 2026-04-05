import express from "express";
import {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
  getFeedbackSummary,
  reanalyzeFeedback,
} from "../controllers/feedbackController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";
import { feedbackSubmitLimiter } from "../middleware/feedbackRateLimiter.js";

const router = express.Router();

router.post("/", feedbackSubmitLimiter, createFeedback);

router.get("/summary", requireAdmin, getFeedbackSummary);

router.get("/", requireAdmin, getAllFeedback);

router.get("/:id", requireAdmin, getFeedbackById);

router.patch("/:id", requireAdmin, updateFeedbackStatus);

router.delete("/:id", requireAdmin, deleteFeedback);

router.post("/:id/reanalyze", requireAdmin, reanalyzeFeedback);

export default router;
