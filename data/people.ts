// People, avatars and trending topics (static).

export const AV: Record<string, string> = {
  aline:'photo-1506794778202-cad84cf45f1d',patrick:'photo-1507003211169-0a1dd7228f2d',grace:'photo-1438761681033-6461ffad8d80',
  moses:'photo-1472099645785-5658abf4ff4e',marie:'photo-1494790108377-be9c29b29330',racheal:'photo-1534528741775-53994a69daeb',
  diane:'photo-1544005313-94ddf0286df2',olivier:'photo-1519085360753-af0119f7cbe7',sandrine:'photo-1531123897727-8f129e1688ce',
  emmanuel:'photo-1500648767791-00dcc994a43e',nyira:'photo-1534528741775-53994a69daeb',jean:'photo-1560250097-0b93528c311a',eric:'photo-1438761681033-6461ffad8d80'
};

export const POOL: string[] = ['photo-1489493585363-d69421e0edd3','photo-1546069901-ba9599a7e63c','photo-1540420773420-3366772f4999','photo-1542838132-92c53300491e',
            'photo-1547592180-85f173990554','photo-1498837167922-ddd27525d352','photo-1544620347-c4fd4a3d5957','photo-1519003722824-194d4455a60c'];

export const PEOPLE: { n: string; r: string; av: string; s: string }[] = [
  {n:'Nyirabukeye',r:'Landlord',av:'nyira',s:'Landlord · Nyabugogo'},
  {n:'Jean Claude',r:'Landlord',av:'jean',s:'Landlord · Kimironko'},
  {n:'Racheal',r:'',av:'racheal',s:'Student · Nyabugogo'},
  {n:'Aline',r:'',av:'aline',s:'Student · Looking for a single room'},
  {n:'Moses',r:'',av:'moses',s:'Student · Food and study tips'},
  {n:'Marie',r:'',av:'marie',s:'Student · Transport tips'},
  {n:'Patrick',r:'',av:'patrick',s:'Student · Nyabugogo'},
  {n:'Grace',r:'',av:'grace',s:'Student · Nyabugogo'},
  {n:'Diane',r:'',av:'diane',s:'Student · Kimironko'},
  {n:'Olivier',r:'',av:'olivier',s:'Student · Kacyiru'},
  {n:'Sandrine',r:'',av:'sandrine',s:'Student · Nyabugogo'},
  {n:'Eric',r:'',av:'eric',s:'Student · Selling study items'}
];

export const TREND: string[][] = [
  ['Nyabugogo student guide','58 posts','student guide'],
  ['Single room near campus','41 posts','single room'],
  ['Cheap food spots','36 posts','cheap food'],
  ['Market prices today','29 posts','market prices'],
  ['Getting to campus safely','17 posts','campus safely']
];
