(() => {
  const video = document.getElementById('film');
  const track = document.getElementById('scroll-track');
  const progressFill = document.getElementById('progressFill');
  const captionsWrap = document.getElementById('captions');
  const phaseDotsWrap = document.getElementById('phaseDots');
  const scrollcue = document.getElementById('scrollcue');
  const loader = document.getElementById('loader');
  const loaderFill = document.getElementById('loaderFill');
  const loaderPct = document.getElementById('loaderPct');
  const ctaBtn = document.getElementById('ctaBtn');

  // Fallback duration until metadata loads (trimmed source video is 154s)
  let duration = 154;

  const phases = [
    {
      start: 0, end: 22,
      eyebrow: 'Aparna Amber Villas',
      title: 'Enter a world of vibrant colors and endless calm.',
      copy: ''
    },
    {
      start: 22, end: 46,
      eyebrow: 'Arrival',
      title: 'A grand welcome, wrapped in bloom.',
      copy: 'Jacaranda-lined driveways set the tone the moment you arrive home.'
    },
    {
      start: 46, end: 57,
      eyebrow: 'The Avenues',
      title: 'Streets framed in purple bloom.',
      copy: 'Every avenue is landscaped for the walk, not just the drive.'
    },
    {
      start: 57, end: 85,
      eyebrow: 'Recreation',
      title: 'Spaces that move with you.',
      copy: 'Jogging trails, courts and play lawns, woven through the greenery.'
    },
    {
      start: 85, end: 103,
      eyebrow: 'Leisure',
      title: 'Slow mornings. Quiet evenings.',
      copy: 'Pergolas and patios designed for the pause between moments.'
    },
    {
      start: 103, end: 145,
      eyebrow: 'The Oasis',
      title: 'An oasis at the heart of it all.',
      copy: 'The clubhouse pool — the community’s quiet center of gravity.'
    },
    {
      start: 145, end: 149,
      eyebrow: 'Nightfall',
      title: 'Home, after the light softens.',
      copy: 'Amber-lit avenues carry the calm well into the evening.'
    },
    {
      start: 149, end: 154,
      eyebrow: 'The Masterplan',
      title: 'Thoughtfully planned, down to the last detail.',
      copy: ''
    }
  ];

  // Build caption DOM
  const captionEls = phases.map((p, i) => {
    const el = document.createElement('div');
    el.className = 'caption';
    el.innerHTML = `
      <span class="eyebrow">${p.eyebrow}</span>
      <h2>${p.title}</h2>
      ${p.copy ? `<p>${p.copy}</p>` : ''}
    `;
    captionsWrap.appendChild(el);
    return el;
  });

  // Build phase dots
  const dotEls = phases.map(() => {
    const d = document.createElement('div');
    d.className = 'dot';
    phaseDotsWrap.appendChild(d);
    return d;
  });

  let targetTime = 0;
  let currentTime = 0;
  let activeIndex = -1;

  function getProgress() {
    const rect = track.getBoundingClientRect();
    const scrollable = track.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    const p = (-rect.top) / scrollable;
    return Math.min(1, Math.max(0, p));
  }

  function onScroll() {
    const progress = getProgress();
    targetTime = progress * duration;

    progressFill.style.height = (progress * 100) + '%';

    if (progress > 0.015) {
      scrollcue.classList.add('faded');
    } else {
      scrollcue.classList.remove('faded');
    }

    // Determine active phase
    const t = targetTime;
    let idx = phases.findIndex(p => t >= p.start && t < p.end);
    if (idx === -1) idx = t >= phases[phases.length - 1].end ? phases.length - 1 : 0;

    if (idx !== activeIndex) {
      activeIndex = idx;
      captionEls.forEach((el, i) => el.classList.toggle('visible', i === idx));
      dotEls.forEach((d, i) => d.classList.toggle('active', i === idx));
    }
  }

  // ---------- Lenis smooth scrolling ----------
  // Native wheel/trackpad scrolling jumps in coarse, unpredictable deltas which
  // made the video feel like it was skipping. Lenis intercepts input and eases
  // it into the real scroll position, so the whole page (and the video bound to
  // it) glides instead of lurching.
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({
      duration: 2.2,
      easing: (t) => 1 - Math.pow(1 - t, 5),
      wheelMultiplier: 0.48,
      touchMultiplier: 0.8,
      smoothWheel: true,
      syncTouch: false
    });
    lenis.on('scroll', onScroll);
  } else {
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  window.addEventListener('resize', onScroll);

  // Smooth render loop: lerp currentTime toward targetTime for buttery scrubbing.
  // Only issue a new seek once the previous one has resolved -- Chrome silently
  // drops/queues seeks requested faster than it can service them, which freezes
  // currentTime at its last-completed value if we write every rAF tick.
  function render(time) {
    if (lenis) lenis.raf(time);

    currentTime += (targetTime - currentTime) * 0.12;
    if (Math.abs(targetTime - currentTime) < 0.008) currentTime = targetTime;
    if (video.readyState >= 1 && !video.seeking && !isNaN(currentTime)) {
      const diff = Math.abs(video.currentTime - currentTime);
      if (diff > 0.01) {
        try { video.currentTime = currentTime; } catch (e) {}
      }
    }
    requestAnimationFrame(render);
  }

  function unlockVideoForSeeking() {
    // iOS/Safari sometimes need one play/pause cycle before programmatic seeking works smoothly
    const p = video.play();
    if (p && p.then) {
      p.then(() => video.pause()).catch(() => {});
    } else {
      video.pause();
    }
  }

  // ---------- Loading bar ----------
  // Reflects the video's real buffered range against its duration, rather than
  // a handful of fixed steps, so the bar actually means something.
  let loaderDone = false;

  function setLoaderPct(pct) {
    const clamped = Math.max(0, Math.min(100, pct));
    loaderFill.style.width = clamped + '%';
    loaderPct.textContent = Math.round(clamped) + '%';
  }

  function updateBufferProgress() {
    if (loaderDone || !video.buffered.length || !duration) return;
    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
    const pct = (bufferedEnd / duration) * 100;
    setLoaderPct(Math.min(96, pct));
  }

  function hideLoader() {
    if (loaderDone) return;
    loaderDone = true;
    setLoaderPct(100);
    setTimeout(() => loader.classList.add('hide'), 300);
  }

  video.addEventListener('loadedmetadata', () => {
    if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
      duration = video.duration;
    }
    unlockVideoForSeeking();
    updateBufferProgress();
  });

  video.addEventListener('progress', updateBufferProgress);
  // Enough buffered to start scrubbing smoothly -- don't make the visitor wait
  // for the entire file to download before the page is usable.
  video.addEventListener('canplay', hideLoader, { once: true });
  video.addEventListener('canplaythrough', hideLoader, { once: true });

  // Safety: hide loader even if events are slow/blocked
  setTimeout(hideLoader, 6000);

  ctaBtn.addEventListener('click', () => {
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.6 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  onScroll();
  requestAnimationFrame(render);
})();
