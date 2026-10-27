-- Sample bios and covers for the demo profiles (run after 0002_profiles.sql).
update public.profiles set bio = v.bio, cover = v.cover from (values
  ('emmanuel', 'Student at Nyabugogo. I share tips about rooms, cheap food and getting around Kigali. 🧡', 'photo-1489493585363-d69421e0edd3'),
  ('nyira',    'Landlord in Nyabugogo. Clean, safe rooms and houses for students.', 'photo-1568605114967-8130f3a36994'),
  ('jean',     'Landlord in Kimironko. Quiet compound, fair prices, fast replies.', 'photo-1522708323590-d24dbb6b0267'),
  ('racheal',  'Market girl turned student. I post fresh prices from Nyabugogo every week. 🥬', 'photo-1540420773420-3366772f4999'),
  ('aline',    'Looking for a quiet single room near campus. Tips welcome!', null),
  ('moses',    'Food and study tips for broke students. 🍲', 'photo-1546069901-ba9599a7e63c'),
  ('marie',    'Transport tips and safe routes to campus. 🚌', 'photo-1544620347-c4fd4a3d5957')
) as v(handle, bio, cover) where public.profiles.handle = v.handle;

-- Sample links (who is linked with whom) so the profile counts are not all zero.
insert into public.links (follower_id, followee_id)
select f.id, t.id from (values
  ('racheal','emmanuel'),('aline','emmanuel'),('moses','emmanuel'),('marie','emmanuel'),('patrick','emmanuel'),('grace','emmanuel'),('diane','emmanuel'),
  ('emmanuel','racheal'),('emmanuel','marie'),
  ('aline','racheal'),('moses','racheal'),('marie','racheal'),('patrick','racheal'),
  ('racheal','nyira'),('aline','nyira'),('jean','nyira'),
  ('aline','jean'),('moses','jean')
) as v(a, b)
join public.profiles f on f.handle = v.a join public.profiles t on t.handle = v.b
on conflict do nothing;
