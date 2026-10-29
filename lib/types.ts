export type Cursor = { ts: string; id: string | number };
export type Author = { id: string; name: string; role: string; avatar: string; verified: boolean; linked: boolean };
export type Post = {
  id: string; kind: 'featured' | 'compact'; title: string; subtitle: string | null; body: string;
  category: string | null; location: string | null; tag: string | null; photos: string[]; photoTotal: number; moreCount: number;
  sign: string | null; likes: number; shares: number; liked: boolean; ago: string; createdAt: string; author: Author;
  type?: 'room' | 'tip' | 'price' | 'question' | 'event'; price?: number | null; tags?: string[]; audience?: 'everyone' | 'links';
  commentsOn?: boolean; saved?: boolean; alt?: string | null;
  cmtCount: number; top: { name: string; av: string; text: string; likes: number } | null;
};
export type AppData = {
  today: string;
  me: { id: string; handle: string; name: string; avatar: string; role: string; area: string | null };
  handles: Record<string, string>;      // profile id -> username
  storyHandles: Record<string, string>; // story id -> username
  stories: { id: string; name: string; label: string; photo: string; query: string; time: string; slides: any[] }[];
  posts: Post[];
  feedNext: Cursor | null;   // where the next page of the feed starts (null = that was the last page)
  comments: Record<string, any[]>; // filled on demand, per post, when a post is opened
  notifSession: string;      // when this visit started: what arrives later shows one by one, older ones are combined
  notifNext: Cursor | null;
  notifUnread: number;
  notifMaxId: number;
  roomsNext: { after: number } | null;
  people: any[];
  trending: [string, string, string][];
  notifications: any[];
  rooms: any[];
};

export type ProfilePerson = { id: string; h: string; n: string; av: string; r: string; s: string; linked: boolean; me: boolean };
export type Profile = {
  id: string; handle: string; name: string; role: string; area: string | null; bio: string | null; avatar: string; cover: string | null;
  verified: boolean; joined: string; isMe: boolean; linked: boolean; posts: number; links: number; linking: number;
  linksList: ProfilePerson[]; linkingList: ProfilePerson[];
  restricted?: boolean; private?: boolean; // private account and you are not linked with it
};

export type Settings = {
  name: string; handle: string; avatar: string; role: string; email: string | null;
  privateAccount: boolean; showActivity: boolean; whoCanMessage: 'everyone' | 'links' | 'nobody';
  notifyLikes: boolean; notifyComments: boolean; notifyLinks: boolean; notifyRooms: boolean; notifyPrices: boolean; notifyEmail: boolean;
  language: 'en' | 'rw' | 'fr';
};
