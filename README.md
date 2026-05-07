<br />

# 篮球比赛计分板 | Basketball Scoreboard

[中文](#中文) | [English](#english)

***

## 中文

专业的篮球比赛计分系统，支持 FIBA 国际篮联和 NBA 美国职篮两种规则。采用纯前端实现，无需后端服务器，可直接在浏览器中运行。
<img width="2560" height="1356" alt="图像2026-5-8 00 11" src="https://github.com/user-attachments/assets/0104a535-9181-41ac-8682-d2ba2755a604" />
<img width="2560" height="1354" alt="图像2026-5-8 00 18" src="https://github.com/user-attachments/assets/2981e18d-9582-48eb-892c-b2d04f7f5fb4" />
<img width="2560" height="1356" alt="图像2026-5-8 00 19" src="https://github.com/user-attachments/assets/49968f18-3e4b-4aca-883c-42c3a9bdfec3" />
<img width="2560" height="1356" alt="图像2026-5-8 00 20" src="https://github.com/user-attachments/assets/f981bb37-cea0-431f-847b-356901794c65" />

### 功能特性

#### 🎯 双规则支持

- **FIBA 规则**：每节 10 分钟，加时赛 5 分钟
- **NBA 规则**：每节 12 分钟，加时赛 5 分钟
- 包含各规则特有的暂停次数限制和最后几分钟规则

#### 🖥️ 双面板设计

- **操作面板**：裁判/计分员使用，提供完整的比赛控制功能
- **展示面板**：大字显示，专为观众/球员设计，可在投影或大屏上展示
- 两个面板可在不同浏览器窗口同时打开，数据实时同步

#### ⌨️ 键盘快捷键

| 快捷键               | 功能              |
| ----------------- | --------------- |
| `Space`           | 开始/暂停/恢复比赛      |
| `1` / `2` / `3`   | 主队得分 (+1/+2/+3) |
| `Shift` + `1/2/3` | 客队得分 (+1/+2/+3) |

#### 🎨 界面功能

- 深色/浅色主题切换
- 进攻时钟 (24秒/14秒)
- 犯规次数与罚球提示
- 暂停次数管理
- 操作记录日志
- 官方暂停支持 (NBA)

#### 🔄 跨标签页同步

使用 BroadcastChannel API 和 localStorage 实现多标签页实时同步，打开展示面板即可自动接收操作面板的更新。

### 快速开始

直接用浏览器打开 `index.html` 文件即可使用。

### 使用说明

#### 1. 选择规则

打开首页后，选择 **FIBA** 或 **NBA** 规则作为比赛标准。

#### 2. 打开操作面板

点击「操作面板」卡片进入计分员控制界面。在此可以：

- 开始/暂停比赛
- 切换比赛节次 (Q1-Q4, 加时赛)
- 为主队/客队增减分数
- 管理犯规次数
- 请求/撤销暂停
- 重置比赛时钟和进攻时钟

#### 3. 打开展示面板

点击「展示面板」卡片进入大屏显示界面。将此界面投影或全屏显示，供观众和球员观看。

#### 4. 双屏协作

在不同浏览器窗口中分别打开操作面板和展示面板，两者会自动同步数据。

### 规则对比

| 项目    | FIBA  | NBA   |
| ----- | ----- | ----- |
| 每节时长  | 10 分钟 | 12 分钟 |
| 加时赛时长 | 5 分钟  | 5 分钟  |
| 暂停时长  | 60 秒  | 75 秒  |
| 上半场暂停 | 2 次   | -     |
| 下半场暂停 | 3 次   | -     |
| 全场暂停  | -     | 7 次   |
| 加时赛暂停 | 1 次   | 2 次   |
| 第5次犯规 | 开始罚球  | 开始罚球  |

### 文件结构

```
basketball-scoreboard-static/
├── index.html          # 首页/规则选择
├── operator.html       # 操作面板
├── display.html        # 展示面板
├── css/
│   └── style.css       # 样式文件
└── js/
    ├── gameStore.js    # 游戏状态管理核心
    ├── operator.js     # 操作面板逻辑
    └── display.js      # 展示面板逻辑
```

### 技术实现

- **状态管理**：使用发布-订阅模式，通过 BroadcastChannel 实现跨标签页同步
- **数据持久化**：localStorage 保存比赛状态和用户偏好
- **响应式设计**：CSS Grid + Flexbox + clamp() 实现流畅的跨设备适配
- **主题系统**：CSS 自定义属性 (CSS Variables) 支持深色/浅色主题
- **字体**：Inter (UI) + JetBrains Mono (数字显示)

### 浏览器兼容

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

> 注意：BroadcastChannel API 需要现代浏览器支持。如需在极老版本浏览器使用，可考虑使用 localStorage 事件作为降级方案。

***

## English

Professional basketball scoreboard system supporting both FIBA and NBA rulesets. Pure frontend implementation, no backend server required - runs directly in your browser.

### Features

#### 🎯 Dual Rulesets

- **FIBA Rules**: 10-minute quarters, 5-minute overtime
- **NBA Rules**: 12-minute quarters, 5-minute overtime
- Includes ruleset-specific timeout limits and final minute rules

#### 🖥️ Dual Panel Design

- **Operator Panel**: For referees/scorekeepers, complete game control
- **Display Panel**: Large format display for audience/players, works on projectors or big screens
- Panels can be opened in separate browser windows with real-time sync

#### ⌨️ Keyboard Shortcuts

| Shortcut          | Action                     |
| ----------------- | -------------------------- |
| `Space`           | Start/Pause/Resume game    |
| `1` / `2` / `3`   | Home team score (+1/+2/+3) |
| `Shift` + `1/2/3` | Away team score (+1/+2/+3) |

#### 🎨 Interface Features

- Dark/Light theme toggle
- Shot clock (24s/14s)
- Foul count & bonus indicator
- Timeout management
- Action log
- Official timeout support (NBA)

#### 🔄 Cross-Tab Sync

Uses BroadcastChannel API and localStorage for real-time multi-tab synchronization. Open the display panel to automatically receive updates from the operator panel.

### Quick Start

Simply open `index.html` in your browser.

### Usage Guide

#### 1. Select Ruleset

After opening the home page, select **FIBA** or **NBA** rules as the game standard.

#### 2. Open Operator Panel

Click the "Operator Panel" card to enter the scorekeeper control interface. Here you can:

- Start/Pause the game
- Switch periods (Q1-Q4, Overtime)
- Add/remove points for home/away teams
- Manage foul counts
- Request/cancel timeouts
- Reset game clock and shot clock

#### 3. Open Display Panel

Click the "Display Panel" card to enter the large-format display interface. Project or fullscreen this interface for audience and players to view.

#### 4. Dual-Screen Workflow

Open operator panel and display panel in separate browser windows - they will automatically sync data.

### Rules Comparison

| Item               | FIBA         | NBA          |
| ------------------ | ------------ | ------------ |
| Quarter Length     | 10 min       | 12 min       |
| Overtime Length    | 5 min        | 5 min        |
| Timeout Length     | 60 sec       | 75 sec       |
| 1st Half Timeouts  | 2            | -            |
| 2nd Half Timeouts  | 3            | -            |
| Full Game Timeouts | -            | 7            |
| Overtime Timeouts  | 1            | 2            |
| 5th Foul           | Bonus begins | Bonus begins |

### File Structure

```
basketball-scoreboard-static/
├── index.html          # Home / Rules Selection
├── operator.html       # Operator Panel
├── display.html        # Display Panel
├── css/
│   └── style.css       # Stylesheet
└── js/
    ├── gameStore.js    # Game state management core
    ├── operator.js     # Operator panel logic
    └── display.js      # Display panel logic
```

### Technical Implementation

- **State Management**: Publish-subscribe pattern with BroadcastChannel for cross-tab sync
- **Data Persistence**: localStorage saves game state and user preferences
- **Responsive Design**: CSS Grid + Flexbox + clamp() for smooth cross-device adaptation
- **Theme System**: CSS custom properties support dark/light themes
- **Fonts**: Inter (UI) + JetBrains Mono (number display)

### Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

> Note: BroadcastChannel API requires modern browsers. For older browsers, consider using localStorage events as a fallback.

#
