# Skate Shack

A web app for a skate-sharpening business:

- **Public site:** your logo, services and sharpening-card prices, hours and contact details.
- **Customers:** sign in with email/password or Google, Facebook or Microsoft. Keep a profile (phone, skates, hollow and profile preferences), and see sharpening history and remaining card credits.
- **Owner admin:** manage customers and their skates. Log, edit and delete sharpens. Sell sharpening cards and adjust credits (every change is recorded in a ledger). Set prices, and upload your logo and rename the business.

Built with Next.js 16, Prisma 7, Better Auth, Tailwind CSS 4 and PostgreSQL.

---

## How accounts work

Customers can't create their own logins; you create every customer. There are two ways to let a customer see their card, and you can use either or both. Both are on the customer's **Card link & login** tab, and both are also checkboxes on **Add customer**.

| Option | What the customer gets |
|---|---|
| **Private card link** (no login) | An email with a secret link (`/card/…`) showing their first name, card balance, sharpening history and card activity. It never shows their email, phone, last name or your private notes. |
| **Login invite** | An email with a temporary password. On first sign-in they must choose their own password. The temporary password stops working after 7 days. Once they have a login, Google sign-in with the same email also works. |

**How secure the card link is:**
- Each link holds a 256-bit random secret, and only a hash of it is stored. A database leak doesn't reveal working links.
- The page tells browsers and search engines not to cache, index or pass the link on (`Referrer-Policy: no-referrer`, `no-store`, `noindex`).
- Making a new link turns off the old one, and **Turn off link** disables it immediately.
- Anyone who has the link can see that card, so customers should keep it private. Links don't expire on their own.

**You (the owner):** the first time, the sign-in page shows **Set up owner account**. Use an address listed in `OWNER_EMAILS` and confirm it from the email. After that the tab disappears, and the sign-up API refuses any address not in `OWNER_EMAILS`.

**More owners:** go to **Admin → Owners → Add an owner**. No email is sent. You get a temporary password on screen to pass on, and they choose their own password at first sign-in. An address that already has a login simply becomes an owner. You don't need to add extra owners to `OWNER_EMAILS`. The same page can give another owner a new temporary password or remove them. Someone listed in `OWNER_EMAILS` can't be removed there, because they'd become an owner again at their next sign-in, so take them out of the variable first.

**Forgot password:** on the sign-in page, this sends a reset link to anyone who already has a login.

---

## Deploy for free: Render + Neon

### Why Neon for the database

| | Neon free | Render Postgres free | Supabase free |
|---|---|---|---|
| Cost | $0, no card | $0 | $0 |
| Expires? | **No** | **Deleted after 30 days** | Paused after 7 days without activity |
| Storage | 0.5 GB (years of sharpening records) | 1 GB | 500 MB |

Neon pauses the database after about 5 minutes without activity and wakes it on the next request, which takes under a second. The app's health check deliberately doesn't touch the database, so the database still gets to pause.

> **Heads-up about Render's free web service:** it goes to sleep after 15 minutes with no visitors, and the next visit takes about 30–60 seconds to load. For a shop that's often fine. Render's *Starter* plan ($7/mo) keeps it awake.

### 1. Create the database (Neon)
1. Sign up at <https://neon.tech> and create a project (pick the region closest to your Render region).
2. On the project dashboard click **Connect**:
   - With **Connection pooling ON**, copy the string → this is `DATABASE_URL`.
   - With **Connection pooling OFF**, copy the string → this is `DIRECT_URL`.

### 2. Set up email (Resend), needed for confirmation and password emails
1. Sign up at <https://resend.com>. The free plan allows 3,000 emails/month.
2. **Domains → Add domain**, then add the DNS records it shows at your domain registrar. Without your own domain, Resend can only send to your own address.
3. **API Keys → Create**. Copy it → `RESEND_API_KEY`.
4. Set `EMAIL_FROM`, e.g. `Skate Shack <hello@yourdomain.com>` (the domain must be the one you verified).

### 3. Push the code to GitHub
```bash
git add -A && git commit -m "Skate Shack" && git branch -M main
git remote add origin https://github.com/<you>/skate-shack.git && git push -u origin main
```

