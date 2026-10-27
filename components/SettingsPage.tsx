/** Settings page shell. The rows are drawn by lib/ghetto.ts from get_settings() and saved with update_setting(). */
export default function SettingsPage() {
  return (
    <section className="settings" id="settingsPage" aria-label="Settings">
      <div className="st-scroll" id="stScroll">
        <div id="stBody"></div>
      </div>
    </section>
  );
}
