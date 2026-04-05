import Feedback from "../models/Feedback.js";
import {
  analyzeFeedback,
  summarizeWeeklyThemes,
} from "../services/geminiService.js";
import { sanitizeString, sanitizeEmail } from "../utils/sanitize.js";

const CATEGORIES = ["Bug", "Feature Request", "Improvement", "Other"];
const STATUSES = ["New", "In Review", "Resolved"];

function ok(res, status, data, message = "") {
  return res.status(status).json({
    success: true,
    data,
    error: null,
    message,
  });
}

function fail(res, status, message, error = "ERROR", data = null) {
  return res.status(status).json({
    success: false,
    data,
    error,
    message,
  });
}

export const createFeedback = async (req, res) => {
  try {
    const title = sanitizeString(req.body.title, 120);
    const description = sanitizeString(req.body.description, 8000);
    const category = req.body.category;
    const submitterName = sanitizeString(req.body.submitterName || "", 120);
    const submitterEmail = sanitizeEmail(req.body.submitterEmail);

    if (!title) {
      return fail(res, 400, "Title is required", "VALIDATION");
    }
    if (!description || description.length < 20) {
      return fail(
        res,
        400,
        "Description must be at least 20 characters",
        "VALIDATION"
      );
    }
    if (!CATEGORIES.includes(category)) {
      return fail(res, 400, "Invalid category", "VALIDATION");
    }

    const feedback = new Feedback({
      title,
      description,
      category,
      submitterName: submitterName || undefined,
      submitterEmail: submitterEmail || "",
    });

    const savedFeedback = await feedback.save();

    try {
      const aiResult = await analyzeFeedback(title, description);
      if (aiResult) {
        savedFeedback.ai_category = aiResult.category;
        savedFeedback.ai_sentiment = aiResult.sentiment;
        savedFeedback.ai_priority = aiResult.priority_score;
        savedFeedback.ai_summary = aiResult.summary;
        savedFeedback.ai_tags = aiResult.tags;
        savedFeedback.ai_processed = true;
        await savedFeedback.save();
      }
    } catch (err) {
      console.error("Gemini analysis failed (feedback still saved):", err.message);
    }

    return ok(res, 201, savedFeedback, "Feedback submitted");
  } catch (error) {
    console.error("createFeedback:", error);
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors || {})
        .map((e) => e.message)
        .join(" ");
      return fail(res, 400, msg || "Validation failed", "VALIDATION");
    }
    return fail(res, 500, "Server error", "SERVER_ERROR");
  }
};

export const getAllFeedback = async (req, res) => {
  try {
    const {
      category,
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query;

    const filter = {};

    if (category && CATEGORIES.includes(category)) {
      filter.category = category;
    }

    if (status && STATUSES.includes(status)) {
      filter.status = status;
    }

    if (search && String(search).trim()) {
      const q = sanitizeString(search, 200);
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { ai_summary: { $regex: q, $options: "i" } },
      ];
    }

    const sort = {};
    if (sortBy === "priority") {
      sort.ai_priority = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "sentiment") {
      sort.ai_sentiment = sortOrder === "asc" ? 1 : -1;
    } else {
      sort.createdAt = sortOrder === "asc" ? 1 : -1;
    }

    const skip = (Math.max(1, Number(page)) - 1) * Math.min(50, Math.max(1, Number(limit)));

    const [feedbacks, total, statsAgg] = await Promise.all([
      Feedback.find(filter).sort(sort).skip(skip).limit(Math.min(50, Math.max(1, Number(limit)))),
      Feedback.countDocuments(filter),
      Feedback.aggregate([
        {
          $facet: {
            total: [{ $count: "n" }],
            open: [{ $match: { status: { $ne: "Resolved" } } }, { $count: "n" }],
            avgPriority: [
              { $match: { ai_priority: { $ne: null } } },
              { $group: { _id: null, avg: { $avg: "$ai_priority" } } },
            ],
            tagCounts: [{ $unwind: "$ai_tags" }, { $group: { _id: "$ai_tags", c: { $sum: 1 } } }, { $sort: { c: -1 } }, { $limit: 1 }],
          },
        },
      ]),
    ]);

    const facet = statsAgg[0] || {};
    const totalCount = facet.total?.[0]?.n ?? 0;
    const openCount = facet.open?.[0]?.n ?? 0;
    const avgP = facet.avgPriority?.[0]?.avg;
    const topTag = facet.tagCounts?.[0]?._id ?? null;

    const stats = {
      total: totalCount,
      open: openCount,
      averagePriority: avgP != null ? Math.round(avgP * 10) / 10 : null,
      mostCommonTag: topTag,
    };

    const lim = Math.min(50, Math.max(1, Number(limit)));
    return ok(res, 200, {
      items: feedbacks,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / lim) || 1,
        limit: lim,
      },
      stats,
    });
  } catch (error) {
    console.error("getAllFeedback:", error);
    return fail(res, 500, "Error fetching feedback", "SERVER_ERROR");
  }
};

