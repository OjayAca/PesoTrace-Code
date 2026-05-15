import assert from "node:assert/strict";
import test from "node:test";
import { ensureEmailConfig } from "./email.js";

test("email config accepts smtp provider with required settings", () => {
  const provider = ensureEmailConfig({
    EMAIL_PROVIDER: "smtp",
    EMAIL_FROM: "PesoTrace <no-reply@example.com>",
    SMTP_HOST: "smtp-relay.brevo.com",
    SMTP_PORT: "587",
    SMTP_USER: "smtp-user",
    SMTP_PASS: "smtp-pass",
  });

  assert.equal(provider, "smtp");
});

test("email config treats brevo provider as smtp", () => {
  const provider = ensureEmailConfig({
    EMAIL_PROVIDER: "brevo",
    EMAIL_FROM: "PesoTrace <no-reply@example.com>",
    SMTP_HOST: "smtp-relay.brevo.com",
    SMTP_PORT: "587",
    SMTP_USER: "smtp-user",
    SMTP_PASS: "smtp-pass",
  });

  assert.equal(provider, "smtp");
});

test("email config rejects incomplete smtp provider settings", () => {
  assert.throws(
    () =>
      ensureEmailConfig({
        EMAIL_PROVIDER: "smtp",
        EMAIL_FROM: "PesoTrace <no-reply@example.com>",
        SMTP_HOST: "smtp-relay.brevo.com",
      }),
    /SMTP_USER, SMTP_PASS are required when EMAIL_PROVIDER=smtp/,
  );
});
