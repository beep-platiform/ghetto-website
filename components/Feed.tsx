import { POSTS, IMG_BASE, type FeedPost } from '../data/feed';

const photo = (id: string, size: string) => `${IMG_BASE}${id}?${size}&fit=crop`;
const face = (id: string) => `${IMG_BASE}${id}?w=100&h=100&fit=crop&crop=faces`;

function Actions({ p }: { p: FeedPost }) {
  return (
    <div className="post-actions">
      <button className="action like" data-count={p.likes}>
        <i className="fa-regular fa-heart"></i>
        <span>{p.likes}</span>
      </button>
      <button className="action cmt">
        <i className="fa-regular fa-comment"></i>
        <span>{p.comments}</span>
      </button>
      <button className="action share">
        <i className="fa-solid fa-share"></i>
        <span>{p.shares}</span>
      </button>
    </div>
  );
}

function FeaturedPost({ p }: { p: FeedPost }) {
  const [main, t2, t3] = p.photos ?? [];
  return (
    <article
      className="post featured"
      data-category={p.category ?? undefined}
      style={{ animationDelay: p.delay }}
    >
      <div className="post-head">
        <div className="avatar">
          <img alt={p.author} src={face(p.avatar)} />
        </div>
        <div>
          <div className="author">
            {p.author} {p.verified && <i className="fa-solid fa-circle-check"></i>}
          </div>
          <div className="meta">{p.meta}</div>
        </div>
        <button className="follow">Link</button>
        <button className="more" aria-label="More">
          <i className="fa-solid fa-ellipsis-vertical"></i>
        </button>
      </div>
      <div className="post-title">
        {p.title} {p.sub && <small>{p.sub}</small>}
      </div>
      <div className="post-copy">{p.copy}</div>

      <div className="photo-grid">
        <div className="tile main">
          <img alt={main.alt} src={photo(main.photo, 'w=700&h=500')} />
          {p.sign && <span className="sign">{p.sign}</span>}
          <span className="photo-count">{p.photoCount}</span>
        </div>
        <div className="tile t2">
          <img alt={t2.alt} src={photo(t2.photo, 'w=350&h=250')} />
        </div>
        <div className="tile t3">
          <img alt={t3.alt} src={photo(t3.photo, 'w=350&h=250')} />
          <div className="more-mask">{p.more}</div>
        </div>
      </div>

      <Actions p={p} />
    </article>
  );
}

function CompactPost({ p }: { p: FeedPost }) {
  return (
    <article
      className="post compact"
      data-category={p.category ?? undefined}
      style={{ animationDelay: p.delay }}
    >
      <div className="compact-row">
        <div className="compact-body">
          <div className="head">
            <div className="avatar">
              <img alt={p.author} src={face(p.avatar)} />
            </div>
            <div>
              <div className="author">
                {p.author} <em>({p.role})</em>
              </div>
              <div className="meta">
                {p.meta} {p.isNew && <span className="tag">New</span>}
              </div>
            </div>
            <button className="follow">Link</button>
          </div>
          <div className="compact-title">{p.title}</div>
          <div className="compact-copy">{p.copy}</div>
        </div>
        {p.thumb && (
          <div className="thumb">
            <img alt={p.thumb.alt} src={photo(p.thumb.photo, 'w=240&h=280')} />
          </div>
        )}
      </div>
      <Actions p={p} />
    </article>
  );
}

export default function Feed() {
  return (
    <main className="feed" id="feed">
      {POSTS.map((p, i) => (p.kind === 'featured' ? <FeaturedPost p={p} key={i} /> : <CompactPost p={p} key={i} />))}
    </main>
  );
}
