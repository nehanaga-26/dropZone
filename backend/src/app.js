import authRoutes from "./routes/auth.routes.js";
import zonesRoutes from "./routes/zones.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import blocksRoutes from "./routes/blocks.routes.js";
import moderationRoutes from "./routes/moderation.routes.js";
import profilesRoutes from "./routes/profiles.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { supabaseAdmin } from "./lib/supabaseAdmin.js";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173"
}));

app.use(express.json({ limit: "1mb" }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false
}));

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "DropZone API"
  });
});
app.get("/health/supabase", async (_req, res) => {
  const { error } = await supabaseAdmin
    .from("dropzone_connection_test")
    .select("*")
    .limit(1);

  if (error && error.code !== "42P01") {
    return res.status(500).json({
      status: "error",
      message: "Supabase request failed",
      code: error.code
    });
  }

  res.json({
    status: "ok",
    service: "DropZone API",
    supabase: "connected"
  });
});
app.get("/reset-password", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DropZone - Reset Password</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 420px;
            margin: 80px auto;
            padding: 24px;
            background: #f4f4f4;
          }
          main {
            background: white;
            padding: 24px;
            border-radius: 12px;
          }
          input, button {
            box-sizing: border-box;
            width: 100%;
            padding: 12px;
            margin-top: 12px;
          }
          button {
            cursor: pointer;
          }
          #message {
            overflow-wrap: anywhere;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Reset your password</h1>
          <p>Enter your new DropZone password below.</p>

          <form id="reset-form">
            <label for="password">New password</label>
            <input
              id="password"
              type="password"
              minlength="8"
              autocomplete="new-password"
              required
              placeholder="At least 8 characters"
            />
            <button type="submit">Update password</button>
          </form>

          <p id="message" role="status"></p>
          <script type="module">
  import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

  const supabase = createClient(
    "https://umiaktgtrkwyvcodcbql.supabase.co",
    "sb_publishable_rEfLERUBjYJdKJMlDNqWSw_DxKO0BYg"
  );

  const form = document.getElementById("reset-form");
  const passwordInput = document.getElementById("password");
  const message = document.getElementById("message");

  async function prepareRecoverySession() {
    message.textContent = "Verifying your reset link...";

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        message.textContent =
          "This reset link is invalid or expired. Request a new one.";
        return false;
      }
    }

    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      message.textContent =
        "No valid recovery session found. Please request a new reset email.";
      return false;
    }

    message.textContent = "Enter your new password.";
    return true;
  }

  let recoveryReady = false;

  prepareRecoverySession().then((ready) => {
    recoveryReady = ready;
    form.querySelector("button").disabled = !ready;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!recoveryReady) {
      message.textContent = "Please open a valid password-reset link first.";
      return;
    }

    const password = passwordInput.value;

    if (password.length < 8) {
      message.textContent = "Your password must be at least 8 characters.";
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      message.textContent = error.message;
      return;
    }

    message.textContent =
      "Password updated successfully! You can now sign in with your new password.";
    form.reset();
  });
</script>
        </main>
      </body>
    </html>
  `);
});
app.use("/api/auth", authRoutes);
app.use("/api/zones", zonesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/blocks", blocksRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api/profiles", profilesRoutes);
app.use(errorHandler);
export default app;