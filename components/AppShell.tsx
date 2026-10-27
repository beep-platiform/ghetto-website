import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Stories from './Stories';
import Feed from './Feed';
import RoomsPage from './RoomsPage';
import FabMenu from './FabMenu';
import BottomNav from './BottomNav';
import RoomDetail from './RoomDetail';
import FilterSheet from './FilterSheet';
import ContactSheet from './ContactSheet';
import SearchSheet from './SearchSheet';
import NotificationsSheet from './NotificationsSheet';
import PostDetail from './PostDetail';
import StoryViewer from './StoryViewer';
import RightRail from './RightRail';
import GhettoClient from './GhettoClient';
import ComposeSheet from './ComposeSheet';
import ProfilePage from './ProfilePage';
import ProfileSheets from './ProfileSheets';
import type { AppData, Profile } from '../lib/types';

/**
 * Home, Rooms and Profile share one shell (sidebar, right column, sheets), so switching between them is instant.
 * `page` decides which one is showing first; /  -> home, /rooms -> rooms, /profile[/username] -> profile.
 */
export default function AppShell({ page, data, profile }: { page: 'home' | 'rooms' | 'profile'; data: AppData; profile?: Profile | null }) {
  return (
    <>
      <div className="shell">
        {/* Desktop: left navigation */}
        <Sidebar page={page} me={data.me} />

        <div className="app" data-page={page}>
          <div className="toast" id="toast"></div>

          <div className="scroll" id="scroll">
            <TopBar me={data.me} />
            <Stories stories={data.stories} />
            <Feed posts={data.posts} meId={data.me.id} />
          </div>

          <RoomsPage />
          <ProfilePage />
          <FabMenu />
          <BottomNav page={page} />
          <RoomDetail />
          <FilterSheet />
          <ContactSheet />
          <ComposeSheet />
          <ProfileSheets />
          <SearchSheet />
          <NotificationsSheet />
          <PostDetail />
          <StoryViewer />
        </div>

        {/* Desktop: right column (changes with the page) */}
        <RightRail />
      </div>
      <GhettoClient data={data} profile={profile} />
    </>
  );
}
