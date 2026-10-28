
export default function RoomsPage() {
  return (
    <section className="rooms" id="roomsPage" aria-label="Rooms">
      <div className="rm-scroll" id="rmScroll">
        <header className="rm-top">
          <b className="top-title">Rooms</b>
          <div className="brand">
            <div className="logo">
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <path d="M3 15.5 16 4l13 11.5" stroke="#ffbd16" strokeWidth="3.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 14v14h7v-8h5v8h6V14" stroke="#14243c" strokeWidth="2.8" fill="none" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="brandname">Ghetto</div>
          </div>
          <label className="rm-search"><i className="fa-solid fa-magnifying-glass"></i>
            <input id="rmSearch" type="text" placeholder="Search rooms" aria-label="Search rooms by area, type or facility" autoComplete="off" />
            <button type="button" id="rmSearchClear" aria-label="Clear search"><i className="fa-solid fa-circle-xmark"></i></button>
          </label>
          <button className="rm-filterbtn" id="rmFilterBtn" aria-label="Open filters"><i className="fa-solid fa-sliders"></i><em id="rmFilterCount"></em></button>
        </header>
        <div className="rm-body">
          <div className="rm-chips" id="rmChips"></div>
          <div className="rm-feat-wrap" id="rmFeatWrap">
            <div className="rm-sec"><b>Featured near campus</b><span>Top rated</span></div>
            <div className="rm-feat" id="rmFeat"></div>
          </div>
          <div className="rm-bar">
            <div className="rm-count" id="rmCount"></div>
            <label className="rm-sort"><i className="fa-solid fa-arrow-down-wide-short"></i>
              <select id="rmSort" aria-label="Sort rooms">
                <option value="rec">Recommended</option><option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option><option value="near">Closest to campus</option>
              </select>
            </label>
          </div>
          <div className="rm-active" id="rmActive"></div>
          <div className="rm-grid" id="rmGrid"></div>
          <div className="rm-empty" id="rmEmpty" hidden>
            <div className="s-emoji">🏠</div><b>No rooms match your filters</b>
            <p>Try a wider price range or remove a filter.</p>
            <button type="button" className="rm-clear">Clear filters</button>
          </div>
          <div className="more" id="rmMore" hidden><span className="more-sp"></span></div>
          <div className="rm-end">You've seen all the rooms ✨</div>
        </div>
      </div>
    </section>
  );
}
