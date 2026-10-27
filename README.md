# Ghetto — Live. Learn. Grow.

Student housing and community app (home + rooms pages), built with **Next.js (App Router) + TypeScript**.
The design (HTML + CSS) is identical to the original static version. All content now comes from **Supabase** (project `ghetto`) and everything people do (likes, comments, links, saved rooms, messages, visit requests, new posts, notification read state) is saved back to it.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Deploy

1. Push to GitHub:
   ```bash
   git init && git add . && git commit -m "Ghetto home page"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. On [vercel.com](https://vercel.com) choose **Add New → Project**, import the repo and press **Deploy**.
   Add two **Environment Variables** (Settings → Environment Variables), same values as `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Project structure

```
app/
  layout.tsx        fonts + Font Awesome links, page metadata
  globals.css       the original CSS, unchanged
  page.tsx          / (home)
  rooms/page.tsx    /rooms (rooms list, filters, room detail, contact)
components/         one file per section (AppShell shared by both pages, Sidebar, TopBar, Stories, Feed,
                    RoomsPage, RoomDetail, FilterSheet, ...)
lib/supabase.ts    Supabase client + rpc() helper
lib/data.ts        getAppData(): one call to public.get_app_data()
lib/ghetto.ts       interactions: story viewer, post detail + comments, rooms filters + detail,
                    search, notifications, desktop right column (the original script, as a module)
```

Notes
- Stories and the feed are rendered on the server from the database; the same data is passed to `lib/ghetto.ts`.
- Pages are `force-dynamic`, so every visit reads fresh data.
- `lib/ghetto.ts` is the original vanilla script kept as-is (`// @ts-nocheck`) so behaviour matches the HTML
  version exactly. It runs once on mount from `components/GhettoClient.tsx`.
- Home and Rooms share one shell, so switching between them is instant (the URL changes between `/` and `/rooms`).
- Community / Profile show a "coming soon" toast.

## Database (Supabase)

- `supabase/migrations/0001_init.sql` — tables + functions (already applied to the `ghetto` project).
- `supabase/seed.sql` — sample data (regenerate with `node scripts/make-seed.mjs`).
- Security: every table has Row Level Security on with no policies, so the public key cannot touch tables directly.
  The app only calls these functions: `get_app_data`, `toggle_post_like`, `add_comment`, `toggle_comment_like`, `toggle_link`,
  `mark_notification_read`, `mark_all_notifications_read`, `toggle_saved_room`, `send_room_message`, `request_room_visit`, `create_post`.
  The Supabase advisor flags them as "anon can execute SECURITY DEFINER function"; that is intentional until login exists.
- **No login yet:** every action is done as the demo user "Emmanuel" (`public.current_profile_id()`).
  When you add Supabase Auth, change that one function to return the profile of `auth.uid()` and grant the write functions to `authenticated` only.
