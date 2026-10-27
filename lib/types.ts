export type Author = { id: string; name: string; role: string; avatar: string; verified: boolean; linked: boolean };
export type Post = {
  id: string; kind: 'featured' | 'compact'; title: string; subtitle: string | null; body: string;
  category: string | null; location: string | null; tag: string | null; photos: string[]; photoTotal: number; moreCount: number;
  sign: string | null; likes: number; shares: number; liked: boolean; ago: string; createdAt: string; author: Author;
};
export type AppData = {
  today: string;
  me: { id: string; handle: string; name: string; avatar: string; role: string; area: string | null };
  handles: Record<string, string>;      // profile id -> username
  storyHandles: Record<string, string>; // story id -> username
  stories: { id: string; name: string; label: string; photo: string; query: string; time: string; slides: any[] }[];
  posts: Post[];
  comments: Record<string, any[]>;
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
};
