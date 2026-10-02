/* MS ZODIAC APPLICATION LAYER
 * UI logic, calculations, interactions and rendering.
 */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);};
var $$=function(sel){return document.querySelectorAll(sel);};
var today=new Date();
var todayISO=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
var AR_MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
var MIN_DATE='1900-01-01';

function parseISO(iso){if(!iso)return null;var m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;var d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return (d.getUTCFullYear()===+m[1]&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[3])?d:null;}
function toISO(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
function inRange(m,d,sm,sd,em,ed){var v=m*100+d,s=sm*100+sd,e=em*100+ed;return s<=e?(v>=s&&v<=e):(v>=s||v<=e);}
function signIndexFromDate(d){var m=d.getUTCMonth()+1,day=d.getUTCDate();return SIGNS.findIndex(function(s){return inRange(m,day,s.start[0],s.start[1],s.end[0],s.end[1]);});}
function formatArabicDate(iso){var d=parseISO(iso);if(!d)return '—';return d.getUTCDate()+' '+AR_MONTHS[d.getUTCMonth()]+' '+d.getUTCFullYear();}
function throttle(fn,wait){var last=0,timer;return function(){var a=arguments;var now=Date.now();var rem=wait-(now-last);if(rem<=0){last=now;fn.apply(this,a);}else if(!timer){timer=setTimeout(function(){last=Date.now();timer=null;fn.apply(this,a);},rem);}};}
function haptic(ms){if(ms===undefined)ms=8;if(navigator.vibrate)try{navigator.vibrate(ms);}catch(e){}}
function dayHash(str){var h=0;for(var i=0;i<str.length;i++)h=((h<<5)-h+str.charCodeAt(i))|0;return Math.abs(h);}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

var Storage={KEY_SETTINGS:'ms-zodiac-settings',KEY_PROFILES:'ms-zodiac-profiles',read:function(k,fb){try{var r=localStorage.getItem(k);return r?JSON.parse(r):fb;}catch(e){return fb;}},write:function(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}};

var Theme={init:function(){var s=Storage.read(Storage.KEY_SETTINGS,{});this.apply(s.theme||'dark',s.accent||'gold');this.updateIcon(s.theme||'dark');$('themeBtn').addEventListener('click',function(){var cur=document.documentElement.getAttribute('data-theme');var next=cur==='dark'?'light':'dark';Theme.apply(next,null);Theme.updateIcon(next);var st=Storage.read(Storage.KEY_SETTINGS,{});Storage.write(Storage.KEY_SETTINGS,Object.assign({},st,{theme:next}));haptic();if(window.__ANIM)window.__ANIM.pulseRing($('themeBtn'));});$$('.accent-swatch').forEach(function(sw){sw.addEventListener('click',function(){var v=sw.dataset.accentValue;Theme.apply(null,v);Theme.updateSwatches(v);var st=Storage.read(Storage.KEY_SETTINGS,{});Storage.write(Storage.KEY_SETTINGS,Object.assign({},st,{accent:v}));haptic();});});this.updateSwatches(s.accent||'gold');},apply:function(theme,accent){if(theme)document.documentElement.setAttribute('data-theme',theme);if(accent)document.documentElement.setAttribute('data-accent',accent);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',theme==='light'?'#faf7f0':'#02030a');},updateIcon:function(t){var i=$('themeIcon');if(!i)return;if(t==='light')i.innerHTML='<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';else i.innerHTML='<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';},updateSwatches:function(a){$$('.accent-swatch').forEach(function(sw){sw.classList.toggle('active',sw.dataset.accentValue===a);});}};

var Sound={enabled:false,ctx:null,init:function(){var s=Storage.read(Storage.KEY_SETTINGS,{});this.enabled=!!s.sound;this.updateIcon();$('soundBtn').addEventListener('click',function(){Sound.enabled=!Sound.enabled;Sound.updateIcon();var st=Storage.read(Storage.KEY_SETTINGS,{});Storage.write(Storage.KEY_SETTINGS,Object.assign({},st,{sound:Sound.enabled}));if(Sound.enabled)Sound.chime();haptic();if(window.__ANIM)window.__ANIM.pulseRing($('soundBtn'));});},updateIcon:function(){var i=$('soundIcon');if(!i)return;$('soundBtn').classList.toggle('active',this.enabled);if(this.enabled)i.innerHTML='<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';else i.innerHTML='<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>';},ensure:function(){if(!this.ctx){var AC=window.AudioContext||window.webkitAudioContext;if(AC){try{this.ctx=new AC();}catch(e){return null;}}}return this.ctx;},chime:function(){if(!this.enabled)return;var ctx=this.ensure();if(!ctx)return;if(ctx.state==='suspended')try{ctx.resume();}catch(e){}[523.25,659.25,783.99].forEach(function(f,i){try{var o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,ctx.currentTime+i*0.08);g.gain.linearRampToValueAtTime(0.06,ctx.currentTime+i*0.08+0.02);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.08+0.5);o.connect(g).connect(ctx.destination);o.start(ctx.currentTime+i*0.08);o.stop(ctx.currentTime+i*0.08+0.55);}catch(e){}});}};

var ZodiacMusic={enabled:false,ctx:null,masterGain:null,isPlaying:false,currentSign:null,loopId:null,stepIndex:0,configs:{'النار':{tempo:400,scale:[261.63,293.66,329.63,392.00,440.00,523.25],wave:'sawtooth',bassWave:'triangle',pattern:[0,2,4,2,3,5,4,2,1,3,5,4],bass:[0,0,3,3],noteDur:0.35,bassDur:1.2,gain:0.06,bassGain:0.09},'الأرض':{tempo:550,scale:[261.63,293.66,329.63,349.23,392.00,440.00,523.25],wave:'triangle',bassWave:'sine',pattern:[0,2,4,5,4,2],bass:[0,5,3,5],noteDur:0.7,bassDur:1.8,gain:0.07,bassGain:0.12},'الهواء':{tempo:320,scale:[440.00,493.88,554.37,659.25,739.99,880.00],wave:'sine',bassWave:'triangle',pattern:[0,3,2,4,3,5,4,2],bass:[0,2,4],noteDur:0.5,bassDur:1.5,gain:0.05,bassGain:0.07},'الماء':{tempo:480,scale:[329.63,369.99,415.30,493.88,554.37,659.25],wave:'sine',bassWave:'sine',pattern:[0,1,2,3,4,5,4,3,2,1],bass:[0,2,3],noteDur:0.9,bassDur:2.2,gain:0.055,bassGain:0.1}},init:function(){var s=Storage.read(Storage.KEY_SETTINGS,{});this.enabled=!!s.music;},ensure:function(){if(!this.ctx){var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{this.ctx=new AC();this.masterGain=this.ctx.createGain();this.masterGain.gain.value=0.18;this.masterGain.connect(this.ctx.destination);}catch(e){return null;}}if(this.ctx.state==='suspended')try{this.ctx.resume();}catch(e){}return this.ctx;},playNote:function(freq,time,duration,wave,gainVal,pan){if(pan===undefined)pan=0;var ctx=this.ctx;if(!ctx)return;try{var osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=wave;osc.frequency.value=freq;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(gainVal,time+0.02);gain.gain.exponentialRampToValueAtTime(0.001,time+duration);osc.detune.value=(Math.random()-0.5)*8;if(ctx.createStereoPanner){var p=ctx.createStereoPanner();p.pan.value=pan;osc.connect(gain).connect(p).connect(this.masterGain);}else osc.connect(gain).connect(this.masterGain);osc.start(time);osc.stop(time+duration+0.05);}catch(e){}},playStep:function(){if(!this.isPlaying||!this.ctx)return;var sign=this.currentSign;if(!sign)return;var cfg=this.configs[sign.element]||this.configs['النار'];var t=this.ctx.currentTime+0.02;var step=this.stepIndex%cfg.pattern.length;var noteIdx=cfg.pattern[step];var freq=cfg.scale[noteIdx%cfg.scale.length];var pan=((step%4)-1.5)/1.5*0.5;this.playNote(freq,t,cfg.noteDur,cfg.wave,cfg.gain,pan);if(step%2===0){var hf=cfg.scale[(noteIdx+2)%cfg.scale.length];this.playNote(hf,t,cfg.noteDur*0.8,'sine',cfg.gain*0.5,-pan);}if(step%4===0){var bi=cfg.bass[(this.stepIndex/4|0)%cfg.bass.length];var bf=cfg.scale[bi]/2;this.playNote(bf,t,cfg.bassDur,cfg.bassWave,cfg.bassGain,0);}this.stepIndex++;},start:function(sign){this.stop();if(!this.enabled)return;var ctx=this.ensure();if(!ctx)return;this.currentSign=sign;this.isPlaying=true;this.stepIndex=0;var cfg=this.configs[sign.element]||this.configs['النار'];var self=this;var tick=function(){if(!self.isPlaying)return;self.playStep();self.loopId=setTimeout(tick,cfg.tempo);};tick();},stop:function(){this.isPlaying=false;if(this.loopId){clearTimeout(this.loopId);this.loopId=null;}}};

var AudioManager={enabled:false,playing:false,userInteracted:false,audioEl:null,mode:'site',menuOpen:false,audioWasPlaying:false,init:function(){var self=this;this.audioEl=$('landingAudio');if(!this.audioEl)return;var s=Storage.read(Storage.KEY_SETTINGS,{});this.enabled=!!s.audioEnabled;this.trackIndex=s.landingTrack===1?1:0;this.audioEl.src=this.getTrackUrl();this.audioEl.volume=Number.isFinite(Number(s.audioVolume))?Math.max(0,Math.min(1,Number(s.audioVolume))):0.35;this.audioEl.loop=true;this.audioEl.load();this.updateIcon();this.updateControls();this.updateTrackUI();this.showTrackNoticeOnce();var activate=function(){self.userInteracted=true;document.removeEventListener('click',activate);document.removeEventListener('touchstart',activate);document.removeEventListener('keydown',activate);if(self.enabled){self.play();}};document.addEventListener('click',activate,{passive:true});document.addEventListener('touchstart',activate,{passive:true});document.addEventListener('keydown',activate,{passive:true});var btn=$('musicBtn');if(btn){btn.addEventListener('click',function(e){e.stopPropagation();self.toggleMenu();});}var playBtn=$('musicPlayPause');if(playBtn){playBtn.addEventListener('click',function(e){e.stopPropagation();if(self.playing){self.pause();}else{self.enabled=true;self.persist();self.play();}haptic();});}$$('.music-track-option').forEach(function(trackBtn){trackBtn.addEventListener('click',function(e){e.stopPropagation();var idx=Number(trackBtn.dataset.trackIndex);self.selectTrack(idx);haptic();});});var volume=$('musicVolume');if(volume){volume.value=String(self.audioEl.volume);volume.addEventListener('input',function(e){e.stopPropagation();self.setVolume(Number(this.value));});}document.addEventListener('click',function(e){var wrap=$('musicControlWrap');if(self.menuOpen&&wrap&&!wrap.contains(e.target))self.closeMenu();});this.audioEl.addEventListener('play',function(){self.playing=true;self.enabled=true;self.updateIcon();self.updateControls();});this.audioEl.addEventListener('pause',function(){self.playing=false;self.updateIcon();self.updateControls();});this.audioEl.addEventListener('ended',function(){self.playing=false;self.updateIcon();self.updateControls();});},getTrackUrl:function(){return this.trackIndex===1?LANDING_MUSIC_URL_2:LANDING_MUSIC_URL;},getTrackName:function(){return this.trackIndex===1?'مسمعين':'أي العيون الحلوة دي';},selectTrack:function(index){if(!this.audioEl)return;index=index===1?1:0;if(index===this.trackIndex){this.updateTrackUI();return;}var wasPlaying=this.playing;this.trackIndex=index;this.persist();this.audioEl.src=this.getTrackUrl();this.audioEl.loop=true;this.audioEl.load();this.updateTrackUI();if(wasPlaying){this.play();}else{this.updateControls();}},switchTrack:function(){this.selectTrack(this.trackIndex===0?1:0);},updateTrackUI:function(){var n=$('musicTrackName');if(n)n.textContent=this.getTrackName();$$('.music-track-option').forEach(function(btn){var active=Number(btn.dataset.trackIndex)===AudioManager.trackIndex;btn.classList.toggle('active',active);btn.setAttribute('aria-checked',active?'true':'false');});},showTrackNoticeOnce:function(){var key='msZodiacMusicTrackNoticeShown';var shown=Storage.read(key,false);if(shown)return;var notice=$('musicTrackNotice');if(!notice)return;notice.hidden=false;Storage.write(key,true);},toggleMenu:function(){if(this.menuOpen)this.closeMenu();else this.openMenu();},openMenu:function(){var m=$('musicControlMenu');if(!m)return;this.menuOpen=true;m.classList.add('open');m.setAttribute('aria-hidden','false');},closeMenu:function(){var m=$('musicControlMenu');if(!m)return;this.menuOpen=false;m.classList.remove('open');m.setAttribute('aria-hidden','true');},persist:function(){var st=Storage.read(Storage.KEY_SETTINGS,{});Storage.write(Storage.KEY_SETTINGS,Object.assign({},st,{audioEnabled:this.enabled,audioVolume:this.audioEl?this.audioEl.volume:0.35,landingTrack:this.trackIndex}));},setVolume:function(v){if(!this.audioEl)return;this.audioEl.volume=Math.max(0,Math.min(1,v));this.persist();this.updateControls();},play:function(){if(!this.audioEl||!this.getTrackUrl())return;this.enabled=true;this.audioEl.play().then(function(){AudioManager.playing=true;AudioManager.mode='site';AudioManager.updateIcon();AudioManager.updateControls();}).catch(function(){AudioManager.updateIcon();AudioManager.updateControls();});},pause:function(){if(this.audioEl&&!this.audioEl.paused)this.audioEl.pause();this.playing=false;this.updateIcon();this.updateControls();},updateIcon:function(){var btn=$('musicBtn');if(!btn)return;btn.classList.toggle('active',this.enabled);btn.classList.toggle('music-playing',this.playing);var icon=$('musicIcon');if(!icon)return;if(this.playing){icon.innerHTML='<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>';}else{icon.innerHTML='<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><line x1="2" y1="2" x2="22" y2="22"/>'; }},updateControls:function(){var status=$('musicControlStatus'),play=$('musicPlayPause'),icon=$('musicPlayPauseIcon'),volume=$('musicVolume'),volumeValue=$('musicVolumeValue');if(status)status.textContent=this.playing?'تعمل الآن':'متوقفة';if(play)play.setAttribute('aria-label',this.playing?'إيقاف الأغنية':'تشغيل الأغنية');if(icon)icon.innerHTML=this.playing?'<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>':'<polygon points="6 4 20 12 6 20 6 4"/>';if(volume&&this.audioEl)volume.value=String(this.audioEl.volume);if(volumeValue&&this.audioEl)volumeValue.textContent=Math.round(this.audioEl.volume*100)+'%';},playLanding:function(){this.play();},playSign:function(){this.play();},stopAll:function(){this.pause();}};

function StarField(canvas){this.c=canvas;this.ctx=canvas.getContext('2d');this.stars=[];this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;this.raf=0;this.ox=0;this.oy=0;this.mx=0;this.my=0;var self=this;window.addEventListener('resize',throttle(function(){self.resize();},150),{passive:true});if(window.matchMedia('(hover:hover)').matches){window.addEventListener('mousemove',throttle(function(e){self.mx=e.clientX/window.innerWidth-.5;self.my=e.clientY/window.innerHeight-.5;},80),{passive:true});}this.resize();this.tick=this.tick.bind(this);this.start();}
StarField.prototype.resize=function(){var dpr=Math.min(window.devicePixelRatio||1,2);this.c.width=window.innerWidth*dpr;this.c.height=window.innerHeight*dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);this.w=window.innerWidth;this.h=window.innerHeight;var count=Math.min(120,Math.max(50,Math.floor(this.w/12)));this.stars=[];for(var i=0;i<count;i++)this.stars.push({x:Math.random()*this.w,y:Math.random()*this.h,r:Math.random()*1.4+.2,a:Math.random()*.55+.15,vx:(Math.random()-.5)*.03,vy:(Math.random()-.5)*.03,tw:Math.random()*.02+.005,depth:Math.random()*.8+.2,gold:Math.random()>.55});};
StarField.prototype.draw=function(t){var ctx=this.ctx;ctx.clearRect(0,0,this.w,this.h);var isLight=document.documentElement.getAttribute('data-theme')==='light';for(var i=0;i<this.stars.length;i++){var p=this.stars[i];var tw=p.a+Math.sin(t*p.tw*.1+p.x*.01)*.07;var alpha=Math.max(.04,tw);if(isLight)ctx.fillStyle='rgba(120,100,70,'+alpha+')';else ctx.fillStyle=p.gold?'rgba(255,220,140,'+alpha+')':'rgba(220,235,255,'+(alpha*.85)+')';ctx.beginPath();ctx.arc(p.x+this.ox*p.depth,p.y+this.oy*p.depth,p.r,0,Math.PI*2);ctx.fill();if(p.r>1.1&&!isLight){ctx.fillStyle=p.gold?'rgba(255,200,100,'+(alpha*.13)+')':'rgba(180,210,255,'+(alpha*.1)+')';ctx.beginPath();ctx.arc(p.x+this.ox*p.depth,p.y+this.oy*p.depth,p.r*4,0,Math.PI*2);ctx.fill();}if(!this.reduced){p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=this.w;if(p.x>this.w)p.x=0;if(p.y<0)p.y=this.h;if(p.y>this.h)p.y=0;}}};
StarField.prototype.tick=function(t){this.ox+=(this.mx*30-this.ox)*.04;this.oy+=(this.my*30-this.oy)*.04;this.draw(t);this.raf=requestAnimationFrame(this.tick);};
StarField.prototype.start=function(){cancelAnimationFrame(this.raf);if(this.reduced){this.draw(performance.now());return;}this.raf=requestAnimationFrame(this.tick);};
StarField.prototype.pause=function(){cancelAnimationFrame(this.raf);};
StarField.prototype.resume=function(){this.start();};

