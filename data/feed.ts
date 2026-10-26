// Static feed content (no database yet). Replace these arrays with API / Supabase data later.

export type StoryRing = { id: string; label: string; alt: string; photo: string; query: string };

export type FeedPost = {
  kind: 'featured' | 'compact';
  category: string | null;
  delay: string;
  avatar: string;
  author: string;
  verified: boolean;
  role: string | null;
  meta: string;
  isNew: boolean;
  title: string;
  sub: string | null;
  copy: string;
  photos?: { alt: string; photo: string }[];
  sign?: string | null;
  photoCount?: string;
  more?: string;
  thumb?: { alt: string; photo: string };
  likes: number;
  comments: number;
  shares: number;
};

export const IMG_BASE = 'https://images.unsplash.com/';

export const STORY_RINGS: StoryRing[] = [
  {
    "id": "landlord",
    "alt": "Landlord",
    "photo": "photo-1560250097-0b93528c311a",
    "query": "w=160&h=160&fit=crop&crop=faces",
    "label": "Landlord"
  },
  {
    "id": "racheal",
    "alt": "Racheal",
    "photo": "photo-1534528741775-53994a69daeb",
    "query": "w=160&h=160&fit=crop&crop=faces",
    "label": "Racheal"
  },
  {
    "id": "emmanuel",
    "alt": "Emmanuel",
    "photo": "photo-1500648767791-00dcc994a43e",
    "query": "w=160&h=160&fit=crop&crop=faces",
    "label": "Emmanuel"
  },
  {
    "id": "nearby",
    "alt": "Nearby",
    "photo": "photo-1600585154340-be6161a56a0c",
    "query": "w=160&h=160&fit=crop",
    "label": "Nearby"
  },
  {
    "id": "aline",
    "alt": "Aline",
    "photo": "photo-1506794778202-cad84cf45f1d",
    "query": "w=160&h=160&fit=crop&crop=faces",
    "label": "Aline"
  },
  {
    "id": "moses",
    "alt": "Moses",
    "photo": "photo-1472099645785-5658abf4ff4e",
    "query": "w=160&h=160&fit=crop&crop=faces",
    "label": "Moses"
  },
  {
    "id": "marie",
    "alt": "Marie",
    "photo": "photo-1494790108377-be9c29b29330",
    "query": "w=160&h=160&fit=crop&crop=faces",
    "label": "Marie"
  }
];

