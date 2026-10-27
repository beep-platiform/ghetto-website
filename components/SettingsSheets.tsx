/** Small sheets used by Settings: change password, log out, delete account, and the desktop account menu. */
export default function SettingsSheets() {
  return (
    <>
      <div className="bsheet" id="pwSheet" aria-hidden="true" role="dialog" aria-label="Change password">
        <div className="bs-back"></div>
        <div className="bs-card">
          <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <div className="bs-body"><div className="cs ep">
            <div className="cs-who"><div><b>Change password</b><small>Use at least 8 characters</small></div></div>
            <label className="ep-l" htmlFor="pwNew">New password</label>
            <input className="cs-in" id="pwNew" type="password" autoComplete="new-password" />
            <label className="ep-l" htmlFor="pwNew2">Repeat new password</label>
            <input className="cs-in" id="pwNew2" type="password" autoComplete="new-password" />
            <div className="ep-err" id="pwErr" role="alert"></div>
            <button type="button" className="cs-send" id="pwSave"><i className="fa-solid fa-check"></i>Save password</button>
          </div></div>
        </div>
      </div>

      <div className="bsheet" id="logoutSheet" aria-hidden="true" role="dialog" aria-label="Log out">
        <div className="bs-back"></div>
        <div className="bs-card">
          <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <div className="bs-body"><div className="cs">
            <div className="cs-who"><div><b>Log out of Ghetto?</b><small id="loSub">You can log back in any time.</small></div></div>
            <button type="button" className="cs-send" id="loGo"><i className="fa-solid fa-right-from-bracket"></i>Log out</button>
            <div className="cs-alt one"><button type="button" id="loCancel">Stay logged in</button></div>
          </div></div>
        </div>
      </div>

      <div className="bsheet" id="deleteSheet" aria-hidden="true" role="dialog" aria-label="Delete account">
        <div className="bs-back"></div>
        <div className="bs-card">
          <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <div className="bs-body"><div className="cs ep">
            <div className="cs-who"><div><b>Delete your account?</b><small>This cannot be undone</small></div></div>
            <p className="cs-safe warn"><i className="fa-solid fa-triangle-exclamation"></i>Your profile, posts, comments, links and saved rooms will be removed for good.</p>
            <label className="ep-l" htmlFor="dlConfirm">Type <b>DELETE</b> to confirm</label>
            <input className="cs-in" id="dlConfirm" type="text" autoComplete="off" autoCapitalize="characters" />
            <div className="ep-err" id="dlErr" role="alert"></div>
            <button type="button" className="cs-send danger" id="dlGo" disabled><i className="fa-solid fa-trash"></i>Delete my account</button>
          </div></div>
        </div>
      </div>

      <div className="um" id="userMenu" role="menu" aria-hidden="true">
        <button type="button" role="menuitem" data-um="profile"><i className="fa-regular fa-user"></i>My profile</button>
        <button type="button" role="menuitem" data-um="settings"><i className="fa-solid fa-gear"></i>Settings</button>
        <button type="button" role="menuitem" data-um="logout" className="danger"><i className="fa-solid fa-right-from-bracket"></i><span id="umLogout">Log out</span></button>
      </div>
    </>
  );
}
