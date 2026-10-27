'use strict';
// Hockey Rush v1: Blaze Foxes (player, attack +X) vs Frost Owls (CPU, attack -X). World units = rink px, origin centre ice.
const IW=600,IH=260,CR=100,GL=540,MOUTH=20,GAME_LEN=180;
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const IMG={};for(const n of ['rink','nets','skater-foxes','skater-owls','goalie-foxes','goalie-owls','referee','puck','crowd']){IMG[n]=new Image();IMG[n].src='art/'+n+'.png'}
const FPS={idle:4,skate:12,shoot:14,pass:12,deke:10,poke_check:12,hit:10,fallen:4,butterfly_save:12,glove_save:12,blocker_save:12,spin:16,goal:8};
const NF={idle:2,skate:6,shoot:4,pass:3,deke:4,poke_check:3,hit:2,fallen:2,butterfly_save:3,glove_save:3,blocker_save:3};
function spr(sheet,key,x,y,a,s){const f=ATLAS[sheet+'/'+key];if(!f)return;s=s||1;ctx.save();ctx.translate(x,y);if(a)ctx.rotate(a);
 ctx.drawImage(IMG[sheet],f[0],f[1],f[2],f[3],(f[4]-f[6]/2)/2*s,(f[5]-f[7]/2)/2*s,f[2]/2*s,f[3]/2*s);ctx.restore()}
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>v<a?a:v>b?b:v,hyp=Math.hypot;
const angDiff=(a,b)=>{let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d};
// ---------- state ----------
let G;
function newGame(){G={t:GAME_LEN,score:[0,0],phase:'faceoff',pt:1.6,cheer:0,cheerTeam:0,over:false,flash:'',stats:{goals:0,pokes:0,hits:0,switches:0,passes:0,shots:0,saves:0,dekes:0},
 puck:{x:0,y:0,vx:0,vy:0,owner:null,lock:0,lockP:null,shot:0,checked:false,last:null},pl:[],ctrl:null,ref:{x:0,y:-60,vx:0,vy:0,a:Math.PI/2,an:'idle',at:0}};
 for(let t=0;t<2;t++){for(let i=0;i<3;i++)G.pl.push(mk(t,'S',i));G.pl.push(mk(t,'G',0))}
 G.ctrl=G.pl[0];faceoff();window.G=G}
function mk(team,role,i){return{team,role,i,x:0,y:0,vx:0,vy:0,a:0,an:'idle',at:0,once:0,stun:0,cd:0,deke:0,lunge:0,hp:0,think:0,tx:0,ty:0}}
function dir(t){return t===0?1:-1}
function faceoff(){const P=G.puck;Object.assign(P,{x:0,y:0,vx:0,vy:0,owner:null,lock:0,lockP:null,checked:false});
 for(const p of G.pl){const d=dir(p.team);p.vx=p.vy=0;p.stun=0;p.once=0;p.an='idle';
  if(p.role==='G'){p.x=-d*(GL-16);p.y=0;p.a=d>0?0:Math.PI}
  else{const pos=[[-22,0],[-90,-90],[-90,90]][p.i];p.x=pos[0]*d;p.y=pos[1];p.a=d>0?0:Math.PI}}
 G.ref.x=0;G.ref.y=-70;G.phase='faceoff';G.pt=1.6;G.flash='FACEOFF';G.ctrl=G.pl[0]}
// ---------- input ----------
const stick={id:null,ox:0,oy:0,x:0,y:0,dx:0,dy:0};const btn={1:0,2:0,3:0};
function offence(){const o=G.puck.owner;return o&&o.team===0}
function setLabels(){const of=offence();b1.textContent=of?'SHOOT':'POKE\nCHECK';b2.textContent=of?'PASS':'SWITCH';b3.textContent=of?'DEKE':'HIT';
 b1.style.whiteSpace=b2.style.whiteSpace='pre-line'}
const b1=document.getElementById('b1'),b2=document.getElementById('b2'),b3=document.getElementById('b3');
for(const [el,n] of [[b1,1],[b2,2],[b3,3]]){el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();el.classList.add('on');press(n)});
 for(const ev of ['pointerup','pointercancel','pointerleave'])el.addEventListener(ev,()=>el.classList.remove('on'))}
