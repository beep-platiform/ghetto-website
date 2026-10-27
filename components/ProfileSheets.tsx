import { AVATARS, COVERS } from '../lib/constants';
import { faceUrl, photoUrl } from '../lib/format';

/** Bottom sheets used by the profile page: edit profile, and the Links / Linking lists. */
export default function ProfileSheets() {
  return (
    <>
      <div className="bsheet" id="editSheet" aria-hidden="true" role="dialog" aria-label="Edit profile">
        <div className="bs-back"></div>
        <div className="bs-card">
          <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <div className="bs-body">
            <div className="cs ep">
              <div className="cs-who"><div><b>Edit profile</b><small>This is how people see you on Ghetto</small></div></div>

              <label className="ep-l" htmlFor="epName">Name</label>
              <input className="cs-in" id="epName" type="text" maxLength={40} autoComplete="off" />

              <label className="ep-l" htmlFor="epHandle">Username</label>
              <div className="ep-at"><span>@</span><input className="cs-in" id="epHandle" type="text" maxLength={20} autoComplete="off" autoCapitalize="none" spellCheck={false} /></div>
              <small className="ep-h" id="epHandleHint">3 to 20 letters, numbers or underscores</small>

              <label className="ep-l" htmlFor="epBio">Bio <em id="epBioN">0/160</em></label>
              <textarea id="epBio" rows={3} maxLength={160} placeholder="Tell people about yourself"></textarea>

              <label className="ep-l" htmlFor="epArea">Place</label>
              <input className="cs-in" id="epArea" type="text" maxLength={40} placeholder="e.g. Nyabugogo" autoComplete="off" />

              <div className="ep-l">I am a</div>
              <div className="ep-seg" id="epRole">
                <button type="button" data-role="Student"><i className="fa-solid fa-graduation-cap"></i>Student</button>
                <button type="button" data-role="Landlord"><i className="fa-solid fa-key"></i>Landlord</button>
              </div>

              <div className="ep-l">Profile photo</div>
              <div className="ep-pick" id="epAvatars">
                {AVATARS.map((id) => (
                  <button type="button" key={id} data-id={id} aria-label="Choose photo"><img alt="" src={faceUrl(id)} /></button>
                ))}
              </div>

              <div className="ep-l">Cover</div>
              <div className="ep-pick cov" id="epCovers">
                <button type="button" data-id="" aria-label="No cover" className="none"><i className="fa-solid fa-ban"></i></button>
                {COVERS.map((id) => (
                  <button type="button" key={id} data-id={id} aria-label="Choose cover"><img alt="" src={photoUrl(id, 'w=200&h=120')} /></button>
                ))}
              </div>

              <div className="ep-err" id="epErr" role="alert"></div>
              <button type="button" className="cs-send" id="epSave"><i className="fa-solid fa-check"></i>Save changes</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bsheet" id="linksSheet" aria-hidden="true" role="dialog" aria-label="People">
        <div className="bs-back"></div>
        <div className="bs-card">
          <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <div className="bs-body">
            <div className="cs">
              <div className="cs-who"><div><b id="lsTitle">Links</b><small id="lsSub"></small></div></div>
              <div id="lsList"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
