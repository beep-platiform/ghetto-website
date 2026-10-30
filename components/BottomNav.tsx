
export default function BottomNav({ page }: { page: 'home' | 'rooms' | 'market' | 'profile' | 'settings' | 'create' }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <button className={'nav-item' + (page === 'home' ? ' active' : '')}><i className="fa-solid fa-house"></i>Home</button>
      <button className={'nav-item' + (page === 'rooms' ? ' active' : '')}><i className="fa-regular fa-building"></i>Rooms</button>
      <div className="create-wrap"><button className="nav-create" id="fab" aria-label="Create"><i className="fa-solid fa-plus"></i></button></div>
      <button className={'nav-item' + (page === 'market' ? ' active' : '')}><i className="fa-solid fa-bag-shopping"></i>Market</button>
      <button className={'nav-item' + (page === 'profile' ? ' active' : '')}><i className="fa-regular fa-user"></i>Profile</button>
    </nav>
  );
}
