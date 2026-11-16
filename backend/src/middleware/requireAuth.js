import { supabaseAdmin } from "../lib/supabaseAdmin.js";

// Soft auth: verifies Supabase access token when present, attaches req.authUser.
// No token -> req.authUser stays null (demo/persona mode still works).
export async function attachUser(req, _res, next) {
  req.authUser = null;
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return next();
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data?.user) {
      req.authUser = { id: data.user.id, email: data.user.email };
    }
  } catch {
    /* invalid token -> anonymous */
  }
  next();
}

// When a verified session exists, the claimed author id must match it.
// Prevents impersonating another user on writes.
export function requireOwnership(field) {
  return (req, res, next) => {
    if (req.authUser && req.body?.[field] && req.body[field] !== req.authUser.id) {
      return res.status(403).json({
        error: "Signed in as a different user. You can only act as yourself.",
      });
    }
    next();
  };
}
