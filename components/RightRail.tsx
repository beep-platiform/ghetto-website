
export default function RightRail() {
  return (
    <aside className="rail" id="rail" aria-label="Discover">
      <label className="r-search"><i className="fa-solid fa-magnifying-glass"></i>
        <input id="rSearch" type="text" placeholder="Search posts, rooms, or people..." autoComplete="off" readOnly />
      </label>
      <section className="r-card" id="rTrend"></section>
      <section className="r-card" id="rPeople"></section>
      <footer className="r-foot">About · Help · Terms · Privacy<br />© 2026 Ghetto · Live. Learn. Grow...</footer>
      <div className="r-comments" id="rComments" aria-label="Comments">
        <div id="rcHead"></div>
        <div className="rc-scroll" id="rcScroll"></div>
      </div>
    </aside>
  );
}
