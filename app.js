/* ─────────────────────────────────────────────────────────
   app.js — Festival Go Prototype State Machine
───────────────────────────────────────────────────────── */

// ── App State ────────────────────────────────────────────
const state = {
  selectedCategory: null,
  selectedFestival: null,
  currentDay: 1,
  guideMode: 'voice',
  currentLang: 'ko',
  isVoicePlaying: false,
  missionsDone: [true, true, false, false],
  gpsStep: 2, // 0-indexed; currently at index 2 (첨성대)
  courseCompleted: false,
};

// ── Screen Labels ────────────────────────────────────────
const screenLabels = {
  'screen-splash':        '스플래시 화면',
  'screen-category':      '1단계 — 활동 카테고리 선택',
  'screen-conditions':    '2단계 — 여행 조건 설정',
  'screen-analyzing':     'AI 분석 중...',
  'screen-festival-list': '3단계 — 맞춤 축제 추천 결과',
  'screen-region':        '지역 추천 — 경주 소개 & 마스코트 등장',
  'screen-course':        '코스 & 타임라인',
  'screen-nav':           '실시간 내비게이션',
  'screen-docent':        'AI 도슨트 가이드',
  'screen-mission':       '미션 수행',
  'screen-complete':      '코스 완주 🎉',
  'screen-mypage':        '마이페이지',
  'screen-workation':     '워케이션 공고 목록',
  'screen-work-detail':   '워케이션 공고 상세',
};

// ── Docent Texts by Language ─────────────────────────────
const docentTexts = {
  ko: '"반갑습니다! 저는 천년 신라의 수호자 신라방입니다. 지금 여러분이 서 계신 첨성대는 선덕여왕 632년에 축조된 동양에서 가장 오래된 천문 관측대입니다. 높이 9.17m, 362개의 돌로 쌓인 이 탑은 신라인들이 하늘과 소통하던 신성한 공간이었답니다."',
  en: '"Welcome! I am Sillabang, guardian of the thousand-year Silla Kingdom. Cheomseongdae, where you stand now, is the oldest astronomical observatory in East Asia, built in 632 CE during the reign of Queen Seondeok. Standing 9.17m tall, constructed from 362 stones, it was a sacred space where Silla people communicated with the heavens."',
  ja: '"こんにちは！私は千年新羅の守護者、신라방（シルラバン）です。今あなたが立っている瞻星台は、善徳女王632年に建造された東洋最古の天文台です。高さ9.17m、362個の石で積まれたこの塔は、新羅の人々が天と交信した神聖な場所でした。"',
  zh: '"欢迎！我是千年新罗的守护者新罗方。您现在所在的瞻星台是亚洲最古老的天文台，建于632年善德女王时期。这座高9.17米、由362块石头砌成的塔，是新罗人与天空沟通的神圣场所。"',
};

// ── Screen Navigation ────────────────────────────────────
function goto(screenId, direction = 'right') {
  const prev = document.querySelector('.screen.active');
  const next = document.getElementById(screenId);
  if (!next || prev === next) return;

  prev.classList.remove('active');
  next.classList.remove('slide-in-right', 'slide-in-left');
  next.classList.add('active');
  next.classList.add(direction === 'right' ? 'slide-in-right' : 'slide-in-left');

  // Scroll to top
  next.scrollTop = 0;

  // Update panel label
  const label = document.getElementById('current-screen-label');
  if (label) label.textContent = screenLabels[screenId] || screenId;

  // Cleanup animation class
  setTimeout(() => {
    next.classList.remove('slide-in-right', 'slide-in-left');
  }, 400);
}

// ── Category Selection ───────────────────────────────────
function selectCategory(el) {
  document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedCategory = el.dataset.cat;

  const btn = document.getElementById('cat-next-btn');
  btn.removeAttribute('disabled');
  btn.style.opacity = '1';
  btn.style.cursor = 'pointer';
}

// ── Option Toggle (radio-style within group) ─────────────
function toggleOption(el, group) {
  const siblings = el.parentElement.querySelectorAll(`[data-val]`);
  siblings.forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
}

