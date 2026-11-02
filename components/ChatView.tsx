/** One chat (/messages/<id>). The bubbles are drawn by lib/ghetto.ts. */
export default function ChatView() {
  return (
    <div className="rdetail chat" id="chatView" aria-hidden="true" role="dialog" aria-label="Chat">
      <header className="d-top">
        <button className="d-back" id="chBack" aria-label="Back"><i className="fa-solid fa-arrow-left"></i></button>
        <button className="ch-who" id="chWho" aria-label="Open profile">
          <span className="avatar"><img id="chAv" alt="" /></span>
          <span className="ch-nm"><b id="chName"></b><small id="chSub"></small></span>
        </button>
      </header>
      <div className="ch-scroll" id="chScroll"><div id="chBody"></div></div>
      <div className="ch-note" id="chNote" hidden>You can't send messages to this person.</div>
      <form className="ch-bar" id="chBar" autoComplete="off">
        <textarea id="chInput" rows={1} maxLength={1000} placeholder="Write a message" aria-label="Message"></textarea>
        <button type="submit" id="chSend" aria-label="Send" disabled><i className="fa-solid fa-paper-plane"></i></button>
      </form>
    </div>
  );
}