### 4. Deploy on Render
1. <https://dashboard.render.com> → **New + → Blueprint** → choose the repo. Render reads `render.yaml`.
2. Fill in the values it asks for: `DATABASE_URL`, `DIRECT_URL`, `OWNER_EMAILS` (your email), `RESEND_API_KEY` and `EMAIL_FROM`. Leave the social-login values and `BETTER_AUTH_URL` blank for now.
3. Click **Apply**. The first deploy installs, builds, creates the tables and adds starter prices.
4. Open `https://<your-service>.onrender.com`, click **Sign in → Set up owner account** with your `OWNER_EMAILS` address, and confirm the email. You're now the owner. Head to **Admin → Branding & settings** to upload your logo and set your name, then **Pricing** to set your prices.

### 5. Social sign-in (optional; each one is independent)
Use your live URL in the redirect URIs. With a custom domain, use that domain instead and set `BETTER_AUTH_URL` to it.

| Provider | Where | Redirect URI to register | Env vars |
|---|---|---|---|
| Google | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create OAuth client ID → *Web application* (set up the OAuth consent screen first) | `https://<app>.onrender.com/api/auth/callback/google` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Facebook | [Meta for Developers](https://developers.facebook.com/apps) → Create app → *Authenticate and request data from users with Facebook Login* → Facebook Login settings | `https://<app>.onrender.com/api/auth/callback/facebook` | `FACEBOOK_CLIENT_ID` (App ID), `FACEBOOK_CLIENT_SECRET` (App secret) |
| Microsoft | [Azure portal](https://portal.azure.com) → Microsoft Entra ID → App registrations → New. Choose *Accounts in any organizational directory and personal Microsoft accounts*, platform *Web*. Then Certificates & secrets → New client secret | `https://<app>.onrender.com/api/auth/callback/microsoft` | `MICROSOFT_CLIENT_ID` (Application ID), `MICROSOFT_CLIENT_SECRET` (secret **value**) |

Add the values in Render → your service → **Environment**, then save. Render redeploys, and the buttons appear on the sign-in page. Facebook apps must be switched to **Live** mode before the public can use them.

### Custom domain
Render → service → **Settings → Custom Domains**. Then set `BETTER_AUTH_URL=https://your.domain` and update the social redirect URIs.

---

## Local development

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL / DIRECT_URL / BETTER_AUTH_SECRET / OWNER_EMAILS
npx prisma migrate deploy     # create tables
npx prisma db seed            # starter prices + branding
npm run dev                   # http://localhost:3000
```

- No database handy? Run `npx prisma dev` for a local Postgres and paste the `postgres://…` URL it prints into both `DATABASE_URL` and `DIRECT_URL`.
- Without `RESEND_API_KEY`, emails (confirmation links, set-password links) are **printed in the terminal**, so you can click them from there.

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Unit tests (credit rules, customer linking) |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run db:migrate -- --name <change>` | Create a migration after editing `prisma/schema.prisma` |
| `npm run db:studio` | Browse the database |

## Project layout
```
prisma/schema.prisma          data model (customers, skates, products, sharpenings, credit ledger, settings)
prisma/seed.ts                one-time starter data
src/lib/auth.ts               Better Auth config (email/password, Google, Facebook, Microsoft)
src/lib/authz.ts              requireOwner() / requireCustomer() — used by every page AND server action
src/lib/credits.ts            sharpening-card ledger rules
src/lib/customer-link.ts      links a verified login to the owner-created customer record
src/app/page.tsx              public home page
src/app/login, src/app/auth   sign-in, set password, confirm email
src/app/account/*             customer area (login)
src/app/card/[token]          private no-login card page
src/lib/customer-access.ts    card links + temporary-password login invites
src/app/admin/*               owner admin
render.yaml                   Render Blueprint
```

## Notes
- **Credits:** a customer's balance is the sum of their ledger entries. Logging a sharpen paid with credits writes a matching −credits entry. Editing or deleting the sharpen updates or removes that entry, so the balance always reconciles. Balances can't go below zero.
- **Price history:** each sharpen stores the price and service name at the time, so changing prices later doesn't rewrite history.
- **Logo:** stored in the database, because Render's free disk is wiped on every deploy. PNG/JPG/WebP up to 1 MB.
- **Currency, locale and time zone:** set with `NEXT_PUBLIC_CURRENCY`, `NEXT_PUBLIC_LOCALE` and `APP_TIMEZONE` (defaults: CAD, en-CA, America/Toronto).
