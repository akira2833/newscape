import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

// ============================================================================
// 0. SCROLL RESTORATION: Always start from top (0, 0) on reload/entry
// ============================================================================
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

window.addEventListener('beforeunload', () => {
  window.scrollTo(0, 0);
});

/**
 * NEWSCAPE Cinematic Scrollytelling Engine
 * ----------------------------------------------------------------------------
 * 1. Text & Story Focusing Engine (Smooth focal line distance tracking)
 * 2. Middle Layer Kinetic Typography & Parallax Coordinator
 * 3. Section Tracker & HUD Navigation
 * 4. Modern Web Lightbox Modal (<dialog> with Light Dismiss)
 * 5. Web Audio Ambient Soundscape (Gentle river breeze generator)
 */

// ============================================================================
// 1. SECTION DEFINITIONS & METADATA
// ============================================================================
const SECTION_CONFIG = {
  'sec-prologue': {
    keyword: 'NEWSCAPE',
    sub: 'LEAVE THE NOISE · FIND THE FLAT',
    number: '00',
    tag: '00 / PROLOGUE'
  },
  'sec-01': {
    keyword: 'NORTH',
    sub: 'FLIGHT OF MIGRATORY BIRDS · 한강 하구의 비상',
    number: '01',
    tag: '01 / NORTH'
  },
  'sec-02': {
    keyword: 'CENTER',
    sub: 'CONE-SHAPED SKYLIGHT · 제주의 굼부리',
    number: '02',
    tag: '02 / CENTER'
  },
  'sec-03': {
    keyword: 'EAST',
    sub: 'CENTURY-OLD POPLAR TREE · 100년 미루나무',
    number: '03',
    tag: '03 / EAST'
  },
  'sec-04': {
    keyword: 'SANCTUARY',
    sub: 'CORRIDOR OF SENSORY PERCEPTION · 감각의 회랑',
    number: '04',
    tag: '04 / EAST-II'
  },
  'sec-05': {
    keyword: 'WEST',
    sub: 'ANCESTRAL RIVER SUNSET · 조강의 노을',
    number: '05',
    tag: '05 / WEST'
  },
  'sec-06': {
    keyword: 'HORIZON',
    sub: 'CINEMATIC STRIP WINDOW · 무비릴스 창',
    number: '06',
    tag: '06 / WEST-II'
  },
  'sec-07': {
    keyword: 'SOUTH',
    sub: 'ANCIENT OAK GROVE · 참나무 육형제 숲',
    number: '07',
    tag: '07 / SOUTH'
  },
  'sec-08': {
    keyword: 'DEPARTURES',
    sub: '8.1CH CINEMATIC FILM · 영화 〈디파처스〉',
    number: '08',
    tag: '08 / FILM'
  },
  'sec-09': {
    keyword: 'EPILOGUE',
    sub: 'LETTER FROM THE DIRECTOR · 장민승 배상',
    number: '09',
    tag: '09 / EPILOGUE'
  },
  'sec-info': {
    keyword: 'INFORMATION',
    sub: 'VISIT GUIDE & ARCHITECTURE · 방문 안내',
    number: '10',
    tag: '10 / VISIT & INFO'
  }
};

// ============================================================================
// 2. DOM ELEMENT REFERENCES
// ============================================================================
const typoStreamTrack = document.getElementById('typo-stream-track');
const typoStreamList = document.getElementById('typo-stream-list');
const typoStreamLine = document.getElementById('typo-stream-line');
const typoItems = document.querySelectorAll('.typo-item');
const typoGiantNumber = document.getElementById('typo-giant-number');

// 세로 영문 텍스트 오른쪽 끝 + 10px 위치에 수직선 정확히 동기화
function updateTypoStreamLine() {
  if (!typoStreamLine) return;
  const activeItem = document.querySelector('.typo-item.is-active') || typoItems[0];
  if (!activeItem) return;
  const inner = activeItem.querySelector('.typo-item-inner');
  if (!inner) return;

  const rect = inner.getBoundingClientRect();
  // 세로 영문 텍스트의 실제 오른쪽 외곽선 + 10px
  const targetX = Math.round(rect.right + 10);
  typoStreamLine.style.left = `${targetX}px`;
}

const headerChapterTag = document.getElementById('header-chapter-tag');
const trackerFill = document.getElementById('tracker-fill');
const trackerNum = document.getElementById('tracker-num');

const navJumpWrap = document.getElementById('nav-jump-wrap');
const btnJumpToggle = document.getElementById('btn-jump-toggle');
const jumpDropdown = document.getElementById('jump-dropdown');
const jumpButtons = document.querySelectorAll('.jump-btn');

const sections = Array.from(document.querySelectorAll('.story-section'));
let focusItems = [];

// Performance Cache to eliminate Layout Thrashing (Reflow) on Scroll
let cachedFocusItems = [];
let cachedSecMids = [];
let cachedSecRects = [];
let cachedItemCenters = [];
let cachedSec03DocTop = 0;
let cachedSec03DocHeight = 0;
let lastActiveTypoIdx = -1;

