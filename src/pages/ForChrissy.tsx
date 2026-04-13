import { useEffect } from 'react';

const ForChrissy = () => {
  useEffect(() => {
    document.open();
    document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>For You, Chrissy</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gold: #c8a96e;
    --gold-light: #e8d4a8;
    --cream: #fdf6ec;
    --warm-white: #fefaf4;
    --deep: #1a1208;
    --mid: #4a3520;
    --soft: #7a5c3a;
    --rose: #c47a7a;
  }

  html, body {
    height: 100%;
    overflow: hidden;
    background: var(--deep);
    font-family: 'EB Garamond', Georgia, serif;
    color: var(--cream);
    cursor: default;
  }

  /* Ambient background */
  .ambient {
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse 80% 60% at 50% 40%, #2e1a08 0%, #120c04 60%, #0a0702 100%);
    z-index: 0;
  }
  .ambient::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 40% 30% at 20% 30%, rgba(200,169,110,0.08) 0%, transparent 70%),
      radial-gradient(ellipse 30% 40% at 80% 70%, rgba(196,122,122,0.05) 0%, transparent 70%);
  }

  /* Floating particles */
  .particles { position: fixed; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
  .particle {
    position: absolute;
    width: 2px; height: 2px;
    background: rgba(200,169,110,0.4);
    border-radius: 50%;
    animation: drift linear infinite;
  }
  @keyframes drift {
    0% { transform: translateY(100vh) translateX(0) scale(0); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 0.6; }
    100% { transform: translateY(-10vh) translateX(var(--dx)) scale(1); opacity: 0; }
  }

  /* Main stage */
  .stage {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.5rem;
    overflow: hidden;
  }

  /* Slide container */
  .slide {
    display: none;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 680px;
    width: 100%;
    animation: slideIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .slide.active { display: flex; }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-30px); }
  }
  .slide.leaving {
    display: flex;
    animation: slideOut 0.6s cubic-bezier(0.7, 0, 1, 1) forwards;
  }

  /* Ornament */
  .ornament {
    font-size: 1.2rem;
    color: var(--gold);
    letter-spacing: 0.5em;
    margin-bottom: 2rem;
    opacity: 0;
    animation: fadeUp 0.8s 0.2s ease forwards;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .slide-number {
    font-size: 0.7rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--gold);
    opacity: 0.5;
    margin-bottom: 1.5rem;
    opacity: 0;
    animation: fadeUp 0.8s 0.1s ease forwards;
  }

  h1, h2 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-weight: 300;
    line-height: 1.2;
    opacity: 0;
    animation: fadeUp 1s 0.3s ease forwards;
  }
  h1 {
    font-size: clamp(2.8rem, 8vw, 5rem);
    color: var(--gold-light);
    letter-spacing: -0.01em;
    margin-bottom: 0.5rem;
  }
  h1 em { font-style: italic; color: var(--gold); }
  h2 {
    font-size: clamp(1.8rem, 5vw, 2.8rem);
    color: var(--gold-light);
    margin-bottom: 1.5rem;
  }

  .body-text {
    font-size: clamp(1.05rem, 2.5vw, 1.25rem);
    line-height: 1.85;
    color: rgba(253,246,236,0.88);
    font-weight: 400;
    max-width: 560px;
    opacity: 0;
    animation: fadeUp 1s 0.5s ease forwards;
  }
  .body-text strong {
    color: var(--gold-light);
    font-weight: 500;
  }
  .body-text em {
    font-style: italic;
    color: rgba(253,246,236,0.7);
  }

  .highlight-line {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-style: italic;
    font-size: clamp(1.2rem, 3vw, 1.6rem);
    color: var(--gold);
    line-height: 1.5;
    margin: 1.5rem 0;
    padding: 1.5rem 2rem;
    border-left: 2px solid rgba(200,169,110,0.4);
    text-align: left;
    opacity: 0;
    animation: fadeUp 1s 0.6s ease forwards;
  }

  /* Divider */
  .divider {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 1.5rem 0;
    width: 100%;
    max-width: 300px;
    opacity: 0;
    animation: fadeUp 0.8s 0.4s ease forwards;
  }
  .divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(200,169,110,0.4), transparent);
  }
  .divider span { color: var(--gold); font-size: 0.8rem; letter-spacing: 0.3em; }

  /* Action slide */
  .action-box {
    background: rgba(200,169,110,0.06);
    border: 1px solid rgba(200,169,110,0.2);
    border-radius: 4px;
    padding: 2rem;
    margin: 1.5rem 0;
    width: 100%;
    max-width: 480px;
    opacity: 0;
    animation: fadeUp 1s 0.5s ease forwards;
  }
  .action-box h3 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.1rem;
    color: var(--gold);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-weight: 400;
    margin-bottom: 1rem;
  }
  .action-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.8rem 0;
    border-bottom: 1px solid rgba(200,169,110,0.1);
    text-align: left;
  }
  .action-item:last-child { border-bottom: none; }
  .action-num {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.4rem;
    color: var(--gold);
    opacity: 0.6;
    flex-shrink: 0;
    line-height: 1;
    margin-top: 0.1rem;
  }
  .action-text { font-size: 1rem; line-height: 1.6; color: rgba(253,246,236,0.85); }
  .action-text strong { color: var(--gold-light); }

  .cta-button {
    display: inline-block;
    margin-top: 1.5rem;
    padding: 1rem 2.5rem;
    background: transparent;
    border: 1px solid var(--gold);
    color: var(--gold-light);
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.1rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.4s ease;
    opacity: 0;
    animation: fadeUp 1s 0.7s ease forwards;
  }
  .cta-button:hover {
    background: rgba(200,169,110,0.12);
    color: var(--gold);
    letter-spacing: 0.2em;
  }

  /* Navigation */
  .nav {
    position: fixed;
    bottom: 2.5rem;
    left: 0; right: 0;
    z-index: 20;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
  }

  .nav-btn {
    background: none;
    border: 1px solid rgba(200,169,110,0.3);
    color: var(--gold);
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.85rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    padding: 0.6rem 1.4rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  .nav-btn:hover { border-color: var(--gold); background: rgba(200,169,110,0.08); }
  .nav-btn:disabled { opacity: 0.2; cursor: default; pointer-events: none; }

  .progress-dots {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .dot {
    width: 4px; height: 4px;
    border-radius: 50%;
    background: rgba(200,169,110,0.3);
    transition: all 0.4s ease;
    cursor: pointer;
  }
  .dot.active { background: var(--gold); width: 20px; border-radius: 2px; }

  /* Final slide special */
  .heart {
    font-size: 2rem;
    color: var(--rose);
    opacity: 0;
    animation: fadeUp 1s 0.2s ease forwards, pulse 3s 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }

  .signature {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic;
    font-size: clamp(1.6rem, 4vw, 2.2rem);
    color: var(--gold);
    opacity: 0;
    animation: fadeUp 1s 0.8s ease forwards;
    margin-top: 1rem;
  }

  /* Intro slide special */
  .intro-name {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic;
    font-size: clamp(3.5rem, 10vw, 6rem);
    color: var(--gold);
    font-weight: 300;
    opacity: 0;
    animation: fadeUp 1.2s 0.4s ease forwards;
    letter-spacing: -0.02em;
    text-shadow: 0 0 60px rgba(200,169,110,0.2);
  }
  .intro-sub {
    font-size: clamp(0.9rem, 2vw, 1.1rem);
    color: rgba(253,246,236,0.5);
    letter-spacing: 0.25em;
    text-transform: uppercase;
    opacity: 0;
    animation: fadeUp 1s 0.7s ease forwards;
    margin-top: 1rem;
  }
  .tap-hint {
    font-size: 0.8rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: rgba(200,169,110,0.4);
    opacity: 0;
    animation: fadeUp 1s 1.2s ease forwards, blink 2.5s 2.2s ease-in-out infinite;
    margin-top: 3rem;
  }
  @keyframes blink {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.1; }
  }
</style>
</head>
<body>

<div class="ambient"></div>
<div class="particles" id="particles"></div>

<div class="stage">

  <!-- SLIDE 1: INTRO -->
  <div class="slide active" data-slide="0">
    <div class="ornament">✦ &nbsp; &nbsp; ✦ &nbsp; &nbsp; ✦</div>
    <div class="intro-name">Chrissy</div>
    <div class="intro-sub">A letter written from the heart</div>
    <div class="tap-hint">tap to read &darr;</div>
  </div>

  <!-- SLIDE 2: BREATHE -->
  <div class="slide" data-slide="1">
    <div class="slide-number">I</div>
    <h2>Please just breathe.</h2>
    <div class="divider"><span>✦</span></div>
    <p class="body-text">
      There is <strong>zero anger</strong> in these words.<br>
      Zero judgment. Zero blame.<br><br>
      I am writing this to the woman I fell in love with,<br>
      because I need to know I did <strong>everything humanly possible</strong><br>
      to save her.
    </p>
  </div>

  <!-- SLIDE 3: WHO YOU ARE -->
  <div class="slide" data-slide="2">
    <div class="slide-number">II</div>
    <h2>I remember <em>who you are.</em></h2>
    <div class="divider"><span>✦</span></div>
    <p class="body-text">
      I remember the girl who <strong>put me back together</strong> when I was broken.<br><br>
      The woman who wanted to blend our families, who laughed with me, who loved so fiercely —<br>
      a heart so big she wanted to take on the world.
    </p>
    <div class="highlight-line">
      That beautiful, caring soul is the <em>real</em> you.<br>
      You are not worthless. You are not a failure.
    </div>
  </div>

  <!-- SLIDE 4: THE FOG -->
  <div class="slide" data-slide="3">
    <div class="slide-number">III</div>
    <h2>There is a fog.</h2>
    <div class="divider"><span>✦</span></div>
    <p class="body-text">
      I know you can feel it, Chrissy.<br><br>
      It is an illness that is slowly pulling you further from yourself. It's tricking your mind, clouding your vision, making you feel like <strong>everyone is your enemy.</strong><br><br>
      The scariest part is — the fog makes it <em>impossible to see</em> how much it's changing you.
    </p>
  </div>

  <!-- SLIDE 5: WINDOW CLOSING -->
  <div class="slide" data-slide="4">
    <div class="slide-number">IV</div>
    <h2>The window <em>is closing.</em></h2>
    <div class="divider"><span>✦</span></div>
    <p class="body-text">
      I am terrified because I see it.<br><br>
      If you stay on this road, the fog will become permanent. The real Christine — the one who loves her children and wanted a beautiful life — <strong>will be gone forever.</strong><br><br>
      You won't be able to find your way back.
    </p>
  </div>

  <!-- SLIDE 6: LEGACY -->
  <div class="slide" data-slide="5">
    <div class="slide-number">V</div>
    <h2>Your <em>legacy.</em></h2>
    <div class="divider"><span>✦</span></div>
    <p class="body-text">
      You told me your greatest wish was to <strong>stop the cycle</strong> your mother started.<br><br>
      You have the power to do that — <em>right now.</em>
    </p>
    <div class="highlight-line">
      Grace. Gabby. AJ. Little Sahar.<br>
      They do not want to lose you to this darkness.
    </div>
    <p class="body-text">
      If you don't fight this now, the heartbreak they carry for the rest of their lives will be <strong>irreversible.</strong>
    </p>
  </div>

  <!-- SLIDE 7: STRATEGIC REASON -->
  <div class="slide" data-slide="6">
    <div class="slide-number">VI</div>
    <h2>This is also <em>smart.</em></h2>
    <div class="divider"><span>✦</span></div>
    <p class="body-text">
      You know you are under a microscope with the courts right now.<br><br>
      Checking yourself into Brylin or ECMC <strong>immediately</strong> is the absolute best way to do damage control — to fix the situation from leaving rehab early.
    </p>
    <div class="highlight-line">
      It shows the court you are taking initiative to protect yourself.<br>
      But it has to be <em>right now.</em>
    </div>
  </div>

  <!-- SLIDE 8: THE ASK -->
  <div class="slide" data-slide="7">
    <div class="slide-number">VII</div>
    <h2>Please. <em>Take the step.</em></h2>
    <div class="divider"><span>✦</span></div>
    <div class="action-box">
      <h3>Go today — right now</h3>
      <div class="action-item">
        <span class="action-num">①</span>
        <span class="action-text"><strong>Brylin Hospital</strong> — go there first. They can give you the real medical help you need to clear this fog.</span>
      </div>
      <div class="action-item">
        <span class="action-num">②</span>
        <span class="action-text">If you can't get into Brylin immediately — go straight to <strong>ECMC.</strong> They will transfer you there.</span>
      </div>
      <div class="action-item">
        <span class="action-num">③</span>
        <span class="action-text">This protects you <strong>legally</strong> and gives you a real shot at coming back to yourself and to your children.</span>
      </div>
    </div>
    <p class="body-text" style="font-size:1rem; margin-top:0.5rem; opacity:0; animation: fadeUp 1s 0.8s ease forwards;">
      I am extending my hand — <em>not to point a finger, but to pull you out.</em>
    </p>
  </div>

  <!-- SLIDE 9: CLOSING -->
  <div class="slide" data-slide="8">
    <div class="heart">♥</div>
    <div style="height:1.5rem"></div>
    <h2>You are <em>worth saving.</em></h2>
    <div class="divider"><span>✦</span></div>
    <p class="body-text">
      Let's stop this nightmare so <strong>life can grow again.</strong><br><br>
      There is still a piece of the real Christine inside you, reading this right now.<br><br>
      I am begging that piece of you — please hold on.<br><br>
      <em>Let go of the pride. Let go of the anger.</em><br>
      And take action <strong>today.</strong>
    </p>
    <div style="height:1rem"></div>
    <p class="body-text" style="font-size:1rem; opacity:0; animation:fadeUp 1s 0.75s ease forwards;">With everything I have —</p>
    <div class="signature">Love, Moe</div>
  </div>

</div>

<!-- Navigation -->
<div class="nav">
  <button class="nav-btn" id="prevBtn" disabled>← Back</button>
  <div class="progress-dots" id="dots"></div>
  <button class="nav-btn" id="nextBtn">Next →</button>
</div>

<script>
  // Particles
  const pc = document.getElementById('particles');
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
    p.style.animationDuration = (8 + Math.random() * 12) + 's';
    p.style.animationDelay = (Math.random() * 10) + 's';
    p.style.width = p.style.height = (1 + Math.random() * 2.5) + 'px';
    p.style.opacity = (0.2 + Math.random() * 0.5);
    pc.appendChild(p);
  }

  const slides = document.querySelectorAll('.slide');
  const dotsContainer = document.getElementById('dots');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  let current = 0;

  // Build dots
  slides.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(d);
  });

  function goTo(idx) {
    if (idx < 0 || idx >= slides.length) return;
    const leaving = slides[current];
    leaving.classList.add('leaving');
    setTimeout(() => { leaving.classList.remove('active', 'leaving'); }, 600);
    current = idx;
    const arriving = slides[current];
    arriving.classList.add('active');
    document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === current));
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === slides.length - 1;
    nextBtn.textContent = current === slides.length - 2 ? 'Finish' : 'Next →';
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // Swipe support
  let startX = 0;
  document.addEventListener('touchstart', e => startX = e.touches[0].clientX);
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) dx < 0 ? goTo(current + 1) : goTo(current - 1);
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ') goTo(current + 1);
    if (e.key === 'ArrowLeft') goTo(current - 1);
  });
