/** The one "⋯" menu used everywhere (posts, comments, notifications, rooms, profiles).
 *  A bottom sheet on phones, a small popover next to the button on desktop. The script fills it in. */
export default function ActionMenu() {
  return (
    <div className="opm" id="actMenu" aria-hidden="true">
      <div className="opm-back"></div>
      <div className="opm-card" id="amCard" role="menu">
        <div className="opm-grab"></div>
        <div className="opm-head" id="amHead" hidden></div>
        <div className="opm-list" id="amList"></div>
      </div>
    </div>
  );
}
