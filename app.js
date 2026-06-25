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
  seekerProfile: {
    regions: ['경주'],
    skills: ['SNS 촬영', '영상 편집'],
    minPay: 10
  },
  jobs: [
    {
      id: 'job-1',
      title: '신라문화제 SNS 콘텐츠 스태프',
      company: '경주시청 관광과 · 경주시',
      icon: '🏛️',
      pay: 120000,
      period: '10.02 ~ 10.06 (5일)',
      skills: ['SNS 촬영', '영상 편집', '한국어 가능'],
      region: '경주'
    },
    {
      id: 'job-2',
      title: '신라문화제 행사 운영 스태프',
      company: '경주문화재단 · 경주시',
      icon: '🎭',
      pay: 90000,
      period: '10.02 ~ 10.06',
      skills: ['안내·접수', '야간 근무', '유니폼 제공'],
      region: '경주'
    },
    {
      id: 'job-3',
      title: '강릉 커피축제 바리스타 보조',
      company: '강릉시 관광진흥과 · 강릉시',
      icon: '🌿',
      pay: 100000,
      period: '10.10 ~ 10.14',
      skills: ['카페 운영', '바리스타', '숙박 제공'],
      region: '강릉'
    }
  ]
};

// ── Screen Labels ────────────────────────────────────────
const screenLabels = {
  'screen-splash':        '스플래시 화면',
  'screen-onboarding':    '온보딩 슬라이드',
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
  'screen-work-recruiter-post': '구인 공고 등록 (구인자)',
  'screen-work-seeker-conditions': '워케이션 조건 설정 (구직자)',
  'screen-work-matching-loading': '상호 AI 매칭 중...',
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

  // Show toast warning if entering course screen for Busan
  if (screenId === 'screen-course' && state.selectedFestival === '부산 불꽃 축제') {
    setTimeout(() => {
      showToast('⚠️ 부산 코스는 준비 중으로, 경주 코스 예시가 표시됩니다.', 'warning');
    }, 450);
  }
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

// ── AI Analysis Flow (with spinner & cancel) ─────────────
let aiAnalysisTimeout = null;
let aiAnalysisInterval = null;

function startAIAnalysis() {
  goto('screen-analyzing', 'right');
  const texts = [
    '유저 취향을 분석하고 있어요 ✨\n잠깐만 기다려 주세요',
    '관광 DB와 매칭 중 🔍\n최적 축제를 찾고 있어요',
    '코스를 최적화하는 중 🗺️\n거의 다 됐어요!',
  ];
  let i = 0;
  const el = document.getElementById('spinner-text');
  if (el) el.innerHTML = texts[0].replace('\n', '<br/>');

  aiAnalysisInterval = setInterval(() => {
    i++;
    if (i < texts.length && el) { el.innerHTML = texts[i].replace('\n','<br/>'); }
  }, 700);

  aiAnalysisTimeout = setTimeout(() => {
    clearInterval(aiAnalysisInterval);
    goto('screen-festival-list', 'right');
  }, 2200);
}

function cancelAIAnalysis() {
  if (aiAnalysisTimeout) clearTimeout(aiAnalysisTimeout);
  if (aiAnalysisInterval) clearInterval(aiAnalysisInterval);
  showToast('AI 분석이 취소되었습니다', 'warning');
  goto('screen-conditions', 'left');
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

  showToast(`언어가 ${tab.textContent.replace(/\s+/g, ' ').trim()} 으로 변경되었습니다`, '');
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
  if (distEl && timeEl) {
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
  if (action) {
    action.innerHTML = '<div class="mission-done-badge">✅ 인증 완료!</div>';
  }

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

  // Progress GPS step & update navigation UI
  if (num === 3) {
    state.gpsStep = 3; // Now active spot is 동궁과 월지 (index 3)

    // Update navigation UI
    const pin3 = document.getElementById('pin3-dot');
    if (pin3) {
      pin3.className = 'pin-dot done';
      pin3.textContent = '✓';
    }

    const pin4 = document.getElementById('pin4-dot');
    if (pin4) {
      pin4.className = 'pin-dot active';
      pin4.style.background = 'var(--primary)';
    }

    const routeTitle = document.getElementById('nav-route-title');
    if (routeTitle) routeTitle.textContent = '🧭 첨성대 → 동궁과 월지';

    const routeDesc = document.getElementById('nav-route-desc');
    if (routeDesc) routeDesc.textContent = '도보 약 12분 · 남동쪽 방향으로 이동';

    const distEl = document.getElementById('nav-dist');
    const timeEl = document.getElementById('nav-time');
    if (distEl) distEl.textContent = '540m';
    if (timeEl) timeEl.textContent = '7분';

    const progressNum = document.getElementById('nav-progress-num');
    if (progressNum) progressNum.textContent = '3/4';

    const nextIcon = document.getElementById('nav-next-icon');
    if (nextIcon) nextIcon.textContent = '🌙';

    const nextInfo = document.getElementById('nav-next-info');
    if (nextInfo) {
      nextInfo.innerHTML = `
        <h4>다음 거점 : 동궁과 월지</h4>
        <p>야간 특별 투어 및 야경 인증 미션 가능</p>
      `;
    }

    // Update nav progress dots
    const progressTrack = document.getElementById('nav-progress-track');
    if (progressTrack) {
      const dots = progressTrack.children;
      if (dots && dots[2] && dots[3]) {
        dots[2].className = 'nav-progress-dot done';
        dots[3].className = 'nav-progress-dot active';
      }
    }
  }

  if (num === 4) {
    state.gpsStep = 4; // All steps done

    const progressNum = document.getElementById('nav-progress-num');
    if (progressNum) progressNum.textContent = '4/4';

    const progressTrack = document.getElementById('nav-progress-track');
    if (progressTrack) {
      const dots = progressTrack.children;
      if (dots && dots[3]) {
        dots[3].className = 'nav-progress-dot done';
      }
    }

    const pin4 = document.getElementById('pin4-dot');
    if (pin4) {
      pin4.className = 'pin-dot done';
      pin4.textContent = '✓';
    }

    // Auto trigger course complete after 1.5s
    setTimeout(() => {
      showToast('🎉 경주 신라문화제 코스 완주를 축하합니다!', 'success');
      triggerCourseComplete();
    }, 1500);
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
      if (el.textContent.includes(':') || /^\d{2}:\d{2}$/.test(el.textContent.trim())) {
        el.textContent = timeStr;
      }
    });
  }
  updateClock();
  setInterval(updateClock, 30000);

  // Initial simulator label
  const label = document.getElementById('current-screen-label');
  if (label) label.textContent = screenLabels['screen-splash'];

  // Initial workation list render
  renderWorkationList();
});

