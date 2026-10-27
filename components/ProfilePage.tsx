/** Profile page shell. The content (header, stats, tabs, posts) is filled in by lib/ghetto.ts from get_profile(). */
export default function ProfilePage() {
  return (
    <section className="profile" id="profilePage" aria-label="Profile">
      <div className="pf-scroll" id="pfScroll">
        <div id="pfBody"></div>
      </div>
    </section>
  );
}
