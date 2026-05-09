function getAppBaseUrl(env = process.env) {
  const configured = String(env.APP_BASE_URL || "").trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  return String(env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");
}

function buildLink(path, token, env = process.env) {
  const url = new URL(path, `${getAppBaseUrl(env)}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

function buildResendPayload({ from, to, subject, text, html }) {
  return {
    from,
    to: [to],
    subject,
    text,
    html,
  };
}

async function sendWithResend(env, payload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Email delivery failed.");
  }
}

export function ensureEmailConfig(env = process.env) {
  const provider = String(env.EMAIL_PROVIDER || "").trim().toLowerCase();
  const hasResendConfig = Boolean(String(env.RESEND_API_KEY || "").trim());
  const deliveryProvider = provider || (hasResendConfig ? "resend" : "noop");

  if (env.NODE_ENV === "production" && deliveryProvider === "noop") {
    throw new Error("Email delivery is required in production. Set EMAIL_PROVIDER=resend and RESEND_API_KEY.");
  }

  if (deliveryProvider === "resend" && !String(env.EMAIL_FROM || "").trim()) {
    throw new Error("EMAIL_FROM is required when EMAIL_PROVIDER=resend.");
  }

  return deliveryProvider;
}

export function createEmailService(env = process.env) {
  const provider = ensureEmailConfig(env);
  const from = String(env.EMAIL_FROM || "").trim();

  async function sendEmail({ to, subject, text, html }) {
    if (provider === "noop") {
      return { skipped: true };
    }

    if (provider !== "resend") {
      throw new Error("Unsupported email provider.");
    }

    await sendWithResend(
      env,
      buildResendPayload({
        from,
        to,
        subject,
        text,
        html,
      }),
    );

    return { skipped: false };
  }

  return {
    async sendPasswordReset(user, token) {
      const resetUrl = buildLink("/reset-password", token, env);
      return sendEmail({
        to: user.email,
        subject: "Reset your PesoTrace password",
        text: `Reset your PesoTrace password by opening this link: ${resetUrl}`,
        html: `<p>Reset your PesoTrace password by opening this link:</p><p><a href="${resetUrl}">Reset password</a></p>`,
      });
    },
  };
}
