
export default function FabMenu() {
  return (
    <div className="fab-menu" id="fabMenu">
      <button data-msg="New post ✍️" data-act="compose" aria-label="Post"><i className="fa-solid fa-pen"></i></button>
      <button data-msg="Add a room 🏠" aria-label="Room"><i className="fa-solid fa-bed"></i></button>
      <button data-msg="Sell an item 🛍️" aria-label="Sell"><i className="fa-solid fa-tag"></i></button>
    </div>
  );
}
