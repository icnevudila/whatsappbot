(()=>{
 const params=new URLSearchParams(location.search),mode=params.get('mode')||'launch',mobile=params.has('mobile');
 document.body.classList.add(mode);document.body.classList.toggle('mobile',mobile);
 const root=document.querySelector(`[data-film="${mode}"]`);if(!root)throw Error('Unknown film '+mode);
 document.querySelectorAll('[data-film]').forEach(node=>{if(node!==root)node.remove()});root.style.display='block';
 const stage=document.querySelector('#stage'),$=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)],clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v)},at=(t,start,duration=1)=>smooth((t-start)/duration),lerp=(a,b,p)=>a+(b-a)*p;
 const duration=mode==='launch'?26:20;let time=0,running=false,last=0,frame=0;
 const visible=(node,p,y=0)=>{node.style.opacity=String(clamp(p));node.style.transform=`translateY(${y}px)`};
 const type=(node,text,p)=>{node.textContent=text.slice(0,Math.round(text.length*clamp(p)))};
 function dots(selector,t,opacity=1){const node=$(selector);node.style.opacity=String(opacity);[...node.children].forEach((dot,i)=>dot.style.transform=`translateY(${-Math.max(0,Math.sin(t*5-i*.9))*5}px)`)}
 function point(element){const rect=element.getBoundingClientRect(),box=stage.getBoundingClientRect(),scale=box.width/(mode==='launch'?(mobile?900:1000):mobile?900:1400);return {x:(rect.left+rect.width*.66-box.left)/scale,y:(rect.top+rect.height*.6-box.top)/scale}}
 function pointer(t,element,start,click){const node=$('.motion-pointer');if(!node)return;const target=point(element),p=at(t,start,1.15),dip=Math.sin(clamp((t-click)/.45)*Math.PI);node.style.left=lerp(target.x+125,target.x,p)+'px';node.style.top=lerp(target.y-90,target.y,p)+'px';node.style.transform=`scale(${1-.15*dip})`;node.style.opacity=String(at(t,start,.2)*(1-at(t,click+.65,.4)))}
 function launch(t){
  const write=at(t,5,3.8),planned=at(t,10.4,.7),reset=1-at(t,25,1),fly=at(t,12.4,2.4)*reset,delivered=at(t,15.2,3),incoming=at(t,19,.5),reply=at(t,19.8,2.5);
  $$('.hero-people i').forEach((node,i)=>{const p=at(t,1.6+i*.95,.65)*reset;node.style.opacity=p;node.style.transform='scale('+(.6+.4*p)+')'});
  type($('[data-hero-copy]'),'Yeni koleksiyonumuz yayında.\nLIORA No. 07’yi keşfedin.',write*reset);
  if(write<.01)$('[data-hero-copy]').textContent='Mesajınızı hazırlayın…';$('[data-hero-copy]').style.color=write<.01?'#94a08e':'#41563f';
  const synced=Math.floor(at(t,1.2,3.4)*3);$('[data-hero-audience-title]').textContent=synced===3?'Alıcı grubunuz':'WhatsApp rehberiniz';$('.hero-sync-action').textContent=t<1.2?'Rehberden çek ↔':synced<3?synced+' / 3 kişi alınıyor':'3 kişi hazır ✓';$('.hero-sync-action').style.transform='scale('+(1-.05*Math.sin(clamp((t-1.1)/.45)*Math.PI))+')';$$('.hero-people>span').forEach((node,i)=>node.style.opacity=String(.35+.65*at(t,1.6+i*.95,.65)));
  const asset=$('.hero-asset'),copy=$('.hero-copy');
  Object.assign(asset.style,{left:lerp(mobile?75:70,mobile?568:705,fly)+'px',top:lerp(mobile?390:385,mobile?139:150,fly)-Math.sin(fly*Math.PI)*32+'px',width:lerp(mobile?120:110,mobile?244:230,fly)+'px',height:lerp(mobile?150:138,mobile?305:287,fly)+'px',transform:'rotate('+Math.sin(fly*Math.PI)*-4+'deg)'});
  Object.assign(copy.style,{left:lerp(mobile?215:205,mobile?550:705,fly)+'px',top:lerp(mobile?390:385,mobile?455:447,fly)+'px',width:lerp(mobile?585:365,mobile?280:230,fly)+'px',fontSize:lerp(mobile?30:24,mobile?19.5:18.5,fly)+'px'});
  if(mobile){$('.hero-product-app').style.width=lerp(840,475,fly)+'px';$('.hero-product-app').style.left=lerp(30,15,fly)+'px';$('.hero-phone').style.left=lerp(960,520,fly)+'px';$('.hero-app-header>span').style.opacity=String(1-fly);$('.hero-app-header>span').style.maxWidth=lerp(250,0,fly)+'px';$('.hero-app-header>span').style.overflow='hidden';$('.hero-app-header>span').style.whiteSpace='nowrap';$$('.hero-people>span').forEach(node=>{node.style.fontSize=lerp(24,18,fly)+'px';node.style.padding=lerp(14,10,fly)+'px';node.querySelector('i').style.fontSize=lerp(25,20,fly)+'px'});$('.hero-sync-action').style.fontSize=lerp(20,16,fly)+'px'}
  $('.hero-message').style.opacity=String(1-fly);$('.hero-message-bottom').style.opacity=String(1-fly);$('.hero-time').style.opacity=String(.35+.65*planned);$('.clock-face i').style.transform='rotate('+(planned*300)+'deg)';$('.hero-send').style.transform='scale('+(1-.04*Math.sin(clamp((t-12.2)/.5)*Math.PI))+')';
  $('[data-hero-status]').textContent=delivered>.98?'Tamamlandı':fly>.05?'Gönderiliyor':planned>.8?'Planlandı':'Taslak';
  $$('.hero-app-nav>span').forEach((node,i)=>node.classList.toggle('active',i===(fly>.5?2:write>.1?1:0)));
  visible($('.hero-tracking'),at(t,13.1,1)*reset,(1-at(t,13.1,1))*10);$('[data-hero-delivered]').textContent=String(Math.floor(delivered*3));$('[data-hero-replied]').textContent=reply>.8?'1':'0';$('.hero-tracking-line i').style.width=delivered*100+'%';
  $$('.hero-receipts b').forEach((node,i)=>node.style.opacity=String(.2+.8*at(t,15.2+i,.6)*reset));$('.hero-phone-paper').style.opacity=String(fly);$('.hero-message-time').style.opacity=String(at(t,15.3,.5)*reset);
  visible($('.hero-incoming'),incoming*reset,(1-incoming)*14);dots('.hero-incoming .typing-dots',t,1-reply);$('.hero-incoming .typing-dots').style.display=reply>.02?'none':'flex';type($('[data-hero-reply]'),'Merhaba, bilgi alabilir miyim?',reply*reset);visible($('.hero-result'),at(t,22.5,.7)*reset,(1-at(t,22.5,.7))*12);
  if(t<4)pointer(t,$('.hero-sync-action'),.2,1.1);else if(t<9)pointer(t,$('.hero-message'),4.5,5.2);else if(t<11.5)pointer(t,$('.hero-time'),9.1,10.3);else pointer(t,$('.hero-send'),11.4,12.2);
 }
 if(mode==='campaign'){
  const grid=$('.calendar-days');for(let i=0;i<6;i++)grid.append(document.createElement('span'));for(let day=1;day<=30;day++){const span=document.createElement('span');span.textContent=String(day);span.dataset.day=String(day);grid.append(span)}
 }
 function campaign(t){
  const date=at(t,2.1,.5),hour=at(t,4.4,1.1),minute=at(t,5.7,1.2),planned=at(t,8.5,.7),delivery=at(t,12.4,3.2),reset=1-at(t,19,.9),day=$('[data-day="12"]');
  day.classList.toggle('selected',date>.4);day.style.setProperty('--selected',String(date*reset));
  $('[data-hour]').textContent=String(Math.round(9+hour)).padStart(2,'0');$('[data-minute]').textContent=String(Math.round(45*(1-minute))).padStart(2,'0');
  $('[data-hour]').style.transform=`translateY(${Math.sin(hour*Math.PI)*-5}px)`;$('[data-minute]').style.transform=`translateY(${Math.sin(minute*Math.PI)*-5}px)`;
  $('.schedule-confirm').style.transform=`scale(${1-.035*Math.sin(clamp((t-8.1)/.5)*Math.PI)})`;visible($('.calendar-success'),planned*reset,(1-planned)*12);
  $('.run-clock i').style.transform=`rotate(${Math.max(0,t-10.8)*135}deg)`;
  $('[data-run-title]').textContent=t<11.5?'Doğru zamanı siz seçin.':t<15.8?'Gönderim zamanı geldi.':'Kampanyanız iletildi.';
  $('[data-run-copy]').textContent=t<11.5?'12 Kasım · 10:00':t<15.8?'Alıcılarınıza sırayla ulaşıyor.':'Yanıtları Mesajlar’dan karşılayın.';
  $('.run-progress i').style.width=delivery*100+'%';$('[data-run-count]').textContent=Math.floor(delivery*3)+' / 3';
  if(t<4)pointer(t,day,.3,2.1);else if(t<7.5)pointer(t,$('[data-minute]'),4,5.7);else pointer(t,$('.schedule-confirm'),7.1,8.1);
  root.style.transformOrigin=mobile?'55% 62%':'60% 45%';root.style.transform=`scale(${1+.018*at(t,1,2)*(1-at(t,10,2))})`;
 }
 function inbox(t){
  const question=at(t,2,.4),questionText=at(t,2.8,2),suggestion=at(t,6,.8),choose=at(t,9,.5),send=at(t,12,.9),reset=1-at(t,19,.9);
  visible($('.chat-customer'),question*reset,(1-question)*12);dots('.chat-customer .typing-dots',t,1-questionText);$('.chat-customer .typing-dots').style.display=questionText>.01?'none':'flex';if(mobile){$('.chat-outbound').style.transform='translateY('+(-100*suggestion*(1-choose))+'px)';$('.chat-customer').style.transform='translateY('+(-65*suggestion*(1-choose))+'px)'}type($('[data-question]'),'Merhaba, ürün hakkında bilgi alabilir miyim?',questionText*reset);
  visible($('.suggestion-drawer'),suggestion*(1-choose)*reset,(1-suggestion)*30);type($('[data-composer]'),'Merhaba! Ürün hakkında hangi bilgiyi öğrenmek istersiniz?',choose*(1-send)*reset);if(choose<.01)$('[data-composer]').textContent='Yanıtınızı yazın…';
  const response=$('.chat-response');response.style.opacity=String(send*reset);response.style.transform=`translateY(${(1-send)*(mobile?90:55)}px) scale(${.96+.04*send})`;$('[data-answer]').textContent='Merhaba! Ürün hakkında hangi bilgiyi öğrenmek istersiniz?';response.querySelector('small').style.opacity=String(at(t,13.7,.4));
  $('.chat-composer>b').style.transform=`scale(${1-.16*Math.sin(clamp((t-11.7)/.45)*Math.PI)})`;
  $('.unread-dot').style.opacity=String(1-choose);$('.thread.active p').textContent=send>.9?'Yanıtınız gönderildi.':'Yeni bir mesajınız var.';
  visible($('.inbox-note'),at(t,14,.8)*reset,(1-at(t,14,.8))*10);
  if(t<10.5)pointer(t,$('.suggestion-drawer>span'),7.3,9);else pointer(t,$('.chat-composer>b'),10.5,11.7);
 }
 function transfer(t){
  const upload=at(t,.8,2.4),reset=1-at(t,18.8,1.2);$('.file-upload-track i').style.width=upload*100+'%';$('[data-file-status]').textContent=upload<.98?'Dosyanız okunuyor…':'Kişileriniz aktarılıyor.';
  let count=0;$$('.flying-contact').forEach((node,i)=>{const p=at(t,3+i*1.75,2.4)*reset;const source=mobile?{x:91,y:300+i*60}:{x:91,y:294+i*61},target=mobile?{x:91,y:642+i*58}:{x:830,y:237+i*80};node.style.left=lerp(source.x,target.x,p)+'px';node.style.top=lerp(source.y,target.y,p)-Math.sin(p*Math.PI)*(mobile?0:65)+'px';node.style.opacity=String(at(t,3+i*1.75,.25)*reset);node.style.transform=`scale(${1+.025*Math.sin(p*Math.PI)})`;node.querySelector('i').style.opacity=String(at(t,5.1+i*1.75,.4)*reset);if(p>.96)count++;const row=$$('.file-sheet>div')[i+1];row.style.opacity=String(1-.65*p)});
  $('[data-import-count]').textContent=count+' kişi';$('[data-file-status]').textContent=count===3?'Aktarım tamamlandı.':upload<.98?'Dosyanız okunuyor…':'Kişileriniz aktarılıyor.';visible($('.destination-action'),at(t,10,.7)*reset,(1-at(t,10,.7))*10);
  $('.import-flow i').style.transform=mobile?`translateY(${((t*.7)%1)*115-30}px)`:`translateX(${((t*.7)%1)*340-50}px)`;$('.import-flow').style.opacity=String(at(t,2.8,.3)*(1-at(t,10,.5)));
  $('.import-file').style.transform=`translateY(${-upload*5}px)`;
 }
 function contacts(t){
  const sync=at(t,1.8,6.5),reset=1-at(t,18.8,1.2);$('.phone-sync').style.transform=`scale(${1-.035*Math.sin(clamp((t-1.6)/.5)*Math.PI)})`;$('.sync-bridge svg circle').style.strokeDashoffset=String(1-sync*reset);$('.sync-bridge>span').style.transform=`rotate(${sync*180}deg)`;
  let count=0;$$('.group-person').forEach((node,i)=>{const p=at(t,4.1+i*2,.8)*reset;node.style.clipPath=`inset(0 ${100*(1-p)}% 0 0)`;node.style.transform=`translateX(${(1-p)*-20}px)`;if(p>.95)count++;const source=$$('.contact-source i')[i];source.style.opacity=String(p)});$('[data-contact-count]').textContent=count+' kişi aktarıldı';
  const active=Math.min(2,Math.max(0,Math.floor((t-2)/2))),p=clamp((t-2-active*2)/1.8),traveler=$('.contact-traveler');traveler.querySelector('span').textContent=['D','E','M'][active];traveler.querySelector('strong').textContent=['Deniz A.','Ece B.','Mert C.'][active];traveler.style.opacity=String(t>2&&t<8&&p<1?Math.sin(p*Math.PI):0);traveler.style.left=lerp(mobile?290:390,mobile?525:800,smooth(p))+'px';traveler.style.top=lerp(mobile?350:310,mobile?450:300,smooth(p))-Math.sin(p*Math.PI)*65+'px';
  visible($('.contacts-group footer'),at(t,9,.8)*reset,(1-at(t,9,.8))*10);
 }
 function discovery(t){
  const region=at(t,1.7,2.4),scan=at(t,5.5,3),ready=at(t,9,.8),reset=1-at(t,18.7,1.3);type($('[data-map-category]'),'Ev ürünleri',at(t,.3,1.5));$('.map-region path').style.strokeDashoffset=String(1-region*reset);$('.map-region path').style.fillOpacity=String(region*.3);
  $$('.business-pins>span').forEach((node,i)=>{const p=at(t,2.4+i*.48,.6)*reset;node.style.opacity=p;node.style.transform=`translateY(${(1-p)*-24}px) scale(${.55+.45*p})`;node.style.background=i<Math.floor(at(t,9,3)*6)?'#85a66a':'#007854'});
  $('.map-scan').style.left=lerp(mobile?-100:50,mobile?820:820,scan)+'px';$('.map-scan').style.opacity=String(t>5.5&&t<8.5?.65:0);
  $('.map-collected').style.clipPath=`inset(0 0 ${100*(1-ready*reset)}% 0 round 14px)`;$('.map-collected').style.transform=`translateX(${(1-ready)*22}px)`;let count=0;
  $$('.map-collected>div').forEach((node,i)=>{const p=at(t,9.5+i*.85,.65)*reset;node.style.opacity=p;node.style.transform=`translateX(${(1-p)*35}px)`;if(p>.95)count++});$('[data-business-count]').textContent=count===3?'Hazır':count+' kayıt';
  $('.map-research').style.opacity=String(mobile?1-ready:1);$('[data-map-status]').textContent=t<5?'Bölgenizi ve kategorinizi seçin.':t<9?'İşletme bilgileriniz hazırlanıyor.':'Listeniz kişi grubunuzda kullanıma hazır.';
  $('.discovery-map>img').style.transform=`scale(${1+.055*at(t,0,8)}) translateX(${-ready*12}px)`;
 }
 function showcase(t){
  const enter=at(t,.8,2),material=at(t,4,3),typeLayer=at(t,7.4,2.7),ready=at(t,11.3,1.7),share=at(t,14,.9),reset=1-at(t,18.8,1.2);
  const reveal=(.55*material+.45*typeLayer)*reset;
  $('.art-source').style.transform=`translateX(${enter*10}px) rotate(${-enter*4}deg) scale(${1-enter*.04})`;
  $('.art-workbench').style.transform=`perspective(1400px) rotateY(${lerp(-8,0,ready)}deg) rotateZ(${lerp(1.5,-1.5,ready)}deg) scale(${.95+.05*enter})`;
  $('.art-source-large').style.transform=`scale(${1+.035*material})`;
  $('.art-finished').style.clipPath=`inset(${100*(1-reveal)}% 0 0 0)`;$('.art-finished>img').style.transform=`scale(${1.035-.035*ready})`;
  $('.art-light-sweep').style.left=lerp(-150,mobile?700:530,at(t,6.3,2.8))+'px';$('.art-light-sweep').style.opacity=String(t>6.3&&t<9.1?.5:0);
  $$('.art-layers>div').forEach((node,i)=>{const p=at(t,[1.5,4,7.4,11.3][i],.8)*reset;node.classList.toggle('ready',p>.5);node.style.transform=`translateX(${Math.sin(p*Math.PI)*-7}px)`});
  visible($('.art-share'),share*reset,(1-share)*20);$('.art-camera i').style.transform=`translateX(${at(t,2.8,1.2)*(mobile?30:167)}px)`;$('.art-camera').style.opacity=String(at(t,2.8,.4)*(1-at(t,4.5,.4)));
 }
 function creative(t){
  const brief=at(t,.8,3),thinking=at(t,4,2),reveal=at(t,6.3,4.7),ready=at(t,12,.8),reset=1-at(t,18.8,1.2);type($('[data-creative-brief]'),'Instagram kampanyası oluştur.',brief*reset);
  $$('.creative-signal i').forEach((node,i)=>{node.style.opacity=String(.15+.7*Math.max(0,Math.sin(t*4-i*.8))*(1-reveal));node.style.transform=`translateY(${-3*Math.max(0,Math.sin(t*4-i*.8))}px)`});$('.creative-modes>span:first-child').style.boxShadow=`0 0 0 ${2*thinking}px #c0d6b8`;
  $('.creative-reveal').style.transform=`scaleY(${1-reveal*reset})`;$('.creative-canvas>img').style.transform=`scale(${1.045-.045*reveal})`;$('.creative-canvas').style.transform=`perspective(1300px) rotateY(${(1-reveal)*-6}deg)`;visible($('.creative-check'),ready*reset,(1-ready)*12);
 }
 const render={launch,campaign,inbox,import:transfer,contacts,discovery,showcase,creative}[mode];
 function seek(t){time=((t%duration)+duration)%duration;render(time);document.body.dataset.time=time.toFixed(2);document.body.dataset.scene=mode}
 function fit(){const w=mode==='launch'?(mobile?900:1000):mobile?900:1400,h=mobile?({launch:720,import:900,contacts:900,discovery:900,inbox:920,showcase:920,creative:1080}[mode]||1080):mode==='launch'?720:700,s=Math.min(innerWidth/w,innerHeight/h);Object.assign(stage.style,{width:w+'px',height:h+'px',left:(innerWidth-w*s)/2+'px',top:(innerHeight-h*s)/2+'px',transform:`scale(${s})`})}
 function tick(now){frame=0;if(!running)return;if(last)time=(time+Math.min(now-last,80)/1000)%duration;last=now;seek(time);frame=requestAnimationFrame(tick)}
 function pause(){running=false;cancelAnimationFrame(frame);last=0}window.seek=seek;addEventListener('resize',()=>{fit();seek(time)});
 addEventListener('message',event=>{if(event.source!==parent||event.origin!==location.origin||event.data?.channel!=='mesajify-film')return;const data=event.data;if(data.action==='play'&&!running){running=true;last=0;frame=requestAnimationFrame(tick)}if(data.action==='pause')pause();if(data.action==='seek'&&Number.isFinite(data.time))seek(data.time)});
 fit();seek(0);Promise.all([document.fonts.ready,...[...document.images].map(image=>image.decode().catch(()=>{}))]).then(()=>{fit();seek(time);parent.postMessage({channel:'mesajify-film',ready:true},location.origin)});
})();