function ElementBG(canvas){this.c=canvas;this.ctx=canvas.getContext('2d');this.element='النار';this.particles=[];this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;this.raf=0;var self=this;window.addEventListener('resize',throttle(function(){self.resize();},150),{passive:true});this.resize();this.seed();this.tick=this.tick.bind(this);this.start();}
ElementBG.prototype.setElement=function(el){if(el===this.element)return;this.element=el;this.seed();};
ElementBG.prototype.resize=function(){var dpr=Math.min(window.devicePixelRatio||1,2);this.c.width=window.innerWidth*dpr;this.c.height=window.innerHeight*dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);this.w=window.innerWidth;this.h=window.innerHeight;};
ElementBG.prototype.seed=function(){this.particles=[];var n=Math.min(45,Math.max(20,Math.floor(this.w/36)));for(var i=0;i<n;i++)this.particles.push(this.make());};
ElementBG.prototype.make=function(){var el=this.element;var p={x:Math.random()*this.w,y:Math.random()*this.h,r:Math.random()*2.5+1,a:Math.random()*.4+.15,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,life:Math.random()*100,maxLife:100+Math.random()*200};if(el==='النار'){p.vy=-(Math.random()*.5+.2);p.vx=(Math.random()-.5)*.2;}else if(el==='الهواء'){p.vy=(Math.random()-.5)*.1;p.vx=Math.random()*1.2+.3;p.r=Math.random()*1.5+.5;}return p;};
ElementBG.prototype.draw=function(t){var ctx=this.ctx;ctx.clearRect(0,0,this.w,this.h);var el=this.element;var isLight=document.documentElement.getAttribute('data-theme')==='light';var mul=isLight?.5:1;var pal={'النار':['rgba(232,168,106,','rgba(240,180,120,'],'الأرض':['rgba(157,191,148,','rgba(180,210,170,'],'الهواء':['rgba(157,196,224,','rgba(190,215,235,'],'الماء':['rgba(136,182,201,','rgba(170,210,225,']}[el];if(el==='الماء'){for(var l=0;l<2;l++){var yBase=this.h-70-l*60;ctx.beginPath();ctx.moveTo(0,yBase);for(var x=0;x<=this.w;x+=24)ctx.lineTo(x,yBase+Math.sin((x+t*(0.02+l*0.01))*0.008+l)*20);ctx.lineTo(this.w,this.h);ctx.lineTo(0,this.h);ctx.closePath();var g=ctx.createLinearGradient(0,yBase,0,this.h);g.addColorStop(0,pal[l%2]+(0.06*mul)+')');g.addColorStop(1,pal[l%2]+'0)');ctx.fillStyle=g;ctx.fill();}}for(var i=0;i<this.particles.length;i++){var p=this.particles[i];var a=p.a*mul;if(el==='الأرض'){ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=pal[0]+(a*.8)+')';ctx.fill();ctx.strokeStyle=pal[1]+(a*1.2)+')';ctx.lineWidth=1;ctx.stroke();}else if(el==='الهواء'){var len=30+p.r*15;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(p.x-len*.5,p.y+Math.sin(p.life*.05)*8,p.x-len,p.y+Math.cos(p.life*.04)*4);ctx.strokeStyle=pal[0]+a+')';ctx.lineWidth=1+Math.random()*.5;ctx.lineCap='round';ctx.stroke();}else if(el==='الماء'){ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=pal[0]+(a*.5)+')';ctx.fill();ctx.strokeStyle=pal[1]+(a*1.2)+')';ctx.lineWidth=.8;ctx.stroke();}else if(el==='النار'){var grd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*6);grd.addColorStop(0,pal[0]+a+')');grd.addColorStop(1,pal[0]+'0)');ctx.fillStyle=grd;ctx.beginPath();ctx.arc(p.x,p.y,p.r*6,0,Math.PI*2);ctx.fill();ctx.fillStyle=pal[1]+(a*1.4)+')';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}if(!this.reduced){if(el==='النار'){p.y+=p.vy;p.x+=p.vx+Math.sin(p.life*.02)*.3;p.life++;p.vy-=.002;if(p.life>p.maxLife||p.y<-20){var np=this.make();p.x=np.x;p.y=this.h+10;p.r=np.r;p.a=np.a;p.vx=np.vx;p.vy=np.vy;p.life=0;p.maxLife=np.maxLife;}}else if(el==='الأرض'){p.x+=p.vx;p.y+=p.vy;p.life++;p.vx+=(Math.random()-.5)*.01;p.vy+=(Math.random()-.5)*.01;p.vx*=.99;p.vy*=.99;if(p.x<-10)p.x=this.w+10;if(p.x>this.w+10)p.x=-10;if(p.y<-10)p.y=this.h+10;if(p.y>this.h+10)p.y=-10;}else if(el==='الهواء'){p.x+=p.vx*1.5;p.y+=Math.sin(p.life*.02)*.4;p.life++;if(p.x>this.w+50){p.x=-50;p.y=Math.random()*this.h;}}else if(el==='الماء'){p.y-=.2+p.r*.05;p.x+=Math.sin(p.life*.03)*.2;p.life++;if(p.y<-20){p.y=this.h+20;p.x=Math.random()*this.w;p.life=0;}}}}};
ElementBG.prototype.tick=function(t){this.draw(t);this.raf=requestAnimationFrame(this.tick);};
ElementBG.prototype.start=function(){cancelAnimationFrame(this.raf);if(this.reduced){this.draw(performance.now());return;}this.raf=requestAnimationFrame(this.tick);};
ElementBG.prototype.pause=function(){cancelAnimationFrame(this.raf);};
ElementBG.prototype.resume=function(){this.start();};

function fireConfetti(){var canvas=$('confetti');if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;var ctx=canvas.getContext('2d');var dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=window.innerWidth*dpr;canvas.height=window.innerHeight*dpr;canvas.style.width=window.innerWidth+'px';canvas.style.height=window.innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);var colors=['#d7bf87','#f0dfad','#8da9a0','#88b6c9','#e8a86a'];var parts=[];for(var i=0;i<80;i++)parts.push({x:window.innerWidth/2+(Math.random()-.5)*200,y:window.innerHeight/2-100,vx:(Math.random()-.5)*12,vy:-Math.random()*10-4,g:.32,r:Math.random()*4+2,rot:Math.random()*Math.PI*2,vr:(Math.random()-.5)*.3,color:colors[Math.floor(Math.random()*colors.length)],life:1});var t0=performance.now();function anim(t){var dt=(t-t0)/16.67;t0=t;ctx.clearRect(0,0,window.innerWidth,window.innerHeight);for(var i=parts.length-1;i>=0;i--){var p=parts[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;p.rot+=p.vr*dt;p.life-=.006*dt;if(p.life<=0||p.y>window.innerHeight+50){parts.splice(i,1);continue;}ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.5);ctx.restore();}if(parts.length>0)requestAnimationFrame(anim);else ctx.clearRect(0,0,window.innerWidth,window.innerHeight);}requestAnimationFrame(anim);}

