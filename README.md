# sageschiller.com

Personal professional site for Sage Schiller.

## Stack

A deliberately simple site:

- `index.html`, `styles.css`, `favicon.svg`, `headshot.jpg`
- `404.html` and `sent.html` (styled error and confirmation pages)
- `.well-known/security.txt` (RFC 9116)
- `worker.js` and `wrangler.jsonc` (one Cloudflare Worker that serves the static
  files and handles `POST /api/contact`)

No framework, npm, build step, analytics, third-party scripts, or tracking pixels.

## Contact form backend

The form on the site POSTs to `/api/contact`. The Worker validates the
submission (honeypot field, length limits) and forwards it to a private
Discord channel via webhook. The visitor never sees an email address and the
webhook URL never appears in the repo.

One-time setup:

1. In Discord: Server Settings > Integrations > Webhooks > New Webhook.
   Point it at a private channel and copy the webhook URL.
2. In Cloudflare: Workers & Pages > sageschillercom > Settings >
   Variables and Secrets > Add > type "Secret", name `DISCORD_WEBHOOK_URL`,
   paste the URL, deploy.

Until the secret is set, the endpoint returns a friendly 503 pointing people
at LinkedIn.

## Local preview

```bash
cd ~/sageschiller.com
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deploy with Cloudflare Pages

1. Create a Cloudflare account and add this repository to **Workers & Pages → Create application → Pages → Connect to Git**.
2. Select this GitHub repository.
3. Use these settings:
   - Framework preset: `None`
   - Build command: *(leave blank)*
   - Build output directory: `/`
4. Deploy. Cloudflare will create a `*.pages.dev` preview URL.
5. In the Pages project, add the custom domain `sageschiller.com` and `www.sageschiller.com`.
6. In Namecheap, update the domain's nameservers to the two Cloudflare nameservers Cloudflare provides.

## DNS safety checklist

DNS is hosted on Cloudflare (nameservers moved from Namecheap, July 2026). Email runs on Proton Mail, so when editing DNS, always preserve:

- MX records (`mail.protonmail.ch`, `mailsec.protonmail.ch`)
- SPF TXT record (`v=spf1 include:_spf.protonmail.ch ~all`)
- DKIM CNAME records (`protonmail._domainkey`, `protonmail2._domainkey`, `protonmail3._domainkey`; set to "DNS only", not proxied)
- DMARC TXT record
- `protonmail-verification` TXT record

If Proton's domain settings show DKIM as unverified, copy the three DKIM CNAME values from Proton into Cloudflare DNS.

## Content notes

The initial copy is intentionally public-safe. It uses professional information from Sage's public LinkedIn profile and avoids sensitive work details, employer-internal systems, home address, direct email, or certification/exam dates.