// ── Onboarding Slide Control ─────────────────────────────
let currentOnboardSlide = 0;

function nextOnboardSlide() {
  if (currentOnboardSlide < 2) {
    gotoOnboardSlide(currentOnboardSlide + 1);
  } else {
    goto('screen-category', 'right');
  }
}

function gotoOnboardSlide(index) {
  currentOnboardSlide = index;
  document.querySelectorAll('.onboard-slide').forEach(s => s.classList.remove('active'));
  const activeSlide = document.querySelector(`.onboard-slide[data-index="${index}"]`);
  if (activeSlide) activeSlide.classList.add('active');
  
  document.querySelectorAll('.onboard-dot').forEach((d, i) => {
    d.classList.toggle('active', i === index);
  });

  const btn = document.getElementById('onboard-next-btn');
  if (btn) {
    if (index === 2) {
      btn.textContent = '카테고리 선택하고 시작하기 →';
    } else {
      btn.textContent = '다음 단계로 →';
    }
  }
}

// ── Region Confirmation Ticket Modal Control ─────────────
function openRegionConfirmModal() {
  const modal = document.getElementById('region-confirm-modal');
  if (!modal) return;
  
  const festVal = state.selectedFestival || '신라문화제';
  const nameEl = document.getElementById('ticket-festival-name');
  if (nameEl) nameEl.textContent = festVal;
  
  modal.classList.add('active');
}

function closeRegionConfirmModal() {
  const modal = document.getElementById('region-confirm-modal');
  if (modal) modal.classList.remove('active');
}

