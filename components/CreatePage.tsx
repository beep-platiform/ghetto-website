/**
 * Create page (/create): everything about writing a post. The pieces that change (photo tiles, chips, preview)
 * are drawn by lib/ghetto.ts; the draft is kept in the browser until you post.
 */
export default function CreatePage() {
  return (
    <section className="create" id="createPage" aria-label="Create a post">
      <div className="cr-scroll" id="crScroll">
        <header className="cr-top">
          <button type="button" className="pf-ico" data-cr="close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <b id="crHeadTitle">New post</b>
          <span className="cr-saved" id="crSaved" aria-live="polite"></span>
          <button type="button" className="cr-post" id="crPost" data-cr="post" disabled>Post</button>
        </header>

        <div className="cr-wrap">
          <div className="cr-draft" id="crDraft" hidden>
            <span><i className="fa-regular fa-clock"></i>We kept your draft</span>
            <button type="button" data-cr="discard">Discard</button>
          </div>

          <div className="cr-kinds" id="crKinds" role="radiogroup" aria-label="What are you sharing?"></div>
          <p className="cr-kindnote" id="crKindNote" hidden></p>

          <div className="cr-who">
            <div className="avatar"><img id="crAv" alt="" /></div>
            <div><b id="crName"></b>
              <button type="button" className="cr-aud cr-post-only" id="crAudPill" data-cr="aud" aria-label="Who can see this post"><i className="fa-solid fa-earth-africa"></i><span>Everyone</span><i className="fa-solid fa-chevron-down"></i></button>
            </div>
          </div>

          <div className="cr-types cr-post-only" id="crTypes" role="radiogroup" aria-label="Post type"></div>

          <section className="cr-card" aria-label="Photos">
            <div className="cr-h"><b>Photos</b><small id="crPhInfo">Up to 6</small></div>
            <div className="cr-photos" id="crPhotos"></div>
            <input type="file" id="crFile" accept="image/*" multiple hidden />
            <p className="cr-note" id="crSaving">Photos are shrunk on your phone before upload, so they load fast and cost no extra data.</p>
          </section>

          <section className="cr-card" aria-label="Write">
            <div className="cr-field">
              <label htmlFor="crTitle">Title</label>
              <input className="cr-in" id="crTitle" type="text" maxLength={140} placeholder="Give it a clear title" autoComplete="off" />
              <small className="cr-count" id="crTitleN">0/140</small>
            </div>
            <div className="cr-field">
              <label htmlFor="crBody" id="crBodyLabel">Details</label>
              <textarea className="cr-in" id="crBody" rows={5} maxLength={2000} placeholder="What do you want to share? Say what, where and how much."></textarea>
              <small className="cr-count" id="crBodyN">0/2000</small>
            </div>
            <div className="cr-field" id="crPriceBox" hidden>
              <label htmlFor="crPrice">Price</label>
              <div className="cr-price"><input className="cr-in" id="crPrice" type="text" inputMode="numeric" placeholder="e.g. 45,000" autoComplete="off" /><span>RWF</span></div>
              <small className="cr-hint" id="crPriceHint">Shown on the photo</small>
            </div>
          </section>

          <section className="cr-card" aria-label="Place">
            <div className="cr-h"><b id="crLocTitle">Place</b><small id="crLocOpt">Optional</small></div>
            <div className="cr-loc"><i className="fa-solid fa-location-dot"></i><input className="cr-in" id="crLoc" type="text" maxLength={60} placeholder="e.g. Nyabugogo" autoComplete="off" /></div>
            <div className="cr-chips" id="crLocChips"></div>
          </section>

          <section className="cr-card cr-room-only" id="crRoomCard" aria-label="Room details">
            <div className="cr-h"><b>Room details</b><small>Students filter by these</small></div>
            <div className="cr-l">Type</div>
            <div className="cr-opts-row" data-g="rtype"></div>
            <div className="cr-l">Bathroom</div>
            <div className="cr-opts-row" data-g="bath"></div>
            <div className="cr-two">
              <div className="cr-field"><label htmlFor="crBeds">Bedrooms</label><input className="cr-in" id="crBeds" type="number" min={1} max={20} inputMode="numeric" /></div>
              <div className="cr-field"><label htmlFor="crKm">Distance from campus (km)</label><input className="cr-in" id="crKm" type="number" min={0} max={50} step={0.1} inputMode="decimal" placeholder="e.g. 1.5" /></div>
            </div>
            <div className="cr-field"><label htmlFor="crFrom">Available from</label><input className="cr-in" id="crFrom" type="date" /></div>
            <div className="cr-l">Deposit</div>
            <div className="cr-opts-row" data-g="dep"></div>
            <div className="cr-l">Minimum stay</div>
            <div className="cr-opts-row" data-g="min"></div>
            <div className="cr-l">What is included</div>
            <div className="cr-opts-row" data-g="fac"></div>
          </section>

          <section className="cr-card cr-prod-only" id="crProdCard" aria-label="Product details">
            <div className="cr-h"><b>Product details</b></div>
            <div className="cr-l">Category</div>
            <div className="cr-opts-row" data-g="cat"></div>
            <div className="cr-l">Condition</div>
            <div className="cr-opts-row" data-g="cond"></div>
            <div className="cr-opt"><div><b>Price can be negotiated</b><small>Buyers will see “Negotiable”</small></div>
              <button type="button" className="st-sw" id="crNeg" role="switch" aria-checked="false" aria-label="Price can be negotiated"><i></i></button>
            </div>
          </section>

          <section className="cr-card cr-post-only" aria-label="Topics">
            <div className="cr-h"><b>Topics</b><small id="crTagN">0/5</small></div>
            <div className="cr-tags" id="crTags"></div>
            <div className="cr-loc"><i className="fa-solid fa-hashtag"></i><input className="cr-in" id="crTagIn" type="text" maxLength={25} placeholder="Add a topic, then press Enter" autoComplete="off" enterKeyHint="done" /></div>
            <div className="cr-chips" id="crTagChips"></div>
          </section>

          <section className="cr-card cr-opts cr-post-only" aria-label="Options">
            <div className="cr-h"><b>Options</b></div>
            <div className="cr-opt"><div><b>Who can see it</b><small id="crAudHint">Everyone on Ghetto</small></div>
              <div className="st-seg" id="crAud" role="radiogroup" aria-label="Who can see it"><button type="button" role="radio" data-v="everyone" className="on">Everyone</button><button type="button" role="radio" data-v="links" aria-checked="false">Linked</button></div>
            </div>
            <div className="cr-opt"><div><b>Allow comments</b><small>People can reply under your post</small></div>
              <button type="button" className="st-sw on" id="crCm" role="switch" aria-checked="true" aria-label="Allow comments"><i></i></button>
            </div>
            <div className="cr-opt col" id="crAltBox" hidden><div><b>Describe your photos</b><small>For people who use a screen reader (optional)</small></div>
              <input className="cr-in" id="crAlt" type="text" maxLength={200} placeholder="e.g. Single room with a bed, a desk and a window" autoComplete="off" />
            </div>
          </section>

          <div className="cr-prevhost" id="crPrevHost">
            <div className="cr-prev" id="crPrevBox">
              <div className="cr-h"><b>Preview</b><small id="crPrevNote">How it looks in the feed</small></div>
              <div id="crPrev"></div>
            </div>
          </div>
          <div className="cr-bottom"><button type="button" className="cr-post big" id="crPost2" data-cr="post" disabled><i className="fa-solid fa-paper-plane"></i>Post</button></div>
        </div>
      </div>
    </section>
  );
}