var ELEMENT_SCORE={'النار|النار':24,'الأرض|الأرض':24,'الهواء|الهواء':24,'الماء|الماء':24,'النار|الهواء':20,'الهواء|النار':20,'الماء|الأرض':20,'الأرض|الماء':20,'النار|الأرض':2,'الأرض|النار':2,'الهواء|الماء':2,'الماء|الهواء':2,'النار|الماء':6,'الماء|النار':6,'الهواء|الأرض':-2,'الأرض|الهواء':-2};
var MODE_SCORE={'أساسي|أساسي':10,'ثابت|ثابت':10,'متغير|متغير':10,'أساسي|ثابت':-4,'ثابت|أساسي':-4,'أساسي|متغير':4,'متغير|أساسي':4,'ثابت|متغير':4,'متغير|ثابت':4};
function compatibilityScore(a,b){var s=50;s+=ELEMENT_SCORE[a.element+'|'+b.element]||0;s+=MODE_SCORE[a.mode+'|'+b.mode]||0;s+=(a.polarity===b.polarity)?8:-2;return Math.max(38,Math.min(97,Math.round(s)));}
function compatLabel(s){if(s>=88)return {text:'انسجام استثنائي',desc:'علاقة نادرة التوازن.'};if(s>=78)return {text:'انسجام قوي',desc:'أساس متين للتفاهم.'};if(s>=66)return {text:'انسجام جيد',desc:'علاقة صحية.'};if(s>=55)return {text:'انسجام متوسط',desc:'يحتاج جهدًا واعيًا.'};return {text:'تجربة مختلفة',desc:'اختلافات واضحة.'};}

var state={activeIndex:0,activeMode:'overview',birthDate:'',friendIndex:null,friendDate:''};

var toastTimer;
function toast(msg){
var el=$('toast');el.textContent=msg;el.classList.add('show');
clearTimeout(toastTimer);
toastTimer=setTimeout(function(){el.classList.remove('show');},2400);
}

function animateCount(el,target,duration){
if(duration===undefined)duration=1200;
var start=performance.now();
function step(t){
var p=Math.min(1,(t-start)/duration);
var e=p===1?1:1-Math.pow(2,-10*p);
el.textContent=Math.round(target*e);
if(p<1)requestAnimationFrame(step);
else {el.textContent=target;if(window.__ANIM)window.__ANIM.shakeNumber(el);}
}
requestAnimationFrame(step);
}

function LuxeDatePicker(container,opts){
var uid='dp'+Math.random().toString(36).slice(2,9);
var iconSVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="12" cy="15" r="1.2" fill="currentColor"/></svg>';
var chevSVG='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
var prevSVG='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>';
var nextSVG='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 6 9 12 15 18"/></svg>';
container.innerHTML='<div class="dp-field" id="'+uid+'-field" role="button" tabindex="0" aria-haspopup="dialog" aria-expanded="false"><div class="dp-icon">'+iconSVG+'</div><div class="dp-copy"><div class="dp-label">'+(opts.label||'التاريخ')+'</div><div class="dp-value placeholder" id="'+uid+'-value">'+(opts.placeholder||'اختر تاريخًا')+'</div></div><div class="dp-chevron">'+chevSVG+'</div></div><div class="dp-panel" id="'+uid+'-panel" role="dialog"><div class="dp-header"><button class="dp-nav" data-nav="prev" type="button" aria-label="السابق">'+prevSVG+'</button><button class="dp-title" data-act="cycle" type="button"><div class="dp-month" id="'+uid+'-month">—</div><div class="dp-year" id="'+uid+'-year">—</div></button><button class="dp-nav" data-nav="next" type="button" aria-label="التالي">'+nextSVG+'</button></div><div data-view="days"><div class="dp-weekdays"><div class="dp-weekday">أحد</div><div class="dp-weekday">اثن</div><div class="dp-weekday">ثلا</div><div class="dp-weekday">أرب</div><div class="dp-weekday">خمي</div><div class="dp-weekday">جمع</div><div class="dp-weekday">سبت</div></div><div class="dp-days" id="'+uid+'-days"></div></div><div data-view="years" style="display:none"><div class="dp-mini-grid" id="'+uid+'-years"></div></div><div data-view="months" style="display:none"><div class="dp-mini-grid" id="'+uid+'-months"></div></div><div class="dp-footer"><button class="dp-quick" data-quick="year" type="button">السنة</button><button class="dp-quick" data-quick="month" type="button">الشهر</button><button class="dp-quick" data-quick="today" type="button">اليوم</button><button class="dp-confirm" data-act="confirm" type="button" disabled>تأكيد</button></div></div>';
var field=document.getElementById(uid+'-field');var panel=document.getElementById(uid+'-panel');var valueEl=document.getElementById(uid+'-value');var monthEl=document.getElementById(uid+'-month');var yearEl=document.getElementById(uid+'-year');var daysEl=document.getElementById(uid+'-days');var yearsEl=document.getElementById(uid+'-years');var monthsEl=document.getElementById(uid+'-months');var prevBtn=panel.querySelector('[data-nav="prev"]');var nextBtn=panel.querySelector('[data-nav="next"]');var titleBtn=panel.querySelector('[data-act="cycle"]');var confirmBtn=panel.querySelector('[data-act="confirm"]');
var s={year:today.getFullYear(),month:today.getMonth(),selected:null,view:'days'};
function updateField(){if(s.selected){valueEl.textContent=formatArabicDate(s.selected);valueEl.classList.remove('placeholder');field.classList.add('filled');}else{valueEl.textContent=opts.placeholder||'اختر تاريخًا';valueEl.classList.add('placeholder');field.classList.remove('filled');}}
function showView(v){s.view=v;panel.querySelectorAll('[data-view]').forEach(function(el){el.style.display=el.dataset.view===v?'':'none';});}
function renderDays(){daysEl.innerHTML='';var y=s.year,m=s.month;var firstDay=new Date(Date.UTC(y,m,1)).getUTCDay();var daysInMonth=new Date(Date.UTC(y,m+1,0)).getUTCDate();var todayD=new Date();var todayUTC=Date.UTC(todayD.getFullYear(),todayD.getMonth(),todayD.getDate());var minUTC=Date.UTC(1900,0,1);for(var i=0;i<firstDay;i++){var empty=document.createElement('div');empty.className='dp-day empty';daysEl.appendChild(empty);}for(var d=1;d<=daysInMonth;d++){(function(day){var btn=document.createElement('button');btn.type='button';btn.className='dp-day';btn.textContent=day;var iso=toISO(y,m,day);var cellUTC=Date.UTC(y,m,day);if(cellUTC>todayUTC)btn.classList.add('disabled');if(cellUTC<minUTC)btn.classList.add('disabled');if(cellUTC===todayUTC)btn.classList.add('today');if(s.selected===iso)btn.classList.add('selected');if(!btn.classList.contains('disabled')){btn.addEventListener('click',function(e){e.stopPropagation();s.selected=iso;confirmBtn.disabled=false;renderDays();haptic(6);});}daysEl.appendChild(btn);})(d);}nextBtn.disabled=(y>todayD.getFullYear())||(y===todayD.getFullYear()&&m>=todayD.getMonth());prevBtn.disabled=(y<1900);confirmBtn.disabled=!s.selected;}
function renderYears(){yearsEl.innerHTML='';var cy=today.getFullYear();for(var y=cy;y>=cy-100;y--){(function(year){var b=document.createElement('button');b.type='button';b.className='dp-mini-item'+(year===s.year?' active':'');b.textContent=year;b.addEventListener('click',function(e){e.stopPropagation();s.year=year;showView('days');render();haptic(6);});yearsEl.appendChild(b);})(y);}}
function renderMonths(){monthsEl.innerHTML='';for(var m=0;m<12;m++){(function(month){var b=document.createElement('button');b.type='button';b.className='dp-mini-item'+(month===s.month?' active':'');b.textContent=AR_MONTHS[month];b.addEventListener('click',function(e){e.stopPropagation();s.month=month;showView('days');render();haptic(6);});monthsEl.appendChild(b);})(m);}}
function render(){monthEl.textContent=AR_MONTHS[s.month];yearEl.textContent=s.year;if(s.view==='years')renderYears();else if(s.view==='months')renderMonths();else renderDays();}
function open(){panel.classList.add('open');field.classList.add('open');field.setAttribute('aria-expanded','true');showView('days');render();requestAnimationFrame(function(){panel.style.top='';panel.style.bottom='';var fieldRect=field.getBoundingClientRect();var panelHeight=panel.offsetHeight||380;var spaceBelow=window.innerHeight-fieldRect.bottom-20;var spaceAbove=fieldRect.top-20;if(spaceBelow<panelHeight&&spaceAbove>spaceBelow){panel.style.top='auto';panel.style.bottom='calc(100% + 12px)';}else{panel.style.top='calc(100% + 12px)';panel.style.bottom='auto';}});}
function close(){panel.classList.remove('open');field.classList.remove('open');field.setAttribute('aria-expanded','false');}
function toggle(){if(panel.classList.contains('open'))close();else open();}
field.addEventListener('click',function(e){if(e.target.closest('.dp-panel'))return;toggle();});
field.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}if(e.key==='Escape')close();});
prevBtn.addEventListener('click',function(e){e.stopPropagation();var m=s.month-1,y=s.year;if(m<0){m=11;y--;}s.month=m;s.year=y;render();});
nextBtn.addEventListener('click',function(e){e.stopPropagation();var m=s.month+1,y=s.year;if(m>11){m=0;y++;}s.month=m;s.year=y;render();});
titleBtn.addEventListener('click',function(e){e.stopPropagation();if(s.view==='days')showView('years');else if(s.view==='years')showView('months');else showView('days');render();});
panel.querySelector('[data-quick="year"]').addEventListener('click',function(e){e.stopPropagation();showView('years');render();});
panel.querySelector('[data-quick="month"]').addEventListener('click',function(e){e.stopPropagation();showView('months');render();});
panel.querySelector('[data-quick="today"]').addEventListener('click',function(e){e.stopPropagation();var now=new Date();s.year=now.getFullYear();s.month=now.getMonth();s.selected=toISO(now.getFullYear(),now.getMonth(),now.getDate());showView('days');render();confirmBtn.disabled=false;});
confirmBtn.addEventListener('click',function(e){e.stopPropagation();if(!s.selected)return;close();haptic(10);if(opts.onConfirm)opts.onConfirm(s.selected);});
document.addEventListener('click',function(e){if(!panel.classList.contains('open'))return;if(field.contains(e.target)||panel.contains(e.target))return;close();});
updateField();render();
return{open:open,close:close,toggle:toggle,getSelected:function(){return s.selected;},setSelected:function(v){s.selected=v;var d=parseISO(v);if(d){s.year=d.getUTCFullYear();s.month=d.getUTCMonth();}updateField();render();},clear:function(){s.selected=null;updateField();render();}};
}

function pickDailyTwin(signId){var pool=HISTORIC_TWINS[signId];if(!pool||!pool.length)return null;var now=new Date();var startOfYear=new Date(now.getFullYear(),0,0);var dayOfYear=Math.floor((now-startOfYear)/86400000);var seed=dayHash(signId+'|'+dayOfYear);return pool[seed%pool.length];}
function pickRandomTwin(signId,excludeName){var pool=HISTORIC_TWINS[signId];if(!pool||!pool.length)return null;if(pool.length<2)return pool[0];var next,tries=0;do{next=pool[Math.floor(Math.random()*pool.length)];tries++;}while(next.name===excludeName&&tries<20);return next;}
function getInitials(name){var parts=name.split(' ').filter(function(p){return p.length>1&&!/^[a-z]/.test(p);});if(parts.length===0)return name.slice(0,2);if(parts.length===1)return parts[0].slice(0,2);return parts[0][0]+parts[1][0];}

function renderTwin(sign,twin){
var section=$('twinSection');
if(!section)return;
if(!sign||!twin){section.innerHTML='';return;}
var initials=getInitials(twin.name);
section.innerHTML='<div class="section-head"><div><div class="section-kicker">HISTORIC TWIN</div><div class="section-title">توأمك من التاريخ</div></div><div class="section-kicker">شخصية من برج '+sign.name+'</div></div><div class="twin-hero"><div class="twin-avatar">'+initials+'</div><div class="twin-info"><div class="twin-eyebrow">HISTORIC TWIN</div><h3>'+twin.name+'</h3><div class="twin-meta"><span class="twin-year">'+twin.year+'</span><span class="twin-role">'+twin.role+'</span></div><p class="twin-desc">'+twin.desc+'</p><div class="twin-note">شخصية تاريخية من نفس برجك — <strong>'+sign.name+' '+sign.symbol+'</strong>. يتغير توأمك كل يوم، وتقدر تجرّب شخصية تانية بنفسك.</div></div></div><div class="twin-refresh"><button class="ghost-btn" id="twinRefreshBtn" type="button" style="font-size:12px;padding:10px 18px">🔄 جرّب شخصية تانية من نفس برجك</button></div>';
var btn=$('twinRefreshBtn');
if(btn){btn.addEventListener('click',function(){var next=pickRandomTwin(sign.id,twin.name);if(next&&next.name!==twin.name){haptic();renderTwin(sign,next);if(window.__ANIM)window.__ANIM.particleBurst(window.innerWidth/2,window.innerHeight/2,{count:8});}});}
}

