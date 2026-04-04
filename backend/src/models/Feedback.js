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
      minlength: [5, "Description must be at least 5 characters"],
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "Bug",
        "Feature Request",
        "Improvement",
        "Other",
        "User Feedback",
      ],
      default: "Other",
    },

    status: {
      type: String,
      enum: ["New", "In Review", "Resolved"],
      default: "New",
    },

    // 🔥 USER INFO
    submitterName: {
      type: String,
      default: "Anonymous",
      trim: true,
    },

    submitterEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    // 🔥 AI FIELDS
    ai_category: {
      type: String,
      default: null,
    },

    ai_sentiment: {
      type: String,
      enum: ["Positive", "Neutral", "Negative", null],
      default: null,
    },

    ai_priority: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    ai_summary: {
      type: String,
      default: null,
    },

    ai_tags: {
      type: [String],
      default: [],
    },

    ai_processed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Feedback", feedbackSchema);