function initFocusItems() {
  // Wrap lines inside story paragraphs with .focus-line (hero-tagline은 항상 순백색 유지)
  const storyParagraphs = document.querySelectorAll('.story-text');
  storyParagraphs.forEach(p => {
    if (p.querySelector('.focus-line')) return;
    const html = p.innerHTML;
    const lines = html.split(/<br\s*[\/]?>/gi);
    p.innerHTML = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<span class="focus-line">${line}</span>`)
      .join('');
  });

  const lines = Array.from(document.querySelectorAll('.focus-line'));
  const figures = Array.from(document.querySelectorAll('.story-figure'));
  const otherItems = Array.from(document.querySelectorAll('.focus-item:not(.story-text):not(.hero-tagline)'));

  focusItems = [...lines, ...figures, ...otherItems];
}

initFocusItems();

let lastMeasuredDocHeight = 0;

// Cache layout positions in document coordinates to prevent getBoundingClientRect in scroll loop
function measureLayoutPositions() {
  const scrollY = window.scrollY || window.pageYOffset;
  const viewportHeight = window.innerHeight;
  lastMeasuredDocHeight = document.documentElement.scrollHeight;

  // 1. Sections cache
  cachedSecMids = sections.map(sec => {
    const rect = sec.getBoundingClientRect();
    return {
      id: sec.id,
      midDoc: rect.top + scrollY + rect.height * 0.5,
      topDoc: rect.top + scrollY,
      bottomDoc: rect.bottom + scrollY
    };
  });

  // 2. Typo stream item centers cache
  cachedItemCenters = Array.from(typoItems).map(item => {
    return item.offsetTop + item.offsetHeight * 0.5;
  });

  // 3. Focus items cache
  cachedFocusItems = focusItems.map(item => {
    const rect = item.getBoundingClientRect();
    const isLine = item.classList.contains('focus-line');
    const tolerance = isLine ? 35 : (viewportHeight * 0.28);
    return {
      element: item,
      isLine: isLine,
      docCenter: rect.top + scrollY + rect.height * 0.5,
      tolerance: tolerance,
      currentState: ''
    };
  });

  // 4. Section 03 cache
  const sec03 = document.getElementById('sec-03');
  if (sec03) {
    const r = sec03.getBoundingClientRect();
    cachedSec03DocTop = r.top + scrollY;
    cachedSec03DocHeight = r.height;
  }
}

const photoDialog = document.getElementById('photo-dialog');
const dialogPhotoImg = document.getElementById('dialog-photo-img');
const dialogPhotoCaption = document.getElementById('dialog-photo-caption');
const btnCloseDialog = document.getElementById('btn-close-dialog');
const storyFigures = document.querySelectorAll('.story-figure');

const btnSoundToggle = document.getElementById('btn-sound-toggle');
const soundIcon = document.getElementById('sound-icon');
const soundLabel = document.getElementById('sound-label');
const btnCopyAddress = document.getElementById('btn-copy-address');

// State tracking
let currentActiveSectionId = 'sec-prologue';
let isTicking = false;
let isSec03InView = false;
let isPastOrInSec03 = false;

// ============================================================================
// 3. MIDDLE TYPOGRAPHY & HUD SYNC ENGINE (HUD 및 워터마크 동기화)
// ============================================================================
function updateMiddleTypography(sectionId) {
  if (sectionId === currentActiveSectionId) return;

  const config = SECTION_CONFIG[sectionId];
  if (!config) return;

  currentActiveSectionId = sectionId;

  // Header and tracker HUD update
  if (headerChapterTag) headerChapterTag.textContent = config.tag;
  if (trackerNum) trackerNum.textContent = config.number;
  if (typoGiantNumber) typoGiantNumber.textContent = config.number;
}

// ============================================================================
// 4. SCROLL & LINE-BY-LINE FOCUSING ENGINE ("한단락이 아닌 한줄씩 포커싱")
//    - Zero Reflow / Zero Layout Thrashing (사파리 60fps/120fps 최적화)
// ============================================================================
function handleScroll() {
  const scrollY = window.scrollY || window.pageYOffset;
  const viewportHeight = window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;
  const maxScroll = Math.max(docHeight - viewportHeight, 1);

  // Auto-sync layout positions if document height changed (e.g. lazy-loaded images, fonts)
  if (Math.abs(docHeight - lastMeasuredDocHeight) > 10) {
    measureLayoutPositions();
  }

  // 1. Overall Progress Bar
  const scrollRatio = Math.min(Math.max(scrollY / maxScroll, 0), 1);
  if (trackerFill) {
    trackerFill.style.height = `${(scrollRatio * 100).toFixed(1)}%`;
  }

  // 2. Continuous Vertical Typography Stream (캐시된 좌표로 즉각 보간)
  if (typoStreamList && cachedSecMids.length > 0 && cachedItemCenters.length > 0) {
    const focalCenterY = viewportHeight * 0.48;

    // 각 본문 섹션의 현재 뷰포트 내 중심 Y 좌표
    const secMids = cachedSecMids.map(s => s.midDoc - scrollY);

    let fractionalIndex = 0;
    if (focalCenterY <= secMids[0]) {
      fractionalIndex = 0;
    } else if (focalCenterY >= secMids[secMids.length - 1]) {
      fractionalIndex = secMids.length - 1;
    } else {
      for (let i = 0; i < secMids.length - 1; i++) {
        if (focalCenterY >= secMids[i] && focalCenterY <= secMids[i + 1]) {
          const span = secMids[i + 1] - secMids[i];
          const t = span > 0 ? (focalCenterY - secMids[i]) / span : 0;
          fractionalIndex = i + t;
          break;
        }
      }
    }

    const baseIndex = Math.floor(fractionalIndex);
    const nextIndex = Math.min(baseIndex + 1, cachedItemCenters.length - 1);
    const alpha = fractionalIndex - baseIndex;
    const targetItemCenter = cachedItemCenters[baseIndex] * (1 - alpha) + cachedItemCenters[nextIndex] * alpha;

    const currentTranslateY = focalCenterY - targetItemCenter;
    typoStreamList.style.transform = `translateY(${currentTranslateY.toFixed(1)}px)`;

    const activeIdx = Math.round(fractionalIndex);
    if (activeIdx !== lastActiveTypoIdx) {
      lastActiveTypoIdx = activeIdx;
      typoItems.forEach((item, idx) => {
        if (idx === activeIdx) {
          item.classList.add('is-active');
        } else {
          item.classList.remove('is-active');
        }
      });
      updateTypoStreamLine();
    }
  }

  // 3. Focal Line Calculation (한줄씩 명확한 라인 스포트라이트 & 피규어 포커싱)
  const focalLine = viewportHeight * 0.44;
  let closestLine = null;
  let minLineDistance = Infinity;

  // 3-A. Find closest line to reading focal line & update figures/cards
  for (let i = 0; i < cachedFocusItems.length; i++) {
    const item = cachedFocusItems[i];
    const itemCenter = item.docCenter - scrollY;

    if (item.isLine) {
      const dist = Math.abs(itemCenter - focalLine);
      if (dist < minLineDistance && dist < (viewportHeight * 0.38)) {
        minLineDistance = dist;
        closestLine = item;
      }
    } else {
      // Story Figures & Info Cards
      const distToFocalLine = Math.abs(itemCenter - focalLine);
      let nextState = 'none';
      if (distToFocalLine < item.tolerance) {
        nextState = 'focused';
      } else if (itemCenter < focalLine - item.tolerance) {
        nextState = 'passed';
      }

      if (item.currentState !== nextState) {
        item.currentState = nextState;
        if (nextState === 'focused') {
          item.element.classList.add('is-focused');
          item.element.classList.remove('is-passed');
        } else if (nextState === 'passed') {
          item.element.classList.remove('is-focused');
          item.element.classList.add('is-passed');
        } else {
          item.element.classList.remove('is-focused');
          item.element.classList.remove('is-passed');
        }
      }
    }
  }

  // 3-B. Update lines with strict single-line focus spotlight
  for (let i = 0; i < cachedFocusItems.length; i++) {
    const item = cachedFocusItems[i];
    if (!item.isLine) continue;

    const itemCenter = item.docCenter - scrollY;
    let nextState = 'none';

    if (closestLine && item === closestLine) {
      nextState = 'focused';
    } else if (itemCenter < focalLine - 20) {
      nextState = 'passed';
    } else {
      nextState = 'none';
    }

    if (item.currentState !== nextState) {
      item.currentState = nextState;
      if (nextState === 'focused') {
        item.element.classList.add('is-focused');
        item.element.classList.remove('is-passed');
      } else if (nextState === 'passed') {
        item.element.classList.remove('is-focused');
        item.element.classList.add('is-passed');
      } else {
        item.element.classList.remove('is-focused');
        item.element.classList.remove('is-passed');
      }
    }
  }

  // 4. Determine Active Section (캐시 활용)
  let activeSecId = currentActiveSectionId;
  const midScreen = viewportHeight * 0.5;

  for (let i = 0; i < cachedSecMids.length; i++) {
    const sec = cachedSecMids[i];
    const top = sec.topDoc - scrollY;
    const bottom = sec.bottomDoc - scrollY;
    if (top <= midScreen && bottom >= midScreen) {
      activeSecId = sec.id;
      break;
    } else if (top > midScreen && i === 0) {
      activeSecId = sec.id;
      break;
    } else if (i === cachedSecMids.length - 1 && bottom < midScreen) {
      activeSecId = sec.id;
    }
  }

  updateMiddleTypography(activeSecId);

  // 3번 영역(03 / EAST — 노거수 미루나무) 도달 감지
  if (cachedSec03DocHeight > 0) {
    const sec03Top = cachedSec03DocTop - scrollY;
    isSec03InView = (sec03Top < viewportHeight * 0.85) && ((sec03Top + cachedSec03DocHeight) > viewportHeight * 0.12);
    isPastOrInSec03 = (sec03Top < viewportHeight * 0.85);
  }

  isTicking = false;
}

function requestTick() {
  if (!isTicking) {
    requestAnimationFrame(handleScroll);
    isTicking = true;
  }
}

window.addEventListener('scroll', requestTick, { passive: true });
window.addEventListener('resize', () => {
  measureLayoutPositions();
  requestTick();
}, { passive: true });

// ============================================================================
// LENIS SMOOTH SCROLL (데스크톱 마우스 휠 전용 감속, 모바일 터치는 네이티브 120Hz 유지)
// ============================================================================
let lenis = null;
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;

if (typeof window.Lenis !== 'undefined' && !isTouchDevice) {
  lenis = new window.Lenis({
    duration: 1.8,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 0.72,
    syncTouch: false,
    touchMultiplier: 0,
    infinite: false
  });

  function raf(time) {
    if (lenis) lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  lenis.on('scroll', () => {
    requestTick();
  });
}

// ============================================================================
// 5. CHAPTER JUMP NAVIGATION
// ============================================================================
if (btnJumpToggle && navJumpWrap) {
  btnJumpToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navJumpWrap.classList.toggle('is-open');
    btnJumpToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (!navJumpWrap.contains(e.target)) {
      navJumpWrap.classList.remove('is-open');
      btnJumpToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

jumpButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const targetElement = document.getElementById(targetId);
    if (lenis && targetElement) {
      lenis.scrollTo(targetElement, { duration: 1.8, offset: 0 });
    } else if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (navJumpWrap) {
      navJumpWrap.classList.remove('is-open');
      btnJumpToggle?.setAttribute('aria-expanded', 'false');
    }
  });
});

// Brand link clicks scroll smoothly to top
const brandLink = document.getElementById('brand-link');
if (brandLink) {
  brandLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.8 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

// Fast-Access INFO Anchor buttons (상단 헤더 & 히어로 영역에서 10번 방문/안내 섹션으로 즉시 이동)
const quickInfoButtons = document.querySelectorAll('#btn-quick-info, #hero-btn-info');
quickInfoButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const secInfo = document.getElementById('sec-info');
    if (lenis && secInfo) {
      lenis.scrollTo(secInfo, { duration: 1.6, offset: 0 });
    } else if (secInfo) {
      secInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ============================================================================
// 6. LIGHTBOX MODAL (Modern Web Guidance Compliant)
// ============================================================================
if (photoDialog) {
  storyFigures.forEach(fig => {
    fig.addEventListener('click', () => {
      const fullSrc = fig.getAttribute('data-full') || fig.querySelector('img')?.src;
      const caption = fig.getAttribute('data-caption') || fig.querySelector('figcaption')?.textContent || '';

      if (dialogPhotoImg && fullSrc) {
        dialogPhotoImg.src = fullSrc;
        const updateDialogFrame = () => {
          const dialogBox = photoDialog.querySelector('.dialog-media-box');
          if (dialogBox) {
            let svg = dialogBox.querySelector('.quill-pen-frame');
            if (!svg) {
              svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              svg.setAttribute('class', 'quill-pen-frame');
              svg.setAttribute('aria-hidden', 'true');
              dialogBox.appendChild(svg);
            }
            const r = dialogBox.getBoundingClientRect();
            if (r.width > 10 && r.height > 10) {
              renderQuillFrame(svg, r.width, r.height, 99.9);
            }
          }
        };
        if (dialogPhotoImg.complete) {
          setTimeout(updateDialogFrame, 40);
        } else {
          dialogPhotoImg.onload = () => setTimeout(updateDialogFrame, 40);
        }
      }
      if (dialogPhotoCaption) {
        dialogPhotoCaption.textContent = caption;
      }

      if (typeof photoDialog.showModal === 'function') {
        photoDialog.showModal();
      } else {
        photoDialog.setAttribute('open', '');
      }
    });
  });

  function closePhotoDialog() {
    if (typeof photoDialog.close === 'function') {
      photoDialog.close();
    } else {
      photoDialog.removeAttribute('open');
    }
  }

  // 팝업 이미지 및 미디어 박스 터치/클릭 시 닫기
  if (dialogPhotoImg) {
    dialogPhotoImg.addEventListener('click', (e) => {
      e.stopPropagation();
      closePhotoDialog();
    });
  }

  const dialogMediaBox = photoDialog.querySelector('.dialog-media-box');
  if (dialogMediaBox) {
    dialogMediaBox.addEventListener('click', () => {
      closePhotoDialog();
    });
  }

  // Close button handler
  if (btnCloseDialog) {
    btnCloseDialog.addEventListener('click', (e) => {
      e.stopPropagation();
      closePhotoDialog();
    });
  }

  // Light dismiss fallback for backdrop clicks
  photoDialog.addEventListener('click', (e) => {
    const rect = photoDialog.getBoundingClientRect();
    const isBackdropClick =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;

    if (isBackdropClick) {
      closePhotoDialog();
    }
  });
}

// Copy address action
if (btnCopyAddress) {
  btnCopyAddress.addEventListener('click', async () => {
    const address = '경기도 김포시 고촌읍 신곡리 515-3 (신곡로18번길 50)';
    try {
      await navigator.clipboard.writeText(address);
      const originalText = btnCopyAddress.textContent;
      btnCopyAddress.textContent = '주소 복사됨! ✓';
      btnCopyAddress.style.borderColor = '#ffffff';
      btnCopyAddress.style.color = '#ffffff';
      setTimeout(() => {
        btnCopyAddress.textContent = originalText;
        btnCopyAddress.style.borderColor = '';
        btnCopyAddress.style.color = '';
      }, 2400);
    } catch {
      alert(`NEWSCAPE 주소: ${address}`);
    }
  });
}

// ============================================================================
// 7. AMBIENT RIVER SOUNDSCAPE (Synthesized Web Audio Ambient Breeze)
// ============================================================================
let audioCtx = null;
let soundNodes = null;
let isSoundPlaying = false;

function createRiverAmbience() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  const ctx = new AudioContextClass();

  // Master Gain
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, ctx.currentTime);
  masterGain.connect(ctx.destination);

  // 1. Pink Noise Generator (River wind & ripples)
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
    b6 = white * 0.115926;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  // Lowpass filter for smooth water breeze
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(320, ctx.currentTime);

  // Gentle LFO modulating filter cutoff
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // 0.12 Hz slow swelling wave
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(140, ctx.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  noiseSource.connect(filter);
  filter.connect(masterGain);

  // 2. Sub Drone (Harmonic resonance: F1 ~ 87.3Hz)
  const drone = ctx.createOscillator();
  drone.type = 'sine';
  drone.frequency.setValueAtTime(87.31, ctx.currentTime);

  const droneGain = ctx.createGain();
  droneGain.gain.setValueAtTime(0.018, ctx.currentTime);
  drone.connect(droneGain);
  droneGain.connect(masterGain);

  noiseSource.start();
  lfo.start();
  drone.start();

  return { ctx, masterGain };
}

if (btnSoundToggle) {
  btnSoundToggle.addEventListener('click', async () => {
    if (!audioCtx) {
      soundNodes = createRiverAmbience();
      if (soundNodes) {
        audioCtx = soundNodes.ctx;
      }
    }

    if (!audioCtx || !soundNodes) return;

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    if (!isSoundPlaying) {
      // Fade In
      soundNodes.masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
      soundNodes.masterGain.gain.setValueAtTime(soundNodes.masterGain.gain.value, audioCtx.currentTime);
      soundNodes.masterGain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 1.2);
      isSoundPlaying = true;
      btnSoundToggle.classList.add('active');
      btnSoundToggle.setAttribute('aria-pressed', 'true');
      if (soundLabel) soundLabel.textContent = 'Sound On';
    } else {
      // Fade Out
      soundNodes.masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
      soundNodes.masterGain.gain.setValueAtTime(soundNodes.masterGain.gain.value, audioCtx.currentTime);
      soundNodes.masterGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
      isSoundPlaying = false;
      btnSoundToggle.classList.remove('active');
      btnSoundToggle.setAttribute('aria-pressed', 'false');
      if (soundLabel) soundLabel.textContent = 'Sound';
    }
  });
}

// ============================================================================
// 8. IMAGE PRESENTATION (평면 갤러리 모드 - 3D 틸트 제거하여 안정적 감상 유도)
// ============================================================================

// ============================================================================
// 8-1. QUILL SCRATCH PEN IMAGE FRAMES (새와 잎, 가지와 동일한 순수 펜 드로잉 테두리)
// ============================================================================

function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateSketchPath(x0, y0, x1, y1, segments, jitterAmp, seed) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 1) return `M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)}`;

  const nx = -dy / len;
  const ny = dx / len;

  const pts = [[x0, y0]];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    const jit = (pseudoRandom(seed + i * 2.13) - 0.5) * 2 * jitterAmp;
    const taper = Math.sin(t * Math.PI); // 끝부분으로 갈수록 모서리에 자연스럽게 수렴
    pts.push([px + nx * jit * taper, py + ny * jit * taper]);
  }
  pts.push([x1, y1]);

  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const midX = (pts[i][0] + pts[i + 1][0]) * 0.5;
    const midY = (pts[i][1] + pts[i + 1][1]) * 0.5;
    d += ` Q ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  d += ` L ${pts[pts.length - 1][0].toFixed(1)} ${pts[pts.length - 1][1].toFixed(1)}`;
  return d;
}

