
export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <button className="nav-item active"><i className="fa-solid fa-house"></i>Home</button>
      <button className="nav-item"><i className="fa-regular fa-building"></i>Rooms</button>
      <div className="create-wrap"><button className="nav-create" id="fab" aria-label="Create"><i className="fa-solid fa-plus"></i></button></div>
      <button className="nav-item"><i className="fa-solid fa-user-group"></i>Community</button>
      <button className="nav-item"><i className="fa-regular fa-user"></i>Profile</button>
    </nav>
  );
}
