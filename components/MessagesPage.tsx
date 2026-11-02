/** Messages (/messages): the list of your chats. Rows are drawn by lib/ghetto.ts. */
export default function MessagesPage() {
  return (
    <section className="messages" id="messagesPage" aria-label="Messages">
      <div className="rm-scroll" id="msScroll">
        <header className="ms-top">
          <button className="ms-back" id="msBack" aria-label="Back"><i className="fa-solid fa-arrow-left"></i></button>
          <b>Messages</b>
        </header>
        <div className="ms-body">
          <div className="ms-list" id="msList"></div>
          <div className="rm-empty" id="msEmpty" hidden>
            <div className="s-emoji">💬</div><b>No messages yet</b>
            <p>Message a landlord about a room, or a seller about a product, and the chat shows up here.</p>
          </div>
          <div className="more" id="msMore" hidden><span className="more-sp"></span></div>
        </div>
      </div>
    </section>
  );
}
