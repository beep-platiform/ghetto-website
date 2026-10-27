
import type { AppData } from '../lib/types';
import { faceUrl } from '../lib/format';

export default function TopBar({ me }: { me: AppData['me'] }) {
  return (
    <header className="topbar">
      <b className="top-title">Home</b>
      <div className="brand">
        <div className="logo">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M3 15.5 16 4l13 11.5" stroke="#ffbd16" strokeWidth="3.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 14v14h7v-8h5v8h6V14" stroke="#14243c" strokeWidth="2.8" fill="none" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div className="brandname">Ghetto</div>
          <div className="tagline">Live. Learn. Grow...</div>
        </div>
      </div>
      <button className="icon-btn" id="searchBtn" aria-label="Search"><i className="fa-solid fa-magnifying-glass"></i></button>
      <button className="icon-btn bell" id="bellBtn" aria-label="Notifications"><i className="fa-regular fa-bell"></i><span className="dot num" id="bellDot">4</span></button>
      <div className="avatar me" id="topMe" role="button" tabIndex={0} aria-label="Open your profile"><img id="topMeAv" alt="Your profile" src={faceUrl(me.avatar)} /></div>
    </header>
  );
}
