# Online store (Next.js + Supabase + Vercel)

A modern, mobile-friendly online store where customers pay by **bank transfer and upload a payment slip**, and you approve each payment from an admin area.

**What is included**

| Shop (customers) | Admin (you) |
| --- | --- |
| Home, categories, search, filters (category, price, size/color, in stock), sorting, pages | Dashboard: revenue, orders by status, 14-day chart, low stock, slips waiting for review |
| Product pages with photo gallery, size/color pickers, live stock | Products: add, edit, hide, delete, photos, variants, stock |
| Cart, checkout, account, order tracking | Orders: view slip, approve, reject (stock returns), mark delivered |
| Sign up, sign in, password reset | Categories and Settings (bank details, shipping fee) |

**Order statuses:** `Pending payment` → `Slip uploaded` → `Approved` → `Delivered`, or `Rejected` (also used when a customer cancels).

> **Honest note:** this code was written and checked carefully, and the database part was tested end-to-end on a real PostgreSQL. But the website part could **not** be compiled in the environment it was written in (no access to the npm package registry). The first `npm run build` on your computer is therefore its first real build. If it prints an error, copy the message to Claude and it will be fixed quickly.

---

## Step 1. Install the tools (once)

1. Install **Node.js** (the "LTS" version) from <https://nodejs.org>. To check, open the **Terminal** app and type `node -v`. It should show v20 or higher.
2. Make a free account at <https://supabase.com> (database + file storage + logins).
3. Make a free account at <https://github.com> and <https://vercel.com> (for putting the shop online). Sign up to Vercel with your GitHub account.

## Step 2. Set up the database (Supabase)

1. In Supabase click **New project**. Choose a name and a strong database password, and the region closest to your customers. Wait until it finishes.
2. Open **SQL Editor** → **New query**. Open the file `supabase/schema.sql` from this folder, copy everything, paste it, and press **Run**. It should end with "Success".
3. *(Optional, recommended for a first try)* Do the same with `supabase/seed.sql`. It adds a few demo products so the shop is not empty. You can delete them later.
4. Open **Project Settings → API** (or "API Keys"). You need two values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **Publishable key** (long text starting with `sb_publishable_…`; the older "anon" key also works).
   Never use the "secret" or "service_role" key. This project does not need it.
5. Open **Authentication → Sign In / Providers → Email**. Keep "Confirm email" **on** (recommended) and set the minimum password length to **8**.

## Step 3. Run the shop on your computer

Open the **Terminal** app and run these one at a time:

```bash
cd "/Users/nasru/claude projects/ecom_demo_shop"
cp .env.example .env.local
open -e .env.local
```

The last command opens the file in TextEdit. Fill in your **Project URL** and **Publishable key**, set your currency (and time zone), save, and close it. Then:

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You should see the shop (with demo products if you ran `seed.sql`). Press `Ctrl + C` in Terminal to stop it.

**Allow sign-in links to work locally:** in Supabase go to **Authentication → URL Configuration**, set **Site URL** to `http://localhost:3000` and add `http://localhost:3000/**` under **Redirect URLs**.

## Step 4. Make yourself the admin

1. On the shop, click **Sign in → Create an account**, and register with your email. Confirm the email if Supabase asks you to.
2. In Supabase open **SQL Editor** and run (use your own email):

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Refresh the shop. An **Admin** link now appears in the top bar.

Nobody can make themselves an admin from the website. It can only be done here, in your Supabase project.

## Step 5. Fill the shop with your things

1. **Admin → Settings:** store name, your bank name / account name / account number (shown to customers after they order), shipping fee.
2. **Admin → Categories:** add your categories.
3. **Admin → Products → Add product:** name, price, photos, and stock. For sizes or colors, add options (for example *Size:* `S, M, L`), press **Create variants from options**, then set the stock for each.

**Photos are compressed automatically** in two steps: your browser shrinks each photo (longest side 1600 px, typically 100 to 300 KB) before uploading, and the server checks it and re-saves it as WebP, removing hidden camera data such as GPS location. Photos live in Supabase **Storage**, not in the database, so the database stays small.

## Step 6. Put it online (Vercel)

1. Put this folder on GitHub: in <https://github.com> click **New repository** (private is fine), then follow GitHub's "push an existing repository" instructions, or use GitHub Desktop.
   The file `.gitignore` already keeps your `.env.local` secrets out of GitHub.
