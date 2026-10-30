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

      <div className="bsheet" id="xrSheet" aria-hidden="true" role="dialog" aria-label="Edit room">
        <div className="bs-back"></div>
        <div className="bs-card">
          <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <div className="bs-body">
            <div className="cs ep">
              <div className="cs-who"><div><b>Edit room</b><small>Changes show to everyone right away</small></div></div>
              <label className="ep-l" htmlFor="xrTitle">Title</label>
              <input className="cs-in" id="xrTitle" type="text" maxLength={90} autoComplete="off" />
              <div className="ep-l">Type</div><div className="cr-opts-row" data-xg="rtype"></div>
              <label className="ep-l" htmlFor="xrArea">Area</label>
              <input className="cs-in" id="xrArea" type="text" maxLength={60} autoComplete="off" />
              <div className="cr-two">
                <div><label className="ep-l" htmlFor="xrPrice">Monthly rent (RWF)</label><input className="cs-in" id="xrPrice" type="text" inputMode="numeric" autoComplete="off" /></div>
                <div><label className="ep-l" htmlFor="xrKm">Distance (km)</label><input className="cs-in" id="xrKm" type="number" min={0} max={50} step={0.1} inputMode="decimal" /></div>
              </div>
              <div className="cr-two">
                <div><label className="ep-l" htmlFor="xrBeds">Bedrooms</label><input className="cs-in" id="xrBeds" type="number" min={1} max={20} inputMode="numeric" /></div>
                <div><label className="ep-l" htmlFor="xrFrom">Available from</label><input className="cs-in" id="xrFrom" type="date" /></div>
              </div>
              <div className="ep-l">Bathroom</div><div className="cr-opts-row" data-xg="bath"></div>
              <div className="ep-l">Deposit</div><div className="cr-opts-row" data-xg="dep"></div>
              <div className="ep-l">Minimum stay</div><div className="cr-opts-row" data-xg="min"></div>
              <div className="ep-l">What is included</div><div className="cr-opts-row" data-xg="fac"></div>
              <label className="ep-l" htmlFor="xrAbout">About the room <em id="xrAboutN">0/2000</em></label>
              <textarea id="xrAbout" rows={5} maxLength={2000}></textarea>
              <div className="ep-l">Photos</div>
              <div className="cr-photos xp-ph" id="xrPhotos"></div>
              <small className="ep-h" id="xrPhNote"></small>
              <div className="cs-err" id="xrErr" role="alert"></div>
              <button type="button" className="cs-send" id="xrSave">Save changes</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bsheet" id="xqSheet" aria-hidden="true" role="dialog" aria-label="Edit product">
        <div className="bs-back"></div>
        <div className="bs-card">
          <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <div className="bs-body">
            <div className="cs ep">
              <div className="cs-who"><div><b>Edit product</b><small>Changes show to everyone right away</small></div></div>
              <label className="ep-l" htmlFor="xqTitle">Title</label>
              <input className="cs-in" id="xqTitle" type="text" maxLength={90} autoComplete="off" />
              <div className="ep-l">Category</div><div className="cr-opts-row" data-xg="cat"></div>
              <div className="ep-l">Condition</div><div className="cr-opts-row" data-xg="cond"></div>
              <label className="ep-l" htmlFor="xqPrice">Price (RWF)</label>
              <input className="cs-in" id="xqPrice" type="text" inputMode="numeric" autoComplete="off" />
              <div className="xp-opts"><div className="cr-opt"><div><b>Price can be negotiated</b></div>
                <button type="button" className="st-sw" id="xqNeg" role="switch" aria-checked="false" aria-label="Price can be negotiated"><i></i></button></div></div>
              <label className="ep-l" htmlFor="xqLoc">Place</label>
              <input className="cs-in" id="xqLoc" type="text" maxLength={60} autoComplete="off" />
              <label className="ep-l" htmlFor="xqDesc">Description <em id="xqDescN">0/2000</em></label>
              <textarea id="xqDesc" rows={5} maxLength={2000}></textarea>
              <div className="ep-l">Photos</div>
              <div className="cr-photos xp-ph" id="xqPhotos"></div>
              <small className="ep-h" id="xqPhNote"></small>
              <div className="cs-err" id="xqErr" role="alert"></div>
              <button type="button" className="cs-send" id="xqSave">Save changes</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