export const POSTS: FeedPost[] = [
  {
    "kind": "featured",
    "category": "guide food price nyabugogo",
    "delay": ".1s",
    "avatar": "photo-1500648767791-00dcc994a43e",
    "author": "Emmanuel",
    "verified": true,
    "role": null,
    "isNew": false,
    "meta": "Student · 2h ago · Nyabugogo",
    "title": "How to live in Nyabugogo",
    "sub": "(student guide)",
    "copy": "Nyabugogo is busy, but it's a great place to live if you know where to go. Here are some useful tips, cheap food spots, and essential places you'll need.. 🧡",
    "photos": [
      {
        "alt": "Busy Nyabugogo street",
        "photo": "photo-1489493585363-d69421e0edd3"
      },
      {
        "alt": "Affordable meal",
        "photo": "photo-1546069901-ba9599a7e63c"
      },
      {
        "alt": "Market produce",
        "photo": "photo-1542838132-92c53300491e"
      }
    ],
    "sign": "NYABUGOGO",
    "photoCount": "1/6",
    "more": "+6",
    "likes": 124,
    "comments": 28,
    "shares": 12
  },
  {
    "kind": "compact",
    "category": "room housing campus landlord",
    "delay": ".2s",
    "avatar": "photo-1534528741775-53994a69daeb",
    "author": "Nyirabukeye",
    "verified": false,
    "role": "Landlord",
    "isNew": true,
    "meta": "Landlord · 5h ago",
    "title": "New house available near campus",
    "sub": null,
    "copy": "Single and shared rooms, clean, secure, Wi-Fi, water and electricity included.",
    "thumb": {
      "alt": "Room for rent",
      "photo": "photo-1611892440504-42a792e24d32"
    },
    "likes": 18,
    "comments": 6,
    "shares": 3
  },
  {
    "kind": "featured",
    "category": "price food market vegetables",
    "delay": ".3s",
    "avatar": "photo-1506794778202-cad84cf45f1d",
    "author": "Racheal",
    "verified": true,
    "role": null,
    "isNew": false,
    "meta": "Student · 1d ago · Nyabugogo",
    "title": "Today's market prices",
    "sub": "(Nyabugogo)",
    "copy": "Tomatoes — 600 RWF/kg · Onions — 500 RWF/kg · Rice — 1,500 RWF/kg. Prices can change, so check the update date before you go. 🥬",
    "photos": [
      {
        "alt": "Fresh vegetables",
        "photo": "photo-1540420773420-3366772f4999"
      },
      {
        "alt": "Market produce",
        "photo": "photo-1542838132-92c53300491e"
      },
      {
        "alt": "Cooked food",
        "photo": "photo-1547592180-85f173990554"
      }
    ],
    "sign": null,
    "photoCount": "1/5",
    "more": "+3",
    "likes": 46,
    "comments": 9,
    "shares": 5
  },
  {
    "kind": "compact",
    "category": null,
    "delay": "0.4s",
    "avatar": "photo-1507003211169-0a1dd7228f2d",
    "author": "Jean Claude",
    "verified": false,
    "role": "Landlord",
    "isNew": true,
    "meta": "Landlord · 8h ago",
    "title": "Single room for rent in Kimironko",
    "sub": null,
    "copy": "Quiet compound, own door, Wi-Fi and water included. 45,000 RWF per month, 10 minutes from the main road.",
    "thumb": {
      "alt": "Single room for rent in Kimironko",
      "photo": "photo-1522708323590-d24dbb6b0267"
    },
    "likes": 34,
    "comments": 11,
    "shares": 7
  },
  {
    "kind": "featured",
    "category": null,
    "delay": "0.5s",
    "avatar": "photo-1472099645785-5658abf4ff4e",
    "author": "Moses",
    "verified": true,
    "role": null,
    "isNew": false,
    "meta": "Student · 9h ago · Nyabugogo",
    "title": "Cheap food spots near campus",
    "sub": "(student tips)",
    "copy": "Rice, beans, chapati and tea for under 1,500 RWF. Here are my favourite spots and the best time to go so you skip the queue. 🍲",
    "photos": [
      {
        "alt": "Cheap food spots near campus",
        "photo": "photo-1546069901-ba9599a7e63c"
      },
      {
        "alt": "Cheap food spots near campus",
        "photo": "photo-1547592180-85f173990554"
      },
      {
        "alt": "Cheap food spots near campus",
        "photo": "photo-1498837167922-ddd27525d352"
      }
    ],
    "sign": null,
    "photoCount": "1/6",
    "more": "+3",
    "likes": 58,
    "comments": 14,
    "shares": 9
  },
  {
    "kind": "compact",
    "category": null,
    "delay": "0.6s",
    "avatar": "photo-1438761681033-6461ffad8d80",
    "author": "Eric",
    "verified": false,
    "role": "Student",
    "isNew": false,
    "meta": "Student · 12h ago",
    "title": "Selling my study desk (used)",
    "sub": null,
    "copy": "Good condition and affordable, 35,000 RWF. Pick-up near campus. DM if interested.",
    "thumb": {
      "alt": "Selling my study desk (used)",
      "photo": "photo-1524758631624-e2822e304c36"
    },
    "likes": 21,
    "comments": 8,
    "shares": 2
  },
  {
    "kind": "featured",
    "category": null,
    "delay": "0.7s",
    "avatar": "photo-1494790108377-be9c29b29330",
    "author": "Marie",
    "verified": true,
    "role": null,
    "isNew": false,
    "meta": "Student · 1d ago · Nyabugogo",
    "title": "Getting to campus safely",
    "sub": "(transport tips)",
    "copy": "Leave early, agree on the price before you board, and keep your phone out of sight in the crowd. Share your own tips below! 🚌",
    "photos": [
      {
        "alt": "Getting to campus safely",
        "photo": "photo-1544620347-c4fd4a3d5957"
      },
      {
        "alt": "Getting to campus safely",
        "photo": "photo-1489493585363-d69421e0edd3"
      },
      {
        "alt": "Getting to campus safely",
        "photo": "photo-1519003722824-194d4455a60c"
      }
    ],
    "sign": null,
    "photoCount": "1/4",
    "more": "+1",
    "likes": 73,
    "comments": 19,
    "shares": 11
  }
];
