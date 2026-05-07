/**
 * Operator Panel - JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // Theme toggle setup
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const sunIcon = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
  const moonIcon = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;

  function updateThemeIcon() {
    const current = getTheme();
    themeIcon.innerHTML = current === 'dark' ? sunIcon : moonIcon;
  }

  themeToggle.addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });

  updateThemeIcon();

  window.addEventListener('storage', (e) => {
    if (e.key === 'basketball_scoreboard_theme') updateThemeIcon();
  });

  try {
    const themeChannel = new BroadcastChannel('scoreboard_theme');
    themeChannel.onmessage = () => updateThemeIcon();
  } catch (e) {}

  // Elements
  const els = {
    homeName: document.getElementById('homeNameDisplay'),
    awayName: document.getElementById('awayNameDisplay'),
    homeScore: document.getElementById('homeScore'),
    awayScore: document.getElementById('awayScore'),
    homeFouls: document.getElementById('homeFouls'),
    awayFouls: document.getElementById('awayFouls'),
    homeBonus: document.getElementById('homeBonus'),
    awayBonus: document.getElementById('awayBonus'),
    homeTimeouts: document.getElementById('homeTimeouts'),
    awayTimeouts: document.getElementById('awayTimeouts'),
    gameClock: document.getElementById('gameClock'),
    shotClock: document.getElementById('shotClock'),
    statusText: document.getElementById('statusText'),
    mainActionBtn: document.getElementById('mainActionBtn'),
    officialTimeoutBtn: document.getElementById('officialTimeoutBtn'),
    periodLabel: document.getElementById('periodLabel'),
    // Official timeout elements
    officialTimeoutDisplay: document.getElementById('officialTimeoutDisplay'),
    officialTimeoutLabel: document.getElementById('officialTimeoutLabel'),
    officialTimeoutCountdown: document.getElementById('officialTimeoutCountdown'),
    // Operation log
    operationLogList: document.getElementById('operationLogList'),
  };

  function getDefaultTeamName(team, lang) {
    if (lang === 'en') {
      return team === 'home' ? 'Home' : 'Away';
    }
    return team === 'home' ? '主队' : '客队';
  }

  // Render state
  function render(state) {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const period = getPeriodLabel(state.periodNumber, state.isOvertime);

    // Team info - use default name if user hasn't customized
    const homeDisplayName = state.home.name || getDefaultTeamName('home', lang);
    const awayDisplayName = state.away.name || getDefaultTeamName('away', lang);
    els.homeName.textContent = homeDisplayName;
    els.awayName.textContent = awayDisplayName;
    els.homeScore.textContent = state.home.score;
    els.awayScore.textContent = state.away.score;

    // Fouls with bonus indicator
    els.homeFouls.textContent = state.home.fouls;
    els.awayFouls.textContent = state.away.fouls;

    const timeoutLabels = lang === 'en' ? {
      ot: 'OT',
      reg: 'Reg',
      firstHalf: '1H',
      secondHalf: '2H'
    } : {
      ot: '加时',
      reg: '常',
      firstHalf: '上',
      secondHalf: '下'
    };

    // Timeouts display (rule-aware)
    if (state.ruleSet === 'nba') {
      if (state.isOvertime) {
        els.homeTimeouts.innerHTML = `<span class="timeout-label-text">${timeoutLabels.ot}:</span>${state.home.timeoutsOvertimeRemaining || 0}`;
        els.awayTimeouts.innerHTML = `<span class="timeout-label-text">${timeoutLabels.ot}:</span>${state.away.timeoutsOvertimeRemaining || 0}`;
      } else {
        els.homeTimeouts.innerHTML = `<span class="timeout-label-text">${timeoutLabels.reg}:</span>${state.home.timeoutsRegulationRemaining || 0}`;
        els.awayTimeouts.innerHTML = `<span class="timeout-label-text">${timeoutLabels.reg}:</span>${state.away.timeoutsRegulationRemaining || 0}`;
      }
      els.homeTimeouts.className = 'stat-value timeout-display';
      els.awayTimeouts.className = 'stat-value timeout-display';
    } else if (state.ruleSet === 'fiba') {
      if (state.isOvertime) {
        els.homeTimeouts.innerHTML = `<span class="timeout-label-text">${timeoutLabels.ot}:</span>${state.home.timeoutsOvertimeRemaining || 0}`;
        els.awayTimeouts.innerHTML = `<span class="timeout-label-text">${timeoutLabels.ot}:</span>${state.away.timeoutsOvertimeRemaining || 0}`;
      } else if (state.periodNumber <= 2) {
        els.homeTimeouts.innerHTML = `<span class="timeout-label-text">${timeoutLabels.firstHalf}:</span>${state.home.timeoutsFirstHalfRemaining || 0}`;
        els.awayTimeouts.innerHTML = `<span class="timeout-label-text">${timeoutLabels.firstHalf}:</span>${state.away.timeoutsFirstHalfRemaining || 0}`;
      } else {
        els.homeTimeouts.innerHTML = `<span class="timeout-label-text">${timeoutLabels.secondHalf}:</span>${state.home.timeoutsSecondHalfRemaining || 0}`;
        els.awayTimeouts.innerHTML = `<span class="timeout-label-text">${timeoutLabels.secondHalf}:</span>${state.away.timeoutsSecondHalfRemaining || 0}`;
      }
      els.homeTimeouts.className = 'stat-value timeout-display';
      els.awayTimeouts.className = 'stat-value timeout-display';
    } else {
      els.homeTimeouts.textContent = state.home.timeoutsRemaining || 0;
      els.awayTimeouts.textContent = state.away.timeoutsRemaining || 0;
      els.homeTimeouts.className = 'stat-value';
      els.awayTimeouts.className = 'stat-value';
    }

    // Bonus indicators
    els.homeBonus.className = state.home.inBonus ? 'bonus-indicator active' : 'bonus-indicator';
    els.awayBonus.className = state.away.inBonus ? 'bonus-indicator active' : 'bonus-indicator';

    // Foul color
    els.homeFouls.className = state.home.inBonus ? 'stat-value text-danger' : 'stat-value text-foul';
    els.awayFouls.className = state.away.inBonus ? 'stat-value text-danger' : 'stat-value text-foul';

    // Clocks
    els.gameClock.textContent = formatTime(state.gameClock);
    els.shotClock.textContent = formatShotClock(state.shotClock);

    if (state.gameClock <= 60) {
      els.gameClock.className = 'clock-digit game-clock text-danger';
    } else {
      els.gameClock.className = 'clock-digit game-clock text-clock';
    }

    if (state.shotClock <= 5) {
      els.shotClock.className = 'clock-digit shot-clock text-danger shotclock-warning';
    } else {
      els.shotClock.className = 'clock-digit shot-clock text-shotclock';
    }

    // Status
    els.statusText.textContent = getStatusText(state.status);

    // Timeout display (all types)
    if (state.timeoutType && state.timeoutClock > 0) {
      els.officialTimeoutDisplay.className = 'official-timeout-display active';
      els.officialTimeoutLabel.textContent = getTimeoutTypeText(state);
      els.officialTimeoutCountdown.textContent = state.timeoutClock;
    } else {
      els.officialTimeoutDisplay.className = 'official-timeout-display';
    }

    const txt = lang === 'en' ? {
      resume: 'Resume',
      pause: 'Pause',
      start: 'Start',
      start_game: 'Start Game'
    } : {
      resume: '恢复比赛',
      pause: '暂停',
      start: '开始',
      start_game: '开始比赛'
    };

    // Main action button (handles: 开始比赛 / 暂停 / 恢复比赛)
    const timeoutActive = state.timeoutType && state.timeoutClock > 0;
    const timeoutEnded = state.timeoutType && state.timeoutClock === 0 && state.status === 'paused';

    if (timeoutActive || timeoutEnded) {
      els.mainActionBtn.className = 'btn btn-timer';
      els.mainActionBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>${txt.resume}</span>
      `;
      els.officialTimeoutBtn.style.display = state.ruleSet === 'nba' ? 'flex' : 'none';
    } else if (state.status === 'running') {
      els.mainActionBtn.className = 'btn btn-timer paused';
      els.mainActionBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        <span>${txt.pause}</span>
      `;
      els.officialTimeoutBtn.style.display = state.ruleSet === 'nba' ? 'flex' : 'none';
    } else if (state.status === 'not_started') {
      els.mainActionBtn.className = 'btn btn-timer';
      els.mainActionBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>${txt.start_game}</span>
      `;
      els.officialTimeoutBtn.style.display = 'none';
    } else {
      els.mainActionBtn.className = 'btn btn-timer';
      els.mainActionBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>${txt.start}</span>
      `;
      els.officialTimeoutBtn.style.display = 'none';
    }

    // Period
    els.periodLabel.textContent = period;

    // Update timeout button disabled state (rule-aware)
    const homeTimeoutBtn = document.querySelector('[data-action="timeout"][data-team="home"]');
    const awayTimeoutBtn = document.querySelector('[data-action="timeout"][data-team="away"]');

    if (homeTimeoutBtn) {
      homeTimeoutBtn.disabled = !store.canTakeTimeout('home');
    }
    if (awayTimeoutBtn) {
      awayTimeoutBtn.disabled = !store.canTakeTimeout('away');
    }

    // Operation log
    if (els.operationLogList && state.operationLog) {
      els.operationLogList.innerHTML = state.operationLog.map(log =>
        `<div class="operation-log-item"><span class="log-time">${log.time}</span>${log.description}</div>`
      ).join('');
      els.operationLogList.scrollTop = els.operationLogList.scrollHeight;
    }
  }

  // Initial render
  render(store.state);
  store.subscribe(render);

  // Team name editing
  function setupNameEditing(element, team) {
    element.addEventListener('click', () => {
      const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
      const currentName = store.state[team].name || getDefaultTeamName(team, lang);
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentName;
      input.className = 'team-name-input';
      input.style.color = team === 'home' ? 'var(--color-home)' : 'var(--color-away)';
      element.replaceWith(input);
      input.focus();
      input.select();

      const save = () => {
        const newName = input.value.trim() || currentName;
        store.setTeamName(team, newName);
        const newEl = document.createElement('div');
        newEl.className = `team-name ${team === 'home' ? 'text-home' : 'text-away'}`;
        newEl.id = element.id;
        newEl.textContent = newName;
        input.replaceWith(newEl);
        setupNameEditing(newEl, team);
      };

      input.addEventListener('blur', save);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') { input.value = currentName; save(); }
      });
    });
  }

  setupNameEditing(els.homeName, 'home');
  setupNameEditing(els.awayName, 'away');

  // Main action button (开始比赛 / 暂停 / 恢复比赛)
  els.mainActionBtn.addEventListener('click', () => {
    const s = store.state;
    if (s.timeoutType && (s.timeoutClock > 0 || s.status === 'paused')) {
      store.resumeFromTimeout();
    } else if (s.status === 'running') {
      store.toggleTimer();
    } else {
      store.toggleTimer();
    }
  });

  // Official timeout button (only visible when game is running)
  els.officialTimeoutBtn.addEventListener('click', () => {
    store.callOfficialTimeout(60);
  });

  // Reset game clock
  document.getElementById('resetClockBtn').addEventListener('click', () => {
    store.resetGameClock();
  });

  // Reset shot clock 24s
  document.getElementById('resetShotClockBtn').addEventListener('click', () => {
    store.resetShotClock();
  });

  // Reset shot clock 14s
  document.getElementById('resetShotClock14Btn').addEventListener('click', () => {
    store.resetShotClockTo(14);
  });

  // Previous period
  document.getElementById('prevPeriodBtn').addEventListener('click', () => {
    store.prevPeriod();
  });

  // Next period
  document.getElementById('nextPeriodBtn').addEventListener('click', () => {
    store.nextPeriod();
  });

  // Reset game
  document.getElementById('resetGameBtn').addEventListener('click', () => {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const confirmMsg = lang === 'en' ? 'Are you sure you want to reset the game? All data will be cleared.' : '确定要重置比赛吗？所有数据将被清除。';
    if (confirm(confirmMsg)) {
      store.initGame();
    }
  });

  // Open display panel in new tab
  document.getElementById('openDisplayBtn').addEventListener('click', () => {
    window.open('display.html', '_blank');
  });

  // Score buttons
  document.querySelectorAll('.btn-score').forEach(btn => {
    btn.addEventListener('click', () => {
      store.addScore(btn.dataset.team, parseInt(btn.dataset.points));
    });
  });

  // Subtract score
  document.querySelectorAll('[data-action="subtract"]').forEach(btn => {
    btn.addEventListener('click', () => {
      store.subtractScore(btn.dataset.team, 1);
    });
  });

  // Fouls
  document.querySelectorAll('[data-action="addFoul"]').forEach(btn => {
    btn.addEventListener('click', () => { store.addFoul(btn.dataset.team); });
  });

  document.querySelectorAll('[data-action="subFoul"]').forEach(btn => {
    btn.addEventListener('click', () => { store.subtractFoul(btn.dataset.team); });
  });

  // Timeouts (FIBA: 60s unified, NBA: 75s unified)
  document.querySelectorAll('[data-action="timeout"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const team = btn.dataset.team;
      if (!store.canTakeTimeout(team)) {
        const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
        const alertMsg = lang === 'en' ? 'Cannot request timeout' : '无法请求暂停';
        alert(alertMsg);
        return;
      }
      store.setTimeout(team);
    });
  });

  document.querySelectorAll('[data-action="undoTimeout"]').forEach(btn => {
    btn.addEventListener('click', () => { store.undoTimeout(btn.dataset.team); });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const s = store.state;

    if (e.code === 'Space') {
      e.preventDefault();

      if (s.timeoutType && (s.timeoutClock > 0 || s.status === 'paused')) {
        store.resumeFromTimeout();
      }
      else if (s.status === 'running') {
        store.toggleTimer();
      }
      else {
        store.toggleTimer();
      }
    }

    if (e.code === 'Digit1' && !e.shiftKey) {
      e.preventDefault();
      store.addScore('home', 1);
    }
    if (e.code === 'Digit2' && !e.shiftKey) {
      e.preventDefault();
      store.addScore('home', 2);
    }
    if (e.code === 'Digit3' && !e.shiftKey) {
      e.preventDefault();
      store.addScore('home', 3);
    }

    if (e.code === 'Digit1' && e.shiftKey) {
      e.preventDefault();
      store.addScore('away', 1);
    }
    if (e.code === 'Digit2' && e.shiftKey) {
      e.preventDefault();
      store.addScore('away', 2);
    }
    if (e.code === 'Digit3' && e.shiftKey) {
      e.preventDefault();
      store.addScore('away', 3);
    }
  });
});