
import type { AppData } from '../lib/types';
import { faceUrl } from '../lib/format';

export default function Sidebar({ page, me }: { page: 'home' | 'rooms' | 'profile' | 'settings'; me: AppData['me'] }) {
  return (
    <aside className="side" id="side" aria-label="Main navigation">
      <button className="s-brand" id="sBrand" aria-label="Ghetto home">
        <span className="s-logo"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 15.5 16 4l13 11.5" stroke="#ffbd16" strokeWidth="3.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 14v14h7v-8h5v8h6V14" stroke="#14243c" strokeWidth="2.8" fill="none" strokeLinejoin="round"/></svg></span>
        <span className="s-brand-text"><b>Ghetto</b><small>Live. Learn. Grow...</small></span>
      </button>
      <button className={'s-item' + (page === 'home' ? ' active' : '')} data-page="home"><i className="fa-solid fa-house"></i><span className="s-label">Home</span></button>
      <button className="s-item" data-page="search"><i className="fa-solid fa-magnifying-glass"></i><span className="s-label">Search</span></button>
      <button className={'s-item' + (page === 'rooms' ? ' active' : '')} data-page="rooms"><i className="fa-regular fa-building"></i><span className="s-label">Rooms</span></button>
      <button className="s-item" data-page="community"><i className="fa-solid fa-user-group"></i><span className="s-label">Community</span></button>
      <button className="s-item" data-page="notifications"><i className="fa-regular fa-bell"></i><span className="s-label">Notifications</span><span className="s-badge" id="sideBellDot"></span></button>
      <button className={'s-item' + (page === 'profile' ? ' active' : '')} data-page="profile"><i className="fa-regular fa-user"></i><span className="s-label">Profile</span></button>
      <button className={'s-item' + (page === 'settings' ? ' active' : '')} data-page="settings"><i className="fa-solid fa-gear"></i><span className="s-label">Settings</span></button>
      <button className="s-create" id="sideCreate" aria-label="Create"><i className="fa-solid fa-plus"></i><span className="s-label">Create</span></button>
      <div className="s-user" id="sUser" role="button" tabIndex={0} aria-label="Open your profile">
        <div className="avatar"><img id="sUserAv" alt="You" src={faceUrl(me.avatar)} /></div>
        <div className="s-user-info"><b id="sUserName">{me.name}</b><small id="sUserSub">{me.role}{me.area ? ' · ' + me.area : ''}</small></div>
        <button type="button" className="s-user-more" id="sUserMore" aria-label="Account menu"><i className="fa-solid fa-ellipsis"></i></button>
      </div>
    </aside>
  );
}