cv.addEventListener('pointerdown',e=>{if(stick.id!==null||e.clientX>innerWidth*0.55)return;stick.id=e.pointerId;stick.ox=stick.x=e.clientX;stick.oy=stick.y=e.clientY;upd(e)});
addEventListener('pointermove',e=>{if(e.pointerId===stick.id){stick.x=e.clientX;stick.y=e.clientY;upd(e)}});
for(const ev of ['pointerup','pointercancel'])addEventListener(ev,e=>{if(e.pointerId===stick.id){stick.id=null;stick.dx=stick.dy=0}});
function upd(){let dx=stick.x-stick.ox,dy=stick.y-stick.oy,l=hyp(dx,dy),R=50;if(l>R){stick.ox=stick.x-dx/l*R;stick.oy=stick.y-dy/l*R;dx=dx/l*R;dy=dy/l*R}stick.dx=dx/R;stick.dy=dy/R}
const keys={};addEventListener('keydown',e=>{keys[e.key]=1;if(e.key==='j')press(1);if(e.key==='k')press(2);if(e.key==='l')press(3)});addEventListener('keyup',e=>keys[e.key]=0);
function press(n){if(!G||G.phase!=='play')return;const p=G.ctrl;if(p.stun>0)return;
 if(offence()){if(G.puck.owner!==p)return; if(n===1)shoot(p);else if(n===2)pass(p,true);else deke(p)}
 else{if(n===1)poke(p);else if(n===2)switchP();else hit(p)}}
// ---------- actions ----------
function play(p,an){p.an=an;p.at=0;p.once=NF[an]/FPS[an]}
function stickPt(p){return[p.x+Math.cos(p.a)*15,p.y+Math.sin(p.a)*15]}
function release(p,vx,vy){const P=G.puck;P.owner=null;P.vx=vx;P.vy=vy;P.lock=0.3;P.lockP=p;P.checked=false;P.last=p}
function shoot(p){const d=dir(p.team),gx=d*GL,gy=0;const opp=G.pl.find(q=>q.team!==p.team&&q.role==='G');
 let ty=opp.y>0?-13:13;ty+=rnd(-5,5);let a=Math.atan2(ty-p.y,gx-p.x);
 if(p===G.ctrl&&hyp(stick.dx,stick.dy)>0.5){const sa=Math.atan2(stick.dy,stick.dx);if(Math.abs(angDiff(sa,a))<0.9)a+=angDiff(a,sa)*0.35}
 const sp=p.team===0?620:560;p.a=a;release(p,Math.cos(a)*sp,Math.sin(a)*sp);G.puck.shot=1;play(p,'shoot');if(p===G.ctrl)G.stats.shots++}
function pass(p,human){const mates=G.pl.filter(q=>q.team===p.team&&q!==p&&q.role==='S');let face=p.a;
 if(human&&hyp(stick.dx,stick.dy)>0.4)face=Math.atan2(stick.dy,stick.dx);
 let best=null,bs=-1e9;for(const m of mates){const a=Math.atan2(m.y-p.y,m.x-p.x),dd=hyp(m.x-p.x,m.y-p.y);
  let s=-Math.abs(angDiff(face,a))*120-Math.abs(dd-160)*0.2;for(const o of G.pl)if(o.team!==p.team&&segDist(o,p,m)<18)s-=80;if(s>bs){bs=s;best=m}}
 if(!best)return;const lx=best.x+best.vx*0.3,ly=best.y+best.vy*0.3,a=Math.atan2(ly-p.y,lx-p.x),sp=clamp(hyp(lx-p.x,ly-p.y)*1.6+180,300,520);
 p.a=a;release(p,Math.cos(a)*sp,Math.sin(a)*sp);G.puck.shot=0;play(p,'pass');if(p===G.ctrl)G.stats.passes++}
function segDist(o,a,b){const vx=b.x-a.x,vy=b.y-a.y,l=vx*vx+vy*vy||1,t=clamp(((o.x-a.x)*vx+(o.y-a.y)*vy)/l,0,1);return hyp(a.x+vx*t-o.x,a.y+vy*t-o.y)}
function deke(p){if(p.cd>0)return;p.cd=1;p.deke=0.7;const s=Math.random()<0.5?1:-1,a=p.a+s*1.1;p.vx+=Math.cos(a)*140;p.vy+=Math.sin(a)*140;play(p,'deke');if(p===G.ctrl)G.stats.dekes++}
function poke(p){if(p.cd>0)return;p.cd=0.6;play(p,'poke_check');const P=G.puck,[sx,sy]=[p.x+Math.cos(p.a)*26,p.y+Math.sin(p.a)*26];
 if(hyp(P.x-sx,P.y-sy)<24){const o=P.owner;if(o&&o.team===p.team)return;if(o&&o.deke>0)return;
  if(!o||Math.random()<(p.team===0?0.75:0.45)){if(o){o.cd=0.5}P.owner=null;P.vx=Math.cos(p.a)*120+rnd(-40,40);P.vy=Math.sin(p.a)*120+rnd(-40,40);P.lock=0.2;P.lockP=o;if(p===G.ctrl&&o)G.stats.pokes++;}}}
