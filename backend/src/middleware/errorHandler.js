// Last middleware: always return JSON, never HTML stack.
export function errorHandler(err, _req, res, _next) {
  console.error("API error:", err?.message || err);
  const status = err?.status || 500;
  res.status(status).json({ error: err?.message || "Server error" });
}