function renderQuillFrame(svg, w, h, seed) {
  const pad = 14; // SVG inset(-14px)에 대응
  const x0 = pad;
  const y0 = pad;
  const x1 = pad + w;
  const y1 = pad + h;

  svg.setAttribute('viewBox', `0 0 ${w + pad * 2} ${h + pad * 2}`);

  // 1. 모서리 오버슈트 (손으로 그릴 때 모서리를 지나치는 스케치 특유의 교차선)
  const overTL_H = 10 + pseudoRandom(seed + 1) * 6; // 상단 좌측 돌출 (10~16px)
  const overTR_H = 11 + pseudoRandom(seed + 2) * 6; // 상단 우측 돌출
  const overBL_H = 12 + pseudoRandom(seed + 3) * 6; // 하단 좌측 돌출
  const overBR_H = 10 + pseudoRandom(seed + 4) * 6; // 하단 우측 돌출

  const overTL_V = 11 + pseudoRandom(seed + 5) * 6; // 좌측 상단 돌출
  const overBL_V = 10 + pseudoRandom(seed + 6) * 6; // 좌측 하단 돌출
  const overTR_V = 12 + pseudoRandom(seed + 7) * 6; // 우측 상단 돌출
  const overBR_V = 11 + pseudoRandom(seed + 8) * 6; // 우측 하단 돌출

  // 메인 윤곽선 (손맛이 살아있는 유려한 펜선)
  const pathTopMain = generateSketchPath(x0 - overTL_H, y0, x1 + overTR_H, y0, 8, 0.7, seed + 10);
  const pathBottomMain = generateSketchPath(x0 - overBL_H, y1, x1 + overBR_H, y1, 8, 0.7, seed + 20);
  const pathLeftMain = generateSketchPath(x0, y0 - overTL_V, x0, y1 + overBL_V, 7, 0.7, seed + 30);
  const pathRightMain = generateSketchPath(x1, y0 - overTR_V, x1, y1 + overBR_V, 7, 0.7, seed + 40);

  // 2. 보조 스크래치 선 (펜을 겹쳐 그을 때 생기는 자연스러운 쌍둥이 펜선)
  const pathTopSub = generateSketchPath(x0 - overTL_H * 0.6, y0 - 1.2, x1 + overTR_H * 0.7, y0 - 0.8, 6, 0.6, seed + 50);
  const pathBottomSub = generateSketchPath(x0 - overBL_H * 0.7, y1 + 1.2, x1 + overBR_H * 0.6, y1 + 0.9, 6, 0.6, seed + 60);
  const pathLeftSub = generateSketchPath(x0 - 1.2, y0 - overTL_V * 0.6, x0 - 0.9, y1 + overBL_V * 0.7, 5, 0.6, seed + 70);
  const pathRightSub = generateSketchPath(x1 + 1.2, y0 - overTR_V * 0.7, x1 + 0.9, y1 + overBR_V * 0.6, 5, 0.6, seed + 80);

  // 3. 4개 모서리 펜 스크래치 해칭선 (새의 날개깃 및 나뭇잎 주맥 해칭과 동일한 45° 사선)
  const hatchLines = [
    // Top-Left Corner
    `M ${(x0 - 9).toFixed(1)} ${(y0 + 2).toFixed(1)} L ${(x0 + 2).toFixed(1)} ${(y0 - 9).toFixed(1)}`,
    `M ${(x0 - 5).toFixed(1)} ${(y0 + 6).toFixed(1)} L ${(x0 + 6).toFixed(1)} ${(y0 - 5).toFixed(1)}`,
    `M ${(x0 - 1).toFixed(1)} ${(y0 + 10).toFixed(1)} L ${(x0 + 10).toFixed(1)} ${(y0 - 1).toFixed(1)}`,

    // Top-Right Corner
    `M ${(x1 - 2).toFixed(1)} ${(y0 - 9).toFixed(1)} L ${(x1 + 9).toFixed(1)} ${(y0 + 2).toFixed(1)}`,
    `M ${(x1 - 6).toFixed(1)} ${(y0 - 5).toFixed(1)} L ${(x1 + 5).toFixed(1)} ${(y0 + 6).toFixed(1)}`,
    `M ${(x1 - 10).toFixed(1)} ${(y0 - 1).toFixed(1)} L ${(x1 + 1).toFixed(1)} ${(y0 + 10).toFixed(1)}`,

    // Bottom-Left Corner
    `M ${(x0 - 9).toFixed(1)} ${(y1 - 2).toFixed(1)} L ${(x0 + 2).toFixed(1)} ${(y1 + 9).toFixed(1)}`,
    `M ${(x0 - 5).toFixed(1)} ${(y1 - 6).toFixed(1)} L ${(x0 + 6).toFixed(1)} ${(y1 + 5).toFixed(1)}`,
    `M ${(x0 - 1).toFixed(1)} ${(y1 - 10).toFixed(1)} L ${(x0 + 10).toFixed(1)} ${(y1 + 1).toFixed(1)}`,

    // Bottom-Right Corner
    `M ${(x1 - 2).toFixed(1)} ${(y1 + 9).toFixed(1)} L ${(x1 + 9).toFixed(1)} ${(y1 - 2).toFixed(1)}`,
    `M ${(x1 - 6).toFixed(1)} ${(y1 + 5).toFixed(1)} L ${(x1 + 5).toFixed(1)} ${(y1 - 6).toFixed(1)}`,
    `M ${(x1 - 10).toFixed(1)} ${(y1 + 1).toFixed(1)} L ${(x1 + 1).toFixed(1)} ${(y1 - 10).toFixed(1)}`
  ];

  // 4. 모서리 앵커 크로스 틱 (교차점 펜 강조점)
  const cornerCrosses = [
    `M ${(x0 - 3).toFixed(1)} ${y0.toFixed(1)} L ${(x0 + 3).toFixed(1)} ${y0.toFixed(1)} M ${x0.toFixed(1)} ${(y0 - 3).toFixed(1)} L ${x0.toFixed(1)} ${(y0 + 3).toFixed(1)}`,
    `M ${(x1 - 3).toFixed(1)} ${y0.toFixed(1)} L ${(x1 + 3).toFixed(1)} ${y0.toFixed(1)} M ${x1.toFixed(1)} ${(y0 - 3).toFixed(1)} L ${x1.toFixed(1)} ${(y0 + 3).toFixed(1)}`,
    `M ${(x0 - 3).toFixed(1)} ${y1.toFixed(1)} L ${(x0 + 3).toFixed(1)} ${y1.toFixed(1)} M ${x0.toFixed(1)} ${(y1 - 3).toFixed(1)} L ${x0.toFixed(1)} ${(y1 + 3).toFixed(1)}`,
    `M ${(x1 - 3).toFixed(1)} ${y1.toFixed(1)} L ${(x1 + 3).toFixed(1)} ${y1.toFixed(1)} M ${x1.toFixed(1)} ${(y1 - 3).toFixed(1)} L ${x1.toFixed(1)} ${(y1 + 3).toFixed(1)}`
  ];

  svg.innerHTML = `
    <!-- 1. Main Contour Pure Quill Lines -->
    <g stroke="#ffffff" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity="0.94">
      <path d="${pathTopMain}" />
      <path d="${pathBottomMain}" />
      <path d="${pathLeftMain}" />
      <path d="${pathRightMain}" />
    </g>

    <!-- 2. Companion Sketchy Scratch Strokes (자연스러운 겹선 질감) -->
    <g stroke="#ffffff" fill="none" stroke-width="0.85" stroke-linecap="round" stroke-linejoin="round" opacity="0.58" stroke-dasharray="28 4 14 3 34 5">
      <path d="${pathTopSub}" />
      <path d="${pathBottomSub}" />
      <path d="${pathLeftSub}" />
      <path d="${pathRightSub}" />
    </g>

    <!-- 3. Corner Scratch Hatchings (45도 펜 해칭선) -->
    <g stroke="#ffffff" fill="none" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.76">
      ${hatchLines.map(d => `<path d="${d}" />`).join('')}
    </g>

    <!-- 4. Corner Anchor Crosses -->
    <g stroke="#ffffff" fill="none" stroke-width="0.75" stroke-linecap="round" opacity="0.50">
      ${cornerCrosses.map(d => `<path d="${d}" />`).join('')}
    </g>
  `;
}

