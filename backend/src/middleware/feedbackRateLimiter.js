import rateLimit from "express-rate-limit";

/**
 * Nice-to-have: max 5 submissions per IP per hour (assignment).
 */
export const feedbackSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: "RATE_LIMIT",
    message: "Too many submissions from this IP. Try again in an hour.",
  },
});
