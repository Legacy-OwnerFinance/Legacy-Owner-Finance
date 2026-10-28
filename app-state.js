(function(){
const KEY='legacy_of_state_v1';
const S=window.AppState={data:null,user:null,lang:localStorage.getItem('legacy_lang')||'en',listeners:[]};
const uid=()=>'id'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const now=()=>new Date().toISOString();
const code=()=>'D2D-'+Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
const slugify=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const bc=()=>window.dcodeIO.bcrypt;
S.on=f=>S.listeners.push(f);
S.save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S.data));}catch(e){console.warn(e)}S.listeners.forEach(f=>f());};
S.t=(k,v)=>window.translateI18n?window.translateI18n(S.lang,k,v):k;
S.setLang=l=>{S.lang=l;localStorage.setItem('legacy_lang',l);S.save();};
const LIST=['users','agentProfiles','buyerProfiles','offers','showings','messages','documents','favorites','propertyViews','propertyRequests','listings'];
function merge(base,local){
  if(!local)return base;
  LIST.forEach(k=>{const m=new Map((base[k]||[]).map(x=>[x.id,x]));(local[k]||[]).forEach(x=>{if(x&&x.id)m.set(x.id,Object.assign({},m.get(x.id)||{},x));});base[k]=[...m.values()];});
  return base;
}
S.load=async()=>{
  const base=await fetch('app-data.json',{cache:'no-store'}).then(r=>r.json());
  LIST.forEach(k=>base[k]=base[k]||[]);
  let local=null;try{local=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
  S.data=merge(base,local);
  const sid=sessionStorage.getItem('legacy_uid')||localStorage.getItem('legacy_uid');
  S.user=S.data.users.find(u=>u.id===sid)||null;
  backgroundSync();
};
async function backgroundSync(){
  try{const t=await fetch('tunnel-url.json',{cache:'no-store'}).then(r=>r.json());
    if(!t.url)return;const c=new AbortController();setTimeout(()=>c.abort(),4000);
    const r=await fetch(t.url.replace(/\/$/,'')+'/api/health',{signal:c.signal,mode:'cors'});
    S.backendOnline=r.ok;}catch(e){S.backendOnline=false;}
}
const byEmail=e=>S.data.users.find(u=>(u.email||'').toLowerCase()===String(e||'').trim().toLowerCase());
S.agentProfile=u=>u&&S.data.agentProfiles.find(a=>a.userId===u.id);
S.buyerProfile=u=>u&&S.data.buyerProfiles.find(b=>b.userId===u.id);
S.isAdmin=()=>S.user&&S.user.role==='ADMIN';
S.isAgent=()=>S.user&&S.user.role==='AGENT';
S.listing=id=>S.data.listings.find(l=>l.id===id);
function setUser(u){S.user=u;if(u)localStorage.setItem('legacy_uid',u.id);else localStorage.removeItem('legacy_uid');S.save();}
S.login=(email,pw)=>{const u=byEmail(email);
  if(!u||!u.passwordHash||!bc().compareSync(pw,u.passwordHash))throw new Error('Invalid email or password');
  setUser(u);return u;};
S.logout=()=>setUser(null);
const hash=pw=>{if(!pw||pw.length<8)throw new Error('Password must be at least 8 characters');return bc().hashSync(pw,10);};
S.register=f=>{
  if(byEmail(f.email))throw new Error('An account with that email already exists');
  const u={id:uid(),email:f.email.trim().toLowerCase(),name:f.name,phone:f.phone||'',role:f.role==='AGENT'?'AGENT':'BUYER',avatarUrl:null,
    brokerage:f.brokerage||null,folderSlug:slugify(f.name)+'-'+Math.random().toString(36).slice(2,6),passwordHash:hash(f.password),createdAt:now(),updatedAt:now()};
  S.data.users.push(u);
  if(u.role==='AGENT'){
    S.data.agentProfiles.push({id:uid(),userId:u.id,brokerage:f.brokerage||'',licenseNumber:f.licenseNumber||'',licenseState:'OK',licenseHolderName:f.name,
      licenseStatus:'PENDING',accessStatus:'PENDING',inviteCode:code(),createdAt:now()});
  }else{
    const ic=String(f.inviteCode||'').trim().toUpperCase();
    let ap=S.data.agentProfiles.find(a=>(a.inviteCode||'').toUpperCase()===ic);
    const auto=!ap; if(!ap)ap=S.data.agentProfiles.find(a=>a.inviteCode===S.data.defaultAgent.inviteCode)||{id:S.data.defaultAgent.agentProfileId};
    S.data.buyerProfiles.push({id:uid(),userId:u.id,agentId:ap.id,assignedAutomatically:auto,notes:'',accountStatus:'ACTIVE'});
  }
  setUser(u);return u;
};
S.forgotPassword=email=>{const u=byEmail(email);if(!u)throw new Error('No account with that email');
  u.resetCode=String(Math.floor(100000+Math.random()*900000));u.resetExpires=Date.now()+3600e3;S.save();return u.resetCode;};
S.resetPassword=(email,codeIn,pw)=>{const u=byEmail(email);
  if(!u||u.resetCode!==String(codeIn).trim()||Date.now()>u.resetExpires)throw new Error('Invalid or expired reset code');
  u.passwordHash=hash(pw);delete u.resetCode;delete u.resetExpires;u.updatedAt=now();S.save();};
S.changePassword=(cur,pw)=>{const u=S.user;if(!bc().compareSync(cur,u.passwordHash))throw new Error('Current password is incorrect');
  u.passwordHash=hash(pw);u.updatedAt=now();S.save();};
S.adminResetPassword=(userId,pw)=>{if(!S.isAdmin())throw new Error('Admins only');const u=S.data.users.find(x=>x.id===userId);
  u.passwordHash=hash(pw);u.updatedAt=now();S.save();};
S.updateProfile=p=>{Object.assign(S.user,p,{updatedAt:now()});const ap=S.agentProfile(S.user);
  if(ap){if(p.licenseNumber!=null)ap.licenseNumber=p.licenseNumber;if(p.brokerage!=null)ap.brokerage=p.brokerage;}S.save();};
const readFile=file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
S.uploadAvatar=async file=>{S.user.avatarUrl=await readFile(file);S.save();};
S.isFavorite=lid=>S.user&&S.data.favorites.some(f=>f.userId===S.user.id&&f.listingId===lid);
S.toggleFavorite=lid=>{if(!S.user)throw new Error('Please log in');const i=S.data.favorites.findIndex(f=>f.userId===S.user.id&&f.listingId===lid);
  if(i>=0)S.data.favorites.splice(i,1);else S.data.favorites.push({id:uid(),userId:S.user.id,listingId:lid,createdAt:now()});S.save();};
S.recordView=lid=>{if(!S.user)return;S.data.propertyViews=S.data.propertyViews.filter(v=>!(v.userId===S.user.id&&v.listingId===lid));
  S.data.propertyViews.push({id:uid(),userId:S.user.id,listingId:lid,createdAt:now()});S.save();};
S.agentFor=u=>{const bp=S.buyerProfile(u);if(!bp)return null;const ap=S.data.agentProfiles.find(a=>a.id===bp.agentId);
  return ap&&S.data.users.find(x=>x.id===ap.userId);};
S.clientsOf=u=>{const ap=S.agentProfile(u);if(!ap)return[];return S.data.buyerProfiles.filter(b=>b.agentId===ap.id).map(b=>S.data.users.find(x=>x.id===b.userId)).filter(Boolean);};
S.sendMessage=({toUserId,listingId,kind,body})=>{if(!S.user)throw new Error('Please log in');
  const m={id:uid(),fromUserId:S.user.id,toUserId,listingId:listingId||null,kind:kind||'MESSAGE',body,createdAt:now()};
  S.data.messages.push(m);if(kind==='REQUEST_ACCESS')S.data.propertyRequests.push({id:uid(),userId:S.user.id,listingId,status:'PENDING',createdAt:now()});
  S.save();return m;};
S.myMessages=()=>S.user?S.data.messages.filter(m=>m.fromUserId===S.user.id||m.toUserId===S.user.id):[];
S.submitOffer=f=>{if(!S.user)throw new Error('Please log in');const o={id:uid(),userId:S.user.id,listingId:f.listingId,offerPrice:+f.offerPrice*100,
  downPayment:+f.downPayment*100,monthlyPayment:+f.monthlyPayment*100,notes:f.notes||'',status:'SUBMITTED',createdAt:now()};S.data.offers.push(o);S.save();return o;};
S.requestShowing=f=>{if(!S.user)throw new Error('Please log in');S.data.showings.push({id:uid(),userId:S.user.id,listingId:f.listingId,preferredAt:f.preferredAt,notes:f.notes||'',status:'REQUESTED',createdAt:now()});S.save();};
S.uploadDocument=async(file,{listingId,docType,offerId}={})=>{if(!S.user)throw new Error('Please log in');
  if(file.size>4e6)throw new Error('File too large (max 4 MB in browser storage)');
  const d={id:uid(),userId:S.user.id,listingId:listingId||null,offerId:offerId||null,docType:docType||'GENERAL',name:file.name,size:file.size,dataUrl:await readFile(file),folderSlug:S.user.folderSlug,createdAt:now()};
  S.data.documents.push(d);S.save();return d;};
S.STATUSES=['AVAILABLE','COMING_SOON','PENDING','PENDING_NO_EM','PENDING_EM','CLOSED'];
S.STATUS_LABEL={AVAILABLE:'Available',COMING_SOON:'Coming Soon',PENDING:'Pending',PENDING_NO_EM:'Pending/NoEM',PENDING_EM:'Pending/EM',CLOSED:'Closed'};
S.OFFER_COLOR={ACCEPTED:'#16a34a',REJECTED:'#dc2626',COUNTERED:'#d97706',SUBMITTED:'#64748b'};
S.setListingStatus=(lid,st)=>{if(!S.isAdmin())throw new Error('Admins only');const l=S.listing(lid);l.status=st;l.updatedAt=now();if(st==='CLOSED')l.soldAt=now();S.save();};
S.updateListing=(lid,p)=>{if(!S.isAdmin())throw new Error('Admins only');Object.assign(S.listing(lid),p,{updatedAt:now()});S.save();};
S.respondOffer=(oid,status,c={})=>{if(!S.isAdmin())throw new Error('Admins only');const o=S.data.offers.find(x=>x.id===oid);
  o.status=status;o.respondedAt=now();o.adminNotes=c.adminNotes||'';
  if(status==='COUNTERED'){o.counterPrice=+c.counterPrice*100;o.counterDown=+c.counterDown*100;o.counterMonthly=+c.counterMonthly*100;}
  if(status==='ACCEPTED'){const l=S.listing(o.listingId);if(l)l.status='PENDING_NO_EM';o.docsUnlocked=true;}S.save();};
S.TX_DOCS=[{type:'CLIENT_ID',label:"1. Client's Form of ID"},{type:'PROOF_OF_INCOME',label:'2. Proof of Income'}];
S.money=c=>c==null?'—':'$'+Math.round(c/100).toLocaleString('en-US');
})();
