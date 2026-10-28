// @ts-nocheck
/*
 * Client-side behaviour for the Ghetto home page (stories viewer, post detail + comments,
 * search / notification sheets, desktop right rail ...). It is the original script from the
 * HTML version, now an ES module that runs once the React markup is on the page.
 * All content comes from Supabase (DATA = public.get_app_data()); every change is saved back through RPC calls (lib/supabase.ts).
 */
import { RFAC, RTYPES, RTYPE, ICON, POOL } from './constants';
import { rpc, supabase, signOut } from './supabase';
import { metaOf } from './format';

export function initGhetto(DATA, INITIAL_PROFILE, INITIAL_SETTINGS) {
  if (typeof window === 'undefined' || window.__ghettoReady) return;
  window.__ghettoReady = true;

  const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];

  // ---- load-more-on-scroll: one helper for every list (feed, notifications, rooms, profile posts) ----
  // el = the sentinel at the end of the list, root = the scrolling box, can() = is there more, load() = fetch the next page
  function infinite(el,root,can,load){
    let busy=false,wait=0;
    const near=()=>{
      if(!el||!el.offsetParent)return false;
      const r=el.getBoundingClientRect(),b=root.getBoundingClientRect();
      return r.top<b.bottom+500&&r.bottom>b.top-50;
    };
    const run=()=>{
      if(busy||Date.now()<wait||!can()||!near())return;
      busy=true;el.classList.add('busy');
      Promise.resolve(load()).catch(()=>{wait=Date.now()+4000}).finally(()=>{busy=false;el.classList.remove('busy');setTimeout(run,80)});
    };
    if('IntersectionObserver' in window)new IntersectionObserver(run,{root:root,rootMargin:'0px 0px 500px 0px'}).observe(el);
    root.addEventListener('scroll',run,{passive:true});
    return run;
  }

  // ---- data from the database ----
  const ORDER=DATA.stories.map(s=>s.id),STORIES={};
  DATA.stories.forEach(s=>{STORIES[s.id]={name:s.name,time:s.time,slides:s.slides}});
  const COMMENTS=DATA.comments,PEOPLE=DATA.people,TREND=DATA.trending,NOTIFS=DATA.notifications,ROOMS=DATA.rooms,TODAY=DATA.today;
  // comments load when a post is opened (one call per post); until then a post only knows its count + top comment
  const PMETA={},LOADED=new Set(),DETACHED={};
  let feedRun=null,railReady=false; // set once the page is fully wired
  DATA.posts.forEach(p=>{PMETA[p.id]={n:p.cmtCount||0,top:p.top||null}});
  let USER=DATA.me.avatar;
  const ME=DATA.me,HANDLES=DATA.handles||{},SHANDLES=DATA.storyHandles||{};
  HANDLES[ME.id]=ME.handle;
  // who is linked with me (by profile id) + names for toasts
  const LINKED=new Set(),PNAME={};
  PEOPLE.forEach(p=>{PNAME[p.id]=p.n;if(p.linked)LINKED.add(p.id)});
  DATA.posts.forEach(p=>{PNAME[p.author.id]=p.author.name;if(p.author.linked)LINKED.add(p.author.id)});
  NOTIFS.forEach(n=>{if(n.actor){PNAME[n.actor]=n.name;if(n.linked)LINKED.add(n.actor)}});
  const CHK='<i class="fa-solid fa-check"></i>';
  const fail=m=>{showToast(m+' ⚠️')};

  // ---- on-screen keyboard: never leave the page shifted up after the keyboard closes ----
  // Focusing an input makes mobile browsers scroll the page / overlays to reveal it; when the keyboard is
  // dismissed that scroll can stay behind. Put everything back to the top-left once the keyboard goes away.
  const SHIFTABLE='.app,.detail,.rdetail,.sheet,.bsheet,.bs-card,.viewer,.shell';
  function unshift(){
    window.scrollTo(0,0);
    document.documentElement.scrollTop=0;document.body.scrollTop=0;
    $$(SHIFTABLE).forEach(el=>{if(el.scrollTop)el.scrollTop=0;if(el.scrollLeft)el.scrollLeft=0});
  }
  const isField=el=>!!el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA');
  document.addEventListener('focusout',e=>{
    if(isField(e.target)){[0,120,350,700].forEach(ms=>setTimeout(()=>{if(!isField(document.activeElement))unshift()},ms))}
  });
  if(window.visualViewport){
    const vv=window.visualViewport;
    let last=vv.height;
    vv.addEventListener('resize',()=>{
      // keyboard closed (viewport grew back) or the browser moved the layout: realign
      if(vv.height>last+40||!isField(document.activeElement))unshift();
      last=vv.height;
    });
    vv.addEventListener('scroll',()=>{if(!isField(document.activeElement))unshift()});
  }

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

  // likes / share / link buttons on feed posts are handled by one delegated listener on #feed (see below)

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


  // link / unlink: one place keeps the feed, search, rail and notifications in sync and saves it
  function paintLinks(pid){
    const on=LINKED.has(pid);
    $$('.post[data-author="'+pid+'"] .follow,.sr-person[data-pid="'+pid+'"] .follow,.pf-follow[data-pid="'+pid+'"]').forEach(b=>{b.classList.toggle('on',on);b.innerHTML=on?CHK+'Linked':'Link'});
    $$('.n-follow[data-pid="'+pid+'"]').forEach(b=>{b.classList.toggle('on',on);b.innerHTML=on?CHK+'Linked':'Link back'});
    if(typeof curArt!=='undefined'&&curArt)syncDetail();
  }
  function toggleLink(pid){
    if(!pid||pid===ME.id)return;
    const name=(PNAME[pid]||'them').split(' ')[0],on=!LINKED.has(pid);
    on?LINKED.add(pid):LINKED.delete(pid);paintLinks(pid);bumpStats(pid,on);
    showToast(on?'You linked with '+name+' 🔗':'You unlinked '+name);
    rpc('toggle_link',{p_profile:pid}).catch(()=>{on?LINKED.delete(pid):LINKED.add(pid);paintLinks(pid);bumpStats(pid,!on);fail('Could not save that')});
  }

  // nav
  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>{
    const l=b.textContent.trim();
    if(l==='Home'||l==='Rooms'){const pg=l.toLowerCase();setPage(pg);try{history.pushState(null,'',pg==='rooms'?'/rooms':'/')}catch(e){}}
    else if(l==='Profile'){openProfile(ME.handle)}
    else showToast(l+' page coming soon 🚧');
  }));

  // fab
  const fab=$('#fab'),menu=$('#fabMenu');
  fab.addEventListener('click',()=>{
    fab.classList.toggle('open');menu.classList.toggle('show');
    if(fab.classList.contains('open')){const r=fab.getBoundingClientRect();burst(r.left+r.width/2,r.top,['✨','⭐','🎉'])}
  });
  $$('button',menu).forEach(b=>b.addEventListener('click',()=>{
    fab.classList.remove('open');menu.classList.remove('show');
    if(b.dataset.act==='compose'){openCompose();return}
    showToast(b.dataset.msg);
  }));
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
  const ago=t=>t<1?'Just now':t<60?t+'m':t<1440?Math.floor(t/60)+'h':Math.floor(t/1440)+'d';
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const totalOf=id=>COMMENTS[id].reduce((s,c)=>s+1+c.replies.length,0);
  const plural=n=>n+' comment'+(n===1?'':'s');

  // ---- feed: ids, counters and the one-line most-liked comment ----
  // a post can be on screen twice (feed + profile list); keep both copies identical
  function mirror(art){
    $$('.post[data-id="'+art.dataset.id+'"]').forEach(t=>{
      if(t===art)return;
      [['.post-actions','innerHTML'],['.pc','innerHTML']].forEach(k=>{const a=$(k[0],art),b=$(k[0],t);if(a&&b)b.innerHTML=a.innerHTML});
      const fa=$('.follow',art),fb=$('.follow',t);if(fa&&fb){fb.className=fa.className;fb.innerHTML=fa.innerHTML}
    });
  }
  function refreshPreview(art){refreshPreview0(art);mirror(art)}
  function refreshPreview0(art){
    const id=art.dataset.id,pc=$('.pc',art);
    let n,top;
    if(LOADED.has(id)){
      const arr=COMMENTS[id];n=totalOf(id);
      top=arr.length?arr.reduce((m,c)=>c.likes>m.likes?c:m,arr[0]):null;
    }else{const m=PMETA[id]||{n:0,top:null};n=m.n;top=m.top}
    const cs=$('.action.cmt span',art);if(cs)cs.textContent=n;
    if(!n||!top){pc.innerHTML='<button class="pc-all" type="button">Be the first to comment</button>';return}
    pc.innerHTML='<button class="pc-row" type="button"><span class="pc-av"><img src="'+FACE(top.av)+'" alt="" onerror="this.remove()"></span>'+
      '<span class="pc-text"><b>'+esc(top.name)+'</b>'+esc(top.text)+'</span>'+
      '<span class="pc-like"><i class="fa-solid fa-heart"></i>'+top.likes+'</span></button>'+
      '<button class="pc-all" type="button">View all '+plural(n)+'</button>';
  }
  function setupPost(a){
    const pc=document.createElement('div');pc.className='pc';a.appendChild(pc);
    refreshPreview(a);
  }
  function ensureComments(id){
    if(LOADED.has(id))return Promise.resolve();
    return rpc('get_comments',{p_post:id}).then(arr=>{COMMENTS[id]=arr||[];LOADED.add(id)});
  }
  $$('#feed .post').forEach(setupPost);

  // ---- detail view ----
  const detail=$('#detail'),dScroll=$('#dScroll'),dPost=$('#dPost'),dList=$('#dList'),dInput=$('#dInput'),dSend=$('#dSend');
  let curArt=null,curId=null,order=[],sortMode='top',replyTo=null,newId=0,popId=0,uid=0;

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
    const total=LOADED.has(curId)?totalOf(curId):(PMETA[curId]?PMETA[curId].n:0);
    $('#dCmtTxt').textContent=plural(total);$('#dCount').textContent=total;
  }

  function toggleArtLike(art){
    const b=$('.action.like',art),icon=$('i',b),num=$('span',b),base=+b.dataset.count;
    const on=b.classList.toggle('on');
    icon.className=on?'fa-solid fa-heart':'fa-regular fa-heart';
    num.textContent=on?base+1:base;
    return on;
  }

  function likeArt(art){
    const on=toggleArtLike(art);mirror(art);
    rpc('toggle_post_like',{p_post:art.dataset.id}).catch(()=>{toggleArtLike(art);mirror(art);if(curArt===art)syncDetail();fail('Could not save your like')});
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
    const pid=curId;
    if(!LOADED.has(pid))COMMENTS[pid]=[];
    buildPost(art);
    if(LOADED.has(pid)){computeOrder();renderList()}
    else{
      order=[];
      dList.innerHTML='<div class="d-empty">Loading comments…</div>';
      ensureComments(pid).then(()=>{
        if(curId!==pid||!curArt)return;
        computeOrder();renderList();syncDetail();layoutComments();
        if(mode==='comments')setTimeout(scrollToComments,150);
      }).catch(()=>{if(curId===pid)dList.innerHTML='<div class="d-empty">Could not load comments<small>Close this post and open it again.</small></div>'});
    }
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
    if(parentId<0){showToast('Still sending… try again in a second');return}
    replyTo={id:parentId,name:name};
    $('#dReplyText').innerHTML='Replying to <b>'+esc(name)+'</b>';
    $('#dReplying').classList.add('show');
    dInput.placeholder='Write a reply...';dInput.focus();
  }
  function cancelReply(){replyTo=null;$('#dReplying').classList.remove('show');dInput.placeholder='Add a comment...'}
  function submitComment(){
    const v=dInput.value.trim();if(!v||!curArt)return;
    if(!LOADED.has(curId)){showToast('Loading comments… try again in a second');return}
    const postId=curId,arr=COMMENTS[postId],parentId=replyTo?replyTo.id:null;
    const item={id:-(++uid),name:'You',av:USER,t:0,likes:0,liked:false,mine:true,text:v,open:false,replies:[]};
    const tmp=item.id;newId=tmp;
    let parent=null;
    if(parentId!==null){
      parent=arr.find(c=>c.id===parentId);
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
    // save it; swap the temporary id for the real one
    rpc('add_comment',{p_post:postId,p_parent:parentId,p_body:v}).then(r=>{
      item.id=r.id;const ix=order.indexOf(tmp);if(ix>-1)order[ix]=r.id;
      if(curArt&&curId===postId)renderList();
    }).catch(()=>{
      const k=arr.indexOf(item);if(k>-1)arr.splice(k,1);
      if(parent)parent.replies=parent.replies.filter(x=>x!==item);
      order=order.filter(x=>x!==tmp);
      if(curArt&&curId===postId)renderList();else if(curArt)refreshPreview(curArt);
      fail('Your comment was not saved');
    });
  }

  // feed: tap a post to expand it (buttons keep their own jobs)
  function feedClick(e){
    const lk=e.target.closest('.action.like');
    if(lk){
      const on=likeArt(lk.closest('.post'));
      if(on){const r=$('i',lk).getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2)}
      return;
    }
    if(e.target.closest('.action.share')){showToast('Link copied 🔗');return}
    const fb=e.target.closest('.follow');
    if(fb){toggleLink(fb.closest('.post').dataset.author);return}
    const art=e.target.closest('.post');if(!art)return;
    if(e.target.closest('.more')){if(art.dataset.author===ME.id)deletePost(art);return}
    // tap a name or photo -> that person's profile
    if(e.target.closest('.post-head .avatar,.post-head .author,.compact-row .head .avatar,.compact-row .head .author')&&!(curProfile&&curPage==='profile'&&curProfile.id===art.dataset.author)){openProfile(HANDLES[art.dataset.author]);return}
    const toComments=!!e.target.closest('.action.cmt,.pc-row,.pc-all');
    openPost(art,toComments?'comments':'top');
  }
  $('#feed').addEventListener('click',feedClick);
  $('#dBack').addEventListener('click',closePost);
  $('#dMore').addEventListener('click',()=>{if(curArt&&curArt.dataset.author===ME.id)deletePost(curArt);else showToast('More options coming soon')});

  dPost.addEventListener('click',e=>{
    const b=e.target.closest('[data-act]');if(!b)return;
    const act=b.dataset.act;
    if(act==='like'){
      const on=likeArt(curArt);syncDetail();
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
    if(heart){
      const c=findC(+heart.dataset.cid);
      if(c){
        if(c.id<0){showToast('Still sending… try again in a second');return}
        const flip=()=>{c.liked=!c.liked;c.likes+=c.liked?1:-1};
        flip();popId=c.liked?c.id:0;renderList();
        rpc('toggle_comment_like',{p_comment:c.id}).catch(()=>{flip();popId=0;if(curArt)renderList();fail('Could not save your like')});
      }
      return;
    }
    const who=e.target.closest('.c-av,.c-bubble b');
    if(who){const ci=who.closest('.c-item'),c=ci&&findC(+ci.dataset.id),h=c&&(c.mine?ME.handle:HANDLES[c.pid]);if(h){closePost();openProfile(h)}return}
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
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!viewer.classList.contains('open')&&!detail.classList.contains('open'))closeSheets();
  });

  // ---- search ----
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
    return '<div class="sr-person" data-pid="'+p.id+'" data-name="'+esc(p.n)+'"><div class="avatar"><img src="'+FACE(p.av)+'" alt="" onerror="this.remove()"></div>'+
      '<div class="sr-main"><b>'+hl(p.n,TOK)+(p.r?' <em>('+esc(p.r)+')</em>':'')+'</b><small>'+hl(p.s,TOK)+'</small></div>'+followBtn(LINKED.has(p.id))+'</div>';
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
    const rrooms=ROOMS.filter(r=>hit(r.title+' '+r.area+' '+RTYPE[r.type]+' '+r.fac.map(f=>RFAC[f][0]).join(' ')+' '+r.ll.name));
    $$('#sTabs .tab').forEach(tb=>{
      const k=tb.dataset.tab,n=k==='people'?people.length:k==='posts'?posts.length:k==='rooms'?(rrooms.length+rooms.length):null;
      $('.tc',tb).textContent=n==null?'':n;tb.classList.toggle('on',k===sTab);
    });
    let h='';
    if(sTab==='all'){
      if(people.length)h+=sec('People')+people.slice(0,3).map(personHTML).join('');
      if(rrooms.length)h+=sec('Rooms')+rrooms.slice(0,3).map(roomRowHTML).join('');
      if(posts.length)h+=sec('Posts')+posts.map(postRowHTML).join('');
    }else if(sTab==='people')h=people.map(personHTML).join('');
    else if(sTab==='posts')h=posts.map(postRowHTML).join('');
    else h=rrooms.map(roomRowHTML).join('')+(rooms.length?sec('Posts about rooms')+rooms.map(postRowHTML).join(''):'');
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
      toggleLink(fb.closest('.sr-person').dataset.pid);
      return;
    }
    const x=e.target.closest('.chip-x');
    if(x){recent=recent.filter(r=>r!==x.dataset.x);persistRecent();renderSearch();return}
    if(e.target.closest('.clear-all')){recent=[];persistRecent();renderSearch();return}
    const q=e.target.closest('[data-q]');
    if(q){sInput.value=q.dataset.q;sTab='all';renderSearch();sInput.focus();return}
    const pr=e.target.closest('.sr-person');
    if(pr){openProfile(HANDLES[pr.dataset.pid]);return}
    const rr=e.target.closest('.sr-room');
    if(rr){saveRecent(sInput.value);openRoom(rr.dataset.room);return}
    const po=e.target.closest('.sr-post');
    if(po){
      saveRecent(sInput.value);
      const art=$('#feed .post[data-id="'+po.dataset.id+'"]');if(art)openPost(art,'top');
    }
  });

  // ---- notifications ----
  // What people do (like, comment, link, visit, message) is turned into notifications by the database.
  //  - while you are online they arrive one by one (the app asks for anything new every few seconds)
  //  - what happened while you were away comes combined per post ("Aline, Emerson and 3 others liked your post")
  //  - only the first page is loaded; the next pages load when you scroll to the end of the list. No repeats.
  const NSESS=DATA.notifSession,PAGE_N=10;
  let nTab='all',nIdx=0,UNREAD=DATA.notifUnread||0,NMAX=DATA.notifMaxId||0,nPolling=false;
  const NT={
    all:{items:NOTIFS,ids:new Set(NOTIFS.map(n=>n.id)),next:DATA.notifNext||null,done:!DATA.notifNext,busy:false,loaded:true},
    unread:{items:[],ids:new Set(),next:null,done:false,busy:false,loaded:false}
  };
  const nList=$('#nList'),nMore=$('#nMore');
  const unreadCount=()=>UNREAD;
  function updateBell(){
    const c=UNREAD,d=$('#bellDot'),t=c>99?'99+':c;
    d.textContent=t;d.style.display=c?'grid':'none';
    const sb=$('#sideBellDot');if(sb){sb.textContent=t;sb.style.display=c?'grid':'none'}
    $('#nUnreadCount').textContent=c||'';
    $('#markAll').disabled=!c;
  }
  function notifHTML(n){
    let right='';
    if(n.fb)right='<button type="button" class="follow n-follow'+(LINKED.has(n.actor)?' on':'')+'" data-pid="'+n.actor+'">'+(LINKED.has(n.actor)?CHK+'Linked':'Link back')+'</button>';
    else if(n.post){right='<div class="n-thumb">'+(n.photo?'<img src="'+rimg(n.photo,120,120)+'" alt="" onerror="this.remove()">':'')+'</div>'}
    return '<div class="n-item'+(n.unread?' unread':'')+(n.count>1?' grouped':'')+'" data-id="'+n.id+'" style="--i:'+(Math.min(nIdx++,12))+'">'+
      '<div class="n-av"><img src="'+FACE(n.av)+'" alt="" onerror="this.remove()"><span class="n-badge t-'+n.t+'"><i class="fa-solid '+ICON[n.t]+'"></i></span></div>'+
      '<div class="n-main"><p>'+n.html+'</p>'+(n.quote?'<span class="n-quote">“'+esc(n.quote)+'”</span>':'')+'<span class="n-time">'+n.time+'</span></div>'+
      right+'<span class="n-dot"></span></div>';
  }
  const nEmpty=()=>'<div class="d-empty"><div class="s-emoji">'+(nTab==='unread'?'🎉':'🔔')+'</div>'+(nTab==='unread'?'You\'re all caught up':'No notifications yet')+'<small>'+(nTab==='unread'?'New activity will show up here.':'When people like, comment or link with you, you will see it here.')+'</small></div>';
  function paintNMore(){
    const t=NT[nTab];
    nMore.hidden=t.done&&!t.busy;
    nMore.classList.toggle('busy',t.busy);
  }
  function renderNotifs(){
    nIdx=0;
    const t=NT[nTab];
    nList.innerHTML=t.items.length?t.items.map(notifHTML).join(''):(t.done?nEmpty():'');
    $$('#nTabs .tab').forEach(tb=>tb.classList.toggle('on',tb.dataset.tab===nTab));
    updateBell();paintNMore();
  }
  // next page of the open tab (all = everything, unread = only the unread ones)
  function loadNotifs(tab){
    const t=NT[tab];
    if(t.busy||t.done)return Promise.resolve();
    t.busy=true;if(tab===nTab)paintNMore();
    const cur=t.next;
    return rpc('get_notifications',{p_limit:PAGE_N,p_ts:cur?cur.ts:null,p_id:cur?cur.id:null,p_unread:tab==='unread',p_session:NSESS}).then(r=>{
      const add=r.items.filter(n=>!t.ids.has(n.id));
      add.forEach(n=>{t.ids.add(n.id);if(n.actor){PNAME[n.actor]=n.name;if(n.linked)LINKED.add(n.actor)}});
      t.items.push(...add);t.next=r.next||null;t.done=!r.next;t.loaded=true;
      UNREAD=r.unread;
      if(tab===nTab){
        if(nList.querySelector('.d-empty'))nList.innerHTML='';
        nList.insertAdjacentHTML('beforeend',add.map(notifHTML).join(''));
        if(!t.items.length)nList.innerHTML=nEmpty();
      }
      updateBell();
    }).finally(()=>{t.busy=false;if(tab===nTab)paintNMore()});
  }
  const nRun=infinite(nMore,nBody,()=>!NT[nTab].done&&sNotif.classList.contains('open'),()=>loadNotifs(nTab));
  function openNotifs(){
    nTab='all';renderNotifs();nBody.scrollTop=0;openSheet(sNotif);
    setTimeout(nRun,60);
  }
  function setTab(tab){
    nTab=tab;nBody.scrollTop=0;renderNotifs();
    if(!NT[tab].loaded||(!NT[tab].items.length&&!NT[tab].done))loadNotifs(tab).catch(()=>fail('Could not load notifications'));
    else setTimeout(nRun,60);
  }
  function markRead(n,el){
    if(!n.unread)return;
    n.unread=false;
    ['all','unread'].forEach(k=>NT[k].items.forEach(x=>{if(x.id===n.id)x.unread=false}));
    if(el)el.classList.remove('unread');
    UNREAD=Math.max(0,UNREAD-(n.count||1));updateBell();
    rpc('mark_notifications_read',{p_ids:n.ids||[+n.id]}).then(c=>{if(typeof c==='number'){UNREAD=c;updateBell()}}).catch(()=>{});
  }
  $('#bellBtn').addEventListener('click',openNotifs);
  $('#nTabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;setTab(b.dataset.tab)});
  $('#markAll').addEventListener('click',()=>{
    ['all','unread'].forEach(k=>NT[k].items.forEach(n=>n.unread=false));
    UNREAD=0;
    rpc('mark_all_notifications_read').catch(()=>{});
    $$('#nList .n-item').forEach(el=>el.classList.remove('unread'));
    updateBell();showToast('All caught up ✅');
    if(nTab==='unread')setTimeout(()=>{NT.unread.items=[];NT.unread.ids=new Set();NT.unread.next=null;NT.unread.done=true;NT.unread.loaded=true;renderNotifs()},350);
  });
  // a post may not be on the page yet (it is older than what has loaded): fetch just that one
  function openPostById(id,mode){
    let art=$('#feed .post[data-id="'+id+'"]')||DETACHED[id];
    if(art){openPost(art,mode);return}
    rpc('get_post',{p_post:id}).then(p=>{
      if(!p){showToast('That post is no longer available');return}
      art=makePosts([p])[0];setupPost(art);DETACHED[id]=art;openPost(art,mode);
    }).catch(()=>fail('Could not open that post'));
  }
  nBody.addEventListener('click',e=>{
    const el=e.target.closest('.n-item');if(!el)return;
    const n=NT[nTab].items.find(x=>x.id===el.dataset.id);if(!n)return;
    const fb=e.target.closest('.n-follow');
    if(fb){
      toggleLink(n.actor);
      markRead(n,el);return;
    }
    markRead(n,el);
    if(n.post)openPostById(n.post,n.cm?'comments':'top');
    else if(n.actor)openProfile(HANDLES[n.actor]);
  });
  // ---- while the app is open: ask for anything new every few seconds, show each one on its own ----
  const plain=h=>String(h).replace(/<[^>]+>/g,'');
  function pollNotifs(){
    if(nPolling||document.hidden)return;
    nPolling=true;
    rpc('poll_notifications',{p_after:NMAX}).then(r=>{
      NMAX=Math.max(NMAX,r.maxId||0);UNREAD=r.unread;
      const fresh=r.items.filter(n=>!NT.all.ids.has(n.id));
      if(fresh.length){
        fresh.forEach(n=>{n.g='New';if(n.actor){PNAME[n.actor]=n.name;if(n.linked)LINKED.add(n.actor)}});
        NT.all.items.unshift(...fresh);fresh.forEach(n=>NT.all.ids.add(n.id));
        if(NT.unread.loaded){const fu=fresh.filter(n=>n.unread&&!NT.unread.ids.has(n.id));NT.unread.items.unshift(...fu);fu.forEach(n=>NT.unread.ids.add(n.id))}
        if(sNotif.classList.contains('open')){
          const em=nList.querySelector('.d-empty');if(em)nList.innerHTML='';
          const sh=nBody.scrollTop;nIdx=0;
          nList.insertAdjacentHTML('afterbegin',fresh.filter(n=>nTab==='all'||n.unread).map(notifHTML).join(''));
          if(sh>40)nBody.scrollTop=sh; // keep reading where you were
        }
        const first=fresh[0];
        showToast(plain(first.html)+(fresh.length>1?' · +'+(fresh.length-1)+' more':''));
        const bell=$('#bellBtn');bell.classList.remove('ring');void bell.offsetWidth;bell.classList.add('ring');
      }
      updateBell();
    }).catch(()=>{}).finally(()=>{nPolling=false});
  }
  setInterval(pollNotifs,15000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollNotifs()});
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
    else if(pg==='settings')openSettings();
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
    const el=e.currentTarget;
    if(el.id==='rail'&&(el.classList.contains('comments-mode')||el.scrollHeight>el.clientHeight+2))return;
    const target=roomDetail.classList.contains('open')?$('#rdScroll'):detail.classList.contains('open')?dScroll:curPage==='rooms'?$('#rmScroll'):$('#scroll');
    target.scrollTop+=e.deltaY;
  },{passive:true}));
  // desktop: clicking the dimmed area closes the story
  document.addEventListener('click',e=>{
    if(!viewer.classList.contains('open')||!window.matchMedia||!window.matchMedia('(min-width:760px)').matches)return;
    if(e.target.closest('#viewer,.story'))return;
    closeStory();
  });

  // right rail
  function railPerson(p){
    return '<div class="sr-person" data-pid="'+p.id+'" data-name="'+esc(p.n)+'"><div class="avatar"><img src="'+FACE(p.av)+'" alt="" onerror="this.remove()"></div>'+
      '<div class="sr-main"><b>'+esc(p.n)+(p.r?' <em>('+esc(p.r)+')</em>':'')+'</b><small>'+esc(p.s)+'</small></div>'+followBtn(LINKED.has(p.id))+'</div>';
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
      const pr0=fb.closest('.sr-person');if(pr0)toggleLink(pr0.dataset.pid);return;
    }
    const rp=e.target.closest('[data-rp]');
    if(rp){
      if(rp.dataset.rp==='post')openPostById(rp.dataset.id,'top');
      else if(rp.dataset.rp==='room')openRoom(rp.dataset.id);
      else if(rp.dataset.rp==='posts'){pfTab='posts';renderPfList();pfScroll.scrollTo({top:0,behavior:'smooth'})}
      else if(rp.dataset.rp==='rooms'){pfTab='rooms';renderPfList();$('#pfTabs').scrollIntoView({behavior:'smooth',block:'start'})}
      else openLinksSheet(rp.dataset.rp);
      return;
    }
    const tr=e.target.closest('.trend');if(tr){searchFor(tr.dataset.q);return}
    if(e.target.closest('.r-more')){searchFor('');return}
    const pr=e.target.closest('.sr-person');if(pr)openProfile(HANDLES[pr.dataset.pid]);
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
    updateRail();
  }
  function scrollToComments(){
    if(isWide())$('#rcScroll').scrollTo({top:0,behavior:'smooth'});
    else dScroll.scrollTo({top:$('#dChead').offsetTop-8,behavior:'smooth'});
  }
  if(wideMQ){
    if(wideMQ.addEventListener)wideMQ.addEventListener('change',layoutComments);
    else if(wideMQ.addListener)wideMQ.addListener(layoutComments);
  }

  // =====================================================================
  // ROOMS
  // =====================================================================
  const appEl=$('.app'),roomDetail=$('#roomDetail'),filterSheet=$('#filterSheet'),contactSheet=$('#contactSheet'),composeSheet=$('#composeSheet');
  let curPage=(document.querySelector('.app')||{dataset:{}}).dataset.page||'home',curRoom=null;
  const rfmt=n=>n.toLocaleString('en-US');
  const rk=n=>n>=1000?(n/1000)+'k':String(n);
  const dlabel=iso=>new Date(iso+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const rimg=(id,w,h)=>'https://images.unsplash.com/'+id+'?w='+w+'&h='+h+'&fit=crop';
  const availTxt=r=>r.from<=TODAY?'Available now':'From '+dlabel(r.from);
  const F={q:'',type:'all',min:0,max:300000,fac:new Set(),ver:false,date:'',sort:'rec',savedOnly:false};
  const saved=new Set(ROOMS.filter(r=>r.saved).map(r=>r.id));
  // rooms: the first page came with the page; the rest loads when you reach the end of the list
  let ROOMSNEXT=DATA.roomsNext||null,roomsRun=null;
  function loadRooms(){
    if(!ROOMSNEXT)return Promise.resolve();
    const cur=ROOMSNEXT;
    return rpc('get_rooms',{p_limit:6,p_after:cur.after}).then(r=>{
      const have=new Set(ROOMS.map(x=>x.id));
      r.rooms.filter(x=>!have.has(x.id)).forEach(x=>{ROOMS.push(x);if(x.saved)saved.add(x.id)});
      ROOMSNEXT=r.next||null;
      renderRooms(false);
    });
  }
  // some views need every room (a landlord's rooms, your saved rooms): load the rest in a row
  function loadAllRooms(){return ROOMSNEXT?loadRooms().then(loadAllRooms):Promise.resolve()}
  const advCount=()=>((F.min>0||F.max<300000)?1:0)+F.fac.size+(F.ver?1:0)+(F.date?1:0);
  const filtersActive=()=>!!(F.q||F.type!=='all'||F.min>0||F.max<300000||F.fac.size||F.ver||F.date||F.savedOnly);

  function filtered(){
    const toks=F.q.toLowerCase().split(/\s+/).filter(Boolean);
    const list=ROOMS.filter(r=>{
      if(F.type!=='all'&&r.type!==F.type)return false;
      if(r.price<F.min||r.price>F.max)return false;
      for(const f of F.fac)if(r.fac.indexOf(f)<0)return false;
      if(F.ver&&!r.ll.ver)return false;
      if(F.date&&r.from>F.date)return false;
      if(F.savedOnly&&!saved.has(r.id))return false;
      if(toks.length){
        const hay=(r.title+' '+r.area+' '+RTYPE[r.type]+' '+r.fac.map(f=>RFAC[f][0]).join(' ')+' '+r.ll.name).toLowerCase();
        if(!toks.every(x=>hay.indexOf(x)>-1))return false;
      }
      return true;
    });
    if(F.sort==='low')list.sort((a,b)=>a.price-b.price);
    else if(F.sort==='high')list.sort((a,b)=>b.price-a.price);
    else if(F.sort==='near')list.sort((a,b)=>a.km-b.km);
    return list;
  }

  // ---- card builders ----
  function heartBtn(r){const on=saved.has(r.id);return '<button type="button" class="rc-heart'+(on?' on':'')+'" data-heart="'+r.id+'" aria-label="Save room"><i class="'+(on?'fa-solid':'fa-regular')+' fa-heart"></i></button>'}
  function availPill(r){const now=r.from<=TODAY;return '<span class="pill '+(now?'now':'soon')+'"><i class="fa-solid '+(now?'fa-circle-check':'fa-calendar-days')+'"></i>'+availTxt(r)+'</span>'}
  function cardHTML(r,i,anim){
    return '<article class="rcard'+(anim?'':' na')+'" data-room="'+r.id+'" style="--i:'+i+'">'+
      '<div class="rc-media"><img src="'+rimg(r.photos[0],480,400)+'" alt="'+esc(r.title)+'" loading="lazy" onerror="this.remove()">'+
      '<div class="rc-top">'+availPill(r)+heartBtn(r)+'</div></div>'+
      '<div class="rc-body"><div class="rc-line"><div class="rc-price"><b>'+rfmt(r.price)+'</b><small>RWF/mo</small></div>'+
      '<div class="rc-rate"><i class="fa-solid fa-star"></i>'+r.rate+'</div></div>'+
      '<h3 class="rc-title">'+esc(r.title)+(r.ll.ver?'<i class="fa-solid fa-circle-check rc-ver" title="Verified landlord"></i>':'')+'</h3>'+
      '<div class="rc-loc"><i class="fa-solid fa-location-dot"></i>'+esc(r.area)+' · '+r.km+' km</div></div></article>';
  }
  function featHTML(r,cls){
    return '<article class="fcard'+(cls||'')+'" data-room="'+r.id+'"><img src="'+rimg(r.photos[0],600,420)+'" alt="" loading="lazy" onerror="this.remove()">'+
      '<div class="fc-top">'+availPill(r)+'<span class="fc-rate"><i class="fa-solid fa-star"></i>'+r.rate+'</span>'+heartBtn(r)+'</div><div class="fc-info"><b>'+esc(r.title)+'</b>'+
      '<span><i class="fa-solid fa-location-dot"></i>'+esc(r.area)+'</span><strong>'+rfmt(r.price)+' RWF <small>/ month</small></strong></div></article>';
  }
  function roomRowHTML(r){
    return '<div class="sr-post sr-room" data-room="'+r.id+'"><div class="sr-thumb"><img src="'+rimg(r.photos[0],160,160)+'" alt="" onerror="this.remove()"></div>'+
      '<div class="sr-main"><b>'+hl(r.title,TOK)+'</b><p>'+hl(RTYPE[r.type]+' · '+r.area+' · '+rfmt(r.price)+' RWF / month',TOK)+'</p><small>'+esc(r.ll.name)+' · '+availTxt(r)+'</small></div></div>';
  }

  // ---- list page ----
  function renderChips(){
    $('#rmChips').innerHTML=RTYPES.map(tp=>'<button type="button" class="rm-chip'+(!F.savedOnly&&F.type===tp[0]?' on':'')+'" data-type="'+tp[0]+'"><i class="fa-solid '+tp[2]+'"></i>'+tp[1]+'</button>').join('')+
      '<button type="button" class="rm-chip'+(F.savedOnly?' on':'')+'" data-saved="1"><i class="'+(F.savedOnly?'fa-solid':'fa-regular')+' fa-heart"></i>Saved'+(saved.size?'<span class="n">'+saved.size+'</span>':'')+'</button>';
  }
  function activeChips(){
    const a=[];
    if(F.q)a.push(['q','“'+F.q+'”']);
    if(F.type!=='all')a.push(['type',RTYPE[F.type]]);
    if(F.min>0&&F.max<300000)a.push(['price',rk(F.min)+' – '+rk(F.max)+' RWF']);
    else if(F.max<300000)a.push(['price','Under '+rk(F.max)+' RWF']);
    else if(F.min>0)a.push(['price','From '+rk(F.min)+' RWF']);
    F.fac.forEach(f=>a.push(['fac:'+f,RFAC[f][0]]));
    if(F.ver)a.push(['ver','Verified only']);
    if(F.date)a.push(['date','Move in by '+dlabel(F.date)]);
    if(F.savedOnly)a.push(['saved','Saved only']);
    return a;
  }
  function syncPanel(n){
    $('#pMinR').value=F.min;$('#pMaxR').value=F.max;
    $('#pMinTxt').textContent=rfmt(F.min);$('#pMaxTxt').textContent=F.max>=300000?'300,000+':rfmt(F.max);
    const fl=$('#dFill');fl.style.left=(F.min/3000)+'%';fl.style.right=(100-F.max/3000)+'%';
    $('#pMinR').style.zIndex=F.min>150000?4:2;$('#pMaxR').style.zIndex=3;
    $('#fpTypes').innerHTML=RTYPES.map(tp=>'<button type="button" class="fp-chip'+(F.type===tp[0]?' on':'')+'" data-type="'+tp[0]+'">'+tp[1]+'</button>').join('');
    $('#fpFac').innerHTML=Object.keys(RFAC).map(k=>'<button type="button" class="ft'+(F.fac.has(k)?' on':'')+'" data-fac="'+k+'"><i class="fa-solid '+RFAC[k][1]+'"></i>'+RFAC[k][0]+'</button>').join('');
    const dv=$('#fpDate');if(dv.value!==F.date)dv.value=F.date;
    const sw=$('#fpVerified');sw.classList.toggle('on',F.ver);sw.setAttribute('aria-checked',String(F.ver));
    $('#fpApply').textContent=n===0?'No rooms match':'Show '+n+' room'+(n===1?'':'s');
    $$('.fp-presets button').forEach(b=>b.classList.toggle('on',+b.dataset.min===F.min&&+b.dataset.max===F.max));
  }
  function renderSaved(){
    const items=ROOMS.filter(r=>saved.has(r.id));
    $('#rSaved').innerHTML='<h3>Saved rooms'+(items.length?'<span class="cnt">'+items.length+'</span>':'')+'</h3>'+
      (items.length?items.map(r=>'<div class="sv" data-room="'+r.id+'"><div class="sv-img"><img src="'+rimg(r.photos[0],120,120)+'" alt="" onerror="this.remove()"></div>'+
        '<div class="sv-t"><b>'+esc(r.title)+'</b><small>'+rfmt(r.price)+' RWF / month · '+esc(r.area)+'</small></div><i class="fa-solid fa-chevron-right"></i></div>').join('')
        :'<p class="sv-empty">Tap the <i class="fa-regular fa-heart"></i> on any room to keep it here.</p>');
  }
  function renderRooms(anim){
    if(anim===undefined)anim=true;
    const list=filtered(),active=filtersActive();
    renderChips();
    $('#rmFeatWrap').hidden=active;
    if(!active&&!$('#rmFeat').children.length)$('#rmFeat').innerHTML=ROOMS.slice().sort((a,b)=>b.rate-a.rate||a.km-b.km).slice(0,4).map(r=>featHTML(r)).join('');
    $('#rmCount').innerHTML='<b>'+list.length+'</b> '+(list.length===1?'room':'rooms')+' <small>near Nyabugogo</small>';
    const ac=activeChips();
    $('#rmActive').innerHTML=ac.length?ac.map(c=>'<span class="af">'+esc(c[1])+'<button type="button" data-k="'+esc(c[0])+'" aria-label="Remove filter"><i class="fa-solid fa-xmark"></i></button></span>').join('')+'<button type="button" class="af-clear">Clear all</button>':'';
    $('#rmGrid').innerHTML=list.map((r,i)=>cardHTML(r,i,anim)).join('');
    $('#rmEmpty').hidden=list.length>0||!!ROOMSNEXT;
    $('#rmMore').hidden=!ROOMSNEXT;
    $('.rm-end').hidden=list.length===0||!!ROOMSNEXT;
    setTimeout(()=>{if(roomsRun)roomsRun()},60);
    const n=advCount(),b=$('#rmFilterCount');b.textContent=n||'';b.style.display=n?'grid':'none';
    $('#rmSearchClear').style.display=F.q?'grid':'none';
    syncPanel(list.length);renderSaved();
  }
  function clearKey(k){
    if(k==='q'){F.q='';$('#rmSearch').value=''}
    else if(k==='type')F.type='all';
    else if(k==='price'){F.min=0;F.max=300000}
    else if(k.indexOf('fac:')===0)F.fac.delete(k.slice(4));
    else if(k==='ver')F.ver=false;
    else if(k==='date')F.date='';
    else if(k==='saved')F.savedOnly=false;
  }
  function resetPanel(){F.type='all';F.min=0;F.max=300000;F.fac.clear();F.ver=false;F.date='';F.savedOnly=false}
  function resetAll(){resetPanel();F.q='';$('#rmSearch').value=''}

  // ---- saving ----
  function syncHearts(id){
    const on=saved.has(id);
    $$('[data-heart="'+id+'"]').forEach(b=>{b.classList.toggle('on',on);const ic=$('i',b);if(ic)ic.className=(on?'fa-solid':'fa-regular')+' fa-heart'});
  }
  function toggleSave(id,btn){
    const on=!saved.has(id);on?saved.add(id):saved.delete(id);
    syncHearts(id);renderChips();renderSaved();
    rpc('toggle_saved_room',{p_room:id}).catch(()=>{
      on?saved.delete(id):saved.add(id);syncHearts(id);renderChips();renderSaved();
      if(F.savedOnly&&curPage==='rooms')renderRooms(false);fail('Could not save that room');
    });
    if(on){const el=btn||$('[data-heart="'+id+'"]');if(el){const r=el.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2)}}
    showToast(on?'Saved to your rooms ❤️':'Removed from saved');
    if(F.savedOnly&&curPage==='rooms')renderRooms(false);
    if(curPage==='profile'&&pfTab==='saved')renderPfList();
  }
  const heartClick=e=>{const h=e.target.closest('[data-heart]');if(h){e.stopPropagation();toggleSave(h.dataset.heart,h);return true}return false};

  // ---- pages + right column ----
  function updateRail(){
    const rail=$('#rail'),wide=isWide();
    const comments=wide&&detail.classList.contains('open');
    const room=wide&&!comments&&roomDetail.classList.contains('open');
    const rooms=wide&&!comments&&!room&&curPage==='rooms';
    rail.classList.toggle('comments-mode',comments);
    rail.classList.toggle('room-mode',room);
    rail.classList.toggle('rooms-mode',rooms);
    rail.classList.toggle('profile-mode',wide&&!comments&&!room&&curPage==='profile');
    rail.classList.toggle('settings-mode',wide&&!comments&&!room&&curPage==='settings');
    if(railReady&&wide&&curPage==='profile')renderRailProfile();
    const host=(wide&&curPage==='rooms')?$('#rfHost'):$('#fsBody'),fp=$('#filterPanel');
    if(fp.parentNode!==host)host.appendChild(fp);
    if(wide)closeBSheet(filterSheet);
  }
  function openBSheet(s){s.classList.add('open');s.setAttribute('aria-hidden','false')}
  function closeBSheet(s){s.classList.remove('open');s.setAttribute('aria-hidden','true')}
  function setPage(pg){
    curPage=pg;appEl.dataset.page=pg;
    closeSheets();closeBSheet(filterSheet);closeBSheet(contactSheet);closeBSheet(composeSheet);closeBSheet(editSheet);closeBSheet(linksSheet);closeBSheet(pwSheet);closeBSheet(logoutSheet);closeBSheet(deleteSheet);
    if(detail.classList.contains('open'))closePost();
    if(roomDetail.classList.contains('open'))closeRoom();
    $$('.nav-item').forEach(n=>n.classList.toggle('active',n.textContent.trim().toLowerCase()===pg));
    syncSide();
    const ss=$('.s-item[data-page="settings"]');if(ss)ss.classList.toggle('active',pg==='settings');
    if(pg==='rooms'){renderRooms(true);$('#rmScroll').scrollTop=0}
    updateRail();
    if(pg==='home'&&feedRun)setTimeout(feedRun,80);
  }

  // ---- room detail ----
  function stars(n){let s='';for(let i=0;i<5;i++)s+='<i class="fa-'+(i<n?'solid':'regular')+' fa-star"></i>';return s}
  function buildRoom(r){
    const ll=r.ll;
    const gal='<div class="rd-gal-wrap"><div class="rd-gal" id="rdGal">'+r.photos.map(id=>'<div class="g-slide"><img src="'+rimg(id,1000,760)+'" alt="'+esc(r.title)+'" onerror="this.remove()"></div>').join('')+'</div>'+
      '<span class="rd-avail">'+availPill(r)+'</span><span class="g-count" id="rdCount">1/'+r.photos.length+'</span>'+
      (r.photos.length>1?'<button class="g-nav prev" data-d="p" aria-label="Previous photo"><i class="fa-solid fa-chevron-left"></i></button><button class="g-nav next" data-d="n" aria-label="Next photo"><i class="fa-solid fa-chevron-right"></i></button><div class="g-dots" id="rdDots">'+r.photos.map((_,k)=>'<i class="'+(k?'':'on')+'"></i>').join('')+'</div>':'')+'</div>';
    const facts=[['Type',RTYPE[r.type]],['Bedrooms',r.beds],['Bathroom',r.bath],['Available',availTxt(r)],['Deposit',r.dep],['Minimum stay',r.min]];
    const revs=(r.reviews||[]).slice(0,3);
    const sim=ROOMS.filter(x=>x.id!==r.id&&(x.type===r.type||x.area===r.area)).slice(0,4);
    $('#rdBody').innerHTML=gal+'<div class="rd-pad">'+
      '<div class="rd-tags"><span class="tag">'+RTYPE[r.type]+'</span>'+(ll.ver?'<span class="tag green">Verified landlord</span>':'')+'</div>'+
      '<h1 class="rd-title">'+esc(r.title)+'</h1>'+
      '<div class="rd-price"><b>'+rfmt(r.price)+' RWF</b><small>/ month</small></div>'+
      '<div class="rd-loc"><i class="fa-solid fa-location-dot"></i>'+esc(r.area)+' · '+r.km+' km from campus<span class="rd-rate"><i class="fa-solid fa-star"></i>'+r.rate+'<small>('+r.rev+' reviews)</small></span></div>'+
      '<h3 class="rd-h">What\'s included</h3><div class="rd-amen">'+r.fac.map(f=>'<div class="am"><i class="fa-solid '+RFAC[f][1]+'"></i>'+RFAC[f][0]+'</div>').join('')+'</div>'+
      '<h3 class="rd-h">About this room</h3><p class="rd-about">'+esc(r.about)+'</p>'+
      '<div class="rd-facts">'+facts.map(f=>'<div class="fact"><small>'+f[0]+'</small><b>'+esc(String(f[1]))+'</b></div>').join('')+'</div>'+
      '<div class="rd-ll"><div class="avatar"><img src="'+FACE(ll.av)+'" alt="" onerror="this.remove()"></div><div><b>'+esc(ll.name)+(ll.ver?' <i class="fa-solid fa-circle-check"></i>':'')+'</b>'+
        '<small>'+(ll.ver?'<span class="ok">Verified Landlord</span> · ':'')+ll.joined+'</small><small>Replies '+ll.reply+'</small></div>'+
        '<button class="btn-ghost rd-msg">Message</button></div>'+
      '<h3 class="rd-h">Gallery</h3><div class="rd-thumbs">'+r.photos.slice(0,4).map((id,k)=>'<div class="th" data-i="'+k+'"><img src="'+rimg(id,240,240)+'" alt="" onerror="this.remove()">'+(k===3&&r.photos.length>4?'<span class="more">+'+(r.photos.length-4)+'</span>':'')+'</div>').join('')+'</div>'+
      '<h3 class="rd-h">Location</h3><div class="rd-map"><span class="rd-pin-ring"></span><i class="fa-solid fa-location-dot rd-pin"></i>'+
        '<a class="rd-open" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(r.area+' Kigali Rwanda')+'"><i class="fa-solid fa-map-location-dot"></i>Open in Maps</a></div>'+
      '<h3 class="rd-h">Reviews</h3><div class="rd-revs">'+(revs.length?revs.map(v=>'<div class="rev"><div class="rev-h"><div class="avatar"><img src="'+FACE(v.av)+'" alt="" onerror="this.remove()"></div><div><b>'+esc(v.name)+'</b><small>'+esc(v.when)+'</small></div><span class="rev-st">'+stars(v.rate)+'</span></div><p>'+esc(v.text)+'</p></div>').join(''):'<p class="rd-about">No reviews yet.</p>')+'</div>'+
      (sim.length?'<h3 class="rd-h">Similar rooms</h3><div class="rm-feat rd-sim">'+sim.map(x=>featHTML(x,' sm')).join('')+'</div>':'')+
      '</div>';
    $('#rdTitleTop').textContent=r.title;
    $('#rdSave').dataset.heart=r.id;syncHearts(r.id);
    $('#rdCtaPrice').innerHTML='<b>'+rfmt(r.price)+' RWF</b><small>per month</small>';
    $('#rRoom').innerHTML='<div class="rr"><div class="rr-price"><b>'+rfmt(r.price)+' RWF</b><small>/ month</small></div>'+
      '<div class="rr-meta">'+availPill(r)+'<span class="rc-rate"><i class="fa-solid fa-star"></i>'+r.rate+'<small>('+r.rev+')</small></span></div>'+
      '<div class="rr-field"><label for="rrDate">Planned move-in date</label><label class="fp-date"><i class="fa-regular fa-calendar"></i><input type="date" id="rrDate" min="'+TODAY+'" value="'+(r.from>TODAY?r.from:TODAY)+'"></label></div>'+
      '<button type="button" class="rr-btn primary rr-visit"><i class="fa-solid fa-calendar-check"></i>Request a visit</button>'+
      '<button type="button" class="rr-btn ghost rr-contact"><i class="fa-regular fa-comment-dots"></i>Message landlord</button>'+
      '<div class="rr-ll"><div class="avatar"><img src="'+FACE(ll.av)+'" alt="" onerror="this.remove()"></div><div><b>'+esc(ll.name)+(ll.ver?' <i class="fa-solid fa-circle-check"></i>':'')+'</b><small>Replies '+ll.reply+'</small></div></div>'+
      '<p class="rr-note"><i class="fa-solid fa-shield-halved"></i>Visit first. Never pay before you have seen the room and met the landlord.</p></div>'+
      '<section class="r-card"><h3>Similar rooms</h3>'+sim.slice(0,3).map(x=>'<div class="sv" data-room="'+x.id+'"><div class="sv-img"><img src="'+rimg(x.photos[0],120,120)+'" alt="" onerror="this.remove()"></div><div class="sv-t"><b>'+esc(x.title)+'</b><small>'+rfmt(x.price)+' RWF / month · '+esc(x.area)+'</small></div><i class="fa-solid fa-chevron-right"></i></div>').join('')+'</section>';
    const g=$('#rdGal');
    if(g&&r.photos.length>1)g.addEventListener('scroll',()=>{
      const k=Math.round(g.scrollLeft/g.clientWidth);
      $('#rdCount').textContent=(k+1)+'/'+r.photos.length;
      $$('#rdDots i').forEach((d,j)=>d.classList.toggle('on',j===k));
    });
  }
  function openRoom(id){
    const r=ROOMS.find(x=>x.id===id);if(!r)return;
    curRoom=r;buildRoom(r);
    roomDetail.classList.add('open');roomDetail.setAttribute('aria-hidden','false');
    const sc=$('#rdScroll');sc.style.scrollBehavior='auto';sc.scrollTop=0;sc.style.scrollBehavior='';
    updateRail();
  }
  function closeRoom(){
    roomDetail.classList.remove('open');roomDetail.setAttribute('aria-hidden','true');
    closeBSheet(contactSheet);updateRail();
  }
  function openContact(r){
    if(!r)return;
    $('#csAv').src=FACE(r.ll.av);
    $('#csName').textContent='Message '+r.ll.name;
    $('#csRoom').textContent=r.title+' · '+rfmt(r.price)+' RWF';
    $('#csMsg').value='Hi '+r.ll.name.split(' ')[0]+', is this room still available?';
    openBSheet(contactSheet);
  }

  // ---- events: rooms list ----
  $('#roomsPage').addEventListener('click',e=>{
    if(heartClick(e))return;
    const chip=e.target.closest('.rm-chip');
    if(chip){
      if(chip.dataset.saved){F.savedOnly=!F.savedOnly}
      else{F.type=chip.dataset.type;F.savedOnly=false}
      renderRooms(true);return;
    }
    const af=e.target.closest('.af button');if(af){clearKey(af.dataset.k);renderRooms(false);return}
    if(e.target.closest('.af-clear,.rm-clear')){resetAll();renderRooms(true);return}
    const card=e.target.closest('[data-room]');if(card)openRoom(card.dataset.room);
  });
  $('#rmSearch').addEventListener('input',e=>{F.q=e.target.value.trim();renderRooms(false)});
  $('#rmSearchClear').addEventListener('click',()=>{F.q='';$('#rmSearch').value='';renderRooms(false);$('#rmSearch').focus()});
  $('#rmSort').addEventListener('change',e=>{F.sort=e.target.value;renderRooms(true)});
  $('#rmFilterBtn').addEventListener('click',()=>openBSheet(filterSheet));

  // ---- events: filter panel ----
  const fpEl=$('#filterPanel');
  function onPrice(e){
    let a=+$('#pMinR').value,b=+$('#pMaxR').value;
    if(a>b){if(e.target.id==='pMinR'){a=b}else{b=a}}
    F.min=a;F.max=b;renderRooms(false);
  }
  $('#pMinR').addEventListener('input',onPrice);$('#pMaxR').addEventListener('input',onPrice);
  fpEl.addEventListener('click',e=>{
    const ty=e.target.closest('.fp-chip');if(ty){F.type=ty.dataset.type;F.savedOnly=false;renderRooms(false);return}
    const fc=e.target.closest('.ft');if(fc){const k=fc.dataset.fac;F.fac.has(k)?F.fac.delete(k):F.fac.add(k);renderRooms(false);return}
    const ps=e.target.closest('.fp-presets button');if(ps){F.min=+ps.dataset.min;F.max=+ps.dataset.max;renderRooms(false);return}
    if(e.target.closest('#fpVerified')){F.ver=!F.ver;renderRooms(false);return}
    if(e.target.closest('#fpReset')){resetPanel();renderRooms(false);showToast('Filters reset');return}
    if(e.target.closest('#fpApply')){closeBSheet(filterSheet);$('#rmScroll').scrollTo({top:0,behavior:'smooth'})}
  });
  $('#fpDate').addEventListener('change',e=>{F.date=e.target.value;renderRooms(false)});
  [filterSheet,contactSheet,composeSheet].forEach(s=>s.addEventListener('click',e=>{if(e.target.closest('.bs-back,.bs-close'))closeBSheet(s)}));

  // ---- events: room detail + right column ----
  $('#rdBack').addEventListener('click',closeRoom);
  $('#rdShare').addEventListener('click',()=>showToast('Link copied 🔗'));
  $('#rdSave').addEventListener('click',e=>{if(curRoom)toggleSave(curRoom.id,e.currentTarget)});
  $('#rdContactBtn').addEventListener('click',()=>openContact(curRoom));
  $('#rdBody').addEventListener('click',e=>{
    if(heartClick(e))return;
    const g=$('#rdGal'),nav=e.target.closest('.g-nav');
    if(nav&&g){g.scrollBy({left:(nav.dataset.d==='n'?1:-1)*g.clientWidth,behavior:'smooth'});return}
    const th=e.target.closest('.th');if(th&&g){g.scrollTo({left:(+th.dataset.i)*g.clientWidth,behavior:'smooth'});$('#rdScroll').scrollTo({top:0,behavior:'smooth'});return}
    if(e.target.closest('.rd-msg')){openContact(curRoom);return}
    if(e.target.closest('.rd-ll')){openProfile(curRoom.llk);return}
    const sim=e.target.closest('.fcard');if(sim)openRoom(sim.dataset.room);
  });
  $('#rRoom').addEventListener('click',e=>{
    if(e.target.closest('.rr-contact')){openContact(curRoom);return}
    if(e.target.closest('.rr-ll')){openProfile(curRoom.llk);return}
    if(e.target.closest('.rr-visit')){
      const d=($('#rrDate')||{}).value||TODAY,room=curRoom,btn=e.target.closest('.rr-visit');
      btn.disabled=true;
      rpc('request_room_visit',{p_room:room.id,p_date:d}).then(()=>showToast('Visit request sent to '+room.ll.name+' 📅'))
        .catch(()=>fail('Could not send your request'))
        .finally(()=>{btn.disabled=false});
      return;
    }
    const sv=e.target.closest('.sv');if(sv)openRoom(sv.dataset.room);
  });
  $('#rSaved').addEventListener('click',e=>{const sv=e.target.closest('.sv');if(sv)openRoom(sv.dataset.room)});

  // ---- events: contact sheet ----
  $('.cs-quick').addEventListener('click',e=>{const b=e.target.closest('button');if(b){$('#csMsg').value=b.dataset.m;$('#csMsg').focus()}});
  $('#csSend').addEventListener('click',()=>{
    const msg=$('#csMsg').value.trim(),room=curRoom,btn=$('#csSend');
    if(!msg){showToast('Write a message first ✍️');return}
    btn.disabled=true;
    rpc('send_room_message',{p_room:room.id,p_body:msg})
      .then(()=>{showToast('Message sent to '+room.ll.name+' 🎉');closeBSheet(contactSheet)})
      .catch(()=>fail('Message not sent'))
      .finally(()=>{btn.disabled=false});
  });
  $('#csCall').addEventListener('click',()=>showToast('Calling '+curRoom.ll.name+' 📞'));
  $('#csWa').addEventListener('click',()=>showToast('Opening WhatsApp 💬'));
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(composeSheet.classList.contains('open')){closeBSheet(composeSheet);return}
    if(contactSheet.classList.contains('open')){closeBSheet(contactSheet);return}
    if(filterSheet.classList.contains('open')){closeBSheet(filterSheet);return}
    if(roomDetail.classList.contains('open')&&!viewer.classList.contains('open'))closeRoom();
  });

  // ---- new post ----
  function openCompose(){
    $('#cpAv').src=FACE(USER);
    ['#cpTitle','#cpBody','#cpLoc'].forEach(k=>{$(k).value=''});
    openBSheet(composeSheet);
    setTimeout(()=>$('#cpTitle').focus(),350);
  }
  function postHTML(p){
    const a=p.author,self=a.id===ME.id?' self':'',link=a.linked?'<button class="follow on'+self+'">'+CHK+'Linked</button>':'<button class="follow'+self+'">Link</button>';
    const acts='<div class="post-actions"><button class="action like'+(p.liked?' on':'')+'" data-count="'+(p.likes-(p.liked?1:0))+'"><i class="'+(p.liked?'fa-solid':'fa-regular')+' fa-heart"></i><span>'+p.likes+'</span></button>'+
      '<button class="action cmt"><i class="fa-regular fa-comment"></i><span>0</span></button><button class="action share"><i class="fa-solid fa-share"></i><span>'+p.shares+'</span></button></div>';
    const attrs=' data-id="'+p.id+'" data-author="'+a.id+'"'+(p.category?' data-category="'+esc(p.category)+'"':'')+' style="animation-delay:0s"';
    const img=(id,size)=>'https://images.unsplash.com/'+id+'?'+size+'&fit=crop';
    if(p.kind==='featured'){
      let grid='';
      if(p.photos.length){
        grid='<div class="photo-grid"><div class="tile main"><img alt="'+esc(p.title)+'" src="'+img(p.photos[0],'w=700&h=500')+'">'+(p.sign?'<span class="sign">'+esc(p.sign)+'</span>':'')+'<span class="photo-count">1/'+(p.photoTotal||p.photos.length)+'</span></div>'+
          (p.photos[1]?'<div class="tile t2"><img alt="" src="'+img(p.photos[1],'w=350&h=250')+'"></div>':'')+
          (p.photos[2]?'<div class="tile t3"><img alt="" src="'+img(p.photos[2],'w=350&h=250')+'">'+(p.moreCount>0?'<div class="more-mask">+'+p.moreCount+'</div>':'')+'</div>':'')+'</div>';
      }
      return '<article class="post featured"'+attrs+'><div class="post-head"><div class="avatar"><img alt="'+esc(a.name)+'" src="'+FACE(a.avatar)+'"></div><div><div class="author">'+esc(a.name)+' '+(a.verified?'<i class="fa-solid fa-circle-check"></i>':'')+'</div>'+
        '<div class="meta">'+esc(metaOf(p))+'</div></div>'+link+'<button class="more" aria-label="More"><i class="fa-solid fa-ellipsis-vertical"></i></button></div>'+
        '<div class="post-title">'+esc(p.title)+(p.subtitle?' <small>'+esc(p.subtitle)+'</small>':'')+'</div><div class="post-copy">'+esc(p.body)+'</div>'+grid+acts+'</article>';
    }
    return '<article class="post compact"'+attrs+'><div class="compact-row"><div class="compact-body"><div class="head"><div class="avatar"><img alt="'+esc(a.name)+'" src="'+FACE(a.avatar)+'"></div>'+
      '<div><div class="author">'+esc(a.name)+' <em>('+esc(a.role)+')</em></div><div class="meta">'+esc(metaOf(p))+(p.tag==='New'?' <span class="tag">New</span>':'')+'</div></div>'+link+'</div>'+
      '<div class="compact-title">'+esc(p.title)+'</div><div class="compact-copy">'+esc(p.body)+'</div></div>'+
      (p.photos[0]?'<div class="thumb"><img alt="'+esc(p.title)+'" src="'+img(p.photos[0],'w=240&h=280')+'"></div>':'')+'</div>'+acts+'</article>';
  }
  // posts from the database -> elements (remembers the people + the comment preview, which setupPost draws)
  function makePosts(list){
    return list.map(p=>{
      PMETA[p.id]={n:p.cmtCount||0,top:p.top||null};
      PNAME[p.author.id]=p.author.name;
      if(p.author.linked)LINKED.add(p.author.id);
      const w=document.createElement('div');w.innerHTML=postHTML(p).trim();
      return w.firstChild;
    });
  }
  // ---- home feed: the first page came with the page, the rest loads as you scroll ----
  let FEEDNEXT=DATA.feedNext||null;
  const feedMore=$('#feedMore'),feedEl=$('#feed');
  const paintFeedMore=()=>{if(feedMore)feedMore.classList.toggle('done',!FEEDNEXT)};
  function loadFeed(){
    if(!FEEDNEXT)return Promise.resolve();
    const cur=FEEDNEXT;
    return rpc('get_feed',{p_limit:8,p_ts:cur.ts,p_id:cur.id}).then(r=>{
      const fresh=r.posts.filter(p=>!feedEl.querySelector('.post[data-id="'+p.id+'"]'));
      makePosts(fresh).forEach(a=>{feedEl.appendChild(a);setupPost(a)});
      FEEDNEXT=r.next||null;paintFeedMore();
    });
  }
  paintFeedMore();
  feedRun=infinite(feedMore,$('#scroll'),()=>!!FEEDNEXT&&curPage==='home',loadFeed);

  $('#cpSend').addEventListener('click',()=>{
    const t=$('#cpTitle').value.trim(),b=$('#cpBody').value.trim(),l=$('#cpLoc').value.trim(),btn=$('#cpSend');
    if(!t||!b){showToast('Add a title and some text ✍️');return}
    btn.disabled=true;
    rpc('create_post',{p_title:t,p_body:b,p_location:l||null}).then(p=>{
      const art=makePosts([p])[0];$('#feed').prepend(art);setupPost(art);
      const pp=curProfile&&curProfile.isMe&&curProfile._pp;
      if(pp){const a2=makePosts([p])[0];const em=$('.pf-empty',pp.el);if(em)em.remove();pp.el.prepend(a2);setupPost(a2)}
      closeBSheet(composeSheet);
      if(curPage!=='home'){setPage('home');try{history.pushState(null,'','/')}catch(e){}}
      $('#scroll').scrollTo({top:0,behavior:'smooth'});
      if(curProfile&&curProfile.isMe){curProfile.posts++;paintStats()}
      showToast('Posted 🎉');
    }).catch(()=>fail('Could not post. Try again')).finally(()=>{btn.disabled=false});
  });

  roomsRun=infinite($('#rmMore'),$('#rmScroll'),()=>!!ROOMSNEXT&&curPage==='rooms',loadRooms);
  renderRooms(false);updateRail();
  // =====================================================================
  // PROFILE PAGE
  // =====================================================================
  const editSheet=$('#editSheet'),linksSheet=$('#linksSheet'),pfBody=$('#pfBody'),pfScroll=$('#pfScroll');
  let curProfile=null,pfTab='posts',navDepth=0,prevPage='home',loadSeq=0,pendingEdit=false;
  const profPath=h=>h===ME.handle?'/profile':'/profile/'+encodeURIComponent(h);
  const roomsOf=p=>ROOMS.filter(r=>r.ll.id===p.id);
  const countTxt=n=>n>=10000?Math.round(n/1000)+'k':n>=1000?(n/1000).toFixed(1).replace('.0','')+'k':String(n);

  function rememberPeople(p){
    HANDLES[p.id]=p.handle;PNAME[p.id]=p.name;
    if(!p.isMe)p.linked?LINKED.add(p.id):LINKED.delete(p.id);
    (p.linksList||[]).concat(p.linkingList||[]).forEach(x=>{HANDLES[x.id]=x.h;PNAME[x.id]=x.n;if(!x.me)x.linked?LINKED.add(x.id):LINKED.delete(x.id)});
  }

  function profileTabs(p){
    const tabs=[['posts','Posts',p.posts]];
    const rooms=roomsOf(p);
    if(rooms.length)tabs.push(['rooms','Rooms',rooms.length]);
    if(p.isMe)tabs.push(['saved','Saved',saved.size]);
    return tabs;
  }
  function renderProfile(){
    const p=curProfile;if(!p)return;
    const tabs=profileTabs(p);if(!tabs.some(t=>t[0]===pfTab))pfTab='posts';
    const actions=p.isMe
      ?'<button type="button" class="pf-btn" data-pf="edit"><i class="fa-solid fa-pen"></i><span>Edit profile</span></button>'
      :'<button type="button" class="follow pf-follow'+(LINKED.has(p.id)?' on':'')+'" data-pid="'+p.id+'">'+(LINKED.has(p.id)?CHK+'Linked':'Link')+'</button>'+
       '<button type="button" class="pf-btn ghost" data-pf="message"><i class="fa-regular fa-comment-dots"></i><span>Message</span></button>';
    const cover=p.cover?' style="background-image:url(\''+rimg(p.cover,1000,500)+'\'),linear-gradient(135deg,#ffd9a0,#ff9b6a 55%,#ffc928)"':'';
    const meta=[];
    if(p.area)meta.push('<span><i class="fa-solid fa-location-dot"></i>'+esc(p.area)+'</span>');
    meta.push('<span><i class="fa-regular fa-calendar"></i>'+esc(p.joined)+'</span>');
    pfBody.innerHTML=
      '<header class="pf-top"><button type="button" class="pf-ico" data-pf="back" aria-label="Back"'+(p.isMe?' hidden':'')+'><i class="fa-solid fa-arrow-left"></i></button>'+
      '<div class="pf-tt"><b>'+esc(p.name)+'</b><small>@'+esc(p.handle)+'</small></div>'+
      '<button type="button" class="pf-ico" data-pf="share" aria-label="Share profile"><i class="fa-solid fa-share-nodes"></i></button>'+
      (p.isMe?'<button type="button" class="pf-ico" data-pf="settings" aria-label="Settings"><i class="fa-solid fa-gear"></i></button>':'')+'</header>'+
      '<div class="pf-cover"'+cover+'></div>'+
      '<div class="pf-card"><div class="pf-avrow"><div class="avatar pf-av"><img src="'+FACE(p.avatar)+'" alt="'+esc(p.name)+'" onerror="this.remove()"></div><div class="pf-actions">'+actions+'</div></div>'+
      '<h1 class="pf-name">'+esc(p.name)+(p.verified?'<i class="fa-solid fa-circle-check"></i>':'')+'</h1>'+
      '<div class="pf-handle">@'+esc(p.handle)+(p.private?' <i class="fa-solid fa-lock" title="Private account"></i>':'')+'<span class="pf-role'+(p.role==='Landlord'?' landlord':'')+'">'+esc(p.role)+'</span></div>'+
      (p.bio?'<p class="pf-bio">'+esc(p.bio)+'</p>':'<p class="pf-bio empty">'+(p.isMe?'Add a bio so people know who you are.':'No bio yet.')+'</p>')+
      '<div class="pf-meta">'+meta.join('')+'</div>'+
      '<div class="pf-stats"><button type="button" data-st="posts"><b id="pfStPosts">'+countTxt(p.posts)+'</b><small>Posts</small></button>'+
      '<button type="button" data-st="links"><b id="pfStLinks">'+countTxt(p.links)+'</b><small>Links</small></button>'+
      '<button type="button" data-st="linking"><b id="pfStLinking">'+countTxt(p.linking)+'</b><small>Linking</small></button></div></div>'+
      '<div class="tabs pf-tabs" id="pfTabs">'+tabs.map(t=>'<button type="button" class="tab'+(t[0]===pfTab?' on':'')+'" data-pt="'+t[0]+'">'+t[1]+'<span class="tc">'+t[2]+'</span></button>').join('')+'</div>'+
      '<div id="pfList"></div>';
    renderPfList();renderRailProfile();
    const mine=p.isMe;
    $$('.nav-item').forEach(n=>{if(n.textContent.trim()==='Profile')n.classList.toggle('active',mine)});
    const si=$('.s-item[data-page="profile"]');if(si)si.classList.toggle('active',mine);
    document.title=(mine?'Profile':p.name)+' — Ghetto';
  }
  function renderPfList(){
    const p=curProfile,list=$('#pfList');if(!p||!list)return;
    $$('#pfTabs .tab').forEach(t=>t.classList.toggle('on',t.dataset.pt===pfTab));
    const sc=$('#pfTabs .tab[data-pt="saved"] .tc');if(sc)sc.textContent=saved.size;
    if(pfTab==='posts'&&p.restricted){
      list.className='feed pf-list';
      list.innerHTML='<div class="pf-empty"><div class="s-emoji">🔒</div><b>This account is private</b>Link with '+esc(p.name.split(' ')[0])+' to see their posts.</div>';
      return;
    }
    if(pfTab==='posts'){
      // the posts of this person load a page at a time and stay in their own box, so switching tabs does not lose your place
      const pp=p._pp||(p._pp={el:document.createElement('div'),next:null,done:false,started:false,busy:false});
      pp.el.className='feed pf-list';list.className='';list.innerHTML='';list.appendChild(pp.el);
      if(!pp.started){pp.started=true;loadPfPosts(p).catch(()=>{pp.started=false;fail('Could not load posts')})}
      else paintPfEmpty(p);
      paintPfMore();
      return;
    }
    if(ROOMSNEXT)loadAllRooms().then(()=>{if(curProfile===p&&pfTab!=='posts')renderPfList()}).catch(()=>{});
    const rooms=pfTab==='rooms'?roomsOf(p):ROOMS.filter(r=>saved.has(r.id));
    list.className='pf-rooms';
    list.innerHTML=rooms.length?'<div class="rm-grid">'+rooms.map((r,i)=>cardHTML(r,i,false)).join('')+'</div>'
      :'<div class="pf-empty"><div class="s-emoji">'+(pfTab==='saved'?'❤️':'🏠')+'</div><b>'+(pfTab==='saved'?'No saved rooms':'No rooms listed')+'</b>'+
       (pfTab==='saved'?'Tap the heart on any room to keep it here.':esc(p.name.split(' ')[0])+' has no rooms listed yet.')+'</div>';
  }
  function paintPfEmpty(p){
    const pp=p._pp;if(!pp)return;
    const em=$('.pf-empty',pp.el);
    if(pp.done&&!pp.el.querySelector('.post')){
      if(!em)pp.el.insertAdjacentHTML('beforeend','<div class="pf-empty"><div class="s-emoji">✍️</div><b>No posts yet</b>'+(p.isMe?'Share a tip, a room or a price with the community.<br><button type="button" class="pf-btn" data-pf="compose"><i class="fa-solid fa-pen"></i><span>Write a post</span></button>':esc(p.name.split(' ')[0])+' has not posted anything yet.')+'</div>');
    }else if(em)em.remove();
  }
  function paintPfMore(){
    const p=curProfile,pp=p&&p._pp,m=$('#pfMore');if(!m)return;
    m.hidden=!(pfTab==='posts'&&pp&&pp.started&&(!pp.done||pp.busy)&&!p.restricted);
  }
  function loadPfPosts(p){
    const pp=p&&p._pp;
    if(!pp||pp.busy||pp.done)return Promise.resolve();
    pp.busy=true;paintPfMore();
    const cur=pp.next;
    return rpc('get_user_posts',{p_profile:p.id,p_limit:8,p_ts:cur?cur.ts:null,p_id:cur?cur.id:null}).then(r=>{
      const fresh=r.posts.filter(x=>!pp.el.querySelector('.post[data-id="'+x.id+'"]'));
      makePosts(fresh).forEach(a=>{a.style.animationDelay='0s';pp.el.appendChild(a);setupPost(a)});
      pp.next=r.next||null;pp.done=!r.next;
      paintPfEmpty(p);renderRailProfile();
    }).finally(()=>{pp.busy=false;paintPfMore()});
  }
  const pfMoreEl=$('#pfMore');
  const pfRun=infinite(pfMoreEl,pfScroll,()=>{const p=curProfile,pp=p&&p._pp;return curPage==='profile'&&pfTab==='posts'&&!!pp&&pp.started&&!pp.done&&!p.restricted},()=>loadPfPosts(curProfile));
  function paintStats(){
    const p=curProfile;if(!p)return;
    const set=(id,v)=>{const el=$(id);if(el)el.textContent=countTxt(v)};
    set('#pfStPosts',p.posts);set('#pfStLinks',p.links);set('#pfStLinking',p.linking);renderRailProfile();
    const t=$('#pfTabs .tab[data-pt="posts"] .tc');if(t)t.textContent=p.posts;
  }
  // linking / unlinking changes the numbers on the open profile
  function bumpStats(pid,on){
    const p=curProfile;if(!p)return;
    const d=on?1:-1;
    if(p.id===pid){p.links=Math.max(0,p.links+d);p.linked=on;
      p.linksList=on?p.linksList.concat([{id:ME.id,h:ME.handle,n:ME.name,av:ME.avatar,r:'',s:ME.role,linked:false,me:true}]):p.linksList.filter(x=>x.id!==ME.id)}
    if(p.isMe)p.linking=Math.max(0,p.linking+d);
    paintStats();
  }

  function showProfile(handle,fresh){
    const seq=++loadSeq;
    if(curPage!=='profile')prevPage=curPage;
    setPage('profile');
    if(!curProfile||curProfile.handle!==handle){pfBody.innerHTML='<div class="d-empty">Loading profile…</div>';pfTab='posts'}
    pfScroll.scrollTop=0;
    return rpc('get_profile',{p_handle:handle===ME.handle?null:handle}).then(p=>{
      if(seq!==loadSeq)return;
      if(!p){showToast('That profile does not exist 🤷');goHomeFromProfile();return}
      rememberPeople(p);curProfile=p;renderProfile();
      if(pendingEdit){pendingEdit=false;if(p.isMe)openEdit()}
    }).catch(()=>{if(seq===loadSeq){fail('Could not load that profile');goHomeFromProfile()}});
  }
  function openProfile(handle){
    if(!handle){showToast('Profile not available');return}
    try{history.pushState(null,'',profPath(handle));navDepth++}catch(e){}
    showProfile(handle);
  }
  function goHomeFromProfile(){setPage('home');try{history.replaceState(null,'','/')}catch(e){}}
  function backFromProfile(){
    if(navDepth>0){history.back();return}
    setPage(prevPage==='profile'?'home':prevPage);try{history.pushState(null,'',prevPage==='rooms'?'/rooms':'/')}catch(e){}
  }

  // ---- desktop: the right column of a profile (about, links, photos, rooms, people to link with) ----
  function renderRailProfile(){
    const box=$('#rProfile'),p=curProfile;
    if(!box)return;
    if(!p||!(isWide()&&curPage==='profile')){return}
    const first=p.name.split(' ')[0];
    let h='';
    // about
    const facts=[];
    if(p.area)facts.push('<li><i class="fa-solid fa-location-dot"></i><span>Lives in <b>'+esc(p.area)+'</b></span></li>');
    facts.push('<li><i class="fa-solid '+(p.role==='Landlord'?'fa-building':'fa-graduation-cap')+'"></i><span>'+esc(p.role)+(p.verified?' · <b class="ok">Verified</b>':'')+'</span></li>');
    facts.push('<li><i class="fa-regular fa-calendar"></i><span>'+esc(p.joined)+'</span></li>');
    if(p.private)facts.push('<li><i class="fa-solid fa-lock"></i><span>Private account</span></li>');
    h+='<section class="r-card r-about"><h3>About '+(p.isMe?'you':esc(first))+'</h3>'+
      (p.bio?'<p class="ra-bio">'+esc(p.bio)+'</p>':'<p class="ra-bio empty">'+(p.isMe?'Add a bio so people know who you are.':'No bio yet.')+'</p>')+
      '<ul class="ra-list">'+facts.join('')+'</ul>'+
      '<div class="ra-stats"><button type="button" data-rp="posts"><b>'+countTxt(p.posts)+'</b><small>Posts</small></button><button type="button" data-rp="links"><b>'+countTxt(p.links)+'</b><small>Links</small></button><button type="button" data-rp="linking"><b>'+countTxt(p.linking)+'</b><small>Linking</small></button></div>'+
      (p.isMe?'<button type="button" class="ra-edit" data-pf="edit"><i class="fa-solid fa-pen"></i>Edit profile</button>':'')+'</section>';
    if(!p.restricted){
      // photos from the posts that have loaded
      const pp=p._pp,imgs=pp?$$('.photo-grid .tile.main img, .thumb img',pp.el).map(i=>({src:i.getAttribute('src'),id:i.closest('.post').dataset.id})).filter(x=>x.src).slice(0,6):[];
      if(imgs.length)h+='<section class="r-card r-photos"><h3>Photos</h3><div class="ra-grid">'+imgs.map(x=>'<button type="button" data-rp="post" data-id="'+x.id+'"><img src="'+x.src.replace(/w=\d+&h=\d+/,'w=240&h=240')+'" alt="" onerror="this.remove()"></button>').join('')+'</div></section>';
      // rooms of a landlord
      const rooms=roomsOf(p).slice(0,3);
      if(rooms.length)h+='<section class="r-card"><h3>Rooms by '+esc(first)+'</h3>'+rooms.map(x=>'<div class="sv" data-rp="room" data-id="'+x.id+'"><div class="sv-img"><img src="'+rimg(x.photos[0],120,120)+'" alt="" onerror="this.remove()"></div><div class="sv-t"><b>'+esc(x.title)+'</b><small>'+rfmt(x.price)+' RWF / month · '+esc(x.area)+'</small></div><i class="fa-solid fa-chevron-right"></i></div>').join('')+
        '<button type="button" class="r-more" data-rp="rooms">See all rooms</button></section>';
      // links
      const ppl=(p.linksList||[]).filter(x=>!x.me).slice(0,4);
      if(ppl.length)h+='<section class="r-card"><h3>Linked with '+(p.isMe?'you':esc(first))+'<span class="cnt">'+countTxt(p.links)+'</span></h3>'+ppl.map(railPerson).join('')+'<button type="button" class="r-more" data-rp="links">See all links</button></section>';
    }
    // who else to link with
    const sug=PEOPLE.filter(x=>x.id!==p.id&&x.id!==ME.id&&!LINKED.has(x.id)).slice(0,3);
    if(sug.length)h+='<section class="r-card"><h3>Who to link with</h3>'+sug.map(railPerson).join('')+'<button type="button" class="r-more">Show more</button></section>';
    box.innerHTML=h+'<footer class="r-foot">About · Help · Terms · Privacy<br>© 2026 Ghetto · Live. Learn. Grow...</footer>';
  }

  // ---- events: profile page ----
  function pfClick(e){
    if(e.target.closest('.post'))return feedClick(e);
    if(heartClick(e))return;
    const rc=e.target.closest('.rcard');if(rc){openRoom(rc.dataset.room);return}
    const tab=e.target.closest('#pfTabs .tab');if(tab){pfTab=tab.dataset.pt;renderPfList();return}
    const st=e.target.closest('[data-st]');if(st){
      if(st.dataset.st==='posts'){pfTab='posts';renderPfList();$('#pfTabs').scrollIntoView({behavior:'smooth',block:'start'});return}
      openLinksSheet(st.dataset.st);return}
    const fb=e.target.closest('.pf-follow');if(fb){toggleLink(fb.dataset.pid);return}
    const a=e.target.closest('[data-pf]');if(!a)return;
    const act=a.dataset.pf;
    if(act==='back')backFromProfile();
    else if(act==='edit')openEdit();
    else if(act==='compose')openCompose();
    else if(act==='settings')openSettings();
    else if(act==='message')showToast('Messages are coming soon 💬');
    else if(act==='share'){
      const url=location.origin+profPath(curProfile.handle);
      try{navigator.clipboard.writeText(url).then(()=>showToast('Profile link copied 🔗'),()=>showToast(url))}catch(err){showToast(url)}
    }
  }
  pfBody.addEventListener('click',pfClick);
  $('#sUser').addEventListener('click',()=>openProfile(ME.handle));
  $('#topMe').addEventListener('click',()=>openProfile(ME.handle));

  // ---- delete my post ----
  function deletePost(art){
    if(!art||art.dataset.author!==ME.id)return;
    if(!confirm('Delete this post? This cannot be undone.'))return;
    const id=art.dataset.id;
    rpc('delete_post',{p_post:id}).then(()=>{
      if(detail.classList.contains('open')&&curId===id)closePost();
      $$('.post[data-id="'+id+'"]').forEach(x=>x.remove());
      delete COMMENTS[id];LOADED.delete(id);delete PMETA[id];
      if(curProfile&&curProfile.isMe){curProfile.posts=Math.max(0,curProfile.posts-1);paintStats();if(curPage==='profile'&&pfTab==='posts')renderPfList()}
      showToast('Post deleted 🗑️');
    }).catch(()=>fail('Could not delete that post'));
  }

  // ---- Links / Linking list ----
  let lsKind='links';
  function personRow(x){
    return '<div class="ls-row"><div class="sr-person" data-pid="'+x.id+'" data-name="'+esc(x.n)+'"><div class="avatar"><img src="'+FACE(x.av)+'" alt="" onerror="this.remove()"></div>'+
      '<div class="sr-main"><b>'+esc(x.n)+(x.r?' <em>('+esc(x.r)+')</em>':'')+'</b><small>@'+esc(x.h)+' · '+esc(x.s)+'</small></div>'+
      (x.id===ME.id?'<span class="ls-you">You</span>':followBtn(LINKED.has(x.id)))+'</div></div>';
  }
  function renderLinksList(){
    const p=curProfile,arr=lsKind==='links'?p.linksList:p.linkingList;
    const first=esc(p.name.split(' ')[0]);
    $('#lsTitle').textContent=lsKind==='links'?'Links':'Linking';
    $('#lsSub').textContent=lsKind==='links'?'People linked with '+(p.isMe?'you':p.name):'People '+(p.isMe?'you are':p.name+' is')+' linked with';
    $('#lsList').innerHTML=arr.length?arr.map(personRow).join(''):
      '<div class="pf-empty"><div class="s-emoji">🔗</div><b>'+(lsKind==='links'?'No links yet':'Not linked with anyone yet')+'</b>'+
      (lsKind==='links'?(p.isMe?'When people link with you they show up here.':'Be the first to link with '+first+'.'):(p.isMe?'Tap Link on a post to connect with people.':first+' has not linked with anyone yet.'))+'</div>';
  }
  function openLinksSheet(kind){
    lsKind=kind;renderLinksList();openBSheet(linksSheet);
    const h=curProfile.handle;
    rpc('get_profile',{p_handle:curProfile.isMe?null:h}).then(p=>{
      if(p&&curProfile&&curProfile.id===p.id){rememberPeople(p);Object.assign(curProfile,p);if(linksSheet.classList.contains('open'))renderLinksList();paintStats()}
    }).catch(()=>{});
  }
  $('#lsList').addEventListener('click',e=>{
    const fb=e.target.closest('.follow');
    if(fb){toggleLink(fb.closest('.sr-person').dataset.pid);return}
    const row=e.target.closest('.sr-person');
    if(row&&row.dataset.pid!==curProfile.id){closeBSheet(linksSheet);openProfile(HANDLES[row.dataset.pid])}
  });

  // ---- edit profile ----
  const EP={role:'Student',avatar:'',cover:''};
  const HANDLE_RE=/^[a-z0-9_]{3,20}$/;
  function epMark(){
    $$('#epRole button').forEach(b=>b.classList.toggle('on',b.dataset.role===EP.role));
    $$('#epAvatars button').forEach(b=>b.classList.toggle('on',b.dataset.id===EP.avatar));
    $$('#epCovers button').forEach(b=>b.classList.toggle('on',b.dataset.id===EP.cover));
  }
  function epHint(){
    const v=$('#epHandle').value,h=$('#epHandleHint'),ok=HANDLE_RE.test(v);
    h.className='ep-h'+(v&&!ok?' bad':'');
    h.textContent=!v||ok?'3 to 20 letters, numbers or underscores':'Use only a–z, 0–9 and _ (3 to 20 characters)';
    return ok;
  }
  function openEdit(){
    const p=curProfile;if(!p||!p.isMe)return;
    $('#epName').value=p.name;$('#epHandle').value=p.handle;$('#epBio').value=p.bio||'';$('#epArea').value=p.area||'';
    $('#epBioN').textContent=($('#epBio').value.length)+'/160';
    EP.role=p.role;EP.avatar=p.avatar;EP.cover=p.cover||'';
    $('#epErr').textContent='';epHint();epMark();openBSheet(editSheet);
  }
  $('#epRole').addEventListener('click',e=>{const b=e.target.closest('button');if(b){EP.role=b.dataset.role;epMark()}});
  $('#epAvatars').addEventListener('click',e=>{const b=e.target.closest('button');if(b){EP.avatar=b.dataset.id;epMark()}});
  $('#epCovers').addEventListener('click',e=>{const b=e.target.closest('button');if(b){EP.cover=b.dataset.id;epMark()}});
  $('#epHandle').addEventListener('input',e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'');epHint()});
  $('#epBio').addEventListener('input',e=>{$('#epBioN').textContent=e.target.value.length+'/160'});

  // my details changed: update every place that shows them
  function applyMe(p){
    const oldH=ME.handle;
    ME.name=p.name;ME.handle=p.handle;ME.avatar=p.avatar;ME.role=p.role;ME.area=p.area;USER=p.avatar;
    HANDLES[ME.id]=p.handle;PNAME[ME.id]=p.name;
    if(SET){SET.name=p.name;SET.handle=p.handle;SET.avatar=p.avatar;SET.role=p.role}
    $('#sUserName').textContent=p.name;$('#sUserSub').textContent=p.role+(p.area?' · '+p.area:'');
    [$('#sUserAv'),$('#topMeAv')].forEach(i=>{if(i){i.style.display='';i.src=FACE(p.avatar)}});
    $$('.post[data-author="'+ME.id+'"]').forEach(a=>{
      const im=$('.avatar img',a);if(im){im.style.display='';im.src=FACE(p.avatar);im.alt=p.name}
      const au=$('.author',a);if(au)au.childNodes[0].textContent=p.name+' ';
      const em=$('.author em',a);if(em)em.textContent='('+p.role+')';
      const mt=$('.meta',a);if(mt&&mt.firstChild&&mt.firstChild.nodeType===3)mt.firstChild.textContent=mt.firstChild.textContent.replace(/^(Student|Landlord)/,p.role);
    });
    Object.keys(COMMENTS).forEach(k=>COMMENTS[k].forEach(c=>{if(c.mine)c.av=p.avatar;c.replies.forEach(r=>{if(r.mine)r.av=p.avatar})}));
    ROOMS.forEach(r=>{if(r.ll.id===ME.id){r.ll.name=p.name;r.ll.av=p.avatar;r.llk=p.handle}});
    if(oldH!==p.handle){try{if(location.pathname.indexOf('/profile')===0)history.replaceState(null,'',profPath(p.handle))}catch(e){}}
  }
  $('#epSave').addEventListener('click',()=>{
    const btn=$('#epSave'),err=$('#epErr');err.textContent='';
    const name=$('#epName').value.trim();
    if(!name){err.textContent='Please enter your name';return}
    if(!epHint()){err.textContent='Fix your username first';return}
    btn.disabled=true;
    rpc('update_profile',{p_name:name,p_handle:$('#epHandle').value,p_bio:$('#epBio').value.trim(),p_area:$('#epArea').value.trim(),p_role:EP.role,p_avatar:EP.avatar,p_cover:EP.cover||null})
      .then(p=>{
        rememberPeople(p);applyMe(p);curProfile=p;renderProfile();
        closeBSheet(editSheet);showToast('Profile updated ✅');
      })
      .catch(e=>{err.textContent=(e&&e.message)||'Could not save. Try again'})
      .finally(()=>{btn.disabled=false});
  });
  [editSheet,linksSheet].forEach(s=>s.addEventListener('click',e=>{if(e.target.closest('.bs-back,.bs-close'))closeBSheet(s)}));
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(editSheet.classList.contains('open')){closeBSheet(editSheet);return}
    if(linksSheet.classList.contains('open'))closeBSheet(linksSheet);
  });

  // story viewer: tap the name / photo to see that profile
  [$('#vAv'),$('#vName')].forEach(el=>{el.style.cursor='pointer';el.addEventListener('click',()=>{
    const h=SHANDLES[ORDER[pi]];if(!h)return;
    closeStory();openProfile(h);
  })});

  // browser back / forward and deep links
  const pagePath=()=>location.pathname.indexOf('/profile')===0?'profile':location.pathname.indexOf('/settings')===0?'settings':location.pathname.indexOf('/rooms')===0?'rooms':'home';
  window.addEventListener('popstate',()=>{
    const pg=pagePath();
    if(navDepth>0)navDepth--;
    if(pg==='profile'){const seg=location.pathname.split('/')[2];showProfile(seg?decodeURIComponent(seg):ME.handle)}
    else if(pg==='settings')showSettings();
    else setPage(pg);
  });
  if(curPage==='profile'){
    railReady=true;
    if(INITIAL_PROFILE){rememberPeople(INITIAL_PROFILE);curProfile=INITIAL_PROFILE;renderProfile()}
    else showProfile(ME.handle);
  }
  railReady=true;updateRail();


  // =====================================================================
  // SETTINGS + ACCOUNT (log out, password, delete)
  // =====================================================================
  const pwSheet=$('#pwSheet'),logoutSheet=$('#logoutSheet'),deleteSheet=$('#deleteSheet'),stBody=$('#stBody'),stScroll=$('#stScroll'),userMenu=$('#userMenu');
  let SET=INITIAL_SETTINGS||null;
  // setting name in the page  ->  column name in the database
  const SKEY={privateAccount:'private_account',showActivity:'show_activity',notifyLikes:'notify_likes',notifyComments:'notify_comments',notifyLinks:'notify_links',notifyRooms:'notify_rooms',notifyPrices:'notify_prices',notifyEmail:'notify_email',whoCanMessage:'who_can_message',language:'language'};
  const LANGS=[['en','English'],['rw','Kinyarwanda'],['fr','Français']];
  const WHO=[['everyone','Everyone'],['links','My links'],['nobody','No one']];
  const swRow=(k,icon,tone,t,d)=>'<div class="st-row tap" data-sw="'+k+'" role="switch" tabindex="0" aria-checked="'+!!SET[k]+'"><span class="st-ic '+tone+'"><i class="fa-solid '+icon+'"></i></span><span class="st-t"><b>'+t+'</b><small>'+d+'</small></span><span class="st-sw'+(SET[k]?' on':'')+'"></span></div>';
  const linkRow=(act,icon,tone,t,d,val,cls)=>'<button type="button" class="st-row'+(cls?' '+cls:'')+'" data-st="'+act+'"><span class="st-ic '+tone+'"><i class="fa-solid '+icon+'"></i></span><span class="st-t"><b>'+t+'</b>'+(d?'<small>'+d+'</small>':'')+'</span>'+(val?'<span class="st-val">'+esc(val)+'</span>':'')+'<i class="fa-solid fa-chevron-right st-chev"></i></button>';
  const segRow=(k,icon,tone,t,d,opts)=>'<div class="st-row st-seg-row"><div class="st-head"><span class="st-ic '+tone+'"><i class="fa-solid '+icon+'"></i></span><span class="st-t"><b>'+t+'</b><small>'+d+'</small></span></div><div class="st-seg" data-seg="'+k+'">'+opts.map(o=>'<button type="button" data-val="'+o[0]+'" class="'+(SET[k]===o[0]?'on':'')+'">'+o[1]+'</button>').join('')+'</div></div>';

  // the settings are split into categories. On a phone they are one page; on a desktop the page lists the
  // categories and the one you pick opens in the right column.
  const CATS=[
    ['account','fa-user','y','Account','Profile, email and password'],
    ['privacy','fa-lock','b','Privacy','Private account, activity and messages'],
    ['notifications','fa-bell','r','Notifications','Likes, comments, links and rooms'],
    ['language','fa-globe','g','Language','Choose the app language'],
    ['help','fa-circle-question','b','Help and about','Support, safety and terms'],
    ['login','fa-right-from-bracket','r','Log out or delete','Sign out or remove your account']
  ];
  let stCat='account';
  function stSection(k){
    const s=SET;
    if(k==='account')return ''+
        linkRow('edit','fa-user-pen','y','Edit profile','Name, username, bio, photo and cover')+
        '<div class="st-row"><span class="st-ic b"><i class="fa-regular fa-envelope"></i></span><span class="st-t"><b>Email</b><small>Used to log in</small></span><span class="st-val">'+esc(s.email||'')+'</span></div>'+
        linkRow('password','fa-key','g','Change password','Keep your account safe');
    if(k==='privacy')return ''+
        swRow('privateAccount','fa-lock','b','Private account','Only people linked with you can see your posts')+
        swRow('showActivity','fa-circle','g','Activity status','Let people see when you are active')+
        segRow('whoCanMessage','fa-comment-dots','y','Who can message you','Choose who may start a chat with you',WHO);
    if(k==='notifications')return ''+
        swRow('notifyLikes','fa-heart','r','Likes','When someone likes your post')+
        swRow('notifyComments','fa-comment','b','Comments and mentions','Replies, comments and @mentions')+
        swRow('notifyLinks','fa-user-plus','g','New links','When someone links with you')+
        swRow('notifyRooms','fa-building','y','Room updates','Visit requests and messages about your rooms')+
        swRow('notifyPrices','fa-tags','y','Price updates','Market price changes near you')+
        swRow('notifyEmail','fa-envelope','b','Email notifications','Also send important updates to your email');
    if(k==='language')return segRow('language','fa-globe','g','App language','Translations are coming soon',LANGS);
    if(k==='help')return ''+
        linkRow('help','fa-circle-question','b','Help centre','')+
        linkRow('safety','fa-shield-halved','g','Safety tips','Visit first, never pay before you meet the landlord')+
        linkRow('terms','fa-file-lines','y','Terms and privacy','')+
        linkRow('about','fa-circle-info','b','About Ghetto','Version 0.1');
    return ''+
        linkRow('logout','fa-right-from-bracket','r','Log out','Signed in as '+esc(s.email||'@'+s.handle))+
        linkRow('delete','fa-trash','r','Delete account','Remove your profile and everything you posted','','danger');
  }
  const stTitle=k=>({account:'Your account',privacy:'Privacy',notifications:'Notifications',language:'Language',help:'Help and about',login:'Login'}[k]);
  function renderSettings(){
    const rs=$('#rSettings');
    if(!SET){stBody.innerHTML='<div class="d-empty">Loading settings…</div>';if(rs)rs.innerHTML='';return}
    const s=SET,wide=isWide();
    const who='<div class="st-who" data-st="profile" role="button" tabindex="0"><div class="avatar"><img src="'+FACE(s.avatar)+'" alt="" onerror="this.remove()"></div><div><b>'+esc(s.name)+'</b><small>@'+esc(s.handle)+' · '+esc(s.role)+'</small></div><i class="fa-solid fa-chevron-right go"></i></div>';
    let body;
    if(wide){
      body=who+'<div class="st-h">Settings</div><div class="st-group st-cats">'+CATS.map(c=>
        '<button type="button" class="st-row st-cat'+(c[0]===stCat?' on':'')+(c[0]==='login'?' last-red':'')+'" data-cat="'+c[0]+'"><span class="st-ic '+c[2]+'"><i class="fa-solid '+c[1]+'"></i></span><span class="st-t"><b>'+c[3]+'</b><small>'+c[4]+'</small></span><i class="fa-solid fa-chevron-right st-chev"></i></button>').join('')+'</div>';
      const c=CATS.find(x=>x[0]===stCat)||CATS[0];
      if(rs)rs.innerHTML='<div class="st-pane"><div class="st-pane-h"><span class="st-ic '+c[2]+'"><i class="fa-solid '+c[1]+'"></i></span><div><b>'+c[3]+'</b><small>'+c[4]+'</small></div></div><div class="st-group">'+stSection(stCat)+'</div></div>';
    }else{
      body=who+CATS.map(c=>'<div class="st-h">'+stTitle(c[0])+'</div><div class="st-group">'+stSection(c[0])+'</div>').join('');
      if(rs)rs.innerHTML='';
    }
    stBody.innerHTML=
      '<header class="st-top"><button type="button" class="pf-ico" data-st="back" aria-label="Back"><i class="fa-solid fa-arrow-left"></i></button><b>Settings</b></header>'+
      '<div class="st-wrap">'+body+'<div class="st-foot">Ghetto · Live. Learn. Grow...</div></div>';
  }
  function showSettings(){
    if(curPage!=='settings')prevPage=curPage;
    setPage('settings');stScroll.scrollTop=0;
    renderSettings();
    return rpc('get_settings').then(s=>{SET=s;renderSettings()}).catch(()=>{if(!SET)fail('Could not load your settings')});
  }
  function openSettings(){try{history.pushState(null,'','/settings');navDepth++}catch(e){}showSettings()}
  function backFromSettings(){
    if(navDepth>0){history.back();return}
    const to=prevPage==='settings'||prevPage==='profile'?'home':prevPage;
    setPage(to);try{history.pushState(null,'',to==='rooms'?'/rooms':'/')}catch(e){}
  }

  function saveSetting(k,v){
    const old=SET[k];SET[k]=v;
    return rpc('update_setting',{p_key:SKEY[k],p_value:v}).catch(()=>{SET[k]=old;renderSettings();fail('Could not save that setting')});
  }
  function stClick(e){
    const cat=e.target.closest('[data-cat]');
    if(cat){stCat=cat.dataset.cat;renderSettings();return}
    const sw=e.target.closest('[data-sw]');
    if(sw){
      const k=sw.dataset.sw,on=!SET[k];
      saveSetting(k,on);
      const t=$('.st-sw',sw);t.classList.toggle('on',on);sw.setAttribute('aria-checked',String(on));
      if(k==='privateAccount')showToast(on?'Private account on 🔒':'Private account off');
      return;
    }
    const sg=e.target.closest('.st-seg button');
    if(sg){
      const box=sg.closest('.st-seg'),k=box.dataset.seg;
      $$('button',box).forEach(b=>b.classList.toggle('on',b===sg));
      saveSetting(k,sg.dataset.val);
      showToast(k==='language'?'Language saved. Translations are coming soon 🌍':'Saved ✅');
      return;
    }
    const a=e.target.closest('[data-st]');if(!a)return;
    const act=a.dataset.st;
    if(act==='back')backFromSettings();
    else if(act==='profile')openProfile(ME.handle);
    else if(act==='edit'){pendingEdit=true;openProfile(ME.handle)}
    else if(act==='password')openPassword();
    else if(act==='logout')openLogout();
    else if(act==='delete')openDelete();
    else if(act==='help')showToast('Help centre is coming soon 🙋');
    else if(act==='safety')showToast('Visit the room and meet the landlord before you pay 🛡️');
    else if(act==='terms')showToast('Terms and privacy page is coming soon 📄');
    else if(act==='about')showToast('Ghetto 0.1 · Live. Learn. Grow... 🧡');
  }
  stBody.addEventListener('click',stClick);
  $('#rSettings').addEventListener('click',stClick);
  const stKey=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-sw],.st-who')){e.preventDefault();e.target.click()}};
  stBody.addEventListener('keydown',stKey);$('#rSettings').addEventListener('keydown',stKey);
  if(wideMQ&&wideMQ.addEventListener)wideMQ.addEventListener('change',()=>{if(curPage==='settings')renderSettings();updateRail();renderRailProfile()});

  // ---- change password ----
  function openPassword(){$('#pwNew').value='';$('#pwNew2').value='';$('#pwErr').textContent='';openBSheet(pwSheet);setTimeout(()=>$('#pwNew').focus(),350)}
  $('#pwSave').addEventListener('click',()=>{
    const a=$('#pwNew').value,b=$('#pwNew2').value,err=$('#pwErr'),btn=$('#pwSave');err.textContent='';
    if(a.length<8){err.textContent='Password must be at least 8 characters';return}
    if(a!==b){err.textContent='The two passwords do not match';return}
    btn.disabled=true;
    supabase().auth.updateUser({password:a}).then(({error})=>{
      if(error){err.textContent=error.message;return}
      closeBSheet(pwSheet);showToast('Password changed 🔐');
    }).catch(()=>{err.textContent='Could not change your password. Try again'}).finally(()=>{btn.disabled=false});
  });

  // ---- log out ----
  function openLogout(){$('#loSub').textContent='You are logged in as @'+ME.handle+'. You can log back in any time.';openBSheet(logoutSheet)}
  $('#loGo').addEventListener('click',()=>{$('#loGo').disabled=true;signOut()});
  $('#loCancel').addEventListener('click',()=>closeBSheet(logoutSheet));

  // ---- delete account ----
  function openDelete(){$('#dlConfirm').value='';$('#dlErr').textContent='';$('#dlGo').disabled=true;openBSheet(deleteSheet)}
  $('#dlConfirm').addEventListener('input',e=>{$('#dlGo').disabled=e.target.value.trim()!=='DELETE'});
  $('#dlGo').addEventListener('click',()=>{
    const btn=$('#dlGo');btn.disabled=true;
    rpc('delete_account').then(()=>signOut()).catch(()=>{$('#dlErr').textContent='Could not delete your account. Try again';btn.disabled=false});
  });
  [pwSheet,logoutSheet,deleteSheet].forEach(s=>s.addEventListener('click',e=>{if(e.target.closest('.bs-back,.bs-close'))closeBSheet(s)}));
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(pwSheet.classList.contains('open')){closeBSheet(pwSheet);return}
    if(logoutSheet.classList.contains('open')){closeBSheet(logoutSheet);return}
    if(deleteSheet.classList.contains('open')){closeBSheet(deleteSheet);return}
    closeUserMenu();
  });

  // ---- desktop account menu (the ... next to your name) ----
  function closeUserMenu(){userMenu.classList.remove('open');userMenu.setAttribute('aria-hidden','true')}
  $('#sUserMore').addEventListener('click',e=>{
    e.stopPropagation();
    if(userMenu.classList.contains('open')){closeUserMenu();return}
    const r=$('#sUser').getBoundingClientRect();
    $('#umLogout').textContent='Log out @'+ME.handle;
    userMenu.style.left=Math.max(12,r.left)+'px';userMenu.style.bottom=(window.innerHeight-r.top+8)+'px';
    userMenu.classList.add('open');userMenu.setAttribute('aria-hidden','false');
  });
  userMenu.addEventListener('click',e=>{
    const b=e.target.closest('[data-um]');if(!b)return;
    closeUserMenu();
    if(b.dataset.um==='profile')openProfile(ME.handle);
    else if(b.dataset.um==='settings')openSettings();
    else openLogout();
  });
  document.addEventListener('click',e=>{if(!e.target.closest('#userMenu,#sUserMore'))closeUserMenu()});

  if(curPage==='settings')renderSettings();
}
