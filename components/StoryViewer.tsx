
export default function StoryViewer() {
  return (
    <div className="viewer" id="viewer" aria-hidden="true" role="dialog" aria-label="Story">
      <div className="v-bg" id="vBg"></div>
      <div className="v-shade"></div>
      <div className="v-top">
        <div className="v-bars" id="vBars"></div>
        <div className="v-head">
          <div className="v-avatar"><img id="vAv" alt="" /></div>
          <b id="vName"></b>
          <span id="vTime"></span>
          <button className="v-close" id="vClose" aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <div className="v-zones" id="vZones">
        <button className="v-zone" id="vPrev" aria-label="Previous"></button>
        <button className="v-zone" id="vNext" aria-label="Next"></button>
      </div>
      <div className="v-bottom" id="vBottom">
        <span className="v-badge" id="vBadge"></span>
        <h2 className="v-title"><span id="vTitle"></span></h2>
        <div className="v-price" id="vPrice"></div>
        <div className="v-loc"><i className="fa-solid fa-location-dot"></i><span id="vLoc"></span></div>
        <div className="v-actions">
          <button className="v-details" id="vDetails"><i className="fa-regular fa-comment"></i>View Details</button>
          <button className="v-like" id="vLike" aria-label="Like"><i className="fa-regular fa-heart"></i></button>
        </div>
      </div>
    </div>
  );
}
