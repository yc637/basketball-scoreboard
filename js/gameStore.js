/**
 * Basketball Scoreboard - Game State Manager
 * Uses BroadcastChannel for cross-tab synchronization between operator and display panels
 */

// Rule configurations
const RULE_CONFIGS = {
  fiba: {
    label: 'FIBA',
    quarterDuration: 600,    // 10 minutes
    overtimeDuration: 300,   // 5 minutes
    shotClockDuration: 24,
    teamFoulLimit: 4,        // Team fouls before penalty (bonus)
    playerFoulLimit: 5,      // Player fouls before disqualification
    timeouts: {
      firstHalf: 2,          // 2 timeouts in first half (Q1+Q2)
      secondHalf: 3,         // 3 timeouts in second half (Q3+Q4)
      overtime: 1,           // 1 timeout per overtime
      duration: 60,          // All timeouts are 60 seconds (unified)
      maxLast2MinQ4: 2,      // Max 2 timeouts in last 2 minutes of Q4
    },
    stopClockOnScore: 'last2min_q4_ot',  // only last 2 min of Q4/OT
  },
  nba: {
    label: 'NBA',
    quarterDuration: 720,    // 12 minutes
    overtimeDuration: 300,   // 5 minutes
    shotClockDuration: 24,
    teamFoulLimit: 4,        // Team fouls before penalty (bonus)
    playerFoulLimit: 6,      // Player fouls before disqualification
    timeouts: {
      regulation: 7,         // 7 total timeouts in regulation
      overtime: 2,           // 2 timeouts per overtime
      duration: 75,          // All timeouts are 75 seconds
      maxCarryIntoQ4: 4,     // Max 4 timeouts carried into Q4
      maxLast3MinQ4: 2,      // Max 2 timeouts in last 3 min of Q4
    },
    stopClockOnScore: 'always',  // every score stops clock
  },
};

// Get rule configuration
function getRuleConfig(ruleSet) {
  return RULE_CONFIGS[ruleSet] || RULE_CONFIGS.fiba;
}

// Legacy constants (for backward compatibility, default to FIBA)
const QUARTER_DURATION = RULE_CONFIGS.fiba.quarterDuration;
const OVERTIME_DURATION = RULE_CONFIGS.fiba.overtimeDuration;
const SHOT_CLOCK_DURATION = RULE_CONFIGS.fiba.shotClockDuration;
const TEAM_FOUL_LIMIT = RULE_CONFIGS.fiba.teamFoulLimit;
const PLAYER_FOUL_LIMIT = RULE_CONFIGS.fiba.playerFoulLimit;

// Period labels
function getPeriodLabel(number, isOvertime) {
  const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
  if (isOvertime) {
    return lang === 'en' ? `OT${number - 4}` : `加时${number - 4}`;
  }
  if (lang === 'en') {
    return `Q${number}`;
  }
  const chineseNumbers = ['', '一', '二', '三', '四'];
  return `第${chineseNumbers[number]}节`;
}

function getPeriodDuration(isOvertime, ruleSet = 'fiba') {
  const config = getRuleConfig(ruleSet);
  return isOvertime ? config.overtimeDuration : config.quarterDuration;
}

