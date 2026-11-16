import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in backend/.env"
  );
}

const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

export async function signUp(req, res, next) {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      password.length < 8
    ) {
      return res.status(400).json({
        error: "Enter a valid email and a password of at least 8 characters."
      });
    }

    const { data, error } = await supabaseAuth.auth.signUp({
      email: email.trim(),
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      message: "Sign-up request processed. Check your email if confirmation is required.",
      user: data.user,
      session: data.session
    });
  } catch (error) {
    next(error);
  }
}

export async function signIn(req, res, next) {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: "Email and password are required."
      });
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    return res.json({
      message: "Signed in successfully.",
      user: data.user,
      session: data.session
    });
  } catch (error) {
    next(error);
  }
}
export async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body ?? {};

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        error: "Please enter your registered email address."
      });
    }

    const { error } = await supabaseAuth.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: "http://localhost:3000/reset-password"
      }
    );

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    return res.json({
      message:
        "If an account exists for this email, a password-reset link will be sent."
    });
  } catch (error) {
    next(error);
  }
}