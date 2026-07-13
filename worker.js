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

async function handleContact(request, env) {
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
