// シンプルなおみくじ JS（images はルートの /images/omikuji1.png ... を参照します）
(() => {
  const TOTAL = 12;
  const drawBtn = document.getElementById('drawBtn');
  const againBtn = document.getElementById('againBtn');
  const card = document.getElementById('card');
  const resultImage = document.getElementById('resultImage');
  const resultText = document.getElementById('resultText');
  const confettiCanvas = document.getElementById('confettiCanvas');

  // 画像パスを作成（ルート絶対パスにすることで Vercel や public 配下で確実に参照できます）
  const images = Array.from({length: TOTAL}, (_, i) => `./images/omikuji${i+1}.png`);

  // back image もルート絶対パス
  const backImage = new Image();
  backImage.src = './images/omikuji-back.png';
  backImage.onerror = () => {
    console.error('[omikuji] omikuji-back.png が見つかりません。./images/omikuji-back.png を配置してください。');
  };

  // 画像プリロード（失敗時ログ）
  images.forEach((src, idx) => {
    const img = new Image();
    img.onload = () => {
      // 正常に読み込めた
    };
    img.onerror = () => {
      console.error(`[omikuji] 画像の読み込み失敗: ${src} (index=${idx})`);
    };
    img.src = src;
  });

  // デバッグ用: サーバにファイルがあるか簡易チェック（最初の画像だけ）
  async function checkImage(url) {
    try {
      const resp = await fetch(url, { method: 'HEAD' });
      console.info(`[omikuji] HEAD ${url} -> ${resp.status}`);
      return resp.ok;
    } catch (e) {
      console.warn(`[omikuji] ${url} のチェックでエラー`, e);
      return false;
    }
  }
  // ページ読み込み後に一度だけ確認ログ（任意）
  window.addEventListener('load', () => {
    // 最初の画像をチェックして、問題があれば目立つログを出す
    checkImage(images[0]).then(ok => {
      if (!ok) {
        console.warn('[omikuji] 最初の画像が配信されていない可能性があります。curl -I <URL>/images/omikuji1.png を実行してステータスを確認してください。');
      }
    });
  });

  // キーボード / タッチ処理
  function bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!drawBtn.disabled) triggerDraw();
      }
    });
  }

  // メイン: 引く処理
  function triggerDraw() {
    drawBtn.disabled = true;
    drawBtn.classList.add('processing');
    card.classList.remove('flipped');
    // まずシェイク
    card.classList.add('shake');
    // わくわく音（WebAudioで短い音）
    playBeepSequence();

    setTimeout(() => {
      card.classList.remove('shake');
      // 表示を裏返す
      setTimeout(() => {
        const idx = Math.floor(Math.random() * TOTAL);
        const img = images[idx];

        // 画像をセット（img が 404 の場合は onerror で検知）
        resultImage.onload = () => {
          // 正常に表示されたら何もしない
        };
        resultImage.onerror = () => {
          console.error(`[omikuji] 結果画像の読み込み失敗: ${img}`);
          // フォールバック: 背景グラデを適用して画像がないことを視覚的に示す
          resultImage.style.background = 'linear-gradient(135deg,#ffd6e0,#e2f9ff)';
          resultImage.src = '';
        };
        resultImage.src = img;

        // flip
        card.classList.add('flipped');

        // コンフェッティ
        launchConfetti();

        // ボタン切り替え
        drawBtn.classList.add('hidden');
        againBtn.classList.remove('hidden');
        drawBtn.disabled = false;
      }, 260);
    }, 900);
  }

  // もう一度
  againBtn.addEventListener('click', () => {
    card.classList.remove('flipped');
    againBtn.classList.add('hidden');
    drawBtn.classList.remove('hidden');
  });

  drawBtn.addEventListener('click', triggerDraw);

  bindKeys();

  /* --- 簡易コンフェッティ実装 --- */
  function launchConfetti() {
    const canvas = confettiCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const particles = [];
    const colors = ['#ff7a9a','#ffd76b','#7afcff','#9be78f','#c7a7ff'];

    // リサイズ対応
    window.addEventListener('resize', () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    });

    // 初期パーティクル生成
    for (let i=0;i<120;i++){
      particles.push({
        x: Math.random() * W,
        y: -Math.random() * H * 0.5,
        r: randRange(6,12),
        d: Math.random() * 60 + 30,
        color: colors[Math.floor(Math.random()*colors.length)],
        tilt: Math.random() * 10 - 10,
        tiltSpeed: Math.random() * 0.07 + 0.05,
        vx: randRange(-2,2),
        vy: randRange(2,6),
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
        p.vy += 0.03; // gravity
        p.life -= 1;

        ctx.beginPath();
        ctx.fillStyle = p.color;
        // シンプルに回転する長方形（紙片）
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.tilt * 0.1);
        ctx.fillRect(-p.r/2, -p.r/2, p.r*1.6, p.r*0.9);
        ctx.restore();
      }
      // remove off-screen / dead
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.y > H + 50 || p.life <= 0) particles.splice(i,1);
      }
      if (particles.length === 0) {
        cancelAnimationFrame(raf);
        ctx.clearRect(0,0,W,H);
        return;
      } else {
        raf = requestAnimationFrame(render);
      }
    }
    render();

    // ヒット音
    playSpark();

    function randRange(a,b){ return a + Math.random()*(b-a); }
  }

  /* --- 簡易サウンド --- */
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
    } catch (e) {
      // AudioContextが使えない場合は無音で進める
    }
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
      // 短くフェードアウト
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      o.stop(ctx.currentTime + 0.26);
    } catch(e){}
  }

  // 初期画像が無ければプレースホルダを設定（任意）
  document.addEventListener('DOMContentLoaded', () => {
    const front = document.getElementById('cardFront').querySelector('.card-image');
    // もし omikuji-back.png が無ければ淡いグラデ背景になる（画像は推奨）
    front.onerror = () => {
      front.style.background = 'linear-gradient(135deg,#ffd6e0,#e2f9ff)';
      front.src = '';
    };
  });
})();