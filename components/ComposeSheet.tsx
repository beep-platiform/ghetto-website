export default function ComposeSheet() {
  return (
    <div className="bsheet" id="composeSheet" aria-hidden="true" role="dialog" aria-label="New post">
      <div className="bs-back"></div>
      <div className="bs-card">
        <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
        <div className="bs-body">
          <div className="cs">
            <div className="cs-who"><div className="avatar"><img id="cpAv" alt="" /></div><div><b>New post</b><small>Share a tip, a room or a price with the community</small></div></div>
            <input className="cs-in" id="cpTitle" type="text" maxLength={140} placeholder="Title" aria-label="Title" autoComplete="off" />
            <textarea id="cpBody" rows={4} maxLength={2000} placeholder="What do you want to share?" aria-label="Post text"></textarea>
            <input className="cs-in" id="cpLoc" type="text" maxLength={60} placeholder="Place (optional), e.g. Nyabugogo" aria-label="Place" autoComplete="off" />
            <button type="button" className="cs-send" id="cpSend"><i className="fa-solid fa-paper-plane"></i>Post</button>
          </div>
        </div>
      </div>
    </div>
  );
}
