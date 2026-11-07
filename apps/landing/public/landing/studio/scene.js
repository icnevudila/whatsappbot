(() => {
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') || 'creative';
  const mobile = params.has('mobile');
  const duration = mode === 'overview' || mode === 'hero' ? 28 : 20;
  const scenes = [...document.querySelectorAll('[data-scene]')];
  const names = ['discovery', 'creative', 'campaign', 'inbox'];
  document.body.classList.toggle('mobile', mobile);
  document.body.classList.toggle('hero', mode === 'hero');
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => 1 - Math.pow(1 - clamp(x), 3);
  const at = (t, start, length = .8) => ease((t - start) / length);
  const fade = (selector, opacity, y = 0, scale = 1) => {
    const node = $(selector);
    node.style.opacity = String(opacity);
    node.style.transform = `translateY(${y}px) scale(${scale})`;
  };
  const cursor = $('.cursor');
  const ring = $('.click-ring');
  function pointer(t, x0, y0, x1, y1, start, clickAt) {
    const move = at(t, start, 1.4);
    const x = x0 + (x1 - x0) * move;
    const y = y0 + (y1 - y0) * move;
    cursor.style.transform = `translate(${x}px,${y}px)`;
    cursor.style.opacity = String(at(t, start, .4) * (1 - at(t, clickAt + .8, .4)));
    const c = clamp((t - clickAt) / .65);
    ring.style.left = x1 + 'px'; ring.style.top = y1 + 'px';
    ring.style.opacity = String(t >= clickAt ? (1 - c) * .7 : 0);
    ring.style.scale = String(.4 + c * 1.2);
  }
  function discovery(t) {
    const sent = at(t, 5.7, 1), results = at(t, 10.3, 1.3);
    const request = $('.request-window');
    request.style.opacity = String(mobile ? 1 - sent : 1);
    request.style.transform = mobile ? `translateY(${-sent * 60}px) scale(${1 - .14 * sent})` : `translateX(${-sent * 11}px) scale(${1 - .05 * sent})`;
    $('.type-field').textContent = 'Ev ürünleri'.slice(0, Math.max(0, Math.floor(clamp((t - .4) / 1.7) * 18)));
    $('.place-field').style.opacity = String(.25 + .75 * at(t, 2.3));
    $('.request-action').style.boxShadow = t > 4.9 && t < 5.8 ? '0 0 0 6px #2f5bff18' : '0 3px 7px #18244212';
    fade('.request-received', sent * (1 - results), (1 - sent) * 15);
    $('.loading-line>i').style.width = clamp((t - 6) / 4.3) * 100 + '%';
    fade('.list-window', results, (1 - results) * 25);
    $$('.demo-list>div').forEach((row, i) => { const a = at(t, 11 + i * .55); row.style.opacity = a; row.style.transform = `translateY(${(1 - a) * 12}px)`; });
    $$('.map-pins i').forEach((pin, i) => { const a = at(t, 3.3 + i * .5); pin.style.opacity = String(a * (1 - .3 * results)); });
    $('.map-background').style.transform = `scale(${1.08 + .025 * clamp(t / 20)}) translateX(${-results * 15}px)`;
    pointer(t, mobile ? 820 : 490, mobile ? 330 : 300, mobile ? 650 : 350, mobile ? 635 : 506, 3.4, 5.5);
    $$('.scene-caption>span').forEach((span, i) => span.style.opacity = String(i === 0 || t > (i === 1 ? 5.8 : 10.5) ? 1 : .35));
  }
  function creative(t) {
    const selected = at(t, 2.7), result = at(t, 5.5, 1.1), ready = at(t, 10.2, 1.4);
    $$('.style-choice').forEach((node, i) => node.classList.toggle('active', selected > .4 ? i === 1 : i === 0));
    $$('.studio-step').forEach((node, i) => node.classList.toggle('active', (t < 3 ? 0 : t < 10 ? 1 : 2) === i));
    fade('.result-ad', result, (1 - result) * 35, .96 + .04 * result);
    $('.ad-loading').style.opacity = String(1 - ready);
    $('.ad-loading').style.pointerEvents = 'none';
    $('.ad-loading>div>i').style.width = clamp((t - 6) / 4.7) * 100 + '%';
    $('.campaign-art').style.transform = 'none';
    fade('.ad-ready', ready, (1 - ready) * 8);
    fade('.creative-complete', at(t, 13.3), (1 - at(t, 13.3)) * 17);
    $('.copy-panel').style.opacity = String(at(t, 3.5, 1.4) * (1 - at(t, 13, .6)));
    if (mobile) {
      $('.source-product').style.transform = `translate(${-result * 125}px,${result * 90}px) scale(${1 - .5 * result})`;
      $('.source-product').style.opacity = String(1 - result);
      $('.creative-controls').style.opacity = String(1 - result);
    }
    const dot = $('.creative-connector>i');
    dot.style.left = (clamp((t - 4) / 2) * 620) + 'px'; dot.style.top = '16px'; dot.style.opacity = String(t > 4 && t < 6 ? .8 : 0);
    pointer(t, mobile ? 760 : 710, mobile ? 210 : 180, mobile ? 675 : 600, mobile ? 317 : 280, 1, 2.8);
  }
  function campaign(t) {
    const phase = t < 4 ? 0 : t < 8 ? 1 : t < 12 ? 2 : 3;
    $$('.campaign-pane').forEach((pane, i) => { pane.style.opacity = String(i === phase ? 1 : 0); pane.style.pointerEvents = 'none'; pane.style.transform = i === phase ? `translateY(${(1 - at(t, [0,4,8,12][i], .55)) * 9}px)` : 'none'; });
    $$('.wizard-navigation>span').forEach((step, i) => step.classList.toggle('active', i === [1,3,5,5][phase]));
    const send = at(t, 11.5, 1), reply = at(t, 16, .8);
    const selected=at(t,1.4,.5);
    $('.group-option.selected .checkbox').style.opacity=String(selected);
    $('.group-option.selected').style.boxShadow='inset 0 0 0 '+selected+'px #39764d';
    const copy='Günü başlat. Novi Ev su ısıtıcı 1.290 TL.\n\nYeni ürünümüzü keşfedin.\n\nAyrıntılar için bize yazabilirsiniz.';
    const editor=$('.message-editor');editor.style.whiteSpace='pre-line';editor.textContent=copy.slice(0,Math.round(copy.length*clamp((t-4.15)/3.1)));
    $('.film-plan').style.transform='scale('+(1+.015*Math.sin(clamp((t-8.6)/2)*Math.PI))+')';
    $('.send-action').style.transform='scale('+(1-.035*Math.sin(clamp((t-10.7)/.7)*Math.PI))+')';
    $('.outgoing-bubble').style.opacity = String(.4 + .6 * at(t, 7, 1.5));
    $('.incoming-bubble').style.opacity = String(reply);
    $('.incoming-bubble').style.transform = `translateY(${(1 - reply) * 15}px)`;
    fade('.reply-notification', at(t, 17.1), (1 - at(t, 17.1)) * 16);
    $('[data-sent-count]').textContent = String(Math.round(3 * at(t, 12.6, 2.7)));
    $('[data-reply-count]').textContent = reply > .5 ? '1' : '0';
    $('.sending-track>i').style.width = at(t, 12.6, 2.7) * 100 + '%';
    $('[data-campaign-status]').textContent = ['Önce kitleniz. Sonra mesajınız.', 'Mesajınız, kendi kelimelerinizle.', 'İçerik, kitle, hat: son kontrol.', 'Gönderimler ve yanıtlar aynı yerde.'][phase];
    if (mobile) {
      const phone = at(t, 12, 1.3);
      $('.phone').style.opacity = String(phone);
      $('.phone').style.transform = `translateY(${(1 - phone) * 30}px) rotate(${phone * 2}deg)`;
      $('.campaign-window').style.transformOrigin = '0 0';
      $('.campaign-window').style.transform = `translateY(${-phone * 25}px) scale(${1 - phone * .03})`;
      $('.campaign-window').style.opacity = String(1 - phone);
    }
    if(t<4)pointer(t,mobile?750:850,mobile?260:170,mobile?180:145,mobile?330:298,.2,1.4);
    else if(t<8)pointer(t,mobile?750:850,mobile?260:170,mobile?350:310,mobile?400:325,4,4.2);
    else pointer(t,mobile?750:850,mobile?260:170,mobile?420:420,mobile?760:526,8.5,10.7);
  }
  function inbox(t) {
    const question = at(t, 1.8), suggest = at(t, 5, 1), answer = at(t, 9, 1);
    fade('.customer-message', question, (1 - question) * 12);
    fade('.suggestions', suggest * (1 - .4 * answer), (1 - suggest) * 10);
    fade('.assistant-message', answer, (1 - answer) * 13);
    $('.thread.selected>small>b').style.opacity = String(1 - answer);
    $('.suggestions b:first-child').style.background = t > 7.5 && t < 9.5 ? '#e4ebff' : '#fff';
    pointer(t, mobile ? 760 : 1240, mobile ? 870 : 510, mobile ? 260 : 600, mobile ? 846 : 554, 6, 8);
  }
  const renderers = { discovery, creative, campaign, inbox };
  let lastChapter = -1;
  function seek(time) {
    time = ((time % duration) + duration) % duration;
    const cycle = mode === 'hero' || mode === 'overview';
    const name = cycle ? names[Math.floor(time / 7)] : (names.includes(mode) ? mode : 'creative');
    const local = cycle ? ((time % 7) / 7) * 19.5 : time;
    scenes.forEach(scene => scene.style.visibility = scene.dataset.scene === name ? 'visible' : 'hidden');
    cursor.style.opacity = '0'; ring.style.opacity = '0';
    renderers[name](local);
    if ((mode === 'overview' || mode === 'hero') && lastChapter !== names.indexOf(name)) {
      lastChapter = names.indexOf(name);
      parent.postMessage({channel:'mesajify-film',chapter:lastChapter},location.origin);
    }
    document.body.dataset.scene = name; document.body.dataset.time = String(time.toFixed(2));
  }
  function fit() {
    const width = mobile || mode === 'hero' ? 900 : 1400, height = mobile ? 1080 : mode === 'hero' ? 540 : 700;
    const scale = Math.min(innerWidth / width, innerHeight / height);
    const stage = $('#stage');
    stage.style.transform = `scale(${scale})`;
    stage.style.left = (innerWidth - width * scale) / 2 + 'px';
    stage.style.top = (innerHeight - height * scale) / 2 + 'px';
  }
  let time = mode === 'hero' ? 23 : mode === 'overview' ? 12 : 14, running = false, last = 0, frame = 0;
  function tick(now) { frame = 0; if (!running) return; if (last) time = (time + Math.min(now-last,80)/1000) % duration; last = now; seek(time); frame = requestAnimationFrame(tick); }
  function play() { if (running) return; running = true; last = 0; frame = requestAnimationFrame(tick); }
  function pause() { running = false; cancelAnimationFrame(frame); frame = 0; last = 0; }
  window.seek = seek;
  addEventListener('resize', fit);
  addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.channel !== 'mesajify-film') return;
    if (event.data.action === 'play') play();
    if (event.data.action === 'pause') pause();
    if (event.data.action === 'seek' && Number.isFinite(event.data.time)) { time = event.data.time; seek(time); }
  });
  fit(); seek(params.has('frame') ? Number(params.get('frame')) : time);
  Promise.all([...document.images].map(image => image.complete ? Promise.resolve() : new Promise(resolve => { image.onload = resolve; image.onerror = resolve; }))).then(() => {
    parent.postMessage({channel:'mesajify-film',ready:true},location.origin);
    document.body.dataset.ready = 'true';
  });
})();
