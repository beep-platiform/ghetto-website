/** The one "⋯" menu used everywhere (posts, comments, notifications, rooms, profiles).
 *  A bottom sheet on phones, a small popover next to the button on desktop. The script fills it in. */
export default function ActionMenu() {
  return (
    <div className="am" id="actMenu" aria-hidden="true">
      <div className="am-back"></div>
      <div className="am-card" id="amCard" role="menu">
        <div className="am-grab"></div>
        <div className="am-head" id="amHead" hidden></div>
        <div className="am-list" id="amList"></div>
      </div>
    </div>
  );
}
