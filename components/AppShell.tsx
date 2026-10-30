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
import CreatePage from './CreatePage';
import ProfilePage from './ProfilePage';
import ProfileSheets from './ProfileSheets';
import SettingsPage from './SettingsPage';
import SettingsSheets from './SettingsSheets';
import ActionMenu from './ActionMenu';
import PostSheets from './PostSheets';
import MarketPage from './MarketPage';
import ProductDetail from './ProductDetail';
import type { AppData, Profile, Settings } from '../lib/types';

/**
 * Home, Rooms and Profile share one shell (sidebar, right column, sheets), so switching between them is instant.
 * `page` decides which one is showing first; /  -> home, /rooms -> rooms, /profile[/username] -> profile, /settings -> settings, /create -> the new-post page.
 */
export default function AppShell({ page, data, profile, settings }: { page: 'home' | 'rooms' | 'market' | 'profile' | 'settings' | 'create'; data: AppData; profile?: Profile | null; settings?: Settings | null }) {
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
            <div className={'more' + (data.feedNext ? '' : ' done')} id="feedMore"><span className="more-sp"></span><em className="more-end">You're all caught up ✨</em></div>
          </div>

          <RoomsPage />
          <MarketPage />
          <ProfilePage />
          <SettingsPage />
          <CreatePage />
          <FabMenu />
          <BottomNav page={page} />
          <RoomDetail />
          <ProductDetail />
          <FilterSheet />
          <ContactSheet />
          <ProfileSheets />
          <SettingsSheets />
          <SearchSheet />
          <NotificationsSheet />
          <PostDetail />
          <PostSheets />
          <ActionMenu />
          <StoryViewer />
        </div>

        {/* Desktop: right column (changes with the page) */}
        <RightRail />
      </div>
      <GhettoClient data={data} profile={profile} settings={settings} />
    </>
  );
}
