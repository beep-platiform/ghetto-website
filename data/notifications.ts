// Notifications (static).

export type Notif = { id: string; g: string; t: string; av: string; html: string; time: string; unread?: boolean; post?: string; cm?: boolean; quote?: string; fb?: boolean; name?: string };

export const NOTIFS: Notif[] = [
  {id:'n1',g:'New',t:'like',av:'racheal',html:'<b>Racheal</b> liked your post <b>How to live in Nyabugogo</b>',time:'2m',unread:true,post:'p1'},
  {id:'n2',g:'New',t:'comment',av:'aline',html:'<b>Aline</b> commented on your post',quote:'This helped me so much when I moved here…',time:'14m',unread:true,post:'p1',cm:true},
  {id:'n3',g:'New',t:'follow',av:'moses',html:'<b>Moses</b> wants to link with you',time:'1h',unread:true,fb:true,name:'Moses'},
  {id:'n4',g:'New',t:'house',av:'jean',html:'<b>Jean Claude</b> posted a new room: <b>Single room for rent in Kimironko</b>',time:'2h',unread:true,post:'p4'},
  {id:'n5',g:'Earlier',t:'like',av:'marie',html:'<b>Marie</b> and 12 others liked your post',time:'5h',post:'p1'},
  {id:'n6',g:'Earlier',t:'mention',av:'patrick',html:'<b>Patrick</b> mentioned you in a comment',quote:'@Emmanuel thanks for the tip about the market!',time:'1d',post:'p1',cm:true},
  {id:'n7',g:'Earlier',t:'price',av:'racheal',html:'<b>Price update:</b> Tomatoes are now 600 RWF/kg at Nyabugogo market',time:'1d',post:'p3'},
  {id:'n8',g:'Earlier',t:'comment',av:'grace',html:'<b>Grace</b> replied to your comment',quote:'Stay on the main road and travel in a group.',time:'2d',post:'p1',cm:true}
];

export const ICON: Record<string, string> = {like:'fa-heart',comment:'fa-comment',follow:'fa-user-plus',house:'fa-house',mention:'fa-at',price:'fa-tag'};
