// images はルートの /images/omikuji1.png ... を参照します。
// 存在するファイルだけを検出して利用する実装（拡張子 png/jpg/jpeg/webp を順に試します）
(() => {
  const TOTAL = 12;
  const drawBtn = document.getElementById('drawBtn');
  const againBtn = document.getElementById('againBtn');
  const card = document.getElementById('card');
  const resultImage = document.getElementById('resultImage');
  const confettiCanvas = document.getElementById('confettiCanvas');

  const exts = ['png','jpg','jpeg','webp'];
  let images = []; // 実際に使う存在確認済みのURLリスト

  // 最初はボタン無効にして検出中にする
  if (drawBtn) drawBtn.disabled = true;

  // 指定URLが存在するか確認（まず HEAD、失敗したら GET を試す）
  async function urlExists(url) {
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (head && head.ok) return true;
    } catch (_) {}
    try {
      const get = await fetch(url, { method: 'GET' });
      return get && get.ok;
    } catch (_) {}
    return false;
  }

  // 画像検出
  async function detectImages() {
    const found = [];
    for (let i = 1; i <= TOTAL; i++) {
      let okUrl = null;
      for (const ext of exts) {
        const url = `/images/omikuji${i}.${ext}`;
        /* Note: on file:// or CSP-restricted hosts fetch HEAD may fail; this tries HEAD then GET */
        // avoid too many parallel requests; sequential is fine for 12 images
        /* eslint-disable no-await-in-loop */
        const exists = await urlExists(url);
        if (exists) { okUrl = url; break; }
      }
      if (okUrl) {
        found.push(okUrl);
      } else {
        console.warn(`[omikuji] images/omikuji${i}.* が見つかりません (checked: ${exts.join(',')})`);
      }
    }
    images = found;
    images.forEach(src => { const im = new Image(); im.src = src; });
    if (images.length > 0) {
      if (drawBtn) drawBtn.disabled = false;
    } else {
      console.error('[omikuji] 有効な画像が一つも見つかりません。images フォルダに画像を配置してください。');
    }
  }

  window.addEventListener('load', () => {
    // カード表面のバック画像もルート参照にしておく（存在しなければ console.warn）
    const front = document.querySelector('#cardFront .card-image');
    if (front) {
      front.onerror = () => { front.style.background = 'linear-gradient(135deg,#ffd6e0,#e2f9ff)'; front.src = ''; };
      // 既に src が相対の場合はルート絶対にした方が確実
      if (front.getAttribute('src') && !front.getAttribute('src').startsWith('/')) {
        front.src = '/images/omikuji-back.png';
      }
    }

    detectImages();
  });

  function bindKeys() {
    window.addEventListener('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !drawBtn.disabled) {
        e.preventDefault();
        triggerDraw();
      }
    });
  }

  function triggerDraw() {
    if (!images.length) return;
    drawBtn.disabled = true;
    drawBtn.classList.add('processing');
    card.classList.remove('flipped');
    card.classList.add('shake');
    playBeepSequence();

    setTimeout(() => {
      card.classList.remove('shake');
      setTimeout(() => {
        const idx = Math.floor(Math.random() * images.length);
        const img = images[idx];

        resultImage.onload = () => {};
        resultImage.onerror = () => {
          console.error(`[omikuji] 結果画像の読み込み失敗: ${img}`);
          resultImage.style.background = 'linear-gradient(135deg,#ffd6e0,#e2f9ff)';
          resultImage.src = '';
        };
        resultImage.src = img;

        card.classList.add('flipped');
        launchConfetti();

        drawBtn.classList.add('hidden');
        againBtn.classList.remove('hidden');
        drawBtn.disabled = false;
      }, 260);
    }, 900);
  }

  if (againBtn) {
    againBtn.addEventListener('click', () => {
      card.classList.remove('flipped');
      againBtn.classList.add('hidden');
      drawBtn.classList.remove('hidden');
    });
  }
  if (drawBtn) drawBtn.addEventListener('click', triggerDraw);
  bindKeys();

  /* --- 以下は既存のコンフェッティ・サウンド関数（省略せずそのまま利用） --- */
  function launchConfetti() {
    const canvas = confettiCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const particles = [];
    const colors = ['#ff7a9a','#ffd76b','#7afcff','#9be78f','#c7a7ff'];
    window.addEventListener('resize', () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });
    for (let i=0;i<120;i++){
      particles.push({
        x: Math.random() * W,
        y: -Math.random() * H * 0.5,
        r: Math.random()*6+6,
        d: Math.random() * 60 + 30,
        color: colors[Math.floor(Math.random()*colors.length)],
        tilt: Math.random() * 10 - 10,
        tiltSpeed: Math.random() * 0.07 + 0.05,
        vx: (Math.random()-0.5)*4,
        vy: Math.random()*4+2,
        life: 100 + Math.random()*50
      });
    }
    let raf;
    function render() {
      ctx.clearRect(0,0,W,H);
      for (let p of particles) {
        p.tilt += p.tiltSpeed;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.life -= 1;
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.tilt * 0.1);
        ctx.fillRect(-p.r/2, -p.r/2, p.r*1.6, p.r*0.9);
        ctx.restore();
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.y > H + 50 || p.life <= 0) particles.splice(i,1);
      }
      if (particles.length === 0) { cancelAnimationFrame(raf); ctx.clearRect(0,0,W,H); return; }
      raf = requestAnimationFrame(render);
    }
    render();
    playSpark();
  }

  function playBeepSequence(){
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      const freqs = [880, 1040, 1200];
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.value = 0.0001 + 0.12 * (1 - i*0.15);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + i * 0.06);
        o.stop(now + i * 0.06 + 0.08);
      });
    } catch (e) {}
  }
  function playSpark(){
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 220;
      g.gain.value = 0.08;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      o.stop(ctx.currentTime + 0.26);
    } catch(e){}
  }
})();