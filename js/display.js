/**
 * Display Panel - JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  const els = {
    status: document.getElementById('displayStatus'),
    clock: document.getElementById('displayClock'),
    homeName: document.getElementById('displayHomeName'),
    homeScore: document.getElementById('displayHomeScore'),
    homeFouls: document.getElementById('displayHomeFouls'),
    homeBonus: document.getElementById('displayHomeBonus'),
    homeTimeouts: document.getElementById('displayHomeTimeouts'),
    awayName: document.getElementById('displayAwayName'),
    awayScore: document.getElementById('displayAwayScore'),
    awayFouls: document.getElementById('displayAwayFouls'),
    awayBonus: document.getElementById('displayAwayBonus'),
    awayTimeouts: document.getElementById('displayAwayTimeouts'),
    shotClock: document.getElementById('displayShotClock'),
    periodLabel: document.getElementById('displayPeriodLabel'),
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    displayOfficialTimeout: document.getElementById('displayOfficialTimeout'),
    displayOfficialTimeoutCountdown: document.getElementById('displayOfficialTimeoutCountdown'),
  };

  const sunIcon = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
  const moonIcon = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;

  function updateThemeIcon() {
    const current = getTheme();
    els.themeIcon.innerHTML = current === 'dark' ? sunIcon : moonIcon;
  }

  els.themeToggle.addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });

  updateThemeIcon();

  window.addEventListener('storage', (e) => {
    if (e.key === 'basketball_scoreboard_theme') {
      updateThemeIcon();
    }
  });

  try {
    const themeChannel = new BroadcastChannel('scoreboard_theme');
    themeChannel.onmessage = () => updateThemeIcon();
  } catch (e) {}

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

    // Status
    els.status.textContent = getStatusText(state.status);

    // Clock
    els.clock.textContent = formatTime(state.gameClock);
    if (state.gameClock <= 60) {
      els.clock.className = 'clock-digit display-clock text-danger';
    } else {
      els.clock.className = 'clock-digit display-clock text-clock';
    }

    // Teams - use default name if user hasn't customized
    const homeDisplayName = state.home.name || getDefaultTeamName('home', lang);
    const awayDisplayName = state.away.name || getDefaultTeamName('away', lang);
    els.homeName.textContent = homeDisplayName;
    els.homeScore.textContent = state.home.score;
    els.homeFouls.textContent = state.home.fouls;

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
        els.homeTimeouts.textContent = state.home.timeoutsOvertimeRemaining || 0;
        els.awayTimeouts.textContent = state.away.timeoutsOvertimeRemaining || 0;
      } else {
        els.homeTimeouts.textContent = state.home.timeoutsRegulationRemaining || 0;
        els.awayTimeouts.textContent = state.away.timeoutsRegulationRemaining || 0;
      }
      els.homeTimeouts.className = 'stat-value';
      els.awayTimeouts.className = 'stat-value';
    } else if (state.ruleSet === 'fiba') {
      if (state.isOvertime) {
        els.homeTimeouts.textContent = state.home.timeoutsOvertimeRemaining || 0;
        els.awayTimeouts.textContent = state.away.timeoutsOvertimeRemaining || 0;
      } else if (state.periodNumber <= 2) {
        els.homeTimeouts.textContent = state.home.timeoutsFirstHalfRemaining || 0;
        els.awayTimeouts.textContent = state.away.timeoutsFirstHalfRemaining || 0;
      } else {
        els.homeTimeouts.textContent = state.home.timeoutsSecondHalfRemaining || 0;
        els.awayTimeouts.textContent = state.away.timeoutsSecondHalfRemaining || 0;
      }
      els.homeTimeouts.className = 'stat-value';
      els.awayTimeouts.className = 'stat-value';
    } else {
      els.homeTimeouts.textContent = state.home.timeoutsRemaining || 0;
      els.awayTimeouts.textContent = state.away.timeoutsRemaining || 0;
      els.homeTimeouts.className = 'stat-value';
      els.awayTimeouts.className = 'stat-value';
    }

    els.awayName.textContent = awayDisplayName;
    els.awayScore.textContent = state.away.score;
    els.awayFouls.textContent = state.away.fouls;

    // Bonus indicators
    els.homeBonus.className = state.home.inBonus ? 'bonus-indicator active' : 'bonus-indicator';
    els.awayBonus.className = state.away.inBonus ? 'bonus-indicator active' : 'bonus-indicator';

    // Foul colors
    if (state.home.inBonus) {
      els.homeFouls.className = 'stat-value text-danger';
    } else {
      els.homeFouls.className = 'stat-value text-foul';
    }

    if (state.away.inBonus) {
      els.awayFouls.className = 'stat-value text-danger';
    } else {
      els.awayFouls.className = 'stat-value text-foul';
    }

    // Shot clock
    els.shotClock.textContent = formatShotClock(state.shotClock);
    if (state.shotClock <= 5) {
      els.shotClock.className = 'score-digit value text-danger shotclock-warning';
    } else {
      els.shotClock.className = 'score-digit value text-shotclock';
    }

    // Timeout display (all types)
    if (state.timeoutType && state.timeoutClock > 0) {
      els.displayOfficialTimeout.className = 'display-official-timeout active';
      els.displayOfficialTimeout.querySelector('.display-timeout-label').textContent = getTimeoutTypeText(state);
      els.displayOfficialTimeoutCountdown.textContent = state.timeoutClock;
    } else {
      els.displayOfficialTimeout.className = 'display-official-timeout';
    }

    // Period under game clock
    els.periodLabel.textContent = period;
  }

  // Initial render
  render(store.state);

  // Subscribe to changes (includes cross-tab updates via BroadcastChannel)
  store.subscribe(render);
});