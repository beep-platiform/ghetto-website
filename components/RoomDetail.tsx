
export default function RoomDetail() {
  return (
    <div className="rdetail" id="roomDetail" aria-hidden="true" role="dialog" aria-label="Room details">
      <header className="d-top">
        <button className="d-back" id="rdBack" aria-label="Back"><i className="fa-solid fa-arrow-left"></i></button>
        <b id="rdTitleTop">Room details</b>
        <button className="d-more" id="rdShare" aria-label="Share"><i className="fa-solid fa-share-nodes"></i></button>
        <button className="d-more" id="rdMore" aria-label="More options"><i className="fa-solid fa-ellipsis-vertical"></i></button>
        <button className="d-more" id="rdSave" aria-label="Save room"><i className="fa-regular fa-heart"></i></button>
      </header>
      <div className="rd-scroll" id="rdScroll"><div id="rdBody"></div></div>
      <div className="rd-cta" id="rdCta">
        <div className="rd-cta-price" id="rdCtaPrice"></div>
        <button className="rd-contact" id="rdContactBtn"><i className="fa-regular fa-comment-dots"></i>Contact Landlord</button>
      </div>
    </div>
  );
}
