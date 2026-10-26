
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
      <div className="r-rooms" id="rRooms">
        <div id="rfHost"></div>
        <section className="r-card" id="rSaved"></section>
        <section className="r-card r-tip"><h3><i className="fa-solid fa-shield-halved"></i>Stay safe</h3><p>Always visit a room and meet the landlord before you pay. Ghetto never asks you for money in chat.</p></section>
      </div>
      <div className="r-room" id="rRoom"></div>
    </aside>
  );
}