// Default state
function createDefaultState(ruleSet = 'fiba') {
  const config = getRuleConfig(ruleSet);
  const isNBA = ruleSet === 'nba';
  const isFIBA = ruleSet === 'fiba';
  
  return {
    ruleSet: ruleSet,
    status: 'not_started', // not_started, running, paused, finished
    periodNumber: 1,
    isOvertime: false,
    gameClock: config.quarterDuration,
    shotClock: config.shotClockDuration,
    shotClockActive: false,
    possession: 'home',
    // Timeout tracking
    timeoutType: null, // 'official' (官方暂停), 'full' (NBA全场暂停/FIBA长暂停), 'short' (NBA短暂停/FIBA短暂停)
    timeoutClock: 0, // Countdown timer for current timeout (in seconds)
    timeoutTeam: null, // 'home', 'away', or null for official timeout
    // Operation log
    operationLog: [], // Array of {time, action, description}
    home: {
      name: '',
      score: 0,
      fouls: 0,          // Current quarter team fouls
      foulsQ1: 0,        // Q1 fouls
      foulsQ2: 0,        // Q2 fouls
      foulsQ3: 0,        // Q3 fouls
      foulsQ4: 0,        // Q4 fouls
      foulsOT: 0,        // Overtime fouls
      // FIBA: first half / second half / overtime timeout tracking
      timeoutsFirstHalfRemaining: isFIBA ? config.timeouts.firstHalf : null,
      timeoutsSecondHalfRemaining: isFIBA ? config.timeouts.secondHalf : null,
      timeoutsOvertimeRemaining: isFIBA ? config.timeouts.overtime : null,
      timeoutsUsedLast2MinQ4: isFIBA ? 0 : null,
      // NBA: regulation and overtime timeout tracking
      timeoutsRegulationRemaining: isNBA ? config.timeouts.regulation : null,
      timeoutsOvertimeRemaining: isNBA ? config.timeouts.overtime : null,
      timeoutsUsedLast3MinQ4: isNBA ? 0 : null,
      // Legacy field (for backward compatibility)
      timeoutsRemaining: null,
      inBonus: false,    // Whether opponent is in bonus (penalty) situation
    },
    away: {
      name: '',
      score: 0,
      fouls: 0,
      foulsQ1: 0,
      foulsQ2: 0,
      foulsQ3: 0,
      foulsQ4: 0,
      foulsOT: 0,
      timeoutsFirstHalfRemaining: isFIBA ? config.timeouts.firstHalf : null,
      timeoutsSecondHalfRemaining: isFIBA ? config.timeouts.secondHalf : null,
      timeoutsOvertimeRemaining: isFIBA ? config.timeouts.overtime : null,
      timeoutsUsedLast2MinQ4: isFIBA ? 0 : null,
      timeoutsRegulationRemaining: isNBA ? config.timeouts.regulation : null,
      timeoutsOvertimeRemaining: isNBA ? config.timeouts.overtime : null,
      timeoutsUsedLast3MinQ4: isNBA ? 0 : null,
      timeoutsRemaining: null,
      inBonus: false,
    },
  };
}

// Storage key
const STORAGE_KEY = 'basketball_scoreboard_state';
const THEME_KEY = 'basketball_scoreboard_theme';

// Theme management
function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
  // Broadcast theme change
  try {
    const channel = new BroadcastChannel('scoreboard_theme');
    channel.postMessage(theme);
    channel.close();
  } catch (e) {}
}

// Apply theme on load
document.documentElement.setAttribute('data-theme', getTheme());

// Listen for theme changes from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === THEME_KEY && e.newValue) {
    document.documentElement.setAttribute('data-theme', e.newValue);
  }
});

try {
  const themeChannel = new BroadcastChannel('scoreboard_theme');
  themeChannel.onmessage = (event) => {
    document.documentElement.setAttribute('data-theme', event.data);
    localStorage.setItem(THEME_KEY, event.data);
  };
} catch (e) {}

// GameStore class
class GameStore {
  constructor(enableTimers = false) {
    this.state = this.loadState();
    this.listeners = new Set();
    this.channel = new BroadcastChannel('scoreboard_sync');

    // Listen for cross-tab updates
    this.channel.onmessage = (event) => {
      this.state = event.data;
      this.notifyListeners();
    };

    // Start timers only if enabled (should be true only for operator panel)
    if (enableTimers) {
      this.startTimers();
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        // Migration: if ruleSet is missing, default to 'fiba'
        if (!state.ruleSet) {
          state.ruleSet = 'fiba';
        }
        
        // Check if URL has a different ruleset parameter
        // If so, create a new state with the URL's ruleset
        try {
          const params = new URLSearchParams(window.location.search);
          const urlRuleSet = params.get('ruleset');
          if (urlRuleSet && urlRuleSet !== state.ruleSet) {
            // URL has a different ruleset, return new default state with URL's ruleset
            return createDefaultState(urlRuleSet);
          }
        } catch (e) {
          // Ignore URL search parsing errors (e.g., non-browser environment)
        }
        
        return state;
      }
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
    return createDefaultState();
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }

