// Static UI constants (labels, icons, fallback photos). All real content comes from Supabase.

export const RFAC: Record<string, [string, string]> = {wifi:['Wi-Fi','fa-wifi'],water:['Water','fa-droplet'],electricity:['Electricity','fa-bolt'],kitchen:['Kitchen','fa-kitchen-set'],security:['Security','fa-shield-halved'],furnished:['Furnished','fa-couch']};
export const RTYPES: [string, string, string][] = [['all','All','fa-border-all'],['single','Single room','fa-bed'],['shared','Shared room','fa-user-group'],['house','House','fa-house'],['apartment','Apartment','fa-building']];
export const RTYPE: Record<string, string> = {single:'Single room',shared:'Shared room',house:'House',apartment:'Apartment'};
export const ICON: Record<string, string> = {like:'fa-heart',comment:'fa-comment',follow:'fa-user-plus',house:'fa-house',mention:'fa-at',price:'fa-tag'};
export const POOL: string[] = ['photo-1489493585363-d69421e0edd3','photo-1546069901-ba9599a7e63c','photo-1540420773420-3366772f4999','photo-1542838132-92c53300491e',
            'photo-1547592180-85f173990554','photo-1498837167922-ddd27525d352','photo-1544620347-c4fd4a3d5957','photo-1519003722824-194d4455a60c'];