function hit(p){if(p.cd>0)return;p.cd=0.9;p.lunge=0.25;p.vx+=Math.cos(p.a)*170;p.vy+=Math.sin(p.a)*170;play(p,'hit')}
function switchP(){const P=G.puck;let best=null,bd=1e9;for(const q of G.pl)if(q.team===0&&q.role==='S'&&q!==G.ctrl){const d=hyp(q.x-P.x,q.y-P.y);if(d<bd){bd=d;best=q}}
 if(best){G.ctrl=best;G.stats.switches++}}
// ---------- physics ----------
function boards(o,r,bounce){const hx=IW-CR,hy=IH-CR;let nx=0,ny=0,pen=0;
 if(Math.abs(o.x)>hx&&Math.abs(o.y)>hy){const cx=Math.sign(o.x)*hx,cy=Math.sign(o.y)*hy,dx=o.x-cx,dy=o.y-cy,d=hyp(dx,dy);if(d>CR-r){nx=dx/d;ny=dy/d;pen=d-(CR-r)}}
 else if(Math.abs(o.x)>IW-r){nx=Math.sign(o.x);pen=Math.abs(o.x)-(IW-r)}else if(Math.abs(o.y)>IH-r){ny=Math.sign(o.y);pen=Math.abs(o.y)-(IH-r)}
 if(pen>0){o.x-=nx*pen;o.y-=ny*pen;const vn=o.vx*nx+o.vy*ny;if(vn>0){o.vx-=(1+bounce)*vn*nx;o.vy-=(1+bounce)*vn*ny}return true}return false}
function netBox(o,r){for(const s of[-1,1]){const x0=s*GL,x1=s*(GL+24);const lo=Math.min(x0,x1),hi=Math.max(x0,x1);
 if(o.x>lo-r&&o.x<hi+r&&Math.abs(o.y)<MOUTH+4+r){if(o===G.puck&&Math.abs(o.y)<MOUTH&&Math.abs(o.x)<GL+12)continue;
  const px=s>0?(o.x<GL?lo-r-o.x:hi+r-o.x):(o.x>-GL?hi+r-o.x:lo-r-o.x),py=(o.y>0?MOUTH+4+r-o.y:-(MOUTH+4+r)-o.y);
  if(Math.abs(px)<Math.abs(py)){o.x+=px;o.vx=-o.vx*0.4}else{o.y+=py;o.vy=-o.vy*0.4}}}}
// ---------- AI ----------
function aiSkater(p,dt){if(p===G.ctrl)return;const P=G.puck,d=dir(p.team),own=P.owner,mine=own&&own.team===p.team;
 p.think-=dt;let tx=p.tx,ty=p.ty,spd=p.team===0?175:160;
 if(own===p){tx=d*(GL-60);ty=clamp(-p.y*0.3,-60,60);const dist=hyp(d*GL-p.x,p.y);
  const press=G.pl.some(o=>o.team!==p.team&&o.role==='S'&&hyp(o.x-p.x,o.y-p.y)<34);
  if(p.think<0){p.think=rnd(0.25,0.5);if(dist<230&&Math.abs(p.y)<150&&Math.random()<0.55)shoot(p);else if(press&&Math.random()<0.4)pass(p);else if(press&&Math.random()<0.25)deke(p)}}
 else if(mine){const lane=[0,-110,110][p.i];tx=clamp(own.x+d*120,-IW+60,IW-60);ty=lane||(own.y>0?-80:80)}
 else{ // defend / loose puck
  const chasers=G.pl.filter(q=>q.team===p.team&&q.role==='S').sort((a,b)=>hyp(a.x-P.x,a.y-P.y)-hyp(b.x-P.x,b.y-P.y));
  if(chasers[0]===p||(p===chasers[1]&&!own)){tx=P.x+P.vx*0.15;ty=P.y+P.vy*0.15;spd*=1.05;
   if(own&&p.think<0){p.think=rnd(0.4,0.8);const dd=hyp(own.x-p.x,own.y-p.y);if(dd<34){Math.random()<(p.team===1?0.35:0.5)?hit(p):poke(p)}}}
  else{tx=(P.x-d*GL)*0.5-d*GL*0.0;tx=P.x-d*110;ty=P.y*0.5+[0,-70,70][p.i]*0.6;tx=clamp(tx,-IW+60,IW-60)}}
 if(p===G.ctrl&&p.team===0)return;steer(p,tx,ty,spd,dt);p.tx=tx;p.ty=ty}
