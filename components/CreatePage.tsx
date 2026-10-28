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
          <b>New post</b>
          <span className="cr-saved" id="crSaved" aria-live="polite"></span>
          <button type="button" className="cr-post" id="crPost" data-cr="post" disabled>Post</button>
        </header>

        <div className="cr-wrap">
          <div className="cr-draft" id="crDraft" hidden>
            <span><i className="fa-regular fa-clock"></i>We kept your draft</span>
            <button type="button" data-cr="discard">Discard</button>
          </div>

          <div className="cr-who">
            <div className="avatar"><img id="crAv" alt="" /></div>
            <div><b id="crName"></b>
              <button type="button" className="cr-aud" id="crAudPill" data-cr="aud" aria-label="Who can see this post"><i className="fa-solid fa-earth-africa"></i><span>Everyone</span><i className="fa-solid fa-chevron-down"></i></button>
            </div>
          </div>

          <div className="cr-types" id="crTypes" role="radiogroup" aria-label="Post type"></div>

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
              <label htmlFor="crBody">Details</label>
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
            <div className="cr-h"><b>Place</b><small>Optional</small></div>
            <div className="cr-loc"><i className="fa-solid fa-location-dot"></i><input className="cr-in" id="crLoc" type="text" maxLength={60} placeholder="e.g. Nyabugogo" autoComplete="off" /></div>
            <div className="cr-chips" id="crLocChips"></div>
          </section>

          <section className="cr-card" aria-label="Topics">
            <div className="cr-h"><b>Topics</b><small id="crTagN">0/5</small></div>
            <div className="cr-tags" id="crTags"></div>
            <div className="cr-loc"><i className="fa-solid fa-hashtag"></i><input className="cr-in" id="crTagIn" type="text" maxLength={25} placeholder="Add a topic, then press Enter" autoComplete="off" enterKeyHint="done" /></div>
            <div className="cr-chips" id="crTagChips"></div>
          </section>

          <section className="cr-card cr-opts" aria-label="Options">
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
              <div className="cr-h"><b>Preview</b><small>How it looks in the feed</small></div>
              <div id="crPrev"></div>
            </div>
          </div>
          <div className="cr-bottom"><button type="button" className="cr-post big" id="crPost2" data-cr="post" disabled><i className="fa-solid fa-paper-plane"></i>Post</button></div>
        </div>
      </div>
    </section>
  );
}
