
export default function PostDetail() {
  return (
    <div className="detail" id="detail" aria-hidden="true" role="dialog" aria-label="Post">
      <header className="d-top">
        <button className="d-back" id="dBack" aria-label="Back"><i className="fa-solid fa-arrow-left"></i></button>
        <b id="dTitleTop">Post</b>
        <button className="d-more" id="dMore" aria-label="More"><i className="fa-solid fa-ellipsis-vertical"></i></button>
      </header>
      <div className="d-scroll" id="dScroll">
        <div id="dPost"></div>
        <div className="d-chead" id="dChead">
          <b>Comments</b><span className="cnt" id="dCount">0</span>
          <button className="d-sort" id="dSort"><span id="dSortLabel">Top comments</span><i className="fa-solid fa-chevron-down"></i></button>
        </div>
        <div id="dList"></div>
        <div className="d-end">You're all caught up ✨</div>
      </div>
      <div className="d-composer">
        <div className="d-emojis" id="dEmojis">
          <button type="button">❤️</button><button type="button">🙌</button><button type="button">🔥</button><button type="button">👏</button>
          <button type="button">😍</button><button type="button">😮</button><button type="button">😂</button><button type="button">😢</button>
        </div>
        <div className="d-replying" id="dReplying"><span id="dReplyText"></span><button type="button" id="dReplyCancel" aria-label="Cancel reply"><i className="fa-solid fa-xmark"></i></button></div>
        <div className="d-inputrow">
          <div className="avatar"><img alt="You" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces" /></div>
          <div className="d-inputbox">
            <input id="dInput" type="text" placeholder="Add a comment..." autoComplete="off" maxLength={300} />
            <button className="d-send" id="dSend" aria-label="Send comment"><i className="fa-solid fa-paper-plane"></i></button>
          </div>
        </div>
      </div>
    </div>
  );
}
