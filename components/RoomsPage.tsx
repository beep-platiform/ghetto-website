
export default function RoomsPage() {
  return (
    <section className="rooms" id="roomsPage" aria-label="Rooms">
      <div className="rm-scroll" id="rmScroll">
        <header className="rm-top">
          <div className="rm-title"><b>Rooms</b><small>Find a place that feels like home</small></div>
          <button className="rm-filterbtn" id="rmFilterBtn" aria-label="Open filters"><i className="fa-solid fa-sliders"></i><span>Filters</span><em id="rmFilterCount"></em></button>
        </header>
        <div className="rm-body">
          <label className="rm-search"><i className="fa-solid fa-magnifying-glass"></i>
            <input id="rmSearch" type="text" placeholder="Search by area, type or facility..." autoComplete="off" />
            <button type="button" id="rmSearchClear" aria-label="Clear search"><i className="fa-solid fa-circle-xmark"></i></button>
          </label>
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
          <div className="rm-end">You've seen all the rooms ✨</div>
        </div>
      </div>
    </section>
  );
}
