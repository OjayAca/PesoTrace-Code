import nodemailer from "nodemailer";

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
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || "Email delivery failed.";
    throw new Error(`Email delivery failed: ${message}`);
  }
}

function getSmtpPort(env = process.env) {
  const port = Number(env.SMTP_PORT || 587);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port.");
  }

  return port;
}

function getSmtpSecure(env = process.env, port = getSmtpPort(env)) {
  const configured = String(env.SMTP_SECURE || "").trim().toLowerCase();

  if (configured) {
    return ["1", "true", "yes"].includes(configured);
  }

  return port === 465;
}

function getSmtpConfig(env = process.env) {
  return {
    host: String(env.SMTP_HOST || "").trim(),
    port: getSmtpPort(env),
    user: String(env.SMTP_USER || "").trim(),
    pass: String(env.SMTP_PASS || "").trim(),
  };
}

function assertSmtpConfig(env = process.env) {
  const config = getSmtpConfig(env);
  const missing = [];

  if (!config.host) {
    missing.push("SMTP_HOST");
  }

  if (!config.user) {
    missing.push("SMTP_USER");
  }

  if (!config.pass) {
    missing.push("SMTP_PASS");
  }

  if (missing.length > 0) {
    throw new Error(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required when EMAIL_PROVIDER=smtp.`);
  }
}

export function ensureEmailConfig(env = process.env) {
  const provider = String(env.EMAIL_PROVIDER || "").trim().toLowerCase();
  const hasResendConfig = Boolean(String(env.RESEND_API_KEY || "").trim());
  const deliveryProvider = provider === "brevo" ? "smtp" : provider || (hasResendConfig ? "resend" : "noop");

  if (env.NODE_ENV === "production" && deliveryProvider === "noop") {
    throw new Error("Email delivery is required in production. Set EMAIL_PROVIDER=smtp or EMAIL_PROVIDER=resend.");
  }

  if (["resend", "smtp"].includes(deliveryProvider) && !String(env.EMAIL_FROM || "").trim()) {
    throw new Error(`EMAIL_FROM is required when EMAIL_PROVIDER=${deliveryProvider}.`);
  }

  if (deliveryProvider === "smtp") {
    assertSmtpConfig(env);
  }

  return deliveryProvider;
}

export function createEmailService(env = process.env) {
  const provider = ensureEmailConfig(env);
  const from = String(env.EMAIL_FROM || "").trim();
  const smtpConfig = provider === "smtp" ? getSmtpConfig(env) : null;
  const smtpTransporter =
    provider === "smtp"
      ? nodemailer.createTransport({
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: getSmtpSecure(env, smtpConfig.port),
          auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass,
          },
        })
      : null;

  async function sendEmail({ to, subject, text, html, metadata = {} }) {
    if (provider === "noop") {
      if (metadata.resetUrl) {
        console.log("-----------------------------------------");
        console.log("DEBUG: Password Reset Link Generated");
        console.log(`To: ${to}`);
        console.log(`Link: ${metadata.resetUrl}`);
        console.log("-----------------------------------------");
      }
      return { skipped: true };
    }

    if (provider === "smtp") {
      await smtpTransporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });

      return { skipped: false };
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
        metadata: { resetUrl },
      });
    },
  };
}
