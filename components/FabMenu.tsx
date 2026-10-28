
export default function FabMenu() {
  return (
    <div className="fab-menu" id="fabMenu">
      <button data-act="create" data-type="tip" aria-label="New post"><i className="fa-solid fa-pen"></i></button>
      <button data-act="create" data-type="room" aria-label="Add a room"><i className="fa-solid fa-bed"></i></button>
      <button data-act="create" data-type="price" aria-label="Share a price"><i className="fa-solid fa-tag"></i></button>
    </div>
  );
}