// ── Festival Selection ───────────────────────────────────
function selectFestival(el, name) {
  document.querySelectorAll('.festival-item').forEach(f => f.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedFestival = name;

  const btn = document.getElementById('fest-next-btn');
  btn.removeAttribute('disabled');
  btn.style.opacity = '1';
  btn.style.cursor = 'pointer';

  showToast(`'${name}' 선택! 코스를 생성합니다 ✨`, 'success');
}

// ── AI Analysis Flow (with spinner) ─────────────────────
function startAIAnalysis() {
  goto('screen-analyzing', 'right');
  const texts = [
    '유저 취향을 분석하고 있어요 ✨\n잠깐만 기다려 주세요',
    '관광 DB와 매칭 중 🔍\n최적 축제를 찾고 있어요',
    '코스를 최적화하는 중 🗺️\n거의 다 됐어요!',
  ];
  let i = 0;
  const el = document.getElementById('spinner-text');
  const interval = setInterval(() => {
    i++;
    if (i < texts.length) { el.innerHTML = texts[i].replace('\n','<br/>'); }
  }, 700);

  setTimeout(() => {
    clearInterval(interval);
    goto('screen-festival-list', 'right');
  }, 2200);
}

// ── Day Tab Switch ───────────────────────────────────────
function switchDay(tab, day) {
  document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');

  for (let d = 1; d <= 3; d++) {
    const el = document.getElementById(`day-${d}`);
    if (el) el.style.display = d === day ? 'block' : 'none';
  }
  state.currentDay = day;
}

// ── Language Switch ──────────────────────────────────────
function switchLang(tab, lang) {
  document.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  state.currentLang = lang;

  const text = docentTexts[lang] || docentTexts.ko;
  const el1 = document.getElementById('docent-text-ko');
  const el2 = document.getElementById('docent-text-display');
  if (el1) el1.textContent = text;
  if (el2) el2.textContent = text;

  showToast(`언어가 ${tab.textContent.trim()} 으로 변경되었습니다`, '');
}

// ── Guide Mode Switch ────────────────────────────────────
function switchGuideMode(mode) {
  state.guideMode = mode;
  document.getElementById('mode-voice').classList.toggle('active', mode === 'voice');
  document.getElementById('mode-text').classList.toggle('active', mode === 'text');
  document.getElementById('voice-guide-content').style.display = mode === 'voice' ? 'block' : 'none';
  document.getElementById('text-guide-content').style.display  = mode === 'text'  ? 'block' : 'none';
}

// ── Voice Toggle ─────────────────────────────────────────
function toggleVoice() {
  state.isVoicePlaying = !state.isVoicePlaying;
  const btn = document.getElementById('voice-play-btn');
  const status = document.getElementById('voice-status');
  const waveform = document.getElementById('waveform');

  if (state.isVoicePlaying) {
    btn.textContent = '⏸';
    status.textContent = '음성 안내 재생 중... 🎙️';
    waveform.querySelectorAll('.wave-bar').forEach(b => b.style.animationPlayState = 'running');
  } else {
    btn.textContent = '▶';
    status.textContent = '일시 정지됨 — 다시 재생하려면 버튼을 누르세요';
    waveform.querySelectorAll('.wave-bar').forEach(b => b.style.animationPlayState = 'paused');
  }
}

// ── GPS Arrival Simulation ───────────────────────────────
function simulateArrival() {
  if (state.gpsStep >= 4) return;

  const spotNames = ['경주 역사유적', '교리김밥', '첨성대', '동궁과 월지'];
  const spotName = spotNames[state.gpsStep];

  showToast(`📍 ${spotName} 도착 인식! 미션을 확인하세요`, 'success');

  // Update nav screen distance/time
  const distEl = document.getElementById('nav-dist');
  const timeEl = document.getElementById('nav-time');
  if (distEl && state.gpsStep === 2) {
    distEl.textContent = '0m';
    timeEl.textContent = '도착!';
  }

  // Auto goto mission screen if on nav
  const navScreen = document.getElementById('screen-nav');
  if (navScreen.classList.contains('active')) {
    setTimeout(() => goto('screen-mission', 'right'), 800);
  }
}

// ── Mission Complete ─────────────────────────────────────
let missionsDone = 2; // 0 and 1 are pre-done

function completeMission(num) {
  const item = document.getElementById(`mission-${num}`);
  if (!item) return;
  if (item.classList.contains('done')) return;

  item.classList.remove('active');
  item.classList.add('done');
  const action = item.querySelector('.mission-action');
  action.innerHTML = '<div class="mission-done-badge">✅ 인증 완료!</div>';

  missionsDone++;
  const pct = Math.round((missionsDone / 4) * 100);
  const bar = document.getElementById('mission-bar');
  const txt = document.getElementById('mission-progress-text');
  if (bar) bar.style.width = pct + '%';
  if (txt) txt.textContent = `미션 ${missionsDone}/4 완료 · ${pct}% 달성`;

  showToast(`미션 완료! 신라방이 선명해지고 있어요 ✨`, 'success');

  // Unlock next mission
  if (num < 4) {
    const next = document.getElementById(`mission-${num + 1}`);
    if (next && !next.classList.contains('done')) {
      next.classList.add('active');
      const btn = next.querySelector('.mission-upload-btn');
      if (btn) {
        btn.textContent = '📷 사진 업로드 & 인증';
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.disabled = false;
        btn.onclick = () => completeMission(num + 1);
      }
    }
  }

  // Update GPS dots in simulator
  const gpsDots = document.querySelectorAll('#sim-gps-dots .sim-dot');
  if (gpsDots[num - 1]) {
    gpsDots[num - 1].classList.remove('active');
    gpsDots[num - 1].classList.add('done');
    if (gpsDots[num]) gpsDots[num].classList.add('active');
  }

  // Sharpen docent mascot
  sharpDocent();
}

// ── Course Complete Trigger ──────────────────────────────
function triggerCourseComplete() {
  state.courseCompleted = true;
  spawnConfetti();
  setTimeout(() => goto('screen-complete', 'right'), 300);
}

// ── Docent Mascot State ──────────────────────────────────
function clearDocent() {
  const m = document.getElementById('docent-mascot');
  if (m) { m.classList.add('blurred'); m.classList.remove('clear'); }
}

function sharpDocent() {
  const m = document.getElementById('docent-mascot');
  if (m) { m.classList.remove('blurred'); m.classList.add('clear'); }
}

// ── AI Proposal Toast ────────────────────────────────────
function triggerAIProposal() {
  showToast('🤖 경주시청 관광과에서 AI 제안이 도착했습니다!', 'success');
  setTimeout(() => goto('screen-work-detail', 'right'), 1200);
}

// ── Apply Job ────────────────────────────────────────────
function applyJob() {
  showToast('✅ AI 제안을 수락했습니다! 매칭 완료!', 'success');
  setTimeout(() => goto('screen-workation', 'left'), 1500);
}

// ── Toast Notification ───────────────────────────────────
let toastTimer = null;

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;

  clearTimeout(toastTimer);
  t.textContent = msg;
  t.className = 'toast show';
  if (type === 'success') t.classList.add('success');
  if (type === 'warning') t.classList.add('warning');
  if (type === 'orange')  t.style.background = 'var(--primary)';
  else t.style.background = '';

  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => { t.className = 'toast'; }, 400);
  }, 3000);
}

// ── Confetti ─────────────────────────────────────────────
function spawnConfetti() {
  const overlay = document.getElementById('confetti');
  if (!overlay) return;
  overlay.innerHTML = '';

  const colors = ['#FF5A1F','#FF8E53','#FFB347','#10B981','#3B82F6','#F59E0B','#EC4899'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-delay: ${Math.random() * 0.8}s;
      animation-duration: ${2 + Math.random() * 1.5}s;
    `;
    overlay.appendChild(p);
  }

  setTimeout(() => { overlay.innerHTML = ''; }, 4000);
}

// ── Voice Waveform Animation Init ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Pause waveform initially
  document.querySelectorAll('.wave-bar').forEach(b => {
    b.style.animationPlayState = 'paused';
  });

  // Update clock every minute
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${h}:${m}`;
    document.querySelectorAll('.status-bar > span:first-child').forEach(el => {
      if (!el.closest('[style*="background:transparent"]') &&
          !el.closest('.status-bar.white')) {
        el.textContent = timeStr;
      }
    });
  }
  updateClock();
  setInterval(updateClock, 30000);

  // Initial simulator label
  const label = document.getElementById('current-screen-label');
  if (label) label.textContent = screenLabels['screen-splash'];
});