function initFigureQuillFrames() {
  const imageWraps = Array.from(document.querySelectorAll('.image-wrap'));
  const dialogBox = document.querySelector('.dialog-media-box');
  const allTargets = [...imageWraps];
  if (dialogBox) allTargets.push(dialogBox);

  allTargets.forEach((wrap, idx) => {
    let svg = wrap.querySelector('.quill-pen-frame');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'quill-pen-frame');
      svg.setAttribute('aria-hidden', 'true');
      wrap.appendChild(svg);
    }

    const seed = (idx + 1) * 43.17;

    const updateFrame = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      renderQuillFrame(svg, rect.width, rect.height, seed);
    };

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        requestAnimationFrame(updateFrame);
      });
      ro.observe(wrap);
    }

    const img = wrap.querySelector('img');
    if (img) {
      if (img.complete) {
        updateFrame();
      } else {
        img.addEventListener('load', updateFrame, { once: true });
      }
    }

    updateFrame();
  });
}

// ============================================================================
// 9. QUILL 3D LINE-DRAWING MIGRATORY BIRD FLOCK (고로 후지타 스타일 라인 드로잉 철새 떼)
//    - 여러 마리의 철새가 무리를 지어 3D 공간을 비행
//    - 가만히 있으면 자꾸 상공 위로, 저 멀리 지평선 너머로 날아가려 함
//    - 스크롤을 시작하면 날개를 힘차게 퍼덕이며 독자의 스크롤을 따라 하강/접근
// ============================================================================

const BIRD_STROKE_TEMPLATES = [
  // 1. Body & Head & Beak Strokes
  { group: 'body', points: [[0, 0.038, 0.18], [0, 0.048, 0.14], [0, 0.062, 0.09], [0, 0.052, 0.04], [0, 0.032, -0.03], [0, 0.018, -0.09], [0, 0.006, -0.15]], opacity: 0.96 },
  { group: 'body', points: [[0, 0.038, 0.18], [0, 0.025, 0.13], [0, 0.005, 0.07], [0, -0.035, 0.02], [-0.008, -0.032, -0.05], [0, -0.012, -0.12]], opacity: 0.90 },
  { group: 'body', points: [[0.014, 0.045, 0.10], [0.022, 0.01, 0.04], [0.018, -0.02, -0.03], [0.008, -0.01, -0.09]], opacity: 0.70 },
  { group: 'body', points: [[-0.014, 0.045, 0.10], [-0.022, 0.01, 0.04], [-0.018, -0.02, -0.03], [-0.008, -0.01, -0.09]], opacity: 0.70 },
  { group: 'body', points: [[-0.012, 0.048, 0.11], [-0.015, 0.052, 0.10]], opacity: 0.95 },
  { group: 'body', points: [[0.012, 0.048, 0.11], [0.015, 0.052, 0.10]], opacity: 0.95 },

  // 2. Left Wing Strokes
  { group: 'leftWing', points: [[0, 0, 0], [-0.08, 0.028, -0.015], [-0.17, 0.036, -0.045], [-0.25, 0.01, -0.075], [-0.31, -0.02, -0.095]], opacity: 0.95 },
  { group: 'leftWing', points: [[0, 0, 0], [-0.09, 0.015, -0.035], [-0.19, 0.018, -0.08], [-0.27, -0.015, -0.12], [-0.32, -0.04, -0.135]], opacity: 0.90 },
  { group: 'leftWing', points: [[-0.02, 0, -0.02], [-0.08, -0.005, -0.06], [-0.16, -0.008, -0.11], [-0.24, -0.03, -0.15]], opacity: 0.85 },
  { group: 'leftWing', points: [[0, 0, -0.01], [-0.05, -0.012, -0.07], [-0.11, -0.018, -0.12], [-0.17, -0.03, -0.16]], opacity: 0.78 },

  // 3. Right Wing Strokes
  { group: 'rightWing', points: [[0, 0, 0], [0.08, 0.028, -0.015], [0.17, 0.036, -0.045], [0.25, 0.01, -0.075], [0.31, -0.02, -0.095]], opacity: 0.95 },
  { group: 'rightWing', points: [[0, 0, 0], [0.09, 0.015, -0.035], [0.19, 0.018, -0.08], [0.27, -0.015, -0.12], [0.32, -0.04, -0.135]], opacity: 0.90 },
  { group: 'rightWing', points: [[0.02, 0, -0.02], [0.08, -0.005, -0.06], [0.16, -0.008, -0.11], [0.24, -0.03, -0.15]], opacity: 0.85 },
  { group: 'rightWing', points: [[0, 0, -0.01], [0.05, -0.012, -0.07], [0.11, -0.018, -0.12], [0.17, -0.03, -0.16]], opacity: 0.78 },

  // 4. Tail Fan Strokes
  { group: 'tail', points: [[0, 0, 0], [0, 0.015, -0.08], [0, 0.022, -0.15]], opacity: 0.92 },
  { group: 'tail', points: [[0, 0, 0], [-0.025, 0.012, -0.07], [-0.045, 0.018, -0.13]], opacity: 0.85 },
  { group: 'tail', points: [[0, 0, 0], [0.025, 0.012, -0.07], [0.045, 0.018, -0.13]], opacity: 0.85 }
];

