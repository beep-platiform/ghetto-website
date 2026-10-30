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

## Accounts, login & settings

- Routes: `/login` (log in / create account), `/settings`, `/auth/callback`. `proxy.ts` sends logged-out visitors to `/login`.
- Creating an account makes the profile and settings row automatically (database trigger on `auth.users`).
- "Continue with Google" is a placeholder (marked "Soon") — to be wired up later.
- Settings: account (edit profile, password), privacy (private account, activity, who can message), notifications, language, help, log out, delete account. Open it from the gear on your profile, the sidebar, or the account menu.
- Run `supabase/migrations/0003_auth_settings.sql` after 0001 and 0002.

### Supabase Auth setup
1. Authentication → URL Configuration: set Site URL (`http://localhost:3000`, later your Vercel URL) and add Redirect URL `<site>/auth/callback`.
2. For quick development, Authentication → Providers → Email → turn off "Confirm email". Otherwise new users must click the email link first.

## Desktop right column, live notifications & paging

- **Profile** (desktop): the right column shows About (bio, area, role, joined, stats, Edit profile), Photos and "Linked with you" instead of Trending.
- **Settings** (desktop): categories sit in the middle; the one you pick (Notifications, Privacy, Language…) opens in the right column. On phones it stays one flat list.
- **Notifications are made by what people do** (database triggers): like, comment, reply, comment like, new link, room visit request, room message. Unliking / unlinking removes them. Your Settings switches decide which kinds you see.
- **Online**: new ones arrive one by one (polled every 15 s, instantly when the tab is focused) with a toast. **Offline**: likes and comments that came while you were away are combined per post ("Aline, Emerson and 3 others liked your post"); links always stay individual.
- **Paging**: nothing loads all at once. Feed (8), notifications (10), rooms (6), profile posts (8) load the next page when you scroll near the end, using a cursor (time + id), so nothing repeats or is skipped. Comments load only when a post is opened.
- Run `0004_notifications_paging.sql` and `0005_notif_photo_get_post.sql` after 0003 (already applied to the `ghetto` project).

## Create page (`/create`) and photo uploads

- Open it from **Create** (sidebar) or the **+** button (phone): *New post*, *Add a room* or *Share a price*. The profile "Write a post" button opens it too.
- A post has a **type** (Room, Tip, Market price, Question, Event), up to **6 photos**, title, details, **price** (Room / Market price), place, up to 5 **topics**, **who can see it** (Everyone or Linked only), **allow comments**, and a description of the photos (for screen readers).
- A **live preview** shows how it looks in the feed (in the right column on desktop). Text is kept as a **draft** in the browser (`localStorage`); photos stay while the tab is open.
- **Photos are shrunk in the browser** (`lib/image.ts`): longest side 1280 px, WebP (JPEG on old Safari), quality lowered until about 110 KB, location data removed. A 4 MB phone photo ends up around 25–110 KB and printed text stays readable. They are uploaded only when you press **Post** (parallel, with progress), into the public bucket `post-images` under your own folder (`<your id>/<random>.webp`).
- Storage rules (`0006_post_create.sql`): bucket limit 300 KB, only `image/webp` and `image/jpeg`, you can upload and delete only inside your own folder, and `create_post()` accepts only photo links from your own folder (max 6).
- Run `0006_post_create.sql` and `0007_post_layout.sql` after 0005 (already applied to the `ghetto` project). A post with 2+ photos (or a room with a photo) uses the big card, otherwise the compact row.
- "Linked only" posts are hidden from everyone who does not link with the author, and comments can be switched off per post (enforced in the database).
- Note: photo files are public by link (like most social apps), but the links are random and cannot be listed.

## Three-dot menus, deleting for real, square room cards