function confirmRegionGo() {
  closeRegionConfirmModal();

  const festVal = state.selectedFestival || '신라문화제';
  
  // DOM element references
  const heroImg = document.getElementById('region-hero-img');
  const tagContainer = document.getElementById('region-tag-container');
  const title = document.getElementById('region-title');
  const desc = document.getElementById('region-desc');
  const statMatch = document.getElementById('region-stat-match');
  const statDuration = document.getElementById('region-stat-duration');
  const statSpots = document.getElementById('region-stat-spots');
  const mascotCard = document.getElementById('region-mascot-card');

  if (festVal === '신라문화제') {
    if (heroImg) {
      heroImg.src = 'assets/cheomseongdae.png';
      heroImg.style.background = '';
    }
    if (tagContainer) {
      tagContainer.innerHTML = `
        <span class="badge orange">📍 경주시, 경북</span>
        <span class="badge blue">신라문화제 10월</span>
      `;
    }
    if (title) title.textContent = '경주로 떠나요! 🏯';
    if (desc) desc.textContent = 'AI가 선택한 최적의 여행지 — 매칭률 96%';
    if (statMatch) statMatch.textContent = '96%';
    if (statDuration) statDuration.textContent = '2박 3일';
    if (statSpots) statSpots.textContent = '12곳';
    
    if (mascotCard) {
      mascotCard.style.display = 'flex';
      const img = mascotCard.querySelector('img');
      if (img) img.style.filter = '';
      const textH3 = mascotCard.querySelector('.mascot-text h3');
      const textP = mascotCard.querySelector('.mascot-text p');
      if (textH3) textH3.textContent = '🦁 도슨트 \'신라방\' 등장!';
      if (textP) textP.textContent = '경주의 수호자 신라방이 여러분의 여행을 함께합니다. 미션을 완료할수록 캐릭터가 점점 선명해져요!';
    }
  } else if (festVal === '경주 벚꽃 축제') {
    if (heroImg) {
      heroImg.src = 'assets/cheomseongdae.png';
      heroImg.style.background = 'linear-gradient(135deg, #FFB6C1 0%, #FFC0CB 100%)';
    }
    if (tagContainer) {
      tagContainer.innerHTML = `
        <span class="badge orange">📍 경주시, 경북</span>
        <span class="badge green">경주 벚꽃 축제 3~4월</span>
      `;
    }
    if (title) title.textContent = '경주로 떠나요! 🌸';
    if (desc) desc.textContent = 'AI가 선택한 최적의 여행지 — 매칭률 88%';
    if (statMatch) statMatch.textContent = '88%';
    if (statDuration) statDuration.textContent = '1박 2일';
    if (statSpots) statSpots.textContent = '6곳';
    
    if (mascotCard) {
      mascotCard.style.display = 'flex';
      const img = mascotCard.querySelector('img');
      if (img) img.style.filter = '';
      const textH3 = mascotCard.querySelector('.mascot-text h3');
      const textP = mascotCard.querySelector('.mascot-text p');
      if (textH3) textH3.textContent = '🦁 도슨트 \'신라방\' 등장!';
      if (textP) textP.textContent = '경주의 수호자 신라방이 여러분의 여행을 함께합니다. 미션을 완료할수록 캐릭터가 점점 선명해져요!';
    }
  } else if (festVal === '부산 불꽃 축제') {
    if (heroImg) {
      heroImg.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2522100%2525%2522%20height%3D%2522100%2525%2522%20xmlns%3D%2522http%3A//www.w3.org/2000/svg%2522%3E%3Cdefs%3E%3ClinearGradient%20id%3D%2522g%2522%20x1%3D%25220%2525%2522%20y1%3D%25220%2525%2522%20x2%3D%2522100%2525%2522%20y2%3D%2522100%2525%2522%3E%3Cstop%20offset%3D%25220%2525%2522%20stop-color%3D%2522%25231A1A2E%2522/%3E%3Cstop%20offset%3D%2522100%2525%2522%20stop-color%3D%2522%252316213E%2522/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%2522100%2525%2522%20height%3D%2522100%2525%2522%20fill%3D%2522url%2528%2523g%2529%2522/%3E%3C/svg%3E';
      heroImg.style.background = 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)';
    }
    if (tagContainer) {
      tagContainer.innerHTML = `
        <span class="badge orange">📍 부산시, 경남</span>
        <span class="badge purple">부산 불꽃 축제 10월</span>
      `;
    }
    if (title) title.textContent = '부산으로 떠나요! 🎆';
    if (desc) desc.textContent = 'AI가 선택한 최적의 여행지 — 매칭률 80%';
    if (statMatch) statMatch.textContent = '80%';
    if (statDuration) statDuration.textContent = '1박 2일';
    if (statSpots) statSpots.textContent = '5곳';
    
    if (mascotCard) {
      mascotCard.style.display = 'flex';
      const img = mascotCard.querySelector('img');
      if (img) img.style.filter = 'grayscale(1) opacity(0.5)';
      const textH3 = mascotCard.querySelector('.mascot-text h3');
      const textP = mascotCard.querySelector('.mascot-text p');
      if (textH3) textH3.textContent = '🌊 부산 도슨트 갈매기 대기 중';
      if (textP) textP.textContent = '부산 지역 도슨트는 현재 연동 준비 중입니다. 경주 지역 코스에서 신라방의 가이드를 전용으로 확인하실 수 있습니다.';
    }
  }

  // Update Course Screen header & map label
  const courseTitle = document.getElementById('course-title');
  const courseMapLabel = document.getElementById('course-map-label');

  if (festVal === '부산 불꽃 축제') {
    if (courseTitle) courseTitle.textContent = '부산 1박 2일 코스 (시뮬레이션)';
    if (courseMapLabel) courseMapLabel.textContent = '📍 부산 관광 동선';
  } else if (festVal === '경주 벚꽃 축제') {
    if (courseTitle) courseTitle.textContent = '경주 1박 2일 코스';
    if (courseMapLabel) courseMapLabel.textContent = '📍 경주 관광 동선';
  } else {
    if (courseTitle) courseTitle.textContent = '경주 2박 3일 코스';
    if (courseMapLabel) courseMapLabel.textContent = '📍 경주 관광 동선';
  }

  goto('screen-region', 'right');
}

