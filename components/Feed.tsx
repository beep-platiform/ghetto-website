import type { Post } from '../lib/types';
import { photoUrl, faceUrl, metaOf, isUrl } from '../lib/format';

/** Extra facts the script needs: the full photo list of uploaded posts, and whether comments are switched off. */
function extra(p: Post) {
  const o: Record<string, string> = {};
  if (p.photos.some(isUrl)) o['data-photos'] = JSON.stringify(p.photos);
  if (p.commentsOn === false) o['data-cm'] = '0';
  if (p.saved) o['data-saved'] = '1';
  return o;
}

/** #topics (and the price on white cards, where there is no photo tag to carry it) */
function Chips({ p }: { p: Post }) {
  const price = p.kind === 'compact' && p.sign ? p.sign : '';
  const tags = p.tags || [];
  if (!price && !tags.length) return null;
  return (
    <div className="post-tags">
      {price && <span className="pt-price">{price}</span>}
      {tags.map(t => <span key={t}>#{t}</span>)}
    </div>
  );
}

function Actions({ p }: { p: Post }) {
  const base = p.likes - (p.liked ? 1 : 0);
  return (
    <div className="post-actions">
      <button className={'action like' + (p.liked ? ' on' : '')} data-count={base}>
        <i className={p.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}></i>
        <span>{p.likes}</span>
      </button>
      <button className="action cmt">
        <i className="fa-regular fa-comment"></i>
        <span>0</span>
      </button>
      <button className="action share">
        <i className="fa-solid fa-share"></i>
        <span>{p.shares}</span>
      </button>
    </div>
  );
}

// `self` hides the Link button on your own posts (you cannot link with yourself)
const LinkBtn = ({ on, self }: { on: boolean; self?: boolean }) =>
  on ? (
    <button className={'follow on' + (self ? ' self' : '')}><i className="fa-solid fa-check"></i>Linked</button>
  ) : (
    <button className={'follow' + (self ? ' self' : '')}>Link</button>
  );

function FeaturedPost({ p, i, meId }: { p: Post; i: number; meId: string }) {
  const [main, t2, t3] = p.photos;
  return (
    <article
      className="post featured"
      data-id={p.id}
      data-author={p.author.id}
      data-category={p.category ?? undefined}
      {...extra(p)}
      style={{ animationDelay: `${Math.min(i, 9) * 0.1 + 0.1}s` }}
    >
      <div className="post-head">
        <div className="avatar">
          <img alt={p.author.name} src={faceUrl(p.author.avatar)} />
        </div>
        <div>
          <div className="author">
            {p.author.name} {p.author.verified && <i className="fa-solid fa-circle-check"></i>}
          </div>
          <div className="meta">{metaOf(p)}</div>
        </div>
        <LinkBtn on={p.author.linked} self={p.author.id === meId} />
        <button className="more" aria-label="More">
          <i className="fa-solid fa-ellipsis-vertical"></i>
        </button>
      </div>
      <div className="post-title">
        {p.title} {p.subtitle && <small>{p.subtitle}</small>}
      </div>
      <div className="post-copy">{p.body}</div>
      <Chips p={p} />

      {main && (
        <div className={'photo-grid n' + Math.min(p.photos.length, 3)}>
          <div className="tile main">
            <img alt={p.title} src={photoUrl(main, 'w=700&h=500')} />
            {p.sign && <span className="sign">{p.sign}</span>}
            <span className="photo-count">1/{p.photoTotal || p.photos.length}</span>
          </div>
          {t2 && (
            <div className="tile t2">
              <img alt="" src={photoUrl(t2, 'w=350&h=250')} />
            </div>
          )}
          {t3 && (
            <div className="tile t3">
              <img alt="" src={photoUrl(t3, 'w=350&h=250')} />
              {p.moreCount > 0 && <div className="more-mask">+{p.moreCount}</div>}
            </div>
          )}
        </div>
      )}

      <Actions p={p} />
    </article>
  );
}

function CompactPost({ p, i, meId }: { p: Post; i: number; meId: string }) {
  return (
    <article
      className="post compact"
      data-id={p.id}
      data-author={p.author.id}
      data-category={p.category ?? undefined}
      {...extra(p)}
      style={{ animationDelay: `${Math.min(i, 9) * 0.1 + 0.1}s` }}
    >
      <div className="compact-row">
        <div className="compact-body">
          <div className="head">
            <div className="avatar">
              <img alt={p.author.name} src={faceUrl(p.author.avatar)} />
            </div>
            <div>
              <div className="author">
                {p.author.name} <em>({p.author.role})</em>
              </div>
              <div className="meta">
                {metaOf(p)} {p.tag === 'New' && <span className="tag">New</span>}
              </div>
            </div>
            <LinkBtn on={p.author.linked} self={p.author.id === meId} />
            <button className="more" aria-label="More"><i className="fa-solid fa-ellipsis-vertical"></i></button>
          </div>
          <div className="compact-title">{p.title}</div>
          <div className="compact-copy">{p.body}</div>
          <Chips p={p} />
        </div>
        {p.photos[0] && (
          <div className="thumb">
            <img alt={p.title} src={photoUrl(p.photos[0], 'w=240&h=280')} />
          </div>
        )}
      </div>
      <Actions p={p} />
    </article>
  );
}

export default function Feed({ posts, meId }: { posts: Post[]; meId: string }) {
  return (
    <main className="feed" id="feed">
      {posts.map((p, i) => (p.kind === 'featured' ? <FeaturedPost p={p} i={i} meId={meId} key={p.id} /> : <CompactPost p={p} i={i} meId={meId} key={p.id} />))}
    </main>
  );
}