function steer(p,tx,ty,spd,dt){const dx=tx-p.x,dy=ty-p.y,l=hyp(dx,dy);if(l<6){accel(p,0,0,spd,dt);return}const k=Math.min(1,l/40);accel(p,dx/l*k,dy/l*k,spd,dt)}
function accel(p,ix,iy,spd,dt){const tvx=ix*spd,tvy=iy*spd,a=Math.min(1,dt*(p.lunge>0?1:4));p.vx+=(tvx-p.vx)*a;p.vy+=(tvy-p.vy)*a;
 if(hyp(ix,iy)>0.15){const ta=Math.atan2(iy,ix);p.a+=angDiff(p.a,ta)*Math.min(1,dt*10)}}
function goalie(p,dt){const P=G.puck,d=dir(p.team),nx=-d*GL;let ty=clamp(P.y*0.25,-16,16),tx=nx+d*12;
 if(P.vx*d<-200&&!P.owner){const t=(nx+d*12-P.x)/P.vx;if(t>0&&t<0.6)ty=clamp(P.y+P.vy*t,-20,20)}
 p.x+=(tx-p.x)*Math.min(1,dt*6);p.y+=clamp(ty-p.y,-130*dt,130*dt);p.a=d>0?0:Math.PI;
 // save check
 const dd=hyp(P.x-p.x,P.y-p.y);
 if(!P.owner&&dd<20&&P.vx*d<0&&!P.checked){P.checked=true;const sp=hyp(P.vx,P.vy);let ch=clamp(0.8-sp/1500,0.3,0.8);if(p.team===1)ch-=0.08;
  if(Math.random()<ch){P.vx=-P.vx*0.35+d*60;P.vy=rnd(-160,160);P.x=p.x+d*14;const rel=(P.y-p.y)*(d);play(p,Math.abs(P.y-p.y)<5?'butterfly_save':(rel<0?'glove_save':'blocker_save'));if(p.team===1)G.stats.saves++;G.flash='SAVE!';G.flt=0.8}}
 if(dd>40)P.checked=P.checked&&dd<60;
 if(!P.owner&&dd<16&&hyp(P.vx,P.vy)<90){P.vx=d*rnd(150,220);P.vy=(P.y>=p.y?1:-1)*rnd(120,220);P.lock=0.2;P.lockP=p}}
