import rateLimit from "express-rate-limit";

// Posting cap: max 10 posts per 10 minutes per IP (Slide 7: rate limits).
export const postLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many posts. Please wait a few minutes." },
});
