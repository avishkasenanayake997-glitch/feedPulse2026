import Feedback from "../models/Feedback.js";
import { analyzeFeedback } from "../services/geminiService.js";

// 🔹 CREATE FEEDBACK + AI
export const createFeedback = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      submitterName,
      submitterEmail,
    } = req.body;

    // ✅ VALIDATION
    if (!title || !description || description.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Title and description (min 5 chars) required",
      });
    }

    // ✅ SAVE FEEDBACK FIRST
    const feedback = new Feedback({
      title,
      description,
      category,
      submitterName,
      submitterEmail,
    });

    const savedFeedback = await feedback.save();

    // 🤖 AI ANALYSIS (SAFE)
    let aiResult = null;

    try {
      aiResult = await analyzeFeedback(title, description);
    } catch (err) {
      console.log("AI Error:", err.message);
    }

    // ✅ APPLY AI RESULT SAFELY
    if (aiResult) {
      savedFeedback.ai_category = aiResult.category || null;
      savedFeedback.ai_sentiment = aiResult.sentiment || null;

      // 🔥 FIX: Clamp priority between 1–5
      const priority = aiResult.priority_score || 3;
      savedFeedback.ai_priority = Math.min(Math.max(priority, 1), 5);

      savedFeedback.ai_summary = aiResult.summary || null;
      savedFeedback.ai_tags = aiResult.tags || [];
      savedFeedback.ai_processed = true;

      await savedFeedback.save();
    }

    res.status(201).json({
      success: true,
      data: savedFeedback,
    });
  } catch (error) {
    console.log("SERVER ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 🔥 GET ALL FEEDBACK + FILTER + SEARCH + PAGINATION
export const getAllFeedback = async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    // 🔍 SEARCH
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const feedbacks = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Feedback.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: feedbacks,
    });
  } catch (error) {
    console.log("GET ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Error fetching feedback",
    });
  }
};

// 🔥 UPDATE FEEDBACK STATUS
export const updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await Feedback.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.log("UPDATE ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Error updating status",
    });
  }
};