// ---------- update ----------
function update(dt){if(!G||G.over)return;const P=G.puck;
 if(G.flt>0){G.flt-=dt;if(G.flt<=0&&G.phase==='play')G.flash=''}
 if(G.cheer>0)G.cheer-=dt;
 if(G.phase==='faceoff'){G.pt-=dt;if(G.pt<=0){G.phase='play';G.flash='';P.vy=rnd(-30,30);P.vx=rnd(-10,10)}}
 else if(G.phase==='goal'){G.pt-=dt;if(G.pt<=0){if(G.t<=0)end();else faceoff()}}
 else{G.t-=dt;if(G.t<=0){G.t=0;G.phase='goal';G.pt=1.5;G.flash='FINAL HORN';return}}
 const live=G.phase==='play';
 for(const p of G.pl){p.at+=dt;if(p.once>0){p.once-=dt;if(p.once<=0)p.an='idle'}p.cd=Math.max(0,p.cd-dt);p.deke=Math.max(0,p.deke-dt);p.lunge=Math.max(0,p.lunge-dt);
  if(p.role==='G'){if(live)goalie(p,dt);continue}
  if(p.stun>0){p.stun-=dt;p.vx*=0.95;p.vy*=0.95;if(p.stun<=0)p.an='idle'}
  else if(live){aiSkater(p,dt);if(p===G.ctrl){let ix=stick.dx,iy=stick.dy;if(keys.ArrowLeft||keys.a)ix=-1;if(keys.ArrowRight||keys.d)ix=1;if(keys.ArrowUp||keys.w)iy=-1;if(keys.ArrowDown||keys.s)iy=1;
    const l=hyp(ix,iy);if(l>1){ix/=l;iy/=l}accel(p,ix,iy,p.deke>0?210:185,dt)}}
  else{p.vx*=0.9;p.vy*=0.9}
  p.x+=p.vx*dt;p.y+=p.vy*dt;boards(p,12,0.2);netBox(p,12);
  if(p.once<=0&&p.stun<=0)p.an=hyp(p.vx,p.vy)>25?'skate':'idle'}
 // skater collisions + hits
 const S=G.pl.filter(p=>p.role==='S');
 for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){const a=S[i],b=S[j],dx=b.x-a.x,dy=b.y-a.y,d=hyp(dx,dy)||1;
  for(const [h,v] of [[a,b],[b,a]])if(h.lunge>0&&h.team!==v.team&&v.stun<=0&&d<32&&v.deke<=0){v.stun=1.2;play(v,'fallen');v.once=1.2;v.vx=h.vx*0.7;v.vy=h.vy*0.7;h.lunge=0;
   if(P.owner===v){P.owner=null;P.vx=h.vx*0.8+rnd(-60,60);P.vy=h.vy*0.8+rnd(-60,60);P.lock=0.25;P.lockP=v}if(h===G.ctrl)G.stats.hits++;G.flash='BIG HIT!';G.flt=0.8}
  if(d<24){const o=(24-d)/2;a.x-=dx/d*o;a.y-=dy/d*o;b.x+=dx/d*o;b.y+=dy/d*o}}
 // puck
 if(P.lock>0)P.lock-=dt;
 if(P.owner){const o=P.owner;const [sx,sy]=stickPt(o);P.x=sx;P.y=sy;P.vx=o.vx;P.vy=o.vy;if(o.stun>0)P.owner=null}
 else{const steps=3;for(let k=0;k<steps;k++){P.x+=P.vx*dt/steps;P.y+=P.vy*dt/steps;if(live)checkGoal();if(G.phase!=='play'&&live)break;if(boards(P,4,0.6))P.shot=0;netBox(P,4)}
  const f=Math.pow(0.55,dt);P.vx*=f;P.vy*=f;
  if(live)for(const p of S){if(p.stun>0)continue;if(P.lock>0&&P.lockP===p)continue;const [sx,sy]=stickPt(p);
   const sp=hyp(P.vx,P.vy);if(hyp(P.x-sx,P.y-sy)<(sp>450?9:15)){P.owner=p;P.shot=0;if(p.team===0&&G.ctrl!==p)G.ctrl=p;break}}}
 // ref follows play along top
 const R=G.ref,rtx=clamp(P.x*0.8,-450,450),rty=G.phase==='faceoff'?-70:-215;R.vx=(rtx-R.x)*2;R.vy=(rty-R.y)*2;R.x+=R.vx*dt;R.y+=R.vy*dt;R.at+=dt;R.an=hyp(R.vx,R.vy)>20?'skate':'idle';if(R.an==='skate')R.a=Math.atan2(R.vy,R.vx);
 setLabels()}
function checkGoal(){const P=G.puck;if(Math.abs(P.y)<MOUTH&&Math.abs(P.x)>GL&&Math.abs(P.x)<GL+22){const team=P.x>0?0:1;G.score[team]++;G.phase='goal';G.pt=2.8;G.cheer=3.5;G.cheerTeam=team;G.netGoal=P.x>0?'right':'left';G.goalT=0;
 G.flash=team===0?'FOXES SCORE!':'OWLS SCORE!';P.vx*=0.2;P.vy*=0.2;if(team===0)G.stats.goals++;G.stats.lastScorer=P.last===G.ctrl?'ctrl':'other';buzz()}}
