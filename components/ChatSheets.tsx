/** Small sheets used by messages: quick replies, send a listing to a chat, blocked people. */
export default function ChatSheets() {
  return (
    <>
      <div className="bsheet" id="qrSheet" aria-hidden="true" role="dialog" aria-label="Quick replies">
        <div className="bs-back"></div>
        <div className="bs-card">
          <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <div className="bs-body"><div className="cs ep">
            <div className="cs-who"><div><b>Quick replies</b><small>Tap one to put it in your message</small></div></div>
            <div className="qr-list" id="qrList"></div>
            <div className="qr-add"><input className="cs-in" id="qrNew" maxLength={200} placeholder="Add a quick reply" /><button type="button" id="qrAdd" aria-label="Add"><i className="fa-solid fa-plus"></i></button></div>
          </div></div>
        </div>
      </div>

      <div className="bsheet" id="shSheet" aria-hidden="true" role="dialog" aria-label="Send in a chat">
        <div className="bs-back"></div>
        <div className="bs-card">
          <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <div className="bs-body"><div className="cs ep">
            <div className="cs-who"><div><b>Send in a chat</b><small id="shSub"></small></div></div>
            <div className="qr-list" id="shList"></div>
          </div></div>
        </div>
      </div>

      <div className="bsheet" id="blSheet" aria-hidden="true" role="dialog" aria-label="Blocked people">
        <div className="bs-back"></div>
        <div className="bs-card">
          <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <div className="bs-body"><div className="cs ep">
            <div className="cs-who"><div><b>Blocked people</b><small>They cannot message you</small></div></div>
            <div className="qr-list" id="blList"></div>
          </div></div>
        </div>
      </div>
    </>
  );
}