// ── Workation Recruiter/Seeker/Matching Logic ────────────
function postRecruiterJob() {
  const title = document.getElementById('recruiter-title').value.trim();
  const festival = document.getElementById('recruiter-festival').value.trim();
  const regionSelect = document.getElementById('recruiter-region');
  const region = regionSelect ? regionSelect.value : '경주';
  const payInput = document.getElementById('recruiter-pay');
  const payVal = payInput && payInput.value ? parseInt(payInput.value) : 120000;
  
  if (!title || !festival) {
    showToast('⚠️ 공고 제목과 축제명을 입력해 주세요', 'warning');
    return;
  }
  
  const skills = [];
  document.querySelectorAll('#screen-work-recruiter-post .recruiter-skills-grid .chip.selected').forEach(chip => {
    skills.push(chip.dataset.skill);
  });
  
  const newJob = {
    id: 'custom-job-' + Date.now(),
    title: title,
    company: festival + ' 기획단 · ' + region + '시',
    icon: '🏛️',
    pay: payVal,
    period: '10.02 ~ 10.06 (5일)',
    skills: skills.length > 0 ? skills : ['SNS 촬영', '고객 응대'],
    region: region,
    custom: true
  };
  
  state.jobs.unshift(newJob);
  
  showToast('✅ 구인 공고가 등록되었습니다! 구직자 매칭을 시작합니다.', 'success');
  
  // Clear inputs
  document.getElementById('recruiter-title').value = '';
  document.getElementById('recruiter-festival').value = '';
  if (payInput) payInput.value = '';
  document.querySelectorAll('#screen-work-recruiter-post .recruiter-skills-grid .chip').forEach(chip => {
    chip.classList.remove('selected');
  });
  
  setTimeout(() => goto('screen-work-seeker-conditions', 'right'), 1200);
}