function buzz(){try{navigator.vibrate&&navigator.vibrate(120)}catch(e){}}
function end(){G.over=true;G.phase='over';const [a,b]=G.score;document.getElementById('res').textContent=a>b?`FOXES WIN ${a}–${b}!`:a<b?`OWLS WIN ${b}–${a}`:`TIE GAME ${a}–${b}`;document.getElementById('over').style.display='flex'}
// ---------- render ----------
let W=0,H=0,DPR=1,cam={x:0,y:0};
function resize(){DPR=Math.min(devicePixelRatio||1,3);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR}addEventListener('resize',resize);resize();
function draw(){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#0a1426';ctx.fillRect(0,0,cv.width,cv.height);if(!G)return;
 const z=Math.max(H/350,W/680),vw=W/z,vh=H/z,P=G.puck;
 const tx=clamp(P.x,-IW-60+vw/2,IW+60-vw/2),ty=clamp(P.y,-IH-100+vh/2,IH+100-vh/2);cam.x+=(tx-cam.x)*0.12;cam.y+=(ty-cam.y)*0.12;
 ctx.setTransform(DPR*z,0,0,DPR*z,DPR*(W/2-cam.x*z),DPR*(H/2-cam.y*z));ctx.imageSmoothingQuality='high';
 // crowd
 const cf=G.cheer>0?('cheer-'+(G.cheerTeam===0?'foxes':'owls')):'neutral',fi=Math.floor(performance.now()/1000*(G.cheer>0?4:2))%2,ck=cf+'_0'+fi;
 for(let x=-704;x<=704;x+=128){spr('crowd',ck,x,-322);spr('crowd',ck,x,322,Math.PI)}
 for(let y=-256;y<=256;y+=128){spr('crowd',ck,-662,y,Math.PI/2);spr('crowd',ck,662,y,-Math.PI/2)}
 spr('rink','static_00',0,0);
 const gk=G.phase==='goal'&&G.netGoal?(G.netGoal+'_goal_0'+(Math.floor(performance.now()/125)%2)):null;
 spr('nets',G.netGoal&&gk&&G.netGoal==='left'?gk:'left_idle_00',-GL-8,0);spr('nets',G.netGoal&&gk&&G.netGoal==='right'?gk:'right_idle_00',GL+8,0);
 // control ring
 const c=G.ctrl;ctx.strokeStyle='#ffd23a';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(c.x,c.y,17,17,0,0,Math.PI*2);ctx.stroke();
 const R=G.ref;spr('referee',fr(R),R.x,R.y,R.a);
 const L=G.pl.slice().sort((a,b)=>a.y-b.y);
 for(const p of L){const sh=(p.role==='G'?'goalie-':'skater-')+(p.team===0?'foxes':'owls');spr(sh,fr(p),p.x,p.y,p.a)}
 spr('puck',P.owner||hyp(P.vx,P.vy)<20?'idle_00':'spin_0'+(Math.floor(performance.now()/60)%4),P.x,P.y);
 // control arrow when off-screen not needed; draw stick
 ctx.setTransform(DPR,0,0,DPR,0,0);
 if(stick.id!==null){ctx.globalAlpha=0.5;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(stick.ox,stick.oy,50,0,7);ctx.fill();ctx.globalAlpha=0.8;ctx.beginPath();ctx.arc(stick.ox+stick.dx*50,stick.oy+stick.dy*50,24,0,7);ctx.fill();ctx.globalAlpha=1}
 else{ctx.globalAlpha=0.25;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(90,H-90,50,0,7);ctx.stroke();ctx.globalAlpha=1}
 document.getElementById('s0').textContent=G.score[0];document.getElementById('s1').textContent=G.score[1];
 const t=Math.ceil(G.t);document.getElementById('clk').textContent=Math.floor(t/60)+':'+String(t%60).padStart(2,'0');
 document.getElementById('msg').textContent=G.over?'':G.phase==='faceoff'?(G.pt>0.6?'FACEOFF':'GO!'):G.flash||''}
function fr(p){let an=p.an,n=NF[an]||2;if(p.role==='G'&&!['idle','butterfly_save','glove_save','blocker_save'].includes(an))an='idle';n=NF[an];
 if(p===G.ref){n=an==='skate'?6:2}let i=Math.floor(p.at*FPS[an]);i=(p.once>0||an==='fallen')?Math.min(i,n-1):i%n;return an+'_0'+i}
let last=0;function loop(t){const dt=Math.min(0.05,(t-last)/1000||0);last=t;if(G&&!G.paused)update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
function start(){document.getElementById('start').style.display='none';document.getElementById('over').style.display='none';newGame();try{document.documentElement.requestFullscreen&&!document.fullscreenElement&&document.documentElement.requestFullscreen().catch(()=>{})}catch(e){}}
document.getElementById('go').onclick=start;document.getElementById('again').onclick=start;