- **One menu everywhere** (bottom sheet on phones, small popover on desktop). It is on: every post (feed, profile, open post), comments, notifications, room details and profiles.
  - *My post*: Edit post (text, price, place, topics, who sees it, comments on/off, take photos off), Turn comments on/off, Copy link, Share, Delete.
  - *Someone else's post*: Save / Remove from saved, Copy link, Share, Link / Unlink, Not interested (hides it from your feed), Report.
  - *Comment*: Copy, Delete (your own, or any comment on your post), Report. *Notification*: Mark as read, Remove, Turn off that kind. *Room*: Copy link, Share, Report. *Profile*: Edit / Settings (yours), Copy link, Share, Link, Report.
  - Saved posts are in **Profile → Saved** (with saved rooms). Shared links open directly: `/?post=<id>`, `/rooms?room=<id>`.
- **Deleting removes the files too.** Deleting a post, taking a photo off a post while editing, removing a photo on the Create page, and deleting your account all delete the photo files from the `post-images` bucket (the browser does it with your own login; the database cannot remove storage files). If it fails (offline) the file is queued and retried the next time the app opens. Deleting the account first removes every photo you ever uploaded, and stops if that fails.
- Run `0008_menus_storage.sql` after 0007 (already applied to the `ghetto` project): saved/hidden/reported tables, `toggle_saved_post`, `get_saved_posts`, `hide_post`, `report_content`, `delete_comment`, `delete_notifications`, `update_post`, `my_photo_urls`; `delete_post` now returns the photo links.
- **Rooms** show 2 small square-cornered cards per row on phones and 4 on desktop.

## Addresses, the Back button, and Google

- **Every screen has its own address.** Pages: `/`, `/rooms`, `/create`, `/profile/<name>`, `/settings`. Things that open on top of a page: `/post/<id>`, `/rooms/<id>`, `/notifications`, `/search`. Opening one adds a browser history entry, so **Back** closes it and returns to exactly where you were (and Forward opens it again). The arrow buttons do the same as Back. Refreshing, or opening a shared link, opens the same thing. If you land straight on a post link, the arrow takes you to Home instead of leaving the site. The logic is the "ADDRESSES" block near the top of `lib/ghetto.ts` (`ovPush`, `ovBack`, `syncOverlays`).
- **Public pages for Google.** `/post/<id>` and `/rooms/<id>` are real server-rendered pages: logged-in people get the app with the post/room opened; everyone else (and search engines) gets a readable page with title, photos, text, `<title>`, description, canonical link, Open Graph/Twitter tags and JSON-LD (`SocialMediaPosting` for posts, `Product` + offer for rooms). Only posts meant for **Everyone**, from accounts that are **not private**, are public. `/sitemap.xml` lists them and `/robots.txt` points to it. Everything else (feed, profiles, settings, notifications) stays behind login.
- Set `NEXT_PUBLIC_SITE_URL` (for example `https://yourname.vercel.app` or your own domain) on Vercel so links in search results are right. After deploying, submit `https://<your site>/sitemap.xml` in Google Search Console.
- Run `0009_public_pages.sql` and `0010_get_room` after 0008 (both already applied to the `ghetto` project): `get_public_post`, `get_public_room`, `public_sitemap` (callable without login, read-only) and `get_room`.

## Posts, rooms and the marketplace

One **Create** page with a chooser at the top: **Post**, **Room**, **Product**. The form changes with the choice.

- **Post** (everyone): the normal feed post. Non-landlords can pick the type "About a room"; it stays a post and is never listed in Rooms.
- **Room** (landlords only, `profiles.role = 'Landlord'`, enforced in the database by `create_room`): full form (type, price, bedrooms, bathroom, distance, facilities, available from, deposit, minimum stay, 1–8 photos). New rooms appear first in Rooms. The owner gets **Edit room** and **Delete room** in the ⋯ menu.
- **Product** (everyone): marketplace listing (category, condition, price, negotiable, description, place, 1–6 photos). Page `/market`, product `/market/<id>`. Seller can edit, mark sold/available or delete; buyers can message the seller (sent as a notification) or report.

Deleting a room or product (or removing a photo while editing) also deletes the files from Storage. Edit screens can remove photos but not add new ones.
Public pages `/market/<id>` are indexable and listed in `sitemap.xml`.
Database: `supabase/migrations/0011_listings.sql` (already applied to the project).
