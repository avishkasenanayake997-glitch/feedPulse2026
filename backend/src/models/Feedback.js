import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      maxlength: [120, "Title cannot exceed 120 characters"],
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [20, "Description must be at least 20 characters"],
      trim: true,
    },

    category: {
      type: String,
      enum: ["Bug", "Feature Request", "Improvement", "Other"],
      required: true,
    },

    status: {
      type: String,
      enum: ["New", "In Review", "Resolved"],
      default: "New",
    },

    submitterName: {
      type: String,
      default: "",
      maxlength: 120,
      trim: true,
    },

    submitterEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    ai_category: { type: String, default: null },
    ai_sentiment: {
      type: String,
      default: null,
    },
    ai_priority: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
    ai_summary: { type: String, default: null },
    ai_tags: { type: [String], default: [] },
    ai_processed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

feedbackSchema.index({ status: 1 });
feedbackSchema.index({ category: 1 });
feedbackSchema.index({ ai_priority: -1 });
feedbackSchema.index({ createdAt: -1 });

export default mongoose.model("Feedback", feedbackSchema);
