
export default function SearchSheet() {
  return (
    <section className="sheet" id="sheetSearch" aria-hidden="true" role="dialog" aria-label="Search">
      <header className="sh-top">
        <button className="d-back" data-close aria-label="Close search"><i className="fa-solid fa-arrow-left"></i></button>
        <label className="s-box"><i className="fa-solid fa-magnifying-glass"></i>
          <input id="sInput" type="text" placeholder="Search posts, rooms, or people..." autoComplete="off" enterKeyHint="search" />
          <button type="button" className="s-clear" id="sClear" aria-label="Clear search"><i className="fa-solid fa-circle-xmark"></i></button>
        </label>
      </header>
      <div className="tabs" id="sTabs" style={{display:"none"}}>
        <button type="button" className="tab on" data-tab="all">All<span className="tc"></span></button>
        <button type="button" className="tab" data-tab="people">People<span className="tc"></span></button>
        <button type="button" className="tab" data-tab="posts">Posts<span className="tc"></span></button>
        <button type="button" className="tab" data-tab="rooms">Rooms<span className="tc"></span></button>
      </div>
      <div className="sh-body" id="sBody"></div>
    </section>
  );
}
