/** Marketplace (/market): things students sell to each other. The cards are drawn by lib/ghetto.ts and load a page at a time. */
export default function MarketPage() {
  return (
    <section className="market" id="marketPage" aria-label="Marketplace">
      <div className="rm-scroll" id="mkScroll">
        <header className="rm-top">
          <b className="top-title">Marketplace</b>
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
            <input id="mkSearch" type="text" placeholder="Search the marketplace" aria-label="Search products" autoComplete="off" />
          </label>
          <button className="mk-sell" id="mkSell" aria-label="Sell a product"><i className="fa-solid fa-plus"></i></button>
        </header>
        <div className="rm-body">
          <div className="rm-chips" id="mkChips"></div>
          <div className="rm-grid" id="mkGrid"></div>
          <div className="rm-empty" id="mkEmpty" hidden>
            <div className="s-emoji">🛍️</div><b id="mkEmptyT">Nothing here yet</b>
            <p id="mkEmptyP">Be the first to sell something.</p>
            <button type="button" className="rm-clear" id="mkEmptyBtn">Sell a product</button>
          </div>
          <div className="more" id="mkMore" hidden><span className="more-sp"></span></div>
          <div className="rm-end" id="mkEnd" hidden>You've seen everything ✨</div>
        </div>
      </div>
    </section>
  );
}
