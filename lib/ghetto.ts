// @ts-nocheck
/*
 * Client-side behaviour for the Ghetto home page (stories viewer, post detail + comments,
 * search / notification sheets, desktop right rail ...). It is the original script from the
 * HTML version, now an ES module that runs once the React markup is on the page.
 * Static data lives in ../data.
 */
import { ORDER, STORIES } from '../data/stories';
import { AV, POOL, PEOPLE, TREND } from '../data/people';
import { COMMENTS } from '../data/comments';
import { NOTIFS, ICON } from '../data/notifications';

export function initGhetto() {
  if (typeof window === 'undefined' || window.__ghettoReady) return;
  window.__ghettoReady = true;

  const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];

  // hide images that fail to load (the card keeps its gradient background instead of a broken icon)
  const hideImg=(img)=>{img.style.display='none'};
  document.addEventListener('error',e=>{if(e.target&&e.target.tagName==='IMG')hideImg(e.target)},true);
  $$('img').forEach(img=>{if(img.complete&&img.naturalWidth===0&&img.getAttribute('src'))hideImg(img)});
  const toast=$('#toast'); let tt;
  function showToast(m){toast.textContent=m;toast.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>toast.classList.remove('show'),1800)}

  function burst(x,y,set){
    const bits=set||['❤️','💛','✨','⭐','🎈','🧡'];
    for(let i=0;i<10;i++){
      const el=document.createElement('span');el.className='confetti';
      el.textContent=bits[Math.floor(Math.random()*bits.length)];
      const a=Math.random()*Math.PI*2,d=40+Math.random()*50;
      el.style.left=x+'px';el.style.top=y+'px';
      el.style.setProperty('--x',Math.cos(a)*d+'px');
      el.style.setProperty('--y',Math.sin(a)*d-20+'px');
      el.style.setProperty('--r',(Math.random()*240-120)+'deg');
      document.body.appendChild(el);setTimeout(()=>el.remove(),1000);
    }
  }

  // likes
  $$('.action.like').forEach(b=>b.addEventListener('click',()=>{
    const on=b.classList.toggle('on'),icon=$('i',b),num=$('span',b),base=+b.dataset.count;
    icon.className=on?'fa-solid fa-heart':'fa-regular fa-heart';
    num.textContent=on?base+1:base;
    if(on){const r=icon.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2)}
  }));
  $$('.action.share').forEach(b=>b.addEventListener('click',()=>showToast('Link copied 🔗')));

  // stories
  $$('.story').forEach(s=>s.addEventListener('click',()=>{
    if(s.dataset.story){openStory(s.dataset.story);return}
    showToast(s.dataset.msg);
    const r=s.getBoundingClientRect();burst(r.left+r.width/2,r.top+30,['✨','⭐','🌟']);
  }));

  // drag-to-scroll the story row with a mouse (touch scrolls natively)
  (function(){
    const row=$('#stories');let down=false,sx=0,sl=0,moved=false;
    row.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')return;down=true;moved=false;sx=e.clientX;sl=row.scrollLeft});
    window.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-sx;if(Math.abs(dx)>5)moved=true;row.scrollLeft=sl-dx});
    window.addEventListener('pointerup',()=>{down=false});
    row.addEventListener('click',e=>{if(moved){e.stopPropagation();e.preventDefault();moved=false}},true);
  })();


  // link / unlink
  $$('.follow').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();
    const on=b.classList.toggle('on');
    b.innerHTML=on?'<i class="fa-solid fa-check"></i>Linked':'Link';
    const name=b.closest('.post').querySelector('.author').textContent.trim().split(' ')[0];
    showToast(on?'You linked with '+name+' 🔗':'You unlinked '+name);
  }));

  // nav
  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>{
    $$('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');
    const l=b.textContent.trim();if(l!=='Home')showToast(l+' page coming soon 🚧');
  }));

  // fab
  const fab=$('#fab'),menu=$('#fabMenu');
  fab.addEventListener('click',()=>{
    fab.classList.toggle('open');menu.classList.toggle('show');
    if(fab.classList.contains('open')){const r=fab.getBoundingClientRect();burst(r.left+r.width/2,r.top,['✨','⭐','🎉'])}
  });
  $$('button',menu).forEach(b=>b.addEventListener('click',()=>{showToast(b.dataset.msg);fab.classList.remove('open');menu.classList.remove('show')}));
  document.addEventListener('click',e=>{if(!e.target.closest('#fab')&&!e.target.closest('#fabMenu')&&!e.target.closest('#sideCreate')){fab.classList.remove('open');menu.classList.remove('show')}});

  // ===== STORY VIEWER =====
  const IMG=id=>'https://images.unsplash.com/'+id+'?w=900&h=1500&fit=crop';
  const viewer=$('#viewer'),vBg=$('#vBg'),vBars=$('#vBars'),vAv=$('#vAv'),vName=$('#vName'),vTime=$('#vTime'),
        vBadge=$('#vBadge'),vTitle=$('#vTitle'),vPrice=$('#vPrice'),vLoc=$('#vLoc'),vBottom=$('#vBottom'),vLike=$('#vLike');
  let pi=0,si=0,holdAt=0;
  let seen=new Set();
  try{seen=new Set(JSON.parse(localStorage.getItem('ghettoSeen')||'[]'))}catch(e){}
  function ringOf(id){return $('.story[data-story="'+id+'"] .ring')}
  seen.forEach(id=>{const r=ringOf(id);if(r)r.classList.add('seen')});
  function markSeen(id){
    seen.add(id);const r=ringOf(id);if(r)r.classList.add('seen');
    try{localStorage.setItem('ghettoSeen',JSON.stringify([...seen]))}catch(e){}
  }
  function render(){
    const id=ORDER[pi],s=STORIES[id],sl=s.slides[si];
    vBars.innerHTML=s.slides.map((_,i)=>'<span class="seg '+(i<si?'done':i===si?'active':'')+'"><i></i></span>').join('');
    const fill=vBars.querySelector('.seg.active i');
    if(fill)fill.addEventListener('animationend',nextStory,{once:true});
    const av=$('.story[data-story="'+id+'"] img');if(av)vAv.src=av.src;
    vName.textContent=s.name;vTime.textContent=s.time;
    vBg.style.backgroundImage='url("'+IMG(sl.bg)+'"), linear-gradient(160deg,#2c4d86,#0b1730)';
    vBadge.textContent=sl.badge;vTitle.textContent=sl.title;
    vPrice.innerHTML=sl.price+(sl.unit?' <span>'+sl.unit+'</span>':'');
    vLoc.textContent=sl.loc;
    vLike.classList.remove('on');$('i',vLike).className='fa-regular fa-heart';
    [vBottom,vBg].forEach(el=>el.classList.remove('in'));void viewer.offsetWidth;
    [vBottom,vBg].forEach(el=>el.classList.add('in'));
    markSeen(id);
  }
  function openStory(id){
    pi=ORDER.indexOf(id);if(pi<0)return;si=0;
    viewer.classList.add('open');viewer.setAttribute('aria-hidden','false');
    render();
  }
  function closeStory(){
    viewer.classList.remove('open','paused');viewer.setAttribute('aria-hidden','true');
    vBars.innerHTML='';
  }
  function nextStory(){
    if(!viewer.classList.contains('open'))return;
    const s=STORIES[ORDER[pi]];
    if(si<s.slides.length-1){si++}
    else if(pi<ORDER.length-1){pi++;si=0}
    else{closeStory();return}
    render();
  }
  function prevStory(){
    if(si>0){si--}
    else if(pi>0){pi--;si=0}
    render();
  }
  function wasHeld(){const h=holdAt&&Date.now()-holdAt>300;holdAt=0;return h}
  $('#vClose').addEventListener('click',closeStory);
  $('#vNext').addEventListener('click',()=>{if(wasHeld())return;nextStory()});
  $('#vPrev').addEventListener('click',()=>{if(wasHeld())return;prevStory()});
  const zones=$('#vZones');
  zones.addEventListener('pointerdown',()=>{holdAt=Date.now();viewer.classList.add('paused')});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>zones.addEventListener(ev,()=>viewer.classList.remove('paused')));
  $('#vDetails').addEventListener('click',()=>showToast('Opening details… 🏠'));
  vLike.addEventListener('click',()=>{
    const on=vLike.classList.toggle('on');
    $('i',vLike).className=on?'fa-solid fa-heart':'fa-regular fa-heart';
    if(on){const r=vLike.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2)}
  });
  document.addEventListener('keydown',e=>{
    if(!viewer.classList.contains('open'))return;
    if(e.key==='Escape')closeStory();
    if(e.key==='ArrowRight')nextStory();
    if(e.key==='ArrowLeft')prevStory();
  });

  // ===== POST DETAIL + COMMENTS =====
  const FACE=id=>'https://images.unsplash.com/'+id+'?w=100&h=100&fit=crop&crop=faces';
  const USER=AV.emmanuel;
  const ago=t=>t<1?'Just now':t<60?t+'m':t<1440?Math.floor(t/60)+'h':Math.floor(t/1440)+'d';
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const totalOf=id=>COMMENTS[id].reduce((s,c)=>s+1+c.replies.length,0);
  const plural=n=>n+' comment'+(n===1?'':'s');

  // ---- feed: ids, counters and the one-line most-liked comment ----
  function refreshPreview(art){
    const id=art.dataset.id,arr=COMMENTS[id],pc=$('.pc',art),n=totalOf(id);
    const cs=$('.action.cmt span',art);if(cs)cs.textContent=n;
    if(!arr.length){pc.innerHTML='<button class="pc-all" type="button">Be the first to comment</button>';return}
    const top=arr.reduce((m,c)=>c.likes>m.likes?c:m,arr[0]);
    pc.innerHTML='<button class="pc-row" type="button"><span class="pc-av"><img src="'+FACE(top.av)+'" alt="" onerror="this.remove()"></span>'+
      '<span class="pc-text"><b>'+esc(top.name)+'</b>'+esc(top.text)+'</span>'+
      '<span class="pc-like"><i class="fa-solid fa-heart"></i>'+top.likes+'</span></button>'+
      '<button class="pc-all" type="button">View all '+plural(n)+'</button>';
  }
  $$('#feed .post').forEach((a,i)=>{
    a.dataset.id='p'+(i+1);
    const pc=document.createElement('div');pc.className='pc';a.appendChild(pc);
    refreshPreview(a);
  });

  // ---- detail view ----
  const detail=$('#detail'),dScroll=$('#dScroll'),dPost=$('#dPost'),dList=$('#dList'),dInput=$('#dInput'),dSend=$('#dSend');
  let curArt=null,curId=null,order=[],sortMode='top',replyTo=null,newId=0,popId=0;

  function info(art){
    const name=$('.author',art).childNodes[0].textContent.trim();
    const roleEl=$('.author em',art);
    const m=$('.meta',art).cloneNode(true);m.querySelectorAll('.tag').forEach(x=>x.remove());
    const titleEl=$('.post-title',art)||$('.compact-title',art);
    const copyEl=$('.post-copy',art)||$('.compact-copy',art);
    const imgs=$$('.photo-grid img, .thumb img',art).map(i=>i.getAttribute('src'));
    const cnt=$('.photo-count',art);
    const total=cnt?(parseInt(cnt.textContent.split('/')[1],10)||imgs.length):imgs.length;
    const photos=imgs.slice();
    for(let k=0;photos.length<total&&k<POOL.length;k++){
      const u='https://images.unsplash.com/'+POOL[k]+'?w=900&h=700&fit=crop';
      if(!photos.some(x=>x.indexOf(POOL[k])>-1))photos.push(u);
    }
    return {name:name,role:roleEl?roleEl.textContent.replace(/[()]/g,'').trim():'',meta:m.textContent.trim(),isNew:!!$('.meta .tag',art),
      verified:!!$('.author .fa-circle-check',art),title:titleEl.textContent.trim(),copy:copyEl.textContent.trim(),
      av:$('.avatar img',art).src,photos:photos};
  }
  const big=u=>u.replace(/w=\d+&h=\d+/,'w=1000&h=760');

  function buildPost(art){
    const i=info(art),fb=$('.follow',art);
    let gal='';
    if(i.photos.length){
      gal='<div class="d-gal-wrap"><div class="d-gal" id="dGal">'+i.photos.map(u=>'<div class="g-slide"><img src="'+big(u)+'" alt="" onerror="this.remove()"></div>').join('')+'</div>';
      if(i.photos.length>1){
        gal+='<span class="g-count" id="gCount">1/'+i.photos.length+'</span>'+
          '<button class="g-nav prev" data-act="gprev" aria-label="Previous photo"><i class="fa-solid fa-chevron-left"></i></button>'+
          '<button class="g-nav next" data-act="gnext" aria-label="Next photo"><i class="fa-solid fa-chevron-right"></i></button>'+
          '<div class="g-dots" id="gDots">'+i.photos.map((_,k)=>'<i class="'+(k?'':'on')+'"></i>').join('')+'</div>';
      }
      gal+='</div>';
    }
    dPost.innerHTML=
      '<div class="dp-head"><div class="avatar"><img src="'+i.av+'" alt="" onerror="this.remove()"></div>'+
      '<div class="dp-who"><div class="author">'+esc(i.name)+(i.verified?' <i class="fa-solid fa-circle-check"></i>':'')+(i.role?' <em>('+esc(i.role)+')</em>':'')+'</div>'+
      '<div class="meta">'+esc(i.meta)+(i.isNew?' <span class="tag">New</span>':'')+'</div></div>'+
      '<button class="'+fb.className+'" data-act="follow">'+fb.innerHTML+'</button></div>'+
      '<h1 class="dp-title">'+esc(i.title)+'</h1><p class="dp-copy">'+esc(i.copy)+'</p>'+gal+
      '<div class="d-stats"><span><i class="fa-solid fa-heart"></i><span id="dLikes"></span></span><span id="dCmtTxt"></span></div>'+
      '<div class="d-actions">'+
        '<button class="d-act like" data-act="like"><i class="fa-regular fa-heart"></i>Like</button>'+
        '<button class="d-act" data-act="cmt"><i class="fa-regular fa-comment"></i>Comment</button>'+
        '<button class="d-act" data-act="share"><i class="fa-solid fa-share"></i>Share</button>'+
        '<button class="d-act save" data-act="save"><i class="fa-regular fa-bookmark"></i>Save</button>'+
      '</div>';
    $('#dTitleTop').textContent=i.name+"'s post";
    const g=$('#dGal');
    if(g&&i.photos.length>1){
      g.addEventListener('scroll',()=>{
        const k=Math.round(g.scrollLeft/g.clientWidth);
        $('#gCount').textContent=(k+1)+'/'+i.photos.length;
        $$('#gDots i').forEach((d,j)=>d.classList.toggle('on',j===k));
      });
    }
    if(curArt.dataset.saved==='1'){const s=$('.d-act.save',dPost);s.classList.add('on');$('i',s).className='fa-solid fa-bookmark'}
    syncDetail();
  }

  function syncDetail(){
    const b=$('.action.like',curArt),on=b.classList.contains('on'),n=$('span',b).textContent;
    const lb=$('.d-act.like',dPost);lb.classList.toggle('on',on);$('i',lb).className=on?'fa-solid fa-heart':'fa-regular fa-heart';
    $('#dLikes').textContent=n+(n==='1'?' like':' likes');
    const fb=$('.follow',curArt),df=$('[data-act="follow"]',dPost);df.className=fb.className;df.innerHTML=fb.innerHTML;
    const total=totalOf(curId);
    $('#dCmtTxt').textContent=plural(total);$('#dCount').textContent=total;
  }

  function toggleArtLike(art){
    const b=$('.action.like',art),icon=$('i',b),num=$('span',b),base=+b.dataset.count;
    const on=b.classList.toggle('on');
    icon.className=on?'fa-solid fa-heart':'fa-regular fa-heart';
    num.textContent=on?base+1:base;
    return on;
  }

  function topId(){
    const arr=COMMENTS[curId];if(!arr.length)return 0;
    return arr.reduce((m,c)=>c.likes>m.likes?c:m,arr[0]).id;
  }
  function computeOrder(){
    const arr=COMMENTS[curId].slice();
    arr.sort((a,b)=>(b.mine?1:0)-(a.mine?1:0)||(sortMode==='top'?b.likes-a.likes:a.t-b.t));
    order=arr.map(c=>c.id);
  }
  function itemHTML(c,isReply,isTop,authorName){
    const cls='c-item'+(isReply?' reply':'')+(c.id===newId?' c-new':'');
    const badge=c.name===authorName&&!c.mine?'<span class="c-tag">Author</span>':'';
    const top=isTop?'<span class="c-top"><i class="fa-solid fa-fire"></i>Top comment</span>':'';
    let h='<div class="'+cls+'" data-id="'+c.id+'"><div class="c-av"><img src="'+FACE(c.av)+'" alt="" onerror="this.remove()"></div>'+
      '<div class="c-main"><div class="c-bubble"><b>'+esc(c.name)+badge+top+'</b><p>'+esc(c.text)+'</p></div>'+
      '<div class="c-meta"><span>'+ago(c.t)+'</span><button type="button" class="c-reply" data-cid="'+c.parent+'" data-name="'+esc(c.name)+'">Reply</button></div>';
    if(!isReply&&c.replies.length){
      h+='<button type="button" class="c-toggle" data-cid="'+c.id+'">'+(c.open?'Hide replies':'View '+c.replies.length+(c.replies.length===1?' reply':' replies'))+'</button>';
      if(c.open)h+='<div class="c-replies">'+c.replies.map(r=>{r.parent=c.id;return itemHTML(r,true,false,authorName)}).join('')+'</div>';
    }
    h+='</div><button type="button" class="c-heart'+(c.liked?' on':'')+(c.id===popId?' pop':'')+'" data-cid="'+c.id+'" aria-label="Like comment">'+
      '<i class="'+(c.liked?'fa-solid':'fa-regular')+' fa-heart"></i><span>'+c.likes+'</span></button></div>';
    return h;
  }
  function renderList(){
    const arr=COMMENTS[curId],map=new Map();
    arr.forEach(c=>{c.parent=c.id;map.set(c.id,c)});
    const author=info(curArt).name,tid=topId();
    dList.innerHTML=arr.length?order.map(id=>itemHTML(map.get(id),false,sortMode==='top'&&id===tid&&map.get(id).likes>0,author)).join(''):
      '<div class="d-empty">No comments yet. Start the conversation 💬</div>';
    newId=0;popId=0;
    syncDetail();
  }
  function findC(cid){
    for(const c of COMMENTS[curId]){if(c.id===cid)return c;for(const r of c.replies)if(r.id===cid)return r}
  }

  function openPost(art,mode){
    curArt=art;curId=art.dataset.id;sortMode='top';replyTo=null;
    $('#dReplying').classList.remove('show');dInput.value='';dInput.placeholder='Add a comment...';dSend.classList.remove('ready');
    $('#dSortLabel').textContent='Top comments';
    buildPost(art);computeOrder();renderList();
    detail.classList.add('open');detail.setAttribute('aria-hidden','false');
    dScroll.style.scrollBehavior='auto';dScroll.scrollTop=0;dScroll.style.scrollBehavior='';
    layoutComments();$('#rcScroll').scrollTop=0;
    if(mode==='comments')setTimeout(scrollToComments,380);
  }
  function closePost(){
    if(!curArt)return;
    detail.classList.remove('open');detail.setAttribute('aria-hidden','true');
    layoutComments();dInput.blur();
    refreshPreview(curArt);
    curArt=null;
  }
  function startReply(parentId,name){
    replyTo={id:parentId,name:name};
    $('#dReplyText').innerHTML='Replying to <b>'+esc(name)+'</b>';
    $('#dReplying').classList.add('show');
    dInput.placeholder='Write a reply...';dInput.focus();
  }
  function cancelReply(){replyTo=null;$('#dReplying').classList.remove('show');dInput.placeholder='Add a comment...'}
  function submitComment(){
    const v=dInput.value.trim();if(!v||!curArt)return;
    const arr=COMMENTS[curId];
    const item={id:++uid,name:'You',av:USER,t:0,likes:0,liked:false,mine:true,text:v,open:false,replies:[]};
    newId=item.id;
    if(replyTo){
      const parent=arr.find(c=>c.id===replyTo.id);
      if(parent){parent.replies.push(item);parent.open=true}
    }else{arr.unshift(item);order.unshift(item.id)}
    const wasReply=!!replyTo;
    dInput.value='';dSend.classList.remove('ready');cancelReply();
    renderList();
    if(wasReply){
      const el=$('[data-id="'+item.id+'"]',dList);if(el)el.scrollIntoView({block:'center',behavior:'smooth'});
    }else{
      scrollToComments();
    }
    showToast(wasReply?'Reply posted 💬':'Comment posted 🎉');
  }

  // feed: tap a post to expand it (buttons keep their own jobs)
  $('#feed').addEventListener('click',e=>{
    if(e.target.closest('.follow,.more,.action.like,.action.share'))return;
    const art=e.target.closest('.post');if(!art)return;
    const toComments=!!e.target.closest('.action.cmt,.pc-row,.pc-all');
    openPost(art,toComments?'comments':'top');
  });
  $('#dBack').addEventListener('click',closePost);
  $('#dMore').addEventListener('click',()=>showToast('More options coming soon'));

  dPost.addEventListener('click',e=>{
    const b=e.target.closest('[data-act]');if(!b)return;
    const act=b.dataset.act;
    if(act==='like'){
      const on=toggleArtLike(curArt);syncDetail();
      if(on){const r=$('i',b).getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2)}
    }else if(act==='cmt'){
      scrollToComments();setTimeout(()=>dInput.focus(),350);
    }else if(act==='share'){showToast('Link copied 🔗')}
    else if(act==='save'){
      const on=curArt.dataset.saved!=='1';curArt.dataset.saved=on?'1':'0';
      b.classList.toggle('on',on);$('i',b).className=on?'fa-solid fa-bookmark':'fa-regular fa-bookmark';
      showToast(on?'Saved to your bookmarks 🔖':'Removed from bookmarks');
    }else if(act==='follow'){
      $('.follow',curArt).click();syncDetail();
    }else if(act==='gprev'||act==='gnext'){
      const g=$('#dGal');g.scrollBy({left:(act==='gnext'?1:-1)*g.clientWidth,behavior:'smooth'});
    }
  });

  dList.addEventListener('click',e=>{
    const heart=e.target.closest('.c-heart');
    if(heart){const c=findC(+heart.dataset.cid);if(c){c.liked=!c.liked;c.likes+=c.liked?1:-1;popId=c.liked?c.id:0;renderList()}return}
    const rep=e.target.closest('.c-reply');
    if(rep){startReply(+rep.dataset.cid,rep.dataset.name);return}
    const tg=e.target.closest('.c-toggle');
    if(tg){const c=findC(+tg.dataset.cid);if(c){c.open=!c.open;renderList()}}
  });
  $('#dSort').addEventListener('click',()=>{
    sortMode=sortMode==='top'?'new':'top';
    $('#dSortLabel').textContent=sortMode==='top'?'Top comments':'Newest first';
    computeOrder();renderList();
  });
  $('#dReplyCancel').addEventListener('click',cancelReply);
  dInput.addEventListener('input',()=>dSend.classList.toggle('ready',!!dInput.value.trim()));
  dInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submitComment()}});
  dSend.addEventListener('click',submitComment);
  $('#dEmojis').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    dInput.value+=b.textContent;dInput.focus();dSend.classList.add('ready');
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&detail.classList.contains('open')&&!viewer.classList.contains('open'))closePost();
  });

  // ===== SEARCH + NOTIFICATIONS (slide down from the top) =====
  const sheets=$$('.sheet'),sSearch=$('#sheetSearch'),sNotif=$('#sheetNotif');
  const sInput=$('#sInput'),sClear=$('#sClear'),sBody=$('#sBody'),nBody=$('#nBody');
  function closeOne(sh){sh.classList.remove('open');sh.setAttribute('aria-hidden','true')}
  function closeSheets(){sheets.forEach(closeOne);sInput.blur()}
  function openSheet(sh){sheets.forEach(x=>{if(x!==sh)closeOne(x)});sh.classList.add('open');sh.setAttribute('aria-hidden','false')}
  $$('[data-close]').forEach(b=>b.addEventListener('click',closeSheets));
  $$('.sh-grab').forEach(g=>{
    let y0=0;
    g.addEventListener('pointerdown',e=>{y0=e.clientY});
    g.addEventListener('pointerup',e=>{if(y0-e.clientY>25)closeSheets()});
    g.addEventListener('click',closeSheets);
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!viewer.classList.contains('open')&&!detail.classList.contains('open'))closeSheets();
  });

  // ---- search ----
  const followed=new Set();
  let sTab='all',TOK=[];
  function loadRecent(){
    try{const v=JSON.parse(localStorage.getItem('ghettoRecent'));if(Array.isArray(v))return v}catch(e){}
    return ['Nyabugogo','Single room','Cheap food'];
  }
  let recent=loadRecent();
  function persistRecent(){try{localStorage.setItem('ghettoRecent',JSON.stringify(recent))}catch(e){}}
  function saveRecent(q){
    q=q.trim();if(!q)return;
    recent=[q].concat(recent.filter(x=>x.toLowerCase()!==q.toLowerCase())).slice(0,6);persistRecent();
  }
  const escRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  function hl(s,toks){
    if(!toks.length)return esc(s);
    const re=new RegExp(toks.map(escRe).join('|'),'ig');
    let out='',last=0,m;
    while((m=re.exec(s))){
      if(!m[0].length){re.lastIndex++;continue}
      out+=esc(s.slice(last,m.index))+'<mark>'+esc(m[0])+'</mark>';last=m.index+m[0].length;
    }
    return out+esc(s.slice(last));
  }
  function postItems(){
    return $$('#feed .post').map(a=>{
      const i=info(a);
      return {id:a.dataset.id,title:i.title,copy:i.copy,name:i.name,role:i.role,meta:i.meta,img:i.photos[0]||''};
    });
  }
  const sec=t=>'<div class="sec-h"><span>'+t+'</span></div>';
  function followBtn(on){return '<button type="button" class="follow'+(on?' on':'')+'">'+(on?'<i class="fa-solid fa-check"></i>Linked':'Link')+'</button>'}
  function personHTML(p){
    return '<div class="sr-person" data-name="'+esc(p.n)+'"><div class="avatar"><img src="'+FACE(AV[p.av])+'" alt="" onerror="this.remove()"></div>'+
      '<div class="sr-main"><b>'+hl(p.n,TOK)+(p.r?' <em>('+esc(p.r)+')</em>':'')+'</b><small>'+hl(p.s,TOK)+'</small></div>'+followBtn(followed.has(p.n))+'</div>';
  }
  function postRowHTML(p){
    return '<div class="sr-post" data-id="'+p.id+'"><div class="sr-thumb">'+(p.img?'<img src="'+p.img+'" alt="" onerror="this.remove()">':'')+'</div>'+
      '<div class="sr-main"><b>'+hl(p.title,TOK)+'</b><p>'+hl(p.copy,TOK)+'</p><small>'+esc(p.name)+' · '+esc(p.meta)+'</small></div></div>';
  }
  function defaultHTML(){
    let h='';
    if(recent.length){
      h+='<div class="sec-h"><span>Recent searches</span><button type="button" class="clear-all">Clear all</button></div><div class="chips">'+
        recent.map(r=>'<span class="chip" data-q="'+esc(r)+'"><i class="fa-solid fa-clock-rotate-left"></i>'+esc(r)+
          '<button type="button" class="chip-x" data-x="'+esc(r)+'" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button></span>').join('')+'</div>';
    }
    h+=sec('Trending in Nyabugogo')+TREND.map((t,i)=>
      '<button type="button" class="trend" data-q="'+esc(t[2])+'"><span class="t-rank">'+(i+1)+'</span><span class="t-main"><b>'+esc(t[0])+'</b><small>'+t[1]+'</small></span><i class="fa-solid fa-arrow-trend-up t-go"></i></button>').join('');
    h+=sec('Suggested for you')+PEOPLE.slice(0,4).map(personHTML).join('');
    return h;
  }
  function renderSearch(){
    const raw=sInput.value.trim();
    sClear.style.display=raw?'grid':'none';
    $('#sTabs').style.display=raw?'flex':'none';
    if(!raw){TOK=[];sBody.innerHTML=defaultHTML();return}
    TOK=raw.toLowerCase().split(/\s+/).filter(Boolean);
    const hit=s=>{const l=s.toLowerCase();return TOK.every(t=>l.indexOf(t)>-1)};
    const people=PEOPLE.filter(p=>hit(p.n+' '+p.r+' '+p.s));
    const posts=postItems().filter(p=>hit(p.title+' '+p.copy+' '+p.name+' '+p.meta));
    const rooms=posts.filter(p=>/room|house|rent|landlord/i.test(p.title+' '+p.copy+' '+p.role));
    $$('#sTabs .tab').forEach(tb=>{
      const k=tb.dataset.tab,n=k==='people'?people.length:k==='posts'?posts.length:k==='rooms'?rooms.length:null;
      $('.tc',tb).textContent=n==null?'':n;tb.classList.toggle('on',k===sTab);
    });
    let h='';
    if(sTab==='all'){
      if(people.length)h+=sec('People')+people.slice(0,3).map(personHTML).join('');
      if(posts.length)h+=sec('Posts')+posts.map(postRowHTML).join('');
    }else if(sTab==='people')h=people.map(personHTML).join('');
    else if(sTab==='posts')h=posts.map(postRowHTML).join('');
    else h=rooms.map(postRowHTML).join('');
    if(!h)h='<div class="d-empty"><div class="s-emoji">🔍</div>No results for “'+esc(raw)+'”<small>Try another keyword or check the spelling.</small></div>';
    sBody.innerHTML=h;
  }
  function openSearch(){
    sInput.value='';sTab='all';renderSearch();openSheet(sSearch);
    setTimeout(()=>sInput.focus(),430);
  }
  $('#searchBtn').addEventListener('click',openSearch);
  sInput.addEventListener('input',renderSearch);
  sInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveRecent(sInput.value);sInput.blur()}});
  sClear.addEventListener('click',()=>{sInput.value='';renderSearch();sInput.focus()});
  $('#sTabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;sTab=b.dataset.tab;renderSearch()});
  sBody.addEventListener('click',e=>{
    const fb=e.target.closest('.follow');
    if(fb){
      const row=fb.closest('.sr-person'),nm=row.dataset.name,on=!followed.has(nm);
      on?followed.add(nm):followed.delete(nm);
      fb.className='follow'+(on?' on':'');fb.innerHTML=on?'<i class="fa-solid fa-check"></i>Linked':'Link';
      showToast(on?'You linked with '+nm+' 🔗':'You unlinked '+nm);
      renderRail();
      return;
    }
    const x=e.target.closest('.chip-x');
    if(x){recent=recent.filter(r=>r!==x.dataset.x);persistRecent();renderSearch();return}
    if(e.target.closest('.clear-all')){recent=[];persistRecent();renderSearch();return}
    const q=e.target.closest('[data-q]');
    if(q){sInput.value=q.dataset.q;sTab='all';renderSearch();sInput.focus();return}
    const pr=e.target.closest('.sr-person');
    if(pr){showToast("Opening "+pr.dataset.name+"'s profile 👤");return}
    const po=e.target.closest('.sr-post');
    if(po){
      saveRecent(sInput.value);
      const art=$('#feed .post[data-id="'+po.dataset.id+'"]');if(art)openPost(art,'top');
    }
  });

  // ---- notifications ----
  let nTab='all',nIdx=0;
  const nFollowed=new Set();
  const unreadCount=()=>NOTIFS.filter(n=>n.unread).length;
  function updateBell(){
    const c=unreadCount(),d=$('#bellDot');
    d.textContent=c;d.style.display=c?'grid':'none';
    const sb=$('#sideBellDot');if(sb){sb.textContent=c;sb.style.display=c?'grid':'none'}
    $('#nUnreadCount').textContent=c||'';
    $('#markAll').disabled=!c;
  }
  function thumbOf(id){
    const a=$('#feed .post[data-id="'+id+'"]');if(!a)return '';
    const i=info(a);return i.photos[0]||'';
  }
  function notifHTML(n){
    let right='';
    if(n.fb)right='<button type="button" class="follow n-follow'+(nFollowed.has(n.id)?' on':'')+'">'+(nFollowed.has(n.id)?'<i class="fa-solid fa-check"></i>Linked':'Link back')+'</button>';
    else if(n.post){const im=thumbOf(n.post);right='<div class="n-thumb">'+(im?'<img src="'+im+'" alt="" onerror="this.remove()">':'')+'</div>'}
    return '<div class="n-item'+(n.unread?' unread':'')+'" data-id="'+n.id+'" style="--i:'+(nIdx++)+'">'+
      '<div class="n-av"><img src="'+FACE(AV[n.av])+'" alt="" onerror="this.remove()"><span class="n-badge t-'+n.t+'"><i class="fa-solid '+ICON[n.t]+'"></i></span></div>'+
      '<div class="n-main"><p>'+n.html+'</p>'+(n.quote?'<span class="n-quote">“'+esc(n.quote)+'”</span>':'')+'<span class="n-time">'+n.time+'</span></div>'+
      right+'<span class="n-dot"></span></div>';
  }
  function renderNotifs(){
    nIdx=0;
    const list=NOTIFS.filter(n=>nTab==='all'||n.unread);
    let h='';
    ['New','Earlier'].forEach(g=>{
      const items=list.filter(n=>n.g===g);
      if(items.length)h+=sec(g)+items.map(notifHTML).join('');
    });
    if(!h)h='<div class="d-empty"><div class="s-emoji">🎉</div>You\'re all caught up<small>New activity will show up here.</small></div>';
    nBody.innerHTML=h;
    $$('#nTabs .tab').forEach(tb=>tb.classList.toggle('on',tb.dataset.tab===nTab));
    updateBell();
  }
  function markRead(n,el){
    if(!n.unread)return;
    n.unread=false;if(el)el.classList.remove('unread');updateBell();
  }
  $('#bellBtn').addEventListener('click',()=>{nTab='all';renderNotifs();nBody.scrollTop=0;openSheet(sNotif)});
  $('#nTabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;nTab=b.dataset.tab;renderNotifs()});
  $('#markAll').addEventListener('click',()=>{
    NOTIFS.forEach(n=>n.unread=false);
    $$('#nBody .n-item').forEach(el=>el.classList.remove('unread'));
    updateBell();showToast('All caught up ✅');
    if(nTab==='unread')setTimeout(renderNotifs,350);
  });
  nBody.addEventListener('click',e=>{
    const el=e.target.closest('.n-item');if(!el)return;
    const n=NOTIFS.find(x=>x.id===el.dataset.id);if(!n)return;
    const fb=e.target.closest('.n-follow');
    if(fb){
      const on=!nFollowed.has(n.id);on?nFollowed.add(n.id):nFollowed.delete(n.id);
      fb.className='follow n-follow'+(on?' on':'');fb.innerHTML=on?'<i class="fa-solid fa-check"></i>Linked':'Link back';
      showToast(on?'You linked with '+n.name+' 🔗':'You unlinked '+n.name);
      markRead(n,el);return;
    }
    markRead(n,el);
    if(n.post){const art=$('#feed .post[data-id="'+n.post+'"]');if(art)openPost(art,n.cm?'comments':'top')}
    else if(n.name)showToast("Opening "+n.name+"'s profile 👤");
  });
  updateBell();

  // ===== DESKTOP: sidebar, right rail, story dismiss =====
  const NAVS=$$('.nav-item');
  function syncSide(){
    ['home','rooms','community','profile'].forEach(pg=>{
      const nav=NAVS.find(n=>n.textContent.trim().toLowerCase()===pg),s=$('.s-item[data-page="'+pg+'"]');
      if(nav&&s)s.classList.toggle('active',nav.classList.contains('active'));
    });
  }
  NAVS.forEach(n=>n.addEventListener('click',syncSide));
  function goHome(){
    closeSheets();if(detail.classList.contains('open'))closePost();
    const hn=NAVS.find(n=>n.textContent.trim()==='Home');if(hn)hn.click();
    dScroll.scrollTop=0;$('#scroll').scrollTo({top:0,behavior:'smooth'});
  }
  $('#sBrand').addEventListener('click',goHome);
  $('#side').addEventListener('click',e=>{
    const b=e.target.closest('.s-item');if(!b)return;
    const pg=b.dataset.page;
    if(pg==='home')goHome();
    else if(pg==='search')$('#searchBtn').click();
    else if(pg==='notifications')$('#bellBtn').click();
    else{closeSheets();const nav=NAVS.find(n=>n.textContent.trim().toLowerCase()===pg);if(nav)nav.click()}
  });
  $('#sideCreate').addEventListener('click',e=>{
    const open=!menu.classList.contains('show'),r=e.currentTarget.getBoundingClientRect();
    menu.classList.toggle('show',open);
    if(open){
      menu.style.setProperty('--mx',Math.max(12,r.left+r.width/2-90)+'px');
      menu.style.setProperty('--my',Math.max(12,r.top-72)+'px');
      burst(r.left+r.width/2,r.top,['✨','⭐','🎉']);
    }
  });
  // wheel over the side columns scrolls the feed (like X)
  ['side','rail'].forEach(id=>$('#'+id).addEventListener('wheel',e=>{
    if(e.currentTarget.classList.contains('comments-mode'))return;
    (detail.classList.contains('open')?dScroll:$('#scroll')).scrollTop+=e.deltaY;
  },{passive:true}));
  // desktop: clicking the dimmed area closes the story
  document.addEventListener('click',e=>{
    if(!viewer.classList.contains('open')||!window.matchMedia||!window.matchMedia('(min-width:760px)').matches)return;
    if(e.target.closest('#viewer,.story'))return;
    closeStory();
  });

  // right rail
  function railPerson(p){
    return '<div class="sr-person" data-name="'+esc(p.n)+'"><div class="avatar"><img src="'+FACE(AV[p.av])+'" alt="" onerror="this.remove()"></div>'+
      '<div class="sr-main"><b>'+esc(p.n)+(p.r?' <em>('+esc(p.r)+')</em>':'')+'</b><small>'+esc(p.s)+'</small></div>'+followBtn(followed.has(p.n))+'</div>';
  }
  function renderRail(){
    $('#rTrend').innerHTML='<h3>Trending in Nyabugogo</h3>'+TREND.slice(0,4).map((t,i)=>
      '<button type="button" class="trend" data-q="'+esc(t[2])+'"><span class="t-main"><small>'+(i+1)+' · Trending</small><b>'+esc(t[0])+'</b><small>'+t[1]+'</small></span><i class="fa-solid fa-arrow-trend-up t-go"></i></button>').join('')+
      '<button type="button" class="r-more">Show more</button>';
    $('#rPeople').innerHTML='<h3>Who to link with</h3>'+PEOPLE.slice(0,3).map(railPerson).join('')+'<button type="button" class="r-more">Show more</button>';
  }
  function searchFor(q){openSearch();if(q){sInput.value=q;sTab='all';renderSearch()}}
  $('#rSearch').addEventListener('focus',()=>{openSearch();$('#rSearch').blur()});
  $('#rSearch').addEventListener('click',openSearch);
  $('#rail').addEventListener('click',e=>{
    const fb=e.target.closest('.follow');
    if(fb){
      const nm=fb.closest('.sr-person').dataset.name,on=!followed.has(nm);
      on?followed.add(nm):followed.delete(nm);
      showToast(on?'You linked with '+nm+' 🔗':'You unlinked '+nm);
      renderRail();if(sSearch.classList.contains('open'))renderSearch();return;
    }
    const tr=e.target.closest('.trend');if(tr){searchFor(tr.dataset.q);return}
    if(e.target.closest('.r-more')){searchFor('');return}
    const pr=e.target.closest('.sr-person');if(pr)showToast("Opening "+pr.dataset.name+"'s profile 👤");
  });
  renderRail();

  // ===== DESKTOP: comments live in the right column while a post is open =====
  const wideMQ=window.matchMedia?window.matchMedia('(min-width:1100px)'):null;
  const isWide=()=>!!(wideMQ&&wideMQ.matches);
  function layoutComments(){
    const toRail=detail.classList.contains('open')&&isWide();
    const head=$('#dChead'),list=$('#dList'),end=$('.d-end'),comp=$('.d-composer'),rail=$('#rail');
    if(toRail){
      $('#rcHead').appendChild(head);$('#rcScroll').appendChild(list);$('#rcScroll').appendChild(end);$('#rComments').appendChild(comp);
    }else{
      dScroll.appendChild(head);dScroll.appendChild(list);dScroll.appendChild(end);detail.appendChild(comp);
    }
    rail.classList.toggle('comments-mode',toRail);
  }
  function scrollToComments(){
    if(isWide())$('#rcScroll').scrollTo({top:0,behavior:'smooth'});
    else dScroll.scrollTo({top:$('#dChead').offsetTop-8,behavior:'smooth'});
  }
  if(wideMQ){
    if(wideMQ.addEventListener)wideMQ.addEventListener('change',layoutComments);
    else if(wideMQ.addListener)wideMQ.addListener(layoutComments);
  }
}
