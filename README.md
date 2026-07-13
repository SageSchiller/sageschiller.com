# sageschiller.com

Personal professional site for Sage Schiller.

## Stack

A deliberately simple static site:

- `index.html`
- `styles.css`
- `favicon.svg`

No framework, build step, analytics, third-party scripts, or tracking pixels.

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

Before changing nameservers, copy every existing record from Namecheap into Cloudflare DNS. In particular, preserve any Google Workspace records:

- MX records
- SPF TXT record
- DKIM TXT/CNAME record
- DMARC TXT record
- domain verification records

Do not delete the old Namecheap DNS records until mail flow and the website both verify after propagation.

## Content notes

The initial copy is intentionally public-safe. It uses professional information from Sage's public LinkedIn profile and avoids sensitive work details, employer-internal systems, home address, direct email, or certification/exam dates.
