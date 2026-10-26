// Rooms, landlords and reviews (static sample data). Replace with real data later.

export type Landlord = { name: string; av: string; ver: boolean; joined: string; reply: string };
export type Room = {
  id: string; title: string; type: string; area: string; km: number; price: number; beds: number; bath: string;
  fac: string[]; ll: Landlord; llk: string; rate: number; rev: number; from: string; dep: string; min: string;
  photos: string[]; about: string;
};

export const RFAC: Record<string, [string, string]> = {wifi:['Wi-Fi','fa-wifi'],water:['Water','fa-droplet'],electricity:['Electricity','fa-bolt'],kitchen:['Kitchen','fa-kitchen-set'],security:['Security','fa-shield-halved'],furnished:['Furnished','fa-couch']};
export const RTYPES: [string, string, string][] = [['all','All','fa-border-all'],['single','Single room','fa-bed'],['shared','Shared room','fa-user-group'],['house','House','fa-house'],['apartment','Apartment','fa-building']];
export const RTYPE: Record<string, string> = {single:'Single room',shared:'Shared room',house:'House',apartment:'Apartment'};
export const RLL: Record<string, Landlord> = {
  james:{name:'James N.',av:'patrick',ver:true,joined:'3 months ago',reply:'within 1 hour'},
  nyira:{name:'Nyirabukeye',av:'nyira',ver:true,joined:'1 year ago',reply:'within 2 hours'},
  jean:{name:'Jean Claude',av:'jean',ver:true,joined:'8 months ago',reply:'within 1 hour'},
  alice:{name:'Alice U.',av:'sandrine',ver:false,joined:'2 weeks ago',reply:'within a day'},
  eric:{name:'Eric K.',av:'olivier',ver:false,joined:'5 months ago',reply:'within 3 hours'}
};

const Rm = (id: string, title: string, type: string, area: string, km: number, price: number, beds: number, bath: string,
  fac: string[], ll: string, rate: number, rev: number, from: string, dep: string, min: string, photos: string[], about: string): Room =>
  ({ id, title, type, area, km, price, beds, bath, fac, ll: RLL[ll], llk: ll, rate, rev, from, dep, min, photos, about });

