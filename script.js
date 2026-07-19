(() => {
  const video = document.getElementById('film');
  const track = document.getElementById('scroll-track');
  const progressFill = document.getElementById('progressFill');
  const captionsWrap = document.getElementById('captions');
  const railMarkersWrap = document.getElementById('railMarkers');
  const scrollcue = document.getElementById('scrollcue');
  const loader = document.getElementById('loader');
  const loaderFill = document.getElementById('loaderFill');
  const loaderPct = document.getElementById('loaderPct');
  const ctaBtn = document.getElementById('ctaBtn');
  const visitModal = document.getElementById('visitModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalClose = document.getElementById('modalClose');
  const visitForm = document.getElementById('visitForm');
  const modalNote = document.getElementById('modalNote');
  const cursorDot = document.getElementById('cursorDot');
  const cursorRing = document.getElementById('cursorRing');
  const grainEl = document.querySelector('.grain');
  const videoFallback = document.getElementById('videoFallback');
  const videoRetry = document.getElementById('videoRetry');

  // Fallback duration until metadata loads (trimmed source video is 154s)
  let duration = 154;

  const phases = [
    {
      start: 0, end: 22,
      eyebrow: 'Aparna Amber Villas',
      title: 'Enter a world of vibrant colors and endless calm.',
      copy: '',
      tint: 0
    },
    {
      start: 22, end: 46,
      eyebrow: 'Arrival',
      title: 'A grand welcome, wrapped in bloom.',
      copy: 'Jacaranda-lined driveways set the tone the moment you arrive home.',
      tint: 6
    },
    {
      start: 46, end: 57,
      eyebrow: 'The Avenues',
      title: 'Streets framed in purple bloom.',
      copy: 'Every avenue is landscaped for the walk, not just the drive.',
      tint: -4
    },
    {
      start: 57, end: 85,
      eyebrow: 'Recreation',
      title: 'Spaces that move with you.',
      copy: 'Jogging trails, courts and play lawns, woven through the greenery.',
      tint: -8
    },
    {
      start: 85, end: 103,
      eyebrow: 'Leisure',
      title: 'Slow mornings. Quiet evenings.',
      copy: 'Pergolas and patios designed for the pause between moments.',
      tint: 4
    },
    {
      start: 103, end: 145,
      eyebrow: 'The Oasis',
      title: 'An oasis at the heart of it all.',
      copy: 'The clubhouse pool — the community’s quiet center of gravity.',
      tint: 8
    },
    {
      start: 145, end: 149,
      eyebrow: 'Nightfall',
      title: 'Home, after the light softens.',
      copy: 'Amber-lit avenues carry the calm well into the evening.',
      tint: 14
    },
    {
      start: 149, end: 154,
      eyebrow: 'The Masterplan',
      title: 'Thoughtfully planned, down to the last detail.',
      copy: '',
      tint: 0
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

  // Build rail markers -- one per phase, positioned along the progress rail
  // at the phase's start fraction so the rail doubles as a phase nav.
  const markerEls = phases.map((p, i) => {
    const m = document.createElement('div');
    m.className = 'rail-marker';
    m.setAttribute('role', 'button');
    m.setAttribute('tabindex', '0');
    m.setAttribute('aria-label', `Jump to ${p.eyebrow}`);
    m.addEventListener('click', () => jumpToPhase(i));
    m.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        jumpToPhase(i);
      }
    });
    railMarkersWrap.appendChild(m);
    return m;
  });

  // Marker vertical position depends on video duration, which may still be
  // the fallback estimate at build time -- recompute once real duration loads.
  function positionMarkers() {
    markerEls.forEach((m, i) => {
      m.style.top = (phases[i].start / duration * 100) + '%';
    });
  }
  positionMarkers();

  // Jump the page scroll (and therefore the video) to the start of a phase.
  function jumpToPhase(index) {
    const phase = phases[index];
    const scrollable = track.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const progress = phase.start / duration;
    const targetScroll = track.offsetTop + progress * scrollable;
    if (lenis) {
      lenis.scrollTo(targetScroll, { duration: 1.4 });
    } else {
      window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }

  let targetTime = 0;
  let currentTime = 0;
  let activeIndex = -1;

  // Respected everywhere motion is optional: the eased scroll, the trailing
  // cursor, the grain flicker, and the caption drift all skip themselves so a
  // vestibular-sensitive visitor gets a direct, low-motion experience instead
  // of just slower versions of the same effects.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Custom cursor (mouse-driven devices only) ----------
  // Fine-pointer check gates both the CSS (native cursor hidden) and this JS --
  // on touch devices we never hide the native cursor or add these listeners.
  const finePointer = !reducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;

  if (finePointer) {
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('.cta, .rail-marker, .modal-close')) cursorRing.classList.add('hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('.cta, .rail-marker, .modal-close')) cursorRing.classList.remove('hover');
    });
  }

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
      markerEls.forEach((m, i) => m.classList.toggle('active', i === idx));
      document.documentElement.style.setProperty('--phase-tint', `${phases[idx].tint}deg`);
    }
  }

  // ---------- Lenis smooth scrolling ----------
  // Native wheel/trackpad scrolling jumps in coarse, unpredictable deltas which
  // made the video feel like it was skipping. Lenis intercepts input and eases
  // it into the real scroll position, so the whole page (and the video bound to
  // it) glides instead of lurching.
  let lenis = null;
  if (window.Lenis && !reducedMotion) {
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

    if (finePointer) {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    }

    currentTime += (targetTime - currentTime) * (reducedMotion ? 1 : 0.12);
    if (Math.abs(targetTime - currentTime) < 0.008) currentTime = targetTime;

    // Free parallax: the video-seek lag (target racing ahead of currentTime
    // while catching up) doubles as a drift signal for the caption layer, so
    // it settles slightly slower than the rail instead of moving in lockstep.
    // Skipped under reduced motion -- currentTime tracks targetTime exactly
    // there, so the lag is always ~0 anyway.
    if (!reducedMotion) {
      const lag = Math.max(-3, Math.min(3, targetTime - currentTime));
      captionsWrap.style.transform = `translateY(${lag * 8}px)`;
    }

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

  // ---------- Video load failure ----------
  function showVideoFallback() {
    if (loaderDone) return;
    videoFallback.classList.add('show');
    hideLoader();
  }
  video.addEventListener('error', showVideoFallback);
  videoRetry.addEventListener('click', () => window.location.reload());

  video.addEventListener('loadedmetadata', () => {
    if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
      duration = video.duration;
      positionMarkers();
    }
    unlockVideoForSeeking();
    updateBufferProgress();
  });

  video.addEventListener('progress', updateBufferProgress);
  // Enough buffered to start scrubbing smoothly -- don't make the visitor wait
  // for the entire file to download before the page is usable.
  video.addEventListener('canplay', hideLoader, { once: true });
  video.addEventListener('canplaythrough', hideLoader, { once: true });

  // Safety: if nothing has buffered enough to play by now, treat it as a
  // stalled/failed load rather than silently dropping the visitor onto a
  // black screen -- otherwise a slow connection looks indistinguishable
  // from a broken page.
  setTimeout(() => {
    if (video.readyState < 2) {
      showVideoFallback();
    } else {
      hideLoader();
    }
  }, 6000);

  // ---------- Schedule a Visit modal ----------
  let modalReturnFocus = null;
  const modalFocusables = () =>
    [...visitModal.querySelectorAll('input, button')].filter((el) => !el.disabled);

  function openModal() {
    modalReturnFocus = document.activeElement;
    visitModal.classList.add('open');
    visitModal.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
    // Deferred a frame: focusing in the same tick as the visibility:hidden ->
    // visible class toggle can silently no-op before the style recalc lands.
    requestAnimationFrame(() => {
      const firstField = visitForm.querySelector('input');
      if (firstField) firstField.focus();
    });
  }

  function closeModal() {
    visitModal.classList.remove('open');
    visitModal.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
    document.body.style.overflow = '';
    if (modalReturnFocus) modalReturnFocus.focus();
  }

  ctaBtn.addEventListener('click', openModal);
  modalBackdrop.addEventListener('click', closeModal);
  modalClose.addEventListener('click', closeModal);
  window.addEventListener('keydown', (e) => {
    if (!visitModal.classList.contains('open')) return;
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    // Trap Tab focus inside the modal while it's open.
    if (e.key === 'Tab') {
      const focusables = modalFocusables();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  visitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(visitForm);
    const name = data.get('name');
    const phone = data.get('phone');
    const email = data.get('email');
    const subject = encodeURIComponent('Site Visit Request — Aparna Amber Villas');
    const body = encodeURIComponent(`Name: ${name}\nPhone: ${phone}\nEmail: ${email || '-'}`);
    window.location.href = `mailto:sales@aparnaamber.example?subject=${subject}&body=${body}`;
    modalNote.textContent = 'Opening your email client to send the request...';
  });

  // ---------- Animated grain ----------
  // Regenerating the turbulence noise on a slow interval (not per-frame) gives
  // authentic film-grain flicker instead of one static baked-in pattern.
  function grainDataURI() {
    const freq = (0.85 + Math.random() * 0.15).toFixed(2);
    const seed = Math.floor(Math.random() * 100);
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='2' seed='${seed}' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>`;
  }
  function tickGrain() {
    grainEl.style.backgroundImage = `url("${grainDataURI()}")`;
  }
  tickGrain();
  if (!reducedMotion) setInterval(tickGrain, 150);

  // ---------- Finale entrance ----------
  // Fires once when the section first enters view, instead of a JS-driven
  // timeline -- a fixed CSS stagger is enough for a one-shot reveal.
  const finale = document.getElementById('finale');
  const finaleObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        finale.classList.add('revealed');
        finaleObserver.unobserve(finale);
      }
    });
  }, { threshold: 0.3 });
  finaleObserver.observe(finale);

  onScroll();
  requestAnimationFrame(render);
})();
