// Static UI constants (labels, icons, fallback photos). All real content comes from Supabase.

export const RFAC: Record<string, [string, string]> = {wifi:['Wi-Fi','fa-wifi'],water:['Water','fa-droplet'],electricity:['Electricity','fa-bolt'],kitchen:['Kitchen','fa-kitchen-set'],security:['Security','fa-shield-halved'],furnished:['Furnished','fa-couch']};
export const RTYPES: [string, string, string][] = [['all','All','fa-border-all'],['single','Single room','fa-bed'],['shared','Shared room','fa-user-group'],['house','House','fa-house'],['apartment','Apartment','fa-building']];
export const RTYPE: Record<string, string> = {single:'Single room',shared:'Shared room',house:'House',apartment:'Apartment'};
export const ICON: Record<string, string> = {like:'fa-heart',comment:'fa-comment',follow:'fa-user-plus',house:'fa-house',mention:'fa-at',price:'fa-tag'};
export const POOL: string[] = ['photo-1489493585363-d69421e0edd3','photo-1546069901-ba9599a7e63c','photo-1540420773420-3366772f4999','photo-1542838132-92c53300491e',
            'photo-1547592180-85f173990554','photo-1498837167922-ddd27525d352','photo-1544620347-c4fd4a3d5957','photo-1519003722824-194d4455a60c'];

// Photos people can pick for their profile (Unsplash ids; the database only accepts ids of this shape).
export const AVATARS: string[] = ['photo-1500648767791-00dcc994a43e','photo-1506794778202-cad84cf45f1d','photo-1507003211169-0a1dd7228f2d','photo-1438761681033-6461ffad8d80','photo-1472099645785-5658abf4ff4e','photo-1494790108377-be9c29b29330','photo-1534528741775-53994a69daeb','photo-1544005313-94ddf0286df2','photo-1519085360753-af0119f7cbe7','photo-1531123897727-8f129e1688ce','photo-1560250097-0b93528c311a'];
export const COVERS: string[] = ['photo-1489493585363-d69421e0edd3','photo-1568605114967-8130f3a36994','photo-1522708323590-d24dbb6b0267','photo-1546069901-ba9599a7e63c','photo-1540420773420-3366772f4999','photo-1502672260266-1c1ef2d93688','photo-1544620347-c4fd4a3d5957','photo-1600585154340-be6161a56a0c'];
