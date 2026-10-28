(function(){
const S=window.AppState,$=s=>document.querySelector(s);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tab=location.hash.slice(1)||'inventory',F={q:'',city:'',area:'',beds:'',baths:'',maxDown:'',maxMonthly:'',maxPrice:'',status:'',sort:'priceAsc'},map=null;
const go=t=>{tab=t;location.hash=t;render();};
const badge=s=>`<span class="badge" style="background:${({AVAILABLE:'#16a34a',COMING_SOON:'#2563eb',CLOSED:'#475569'})[s]||'#d97706'};color:#fff;padding:2px 8px;border-radius:999px;font-size:12px">${esc(S.STATUS_LABEL[s]||s)}</span>`;
const offerBadge=s=>`<span style="background:${S.OFFER_COLOR[s]||'#64748b'};color:#fff;padding:2px 8px;border-radius:6px">${s==='COUNTERED'?'Counter Offer':esc(s)}</span>`;
const title=l=>S.user?`${esc(l.address)}, ${esc(l.city)}, ${esc(l.state)} ${esc(l.zip)}`:`${esc(l.approxLocation&&l.approxLocation.streetOnly||l.publicTitle)}, ${esc(l.city)}`;
function modal(html){const m=document.createElement('div');m.className='modal-backdrop';m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999';
  m.innerHTML=`<div class="modal card" style="background:#fff;max-width:640px;width:94%;max-height:90vh;overflow:auto;padding:20px;border-radius:12px"><button class="close" style="float:right">✕</button>${html}</div>`;
  m.onclick=e=>{if(e.target===m||e.target.classList.contains('close'))m.remove();};document.body.appendChild(m);return m;}
const wrap=fn=>async e=>{e&&e.preventDefault&&e.preventDefault();try{await fn(e);}catch(err){alert(err.message);}};
const fd=f=>Object.fromEntries(new FormData(f));
function header(){const T=[['inventory','Inventory'],['guides','How It Works / Guides'],['dashboard','Dashboard / My Profile']];
  if(S.isAdmin())T.push(['admin','Admin Portal']);if(!S.user)T.push(['auth','Login / Register']);
  return `<header class="site-header" style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:12px 18px">
   <img src="legacy-logo.png" alt="Legacy" style="height:56px"><div><h1 style="font-family:'Cormorant Garamond',serif;margin:0">Legacy - Owner Finance</h1>
   <div style="display:flex;align-items:center;gap:6px;font-size:13px">Brokerage By: KLC Real Estate, LLC <img src="klc-logo.png" alt="KLC" style="height:22px"></div></div>
   <nav style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto">${T.map(([k,v])=>`<button data-tab="${k}" class="${tab===k?'active':''}">${v}</button>`).join('')}
   ${S.user?`<button id="logout">Logout (${esc(S.user.name)})</button>`:''}
   <button data-lang="en" class="${S.lang==='en'?'active':''}">EN</button><button data-lang="es" class="${S.lang==='es'?'active':''}">ES</button></nav></header>
   <div class="guide-banner" style="padding:8px 18px;background:#f5efe3">New here? <a href="#guides" data-tab="guides">Step-by-step: create your account &amp; navigate the site →</a></div>`;}
function guides(){return `<section class="card" style="padding:20px"><h2>How It Works</h2><h3>Create a Buyer account</h3><ol><li>Click <b>Login / Register</b> and choose <b>Buyer</b>.</li><li>Enter your agent's invite code (e.g. D2D-XXXXXX). No agent? Choose “I don't have an agent, yet” — a licensed agent will be assigned to you.</li><li>Set a password (8+ characters) and submit.</li></ol>
<h3>Create an Agent account</h3><ol><li>Choose <b>Agent</b>, enter your OREC license # and brokerage.</li><li>After registering you receive your own invite code to share with clients.</li></ol>
<h3>Navigating</h3><ol><li><b>Inventory</b>: search by address, filter, view the map, tap ♥ to save homes.</li><li>Open a home to see photos, request a showing, make an offer or share it with your agent.</li><li><b>Dashboard</b>: profile, favorites, messages, offers and your document folder. Once an offer is accepted, upload your ID and Proof of Income there.</li><li>Forgot your password? Use “Forgot password” on the login screen.</li></ol></section>`;}
function filtered(){let L=S.data.listings.filter(l=>{const q=F.q.toLowerCase();
  if(q&&!((S.user?l.address:'')+' '+(l.publicTitle||'')+' '+l.city+' '+l.zip).toLowerCase().includes(q))return false;
  if(F.city&&l.city!==F.city)return false;if(F.area&&!(l.areas||[]).includes(F.area))return false;
  if(F.beds&&(l.beds||0)<+F.beds)return false;if(F.baths&&(l.baths||0)<+F.baths)return false;
  if(F.maxDown&&l.downPayment>F.maxDown*100)return false;if(F.maxMonthly&&l.monthlyPayment>F.maxMonthly*100)return false;
  if(F.maxPrice&&l.askingPrice>F.maxPrice*100)return false;if(F.status&&l.status!==F.status)return false;return true;});
  const k={priceAsc:['askingPrice',1],priceDesc:['askingPrice',-1],downAsc:['downPayment',1],monthlyAsc:['monthlyPayment',1],bedsDesc:['beds',-1]}[F.sort];
  return L.sort((a,b)=>((a[k[0]]||0)-(b[k[0]]||0))*k[1]);}
function inventory(){const cities=[...new Set(S.data.listings.map(l=>l.city))].sort(),L=filtered();
  const sel=(n,opts,lab)=>`<select name="${n}"><option value="">${lab}</option>${opts.map(o=>`<option value="${esc(o[0]??o)}" ${F[n]==(o[0]??o)?'selected':''}>${esc(o[1]??o)}</option>`).join('')}</select>`;
  return `<section style="padding:14px 18px"><form id="filters" class="filters" style="display:flex;flex-wrap:wrap;gap:6px">
   <input name="q" placeholder="Search address…" value="${esc(F.q)}" style="flex:1 1 260px">${sel('city',cities,'City')}${sel('area',[['N','N'],['S','S'],['W','W'],['E','E']],'Area')}
   ${sel('beds',[1,2,3,4,5].map(n=>[n,n+'+ beds']),'Beds')}${sel('baths',[1,2,3].map(n=>[n,n+'+ baths']),'Baths')}
   <input name="maxDown" type="number" placeholder="Max down $" value="${esc(F.maxDown)}"><input name="maxMonthly" type="number" placeholder="Max monthly $" value="${esc(F.maxMonthly)}"><input name="maxPrice" type="number" placeholder="Max price $" value="${esc(F.maxPrice)}">
   ${sel('status',S.STATUSES.map(s=>[s,S.STATUS_LABEL[s]]),'Status')}${sel('sort',[['priceAsc','Price ↑'],['priceDesc','Price ↓'],['downAsc','Down ↑'],['monthlyAsc','Monthly ↑'],['bedsDesc','Beds ↓']],'Sort')}</form>
   <p>${L.length} homes</p><div id="inventory-map" style="height:380px;border-radius:12px;margin-bottom:14px"></div>
   <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px">${L.map(card).join('')}</div></section>`;}
function card(l){return `<article class="card listing-card" style="border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.1)">
  <div style="position:relative"><img src="${esc(l.photoUrl||'listing-placeholder.svg')}" style="width:100%;height:170px;object-fit:cover" data-open="${l.id}">
  <button data-fav="${l.id}" title="Favorite" style="position:absolute;top:8px;right:8px;font-size:20px;background:#fff;border-radius:50%;border:0;width:36px;height:36px">${S.isFavorite(l.id)?'❤️':'🤍'}</button></div>
  <div style="padding:10px">${badge(l.status)}<h3 style="margin:6px 0;font-size:16px">${title(l)}</h3>
  <div>Price <b>${S.money(l.askingPrice)}</b> · Down <b>${S.money(l.downPayment)}</b> · <b>${S.money(l.monthlyPayment)}</b>/mo</div>
  <div style="font-size:13px;color:#555">${l.beds??'—'} bd · ${l.baths??'—'} ba · ${l.sqft?l.sqft+' sqft':''}</div><button data-open="${l.id}" style="margin-top:8px">View details</button></div></article>`;}
function drawMap(){if(!window.L||!$('#inventory-map'))return;if(map){map.remove();map=null;}
  map=L.map('inventory-map').setView([35.47,-97.52],10);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
  const pts=[];filtered().forEach(l=>{const a=l.approxLocation||{};const lat=S.user?l.latitude:a.lat,lng=S.user?l.longitude:a.lng;if(lat==null||lng==null)return;
   pts.push([lat,lng]);L.marker([lat,lng]).addTo(map).bindPopup(`${title(l)}<br>${S.money(l.askingPrice)} <a href="#" data-open="${l.id}">Details</a>`);});
  if(pts.length)map.fitBounds(pts,{padding:[30,30]});}
function openListing(id){const l=S.listing(id);S.recordView(id);const ph=(l.photoUrls&&l.photoUrls.length?l.photoUrls:[l.photoUrl||'listing-placeholder.svg']);
  const ag=S.user&&S.agentFor(S.user);
  const m=modal(`<h2>${title(l)}</h2>${badge(l.status)}<div class="gallery" style="display:flex;gap:6px;overflow-x:auto;margin:10px 0">${ph.map(p=>`<img src="${esc(p)}" style="height:200px;border-radius:8px">`).join('')}</div>
   ${l.photosUrl?`<a href="${esc(l.photosUrl)}" target="_blank" rel="noopener">More photos ↗</a>`:''}
   <p>Price <b>${S.money(l.askingPrice)}</b> · Down <b>${S.money(l.downPayment)}</b> · Monthly <b>${S.money(l.monthlyPayment)}</b> · ${l.termYears||'—'} yrs</p><p>${esc(l.description)}</p>
   ${S.user?`<h3>Make an Offer</h3><form id="offerF"><input name="offerPrice" type="number" placeholder="Offer price $" required><input name="downPayment" type="number" placeholder="Down $" required><input name="monthlyPayment" type="number" placeholder="Monthly $" required><textarea name="notes" placeholder="Notes"></textarea><button>Submit Offer</button></form>
   <h3>Request a Showing</h3><form id="showF"><input name="preferredAt" type="datetime-local" required><input name="notes" placeholder="Notes"><button>Request Showing</button></form>
   ${ag?`<h3>Share House with Agent</h3><form id="shareF"><textarea name="body" placeholder="Message to your agent">I'd like to look at this home.</textarea><button>Share House with Agent</button> <button type="button" id="reqAcc">Request Property Access</button></form>`:''}`
   :`<p><a href="#auth" data-tab="auth">Log in or register</a> to see the full address, make offers, and request showings.</p>`}`);
  const on=(s,f)=>{const el=m.querySelector(s);if(el)el.onsubmit=wrap(()=>{f(fd(el));alert('Sent!');m.remove();render();});};
  on('#offerF',v=>S.submitOffer({...v,listingId:id}));on('#showF',v=>S.requestShowing({...v,listingId:id}));
  on('#shareF',v=>S.sendMessage({toUserId:ag.id,listingId:id,kind:'SHARE_HOUSE',body:v.body}));
  const ra=m.querySelector('#reqAcc');if(ra)ra.onclick=wrap(()=>{S.sendMessage({toUserId:ag.id,listingId:id,kind:'REQUEST_ACCESS',body:'Request Property Access'});alert('Requested!');});}
function auth(){return `<section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;padding:18px">
 <form id="loginF" class="card" style="padding:16px"><h2>Login</h2><input name="email" type="email" placeholder="Email" required><input name="password" type="password" placeholder="Password" required><button>Login</button>
 <p><a href="#" id="forgot">Forgot password?</a></p></form>
 <form id="regF" class="card" style="padding:16px"><h2>Register</h2><select name="role" id="roleSel"><option value="BUYER">Buyer</option><option value="AGENT">Agent</option></select>
 <input name="name" placeholder="Full name" required><input name="email" type="email" placeholder="Email" required><input name="phone" placeholder="Phone"><input name="password" type="password" placeholder="Password (8+)" required>
 <div id="buyerFields"><input name="inviteCode" id="inv" placeholder="Agent invite code (D2D-XXXXXX)"><label><input type="checkbox" id="noAgent"> I don't have an agent, yet</label></div>
 <div id="agentFields" style="display:none"><input name="licenseNumber" placeholder="OREC license #"><input name="brokerage" placeholder="Brokerage"></div><button>Create account</button></form></section>`;}
function dashboard(){if(!S.user)return auth();const u=S.user,ap=S.agentProfile(u),ag=S.agentFor(u),D=S.data;
  const favs=D.favorites.filter(f=>f.userId===u.id).map(f=>S.listing(f.listingId)).filter(Boolean);
  const views=D.propertyViews.filter(v=>v.userId===u.id).slice(-10).reverse().map(v=>S.listing(v.listingId)).filter(Boolean);
  const offers=D.offers.filter(o=>o.userId===u.id),docs=D.documents.filter(d=>d.userId===u.id),msgs=S.myMessages().slice().reverse();
  const contacts=ap?S.clientsOf(u):(ag?[ag]:[]),nm=id=>(D.users.find(x=>x.id===id)||{}).name||'—';
  const li=l=>`<li><a href="#" data-open="${l.id}">${title(l)}</a> ${badge(l.status)}</li>`;
  return `<section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;padding:18px">
  <div class="card" style="padding:16px"><h2>My Profile</h2><img src="${esc(u.avatarUrl||'listing-placeholder.svg')}" style="width:90px;height:90px;border-radius:50%;object-fit:cover"><input type="file" id="avatar" accept="image/*">
   <form id="profF"><input name="name" value="${esc(u.name)}"><input name="phone" value="${esc(u.phone)}">${ap?`<label>OREC License #<input name="licenseNumber" value="${esc(ap.licenseNumber)}"></label><label>Brokerage<input name="brokerage" value="${esc(ap.brokerage)}"></label><p>Your invite code: <b>${esc(ap.inviteCode)}</b></p>`:''}<button>Save</button></form>
   ${ag?`<p>Your agent: <b>${esc(ag.name)}</b></p>`:''}<h3>Change Password</h3><form id="pwF"><input name="cur" type="password" placeholder="Current" required><input name="pw" type="password" placeholder="New (8+)" required><button>Update Password</button></form></div>
  <div class="card" style="padding:16px"><h2>Favorites</h2><ul>${favs.map(li).join('')||'<li>None yet</li>'}</ul><h2>Viewed Homes</h2><ul>${views.map(li).join('')||'<li>None yet</li>'}</ul></div>
  <div class="card" style="padding:16px"><h2>Messages</h2>${contacts.length?`<form id="msgF"><select name="toUserId">${contacts.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
   <select name="listingId"><option value="">— Property address —</option>${D.listings.map(l=>`<option value="${l.id}">${esc(l.address)}, ${esc(l.city)}</option>`).join('')}</select>
   <select name="kind"><option value="MESSAGE">Message</option><option value="REQUEST_ACCESS">Request Property Access</option><option value="SHARE_HOUSE">Share House with Agent</option></select><textarea name="body" placeholder="Message" required></textarea><button>Send</button></form>`:'<p>No agent/client linked.</p>'}
   <ul>${msgs.map(m=>`<li><b>${esc(nm(m.fromUserId))}</b> → ${esc(nm(m.toUserId))} ${m.listingId?'('+esc((S.listing(m.listingId)||{}).address)+')':''} <i>${esc(m.kind)}</i>: ${esc(m.body)}</li>`).join('')}</ul></div>
  <div class="card" style="padding:16px"><h2>My Offers</h2><ul>${offers.map(o=>{const l=S.listing(o.listingId)||{};return `<li>${esc(l.address)} — ${S.money(o.offerPrice)} ${offerBadge(o.status)}
   ${o.status==='COUNTERED'?`<div style="color:#d97706">Counter: ${S.money(o.counterPrice)} / Down ${S.money(o.counterDown)} / ${S.money(o.counterMonthly)}/mo. ${esc(o.adminNotes)}</div>`:''}
   ${o.status==='ACCEPTED'?`<div class="tx-box" style="border:2px solid #16a34a;padding:8px;border-radius:8px;margin:6px 0"><b>Property Transaction Documents</b>${S.TX_DOCS.map(t=>{const has=docs.find(d=>d.offerId===o.id&&d.docType===t.type);
     return `<div>${t.label}: ${has?'✅ '+esc(has.name):`<input type="file" data-txdoc="${t.type}" data-offer="${o.id}" data-listing="${o.listingId}">`}</div>`;}).join('')}</div>`:''}</li>`;}).join('')||'<li>None yet</li>'}</ul></div>
  <div class="card" style="padding:16px"><h2>My Document Folder</h2><p style="font-size:12px">Folder: ${esc(u.folderSlug)}</p><input type="file" id="docUp"><ul>${docs.map(d=>`<li><a href="${d.dataUrl}" download="${esc(d.name)}">${esc(d.name)}</a> <i>${esc(d.docType)}</i></li>`).join('')||'<li>No documents</li>'}</ul></div>
  ${ap?`<div class="card" style="padding:16px"><h2>My Clients</h2><ul>${S.clientsOf(u).map(c=>`<li><a href="#" data-client="${c.id}">${esc(c.name)}</a> — ${esc(c.email)} ${esc(c.phone)}</li>`).join('')||'<li>No clients yet</li>'}</ul></div>`:''}</section>`;}
function admin(){if(!S.isAdmin())return '<p style="padding:18px">Admins only.</p>';const D=S.data;
  return `<section style="padding:18px;display:grid;gap:16px"><div class="card" style="padding:16px"><h2>Recent Offers</h2><table><tr><th>Property</th><th>Buyer</th><th>Offer</th><th>Status</th><th>Actions</th></tr>
  ${D.offers.slice().reverse().map(o=>`<tr><td>${esc((S.listing(o.listingId)||{}).address)}</td><td>${esc((D.users.find(u=>u.id===o.userId)||{}).name)}</td><td>${S.money(o.offerPrice)} / ${S.money(o.downPayment)} / ${S.money(o.monthlyPayment)}</td><td>${offerBadge(o.status)}</td>
   <td><button data-acc="${o.id}" style="background:#16a34a;color:#fff">Accept</button> <button data-ctr="${o.id}" style="background:#d97706;color:#fff">Counter Offer</button> <button data-rej="${o.id}" style="background:#dc2626;color:#fff">Reject</button></td></tr>`).join('')||'<tr><td colspan=5>No offers</td></tr>'}</table></div>
  <div class="card" style="padding:16px"><h2>Users / Agents</h2><table><tr><th>Name</th><th>Email</th><th>Role</th><th>Invite</th><th>Reset Password</th></tr>${D.users.map(u=>{const ap=S.agentProfile(u);return `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.role}</td><td>${esc(ap&&ap.inviteCode)}</td><td><button data-reset="${u.id}">Reset</button></td></tr>`;}).join('')}</table></div>
  <div class="card" style="padding:16px"><h2>Listings</h2><table><tr><th>Address</th><th>Status</th><th>Price $</th><th>Down $</th><th>Monthly $</th><th></th></tr>${D.listings.map(l=>`<tr data-row="${l.id}"><td>${esc(l.address)}, ${esc(l.city)}</td>
   <td><select data-status="${l.id}">${S.STATUSES.map(s=>`<option value="${s}" ${l.status===s?'selected':''}>${S.STATUS_LABEL[s]}</option>`).join('')}</select></td>
   <td><input data-f="askingPrice" type="number" value="${l.askingPrice/100}" style="width:90px"></td><td><input data-f="downPayment" type="number" value="${l.downPayment/100}" style="width:80px"></td><td><input data-f="monthlyPayment" type="number" value="${l.monthlyPayment/100}" style="width:80px"></td><td><button data-save="${l.id}">Save</button></td></tr>`).join('')}</table></div></section>`;}
function render(){const root=$('#app-root');if(!S.data)return;document.documentElement.lang=S.lang;
  const body={inventory,guides,dashboard,admin,auth}[tab]||inventory;root.innerHTML=header()+`<main>${body()}</main><footer style="padding:18px;font-size:12px;text-align:center">© Legacy - Owner Finance · Brokerage By: KLC Real Estate, LLC</footer>`;bind();if(tab==='inventory')drawMap();}
function bind(){const r=$('#app-root');
  r.onclick=wrap(e=>{const t=e.target.closest('[data-tab],[data-lang],[data-open],[data-fav],[data-acc],[data-rej],[data-ctr],[data-reset],[data-save],[data-client],#logout,#forgot');if(!t)return;const d=t.dataset;
   if(d.tab)return go(d.tab);if(d.lang)return S.setLang(d.lang);if(d.fav)return S.toggleFavorite(d.fav);if(d.open)return openListing(d.open);if(t.id==='logout'){S.logout();return go('inventory');}
   if(t.id==='forgot'){const em=prompt('Account email');if(!em)return;const c=S.forgotPassword(em);const code=prompt('Your reset code is '+c+'. Enter it to continue:');const pw=prompt('New password (8+)');S.resetPassword(em,code,pw);return alert('Password updated. Please log in.');}
   if(d.acc)return S.respondOffer(d.acc,'ACCEPTED');if(d.rej)return S.respondOffer(d.rej,'REJECTED');
   if(d.ctr){const p=prompt('Counter price $'),dn=prompt('Counter down $'),mo=prompt('Counter monthly $'),n=prompt('Admin notes')||'';if(p)S.respondOffer(d.ctr,'COUNTERED',{counterPrice:p,counterDown:dn,counterMonthly:mo,adminNotes:n});return;}
   if(d.reset){const pw=prompt('New password for user (8+)');if(pw){S.adminResetPassword(d.reset,pw);alert('Password reset.');}return;}
   if(d.save){const row=r.querySelector(`[data-row="${d.save}"]`),p={};row.querySelectorAll('[data-f]').forEach(i=>p[i.dataset.f]=Math.round(+i.value*100));S.updateListing(d.save,p);return alert('Saved');}
   if(d.client){const c=S.data.users.find(u=>u.id===d.client);const of=S.data.offers.filter(o=>o.userId===c.id);modal(`<h2>${esc(c.name)}</h2><p>${esc(c.email)} · ${esc(c.phone)}</p><h3>Favorites</h3><ul>${S.data.favorites.filter(f=>f.userId===c.id).map(f=>`<li>${esc((S.listing(f.listingId)||{}).address)}</li>`).join('')}</ul><h3>Offers</h3><ul>${of.map(o=>`<li>${esc((S.listing(o.listingId)||{}).address)} ${S.money(o.offerPrice)} ${offerBadge(o.status)}</li>`).join('')}</ul>`);}
  });
  const f=$('#filters');if(f){f.oninput=f.onchange=e=>{F=Object.assign(F,fd(f));const pos=e.target.name==='q'?e.target.selectionStart:null;render();if(pos!=null){const q=$('#filters [name=q]');q.focus();q.setSelectionRange(pos,pos);}};f.onsubmit=e=>e.preventDefault();}
  r.onchange=wrap(async e=>{const t=e.target;if(t.dataset.status)return S.setListingStatus(t.dataset.status,t.value);
   if(t.id==='avatar'&&t.files[0])return S.uploadAvatar(t.files[0]);if(t.id==='docUp'&&t.files[0])return S.uploadDocument(t.files[0]);
   if(t.dataset.txdoc&&t.files[0])return S.uploadDocument(t.files[0],{docType:t.dataset.txdoc,offerId:t.dataset.offer,listingId:t.dataset.listing});
   if(t.id==='roleSel'){$('#agentFields').style.display=t.value==='AGENT'?'':'none';$('#buyerFields').style.display=t.value==='AGENT'?'none':'';}
   if(t.id==='noAgent'){$('#inv').disabled=t.checked;if(t.checked)$('#inv').value='';}});
  const sub=(id,fn)=>{const el=$(id);if(el)el.onsubmit=wrap(()=>fn(fd(el)));};
  sub('#loginF',v=>{S.login(v.email,v.password);go('dashboard');});
  sub('#regF',v=>{S.register(v);go('dashboard');});
  sub('#profF',v=>{S.updateProfile(v);alert('Saved');});
  sub('#pwF',v=>{S.changePassword(v.cur,v.pw);alert('Password updated');});
  sub('#msgF',v=>{S.sendMessage(v);});}
S.on(render);window.addEventListener('hashchange',()=>{tab=location.hash.slice(1)||'inventory';render();});
S.load().then(render).catch(e=>{$('#app-root').innerHTML='<p style="padding:20px">Failed to load data: '+esc(e.message)+'</p>';});
})();