</script>

<!-- Background Music -->
<div id="music-controls" style="
  position: fixed; top: 1.2rem; right: 1.5rem; z-index: 100;
  display: flex; align-items: center; gap: 0.6rem;
  opacity: 0; animation: fadeUp 1s 2s ease forwards;
">
  <span id="music-label" style="
    font-family: 'EB Garamond', serif; font-style: italic;
    font-size: 0.75rem; letter-spacing: 0.15em;
    color: rgba(200,169,110,0.5);
  ">♪ music</span>
  <button id="music-btn" onclick="toggleMusic()" style="
    background: none; border: 1px solid rgba(200,169,110,0.25);
    color: rgba(200,169,110,0.6); font-size: 0.75rem;
    padding: 0.3rem 0.7rem; cursor: pointer; letter-spacing: 0.1em;
    font-family: 'EB Garamond', serif; transition: all 0.3s ease;
  ">▶ play</button>
</div>

<div id="yt-player" style="position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;"></div>

<script>
  var ytPlayer;
  var musicPlaying = false;

  function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('yt-player', {
      videoId: 'LKaXY4IdZ40',
      playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: 'LKaXY4IdZ40' },
      events: { onReady: function() {} }
    });
  }

  function toggleMusic() {
    if (!ytPlayer) return;
    if (musicPlaying) {
      ytPlayer.pauseVideo();
      document.getElementById('music-btn').textContent = '▶ play';
      musicPlaying = false;
    } else {
      ytPlayer.playVideo();
      ytPlayer.setVolume(35);
      document.getElementById('music-btn').textContent = '⏸ pause';
      musicPlaying = true;
    }
  }

  // Load YouTube API
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
</script>
</body>
</html>
`);
    document.close();
  }, []);
  return null;
};

export default ForChrissy;
