import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import Stories from '../components/Stories';
import Feed from '../components/Feed';
import FabMenu from '../components/FabMenu';
import BottomNav from '../components/BottomNav';
import SearchSheet from '../components/SearchSheet';
import NotificationsSheet from '../components/NotificationsSheet';
import PostDetail from '../components/PostDetail';
import StoryViewer from '../components/StoryViewer';
import RightRail from '../components/RightRail';
import GhettoClient from '../components/GhettoClient';

export default function HomePage() {
  return (
    <>
      <div className="shell">
        {/* Desktop: left navigation */}
        <Sidebar />

        <div className="app">
          <div className="toast" id="toast"></div>

          <div className="scroll" id="scroll">
            <TopBar />
            <Stories />
            <Feed />
          </div>

          <FabMenu />
          <BottomNav />
          <SearchSheet />
          <NotificationsSheet />
          <PostDetail />
          <StoryViewer />
        </div>

        {/* Desktop: right rail */}
        <RightRail />
      </div>
      <GhettoClient />
    </>
  );
}
