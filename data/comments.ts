// Seed comments for each feed post (static).
import { AV } from './people';

export type Reply = { id: number; name: string; av: string; t: number; likes: number; liked: boolean; mine: boolean; text: string; replies: Reply[] };
export type Comment = Reply & { open: boolean };

let uid = 0;
// C(name, avatarKey, minutesAgo, likes, text, replies?)
const C = (name: string, av: string, t: number, likes: number, text: string, replies?: (string | number)[][]): Comment => ({
  id: ++uid, name, av: AV[av], t, likes, liked: false, mine: false, text, open: false,
  replies: (replies || []).map((r) => ({ id: ++uid, name: r[0] as string, av: AV[r[1] as string], t: r[2] as number, likes: r[3] as number, liked: false, mine: false, text: r[4] as string, replies: [] })),
});

export const COMMENTS: Record<string, Comment[]> = {
  p1:[C('Aline','aline',55,42,'This helped me so much when I moved here. Checking the water supply before paying rent is gold 🙌',[['Emmanuel','emmanuel',40,9,'Glad it helped, Aline! Ask the neighbours too, they always tell the truth 😄']]),
      C('Patrick','patrick',90,31,'Add that mornings are the best time to get fresh food at good prices.'),
      C('Grace','grace',120,18,'Is it safe to walk back from Nyabugogo after 8pm?',[['Emmanuel','emmanuel',100,6,'Stay on the main road and travel in a group. It is fine until about 9pm.']]),
      C('Moses','moses',150,11,'The cheapest chapati and tea is near the bus park, 800 RWF 👌'),
      C('Diane','diane',200,7,'Saving this for next semester 📌'),
      C('Olivier','olivier',260,4,'Which area is best for a quiet room?')],
  p2:[C('Sandrine','sandrine',70,36,'Is the price negotiable for two students sharing a room?',[['Nyirabukeye','nyira',55,14,'Yes, we can discuss it. Message me and we can arrange a visit.']]),
      C('Patrick','patrick',110,19,'Is there a deposit and how many months do we pay upfront?'),
      C('Marie','marie',180,9,'How far is it from campus on foot?',[['Nyirabukeye','nyira',150,5,'About 12 minutes on foot.']]),
      C('Moses','moses',240,5,'Interested! I just sent you a message.')],
  p3:[C('Moses','moses',300,38,'Thank you Racheal! Onions went up a bit yesterday, around 600 now.'),
      C('Grace','grace',420,24,'Which stall has the best tomatoes?',[['Racheal','racheal',380,11,'The second row near the entrance. Go before 9am.']]),
      C('Aline','aline',600,15,'Rice is cheaper if you buy 5kg together.'),
      C('Olivier','olivier',900,8,'Please post these every week 🙏')],
  p4:[C('Diane','diane',300,27,'Does the rent include electricity?',[['Jean Claude','jean',280,10,'Yes, electricity and water are both included.']]),
      C('Patrick','patrick',360,14,'Is it available from November?'),
      C('Marie','marie',420,6,'Great price for Kimironko 👏')],
  p5:[C('Grace','grace',480,51,'The rice and beans place behind the market is my favourite. Big portions!'),
      C('Racheal','racheal',520,33,'Thanks Moses! What time does the chapati stall open?',[['Moses','moses',500,12,'Around 6:30am, and it sells out by 10.']]),
      C('Olivier','olivier',600,19,'Add the tea spot near the bus park, 500 RWF 😋'),
      C('Sandrine','sandrine',700,9,'Saving this thread 🙌')],
  p6:[C('Patrick','patrick',700,16,'Can you deliver to Kimironko?',[['Eric','eric',650,4,'I can help with transport if it is nearby.']]),
      C('Aline','aline',760,8,'Is the price negotiable?'),
      C('Moses','moses',900,3,'Sent you a DM')],
  p7:[C('Racheal','racheal',1500,47,'Always confirm the fare before you board. Saved me many times!'),
      C('Grace','grace',1560,29,'Keep your bag in front of you in the crowd 🎒',[['Marie','marie',1500,12,'Exactly! Thanks for adding that, Grace.']]),
      C('Patrick','patrick',1600,17,'Buses before 7am are the least crowded.'),
      C('Diane','diane',1700,6,'Very useful, thank you 💛')]
};
