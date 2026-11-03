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
        <button className="d-back" id="chMore" aria-label="More"><i className="fa-solid fa-ellipsis-vertical"></i></button>
      </header>
      <div className="ch-req" id="chReq" hidden></div>
      <div className="ch-scroll" id="chScroll"><div id="chBody"></div></div>
      <div className="ch-sold" id="chSold" hidden></div>
      <div className="ch-note" id="chNote" hidden></div>
      <div className="ch-ctx" id="chCtx" hidden></div>
      <form className="ch-bar" id="chBar" autoComplete="off">
        <button type="button" className="ch-ic" id="chAttach" aria-label="Send a photo"><i className="fa-regular fa-image"></i></button>
        <button type="button" className="ch-ic" id="chQr" aria-label="Quick replies"><i className="fa-solid fa-bolt"></i></button>
        <textarea id="chInput" rows={1} maxLength={1000} placeholder="Write a message" aria-label="Message"></textarea>
        <button type="submit" id="chSend" aria-label="Send" disabled><i className="fa-solid fa-paper-plane"></i></button>
        <input type="file" id="chFile" accept="image/*" hidden />
      </form>
    </div>
  );
}
