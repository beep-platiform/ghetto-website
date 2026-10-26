
export default function NotificationsSheet() {
  return (
    <section className="sheet" id="sheetNotif" aria-hidden="true" role="dialog" aria-label="Notifications">
      <header className="sh-top">
        <button className="d-back" data-close aria-label="Close notifications"><i className="fa-solid fa-arrow-left"></i></button>
        <b className="sh-title">Notifications</b>
        <button className="mark-all" id="markAll"><i className="fa-solid fa-check-double"></i>Mark all read</button>
      </header>
      <div className="tabs" id="nTabs">
        <button type="button" className="tab on" data-tab="all">All</button>
        <button type="button" className="tab" data-tab="unread">Unread<span className="tc" id="nUnreadCount"></span></button>
      </div>
      <div className="sh-body" id="nBody"></div>
      <button className="sh-grab" aria-label="Close"><span></span></button>
    </section>
  );
}