export const getFeedbackById = async (req, res) => {
  try {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) {
      return fail(res, 404, "Feedback not found", "NOT_FOUND");
    }
    return ok(res, 200, fb);
  } catch (error) {
    console.error("getFeedbackById:", error);
    return fail(res, 500, "Server error", "SERVER_ERROR");
  }
};

export const updateFeedbackStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return fail(res, 400, "Invalid status", "VALIDATION");
    }

    const updated = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return fail(res, 404, "Feedback not found", "NOT_FOUND");
    }

    return ok(res, 200, updated, "Status updated");
  } catch (error) {
    console.error("updateFeedbackStatus:", error);
    return fail(res, 500, "Error updating status", "SERVER_ERROR");
  }
};

export const deleteFeedback = async (req, res) => {
  try {
    const deleted = await Feedback.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return fail(res, 404, "Feedback not found", "NOT_FOUND");
    }
    return ok(res, 200, { id: deleted._id }, "Deleted");
  } catch (error) {
    console.error("deleteFeedback:", error);
    return fail(res, 500, "Server error", "SERVER_ERROR");
  }
};

export const getFeedbackSummary = async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const recent = await Feedback.find({ createdAt: { $gte: since } })
      .select("title ai_summary")
      .limit(80)
      .lean();

    if (recent.length === 0) {
      return ok(res, 200, {
        themes: [],
        generatedAt: new Date().toISOString(),
        windowDays: 7,
      });
    }

    const lines = recent
      .map((r) => {
        const s = r.ai_summary || "";
        return `${r.title} — ${s}`.trim();
      })
      .join("\n");

    let themes = await summarizeWeeklyThemes(lines);
    if (!themes || themes.length === 0) {
      themes = ["Not enough data for a detailed AI summary yet."];
    }

    return ok(res, 200, {
      themes: themes.slice(0, 3),
      generatedAt: new Date().toISOString(),
      windowDays: 7,
    });
  } catch (error) {
    console.error("getFeedbackSummary:", error);
    return fail(res, 500, "Could not generate summary", "SERVER_ERROR");
  }
};

export const reanalyzeFeedback = async (req, res) => {
  try {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) {
      return fail(res, 404, "Feedback not found", "NOT_FOUND");
    }

    const aiResult = await analyzeFeedback(fb.title, fb.description);
    if (!aiResult) {
      return fail(
        res,
        503,
        "AI could not analyse this item. Check GEMINI_API_KEY, GEMINI_MODEL (e.g. gemini-2.0-flash), and quota in Google AI Studio.",
        "AI_ERROR"
      );
    }

    fb.ai_category = aiResult.category;
    fb.ai_sentiment = aiResult.sentiment;
    fb.ai_priority = aiResult.priority_score;
    fb.ai_summary = aiResult.summary;
    fb.ai_tags = aiResult.tags;
    fb.ai_processed = true;
    await fb.save();

    return ok(res, 200, fb, "Re-analysed");
  } catch (error) {
    console.error("reanalyzeFeedback:", error);
    return fail(res, 500, "Server error", "SERVER_ERROR");
  }
};
