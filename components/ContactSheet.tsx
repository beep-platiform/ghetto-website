
export default function ContactSheet() {
  return (
    <div className="bsheet" id="contactSheet" aria-hidden="true" role="dialog" aria-label="Contact landlord">
      <div className="bs-back"></div>
      <div className="bs-card">
        <button className="bs-close" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
        <div className="bs-body">
          <div className="cs">
            <div className="cs-who"><div className="avatar"><img id="csAv" alt="" /></div><div><b id="csName"></b><small id="csRoom"></small></div></div>
            <textarea id="csMsg" rows={3} maxLength={300} aria-label="Your message"></textarea>
            <div className="cs-quick">
              <button type="button" data-m="Hi, is this room still available?">Still available?</button>
              <button type="button" data-m="Can I visit this weekend?">Visit this weekend</button>
              <button type="button" data-m="Is the price negotiable?">Price negotiable?</button>
            </div>
            <button type="button" className="cs-send" id="csSend"><i className="fa-solid fa-paper-plane"></i>Send message</button>
            <div className="cs-alt">
              <button type="button" id="csCall"><i className="fa-solid fa-phone"></i>Call</button>
              <button type="button" id="csWa"><i className="fa-brands fa-whatsapp"></i>WhatsApp</button>
            </div>
            <p className="cs-safe"><i className="fa-solid fa-shield-halved"></i>Visit the room and meet the landlord before you pay any money.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
