const letter=document.getElementById('letter'),pause=document.getElementById('pause');
let generation=0,paused=false,finished=false,follow=true;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function element(b,i){const e=document.createElement(b.heading?(i===0?'h1':'h2'):'p');letter.append(e);return e}
let changingPhotos=false;
let photoGroup=0,photoElapsed=0,photoDuration=600000,photoRunning=false,photoClock=performance.now();
const photoGroups=Math.ceil(memories.length/2);
function showPhotoGroup(group){photoGroup=Math.max(0,Math.min(photoGroups-1,group));const grid=document.getElementById('photo-grid');grid.replaceChildren();memories.slice(photoGroup*2,photoGroup*2+2).forEach((p,i)=>{const img=document.createElement('img');img.src=p.src;img.alt=p.alt;img.decoding='async';img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label',p.alt+'. Mostrar las siguientes fotos');img.style.animationDelay=`${i*260}ms`;grid.append(img)});document.getElementById('photo-count').textContent=`${photoGroup*2+1}–${Math.min(memories.length,photoGroup*2+2)} / ${memories.length}`;document.getElementById('previous-photos').disabled=photoGroup===0;document.getElementById('next-photos').disabled=photoGroup===photoGroups-1;
 memories.slice((photoGroup+1)*2,(photoGroup+2)*2).forEach(p=>{const img=new Image();img.src=p.src});}
async function transitionPhotoGroup(group,manual=false){
 if(changingPhotos)return;
 changingPhotos=true;const g=generation;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const current=[...document.querySelectorAll('#photo-grid img')];
 try{
 if(!reduced)await Promise.all(current.map((img,i)=>img.animate([{opacity:1,transform:`rotate(${i?5:-4}deg) scale(1)`},{opacity:0,transform:`translateY(-14px) rotate(${i?10:-10}deg) scale(.94)`}],{duration:260,fill:'forwards',easing:'ease-in'}).finished.catch(()=>{})));
 if(g!==generation)return;
 showPhotoGroup(group);
 if(manual){photoElapsed=photoGroup*photoDuration/photoGroups;photoClock=performance.now();photoRunning=true;}
 if(!reduced)await Promise.all([...document.querySelectorAll('#photo-grid img')].map((img,i)=>img.animate([{opacity:0,transform:`translateY(18px) rotate(${i?10:-10}deg) scale(.94)`},{opacity:1,transform:`rotate(${i?5:-4}deg) scale(1)`}],{duration:650,delay:i*80,easing:'cubic-bezier(.22,1,.36,1)'}).finished.catch(()=>{})));
 }finally{changingPhotos=false;}
}
function changePhotoManually(group){return transitionPhotoGroup(group,true)}
function startPhotos(duration){photoElapsed=0;photoDuration=duration;photoRunning=true;photoClock=performance.now();showPhotoGroup(0)}
setInterval(()=>{const now=performance.now(),delta=now-photoClock;photoClock=now;if(!photoRunning||paused||document.hidden||changingPhotos)return;photoElapsed+=delta;const group=Math.min(photoGroups-1,Math.floor(photoElapsed/photoDuration*photoGroups));if(group!==photoGroup)transitionPhotoGroup(group);if(photoElapsed>=photoDuration)photoRunning=false},250);
document.getElementById('previous-photos').onclick=()=>changePhotoManually(photoGroup-1);
document.getElementById('next-photos').onclick=()=>changePhotoManually(photoGroup+1);
let followFrame=0,followLastTime=0;
function animateReadingFollow(time){
 followFrame=0;
 if(!follow){followLastTime=0;return}
 const target=Math.max(0,document.documentElement.scrollHeight-innerHeight);
 const distance=target-window.scrollY;
 const dt=followLastTime?Math.min(50,time-followLastTime):16;
 followLastTime=time;
 if(Math.abs(distance)>1){
  const amount=1-Math.exp(-dt/180);
  window.scrollTo({top:window.scrollY+distance*amount,behavior:'instant'});
  followFrame=requestAnimationFrame(animateReadingFollow);
 }else{window.scrollTo({top:target,behavior:'instant'});followLastTime=0;}
}
function scrollToWriting(e){if(follow&&!followFrame)followFrame=requestAnimationFrame(animateReadingFollow)}
async function sleep(ms,g){let elapsed=0;while(elapsed<ms){if(g!==generation)return false;const slice=Math.min(20,ms-elapsed);await wait(slice);if(!paused)elapsed+=slice}while(paused&&g===generation)await wait(20);return g===generation}
function makeWritingPlan(text,heading){
 const plan=[],tokens=text.match(/\S+\s*/gu)||[];let wordIndex=0,lastError=-6,lastDoubt=-5;
 for(const token of tokens){const word=token.trimEnd(),space=token.slice(word.length);const letters=word.match(/[\p{L}]/gu)||[];const long=letters.length>=9;
  const typo=!heading&&letters.length>=4&&wordIndex-lastError>=5&&(Math.random()<.24||wordIndex-lastError>=12);
  const stumble=!heading&&long&&!typo&&Math.random()<.65;
  const doubt=!heading&&wordIndex-lastDoubt>=4&&Math.random()<.20;
  if(doubt){plan.push({wait:700+Math.random()*1500});lastDoubt=wordIndex}
  const at=typo||stumble?Math.min(word.length-2,Math.max(2,Math.floor(word.length*.5))):-1;
  for(let k=0;k<word.length;k++){
   if(k===at&&typo){const wrong=word[k]==='a'?'s':word[k]==='e'?'r':word[k]==='o'?'i':'a';
    plan.push({add:wrong,wait:30},{add:word[k+1],wait:30},{wait:650+Math.random()*850},{erase:1,wait:100+Math.random()*90},{erase:1,wait:160},{wait:350+Math.random()*550});lastError=wordIndex;
   }else if(k===at&&stumble){const fragment=word.slice(Math.max(0,k-2),k);plan.push({wait:450+Math.random()*550},{erase:fragment.length,wait:250});for(const c of fragment)plan.push({add:c,wait:35+Math.random()*35});plan.push({wait:300+Math.random()*400})}
   plan.push({add:word[k],wait:heading?35+Math.random()*30:16+Math.random()*25});
  }
  if(space)plan.push({add:space,wait:90+Math.random()*140});
  if(/[.!?]$/.test(word))plan.push({wait:1100+Math.random()*1300});else if(/[,;:]$/.test(word))plan.push({wait:450+Math.random()*750});
  wordIndex++;
 }
 return plan;
}
async function start(){const g=++generation;letter.replaceChildren();finished=false;paused=false;follow=true;pause.textContent='Pausar';pause.disabled=false;window.scrollTo(0,0);const plans=blocks.map(b=>makeWritingPlan(b.text,b.heading));startPhotos(plans.flat().reduce((sum,s)=>sum+(s.wait||0),0)+blocks.length*3000);for(let i=0;i<blocks.length;i++){const b=blocks[i],e=element(b,i);e.classList.add('active');
 for(const step of plans[i]){if(g!==generation)return;if(step.add)e.textContent+=step.add;if(step.erase)e.textContent=e.textContent.slice(0,-step.erase);scrollToWriting(e);if(!await sleep(step.wait||0,g))return}
 e.classList.remove('active');if(!await sleep(b.heading?1100:1900+Math.random()*1500,g))return}finished=true;pause.disabled=true;pause.textContent='Terminada'}
pause.onclick=()=>{if(finished)return;paused=!paused;pause.textContent=paused?'Continuar':'Pausar'};
document.getElementById('all').onclick=()=>{generation++;letter.replaceChildren();blocks.forEach((b,i)=>element(b,i).textContent=b.text);finished=true;paused=false;pause.disabled=true;pause.textContent='Terminada';if(!photoRunning)startPhotos(photoGroups*16000)};
document.getElementById('restart').onclick=start;
let lastTouchY=null;
window.addEventListener('wheel',e=>{if(e.deltaY<0)follow=false},{passive:true});
window.addEventListener('touchstart',e=>{lastTouchY=e.touches[0]?.clientY??null},{passive:true});
window.addEventListener('touchmove',e=>{const y=e.touches[0]?.clientY;if(lastTouchY!==null&&y>lastTouchY+2)follow=false;lastTouchY=y??null},{passive:true});
window.addEventListener('keydown',e=>{if(['ArrowUp','PageUp','Home'].includes(e.key))follow=false});
window.addEventListener('scroll',()=>{const bottom=document.documentElement.scrollHeight-innerHeight;if(window.scrollY>=bottom-3){follow=true;scrollToWriting()}},{passive:true});
if(matchMedia('(prefers-reduced-motion: reduce)').matches)document.getElementById('all').click();else start();

function setupSpotify(url){
 let parsed;try{parsed=new URL(url)}catch{return false}
 const match=parsed.pathname.match(/^\/playlist\/([a-zA-Z0-9]{22})\/?$/);
 if(parsed.protocol!=='https:'||parsed.hostname!=='open.spotify.com'||!match)return false;
 const panel=document.getElementById('music'),frame=document.createElement('iframe');frame.src=`https://open.spotify.com/embed/playlist/${match[1]}?theme=0`;frame.title='Nuestra playlist en Spotify';frame.width='100%';frame.height='352';frame.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';frame.loading='lazy';frame.setAttribute('allowfullscreen','');document.getElementById('spotify-player').replaceChildren(frame);panel.hidden=false;return true;
}
setupSpotify(spotifyPlaylistUrl);


const memoryPanel=document.getElementById('memories');
let incorporationAnimation;
function updateFloatingMemories(){
  const title=document.querySelector('#letter h1');
 const titleTop=title?title.getBoundingClientRect().top+window.scrollY:Infinity;

 // Reserve the compact display before the sticky controls reach the title.
 const trigger=Math.max(0,titleTop-404-48);
 const floating=innerWidth<=760&&window.scrollY>trigger;
 if(memoryPanel.classList.contains('floating')===floating)return;
 const grid=document.getElementById('photo-grid'),before=grid.getBoundingClientRect();
 incorporationAnimation?.cancel();memoryPanel.classList.toggle('floating',floating);
 const after=grid.getBoundingClientRect();
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&after.width&&after.height){
 incorporationAnimation=grid.animate([{transform:`translate(${before.left-after.left}px,${before.top-after.top}px) scale(${before.width/after.width},${before.height/after.height})`},{transform:'translate(0,0) scale(1)'}],{duration:700,easing:'cubic-bezier(.22,1,.36,1)'});
 }
}
function advanceSmallPhotos(){
 if(!memoryPanel.classList.contains('floating'))return;
 return changePhotoManually((photoGroup+1)%photoGroups);
}
document.getElementById('photo-grid').addEventListener('click',e=>{if(e.target.matches('img'))advanceSmallPhotos()});
document.getElementById('photo-grid').addEventListener('keydown',e=>{if(e.target.matches('img')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();advanceSmallPhotos()}});
window.addEventListener('scroll',updateFloatingMemories,{passive:true});window.addEventListener('resize',updateFloatingMemories);updateFloatingMemories();


const musicPanel=document.getElementById('music');
const musicSummary=musicPanel.querySelector('summary');
let musicAnimation=null,musicExpanded=false;
musicSummary.addEventListener('click',event=>{
 event.preventDefault();
 const from=musicPanel.getBoundingClientRect();
 musicAnimation?.cancel();
 musicExpanded=!musicExpanded;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const content=[musicPanel.querySelector('#spotify-player'),musicPanel.querySelector('.spotify-links')];
 content.forEach(e=>e.getAnimations().forEach(a=>a.cancel()));
 if(musicExpanded){
  musicPanel.open=true;
  const to=musicPanel.getBoundingClientRect();
  if(!reduced){musicAnimation=musicPanel.animate([{height:from.height+'px',width:from.width+'px'},{height:to.height+'px',width:to.width+'px'}],{duration:450,easing:'cubic-bezier(.22,1,.36,1)'});content.forEach(e=>e.animate([{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,delay:80,fill:'backwards',easing:'ease-out'}));}
 }else{
  if(reduced){musicPanel.open=false;return}
    musicPanel.open=false;
  const compact=musicPanel.getBoundingClientRect();
  musicPanel.open=true;
  const compactHeight=compact.height;
  const compactWidth=compact.width;
  musicAnimation=musicPanel.animate([{height:from.height+'px',width:from.width+'px'},{height:compactHeight+'px',width:Math.min(compactWidth,from.width)+'px'}],{duration:380,easing:'cubic-bezier(.4,0,.2,1)'});
  content.forEach(e=>e.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-8px)'}],{duration:220,fill:'forwards',easing:'ease-in'}));
  musicAnimation.finished.then(()=>{if(!musicExpanded){musicPanel.open=false;content.forEach(e=>e.getAnimations().forEach(a=>a.cancel()))}}).catch(()=>{});
 }
});