function initQuillBirdCompanion() {
  const canvas = document.getElementById('quill-bird-canvas');
  if (!canvas) return;

  const isMobile = window.innerWidth < 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isMobile,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio || 1, 1.15) : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10);

  const scene = new THREE.Scene();
  const allStrokes = [];

  // 개별 3D 새 인스턴스 생성 팩토리
  function createBirdMesh(scale) {
    const root = new THREE.Group();
    root.scale.set(scale, scale, scale);

    const groups = {
      body: new THREE.Group(),
      leftWing: new THREE.Group(),
      rightWing: new THREE.Group(),
      tail: new THREE.Group()
    };

    groups.leftWing.position.set(-0.02, 0.02, 0.015);
    groups.rightWing.position.set(0.02, 0.02, 0.015);
    groups.tail.position.set(0, 0.005, -0.12);

    root.add(groups.body);
    root.add(groups.leftWing);
    root.add(groups.rightWing);
    root.add(groups.tail);

    const birdStrokes = [];

    BIRD_STROKE_TEMPLATES.forEach(tpl => {
      const vectors = tpl.points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(vectors);
      const samplePoints = curve.getPoints(Math.max(tpl.points.length * 4, 18));
      const geometry = new THREE.BufferGeometry().setFromPoints(samplePoints);

      const basePositions = new Float32Array(geometry.attributes.position.array);

      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: tpl.opacity,
        blending: THREE.NormalBlending
      });

      const line = new THREE.Line(geometry, material);
      line.userData = {
        basePositions: basePositions,
        vertexCount: samplePoints.length
      };

      groups[tpl.group].add(line);
      birdStrokes.push(line);
      allStrokes.push(line);
    });

    scene.add(root);

    return {
      root,
      leftWing: groups.leftWing,
      rightWing: groups.rightWing,
      tail: groups.tail,
      strokes: birdStrokes
    };
  }

  // 1. 화면 좌우측에 크게 자리잡는 대형 철새 2마리 + 2. 상공과 원거리를 유영하는 작은 철새 무리
  const FLOCK = [
    // [1. 좌측 대형 철새]
    {
      id: 0,
      type: 'majestic',
      side: 'left',
      scale: isMobile ? 1.15 : 1.68,   // 크게 배치 (날개폭 3D 확대)
      zBase: 0.3,
      anchorXRatio: isMobile ? 0.12 : 0.16,  // 화면 좌측 약 16% 지점
      anchorYRatio: 0.44,
      wanderRangeX: isMobile ? 30 : 55,
      wanderRangeY: 45,
      springSpeed: 0.035,
      wanderSeed: 1.2,
      flapSpeed: 0.92,
      climbSpeed: 52,
      awayZDrift: 3.8,
      screenX: window.innerWidth * (isMobile ? 0.12 : 0.16),
      screenY: window.innerHeight * 0.44,
      currentZ: 0.3,
      awayFactor: 0.0,
      flapPhase: 0.0,
      baseYaw: 0.28   // 중앙 스토리를 바라보는 우아한 안쪽 각도
    },
    // [2. 우측 대형 철새]
    {
      id: 1,
      type: 'majestic',
      side: 'right',
      scale: isMobile ? 1.10 : 1.62,   // 크게 배치 (날개폭 3D 확대)
      zBase: 0.0,
      anchorXRatio: isMobile ? 0.88 : 0.84,  // 화면 우측 약 84% 지점
      anchorYRatio: 0.48,
      wanderRangeX: isMobile ? 30 : 55,
      wanderRangeY: 45,
      springSpeed: 0.032,
      wanderSeed: 4.8,
      flapSpeed: 1.02,
      climbSpeed: 56,
      awayZDrift: 4.2,
      screenX: window.innerWidth * (isMobile ? 0.88 : 0.84),
      screenY: window.innerHeight * 0.48,
      currentZ: 0.0,
      awayFactor: 0.0,
      flapPhase: 1.7,
      baseYaw: -0.28  // 중앙 스토리를 바라보는 우아한 안쪽 각도
    },
    // [3. 작은 철새 - 중거리 상공 좌측]
    {
      id: 2,
      type: 'flock',
      scale: 0.52,
      zBase: -2.0,
      baseAngle: 2.25,     // 좌상단
      baseRadius: 180,
      spreadDistance: 240,
      springSpeed: 0.030,
      wanderSeed: 2.6,
      flapSpeed: 1.15,
      climbSpeed: 75,
      awayZDrift: 5.5,
      screenX: window.innerWidth * 0.5 - 130,
      screenY: window.innerHeight * 0.48 - 110,
      currentZ: -2.0,
      awayFactor: 0.0,
      flapPhase: 0.6
    },
    // [4. 작은 철새 - 중거리 상공 우측]
    {
      id: 3,
      type: 'flock',
      scale: 0.46,
      zBase: -2.8,
      baseAngle: 1.05,     // 우상단
      baseRadius: 200,
      spreadDistance: 260,
      springSpeed: 0.026,
      wanderSeed: 3.9,
      flapSpeed: 1.10,
      climbSpeed: 82,
      awayZDrift: 6.2,
      screenX: window.innerWidth * 0.5 + 140,
      screenY: window.innerHeight * 0.48 - 120,
      currentZ: -2.8,
      awayFactor: 0.0,
      flapPhase: 2.1
    },
    // [5. 작은 철새 - 중원거리 하단]
    {
      id: 4,
      type: 'flock',
      scale: 0.40,
      zBase: -3.8,
      baseAngle: 3.85,     // 좌하단
      baseRadius: 220,
      spreadDistance: 270,
      springSpeed: 0.024,
      wanderSeed: 5.4,
      flapSpeed: 0.98,
      climbSpeed: 88,
      awayZDrift: 7.0,
      screenX: window.innerWidth * 0.5 - 150,
      screenY: window.innerHeight * 0.48 + 100,
      currentZ: -3.8,
      awayFactor: 0.0,
      flapPhase: 1.3
    },
    // [6. 작은 철새 - 원거리 높은 하늘]
    {
      id: 5,
      type: 'flock',
      scale: 0.32,
      zBase: -5.8,
      baseAngle: 1.62,     // 상공 하늘
      baseRadius: 290,
      spreadDistance: 320,
      springSpeed: 0.018,
      wanderSeed: 7.2,
      flapSpeed: 1.08,
      climbSpeed: 110,
      awayZDrift: 9.0,
      screenX: window.innerWidth * 0.5 - 20,
      screenY: window.innerHeight * 0.48 - 200,
      currentZ: -5.8,
      awayFactor: 0.0,
      flapPhase: 3.7
    },
    // [7. 작은 철새 - 수평선 너머 글라이더]
    {
      id: 6,
      type: 'flock',
      scale: 0.24,
      zBase: -7.8,
      baseAngle: 0.18,     // 먼 수평선
      baseRadius: 360,
      spreadDistance: 360,
      springSpeed: 0.014,
      wanderSeed: 8.8,
      flapSpeed: 1.25,
      climbSpeed: 125,
      awayZDrift: 11.2,
      screenX: window.innerWidth * 0.5 + 240,
      screenY: window.innerHeight * 0.48 - 70,
      currentZ: -7.8,
      awayFactor: 0.0,
      flapPhase: 4.5
    }
  ];

  // 메쉬 연결
  FLOCK.forEach(bird => {
    bird.mesh = createBirdMesh(bird.scale);
  });

  // ============================================================================
  // SECTION 03: 3D CURLED & TWISTED PURE QUILL PEN LEAVES & TWIGS
  // (한면이 아닌 오목하게 말리고, 비틀리고, 굽어지는 다채로운 입체 펜 드로잉 잎 & 잔가지)
  // ============================================================================

  // 1. TYPE A: DEEPLY CUPPED & CURVED LEAF (오목하게 배처럼 둥글게 말려 안쪽 공간이 깊은 입체 잎)
  const LEAF_CUPPED_TEMPLATE = [
    // Outer Left Rim (들린 좌측 림: z=+0.16까지 솟아오름)
    { points: [[0, -0.28, -0.05], [-0.14, -0.21, 0.08], [-0.24, -0.06, 0.16], [-0.22, 0.12, 0.14], [-0.11, 0.23, 0.09], [0, 0.32, 0.06]], opacity: 0.96 },
    // Outer Right Rim (들린 우측 림: z=+0.16까지 솟아오름)
    { points: [[0, -0.28, -0.05], [0.14, -0.21, 0.08], [0.24, -0.06, 0.16], [0.22, 0.12, 0.14], [0.11, 0.23, 0.09], [0, 0.32, 0.06]], opacity: 0.96 },
    // Deep Sunken Spine & Stem (안쪽으로 푹 꺼진 주맥: z=-0.10까지 가라앉음)
    { points: [[0, -0.45, -0.08], [-0.005, -0.34, -0.06], [0, -0.22, -0.08], [0, -0.05, -0.10], [0, 0.14, -0.04], [0, 0.32, 0.06]], opacity: 0.94 },
    // Curved Ribs climbing from deep spine to high rim
    { points: [[0, -0.16, -0.09], [-0.08, -0.12, -0.01], [-0.18, -0.08, 0.11]], opacity: 0.82 },
    { points: [[0, -0.16, -0.09], [0.08, -0.12, -0.01], [0.18, -0.08, 0.11]], opacity: 0.82 },
    { points: [[0, -0.02, -0.10], [-0.10, 0.03, 0.02], [-0.19, 0.07, 0.15]], opacity: 0.85 },
    { points: [[0, -0.02, -0.10], [0.10, 0.03, 0.02], [0.19, 0.07, 0.15]], opacity: 0.85 },
    { points: [[0, 0.12, -0.05], [-0.08, 0.17, 0.02], [-0.13, 0.21, 0.10]], opacity: 0.78 },
    { points: [[0, 0.12, -0.05], [0.08, 0.17, 0.02], [0.13, 0.21, 0.10]], opacity: 0.78 },
    // 3D Cross-Contour Hatching (곡면을 따라 가로지르는 펜 해칭)
    { points: [[-0.04, -0.08, -0.06], [-0.10, -0.04, 0.04]], opacity: 0.65 },
    { points: [[0.04, -0.08, -0.06], [0.10, -0.04, 0.04]], opacity: 0.65 },
    { points: [[-0.05, 0.06, -0.02], [-0.11, 0.10, 0.08]], opacity: 0.65 },
    { points: [[0.05, 0.06, -0.02], [0.11, 0.10, 0.08]], opacity: 0.65 }
  ];

  // 2. TYPE B: HELICAL TWISTED DRY LEAF (끝부분과 양 날개가 서로 반대로 비틀려 회전하는 나선형 마른 잎)
  const LEAF_TWISTED_TEMPLATE = [
    // Outer Left: 앞쪽(+Z)으로 솟구쳤다가 끝에서 뒤(-Z)로 꺾임
    { points: [[-0.01, -0.27, 0.06], [-0.15, -0.18, 0.18], [-0.23, -0.03, 0.14], [-0.17, 0.14, -0.04], [-0.08, 0.24, -0.16], [0.02, 0.31, -0.22]], opacity: 0.96 },
    // Outer Right: 뒤쪽(-Z)으로 꺼졌다가 끝에서 비틀려 말림
    { points: [[-0.01, -0.27, 0.06], [0.13, -0.18, -0.08], [0.21, -0.02, -0.15], [0.20, 0.13, -0.12], [0.10, 0.23, -0.16], [0.02, 0.31, -0.22]], opacity: 0.96 },
    // Twisting Spine: S자로 비틀리며 회전하는 주맥
    { points: [[0, -0.45, 0.08], [-0.01, -0.34, 0.07], [-0.01, -0.24, 0.05], [0.01, -0.04, 0.00], [0.02, 0.15, -0.10], [0.02, 0.31, -0.22]], opacity: 0.94 },
    // Twisted Veins (비틀린 면을 따라 휘어지는 측맥)
    { points: [[0, -0.15, 0.04], [-0.09, -0.10, 0.12], [-0.17, -0.06, 0.16]], opacity: 0.82 },
    { points: [[0, -0.15, 0.04], [0.08, -0.11, -0.03], [0.17, -0.07, -0.11]], opacity: 0.82 },
    { points: [[0.01, 0.00, -0.01], [-0.09, 0.06, 0.08], [-0.18, 0.09, 0.06]], opacity: 0.85 },
    { points: [[0.01, 0.00, -0.01], [0.09, 0.04, -0.08], [0.18, 0.07, -0.14]], opacity: 0.85 },
    { points: [[0.02, 0.13, -0.08], [-0.07, 0.18, -0.09], [-0.12, 0.21, -0.14]], opacity: 0.78 },
    { points: [[0.02, 0.13, -0.08], [0.07, 0.17, -0.12], [0.12, 0.21, -0.15]], opacity: 0.78 },
    // Sketched Shading
    { points: [[-0.04, -0.08, 0.07], [-0.09, -0.03, 0.11]], opacity: 0.65 },
    { points: [[0.04, -0.08, -0.04], [0.09, -0.03, -0.09]], opacity: 0.65 },
    { points: [[-0.03, 0.07, 0.02], [-0.08, 0.12, -0.02]], opacity: 0.65 },
    { points: [[0.04, 0.06, -0.06], [0.09, 0.10, -0.11]], opacity: 0.65 }
  ];

  // 3. TYPE C: ARCHED & DROOPED TIP LEAF (중간 배가 볼록하게 앞으로 솟고 끝이 아래로 꺾여 굽은 잎)
  const LEAF_ARCHED_TEMPLATE = [
    // Outer Left
    { points: [[0, -0.27, -0.12], [-0.13, -0.17, 0.04], [-0.23, -0.02, 0.18], [-0.20, 0.14, 0.16], [-0.09, 0.24, 0.02], [0, 0.32, -0.12]], opacity: 0.96 },
    // Outer Right
    { points: [[0, -0.27, -0.12], [0.13, -0.17, 0.04], [0.23, -0.02, 0.18], [0.20, 0.14, 0.16], [0.09, 0.24, 0.02], [0, 0.32, -0.12]], opacity: 0.96 },
    // Arched Spine (앞으로 불룩하게 솟아오른 활 형태 주맥)
    { points: [[0, -0.44, -0.18], [0, -0.34, -0.14], [0, -0.22, -0.08], [0.005, 0.00, 0.20], [0, 0.16, 0.16], [0, 0.32, -0.12]], opacity: 0.94 },
    // Arching Veins
    { points: [[0, -0.14, -0.02], [-0.08, -0.10, 0.06], [-0.17, -0.06, 0.12]], opacity: 0.82 },
    { points: [[0, -0.14, -0.02], [0.08, -0.10, 0.06], [0.17, -0.06, 0.12]], opacity: 0.82 },
    { points: [[0.005, 0.02, 0.19], [-0.09, 0.06, 0.18], [-0.18, 0.08, 0.17]], opacity: 0.85 },
    { points: [[0.005, 0.02, 0.19], [0.09, 0.06, 0.18], [0.18, 0.08, 0.17]], opacity: 0.85 },
    { points: [[0, 0.16, 0.14], [-0.07, 0.19, 0.09], [-0.12, 0.22, 0.04]], opacity: 0.78 },
    { points: [[0, 0.16, 0.14], [0.07, 0.19, 0.09], [0.12, 0.22, 0.04]], opacity: 0.78 },
    // 3D Hatching
    { points: [[-0.04, -0.07, 0.06], [-0.10, -0.02, 0.12]], opacity: 0.65 },
    { points: [[0.04, -0.07, 0.06], [0.10, -0.02, 0.12]], opacity: 0.65 },
    { points: [[-0.04, 0.08, 0.14], [-0.09, 0.13, 0.10]], opacity: 0.65 },
    { points: [[0.04, 0.08, 0.14], [0.09, 0.13, 0.10]], opacity: 0.65 }
  ];

  // 4. TYPE D: RUFFLED & WAVING LEAF (바람에 펄럭이며 가장자리가 앞뒤로 물결치는 잎)
  const LEAF_RUFFLED_TEMPLATE = [
    // Outer Left: 파도치듯 +0.14 -> -0.10 -> +0.12로 넘실거림
    { points: [[0, -0.27, -0.02], [-0.13, -0.20, 0.14], [-0.25, -0.05, -0.10], [-0.21, 0.12, 0.13], [-0.10, 0.23, -0.03], [0, 0.31, 0.02]], opacity: 0.96 },
    // Outer Right: 반대로 파도치며 넘실거림 (-0.11 -> +0.14 -> -0.08)
    { points: [[0, -0.27, -0.02], [0.14, -0.20, -0.11], [0.24, -0.05, 0.14], [0.20, 0.12, -0.08], [0.10, 0.23, 0.08], [0, 0.31, 0.02]], opacity: 0.96 },
    // Gentle S-wave Spine
    { points: [[0, -0.45, -0.04], [0, -0.34, -0.02], [0, -0.22, 0.01], [0.005, -0.02, 0.04], [-0.005, 0.14, -0.01], [0, 0.31, 0.02]], opacity: 0.94 },
    // Wavy Veins connecting ripples
    { points: [[0, -0.15, 0.01], [-0.08, -0.11, 0.09], [-0.17, -0.07, 0.06]], opacity: 0.82 },
    { points: [[0, -0.15, 0.01], [0.08, -0.11, -0.07], [0.17, -0.07, -0.03]], opacity: 0.82 },
    { points: [[0.005, 0.00, 0.03], [-0.09, 0.04, -0.06], [-0.18, 0.07, -0.08]], opacity: 0.85 },
    { points: [[0.005, 0.00, 0.03], [0.09, 0.04, 0.09], [0.18, 0.07, 0.12]], opacity: 0.85 },
    { points: [[-0.005, 0.13, 0.0], [-0.07, 0.18, 0.07], [-0.13, 0.21, 0.09]], opacity: 0.78 },
    { points: [[-0.005, 0.13, 0.0], [0.07, 0.18, -0.04], [0.13, 0.21, -0.05]], opacity: 0.78 },
    // Shading
    { points: [[-0.04, -0.08, 0.04], [-0.09, -0.03, 0.02]], opacity: 0.65 },
    { points: [[0.04, -0.08, -0.03], [0.09, -0.03, -0.01]], opacity: 0.65 },
    { points: [[-0.04, 0.06, -0.02], [-0.09, 0.11, 0.04]], opacity: 0.65 },
    { points: [[0.04, 0.06, 0.05], [0.09, 0.11, 0.01]], opacity: 0.65 }
  ];

  const LEAF_TEMPLATES = [
    LEAF_CUPPED_TEMPLATE,
    LEAF_TWISTED_TEMPLATE,
    LEAF_ARCHED_TEMPLATE,
    LEAF_RUFFLED_TEMPLATE
  ];

  // ---------------------------------------------------------------------------
  // 3D REACHING & GNARLED TWIGS (앞뒤 Z축 깊이감으로 뻗어나가는 3D 잔가지 2종)
  // ---------------------------------------------------------------------------
  const TWIG_FORKED_TEMPLATE = [
    // Main Stem: z=-0.14에서 시작하여 z=+0.12로 앞으로 나오는 입체 줄기
    { points: [[0, -0.52, -0.14], [0.02, -0.24, -0.03], [-0.01, 0.06, 0.08], [0.03, 0.30, 0.12], [0.06, 0.52, 0.07]], opacity: 0.96 },
    // Parallel Pen Line
    { points: [[0.015, -0.48, -0.12], [0.032, -0.20, -0.02], [0.005, 0.08, 0.09], [0.042, 0.28, 0.13]], opacity: 0.78 },
    // Branch 1: 앞쪽으로 쑥 나오는 가지 (z=+0.22)
    { points: [[0.02, -0.22, -0.03], [0.13, -0.11, 0.08], [0.24, -0.02, 0.18], [0.33, 0.05, 0.22]], opacity: 0.92 },
    { points: [[0.15, -0.08, 0.10], [0.20, 0.02, 0.18], [0.26, 0.11, 0.24]], opacity: 0.82 },
    // Branch 2: 뒤쪽 깊이로 뻗는 가지 (z=-0.18)
    { points: [[-0.01, 0.06, 0.08], [-0.12, 0.16, -0.02], [-0.22, 0.27, -0.11], [-0.31, 0.36, -0.18]], opacity: 0.92 },
    { points: [[-0.14, 0.19, -0.05], [-0.17, 0.29, -0.13], [-0.21, 0.37, -0.18]], opacity: 0.82 },
    // Buds & Spurs
    { points: [[0.05, 0.46, 0.08], [0.075, 0.50, 0.10]], opacity: 0.88 },
    { points: [[-0.015, 0.04, 0.07], [-0.042, 0.07, 0.05]], opacity: 0.88 }
  ];

  const TWIG_GNARLED_TEMPLATE = [
    // Main Curved Stem (휘어지는 활 모양 잔가지)
    { points: [[-0.05, -0.50, 0.10], [0.05, -0.26, 0.16], [0.08, 0.00, 0.04], [0.02, 0.26, -0.10], [-0.08, 0.48, -0.16]], opacity: 0.96 },
    { points: [[-0.035, -0.46, 0.11], [0.065, -0.22, 0.17], [0.095, 0.02, 0.05], [0.035, 0.24, -0.09]], opacity: 0.78 },
    // Branch 1
    { points: [[0.05, -0.26, 0.16], [-0.10, -0.15, 0.12], [-0.22, -0.06, 0.04], [-0.30, 0.02, -0.05]], opacity: 0.92 },
    { points: [[-0.12, -0.11, 0.10], [-0.18, -0.02, 0.06], [-0.23, 0.06, 0.01]], opacity: 0.82 },
    // Branch 2
    { points: [[0.08, 0.00, 0.04], [0.20, 0.12, -0.02], [0.28, 0.24, -0.08], [0.34, 0.34, -0.14]], opacity: 0.92 },
    { points: [[0.22, 0.15, -0.03], [0.26, 0.24, -0.07], [0.28, 0.32, -0.12]], opacity: 0.82 },
    // Nodes
    { points: [[-0.07, 0.43, -0.14], [-0.10, 0.46, -0.17]], opacity: 0.88 },
    { points: [[0.06, -0.12, 0.12], [0.09, -0.08, 0.14]], opacity: 0.88 }
  ];

  const TWIG_TEMPLATES = [
    TWIG_FORKED_TEMPLATE,
    TWIG_GNARLED_TEMPLATE
  ];

  // 펜 드로잉 라인 생성 함수 (새와 완전히 동일한 라인버퍼 및 allStrokes 등록)
  function createPenStroke(points, baseOpacity) {
    const vectors = points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    const curve = new THREE.CatmullRomCurve3(vectors);
    const samplePoints = curve.getPoints(Math.max(points.length * 4, 14));
    const geometry = new THREE.BufferGeometry().setFromPoints(samplePoints);
    const basePositions = new Float32Array(geometry.attributes.position.array);

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.NormalBlending
    });

    const line = new THREE.Line(geometry, material);
    line.userData = {
      basePositions: basePositions,
      vertexCount: samplePoints.length,
      baseOpacity: baseOpacity
    };

    allStrokes.push(line);
    return line;
  }

  const leavesGroup = new THREE.Group();
  scene.add(leavesGroup);

  function createPenLeafMesh(template, scale, flipX) {
    const root = new THREE.Group();
    root.scale.set(flipX ? -scale : scale, scale, scale);
    const strokes = [];

    template.forEach(tpl => {
      const line = createPenStroke(tpl.points, tpl.opacity);
      root.add(line);
      strokes.push(line);
    });

    leavesGroup.add(root);
    root.visible = false;
    return { root, strokes };
  }

  function createPenTwigMesh(template, scale, flipX) {
    const root = new THREE.Group();
    root.scale.set(flipX ? -scale : scale, scale, scale);
    const strokes = [];

    template.forEach(tpl => {
      const line = createPenStroke(tpl.points, tpl.opacity);
      root.add(line);
      strokes.push(line);
    });

    leavesGroup.add(root);
    root.visible = false;
    return { root, strokes };
  }

  const fallingItems = [];

  // 16개의 입체 펜 드로잉 미루나무 잎 (8개는 공중 낙하 전용, 8개는 바닥에 쌓여 바람에 흩날림)
  for (let i = 0; i < 16; i++) {
    const template = LEAF_TEMPLATES[i % LEAF_TEMPLATES.length];
    const flipX = Math.random() > 0.5;
    const baseScale = 0.38 + Math.random() * 0.36;
    const mesh = createPenLeafMesh(template, baseScale, flipX);
    const isGroundAccumulator = (i % 2 === 0);

    fallingItems.push({
      type: 'leaf',
      mesh: mesh,
      isGroundAccumulator: isGroundAccumulator,
      state: 'falling', // 'falling' | 'grounded'
      groundYOffset: 0.14 + ((i * 0.05) % 0.35), // 바닥에서의 미세한 높이 레이어
      groundAngle: (i * 1.35) % (Math.PI * 2),
      windDir: (i % 4 === 0) ? -0.85 : 1.0, // 주로 우측으로, 일부는 좌측으로 바람을 탐
      groundDriftSpeed: 0.007 + ((i * 0.002) % 0.008),
      flutterFreq: 1.8 + ((i * 0.35) % 1.6),
      flutterPhase: (i * 0.85) % (Math.PI * 2),
      seed: i * 23.41,
      currentOpacity: 0,
      x: (Math.random() - 0.5) * 12,
      y: 4.5 + Math.random() * 8.0,
      z: -2.5 + Math.random() * 4.5,
      fallSpeed: 0.016 + Math.random() * 0.018,
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      rotSpeedX: 0.015 + Math.random() * 0.022,
      rotSpeedY: 0.012 + Math.random() * 0.020,
      swayFreq: 0.8 + Math.random() * 1.2,
      swayAmp: 0.012 + Math.random() * 0.016,
      swayPhase: Math.random() * Math.PI * 2
    });
  }

  // 4개의 입체 펜 드로잉 미루나무 잔가지 (2개는 공중 낙하, 2개는 바닥에 남아 구름)
  for (let i = 0; i < 4; i++) {
    const template = TWIG_TEMPLATES[i % TWIG_TEMPLATES.length];
    const flipX = Math.random() > 0.5;
    const baseScale = 0.42 + Math.random() * 0.32;
    const mesh = createPenTwigMesh(template, baseScale, flipX);
    const isGroundAccumulator = (i % 2 === 0);

    fallingItems.push({
      type: 'twig',
      mesh: mesh,
      isGroundAccumulator: isGroundAccumulator,
      state: 'falling',
      groundYOffset: 0.10 + ((i * 0.06) % 0.22),
      groundAngle: (i * 1.62) % (Math.PI * 2),
      windDir: 1.0,
      groundDriftSpeed: 0.005 + ((i * 0.002) % 0.005),
      flutterFreq: 1.3 + ((i * 0.3) % 1.2),
      flutterPhase: (i * 1.1) % (Math.PI * 2),
      seed: (i + 16) * 23.41,
      currentOpacity: 0,
      x: (Math.random() - 0.5) * 11,
      y: 5.0 + Math.random() * 7.5,
      z: -2.0 + Math.random() * 3.5,
      fallSpeed: 0.026 + Math.random() * 0.022,
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      rotSpeedX: 0.010 + Math.random() * 0.015,
      rotSpeedY: 0.008 + Math.random() * 0.012,
      rotSpeedZ: 0.020 + Math.random() * 0.035,
      swayFreq: 0.6 + Math.random() * 0.8,
      swayAmp: 0.006 + Math.random() * 0.010,
      swayPhase: Math.random() * Math.PI * 2
    });
  }

  // --- 10 FPS Quill Line Boil Jitter Engine ---
  let lastBoilStep = -1;

  function updateLineBoil(timeSec) {
    if (isMobile) return; // 모바일 GPU/CPU 자원 절약을 위해 모바일에서는 정적 벡터 라인 유지

    const boilStep = Math.floor(timeSec * 10);
    if (boilStep === lastBoilStep) return;
    lastBoilStep = boilStep;

    for (let s = 0; s < allStrokes.length; s++) {
      const stroke = allStrokes[s];
      const pos = stroke.geometry.attributes.position;
      const base = stroke.userData.basePositions;
      const count = stroke.userData.vertexCount;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const seed = (s * 47 + i) * 19.31 + boilStep * 71.53;
        const jx = Math.sin(seed) * 0.0042;
        const jy = Math.cos(seed * 1.37) * 0.0042;
        const jz = Math.sin(seed * 2.19) * 0.0042;

        pos.array[idx] = base[idx] + jx;
        pos.array[idx + 1] = base[idx + 1] + jy;
        pos.array[idx + 2] = base[idx + 2] + jz;
      }
      pos.needsUpdate = true;
    }
  }

  // --- Flocking Scroll Dynamics Engine ---
  let lastTrackScrollY = window.scrollY;
  let scrollVel = 0;

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    const mob = window.innerWidth < 768;
    if (FLOCK && FLOCK.length >= 2) {
      FLOCK[0].anchorXRatio = mob ? 0.12 : 0.16;
      FLOCK[1].anchorXRatio = mob ? 0.88 : 0.84;
      const s0 = mob ? 1.15 : 1.68;
      const s1 = mob ? 1.10 : 1.62;
      FLOCK[0].mesh.root.scale.set(s0, s0, s0);
      FLOCK[1].mesh.root.scale.set(s1, s1, s1);
    }
  }
  window.addEventListener('resize', onWindowResize, { passive: true });

  const startTime = performance.now();

  function animateFlock(now) {
    const timeMs = now - startTime;
    const timeSec = timeMs * 0.001;

    // 1. Line Boil Update
    updateLineBoil(timeSec);

    // 2. Scroll Velocity & Momentum Calculation
    const curScrollY = window.scrollY;
    const deltaY = curScrollY - lastTrackScrollY;
    lastTrackScrollY = curScrollY;

    scrollVel = THREE.MathUtils.lerp(scrollVel, deltaY, 0.12);
    const isScrolling = Math.abs(scrollVel) > 0.4;

    const scrollImpulseY = THREE.MathUtils.clamp(scrollVel * 1.35, -85, 85);
    const activeScrollBoost = Math.min(Math.abs(scrollVel) * 0.14, 8.5);

    const centerX = window.innerWidth * 0.5;
    const centerY = window.innerHeight * 0.48;

    // 3. Update each bird in the flock (화면 좌우측 대형 새 2마리 + 배경 작은 새 무리)
    FLOCK.forEach(bird => {
      // "새들은 자꾸 위로 올라가나 저 멀리 날아가려고 하는데, 스크롤하면 점차 따라오도록 해줘"
      if (isScrolling) {
        // 스크롤 시: 너무 급하지 않고 우아하고 느리게 모여듦 (0.018)
        bird.awayFactor = THREE.MathUtils.lerp(bird.awayFactor, 0.0, 0.018);
      } else {
        // 정지 시: 화면 좌우 바깥과 상공으로 우아하게 비상 (0.009)
        bird.awayFactor = THREE.MathUtils.lerp(bird.awayFactor, 1.0, 0.009);
      }

      let targetScreenX = 0;
      let targetScreenY = 0;
      let targetZ = 0;
      let targetYaw = 0;

      if (bird.type === 'majestic') {
        // [대형 새 2마리]: 화면 좌측 및 우측 앵커 고정 + 주변 완만한 유영
        const baseAnchorX = window.innerWidth * bird.anchorXRatio;
        const baseAnchorY = window.innerHeight * bird.anchorYRatio;
        const outwardDriftX = (bird.side === 'left' ? -1 : 1) * (bird.awayFactor * 65);
        const wanderX = Math.sin(timeSec * 0.65 + bird.wanderSeed) * bird.wanderRangeX;
        const wanderY = Math.cos(timeSec * 0.85 + bird.wanderSeed) * bird.wanderRangeY;
        const climbUpY = bird.awayFactor * bird.climbSpeed * 2.0;

        targetScreenX = baseAnchorX + outwardDriftX + wanderX;
        targetScreenY = baseAnchorY + wanderY + scrollImpulseY - climbUpY;
        targetZ = bird.zBase - (bird.awayFactor * bird.awayZDrift);

        // 중앙 스토리를 향한 시선
        targetYaw = bird.baseYaw + THREE.MathUtils.clamp(scrollVel * 0.006, -0.15, 0.15) + Math.sin(timeSec * 0.7 + bird.wanderSeed) * 0.08;
      } else {
        // [작은 새 무리]: 공간 중심에서 사방으로 퍼지며 깊이감(Depth) 형성
        const currentRadius = bird.baseRadius + (bird.awayFactor * bird.spreadDistance);
        const wanderAngle = Math.sin(timeSec * 0.75 + bird.wanderSeed) * 0.22;
        const effectiveAngle = bird.baseAngle + wanderAngle;

        const spreadX = Math.cos(effectiveAngle) * currentRadius * 1.25;
        const spreadY = -Math.sin(effectiveAngle) * currentRadius * 0.72;
        const climbUpY = bird.awayFactor * bird.climbSpeed * 2.2;
        const wanderJitter = Math.cos(timeSec * 1.2 + bird.wanderSeed) * 10;

        targetScreenX = centerX + spreadX;
        targetScreenY = centerY + spreadY + scrollImpulseY - climbUpY + wanderJitter;
        targetZ = bird.zBase - (bird.awayFactor * bird.awayZDrift);

        const outwardYaw = Math.cos(effectiveAngle) * 0.45;
        const baseYaw = THREE.MathUtils.lerp(outwardYaw, -0.15, bird.awayFactor < 0.3 ? 0.7 : 0.0);
        targetYaw = baseYaw + THREE.MathUtils.clamp(scrollVel * 0.007, -0.15, 0.15);
      }

      // Spring 부드러운 위치 추적
      bird.screenX += (targetScreenX - bird.screenX) * bird.springSpeed;
      bird.screenY += (targetScreenY - bird.screenY) * bird.springSpeed;
      bird.currentZ += (targetZ - bird.currentZ) * (bird.springSpeed * 0.8);

      // 2D 스크린 좌표 -> 3D 월드 좌표 정밀 투영 (Z 거리에 따른 원근 투영)
      const distFromCamera = Math.max(camera.position.z - bird.currentZ, 2.0);
      const vHeightAtZ = 2 * distFromCamera * Math.tan((camera.fov * Math.PI / 180) / 2);
      const vWidthAtZ = vHeightAtZ * camera.aspect;

      const worldX = ((bird.screenX / window.innerWidth) - 0.5) * vWidthAtZ;
      const worldY = -((bird.screenY / window.innerHeight) - 0.5) * vHeightAtZ;

      bird.mesh.root.position.set(worldX, worldY, bird.currentZ);

      // 4. 비행 자세 (Pitch, Roll, Yaw)
      const climbPitch = bird.awayFactor * 0.18;
      const divePitch = THREE.MathUtils.clamp(-scrollVel * 0.015, -0.38, 0.38);
      const targetPitch = divePitch + climbPitch;
      const rollSide = bird.type === 'majestic' ? (bird.side === 'left' ? 0.08 : -0.08) : 0;
      const targetRoll = rollSide + THREE.MathUtils.clamp(-scrollVel * 0.011, -0.35, 0.35) + Math.sin(timeSec * 1.2 + bird.wanderSeed) * 0.08;

      bird.mesh.root.rotation.x = THREE.MathUtils.lerp(bird.mesh.root.rotation.x, targetPitch, 0.09);
      bird.mesh.root.rotation.y = THREE.MathUtils.lerp(bird.mesh.root.rotation.y, targetYaw, 0.09);
      bird.mesh.root.rotation.z = THREE.MathUtils.lerp(bird.mesh.root.rotation.z, targetRoll, 0.09);

      // 5. 날갯짓 (Flapping & Gliding)
      const idleFlapRate = THREE.MathUtils.lerp(1.7, 0.70, bird.awayFactor);
      const flapFrequency = (idleFlapRate + activeScrollBoost) * bird.flapSpeed;
      bird.flapPhase += flapFrequency * 0.046;

      const flapAmplitude = THREE.MathUtils.lerp(0.52, 0.18, bird.awayFactor * (activeScrollBoost < 1 ? 1 : 0));
      const flapAngle = Math.sin(bird.flapPhase) * flapAmplitude;

      bird.mesh.leftWing.rotation.z = flapAngle;
      bird.mesh.rightWing.rotation.z = -flapAngle;

      const tipLag = Math.cos(bird.flapPhase) * 0.13;
      bird.mesh.leftWing.rotation.x = tipLag;
      bird.mesh.rightWing.rotation.x = tipLag;

      bird.mesh.tail.rotation.y = Math.sin(timeSec * 1.6 + bird.wanderSeed) * 0.12;
      bird.mesh.tail.rotation.x = Math.sin(bird.flapPhase * 0.5) * 0.08;
    });

    // 6. Update Falling Poplar Leaves & Twigs (03 노거수 미루나무 영역 활성화 시 나뭇잎 & 나뭇가지 낙하)
    const wasSec03Active = leavesGroup.userData.wasActive || false;
    leavesGroup.userData.wasActive = isSec03InView;

    // 3번 영역에 최초 진입 시: 화면 상단 위쪽으로 나뭇잎과 나뭇가지들을 고르게 흩뿌려 즉시 쏟아지도록 초기화
    if (isSec03InView && !wasSec03Active) {
      fallingItems.forEach((item, idx) => {
        if (item.state !== 'grounded') {
          const dist = Math.max(camera.position.z - item.z, 2.0);
          const vH = 2 * dist * Math.tan((camera.fov * Math.PI / 180) / 2);
          const vW = vH * camera.aspect;
          item.y = (vH * 0.45) + 0.3 + (idx % 8) * 0.45 + Math.random() * 1.2;
          item.x = (Math.random() - 0.5) * vW * 1.05;
        }
      });
    }

    fallingItems.forEach(item => {
      const dist = Math.max(camera.position.z - item.z, 2.0);
      const vH = 2 * dist * Math.tan((camera.fov * Math.PI / 180) / 2);
      const vW = vH * camera.aspect;
      const topBound = (vH * 0.5) + 0.8;
      const bottomBound = -(vH * 0.5) - 0.8;
      const halfW = vW * 0.5;

      // 바닥 지면 기준선 (화면 최하단 바로 위)
      const floorY = -(vH * 0.5) + item.groundYOffset;

      // 3번 영역 도달 후, 바닥 축적 대상(일부 잎/가지)은 스크롤을 내려도 바닥에 남아 움직임 유지
      let targetOpacity = 0.0;
      if (item.isGroundAccumulator) {
        targetOpacity = isPastOrInSec03 ? 0.92 : 0.0;
      } else {
        targetOpacity = isSec03InView ? 0.90 : 0.0;
      }

      item.currentOpacity = THREE.MathUtils.lerp(item.currentOpacity, targetOpacity, 0.045);

      if (item.currentOpacity > 0.008) {
        item.mesh.root.visible = true;
        for (let s = 0; s < item.mesh.strokes.length; s++) {
          const stroke = item.mesh.strokes[s];
          stroke.material.opacity = item.currentOpacity * stroke.userData.baseOpacity;
        }

        // ====================================================================
        // STATE 1: FALLING (공중 낙하)
        // ====================================================================
        if (item.state === 'falling') {
          const scrollDragY = scrollVel > 0 ? (scrollVel * 0.0035) : 0;
          item.y -= (item.fallSpeed + scrollDragY);

          const windSway = Math.sin(timeSec * item.swayFreq + item.swayPhase);
          item.x += windSway * item.swayAmp;

          if (item.type === 'leaf') {
            item.rotX += item.rotSpeedX;
            item.rotY += item.rotSpeedY;
            item.rotZ = windSway * 0.55;
          } else {
            item.rotX += item.rotSpeedX;
            item.rotY += item.rotSpeedY;
            item.rotZ += item.rotSpeedZ;
          }

          // 바닥 지면에 닿았을 때의 처리
          if (item.isGroundAccumulator && item.y <= floorY) {
            item.state = 'grounded';
            item.y = floorY;
            if (item.type === 'leaf') {
              item.rotX = Math.PI * 0.48; // 바닥에 편평하게 눕는 각도
              item.rotY = item.groundAngle;
              item.rotZ = (Math.random() - 0.5) * 0.5;
            } else {
              item.rotX = Math.PI * 0.5;
              item.rotY = item.groundAngle;
              item.rotZ = (Math.random() - 0.5) * 0.6;
            }
          } else if (!item.isGroundAccumulator && item.y < bottomBound) {
            if (isSec03InView) {
              item.y = topBound + Math.random() * 2.2;
              item.x = (Math.random() - 0.5) * vW * 1.05;
            }
          }
        }
        // ====================================================================
        // STATE 2: GROUNDED (바닥에 쌓여 바람에 흩날리듯 움직임)
        // ====================================================================
        else if (item.state === 'grounded') {
          // 사용자가 3번 영역 이전(최상단)으로 다시 스크롤해 올라가면 초기화
          if (!isPastOrInSec03) {
            item.state = 'falling';
          }

          // 지면을 따라 부는 강바람 + 스크롤 시 발생하는 지면 기류
          const scrollWind = Math.abs(scrollVel) * 0.0016;
          const gustCycle = Math.sin(timeSec * 0.95 + item.seed);
          const gust = Math.max(0, gustCycle);
          const currentSpeed = (item.groundDriftSpeed + scrollWind) * (0.8 + gust * 1.8);

          // 바닥 수평 미끄러짐 (Drift / Skitter)
          item.x += currentSpeed * item.windDir;

          // 돌풍에 의한 바닥 들썩임 & 살짝 떠오름 (Flutter lift)
          const hop = Math.max(0, Math.sin(timeSec * item.flutterFreq + item.flutterPhase) - 0.6) * 0.30;
          const scrollLift = Math.min(Math.abs(scrollVel) * 0.006, 0.35);
          item.y = floorY + hop + scrollLift;

          // 바닥에서의 리얼한 펄럭임 및 뒹굴기
          if (item.type === 'leaf') {
            const rustle = Math.sin(timeSec * (item.flutterFreq * 1.6) + item.seed) * 0.22;
            item.rotX = (Math.PI * 0.48) + rustle;
            item.rotZ += currentSpeed * 0.85; // 바람에 회전하며 밀림
            item.rotY += rustle * 0.05;
          } else {
            // 잔가지는 바닥에서 굴러감
            item.rotZ += currentSpeed * 1.4;
            item.rotY += Math.sin(timeSec * 0.7 + item.seed) * 0.04;
          }

          // 화면 밖으로 벗어나면 반대편에서 자연스럽게 순환 (무한 지속성)
          if (item.windDir > 0 && item.x > halfW + 0.8) {
            item.x = -halfW - 0.8;
          } else if (item.windDir < 0 && item.x < -halfW - 0.8) {
            item.x = halfW + 0.8;
          }
        }

        item.mesh.root.position.set(item.x, item.y, item.z);
        item.mesh.root.rotation.set(item.rotX, item.rotY, item.rotZ);
      } else {
        item.mesh.root.visible = false;
      }
    });

    renderer.render(scene, camera);
    requestAnimationFrame(animateFlock);
  }

  requestAnimationFrame(animateFlock);
}

