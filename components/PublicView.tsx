import Link from 'next/link';
import { photoUrl } from '../lib/format';
import { SITE, snippet, type PublicPost, type PublicRoom } from '../lib/public';

const TYPE: Record<string, string> = { room: 'Room', tip: 'Tip', price: 'Market price', question: 'Question', event: 'Event', single: 'Single room', shared: 'Shared room', house: 'House', apartment: 'Apartment' };
const rwf = (n: number) => n.toLocaleString('en-US');

function Top() {
  return (
    <header className="pub-top">
      <a className="pub-brand" href="/">Ghetto</a>
      <Link className="pub-cta" href="/login">Log in or join</Link>
    </header>
  );
}
function Join() {
  return (
    <div className="pub-join">
      <b>Live. Learn. Grow.</b>
      <span>Join Ghetto to comment, save and message people in Nyabugogo.</span>
      <Link className="pub-cta" href="/login">Join Ghetto</Link>
    </div>
  );
}

/** What a visitor who is not logged in (and Google) sees at /post/<id>. Real HTML, so it can be indexed. */
export function PublicPostView({ post }: { post: PublicPost }) {
  const ld = {
    '@context': 'https://schema.org', '@type': 'SocialMediaPosting', headline: post.title, articleBody: post.body,
    datePublished: post.createdAt, url: `${SITE}/post/${post.id}`, author: { '@type': 'Person', name: post.author.name, url: `${SITE}/profile/${post.author.handle}` },
    image: post.photos.filter((p) => /^https?:/.test(p)).slice(0, 4), keywords: post.tags.join(', ') || undefined,
    contentLocation: post.location ? { '@type': 'Place', name: post.location } : undefined,
  };
  return (
    <div className="pub">
      <Top />
      <article className="pub-card">
        {post.photos.length > 0 && (
          <div className="pub-ph">{post.photos.slice(0, 6).map((p, i) => <img key={i} src={photoUrl(p, 'w=900&h=700')} alt={post.alt || post.title} loading={i ? 'lazy' : 'eager'} />)}</div>
        )}
        <div className="pub-in">
          <h1>{post.title}</h1>
          <div className="pub-by"><b>{post.author.name}</b> ({post.author.role}) · {TYPE[post.type] || 'Post'}{post.location ? ` · ${post.location}` : ''} · {new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <p>{post.body}</p>
          {post.price != null && <div className="pub-price">{rwf(post.price)} RWF</div>}
          {post.tags.length > 0 && <div className="pub-tags">{post.tags.map((t) => <span key={t}>#{t}</span>)}</div>}
          <Join />
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  );
}

export function PublicRoomView({ room }: { room: PublicRoom }) {
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: room.title, description: snippet(room.about, 300), url: `${SITE}/rooms/${room.id}`,
    image: room.photos.filter((p) => /^https?:/.test(p)).slice(0, 4),
    offers: { '@type': 'Offer', price: room.price, priceCurrency: 'RWF', availability: 'https://schema.org/InStock', url: `${SITE}/rooms/${room.id}` },
    aggregateRating: room.rev > 0 ? { '@type': 'AggregateRating', ratingValue: room.rate, reviewCount: room.rev } : undefined,
  };
  const facts: [string, string][] = [['Type', TYPE[room.type] || room.type], ['Area', room.area], ['Bedrooms', String(room.beds)], ['Bathroom', room.bath], ['Available from', room.from], ['Deposit', room.deposit || '—'], ['Minimum stay', room.minStay || '—'], ['Landlord', room.landlord.name]];
  return (
    <div className="pub">
      <Top />
      <article className="pub-card">
        {room.photos.length > 0 && <div className="pub-ph">{room.photos.slice(0, 6).map((p, i) => <img key={i} src={photoUrl(p, 'w=900&h=700')} alt={`${room.title} photo ${i + 1}`} loading={i ? 'lazy' : 'eager'} />)}</div>}
        <div className="pub-in">
          <h1>{room.title}</h1>
          <div className="pub-by">{room.area}{room.rev > 0 ? ` · ★ ${room.rate} (${room.rev} reviews)` : ''}</div>
          <div className="pub-price">{rwf(room.price)} RWF <small>/ month</small></div>
          <dl className="pub-dl">{facts.map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {room.fac.length > 0 && <div className="pub-tags">{room.fac.map((f) => <span key={f}>{f}</span>)}</div>}
          {room.about && <p style={{ marginTop: 16 }}>{room.about}</p>}
          <Join />
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  );
}
