import type { AppData } from '../lib/types';
import { IMG_BASE } from '../lib/format';

export default function Stories({ stories }: { stories: AppData['stories'] }) {
  return (
    <section className="stories" id="stories" aria-label="Stories">
      <button className="story" data-msg="Create your story ✨">
        <div className="ring">
          <div className="create-in">
            <i className="fa-solid fa-plus"></i>
            <span className="badge" style={{ margin: 0 }}>⭐</span>
          </div>
        </div>
        <span>Create</span>
      </button>
      {stories.map((s) => (
        <button className="story" data-story={s.id} key={s.id}>
          <div className="ring">
            <img alt={s.name} src={`${IMG_BASE}${s.photo}?${s.query}`} />
          </div>
          <span>{s.label}</span>
        </button>
      ))}
    </section>
  );
}