export const ROOMS: Room[] = [
  Rm('r1','Single Room Near Campus','single','Nyabugogo',1.2,45000,1,'Shared',['wifi','water','electricity','kitchen'],'james',4.8,36,'2026-10-24','1 month','3 months',
    ['photo-1522708323590-d24dbb6b0267','photo-1540518614846-7eded433c457','photo-1484154218962-a197022b5858','photo-1560185007-cde436f6a4d0','photo-1505691938895-1758d7feb511'],
    'A clean and comfortable single room in a shared house. The house is quiet, safe and close to the main road, so you can walk to campus in about 15 minutes. Ideal for students.'),
  Rm('r2','3 Bedroom House Near Nyabugogo','house','Nyabugogo',1.6,120000,3,'Private',['wifi','water','electricity','kitchen','security'],'nyira',4.9,52,'2026-10-24','2 months','6 months',
    ['photo-1568605114967-8130f3a36994','photo-1600585154340-be6161a56a0c','photo-1512917774080-9991f1c4c750','photo-1556909114-f6e7ad7d3136','photo-1522771739844-6a9f6d5f14af'],
    'A bright three bedroom house with a fenced garden and secure parking. Perfect for a group of friends or a small family who want space and privacy close to the bus park.'),
  Rm('r3','Shared Room for 2 Students','shared','Kimironko',2.4,28000,1,'Shared',['wifi','water','electricity'],'jean',4.5,21,'2026-11-01','1 month','3 months',
    ['photo-1555854877-bab0e564b8d5','photo-1522708323590-d24dbb6b0267','photo-1540518614846-7eded433c457','photo-1484154218962-a197022b5858'],
    'Two comfortable beds in a spacious room with a study corner. Rent is per person, which keeps it very affordable. A friendly compound with other students.'),
  Rm('r4','Modern Studio Apartment','apartment','Kacyiru',3.1,95000,1,'Private',['wifi','water','electricity','kitchen','security','furnished'],'alice',4.7,18,'2026-11-15','2 months','6 months',
    ['photo-1502672260266-1c1ef2d93688','photo-1493809842364-78817add7ffb','photo-1560448204-e02f11c3d0e2','photo-1556909114-f6e7ad7d3136','photo-1505691938895-1758d7feb511'],
    'A fully furnished studio with its own kitchen and bathroom, 24 hour security and fast Wi-Fi. A quiet and modern place for someone who wants everything ready on day one.'),
  Rm('r5','Cozy Single Room with Own Bath','single','Kimironko',1.8,55000,1,'Private',['wifi','water','electricity'],'jean',4.6,27,'2026-10-24','1 month','3 months',
    ['photo-1540518614846-7eded433c457','photo-1522708323590-d24dbb6b0267','photo-1560185007-cde436f6a4d0','photo-1484154218962-a197022b5858'],
    'A warm single room with a private bathroom and plenty of natural light. The landlord lives on the same plot, so help is always close if something needs fixing.'),
  Rm('r6','Family Apartment, 2 Bedrooms','apartment','Remera',4.0,160000,2,'Private',['wifi','water','electricity','kitchen','security'],'eric',4.4,14,'2026-12-01','2 months','12 months',
    ['photo-1560448204-e02f11c3d0e2','photo-1502672260266-1c1ef2d93688','photo-1493809842364-78817add7ffb','photo-1556909114-f6e7ad7d3136'],
    'A spacious two bedroom apartment in a gated block with parking and a shared playground. Good for families, with schools and a market within walking distance.'),
  Rm('r7','Budget Shared Room Near Bus Park','shared','Nyabugogo',0.6,20000,1,'Shared',['water','electricity'],'nyira',4.2,33,'2026-10-24','1 month','1 month',
    ['photo-1555854877-bab0e564b8d5','photo-1505691938895-1758d7feb511','photo-1522708323590-d24dbb6b0267'],
    'The most affordable option on the list. A simple, clean shared room a few minutes from the bus park, ideal if you travel a lot or just need a place to sleep and study.'),
  Rm('r8','Furnished Single Room, Quiet Compound','single','Kacyiru',2.7,62000,1,'Private',['wifi','water','electricity','security','furnished'],'james',4.9,41,'2026-11-01','1 month','3 months',
    ['photo-1505691938895-1758d7feb511','photo-1540518614846-7eded433c457','photo-1560185007-cde436f6a4d0','photo-1522771739844-6a9f6d5f14af','photo-1484154218962-a197022b5858'],
    'A furnished room with a bed, desk, wardrobe and fast Wi-Fi in a calm, gated compound. Quiet at night, which makes it great for exam season.'),
  Rm('r9','Student House, 4 Rooms to Share','house','Remera',3.6,38000,4,'Shared',['wifi','water','electricity','kitchen'],'alice',4.3,24,'2026-10-24','1 month','3 months',
    ['photo-1512917774080-9991f1c4c750','photo-1568605114967-8130f3a36994','photo-1556909114-f6e7ad7d3136','photo-1522771739844-6a9f6d5f14af'],
    'A lively student house with four rooms, a shared kitchen and a living room. Rent is per room. Housemates are mostly final-year students who keep the house tidy.')
];

export const REVIEWS: [string, string, string, number, string][] = [
  ['Aline','aline','Quiet place and the landlord replies fast. I felt safe walking back at night.',5,'2 weeks ago'],
  ['Moses','moses','Exactly like the photos. Water and electricity never gave me problems.',5,'1 month ago'],
  ['Grace','grace','Good value for the area. A bit busy on weekends but nothing bad.',4,'2 months ago']
];