function startMutualMatching() {
  const regions = [];
  document.querySelectorAll('#seeker-regions-row .chip.selected').forEach(chip => {
    regions.push(chip.dataset.region);
  });
  
  const skills = [];
  document.querySelectorAll('#seeker-skills-row .chip.selected').forEach(chip => {
    skills.push(chip.dataset.skill);
  });
  
  const selectedPayBtn = document.querySelector('#seeker-pay-row .option-btn.selected');
  const minPay = selectedPayBtn ? parseInt(selectedPayBtn.dataset.val) : 10;
  
  if (regions.length === 0) {
    showToast('⚠️ 희망 근무 지역을 최소 1개 선택해 주세요', 'warning');
    return;
  }
  
  state.seekerProfile = {
    regions: regions,
    skills: skills,
    minPay: minPay
  };
  
  goto('screen-work-matching-loading', 'right');
  
  const checkSteps = [
    { id: 'check-step-1', bullet: 'bullet-1', text: '희망 근무 조건 분석 완료 ✅' },
    { id: 'check-step-2', bullet: 'bullet-2', text: '등록된 구인 공고 역량 매칭 완료 ✅' },
    { id: 'check-step-3', bullet: 'bullet-3', text: '상호 최적 적합도 산출 완료 ✅' }
  ];
  
  // Reset loading UI
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`check-step-${i}`);
    const bulletEl = document.getElementById(`bullet-${i}`);
    if (stepEl) {
      stepEl.className = 'check-item';
      const textSpan = stepEl.querySelector('span:last-child');
      if (textSpan) {
        textSpan.textContent = i === 1 ? '희망 근무 조건 분석 중...' : i === 2 ? '등록된 구인 공고 역량 매칭 중...' : '상호 최적 적합도 산출 중...';
      }
    }
    if (bulletEl) {
      bulletEl.className = 'check-bullet';
      bulletEl.textContent = i;
    }
  }
  
  // Activate step 1
  setTimeout(() => {
    activateCheckStep(1, checkSteps[0]);
  }, 600);
  
  // Activate step 2
  setTimeout(() => {
    activateCheckStep(2, checkSteps[1]);
  }, 1200);
  
  // Activate step 3
  setTimeout(() => {
    activateCheckStep(3, checkSteps[2]);
  }, 1800);
  
  // Done
  setTimeout(() => {
    renderWorkationList();
    goto('screen-workation', 'right');
    showToast('🤖 AI 분석 결과, 맞춤 워케이션 추천이 완료되었습니다!', 'success');
  }, 2500);
}

function activateCheckStep(num, stepData) {
  const stepEl = document.getElementById(stepData.id);
  const bulletEl = document.getElementById(stepData.bullet);
  if (stepEl) {
    stepEl.classList.add('active-step');
    const textSpan = stepEl.querySelector('span:last-child');
    if (textSpan) textSpan.textContent = stepData.text;
  }
  if (bulletEl) {
    bulletEl.classList.add('done');
    bulletEl.textContent = '✓';
  }
  if (num < 3) {
    const nextBullet = document.getElementById(`bullet-${num + 1}`);
    if (nextBullet) nextBullet.classList.add('active-bullet');
  }
}

function calculateMatchRate(job, seeker) {
  let score = 50;
  
  if (seeker.regions.includes(job.region)) {
    score += 30;
  }
  
  if (job.skills && job.skills.length > 0) {
    let matchedSkills = 0;
    job.skills.forEach(s => {
      if (seeker.skills.some(ss => s.includes(ss) || ss.includes(s))) {
        matchedSkills++;
      }
    });
    const matchRatio = matchedSkills / job.skills.length;
    score += Math.round(matchRatio * 20);
  }
  
  const jobPay10k = job.pay / 10000;
  if (jobPay10k >= seeker.minPay) {
    score += 8;
  } else {
    score -= 5;
  }
  
  return Math.max(50, Math.min(98, score));
}