// ============================================================================
// INTRO VIDEO LOADING SCREEN ("차분하고 은은한 순차 전개 & 시네마틱 디졸브")
// ============================================================================
function initVideoLoadingScreen() {
  const loader = document.getElementById('site-loader');
  if (!loader) return;

  let isDismissed = false;
  let timerId = null;

  function dismissLoader() {
    if (isDismissed) return;
    isDismissed = true;
    if (timerId) clearTimeout(timerId);
    window.removeEventListener('keydown', onKeyDown);

    // Smooth cinematic dissolve
    loader.classList.add('is-loaded');
    document.body.classList.remove('is-loading');
    measureLayoutPositions();
    handleScroll();

    // Resume Lenis smooth scroll once exhibition appears
    if (lenis) {
      lenis.start();
    }

    setTimeout(() => {
      if (loader && loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }
      measureLayoutPositions();
      handleScroll();
    }, 1200);
  }

  // Fast-Access Skip Button for Returning Visitors
  const btnSkip = document.getElementById('btn-skip-intro');
  if (btnSkip) {
    btnSkip.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissLoader();
    });
  }

  // Tap/Click anywhere on loader stage to skip
  loader.addEventListener('click', () => {
    dismissLoader();
  });

  // ESC key to skip immediately
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      dismissLoader();
    }
  }
  window.addEventListener('keydown', onKeyDown);

  // Prevent scroll during intro loading screen & ensure scroll at top
  window.scrollTo(0, 0);
  if (lenis) {
    lenis.scrollTo(0, { immediate: true });
    lenis.stop();
  }

  // 건축 도면 스케치 & 로고 결합 감상 후 시네마틱 디졸브 (3850ms)
  const FIXED_LOADING_TIME = 3850;
  timerId = setTimeout(dismissLoader, FIXED_LOADING_TIME);
}

// Initial trigger on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  initVideoLoadingScreen();
  measureLayoutPositions();
  handleScroll();
  updateTypoStreamLine();
  initFigureQuillFrames();
  initQuillBirdCompanion();
});

// Refresh cached layouts once all images and resources finish loading
window.addEventListener('load', () => {
  measureLayoutPositions();
  handleScroll();
});

// Dynamic Layout Observers: 보정 레이아웃 옵저버 (이미지 로딩, 폰트 렌더링 시 오차 즉시 자동 보정)
if (typeof ResizeObserver !== 'undefined') {
  const layoutObserver = new ResizeObserver(() => {
    measureLayoutPositions();
    handleScroll();
  });
  if (document.body) {
    layoutObserver.observe(document.body);
  }
}

document.querySelectorAll('img').forEach(img => {
  if (!img.complete) {
    img.addEventListener('load', () => {
      measureLayoutPositions();
      handleScroll();
    });
  }
});

if (document.fonts) {
  document.fonts.ready.then(() => {
    measureLayoutPositions();
    handleScroll();
  });
}

// Run once immediately
initVideoLoadingScreen();
measureLayoutPositions();
handleScroll();
updateTypoStreamLine();
initFigureQuillFrames();
initQuillBirdCompanion();

