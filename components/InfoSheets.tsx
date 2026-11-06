/** Help / safety / terms / about, and the "send feedback" form. Opened from Settings. */
export default function InfoSheets() {
  return (
    <>
      <div className="bsheet" id="infoSheet" aria-hidden="true" role="dialog" aria-label="Information">
        <div className="bs-back"></div>
        <div className="bs-card">
          <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <div className="bs-body"><div className="cs ep">
            <div className="cs-who"><div><b id="infTitle"></b></div></div>
            <div className="inf-list" id="infBody"></div>
          </div></div>
        </div>
      </div>

      <div className="bsheet" id="fbSheet" aria-hidden="true" role="dialog" aria-label="Send feedback">
        <div className="bs-back"></div>
        <div className="bs-card">
          <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
          <div className="bs-body"><div className="cs ep">
            <div className="cs-who"><div><b>Send feedback</b><small>We read every message</small></div></div>
            <div className="st-seg fb-kinds" id="fbKinds">
              <button type="button" data-k="problem" className="on">Problem</button>
              <button type="button" data-k="idea">Idea</button>
              <button type="button" data-k="other">Other</button>
            </div>
            <textarea className="cs-in" id="fbText" rows={5} maxLength={1000} placeholder="Tell us what happened or what you would like"></textarea>
            <p className="pw-err" id="fbErr" role="alert"></p>
            <button type="button" className="cs-send" id="fbSend">Send</button>
          </div></div>
        </div>
      </div>
    </>
  );
}
