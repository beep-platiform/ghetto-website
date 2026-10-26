
export default function FilterSheet() {
  return (
    <div className="bsheet" id="filterSheet" aria-hidden="true" role="dialog" aria-label="Filters">
      <div className="bs-back"></div>
      <div className="bs-card">
        <button className="bs-close" aria-label="Close filters"><i className="fa-solid fa-xmark"></i></button>
        <div className="bs-body" id="fsBody">
          <div className="fp" id="filterPanel">
            <div className="fp-head"><b>Filters</b><button type="button" className="fp-reset" id="fpReset">Reset</button></div>
            <div className="fp-sec">
              <h4>Price range</h4>
              <div className="fp-price"><span id="pMinTxt"></span><i></i><span id="pMaxTxt"></span><small>RWF</small></div>
              <div className="dual">
                <div className="dual-track"><div className="dual-fill" id="dFill"></div></div>
                <input type="range" id="pMinR" min="0" max="300000" step="5000" defaultValue="0" aria-label="Minimum price" />
                <input type="range" id="pMaxR" min="0" max="300000" step="5000" defaultValue="300000" aria-label="Maximum price" />
              </div>
              <div className="fp-presets">
                <button type="button" data-min="0" data-max="50000">Under 50k</button>
                <button type="button" data-min="50000" data-max="100000">50k – 100k</button>
                <button type="button" data-min="100000" data-max="300000">100k+</button>
              </div>
            </div>
            <div className="fp-sec"><h4>Room type</h4><div className="fp-chips" id="fpTypes"></div></div>
            <div className="fp-sec"><h4>Facilities</h4><div className="fp-fac" id="fpFac"></div></div>
            <div className="fp-sec"><h4>Move-in date</h4>
              <label className="fp-date"><i className="fa-regular fa-calendar"></i><input type="date" id="fpDate" min="2026-10-24" aria-label="Move-in date" /></label>
            </div>
            <div className="fp-sec fp-row">
              <div><h4>Verified landlords only</h4><small>Profiles checked by Ghetto</small></div>
              <button type="button" className="switch" id="fpVerified" role="switch" aria-checked="false" aria-label="Verified landlords only"><i></i></button>
            </div>
            <button type="button" className="fp-apply" id="fpApply">Show rooms</button>
          </div>
        </div>
      </div>
    </div>
  );
}