function renderWheel(){
var svg=$('zodiacWheel');
if(!svg)return;
var cx=250,cy=250,rOuter=230,rSign=200,rInner=155,rCenter=95;
var html='';
html+='<circle class="ring-bg" cx="'+cx+'" cy="'+cy+'" r="'+rOuter+'"/>';
html+='<circle class="ring-bg" cx="'+cx+'" cy="'+cy+'" r="'+(rSign-18)+'"/>';
html+='<circle class="ring-accent" cx="'+cx+'" cy="'+cy+'" r="'+rInner+'"/>';
html+='<circle class="ring-bg" cx="'+cx+'" cy="'+cy+'" r="'+rCenter+'"/>';
html+='<circle class="ring-thin" cx="'+cx+'" cy="'+cy+'" r="'+(rOuter-15)+'"/>';
var arcR=(rOuter+(rSign-18))/2;
SIGNS.forEach(function(s,i){var sa=(i/12)*360-90-13,ea=(i/12)*360-90+13;var sr=sa*Math.PI/180,er=ea*Math.PI/180;var x1=cx+Math.cos(sr)*arcR,y1=cy+Math.sin(sr)*arcR;var x2=cx+Math.cos(er)*arcR,y2=cy+Math.sin(er)*arcR;html+='<path class="el-arc '+ELEMENT_CLASS[s.element]+'" d="M '+x1.toFixed(2)+' '+y1.toFixed(2)+' A '+arcR+' '+arcR+' 0 0 1 '+x2.toFixed(2)+' '+y2.toFixed(2)+'"/>';});
var active=SIGNS[state.activeIndex];
var aRad=((state.activeIndex/12)*360-90)*Math.PI/180;
var aX=cx+Math.cos(aRad)*rSign,aY=cy+Math.sin(aRad)*rSign;
SIGNS.forEach(function(s,i){
if(i===state.activeIndex)return;
var score=compatibilityScore(active,s);
var rad=((i/12)*360-90)*Math.PI/180;
var x=cx+Math.cos(rad)*rSign,y=cy+Math.sin(rad)*rSign;
var cls='aspect-line draw-in';
if(score>=78)cls+=' strong';else if(score>=66)cls+=' medium';else if(score>=55)cls+=' weak';else cls+=' tension';
html+='<line class="'+cls+'" x1="'+aX.toFixed(1)+'" y1="'+aY.toFixed(1)+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" style="animation-delay:'+(i*30)+'ms"/>';
});
SIGNS.forEach(function(s,i){var rad=((i/12)*360-90)*Math.PI/180;var x=cx+Math.cos(rad)*rSign,y=cy+Math.sin(rad)*rSign;var isActive=i===state.activeIndex;html+='<g class="sign-node'+(isActive?' active':'')+'" data-sign="'+i+'" tabindex="0" role="button" aria-label="'+s.name+'"><circle class="sign-circle" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="20"/><text class="sign-symbol" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'">'+s.symbol+'</text></g>';});
SIGNS.forEach(function(s,i){var rad=((i/12)*360-90)*Math.PI/180;var x=cx+Math.cos(rad)*(rInner-12),y=cy+Math.sin(rad)*(rInner-12);html+='<text class="sign-name-small" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'">'+s.name+'</text>';});
html+='<text class="center-symbol" x="'+cx+'" y="'+(cy-8)+'">'+active.symbol+'</text>';
html+='<text class="center-name" x="'+cx+'" y="'+(cy+38)+'">'+active.name+'</text>';
html+='<text class="center-range" x="'+cx+'" y="'+(cy+56)+'">'+active.range+'</text>';
svg.innerHTML=html;
svg.querySelectorAll('.sign-node').forEach(function(node){function go(e){var idx=parseInt(node.dataset.sign,10);haptic();if(window.__ANIM&&e){window.__ANIM.particleBurst(e.clientX,e.clientY,{count:8});}selectSign(idx,true);}node.addEventListener('click',go);node.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});});
}

function renderWheelInfo(){
var s=SIGNS[state.activeIndex];
var wrap=$('wheelInfoWrap');
if(!wrap)return;
var ranked=SIGNS.map(function(o,i){return {o:o,i:i,score:compatibilityScore(s,o)};}).filter(function(x){return x.i!==state.activeIndex;}).sort(function(a,b){return b.score-a.score;});
var top3=ranked.slice(0,3);var bottom2=ranked.slice(-2);
wrap.innerHTML='<div class="wheel-info"><div class="wi-symbol">'+s.symbol+'</div><h3>'+s.name+'</h3><div class="wi-range">'+s.range+' · '+(ELEMENT_ICONS[s.element]||'')+' '+s.element+' · '+s.mode+'</div><p>'+s.personality+'</p><div class="wi-tags">'+s.keywords.map(function(k){return '<span class="wi-tag">'+k+'</span>';}).join('')+'</div><div class="wheel-aspects">'+top3.map(function(r){return '<div class="wheel-aspect-row"><span class="as-name">'+r.o.symbol+' '+r.o.name+'</span><span class="as-score" style="color:var(--ok)">'+r.score+'%</span></div>';}).join('')+bottom2.map(function(r){return '<div class="wheel-aspect-row"><span class="as-name">'+r.o.symbol+' '+r.o.name+'</span><span class="as-score" style="color:var(--danger)">'+r.score+'%</span></div>';}).join('')+'</div></div>';
}

function renderOrbit(){
var wrap=$('orbitSigns');
if(!wrap)return;
wrap.innerHTML='';
var others=SIGNS.map(function(s,i){return {s:s,i:i};}).filter(function(x){return x.i!==state.activeIndex;});
others.forEach(function(item,pos){
var angle=(360/others.length)*pos-90;
var rad=angle*Math.PI/180;
var b=document.createElement('button');
b.type='button';
b.className='orbit-sign-btn';
b.style.setProperty('--angle',angle+'deg');
b.style.setProperty('--tx',Math.cos(rad).toFixed(4));
b.style.setProperty('--ty',Math.sin(rad).toFixed(4));
b.setAttribute('aria-label','استكشاف برج '+item.s.name);
b.title=item.s.name;
b.textContent=item.s.symbol;
b.style.transitionDelay=(pos*35)+'ms';
b.addEventListener('click',function(e){haptic();if(window.__ANIM){window.__ANIM.orbHeartbeat();window.__ANIM.particleBurst(e.clientX,e.clientY,{count:10});}selectSign(item.i,true);});
wrap.appendChild(b);
});
requestAnimationFrame(function(){
wrap.querySelectorAll('.orbit-sign-btn').forEach(function(b){b.style.opacity='1';});
});
}

function renderIdentity(){
var s=SIGNS[state.activeIndex];
document.documentElement.setAttribute('data-element',s.element);
if(elementBG)elementBG.setElement(s.element);
var aura=$('elementAura');
if(aura){aura.setAttribute('data-el',s.element);aura.classList.add('active');}
$('signIndex').textContent=String(state.activeIndex+1).padStart(2,'0')+' / 12';
$('signTitle').textContent=s.name;
$('signRange').textContent=s.range;
$('signSymbol').textContent=s.symbol;
$('orbSymbol').textContent=s.symbol;
$('orbName').textContent=s.name;
$('orbRange').textContent=s.range;
var tags=$('signTags');
tags.innerHTML='';
var elIcon=ELEMENT_ICONS[s.element]||'';
var tagData=[{text:s.element,icon:elIcon},{text:s.mode,icon:''},{text:s.ruler,icon:'✦'}].concat(s.keywords.map(function(k){return {text:k,icon:''};}));
tagData.forEach(function(t){var n=document.createElement('span');n.className='tag';if(t.icon){var ic=document.createElement('span');ic.textContent=t.icon;n.appendChild(ic);}n.appendChild(document.createTextNode(t.text));tags.appendChild(n);});
var snap=$('snapshot');
snap.innerHTML='';
var stats=[['العنصر',s.element,elIcon],['النمط',s.mode,''],['الحاكم',s.ruler,''],['أقوى نقطة',s.strengths[0],''],['تحدٍ محتمل',s.challenges[0],''],['الكلمة المفتاح',s.keywords[0],'']];
stats.forEach(function(st){var n=document.createElement('div');n.className='stat';n.innerHTML='<div class="stat-label">'+st[0]+'</div><div class="stat-value"></div>';n.querySelector('.stat-value').textContent=st[2]?st[2]+' '+st[1]:st[1];snap.appendChild(n);});
}

function renderMusicCard(){
var s=SIGNS[state.activeIndex];
var card=$('musicCard');
if(!card)return;
var config=ZodiacMusic.configs[s.element]||ZodiacMusic.configs['النار'];
var tempoBpm=Math.round(60000/config.tempo);
var isPlaying=ZodiacMusic.isPlaying&&ZodiacMusic.currentSign&&ZodiacMusic.currentSign.id===s.id;
card.innerHTML='<div class="music-icon'+(isPlaying?' playing':'')+'">'+(isPlaying?'🎵':'🎼')+'</div><div class="music-info"><h4>موسيقى برج '+s.name+' '+s.symbol+'</h4><p>'+(isPlaying?'تعزف الآن':'اضغط للتشغيل')+'</p><div class="music-meta"><span class="music-tag">'+(ELEMENT_ICONS[s.element]||'')+' '+s.element+'</span><span class="music-tag">'+tempoBpm+' BPM</span><span class="music-tag">'+config.scale.length+' نغمة</span></div></div><div class="music-controls"><button class="music-btn" id="musicToggleBtn" type="button" aria-label="'+(isPlaying?'إيقاف':'تشغيل')+'">'+(isPlaying?'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>':'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>')+'</button>'+(isPlaying?'<div class="music-eq"><span></span><span></span><span></span><span></span><span></span></div>':'')+'</div>';
$('musicToggleBtn').addEventListener('click',function(e){
if(!AudioManager.enabled){AudioManager.enabled=true;AudioManager.updateIcon();var st=Storage.read(Storage.KEY_SETTINGS,{});Storage.write(Storage.KEY_SETTINGS,Object.assign({},st,{audioEnabled:true}));}
if(isPlaying){AudioManager.stopAll();toast('🔇 تم الإيقاف');}else{AudioManager.playSign(s);toast('🎵 '+s.name);}
if(window.__ANIM)window.__ANIM.particleBurst(e.clientX,e.clientY,{count:8});
haptic();
renderMusicCard();
});
}

function renderMBTI(){
var s=SIGNS[state.activeIndex];
var data=MBTI_MAP[s.id];
if(!data){$('mbtiCard').innerHTML='';return;}
var card=$('mbtiCard');
card.innerHTML='<div class="mbti-col"><h3>نمط MBTI المقترح</h3><div class="mbti-types">'+data.mbti.map(function(m){return '<span class="mbti-badge">'+m+'</span>';}).join('')+'</div><p class="big5-desc">'+data.desc+'</p></div><div class="mbti-col"><h3>Big Five</h3><div class="big5-row">'+Object.keys(data.big5).map(function(k){return '<div class="big5-item"><span class="name">'+BIG5_LABELS[k]+'</span><div class="big5-bar"><span style="--w:'+data.big5[k]+'%"></span></div><span class="val">'+data.big5[k]+'%</span></div>';}).join('')+'</div></div>';
requestAnimationFrame(function(){
card.querySelectorAll('.big5-bar span').forEach(function(el,i){
setTimeout(function(){el.style.width=el.style.getPropertyValue('--w');if(i===4){setTimeout(function(){card.querySelectorAll('.big5-bar span').forEach(function(x){x.classList.add('done');});},1300);}},i*100);
});
});
}

function renderRadar(){
var s=SIGNS[state.activeIndex];
var labels=Object.keys(s.meters);
var values=Object.values(s.meters);
var n=labels.length,cx=130,cy=130,R=92;
function pointAt(a,r){var rad=a*Math.PI/180;return [cx+Math.cos(rad)*r,cy+Math.sin(rad)*r];}
var angles=labels.map(function(_,i){return -90+(360/n)*i;});
var rings=[.25,.5,.75,1].map(function(f){return angles.map(function(a){return pointAt(a,R*f).map(function(v){return v.toFixed(1);}).join(',');}).join(' ');});
var axes=angles.map(function(a){var p=pointAt(a,R);return '<line class="axis" x1="'+cx+'" y1="'+cy+'" x2="'+p[0].toFixed(1)+'" y2="'+p[1].toFixed(1)+'"/>';}).join('');
var poly=values.map(function(v,i){var p=pointAt(angles[i],R*(v/100));return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');
var dots=values.map(function(v,i){var p=pointAt(angles[i],R*(v/100));return '<circle class="dot" cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3"/>';}).join('');
var lbls=labels.map(function(l,i){var p=pointAt(angles[i],R+22);return '<text class="label" x="'+p[0].toFixed(1)+'" y="'+(p[1]+3).toFixed(1)+'">'+l+'</text>';}).join('');
$('radarCard').innerHTML='<div><svg class="radar-svg" viewBox="0 0 260 260">'+rings.map(function(r){return '<polygon class="grid-line" points="'+r+'"/>';}).join('')+axes+'<polygon class="poly" points="'+poly+'"/>'+dots+lbls+'</svg></div><div class="radar-info"><h3>خريطة السمات</h3><p>توزيع نسبي لست سمات أساسية.</p><div class="radar-legend">'+labels.map(function(l,i){return '<span><strong>'+values[i]+'%</strong> '+l+'</span>';}).join('')+'</div></div>';
}

function renderEnergy(){
var s=SIGNS[state.activeIndex];
var level=calcEnergyLevel(s);
var meta=dailyMeta(s,todayISO);
var offset=408-(408*level/100);
var label=level>=80?'طاقة عالية':level>=60?'طاقة متوازنة':level>=40?'طاقة متوسطة':'طاقة منخفضة';
var card=$('energyCard');
card.innerHTML='<div class="energy-gauge"><svg viewBox="0 0 150 150"><circle class="bg-c" cx="75" cy="75" r="65"/><circle class="fg-c" cx="75" cy="75" r="65" style="stroke-dashoffset:408"/></svg><div class="level"><span data-count="'+level+'">0</span><small>%</small></div></div><div class="energy-info"><h3>'+label+' — '+level+'%</h3><div class="energy-bars"><div><small>الحظ</small><strong>'+meta.luck+'%</strong></div><div><small>الحب</small><strong>'+meta.love+'%</strong></div><div><small>الطاقة</small><strong>'+meta.energy+'%</strong></div></div></div>';
requestAnimationFrame(function(){
var c=card.querySelector('.fg-c');
if(c)c.style.strokeDashoffset=offset;
var el=card.querySelector('[data-count]');
if(el)animateCount(el,level,1400);
});
}

function renderMyth(){
var s=SIGNS[state.activeIndex];
var arabic=ARABIC_MYTHS[s.id];
var section=$('mythSection');
if(!section)return;
section.innerHTML='<div class="section-head"><div><div class="section-kicker">SIGN MYTH</div><div class="section-title">أسطورة '+s.name+'</div></div><div class="section-kicker">من التراث العربي</div></div><div class="myth-content"><div class="myth-source">من التراث العربي</div><h4>'+arabic.title+'</h4><p>'+arabic.story+'</p><div class="myth-wisdom"><strong>حكمة:</strong> '+arabic.wisdom+'</div><div class="myth-context">'+arabic.context+'</div></div>';
}

function renderModeNav(){
var nav=$('modeNav');
nav.innerHTML='';
MODES.forEach(function(m){
var b=document.createElement('button');
b.type='button';
b.className='mode-btn'+(m.id===state.activeMode?' active':'');
b.textContent=m.label;
b.addEventListener('click',function(){state.activeMode=m.id;renderMode();haptic();});
nav.appendChild(b);
});
}

function buildMeterGrid(sign){
var grid=document.createElement('div');grid.className='meter-grid';
Object.keys(sign.meters).forEach(function(label){
var value=sign.meters[label];
var n=document.createElement('div');
n.className='meter';
n.innerHTML='<div class="meter-head"><span>'+label+'</span><span>'+value+'%</span></div><div class="meter-bar"><span style="--w:'+value+'%"></span></div>';
grid.appendChild(n);
});
requestAnimationFrame(function(){
grid.querySelectorAll('.meter').forEach(function(m,i){setTimeout(function(){m.classList.add('animate');},i*70);});
});
return grid;
}

function renderMode(){
renderModeNav();
var s=SIGNS[state.activeIndex];
var m=MODES.find(function(x){return x.id===state.activeMode;})||MODES[0];
var body=$('modeBody');
body.innerHTML='';
var k=document.createElement('div');k.className='mode-title';k.textContent=m.label;
var h=document.createElement('div');h.className='mode-heading';h.textContent=m.title;
var t=document.createElement('div');t.className='mode-text';t.textContent=m.get(s);
body.appendChild(k);body.appendChild(h);body.appendChild(t);
function makeF(num,title,sub,p){var n=document.createElement('article');n.className='feature';n.innerHTML='<div class="feature-num">'+num+'</div><h4>'+title+'</h4><p></p>';n.querySelector('p').textContent=sub?sub+' — '+p:p;return n;}
var grid=document.createElement('div');
grid.className='feature-grid stagger';
if(m.type==='overview'){grid.appendChild(makeF('01','الطبع الأساسي',s.keywords[0],s.personality));grid.appendChild(makeF('02','أسلوب التواصل',s.keywords[1],s.communication));grid.appendChild(makeF('03','في العمل',s.keywords[2],s.work));body.appendChild(grid);}
else if(m.type==='meters'){body.appendChild(buildMeterGrid(s));return;}
else if(m.type==='love'){grid.appendChild(makeF('01','في الحب','طريقة العطاء',s.love));grid.appendChild(makeF('02','نقاط القوة','ما يميزه',s.strengths.join(' · ')));grid.appendChild(makeF('03','التحدي','ما يحتاج وعيًا',s.challenges.join(' · ')));body.appendChild(grid);}
else if(m.type==='growth'){grid.appendChild(makeF('01','نقطة التطور','ما يستحق العمل',s.growth));grid.appendChild(makeF('02','استثمر','ما يزيد قوته',s.strengths.join(' · ')));grid.appendChild(makeF('03','انتبه','ما يحتاج توازنًا',s.challenges.join(' · ')));body.appendChild(grid);}
}

function renderTop3(){
var active=SIGNS[state.activeIndex];
var ranked=SIGNS.map(function(s,i){return {s:s,i:i,score:compatibilityScore(active,s)};}).filter(function(x){return x.i!==state.activeIndex;}).sort(function(a,b){return b.score-a.score;}).slice(0,3);
var grid=$('top3Grid');
grid.innerHTML='';
var reasons=['يكمل ما ينقصك','إيقاع متوافق','أفكار متقاربة'];
ranked.forEach(function(r,idx){
var node=document.createElement('div');
node.className='top-match'+(idx===0?' rank-1':'');
node.innerHTML='<span class="rank'+(idx===0?' rank-1':'')+'">'+(idx+1)+'</span><div class="sym">'+r.s.symbol+'</div><div class="name">'+r.s.name+'</div><div class="rng">'+r.s.range+'</div><div class="score-row"><span class="score" data-count="'+r.score+'">0</span><span class="score-lbl">%<br>توافق</span></div><div class="reason">'+reasons[idx]+'</div>';
node.addEventListener('click',function(e){haptic();if(window.__ANIM){window.__ANIM.orbHeartbeat();window.__ANIM.particleBurst(e.clientX,e.clientY,{count:12});}selectSign(r.i,true);});
grid.appendChild(node);
requestAnimationFrame(function(){var el=node.querySelector('[data-count]');if(el)animateCount(el,r.score,1300);});
});
}

function renderMatrix(){
var grid=$('matrixGrid');
grid.innerHTML='';
var activeIdx=state.activeIndex;
var corner=document.createElement('div');
corner.className='matrix-cell corner';
corner.innerHTML='برجك ↓<br>الآخر →';
grid.appendChild(corner);
SIGNS.forEach(function(s,j){var h=document.createElement('div');h.className='matrix-cell header'+(j===activeIdx?' active-row':'');h.innerHTML='<span>'+s.symbol+'</span><small>'+s.name+'</small>';grid.appendChild(h);});
SIGNS.forEach(function(rowSign,ri){
var rowH=document.createElement('div');
rowH.className='matrix-cell row-header'+(ri===activeIdx?' active-row':'');
rowH.innerHTML='<span>'+rowSign.symbol+'</span>'+rowSign.name;
grid.appendChild(rowH);
SIGNS.forEach(function(colSign,ci){
var cell=document.createElement('div');
cell.className='matrix-cell score'+(ri===activeIdx?' active-row':'')+(ri===ci?' self':'');
if(ri===ci){cell.textContent='—';}
else{
var score=compatibilityScore(rowSign,colSign);
cell.textContent=score+'%';
var color=score>=80?'var(--ok)':score>=60?'var(--accent-3)':score>=45?'var(--muted)':'var(--danger)';
cell.style.color=color;
cell.title=rowSign.name+' × '+colSign.name+' = '+score+'%';
(function(ri,ci){
cell.addEventListener('click',function(){
haptic();
state.activeIndex=ri;
renderAll();
var ms=document.getElementById('matrixSection');
if(ms)ms.scrollIntoView({behavior:'smooth',block:'center'});
});
})(ri,ci);
}
grid.appendChild(cell);
});
});
if(window.__ANIM)setTimeout(function(){window.__ANIM.glowMatrix();},200);
}

function renderFriendComparator(){
var result=$('friendResult');
if(!result)return;
if(state.friendIndex===null){
result.innerHTML='<div class="friend-empty">اختر تاريخ ميلاد صديقك لحساب التوافق.</div>';
return;
}
var a=SIGNS[state.activeIndex],b=SIGNS[state.friendIndex];
var score=compatibilityScore(a,b);
var info=compatLabel(score);
result.innerHTML='<div class="friend-result"><div class="friend-person"><div class="sym">'+a.symbol+'</div><div class="name">'+a.name+'</div><div class="date">أنت</div></div><div class="friend-score"><div class="num" data-count="'+score+'">0</div><div class="lbl">% '+info.text+'</div></div><div class="friend-person"><div class="sym">'+b.symbol+'</div><div class="name">'+b.name+'</div><div class="date">صديقك</div></div></div><p style="text-align:center;color:var(--muted);font-size:13px;line-height:1.85;margin-top:14px">'+info.desc+'</p>';
requestAnimationFrame(function(){var el=result.querySelector('[data-count]');if(el)animateCount(el,score,1300);});
}

function renderDaily(){
var wrap=$('dailySection');
if(!wrap)return;
var s=SIGNS[state.activeIndex];
var msg=dailyMessage(s,todayISO);
var meta=dailyMeta(s,todayISO);
var age=state.birthDate?calcAge(state.birthDate):null;
var ageHTML='';
if(age){
var bdayText=age.daysToBday===0?'اليوم 🎂':age.daysToBday===1?'غدًا 🎂':age.daysToBday+' يوم';
var nextDate=age.nextBirthday?formatArabicDate(age.nextBirthday):'—';
ageHTML='<div class="age-panel"><div class="age-panel-head"><div><div class="age-panel-kicker">BIRTHDAY PROFILE</div><div class="age-panel-title">بيانات ميلادك</div></div><div class="age-panel-badge">'+s.symbol+'</div></div><div class="age-block"><div><div class="label">عمرك الآن</div><div class="sub">من تاريخ '+formatArabicDate(state.birthDate)+'</div></div><div style="text-align:left"><div class="value">'+age.years+' سنة</div></div></div><div class="age-block"><div><div class="label">المتبقي على عيد ميلادك</div><div class="sub">موعده القادم: '+nextDate+'</div></div><div style="text-align:left"><div class="value">'+bdayText+'</div></div></div><div class="age-block"><div><div class="label">برجك</div><div class="sub">'+s.element+' · '+s.mode+' · '+s.ruler+'</div></div><div style="text-align:left"><div class="value">'+s.symbol+' '+s.name+'</div></div></div><button class="age-share-btn" id="shareImageBtn" type="button"><span class="age-share-icon">✦</span><span>تحميل بطاقة ميلادك كصورة</span><span>↓</span></button></div>';
}
wrap.innerHTML='<div class="daily"><div class="daily-card"><div class="daily-symbol">'+s.symbol+'</div><div class="daily-date">'+formatArabicDate(todayISO)+'</div><div class="daily-title">رسالة '+s.name+' اليوم</div><div class="daily-text">'+msg+'</div><div class="daily-meta"><div><small>الحظ</small><strong>'+meta.luck+'%</strong></div><div><small>الحب</small><strong>'+meta.love+'%</strong></div><div><small>الطاقة</small><strong>'+meta.energy+'%</strong></div></div></div>'+ageHTML+'</div>';
var shareBtn=$('shareImageBtn');
if(shareBtn)shareBtn.addEventListener('click',downloadShareImage);
setTimeout(function(){
document.querySelectorAll('.daily-meta strong').forEach(function(el,i){
setTimeout(function(){el.classList.add('pulse-val');setTimeout(function(){el.classList.remove('pulse-val');},900);},i*150);
});
},400);
}

function renderAllSigns(){
var grid=$('allSignsGrid');
grid.innerHTML='';
SIGNS.forEach(function(s,i){
var card=document.createElement('button');
card.type='button';
card.className='sign-card pop-in'+(i===state.activeIndex?' active':'');
card.style.animationDelay=(i*40)+'ms';
card.innerHTML='<div class="sign-card-symbol">'+s.symbol+'</div><div class="sign-card-name"></div><div class="sign-card-range">'+s.range+'</div>';
card.querySelector('.sign-card-name').textContent=s.name;
card.addEventListener('click',function(e){haptic();if(window.__ANIM){window.__ANIM.flipSign(card);window.__ANIM.starBurstAt(e.clientX,e.clientY);}setTimeout(function(){selectSign(i,false,true);},300);});
grid.appendChild(card);
});
}

function renderSaved(){
var body=$('savedBody');
if(!body)return;
var profiles=Storage.read(Storage.KEY_PROFILES,[]);
if(!profiles.length){body.innerHTML='<div class="saved-empty">لا توجد نتائج محفوظة بعد.</div>';return;}
var grid=document.createElement('div');
grid.className='saved-grid';
profiles.forEach(function(p,idx){
var s=SIGNS[p.index];
if(!s)return;
var card=document.createElement('div');
card.className='saved-card';
card.innerHTML='<button class="del" type="button" aria-label="حذف">×</button><button class="open" type="button"><div class="sym">'+s.symbol+'</div><div class="name">'+s.name+(p.label?' — '+esc(p.label):'')+'</div><div class="date">'+esc(p.dateLabel||'')+'</div></button>';
card.querySelector('.open').addEventListener('click',function(){
state.activeIndex=p.index;
state.birthDate=p.birthDate||'';
if(landingDP&&p.birthDate)landingDP.setSelected(p.birthDate);
$('discoverDate').textContent=p.dateLabel||formatArabicDate(p.birthDate);
$('landingView').classList.remove('active');
$('resultView').classList.add('active');
$('headerNew').hidden=false;
renderAll();
$('discoverShell').classList.add('revealed');
window.scrollTo({top:0,behavior:'smooth'});
haptic();
});
card.querySelector('.del').addEventListener('click',function(){
var upd=Storage.read(Storage.KEY_PROFILES,[]).filter(function(_,i){return i!==idx;});
Storage.write(Storage.KEY_PROFILES,upd);
renderSaved();
toast('تم الحذف');
});
grid.appendChild(card);
});
body.innerHTML='';
body.appendChild(grid);
}

function renderProgress(){
var pct=((state.activeIndex+1)/12)*100;
$('progressBar').style.width=pct+'%';
$('progressLabel').textContent=String(state.activeIndex+1).padStart(2,'0')+' / 12';
}

function renderAll(){
try{
renderOrbit();
renderIdentity();
renderWheel();
renderWheelInfo();
renderMusicCard();
renderMBTI();
renderRadar();
renderEnergy();
renderMode();
renderMyth();
var currentSign=SIGNS[state.activeIndex];
renderTwin(currentSign,pickDailyTwin(currentSign.id));
renderTop3();
renderMatrix();
renderFriendComparator();
renderDaily();
renderAllSigns();
renderSaved();
renderProgress();
if(window.__ANIM){
setTimeout(function(){window.__ANIM.attachRevealOnScroll();window.__ANIM.upgradeButtons();},100);
}
}catch(e){if(window.console&&console.error)console.error(e);}
}

function selectSign(index,replay,scrollTop){
if(index===state.activeIndex)return;
if(index<0||index>=SIGNS.length)return;
state.activeIndex=index;
state.activeMode='overview';
if(window.__ANIM)window.__ANIM.orbHeartbeat();
renderAll();
if(AudioManager.enabled){AudioManager.play();}
if(replay){
var stage=$('revealStage');
if(stage){stage.classList.remove('play');void stage.offsetWidth;stage.classList.add('play');}
Sound.chime();
}
if(scrollTop)window.scrollTo({top:0,behavior:'smooth'});
}

function validateDate(iso){
var d=parseISO(iso);
if(!d)return 'اختر تاريخًا صحيحًا.';
if(d>parseISO(todayISO))return 'التاريخ لا يمكن أن يكون في المستقبل.';
if(d<parseISO(MIN_DATE))return 'اختر تاريخًا من عام 1900 أو بعده.';
return '';
}
function calcAge(birthISO){
var d=parseISO(birthISO);
if(!d)return null;
var now=new Date();
var y=now.getUTCFullYear(),m=now.getUTCMonth(),day=now.getUTCDate();
var by=d.getUTCFullYear(),bm=d.getUTCMonth(),bd=d.getUTCDate();
var years=y-by-((m<bm||(m===bm&&day<bd))?1:0);
var nowUTC=Date.UTC(y,m,day);
var bUTC=Date.UTC(by,bm,bd);
var days=Math.floor((nowUTC-bUTC)/86400000);
var next=new Date(Date.UTC(y,bm,bd));
if(next.getTime()<nowUTC)next.setUTCFullYear(y+1);
var daysToBday=Math.ceil((next.getTime()-nowUTC)/86400000);
return {years:years,days:days,daysToBday:daysToBday,nextBirthday:toISO(next.getUTCFullYear(),next.getUTCMonth(),next.getUTCDate())};
}
function dailyMessage(sign,dateISO){var msgs=DAILY_TONES[sign.element]||DAILY_TONES['النار'];return msgs[dayHash(sign.id+dateISO)%msgs.length];}
function dailyMeta(sign,dateISO){var seed=dayHash(sign.id+dateISO+'meta');return {luck:55+(seed%43),love:55+((seed>>3)%43),energy:55+((seed>>6)%43)};}
function calcEnergyLevel(sign){var vals=Object.values(sign.meters);var avg=vals.reduce(function(a,b){return a+b;},0)/vals.length;return Math.max(20,Math.min(100,Math.round(avg+(dayHash(sign.id+todayISO)%20-10))));}

function startAnalysis(){
var v=state.birthDate;
var msg=validateDate(v);
$('dateError').textContent=msg;
if(msg){toast(msg);return;}
var d=parseISO(v);
state.activeIndex=signIndexFromDate(d);
if(state.activeIndex<0)state.activeIndex=0;
$('discoverDate').textContent=formatArabicDate(state.birthDate);
if(window.__ANIM){
window.__ANIM.transitionTo(function(){
$('landingView').classList.remove('active');
$('resultView').classList.add('active');
$('headerNew').hidden=false;
renderAll();
var stage=$('revealStage');
if(stage){stage.classList.remove('play');void stage.offsetWidth;stage.classList.add('play');}
$('discoverShell').classList.add('revealed');
window.scrollTo({top:0,behavior:'smooth'});
Sound.chime();
setTimeout(function(){fireConfetti();window.__ANIM.premiumConfetti();},400);
if(AudioManager.enabled){setTimeout(function(){AudioManager.play();renderMusicCard();},900);}
});
}else{
$('landingView').classList.remove('active');
$('resultView').classList.add('active');
$('headerNew').hidden=false;
renderAll();
}
haptic(12);
}

function reset(){
if(window.__ANIM){
window.__ANIM.transitionTo(function(){
$('resultView').classList.remove('active');
$('landingView').classList.add('active');
$('headerNew').hidden=true;
window.scrollTo({top:0,behavior:'smooth'});
if(AudioManager.enabled){setTimeout(function(){AudioManager.playLanding();},300);}
});
}else{
$('resultView').classList.remove('active');
$('landingView').classList.add('active');
$('headerNew').hidden=true;
window.scrollTo({top:0,behavior:'smooth'});
}
}

function saveCurrentProfile(){
var label=window.prompt('اسم مختصر للحفظ (اختياري):','')||'';
var profiles=Storage.read(Storage.KEY_PROFILES,[]);
profiles.unshift({
index:state.activeIndex,
birthDate:state.birthDate,
dateLabel:state.birthDate?formatArabicDate(state.birthDate):formatArabicDate(todayISO),
label:label.trim().slice(0,24),
savedAt:Date.now()
});
Storage.write(Storage.KEY_PROFILES,profiles.slice(0,12));
renderSaved();
toast('تم الحفظ');
haptic();
}

function canvasToBlob(canvas){return new Promise(function(resolve,reject){try{if(canvas.toBlob)canvas.toBlob(function(b){if(b)resolve(b);else reject(new Error('toBlob failed'));},'image/png');else{var d=canvas.toDataURL('image/png');var bin=atob(d.split(',')[1]);var arr=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);resolve(new Blob([arr],{type:'image/png'}));}}catch(e){reject(e);}});}
async function saveBlob(blob,filename){
if(window.showSaveFilePicker){
try{var handle=await window.showSaveFilePicker({suggestedName:filename,types:[{description:'PNG Image',accept:{'image/png':['.png']}}]});var writable=await handle.createWritable();await writable.write(blob);await writable.close();return true;}catch(e){if(e.name==='AbortError')return false;}
}
try{var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=filename;a.rel='noopener';a.style.display='none';document.body.appendChild(a);a.click();setTimeout(function(){try{document.body.removeChild(a);URL.revokeObjectURL(url);}catch(e){}},2500);return true;}catch(e){toast('تعذر التحميل');return false;}
}

function buildShareCanvas(){
var s=SIGNS[state.activeIndex];
var age=state.birthDate?calcAge(state.birthDate):null;
var W=1080,H=1350;
var c=document.createElement('canvas');c.width=W;c.height=H;
var ctx=c.getContext('2d');
var elementColors={'النار':['#1a0f08','#0d0603'],'الأرض':['#0f1a0d','#050807'],'الهواء':['#0d1418','#050809'],'الماء':['#0d161c','#050809']};
var ec=elementColors[s.element]||elementColors['النار'];
var bg=ctx.createLinearGradient(0,0,W,H);
bg.addColorStop(0,ec[0]);bg.addColorStop(.5,'#080a12');bg.addColorStop(1,ec[1]);
ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
var accentColors={'النار':'232,168,106','الأرض':'157,191,148','الهواء':'157,196,224','الماء':'136,182,201'};
var ac=accentColors[s.element]||'215,191,135';
var rg=ctx.createRadialGradient(W/2,330,0,W/2,330,760);
rg.addColorStop(0,'rgba('+ac+',.3)');rg.addColorStop(1,'rgba('+ac+',0)');
ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
for(var i=0;i<260;i++){var r=Math.random()*1.9+.25;ctx.fillStyle='rgba(255,244,214,'+(Math.random()*.7+.08)+')';ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,r,0,Math.PI*2);ctx.fill();}
ctx.strokeStyle='rgba('+ac+',.48)';ctx.lineWidth=2.5;ctx.strokeRect(38,38,W-76,H-76);
ctx.strokeStyle='rgba('+ac+',.14)';ctx.lineWidth=1;ctx.strokeRect(54,54,W-108,H-108);
ctx.fillStyle='rgba('+ac+',.96)';ctx.font='900 30px Cinzel, serif';ctx.textAlign='center';ctx.direction='ltr';
ctx.fillText('MS ZODIAC',W/2,116);
ctx.fillStyle='rgba(255,255,255,.43)';ctx.font='700 14px Cinzel, serif';ctx.fillText('BIRTHDAY PROFILE',W/2,148);
ctx.save();ctx.shadowColor='rgba('+ac+',.95)';ctx.shadowBlur=85;ctx.fillStyle='#f0dfad';ctx.font='310px Cinzel, serif';ctx.fillText(s.symbol,W/2,500);ctx.restore();
ctx.fillStyle='#f5f2e9';ctx.font='900 92px Tajawal, system-ui, sans-serif';ctx.direction='rtl';ctx.fillText(s.name,W/2,635);
ctx.fillStyle='rgba('+ac+',.88)';ctx.font='700 27px Tajawal, system-ui, sans-serif';ctx.fillText(s.range,W/2,682);
var panelY=745,panelH=300;
var pg=ctx.createLinearGradient(0,panelY,W,panelY+panelH);pg.addColorStop(0,'rgba(255,255,255,.045)');pg.addColorStop(1,'rgba('+ac+',.075)');
ctx.fillStyle=pg;ctx.strokeStyle='rgba('+ac+',.28)';ctx.lineWidth=1.5;ctx.beginPath();var px=105,py=panelY,pw=W-210,ph=panelH,pr=30;ctx.moveTo(px+pr,py);ctx.lineTo(px+pw-pr,py);ctx.quadraticCurveTo(px+pw,py,px+pw,py+pr);ctx.lineTo(px+pw,py+ph-pr);ctx.quadraticCurveTo(px+pw,py+ph,px+pw-pr,py+ph);ctx.lineTo(px+pr,py+ph);ctx.quadraticCurveTo(px,py+ph,px,py+ph-pr);ctx.lineTo(px,py+pr);ctx.quadraticCurveTo(px,py,px+pr,py);ctx.closePath();ctx.fill();ctx.stroke();
var colX=[250,540,830];
var labels=['العمر','عيد الميلاد القادم','البرج'];
var values=[age?age.years+' سنة':'—',age?(age.daysToBday===0?'اليوم!':age.daysToBday+' يوم'):'—',s.symbol+' '+s.name];
var subs=[age&&state.birthDate?formatArabicDate(state.birthDate):'تاريخ الميلاد',age&&age.nextBirthday?formatArabicDate(age.nextBirthday):'الموعد القادم',s.element+' · '+s.mode];
for(var ci=0;ci<3;ci++){ctx.fillStyle='rgba('+ac+',.72)';ctx.font='800 19px Tajawal, system-ui, sans-serif';ctx.textAlign='center';ctx.direction='rtl';ctx.fillText(labels[ci],colX[ci],805);ctx.fillStyle='#f5f2e9';ctx.font='900 31px Tajawal, system-ui, sans-serif';ctx.fillText(values[ci],colX[ci],855);ctx.fillStyle='rgba(255,255,255,.45)';ctx.font='500 16px Tajawal, system-ui, sans-serif';ctx.fillText(subs[ci],colX[ci],895);if(ci<2){ctx.fillStyle='rgba('+ac+',.22)';ctx.fillRect(colX[ci]+145,790,1,85);}}
ctx.fillStyle='rgba(255,255,255,.52)';ctx.font='500 22px Tajawal, system-ui, sans-serif';ctx.textAlign='center';ctx.direction='rtl';ctx.fillText('بطاقة شخصية من تجربة MS ZODIAC',W/2,1115);
ctx.fillStyle='rgba('+ac+',.82)';ctx.font='800 24px Cinzel, serif';ctx.direction='ltr';ctx.fillText('DEV Mohamed Samir',W/2,H-88);
ctx.fillStyle='rgba(255,255,255,.3)';ctx.font='500 13px Tajawal, system-ui, sans-serif';ctx.fillText('MS ZODIAC  ·  PERSONAL BIRTHDAY CARD',W/2,H-58);
return c;
}

async function downloadShareImage(){
try{
var canvas=buildShareCanvas();
toast('⏳ جاري التحميل...');
var blob=await canvasToBlob(canvas);
var filename='ms-zodiac-'+SIGNS[state.activeIndex].id+'-'+Date.now()+'.png';
var ok=await saveBlob(blob,filename);
if(ok){toast('✅ تم تحميل الصورة');haptic(15);}
}catch(e){toast('تعذر التحميل');}
}

var kdState={name:'',claimedSign:'',step:0,answers:[]};

function kdInitSignGrid(){
var grid=$('kdSignGrid');
grid.innerHTML=SIGNS.map(function(s){return '<button class="kd-sign-pick" data-sign="'+s.id+'" type="button"><span class="kd-sp-sym">'+s.symbol+'</span><span class="kd-sp-name">'+s.name+'</span></button>';}).join('');
grid.querySelectorAll('.kd-sign-pick').forEach(function(btn){
btn.addEventListener('click',function(e){
grid.querySelectorAll('.kd-sign-pick').forEach(function(b){b.classList.remove('selected');});
btn.classList.add('selected');
kdState.claimedSign=btn.dataset.sign;
$('kdStartBtn').disabled=false;
haptic(6);
if(window.__ANIM)window.__ANIM.particleBurst(e.clientX,e.clientY,{count:8});
});
});
}
function kdShowScreen(name){document.querySelectorAll('.kd-screen').forEach(function(s){s.classList.toggle('active',s.dataset.screen===name);});}
function kdStart(){kdState.name=($('kdName').value||'').trim();if(!kdState.claimedSign)return;kdState.step=0;kdState.answers=[];kdShowScreen('question');kdRenderQuestion();}
function kdRenderQuestion(){
var i=kdState.step;
var q=KD_QUESTIONS[i];
var pct=(i/KD_QUESTIONS.length)*100;
$('kdProgressBar').style.width=pct+'%';
$('kdProgressText').textContent=(i+1)+' من '+KD_QUESTIONS.length;
var wrap=$('kdQuestionWrap');
wrap.innerHTML='<div class="kd-q-icon">'+q.icon+'</div><h3 class="kd-q-text">'+q.text+'</h3><p class="kd-q-hint">'+q.hint+'</p><div class="kd-options">'+q.options.map(function(opt,idx){return '<button class="kd-option" data-opt="'+opt.id+'" type="button"><span class="kd-opt-letter">'+['أ','ب','ج','د'][idx]+'</span><span class="kd-opt-text">'+opt.text+'</span></button>';}).join('')+'</div>';
wrap.querySelectorAll('.kd-option').forEach(function(btn){
btn.addEventListener('click',function(e){
wrap.querySelectorAll('.kd-option').forEach(function(b){b.classList.remove('selected');});
btn.classList.add('selected');
kdState.answers[i]=btn.dataset.opt;
haptic(6);
if(window.__ANIM)window.__ANIM.particleBurst(e.clientX,e.clientY,{count:8});
setTimeout(function(){if(kdState.step<KD_QUESTIONS.length-1){kdState.step++;kdRenderQuestion();}else{kdShowResult();}},420);
});
});
if(kdState.answers[i]){var sel=wrap.querySelector('[data-opt="'+kdState.answers[i]+'"]');if(sel)sel.classList.add('selected');}
}
function kdComputeScores(){var scores={};SIGNS.forEach(function(s){scores[s.id]=0;});KD_QUESTIONS.forEach(function(q,i){var ans=kdState.answers[i];if(!ans)return;var opt=q.options.find(function(o){return o.id===ans;});if(!opt)return;Object.keys(opt.pts).forEach(function(sid){scores[sid]=(scores[sid]||0)+opt.pts[sid];});});return scores;}
function kdScoreToPct(score){return Math.min(98,Math.round((score/15)*100));}
function kdShowResult(){
var scores=kdComputeScores();
var sorted=Object.keys(scores).map(function(k){return [k,scores[k]];}).sort(function(a,b){return b[1]-a[1];});
var detectedId=sorted[0][0];
var detected=SIGNS.find(function(s){return s.id===detectedId;});
var claimed=SIGNS.find(function(s){return s.id===kdState.claimedSign;});
var detectPct=kdScoreToPct(sorted[0][1]);
var claimedPct=kdScoreToPct(scores[kdState.claimedSign]||0);
var isSame=detectedId===kdState.claimedSign;
var warning=SIGNS.find(function(s){return s.id===sorted[sorted.length-1][0];});
var top3=sorted.slice(0,3).map(function(pair){return {sign:SIGNS.find(function(s){return s.id===pair[0];}),pct:kdScoreToPct(pair[1])};});
var emoji,title,verdict;
if(isSame){emoji='🎯';title='أنت فعلًا برجك! 💪';verdict='عادل جدًا! اتضح إنك <b>'+claimed.name+' '+claimed.symbol+'</b> بجد — مش بس على البطاقة. جوابك على المواقف طلع متوافق مع طبيعتك الفلكية بنسبة <b>'+claimedPct+'%</b>. ثق في حدسك، أنت عارف نفسك.';}
else if(detectPct>=70){emoji='😅';title='فضيحة! مش برجك خالص';verdict='أنت قلت إنك <b>'+claimed.name+' '+claimed.symbol+'</b>... لكن إجاباتك بتقول حاجة تانية تمامًا. أنت <b>'+detected.name+' '+detected.symbol+'</b> في التعامل مع المواقف الحقيقية — بنسبة <b>'+detectPct+'%</b>. يمكن تكون اتولدت في يوم غلط؟ 😂';}
else if(detectPct>=50){emoji='🤔';title='قريب بس مش مطابق';verdict='برجك الفلكي <b>'+claimed.name+'</b>، لكن تصرفاتك أقرب لـ <b>'+detected.name+' '+detected.symbol+'</b>. فيه حاجة فيك مش زي المتوقع — يمكن أنت أكثر '+detected.name+' مما تتخيل.';}
else{emoji='🎭';title='شخصية معقدة! 😂';verdict='جوابك مش مركز على برج واحد — ده معناه إن شخصيتك متعددة الأوجه. أنت مزيج من <b>'+top3[0].sign.name+'</b>، <b>'+top3[1].sign.name+'</b>، و <b>'+top3[2].sign.name+'</b>. مش سهل تصنيفك، وده سر تميزك.';}
var warningText;
if(warning.id===kdState.claimedSign){warningText='إزاي إنت برج <b>'+warning.name+' '+warning.symbol+'</b> وكمان أبعد واحد عن طبيعتك في الاختبار؟ 😂 يمكن تحتاج تفكر تاني في تاريخ ميلادك!';}
else{warningText='لو قعدت أسبوع مع حد من برج <b>'+warning.name+' '+warning.symbol+'</b>، غالبًا هتحتاجوا محامي 😂 — طبائعكم مختلفة تمامًا. تجنّبوا النقاش في السياسة والرياضة.';}
var wrap=$('kdResultWrap');
wrap.innerHTML='<div class="kd-result-hero"><span class="kd-result-emoji">'+emoji+'</span><h2 class="kd-result-title">'+title+'</h2><p class="kd-result-sub">'+(kdState.name?kdState.name+' — ':'')+'نتيجة كشف الأبراج</p></div><div class="kd-sign-compare"><div class="kd-sc-box"><div class="kd-sc-label">برجك الفلكي</div><div class="kd-sc-sym">'+claimed.symbol+'</div><div class="kd-sc-name">'+claimed.name+'</div></div><div class="kd-vs">VS</div><div class="kd-sc-box"><div class="kd-sc-label">شخصيتك الحقيقية</div><div class="kd-sc-sym">'+detected.symbol+'</div><div class="kd-sc-name">'+detected.name+'</div></div></div><div class="kd-match-circle"><div class="kd-circle-wrap"><svg viewBox="0 0 120 120"><circle class="kd-bg-circle" cx="60" cy="60" r="55"/><circle class="kd-fg-circle" cx="60" cy="60" r="55" style="stroke-dashoffset:345"/></svg><div class="kd-circle-inner"><span id="kdPctNum">0</span><small>%</small></div></div><div class="kd-circle-caption">تطابق مع <strong>'+detected.name+'</strong></div></div><div class="kd-verdict"><p>'+verdict+'</p></div><div class="kd-top-signs"><h4>🎯 أقرب 3 أبراج ليك</h4>'+top3.map(function(t){return '<div class="kd-top-row"><span class="kd-tr-sym">'+t.sign.symbol+'</span><span class="kd-tr-name">'+t.sign.name+'</span><div class="kd-tr-bar"><span data-w="'+t.pct+'%"></span></div><span class="kd-tr-pct">'+t.pct+'%</span></div>';}).join('')+'</div><div class="kd-warning"><h4>🚨 تحذير</h4><p>'+warningText+'</p></div><div class="kd-result-actions"><button class="kd-action" id="kdRetryBtn" type="button">🔄 جرّب تاني</button><button class="kd-action primary" id="kdShareBtn" type="button">📤 شارك النتيجة</button></div>';
kdShowScreen('result');
requestAnimationFrame(function(){
var offset=345-(345*detectPct/100);
var c=wrap.querySelector('.kd-fg-circle');
if(c)c.style.strokeDashoffset=offset;
var num=$('kdPctNum');
if(num)animateCount(num,detectPct,1500);
wrap.querySelectorAll('.kd-tr-bar span').forEach(function(b,i){setTimeout(function(){b.style.width=b.dataset.w;},i*150+200);});
});
$('kdRetryBtn').addEventListener('click',function(){kdState.step=0;kdState.answers=[];kdShowScreen('intro');});
$('kdShareBtn').addEventListener('click',async function(){
var text=(kdState.name?kdState.name+' — ':'')+'برجي الفلكي: '+claimed.name+' '+claimed.symbol+'\nشخصيتي الحقيقية: '+detected.name+' '+detected.symbol+' ('+detectPct+'% تطابق)\nاكتشف برجك الحقيقي في MS Zodiac';
try{if(navigator.share)await navigator.share({title:'كشف الأبراج',text:text});else if(navigator.clipboard){await navigator.clipboard.writeText(text);toast('✅ تم نسخ النتيجة');}else toast('المشاركة غير مدعومة');}catch(e){}
});
if(window.__ANIM)window.__ANIM.premiumConfetti();
haptic(15);
}

function kdOpenModal(){var modal=$('kdModal');modal.classList.add('show');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';kdState.name='';kdState.claimedSign='';kdState.step=0;kdState.answers=[];$('kdName').value='';$('kdStartBtn').disabled=true;document.querySelectorAll('.kd-sign-pick').forEach(function(b){b.classList.remove('selected');});kdShowScreen('intro');}
function kdCloseModal(){var modal=$('kdModal');modal.classList.remove('show');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';}

function handleKeys(e){
if($('kdModal').classList.contains('show'))return;
if(!$('resultView').classList.contains('active'))return;
if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
var dpPanel=document.querySelector('.dp-panel.open');
if(dpPanel)return;
if(e.key==='ArrowRight')selectSign((state.activeIndex-1+SIGNS.length)%SIGNS.length,true);
else if(e.key==='ArrowLeft')selectSign((state.activeIndex+1)%SIGNS.length,true);
else if(e.key==='Escape')reset();
}

function setupPerf(){
document.addEventListener('visibilitychange',function(){
try{
if(document.hidden){if(starField)starField.pause();if(elementBG)elementBG.pause();if(ZodiacMusic.isPlaying)ZodiacMusic.stop();if(AudioManager.audioEl&&!AudioManager.audioEl.paused){AudioManager.audioWasPlaying=true;AudioManager.audioEl.pause();}}else{if(starField)starField.resume();if(elementBG)elementBG.resume();if(AudioManager.audioWasPlaying&&AudioManager.enabled){AudioManager.audioWasPlaying=false;AudioManager.play();}}
}catch(e){}
});
}

var landingDP=null;
var friendDP=null;
var elementBG=null;
var starField=null;

function init(){
Theme.init();
Sound.init();
ZodiacMusic.init();
AudioManager.init();

var savedSettings=Storage.read(Storage.KEY_SETTINGS,{});
var savedBirth=savedSettings.birthDate||'';

landingDP=LuxeDatePicker($('landingDP'),{
label:'تاريخ الميلاد',
placeholder:'اختر تاريخًا فخمًا لرحلتك',
onConfirm:function(iso){
state.birthDate=iso;
$('startBtn').disabled=false;
$('dateError').textContent='';
var st=Storage.read(Storage.KEY_SETTINGS,{});
Storage.write(Storage.KEY_SETTINGS,Object.assign({},st,{birthDate:iso}));
toast('تم اختيار '+formatArabicDate(iso));
}
});

if(savedBirth){
state.birthDate=savedBirth;
landingDP.setSelected(savedBirth);
$('startBtn').disabled=false;
}

friendDP=LuxeDatePicker($('friendDP'),{
label:'تاريخ ميلاد الصديق',
placeholder:'اختر تاريخ ميلاد صديقك',
onConfirm:function(iso){
var d=parseISO(iso);
if(!d)return;
var msg=validateDate(iso);
if(msg){toast(msg);return;}
state.friendDate=iso;
state.friendIndex=signIndexFromDate(d);
if(state.friendIndex<0)state.friendIndex=0;
$('friendCalcBtn').disabled=false;
renderFriendComparator();
toast('تم اختيار التاريخ');
}
});

$('startBtn').addEventListener('click',startAnalysis);
$('newAnalysis').addEventListener('click',reset);
$('headerNew').addEventListener('click',reset);
$('homeBtn').addEventListener('click',function(){haptic();reset();});
$('saveCurrentBtn').addEventListener('click',saveCurrentProfile);
$('savedBtn').addEventListener('click',function(){
var el=$('savedBody').closest('.section-block');
if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
});
$('friendCalcBtn').addEventListener('click',function(){
if(state.friendIndex===null){toast('اختر تاريخ ميلاد الصديق أولًا');return;}
renderFriendComparator();
haptic();
toast('تم حساب التوافق');
});
$('kdBtn').addEventListener('click',kdOpenModal);
$('kdClose').addEventListener('click',kdCloseModal);
$('kdStartBtn').addEventListener('click',kdStart);
$('kdModal').addEventListener('click',function(e){if(e.target===$('kdModal'))kdCloseModal();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('kdModal').classList.contains('show'))kdCloseModal();});
kdInitSignGrid();
document.addEventListener('keydown',handleKeys);

try{
starField=new StarField($('stars'));
elementBG=new ElementBG($('element-bg'));
}catch(e){}

setupPerf();

var aura=$('elementAura');
if(aura){aura.classList.add('active');aura.setAttribute('data-el','النار');}

/* ★★★ تشغيل محرك الحركات ★★★ */
if(window.__ANIM){
window.__ANIM.attachRevealOnScroll();
window.__ANIM.upgradeButtons();
setTimeout(function(){window.__ANIM.upgradeButtons();},600);
setTimeout(function(){window.__ANIM.upgradeButtons();},1800);
}
}

/* ============================================================
   ★★★ PREMIUM ANIMATIONS ENGINE ★★★
   ============================================================ */
(function(){
'use strict';

var ANIM = {};

ANIM.createCurtain = function(){
  var existing = document.querySelector('.curtain-overlay');
  if(existing) return existing;
  var c = document.createElement('div');
  c.className = 'curtain-overlay';
  c.innerHTML = '<div class="curtain-panel"></div><div class="curtain-panel"></div>';
  document.body.appendChild(c);
  return c;
};

ANIM.transitionTo = function(callback){
  var curtain = this.createCurtain();
  curtain.style.display = 'grid';
  curtain.classList.remove('opening');
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      curtain.classList.add('opening');
    });
  });
  setTimeout(function(){ if(callback) callback(); }, 550);
  setTimeout(function(){
    curtain.style.display = 'none';
    curtain.classList.remove('opening');
  }, 1200);
};

ANIM.attachRipple = function(el){
  if(!el || el._hasRipple) return;
  el._hasRipple = true;
  el.classList.add('ripple-host');
  el.addEventListener('click', function(e){
    var rect = el.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    if(x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    var size = Math.max(rect.width, rect.height) * 2;
    var r = document.createElement('span');
    r.className = 'ripple';
    r.style.width = size + 'px';
    r.style.height = size + 'px';
    r.style.left = (x - size/2) + 'px';
    r.style.top = (y - size/2) + 'px';
    el.appendChild(r);
    setTimeout(function(){ r.remove(); }, 900);
  });
};

ANIM.attachMagnetic = function(el, strength){
  if(!el || el._hasMagnetic) return;
  el._hasMagnetic = true;
  strength = strength || 0.25;
  el.addEventListener('mousemove', function(e){
    var rect = el.getBoundingClientRect();
    var x = (e.clientX - rect.left - rect.width/2) * strength;
    var y = (e.clientY - rect.top - rect.height/2) * strength;
    el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  });
  el.addEventListener('mouseleave', function(){
    el.style.transform = '';
  });
};

ANIM.particleBurst = function(x, y, options){
  options = options || {};
  var count = options.count || 12;
  var colors = options.colors || ['#f5c95a', '#ffe9b0', '#d7bf87', '#e8a86a'];
  for(var i = 0; i < count; i++){
    var p = document.createElement('div');
    p.className = 'burst-particle';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.background = colors[i % colors.length];
    p.style.color = colors[i % colors.length];
    var angle = (Math.PI * 2 * i) / count + (Math.random() - .5) * .5;
    var dist = 60 + Math.random() * 120;
    p.style.setProperty('--bx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--by', Math.sin(angle) * dist + 'px');
    document.body.appendChild(p);
    setTimeout((function(el){ return function(){ el.remove(); }; })(p), 1100);
  }
};

ANIM.attachRevealOnScroll = function(){
  var targets = document.querySelectorAll('.section-block:not(.revealed), .wheel-section:not(.revealed), .myth-section:not(.revealed), .twin-section:not(.revealed), .explore:not(.revealed)');
  if(!('IntersectionObserver' in window)){
    targets.forEach(function(t){ t.classList.add('revealed'); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  targets.forEach(function(t){ t.classList.add('reveal-on-scroll'); io.observe(t); });
};

ANIM.attachTilt = function(el, max){
  if(!el || el._hasTilt) return;
  el._hasTilt = true;
  max = max || 5;
  el.classList.add('tilt-card');
  el.addEventListener('mousemove', function(e){
    var rect = el.getBoundingClientRect();
    var x = (e.clientX - rect.left) / rect.width - .5;
    var y = (e.clientY - rect.top) / rect.height - .5;
    el.style.transform = 'perspective(1000px) rotateX(' + (-y * max) + 'deg) rotateY(' + (x * max) + 'deg)';
  });
  el.addEventListener('mouseleave', function(){ el.style.transform = ''; });
};

ANIM.attachSpotlight = function(el){
  if(!el || el._hasSpotlight) return;
  el._hasSpotlight = true;
  el.classList.add('hover-spotlight');
  el.addEventListener('mousemove', function(e){
    var rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
    el.style.setProperty('--my', (e.clientY - rect.top) + 'px');
  });
};

ANIM.orbHeartbeat = function(){
  var orb = document.querySelector('.orb');
  if(!orb) return;
  orb.classList.remove('heartbeat');
  void orb.offsetWidth;
  orb.classList.add('heartbeat');
  for(var i = 0; i < 2; i++){
    (function(delay){
      setTimeout(function(){
        var w = document.createElement('div');
        w.className = 'orb-energy-wave';
        orb.appendChild(w);
        requestAnimationFrame(function(){ w.classList.add('active'); });
        setTimeout(function(){ w.remove(); }, 1500);
      }, delay);
    })(i * 200);
  }
};

ANIM.shakeNumber = function(el){
  if(!el) return;
  el.classList.add('shake-number');
  setTimeout(function(){ el.classList.remove('shake-number'); }, 700);
};

ANIM.glowMatrix = function(){
  var cells = document.querySelectorAll('.matrix-cell.score');
  cells.forEach(function(cell, i){
    if(cell.classList.contains('self')) return;
    setTimeout(function(){
      cell.classList.add('glow-now');
      setTimeout(function(){ cell.classList.remove('glow-now'); }, 700);
    }, i * 10);
  });
};

ANIM.starBurstAt = function(x, y){
  var symbols = ['✦', '✧', '★', '⭐'];
  for(var i = 0; i < 6; i++){
    var s = document.createElement('span');
    s.className = 'star-burst';
    s.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    s.style.left = (x + (Math.random() - .5) * 100) + 'px';
    s.style.top = (y + (Math.random() - .5) * 100) + 'px';
    s.style.color = ['#f5c95a', '#ffe9b0', '#d7bf87'][i % 3];
    document.body.appendChild(s);
    setTimeout((function(el){ return function(){ el.remove(); }; })(s), 1300);
  }
};

ANIM.flipSign = function(el){
  if(!el) return;
  el.classList.add('flipping');
  setTimeout(function(){ el.classList.remove('flipping'); }, 750);
};

ANIM.premiumConfetti = function(){
  var shapes = ['✦', '✧', '★', '♈', '♉', '♊', '♋', '♌', '♍', '♎'];
  var colors = ['#f5c95a', '#ffe9b0', '#d7bf87', '#e8a86a', '#f0dfad'];
  for(var i = 0; i < 40; i++){
    var p = document.createElement('div');
    p.className = 'confetti-piece';
    var useSymbol = Math.random() > .5;
    if(useSymbol){
      p.textContent = shapes[Math.floor(Math.random() * shapes.length)];
      p.style.fontSize = (12 + Math.random() * 14) + 'px';
      p.style.color = colors[Math.floor(Math.random() * colors.length)];
    } else {
      p.style.width = (6 + Math.random() * 8) + 'px';
      p.style.height = (6 + Math.random() * 8) + 'px';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.borderRadius = Math.random() > .5 ? '50%' : '2px';
    }
    p.style.left = (Math.random() * 100) + '%';
    p.style.top = '-40px';
    p.style.animationDelay = (Math.random() * .8) + 's';
    p.style.animationDuration = (2.5 + Math.random() * 1.5) + 's';
    document.body.appendChild(p);
    setTimeout((function(el){ return function(){ el.remove(); }; })(p), 5000);
  }
};

ANIM.pulseRing = function(el){
  if(!el) return;
  el.classList.add('pulse');
  setTimeout(function(){ el.classList.remove('pulse'); }, 1000);
};

ANIM.upgradeButtons = function(){
  document.querySelectorAll('.cta-btn, .start-btn, .new-btn, .action-btn, .friend-btn, .save-btn, .ghost-btn, .kd-start, .kd-action, .music-btn, .icon-btn, .dp-confirm, .dp-nav, .dp-quick, .mode-btn, .tab-btn').forEach(function(el){
    ANIM.attachRipple(el);
  });
  document.querySelectorAll('.cta-btn, .start-btn, .new-btn, .action-btn.primary, .kd-start, .kd-action.primary, .friend-btn').forEach(function(el){
    ANIM.attachMagnetic(el, 0.22);
  });
  document.querySelectorAll('.top-match, .wheel-info, .music-card, .daily-card, .identity, .twin-hero, .myth-content, .mbti-col, .feature').forEach(function(el){
    ANIM.attachTilt(el, 5);
    ANIM.attachSpotlight(el);
  });
};

window.__ANIM = ANIM;
})();

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})();