2. In Vercel click **Add New → Project**, pick the repository, and before pressing **Deploy** open **Environment Variables** and add the same values as in `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` (your Vercel address, e.g. `https://my-shop.vercel.app`), `NEXT_PUBLIC_CURRENCY`, and `NEXT_PUBLIC_TIMEZONE`.
3. Press **Deploy**.
4. Back in Supabase → **Authentication → URL Configuration**: set **Site URL** to your Vercel address and add `https://YOUR-ADDRESS/**` to **Redirect URLs** (keep the localhost one for testing). Without this, confirmation and password-reset emails will not work.

If you add your own domain later, repeat step 4 with the new address and update `NEXT_PUBLIC_SITE_URL`.

---

## How an order works

1. The customer signs in, adds items to the cart, and checks out with their delivery details.
2. The database **reserves the stock** and works out the prices and total itself. (Prices from the browser are never trusted.) The order starts as **Pending payment**.
3. The customer sees your bank details and the order number, transfers the money, and uploads a photo of the slip. The order becomes **Slip uploaded**.
4. In **Admin → Orders** you open the order, look at the slip, and press **Approve payment** (→ **Approved**), later **Mark as delivered** (→ **Delivered**), or **Reject order** with a reason (→ **Rejected**, and the items go back into stock).
5. Customers can cancel orders they have not paid for. Use **Orders → Release unpaid orders** to free the stock held by orders nobody paid within, say, 72 hours.

## Security, in plain words

- **Database rules (Row Level Security)** are on for every table. Customers can only see their own orders. Only admins can change products, categories, settings, and order statuses.
- **Orders, stock, and status changes happen inside the database** through checked functions. The website only sends "which variant and how many". It cannot set a price, skip a status, or approve its own payment.
- **Payment slips are private.** Only the customer who uploaded one and admins can open it, through short-lived links (10 minutes).
- **Uploads are verified by content,** not by file name. Only real JPG/PNG/WebP images pass; everything is resized and re-encoded. Size limits are enforced by the browser, the server, and the storage bucket.
- Admin pages and admin actions check the admin role on the server every time. Hiding a menu is not the protection; the checks are.
- Login sessions are refreshed and verified by Supabase on every request. Redirects after login only go to pages on your own site.
- **Browser protections** are set in `next.config.ts`: Content-Security-Policy, HSTS, no framing, no content-type sniffing, strict referrer policy.
- No secret keys are used anywhere. The only key in the app is the public "publishable" key, which is designed to be public and is limited by the database rules above.
- Passwords are handled entirely by Supabase Auth (hashed, rate-limited).

## Good to know / next steps

- **Emails:** customers are not emailed when an order is approved or delivered. They see the status on their order page. You can add emails later (for example with Resend plus a Supabase database webhook).
- **Extra protection against bots:** in Supabase → Authentication → Attack Protection you can switch on CAPTCHA for sign-up and login.
- **Backups:** the free Supabase plan has no automatic backups you can restore from. Consider the paid plan once real orders arrive.
- **Free-plan pause:** free Supabase projects pause after a week of no activity. Open the dashboard to wake it up.
- **Stricter CSP:** the current policy allows inline scripts, because Next.js needs them without extra setup. A nonce-based policy is a possible later hardening step.
- **Speed at scale:** pages are rendered fresh on each visit, so stock is always accurate. If traffic grows, add caching to the home page and product pages.
- **Tests:** none yet beyond the database checks. Add end-to-end tests (for example Playwright) before large changes.

## Folder map

```
supabase/schema.sql      database tables, rules, order logic, storage buckets (run once)
supabase/seed.sql        optional demo products
src/app/(shop)/          shop pages: home, products, category, cart, checkout, account, login
src/app/admin/           admin pages: dashboard, orders, products, categories, settings
src/actions/             server-side actions (the only code that changes data)
src/components/          screens and buttons
src/lib/                 helpers: database access, image compression, validation, formatting
src/middleware.ts        keeps logins fresh and guards private pages
next.config.ts           security headers and image settings
```

## Troubleshooting

| You see | Do this |
| --- | --- |
| "Supabase is not configured yet" | `.env.local` is missing or not filled in. Redo Step 3 and restart `npm run dev`. |
| Shop loads but is empty / dashboard says "could not be loaded" | `schema.sql` was not run, or your account is not admin yet (Step 4). |
| Confirmation email link says "expired" or goes to the wrong site | Check **Site URL** and **Redirect URLs** in Supabase (Step 3 and Step 6.4). |
| "Upload failed" for photos or slips | Re-run `supabase/schema.sql` (it is safe to run again) so the storage buckets and rules exist. |
| `npm install` or `npm run dev` fails | Copy the error text to Claude. |