  broadcastState() {
    try {
      this.channel.postMessage(this.state);
    } catch (e) {
      console.warn('Failed to broadcast state:', e);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  update(updater) {
    this.state = updater({ ...this.state });
    this.saveState();
    this.broadcastState();
    this.notifyListeners();
  }

  // Actions
  initGame() {
    const ruleSet = localStorage.getItem('basketball_scoreboard_ruleset') || 'fiba';
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const initMsg = lang === 'en' ? `Game initialized (${getRuleConfig(ruleSet).label} rules)` : `比赛初始化 (${getRuleConfig(ruleSet).label}规则)`;
    this.update((state) => {
      const newState = createDefaultState(ruleSet);
      newState.operationLog = [{
        time: new Date().toLocaleTimeString(lang === 'en' ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        action: 'init',
        description: initMsg
      }];
      return newState;
    });
  }

  // Log an operation
  logOperation(state, action, description) {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const logEntry = {
      time: new Date().toLocaleTimeString(lang === 'en' ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      action,
      description
    };
    state.operationLog.push(logEntry);
    // Keep only last 50 operations
    if (state.operationLog.length > 50) {
      state.operationLog = state.operationLog.slice(-50);
    }
  }

  setTeamName(team, name) {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const teamLabel = lang === 'en' ? (team === 'home' ? 'Home' : 'Away') : (team === 'home' ? '主队' : '客队');
    const editTxt = lang === 'en' ? 'Edit' : '修改';
    const nameTxt = lang === 'en' ? 'name' : '队名';
    this.update((state) => {
      state[team].name = name;
      this.logOperation(state, 'edit', `${editTxt}${teamLabel}${nameTxt}`);
      return state;
    });
  }

  toggleTimer() {
    if (this.state.timeoutType && this.state.timeoutClock > 0) return;
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const txt = lang === 'en' ? { start: 'Start game', resume: 'Resume game', pause: 'Pause game' } : { start: '开始比赛', resume: '继续比赛', pause: '暂停比赛' };
    this.update((state) => {
      const oldStatus = state.status;
      const newStatus = oldStatus === 'running' ? 'paused' : 'running';
      state.status = newStatus;
      state.shotClockActive = newStatus === 'running';
      if (newStatus === 'running' && oldStatus === 'not_started') {
        this.logOperation(state, 'start', txt.start);
      } else if (newStatus === 'running') {
        this.logOperation(state, 'start', txt.resume);
      } else {
        this.logOperation(state, 'pause', txt.pause);
      }
      return state;
    });
  }

  resetGameClock() {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const msg = lang === 'en' ? 'Reset game clock' : '重置比赛时钟';
    this.update((state) => {
      state.gameClock = getPeriodDuration(state.isOvertime, state.ruleSet);
      this.logOperation(state, 'reset', msg);
      return state;
    });
  }

  resetShotClock() {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const msg = lang === 'en' ? 'Reset shot clock 24s' : '重置进攻24秒';
    this.update((state) => {
      state.shotClock = SHOT_CLOCK_DURATION;
      if (state.status === 'running') {
        state.shotClockActive = true;
      }
      this.logOperation(state, 'reset', msg);
      return state;
    });
  }

  resetShotClockTo(seconds) {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const msg = lang === 'en' ? `Reset shot clock ${seconds}s` : `重置进攻${seconds}秒`;
    this.update((state) => {
      state.shotClock = seconds;
      if (state.status === 'running') {
        state.shotClockActive = true;
      }
      this.logOperation(state, 'reset', msg);
      return state;
    });
  }

  addScore(team, points) {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const teamLabel = lang === 'en' ? (team === 'home' ? 'Home' : 'Away') : (team === 'home' ? '主队' : '客队');
    this.update((state) => {
      state[team].score += points;
      const teamName = state[team].name || teamLabel;
      const scoreMsg = lang === 'en' ? `${teamName} +${points} points` : `${teamName} +${points}分`;
      this.logOperation(state, 'score', scoreMsg);
      
      const shouldStopClock = this.shouldStopClockAfterScore(state);
      if (shouldStopClock && state.status === 'running') {
        state.status = 'paused';
        state.shotClockActive = false;
        const stopMsg = lang === 'en' ? 'Clock stopped after score' : '得分后停表';
        this.logOperation(state, 'pause', stopMsg);
      }
      
      return state;
    });
  }

  // Check if game clock should stop after score (rule-aware)
  shouldStopClockAfterScore(state) {
    if (state.status !== 'running') return false;
    
    const config = getRuleConfig(state.ruleSet);
    
    if (config.stopClockOnScore === 'always') {
      // NBA: every score stops clock
      return true;
    }
    
    if (config.stopClockOnScore === 'last2min_q4_ot') {
      // FIBA: only last 2 minutes of Q4/OT
      const gameClock = state.gameClock;
      const isFourthQuarter = state.periodNumber === 4 && !state.isOvertime;
      const isOvertime = state.isOvertime;
      
      // Q4 last 2 minutes (120 seconds)
      if (isFourthQuarter && gameClock <= 120) {
        return true;
      }
      
      // OT last 2 minutes (120 seconds)
      if (isOvertime && gameClock <= 120) {
        return true;
      }
    }
    
    return false;
  }

  subtractScore(team, points) {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const teamLabel = lang === 'en' ? (team === 'home' ? 'Home' : 'Away') : (team === 'home' ? '主队' : '客队');
    this.update((state) => {
      const oldScore = state[team].score;
      state[team].score = Math.max(0, oldScore - points);
      const teamName = state[team].name || teamLabel;
      const msg = lang === 'en' ? `${teamName} -${points} points` : `${teamName} -${points}分`;
      this.logOperation(state, 'undo', msg);
      return state;
    });
  }

  addFoul(team) {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const teamLabel = lang === 'en' ? (team === 'home' ? 'Home' : 'Away') : (team === 'home' ? '主队' : '客队');
    const foulTxt = lang === 'en' ? 'foul' : '犯规';
    this.update((state) => {
      state[team].fouls += 1;

      const periodKey = state.isOvertime ? 'foulsOT' : `foulsQ${state.periodNumber}`;
      if (state[team][periodKey] !== undefined) {
        state[team][periodKey] += 1;
      }

      const config = getRuleConfig(state.ruleSet);
      const opponent = team === 'home' ? 'away' : 'home';
      state[opponent].inBonus = state[team].fouls > config.teamFoulLimit;

      const teamName = state[team].name || teamLabel;
      const msg = lang === 'en' ? `${teamName} ${foulTxt} (${state[team].fouls})` : `${teamName} ${foulTxt} (${state[team].fouls})`;
      this.logOperation(state, 'foul', msg);

      return state;
    });
  }

  subtractFoul(team) {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const teamLabel = lang === 'en' ? (team === 'home' ? 'Home' : 'Away') : (team === 'home' ? '主队' : '客队');
    const foulTxt = lang === 'en' ? 'foul' : '犯规';
    const undoTxt = lang === 'en' ? 'Undo' : '撤销';
    this.update((state) => {
      if (state[team].fouls <= 0) return state;

      state[team].fouls -= 1;

      const periodKey = state.isOvertime ? 'foulsOT' : `foulsQ${state.periodNumber}`;
      if (state[team][periodKey] !== undefined && state[team][periodKey] > 0) {
        state[team][periodKey] -= 1;
      }

      const config = getRuleConfig(state.ruleSet);
      const opponent = team === 'home' ? 'away' : 'home';
      state[opponent].inBonus = state[team].fouls > config.teamFoulLimit;

      const teamName = state[team].name || teamLabel;
      const msg = lang === 'en' ? `${teamName} ${undoTxt} ${foulTxt} (${state[team].fouls})` : `${teamName} ${undoTxt}${foulTxt} (${state[team].fouls})`;
      this.logOperation(state, 'undo', msg);

      return state;
    });
  }

  // Check if team can take a timeout (rule-aware)
  canTakeTimeout(team) {
    const state = this.state;
    const config = getRuleConfig(state.ruleSet);
    
    // FIBA: official timeout rule check
    if (state.ruleSet === 'fiba') {
      // Determine which half/period we're in
      if (state.isOvertime) {
        // Overtime: check overtime timeouts
        return (state[team].timeoutsOvertimeRemaining || 0) > 0;
      } else if (state.periodNumber <= 2) {
        // First half (Q1+Q2): check first half timeouts
        return (state[team].timeoutsFirstHalfRemaining || 0) > 0;
      } else if (state.periodNumber === 3) {
        // Q3: check second half timeouts
        return (state[team].timeoutsSecondHalfRemaining || 0) > 0;
      } else if (state.periodNumber === 4) {
        // Q4: check second half timeouts AND last 2 minutes limit
        if ((state[team].timeoutsSecondHalfRemaining || 0) <= 0) return false;
        
        // Check last 2 minutes limit (max 2 timeouts)
        if (state.gameClock <= 120) {
          return (state[team].timeoutsUsedLast2MinQ4 || 0) < config.timeouts.maxLast2MinQ4;
        }
        return true;
      }
      return false;
    }
    
    // NBA: regulation and overtime timeout checks
    if (state.ruleSet === 'nba') {
      if (state.isOvertime) {
        // Overtime: check overtime timeouts (2 per OT)
        return (state[team].timeoutsOvertimeRemaining || 0) > 0;
      }
      
      // Regulation: check total regulation timeouts
      if ((state[team].timeoutsRegulationRemaining || 0) <= 0) return false;
      
      // Check Q4 carry-over limit: max 4 timeouts carried into Q4
      // This is handled in nextPeriod() when entering Q4
      
      // Check last 3 minutes of Q4: max 2 timeouts
      if (state.periodNumber === 4 && !state.isOvertime && state.gameClock <= 180) {
        if ((state[team].timeoutsUsedLast3MinQ4 || 0) >= config.timeouts.maxLast3MinQ4) {
          return false;
        }
      }
      
      return true;
    }
    
    return false;
  }

  // Team timeout (FIBA: unified 60s, NBA: regulation/overtime 75s)
  setTimeout(team) {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    this.update((state) => {
      const config = getRuleConfig(state.ruleSet);
      
      // Check if can take timeout
      if (!this.canTakeTimeout(team)) return state;
      
      if (state.ruleSet === 'fiba') {
        // FIBA: deduct from appropriate timeout pool based on period
        if (state.isOvertime) {
          state[team].timeoutsOvertimeRemaining -= 1;
        } else if (state.periodNumber <= 2) {
          // First half (Q1+Q2)
          state[team].timeoutsFirstHalfRemaining -= 1;
        } else {
          // Second half (Q3+Q4)
          state[team].timeoutsSecondHalfRemaining -= 1;
          
          // Track last 2 minutes of Q4 usage
          if (state.periodNumber === 4 && state.gameClock <= 120) {
            state[team].timeoutsUsedLast2MinQ4 = (state[team].timeoutsUsedLast2MinQ4 || 0) + 1;
          }
        }
      } else {
        // NBA: deduct from regulation or overtime pool
        if (state.isOvertime) {
          state[team].timeoutsOvertimeRemaining -= 1;
        } else {
          state[team].timeoutsRegulationRemaining -= 1;
          
          // Track last 3 minutes of Q4 usage
          if (state.periodNumber === 4 && state.gameClock <= 180) {
            state[team].timeoutsUsedLast3MinQ4 = (state[team].timeoutsUsedLast3MinQ4 || 0) + 1;
          }
        }
      }
      
      state.status = 'paused';
      state.shotClockActive = false;
      state.timeoutType = 'full';
      state.timeoutClock = config.timeouts.duration;
      state.timeoutTeam = team;
      
      const teamName = state[team].name || (lang === 'en' ? (team === 'home' ? 'Home' : 'Away') : (team === 'home' ? '主队' : '客队'));
      const timeoutTxt = lang === 'en' ? 'Timeout' : '暂停';
      this.logOperation(state, 'timeout', `${teamName} ${timeoutTxt}`);
      return state;
    });
  }

  // Short timeout (FIBA: unified 60s same as long timeout, NBA: 75s unified)
  setShortTimeout(team) {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    this.update((state) => {
      const config = getRuleConfig(state.ruleSet);
      
      // Check if can take timeout
      if (!this.canTakeTimeout(team)) return state;
      
      if (state.ruleSet === 'fiba') {
        // FIBA: short timeout uses same pool and duration as long timeout (60s unified)
        if (state.isOvertime) {
          state[team].timeoutsOvertimeRemaining -= 1;
        } else if (state.periodNumber <= 2) {
          state[team].timeoutsFirstHalfRemaining -= 1;
        } else {
          state[team].timeoutsSecondHalfRemaining -= 1;
          
          if (state.periodNumber === 4 && state.gameClock <= 120) {
            state[team].timeoutsUsedLast2MinQ4 = (state[team].timeoutsUsedLast2MinQ4 || 0) + 1;
          }
        }
      } else {
        // NBA: short timeout uses same pool as long timeout (75s unified)
        if (state.isOvertime) {
          state[team].timeoutsOvertimeRemaining -= 1;
        } else {
          state[team].timeoutsRegulationRemaining -= 1;
          
          if (state.periodNumber === 4 && state.gameClock <= 180) {
            state[team].timeoutsUsedLast3MinQ4 = (state[team].timeoutsUsedLast3MinQ4 || 0) + 1;
          }
        }
      }
      
      state.status = 'paused';
      state.shotClockActive = false;
      state.timeoutType = 'short';
      state.timeoutClock = config.timeouts.duration;
      state.timeoutTeam = team;
      
      const teamName = state[team].name || (lang === 'en' ? (team === 'home' ? 'Home' : 'Away') : (team === 'home' ? '主队' : '客队'));
      const timeoutTxt = lang === 'en' ? 'Timeout' : '暂停';
      this.logOperation(state, 'timeout', `${teamName} ${timeoutTxt}`);
      return state;
    });
  }

  undoTimeout(team) {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    this.update((state) => {
      const config = getRuleConfig(state.ruleSet);
      
      if (state.ruleSet === 'fiba') {
        // FIBA: undo based on which half/period the timeout was taken
        if (state.isOvertime) {
          if ((state[team].timeoutsOvertimeRemaining || 0) >= config.timeouts.overtime) return state;
          state[team].timeoutsOvertimeRemaining = (state[team].timeoutsOvertimeRemaining || 0) + 1;
        } else if (state.periodNumber <= 2) {
          if ((state[team].timeoutsFirstHalfRemaining || 0) >= config.timeouts.firstHalf) return state;
          state[team].timeoutsFirstHalfRemaining = (state[team].timeoutsFirstHalfRemaining || 0) + 1;
        } else {
          if ((state[team].timeoutsSecondHalfRemaining || 0) >= config.timeouts.secondHalf) return state;
          state[team].timeoutsSecondHalfRemaining = (state[team].timeoutsSecondHalfRemaining || 0) + 1;
          
          // Decrement last 2 minutes Q4 counter if applicable
          if (state.periodNumber === 4 && state.gameClock <= 120) {
            state[team].timeoutsUsedLast2MinQ4 = Math.max(0, (state[team].timeoutsUsedLast2MinQ4 || 0) - 1);
          }
        }
      } else {
        // NBA: undo based on regulation/overtime
        if (state.isOvertime) {
          if ((state[team].timeoutsOvertimeRemaining || 0) >= config.timeouts.overtime) return state;
          state[team].timeoutsOvertimeRemaining = (state[team].timeoutsOvertimeRemaining || 0) + 1;
        } else {
          if ((state[team].timeoutsRegulationRemaining || 0) >= config.timeouts.regulation) return state;
          state[team].timeoutsRegulationRemaining = (state[team].timeoutsRegulationRemaining || 0) + 1;
          
          // Decrement last 3 minutes Q4 counter if applicable
          if (state.periodNumber === 4 && state.gameClock <= 180) {
            state[team].timeoutsUsedLast3MinQ4 = Math.max(0, (state[team].timeoutsUsedLast3MinQ4 || 0) - 1);
          }
        }
      }
      
      // If this was the active timeout, clear it
      if (state.timeoutTeam === team) {
        state.timeoutType = null;
        state.timeoutClock = 0;
        state.timeoutTeam = null;
      }
      
      const teamName = state[team].name || (lang === 'en' ? (team === 'home' ? 'Home' : 'Away') : (team === 'home' ? '主队' : '客队'));
      const undoTxt = lang === 'en' ? 'Undo timeout' : '撤销暂停';
      this.logOperation(state, 'undo', `${teamName} ${undoTxt}`);
      return state;
    });
  }

  // Official timeout (60 seconds, used by officials/technicians)
  callOfficialTimeout(duration = 60) {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const officialTxt = lang === 'en' ? 'Official timeout' : '官方暂停';
    this.update((state) => {
      state.status = 'paused';
      state.shotClockActive = false;
      state.timeoutType = 'official';
      state.timeoutClock = duration;
      state.timeoutTeam = null;
      this.logOperation(state, 'timeout', officialTxt);
      return state;
    });
  }

  // Resume game after any timeout
  resumeFromTimeout() {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const resumeTxt = lang === 'en' ? 'Resume game' : '恢复比赛';
    this.update((state) => {
      state.timeoutType = null;
      state.timeoutClock = 0;
      state.timeoutTeam = null;
      state.status = 'running';
      // Reset shot clock to 24 seconds after timeout (FIBA/NBA rule)
      const config = getRuleConfig(state.ruleSet);
      state.shotClock = config.shotClockDuration;
      state.shotClockActive = true;
      this.logOperation(state, 'resume', resumeTxt);
      return state;
    });
  }

  tickTimeout() {
    if (!this.state.timeoutType || this.state.timeoutClock <= 0) return;
    
    this.state.timeoutClock -= 1;
    if (this.state.timeoutClock < 0) {
      this.state.timeoutClock = 0;
    }
    
    if (this.state.timeoutClock <= 0) {
      // Timeout countdown ends, but do NOT auto-resume
      // Keep status as 'paused', wait for user to click "恢复比赛"
      this.state.status = 'paused';
      this.state.shotClockActive = false;
      // Keep timeoutType and timeoutTeam for display purposes
      // User must manually click resume to continue
    }
    this.saveState();
    this.broadcastState();
    this.notifyListeners();
  }

  nextPeriod() {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const startTxt = lang === 'en' ? 'Start' : '开始';
    this.update((state) => {
      const config = getRuleConfig(state.ruleSet);
      let newPeriodNumber = state.periodNumber + 1;
      let newIsOvertime = newPeriodNumber > 4;

      state.periodNumber = newPeriodNumber;
      state.isOvertime = newIsOvertime;
      state.currentPeriod = getPeriodLabel(newPeriodNumber, newIsOvertime);
      state.gameClock = newIsOvertime ? config.overtimeDuration : config.quarterDuration;
      state.shotClock = config.shotClockDuration;
      state.shotClockActive = false;
      state.status = 'not_started';

      state.home.fouls = 0;
      state.away.fouls = 0;
      state.home.inBonus = false;
      state.away.inBonus = false;

      if (state.ruleSet === 'fiba') {
        if (newIsOvertime) {
          state.home.timeoutsOvertimeRemaining = config.timeouts.overtime;
          state.away.timeoutsOvertimeRemaining = config.timeouts.overtime;
        }
        if (newPeriodNumber === 4) {
          state.home.timeoutsUsedLast2MinQ4 = 0;
          state.away.timeoutsUsedLast2MinQ4 = 0;
        }
      }

      if (state.ruleSet === 'nba') {
        if (newPeriodNumber === 4 && !newIsOvertime) {
          state.home.timeoutsRegulationRemaining = Math.min(
            state.home.timeoutsRegulationRemaining || 0,
            config.timeouts.maxCarryIntoQ4
          );
          state.away.timeoutsRegulationRemaining = Math.min(
            state.away.timeoutsRegulationRemaining || 0,
            config.timeouts.maxCarryIntoQ4
          );
          state.home.timeoutsUsedLast3MinQ4 = 0;
          state.away.timeoutsUsedLast3MinQ4 = 0;
        }
        
        if (newIsOvertime) {
          state.home.timeoutsOvertimeRemaining = config.timeouts.overtime;
          state.away.timeoutsOvertimeRemaining = config.timeouts.overtime;
          state.home.timeoutsUsedLast3MinQ4 = 0;
          state.away.timeoutsUsedLast3MinQ4 = 0;
        }
      }

      const periodName = getPeriodLabel(newPeriodNumber, newIsOvertime);
      this.logOperation(state, 'period', `${periodName} ${startTxt}`);

      return state;
    });
  }

  prevPeriod() {
    const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
    const backTxt = lang === 'en' ? 'Back to' : '返回';
    this.update((state) => {
      const config = getRuleConfig(state.ruleSet);
      // Cannot go below period 1
      if (state.periodNumber <= 1) return state;

      let newPeriodNumber = state.periodNumber - 1;
      let newIsOvertime = newPeriodNumber > 4;

      state.periodNumber = newPeriodNumber;
      state.isOvertime = newIsOvertime;
      state.currentPeriod = getPeriodLabel(newPeriodNumber, newIsOvertime);
      state.gameClock = newIsOvertime ? config.overtimeDuration : config.quarterDuration;
      state.shotClock = config.shotClockDuration;
      state.shotClockActive = false;
      state.status = 'not_started';

      state.home.fouls = 0;
      state.away.fouls = 0;
      state.home.inBonus = false;
      state.away.inBonus = false;

      if (state.ruleSet === 'nba') {
        state.home.timeoutsUsedLast3MinQ4 = 0;
        state.away.timeoutsUsedLast3MinQ4 = 0;
      }

      const periodName = getPeriodLabel(newPeriodNumber, newIsOvertime);
      this.logOperation(state, 'period', `${backTxt}${periodName}`);

      return state;
    });
  }

  setPossession(team) {
    this.update((state) => {
      state.possession = team;
      return state;
    });
  }

  tickGameClock() {
    if (this.state.status !== 'running') return;
    const newClock = this.state.gameClock - 1;
    if (newClock < 0) return;

    this.state.gameClock = newClock;
    if (newClock === 0) {
      this.state.status = 'paused';
      this.state.shotClockActive = false;
    }
    this.saveState();
    this.broadcastState();
    this.notifyListeners();
  }

  tickShotClock() {
    if (!this.state.shotClockActive || this.state.status !== 'running') return;
    const newClock = this.state.shotClock - 1;
    if (newClock < 0) return;

    this.state.shotClock = newClock;
    if (newClock === 0) {
      this.state.shotClockActive = false;
    }
    this.saveState();
    this.broadcastState();
    this.notifyListeners();
  }

  startTimers() {
    // Use a precision timer based on wall clock time to avoid setInterval drift
    let lastTick = Date.now();
    let accumulated = 0;

    const TICK_INTERVAL = 100; // Check every 100ms for smooth countdown
    const ONE_SECOND = 1000;

    this._timerId = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;
      accumulated += delta;

      if (accumulated >= ONE_SECOND) {
        const ticks = Math.floor(accumulated / ONE_SECOND);
        accumulated -= ticks * ONE_SECOND;

        for (let i = 0; i < ticks; i++) {
          this.tickGameClock();
          this.tickShotClock();
          this.tickTimeout();
        }
      }
    }, TICK_INTERVAL);
  }

  stopTimers() {
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }
}

// Format helpers
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatShotClock(seconds) {
  return seconds.toString().padStart(2, '0');
}

function getStatusText(status) {
  const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
  const map = {
    'not_started': lang === 'en' ? 'Not Started' : '未开始',
    'running': lang === 'en' ? 'Running' : '进行中',
    'paused': lang === 'en' ? 'Paused' : '暂停',
    'finished': lang === 'en' ? 'Finished' : '已结束',
  };
  return map[status] || '';
}

// Get foul penalty status text for display (rule-aware)
function getFoulStatus(fouls, inBonus, ruleSet = 'fiba') {
  const config = getRuleConfig(ruleSet);
  const limit = config.teamFoulLimit;
  
  if (inBonus) {
    return '罚球';
  }
  if (fouls >= limit) {
    return `${fouls}/${limit + 1}`;
  }
  return `${fouls}/${limit}`;
}

// Get timeout type display text (rule-aware)
function getTimeoutTypeText(state) {
  if (!state.timeoutType) return '';
  
  const lang = localStorage.getItem('basketball_scoreboard_lang') || 'zh';
  const teamLabel = state.timeoutTeam === 'home' ? (lang === 'en' ? 'Home' : '主队') : (lang === 'en' ? 'Away' : '客队');
  
  switch (state.timeoutType) {
    case 'official':
      return lang === 'en' ? 'Official' : '官方暂停';
    case 'long':
    case 'full':
    case 'short':
      return `${teamLabel} ${lang === 'en' ? 'Timeout' : '暂停'}`;
    default:
      return '';
  }
}

// Export singleton
// Only enable timers on operator panel (display panel is read-only)
const isOperatorPanel = document.querySelector('.operator-wrapper') !== null;
const store = new GameStore(isOperatorPanel);

// Export theme helpers
function toggleTheme() {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
}
