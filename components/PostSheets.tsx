/** Two small sheets for posts: "are you sure?" (replaces the browser confirm box) and "Edit post". */
export default function PostSheets() {
  return (
    <>
      <div className="bsheet" id="cfSheet" aria-hidden="true" role="alertdialog" aria-label="Please confirm">
        <div className="bs-back"></div>
        <div className="bs-card">
          <div className="bs-body">
            <div className="cs cf">
              <div className="cf-ic"><i className="fa-solid fa-trash"></i></div>
              <b id="cfTitle">Are you sure?</b>
              <p id="cfText"></p>
              <button type="button" className="cs-send danger" id="cfGo">Delete</button>
              <button type="button" className="cf-no" id="cfNo">Cancel</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bsheet" id="xpSheet" aria-hidden="true" role="dialog" aria-label="Edit post">
        <div className="bs-back"></div>
        <div className="bs-card">
          <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <div className="bs-body">
            <div className="cs ep">
              <div className="cs-who"><div><b>Edit post</b><small id="xpType">Post</small></div></div>

              <label className="ep-l" htmlFor="xpTitle">Title</label>
              <input className="cs-in" id="xpTitle" type="text" maxLength={90} autoComplete="off" />

              <label className="ep-l" htmlFor="xpBody">Details <em id="xpBodyN">0/2000</em></label>
              <textarea id="xpBody" rows={5} maxLength={2000}></textarea>

              <div id="xpPriceBox" hidden>
                <label className="ep-l" htmlFor="xpPrice">Price (RWF)</label>
                <input className="cs-in" id="xpPrice" type="text" inputMode="numeric" autoComplete="off" />
              </div>

              <label className="ep-l" htmlFor="xpLoc">Place</label>
              <input className="cs-in" id="xpLoc" type="text" maxLength={60} placeholder="e.g. Nyabugogo" autoComplete="off" />

              <label className="ep-l" htmlFor="xpTags">Topics <em>separate with spaces, up to 5</em></label>
              <input className="cs-in" id="xpTags" type="text" maxLength={80} placeholder="e.g. water wifi" autoComplete="off" autoCapitalize="none" />

              <div id="xpPhBox" hidden>
                <div className="ep-l">Photos</div>
                <div className="cr-photos xp-ph" id="xpPhotos"></div>
                <small className="ep-h" id="xpPhNote"></small>
              </div>

              <div className="xp-opts">
                <div className="cr-opt"><div><b>Who can see it</b></div>
                  <div className="st-seg" id="xpAud" role="radiogroup" aria-label="Who can see it"><button type="button" role="radio" data-v="everyone">Everyone</button><button type="button" role="radio" data-v="links">Linked</button></div>
                </div>
                <div className="cr-opt"><div><b>Allow comments</b></div>
                  <button type="button" className="st-sw on" id="xpCm" role="switch" aria-checked="true" aria-label="Allow comments"><i></i></button>
                </div>
                <div className="cr-opt col" id="xpAltBox" hidden><div><b>Describe your photos</b><small>Optional</small></div>
                  <input className="cr-in" id="xpAlt" type="text" maxLength={200} autoComplete="off" />
                </div>
              </div>

              <div className="cs-err" id="xpErr" role="alert"></div>
              <button type="button" className="cs-send" id="xpSave">Save changes</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