function renderWorkationList() {
  const container = document.querySelector('#screen-workation .festival-scroll-area');
  if (!container) return;
  
  container.innerHTML = '';
  
  const seeker = state.seekerProfile || { regions: ['경주'], skills: ['SNS 촬영', '영상 편집'], minPay: 10 };
  
  const scoredJobs = state.jobs.map(job => {
    return {
      ...job,
      matchRate: calculateMatchRate(job, seeker)
    };
  });
  
  scoredJobs.sort((a, b) => b.matchRate - a.matchRate);
  
  scoredJobs.forEach((job, index) => {
    const item = document.createElement('div');
    item.className = 'work-item';
    if (job.custom) {
      item.style.border = '2px solid var(--primary)';
    }
    item.onclick = () => showWorkDetail(job.id);
    
    const skillsHtml = job.skills.map((s, idx) => {
      const badgeClass = idx === 0 ? 'blue' : 'gray';
      return `<span class="badge ${badgeClass}">${s}</span>`;
    }).join('');
    
    const isCustomBadge = job.custom ? `<span class="badge orange" style="margin-left:auto">내가 올린 공고 🏛️</span>` : (index === 0 ? `<span class="badge orange" style="margin-left:auto">AI 제안 🤖</span>` : '');
    
    item.innerHTML = `
      <div class="work-item-header">
        <div class="work-company-icon">${job.icon}</div>
        <div>
          <h3 style="font-size: 14px; font-weight: 700; color: var(--text-main);">${job.title}</h3>
          <p style="font-size: 11px; color: var(--text-sub); margin-top: 2px;">${job.company}</p>
        </div>
        ${isCustomBadge}
      </div>
      <div class="work-item-body" style="padding: 12px 16px;">
        <div class="work-tags" style="display: flex; gap: 4px; margin-bottom: 8px;">
          ${skillsHtml}
        </div>
        <div class="work-meta-row" style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;">
          <div class="work-pay" style="font-weight: 700; color: var(--primary);">일 ${job.pay.toLocaleString()}원</div>
          <div class="work-period" style="color: var(--text-sub);">${job.period}</div>
        </div>
        <div class="work-match-row" style="display: flex; align-items: center; gap: 8px;">
          <div class="ai-match-label" style="font-size: 10px; font-weight: 700; color: var(--primary);">AI 매칭</div>
          <div class="ai-match-bar" style="flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;"><div class="ai-match-fill" style="width:${job.matchRate}%; height: 100%; background: var(--primary);"></div></div>
          <div class="ai-match-pct" style="font-size: 10px; font-weight: 700; color: var(--primary);">${job.matchRate}%</div>
        </div>
      </div>
    `;
    
    container.appendChild(item);
  });
  
  if (container.lastElementChild) {
    container.lastElementChild.style.marginBottom = '100px';
  }
}

function showWorkDetail(jobId) {
  const job = state.jobs.find(j => j.id === jobId);
  if (!job) return;
  
  const heroTitle = document.querySelector('#screen-work-detail .work-detail-hero h1');
  const heroCompany = document.querySelector('#screen-work-detail .work-detail-meta span.orange');
  const heroMatch = document.querySelector('#screen-work-detail .work-detail-meta span.green');
  const detailPeriod = document.querySelector('#screen-work-detail .work-section div.work-info-row:nth-child(2) div.val');
  const detailPay = document.querySelector('#screen-work-detail .work-section div.work-info-row:nth-child(4) div.val');
  const detailTotalPay = document.querySelector('#screen-work-detail .work-section div.work-info-row:nth-child(5) div.val');
  
  if (heroTitle) heroTitle.innerHTML = job.title.replace(' ', '<br/>');
  if (heroCompany) heroCompany.textContent = job.company.split(' · ')[0];
  
  const seeker = state.seekerProfile || { regions: ['경주'], skills: ['SNS 촬영', '영상 편집'], minPay: 10 };
  const rate = calculateMatchRate(job, seeker);
  if (heroMatch) heroMatch.textContent = `AI 매칭 ${rate}%`;
  
  if (detailPeriod) detailPeriod.textContent = job.period;
  if (detailPay) detailPay.textContent = `${job.pay.toLocaleString()}원`;
  if (detailTotalPay) {
    const days = job.period.includes('5일') ? 5 : 3;
    detailTotalPay.textContent = `${(job.pay * days).toLocaleString()}원`;
  }
  
  const tagsRow = document.querySelector('#screen-work-detail .work-section:nth-of-type(3) .option-row');
  if (tagsRow) {
    tagsRow.innerHTML = job.skills.map((s, idx) => {
      const badgeClass = idx === 0 ? 'blue' : (idx === 1 ? 'gray' : 'green');
      return `<span class="badge ${badgeClass}">${s}</span>`;
    }).join('');
  }
  
  state.selectedJob = job;
  goto('screen-work-detail', 'right');
}
