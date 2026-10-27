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
  profile/page.tsx            /profile (your own profile)
  profile/[handle]/page.tsx   /profile/<username> (anyone's profile)
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
- `supabase/migrations/0002_profiles.sql` — bio + cover, username rules, `get_profile`, `update_profile`, `delete_post` (already applied).
- `supabase/seed.sql` — sample data (regenerate with `node scripts/make-seed.mjs`); `supabase/seed_profiles.sql` — sample bios, covers and links.
- Security: every table has Row Level Security on with no policies, so the public key cannot touch tables directly.
  The app only calls these functions: `get_app_data`, `toggle_post_like`, `add_comment`, `toggle_comment_like`, `toggle_link`,
  `get_profile`, `update_profile`, `delete_post`, `mark_notification_read`, `mark_all_notifications_read`, `toggle_saved_room`, `send_room_message`, `request_room_visit`, `create_post`.
  The Supabase advisor flags them as "anon can execute SECURITY DEFINER function"; that is intentional until login exists.
- **No login yet:** every action is done as the demo user "Emmanuel" (`public.current_profile_id()`, which returns a fixed profile id, so changing your username is safe).
  When you add Supabase Auth, change that one function to return the profile of `auth.uid()` and grant the write functions to `authenticated` only.

## Profile page

- `/profile` is your profile, `/profile/<username>` is anyone's. Tap a name or photo on a post, a comment, a story, a search result,
  a notification, the "Who to link with" list or a landlord card to open that person's profile.
- Shows photo, cover, name, @username, role, place, bio, join date, and the **Posts / Links / Linking** numbers
  (Links = people linked with them, Linking = people they are linked with; tap a number to see the list).
- Tabs: **Posts** (their posts, with likes and comments working), **Rooms** (rooms they list) and, on your own profile, **Saved**.
- On your own profile: **Edit profile** (name, username, bio, place, Student/Landlord, photo and cover from presets) and delete your own posts
  (the ⋮ button on a post, or ⋮ in the post view). On other profiles: **Link / Linked** and a Message button (coming soon).
- Photos are picked from presets for now; uploading your own needs Supabase Storage (a good next step together with login).
