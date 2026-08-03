export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return new Response("method not allowed", { status: 405, headers: { allow: "POST" } });
      }
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

// Only these origins may post the contact form. A missing Origin header is
// allowed through: some privacy tools strip it, and rejecting those would block
// real people. This filters casual cross-origin abuse, it is not a wall.
const ALLOWED_ORIGIN = /^https?:\/\/([a-z0-9-]+\.)?sageschiller\.com$/i;

async function handleContact(request, env) {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGIN.test(origin)) {
    return failPage("That submission didn't come from the contact form.", 403);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return failPage("That submission didn't look like a form post.", 400);
  }

  const field = (name, max) => (form.get(name) || "").toString().trim().slice(0, max);
  const name = field("name", 120);
  const reply = field("reply", 200);
  const message = field("message", 2000);

  // Honeypot: humans never see this field. Pretend success so bots move on.
  if (field("website", 20)) return seeOther("/sent.html");

  if (!reply || message.length < 10) {
    return failPage("A reply address and a message of at least 10 characters are required.", 400);
  }

  const human = await verifyTurnstile(request, env, field("cf-turnstile-response", 2048));
  if (!human) {
    return failPage("Couldn't verify that submission came from a person. Reload the page and try again.", 403);
  }

  // Per-IP throttle. Skipped when the binding isn't configured so the Worker
  // keeps working without it.
  if (env.RATE_LIMIT) {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    try {
      const { success } = await env.RATE_LIMIT.limit({ key: ip });
      if (!success) {
        return failPage("That's a lot of messages in a short time. Try again in a few minutes.", 429);
      }
    } catch {
      // Throttle unavailable: let the message through rather than lose it.
    }
  }
  if (!env.DISCORD_WEBHOOK_URL) {
    return failPage("The contact channel isn't wired up yet. Reach me on LinkedIn instead.", 503);
  }

  const res = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "New message via sageschiller.com",
          description: message,
          color: 0x4ce0b3,
          fields: [
            { name: "Name", value: name || "(not given)", inline: true },
            { name: "Reply to", value: reply, inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!res.ok) return failPage("Delivery failed on my end. Reach me on LinkedIn instead.", 502);
  return seeOther("/sent.html");
}

// Returns true when the message should be delivered.
//
// Deliberately fails OPEN: if Cloudflare's verifier is unreachable, times out,
// or returns something unexpected, the message goes through. Losing a genuine
// message costs more than letting one spam through.
//
// It does NOT fail open when the verifier answers and says the token is bad.
// That is a real bot signal, and honouring it is the entire point.
async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET) return true; // not configured yet
  if (!token) return false; // widget present but no token: automated post

  try {
    const body = new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token,
    });
    const ip = request.headers.get("cf-connecting-ip");
    if (ip) body.set("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return true; // verifier unhealthy: fail open
    const outcome = await res.json();
    return outcome.success === true; // explicit verdict, honour it
  } catch {
    return true; // network error or timeout: fail open
  }
}

function seeOther(location) {
  return new Response(null, { status: 303, headers: { location } });
}

function failPage(reason, status) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex"><title>Message not sent | Sage Schiller</title>
<style>body{margin:0;min-height:100svh;display:grid;place-content:center;background:#060809;color:#e8eef1;font-family:ui-monospace,Menlo,Consolas,monospace;padding:2rem;line-height:1.6}p{max-width:34rem}a{color:#4ce0b3}</style>
</head><body><div><p>message not sent.</p><p>${reason}</p><p><a href="/#connect">back to the form</a></p></div></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html;charset=utf-8" } });
}
