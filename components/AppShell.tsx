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
import type { AppData } from '../lib/types';

/**
 * Home and Rooms share one shell (sidebar, right column, sheets), so switching between them is instant.
 * `page` decides which one is showing first; /  -> home, /rooms -> rooms.
 */
export default function AppShell({ page, data }: { page: 'home' | 'rooms'; data: AppData }) {
  return (
    <>
      <div className="shell">
        {/* Desktop: left navigation */}
        <Sidebar page={page} />

        <div className="app" data-page={page}>
          <div className="toast" id="toast"></div>

          <div className="scroll" id="scroll">
            <TopBar />
            <Stories stories={data.stories} />
            <Feed posts={data.posts} />
          </div>

          <RoomsPage />
          <FabMenu />
          <BottomNav page={page} />
          <RoomDetail />
          <FilterSheet />
          <ContactSheet />
          <ComposeSheet />
          <SearchSheet />
          <NotificationsSheet />
          <PostDetail />
          <StoryViewer />
        </div>

        {/* Desktop: right column (changes with the page) */}
        <RightRail />
      </div>
      <GhettoClient data={data} />
    </>
  );
}
