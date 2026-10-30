export default function ProductDetail() {
  return (
    <div className="rdetail pdetail" id="prodDetail" aria-hidden="true" role="dialog" aria-label="Product">
      <header className="d-top">
        <button className="d-back" id="pdBack" aria-label="Back"><i className="fa-solid fa-arrow-left"></i></button>
        <b id="pdTitleTop">Product</b>
        <button className="d-more" id="pdShare" aria-label="Share"><i className="fa-solid fa-share-nodes"></i></button>
        <button className="d-more" id="pdMore" aria-label="More options"><i className="fa-solid fa-ellipsis-vertical"></i></button>
      </header>
      <div className="rd-scroll" id="pdScroll"><div id="pdBody"></div></div>
      <div className="rd-cta pd-cta" id="pdCta"></div>
    </div>
  );
}
