(function () {
  const GAME_MODES = {
    full: { label: "전체 도전", questionCount: 80, timeLimit: null },
    category: { label: "카테고리별 도전", questionCount: 20, timeLimit: null },
    speed: { label: "스피드 퀴즈", questionCount: 20, timeLimit: 15 },
  };

  const HINTS_PER_GAME = 3;

  class ScoreManager {
    calculateScore(isCorrect, timeSpent, consecutiveCorrect, hintUsed) {
      let score = 0;
      if (isCorrect) {
        score += 10; // 기본 점수
        if (timeSpent < 10) score += 3; // 시간 보너스
        if (!hintUsed) score += 2; // 노힌트 보너스
        score += this.getConsecutiveBonus(consecutiveCorrect);
      }
      return score;
    }

    getConsecutiveBonus(consecutiveCorrect) {
      if (consecutiveCorrect >= 5) return 10;
      if (consecutiveCorrect >= 3) return 5;
      return 0;
    }
  }

  const scoreManager = new ScoreManager();
  const dataManager = new LocalDataManager();

  const state = {
    mode: null,
    selectedCategory: null,
    selectedDifficulty: "all",
    leaderboardRange: "daily",
    questions: [],
    currentIndex: 0,
    score: 0,
    correctCount: 0,
    answered: false,
    paused: false,
    streak: 0,
    longestStreak: 0,
    hintsRemaining: HINTS_PER_GAME,
    hintUsedThisQuestion: false,
    elapsed: 0,
    tickInterval: null,
    responseTimes: [],
    categoryStats: {},
  };

  const el = {
    themeToggleBtn: document.getElementById("theme-toggle-btn"),

    modeSelect: document.getElementById("mode-select"),
    categorySelect: document.getElementById("category-select"),
    categoryBackBtn: document.getElementById("category-back-btn"),
    dashboardBtn: document.getElementById("dashboard-btn"),

    nextBtn: document.getElementById("next-btn"),
    restartBtn: document.getElementById("restart-btn"),
    shareBtn: document.getElementById("share-btn"),

    progressFill: document.getElementById("progress-fill"),
    questionCounter: document.getElementById("question-counter"),
    categoryBadge: document.getElementById("category-badge"),
    streakDisplay: document.getElementById("streak-display"),
    scoreDisplay: document.getElementById("score-display"),

    timerDisplay: document.getElementById("timer-display"),
    timerSeconds: document.getElementById("timer-seconds"),

    hintBtn: document.getElementById("hint-btn"),
    hintCount: document.getElementById("hint-count"),
    pauseBtn: document.getElementById("pause-btn"),
    pauseOverlay: document.getElementById("pause-overlay"),
    resumeBtn: document.getElementById("resume-btn"),

    questionText: document.getElementById("question-text"),
    optionsContainer: document.getElementById("options-container"),

    feedback: document.getElementById("feedback"),
    feedbackText: document.getElementById("feedback-text"),
    feedbackExplanation: document.getElementById("feedback-explanation"),

    resultScore: document.getElementById("result-score"),
    resultCorrect: document.getElementById("result-correct"),
    resultAccuracy: document.getElementById("result-accuracy"),
    resultAvgTime: document.getElementById("result-avg-time"),
    resultStreak: document.getElementById("result-streak"),
    resultNewBest: document.getElementById("result-new-best"),
    resultCategoryStats: document.getElementById("result-category-stats"),

    dashboardBackBtn: document.getElementById("dashboard-back-btn"),
    statPlayCount: document.getElementById("stat-play-count"),
    statBestScore: document.getElementById("stat-best-score"),
    dashboardCategoryStats: document.getElementById("dashboard-category-stats"),
    dashboardTrend: document.getElementById("dashboard-trend"),
    dashboardLeaderboard: document.getElementById("dashboard-leaderboard"),
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ===== 사운드 효과 (Web Audio API) =====
  let audioCtx = null;

  function getAudioCtx() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!audioCtx) audioCtx = new AudioCtor();
    return audioCtx;
  }

  function playTone(freq, duration, type) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playCorrectSound() {
    playTone(880, 0.15);
    setTimeout(() => playTone(1175, 0.18), 100);
  }

  function playIncorrectSound() {
    playTone(220, 0.25, "sawtooth");
  }

  // ===== 다크모드 =====
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    el.themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  function initTheme() {
    const prefs = dataManager.getPrefs();
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefs.theme || (prefersDark ? "dark" : "light"));
  }

  function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    const prefs = dataManager.getPrefs();
    prefs.theme = next;
    dataManager.savePrefs(prefs);
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
  }

  function showModeSelect() {
    el.modeSelect.classList.remove("hidden");
    el.categorySelect.classList.add("hidden");
    showScreen("start-screen");
  }

  function startGame(mode, category) {
    const config = GAME_MODES[mode];
    const basePool = QUESTIONS.filter(
      (q) => state.selectedDifficulty === "all" || q.difficulty === state.selectedDifficulty
    );

    let pool;
    if (mode === "category") {
      pool = basePool.filter((q) => q.category === category);
      if (!pool.length) pool = QUESTIONS.filter((q) => q.category === category);
    } else if (mode === "speed") {
      pool = shuffle(basePool.slice()).slice(0, config.questionCount);
    } else {
      pool = basePool.slice(0, config.questionCount);
    }
    if (!pool.length) pool = QUESTIONS.slice(0, config.questionCount);

    initGame(mode, pool, mode === "category" ? category : null);
  }

  function initGame(mode, questions, category) {
    state.mode = mode;
    state.selectedCategory = category;
    state.questions = questions;
    state.currentIndex = 0;
    state.score = 0;
    state.correctCount = 0;
    state.answered = false;
    state.paused = false;
    state.streak = 0;
    state.longestStreak = 0;
    state.hintsRemaining = HINTS_PER_GAME;
    state.hintUsedThisQuestion = false;
    state.elapsed = 0;
    state.responseTimes = [];
    state.categoryStats = {};
    questions.forEach((q) => {
      if (!state.categoryStats[q.category]) {
        state.categoryStats[q.category] = { correct: 0, total: 0 };
      }
    });

    showScreen("quiz-screen");
    loadQuestion();
  }

  function currentModeConfig() {
    return GAME_MODES[state.mode];
  }

  function updateTimerDisplay() {
    const config = currentModeConfig();
    if (config.timeLimit) {
      const remain = Math.max(config.timeLimit - state.elapsed, 0);
      el.timerSeconds.textContent = remain;
      el.timerDisplay.classList.toggle("timer-warning", remain <= 5);
    } else {
      el.timerSeconds.textContent = state.elapsed;
      el.timerDisplay.classList.remove("timer-warning");
    }
  }

  function startTimer() {
    clearInterval(state.tickInterval);
    state.tickInterval = setInterval(() => {
      state.elapsed += 1;
      updateTimerDisplay();
      const config = currentModeConfig();
      if (config.timeLimit && state.elapsed >= config.timeLimit) {
        clearInterval(state.tickInterval);
        handleTimeout();
      }
    }, 1000);
  }

  function handleTimeout() {
    if (state.answered) return;
    handleAnswer(-1);
  }

  function loadQuestion() {
    clearInterval(state.tickInterval);
    state.answered = false;
    state.paused = false;
    state.hintUsedThisQuestion = false;
    state.elapsed = 0;

    el.pauseOverlay.classList.add("hidden");
    el.pauseBtn.disabled = false;
    el.pauseBtn.textContent = "⏸ 일시정지";

    const q = state.questions[state.currentIndex];

    el.questionCounter.textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
    el.categoryBadge.textContent = q.category;
    el.streakDisplay.textContent = `🔥 연속 ${state.streak}`;
    el.scoreDisplay.textContent = `점수: ${state.score}`;
    el.progressFill.style.width = `${(state.currentIndex / state.questions.length) * 100}%`;

    el.hintCount.textContent = state.hintsRemaining;
    el.hintBtn.disabled = state.hintsRemaining === 0;

    el.timerDisplay.classList.remove("hidden");
    updateTimerDisplay();

    el.questionText.textContent = q.question;

    el.optionsContainer.innerHTML = "";
    q.options.forEach((optionText, idx) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.type = "button";
      btn.textContent = optionText;
      btn.addEventListener("click", () => handleAnswer(idx));
      el.optionsContainer.appendChild(btn);
    });

    el.feedback.classList.add("hidden");

    startTimer();
  }

  function useHint() {
    if (state.answered || state.paused) return;
    if (state.hintsRemaining <= 0 || state.hintUsedThisQuestion) return;

    const q = state.questions[state.currentIndex];
    const wrongIndices = q.options
      .map((_, idx) => idx)
      .filter((idx) => idx !== q.correctAnswer);
    const toEliminate = shuffle(wrongIndices).slice(0, 2);

    const buttons = el.optionsContainer.querySelectorAll(".option-btn");
    toEliminate.forEach((idx) => {
      buttons[idx].disabled = true;
      buttons[idx].classList.add("eliminated");
    });

    state.hintsRemaining -= 1;
    state.hintUsedThisQuestion = true;
    el.hintCount.textContent = state.hintsRemaining;
    el.hintBtn.disabled = true;
  }

  function togglePause() {
    if (state.answered) return;
    state.paused = !state.paused;
    if (state.paused) {
      clearInterval(state.tickInterval);
      el.pauseOverlay.classList.remove("hidden");
      el.pauseBtn.textContent = "▶ 재개";
    } else {
      el.pauseOverlay.classList.add("hidden");
      el.pauseBtn.textContent = "⏸ 일시정지";
      startTimer();
    }
  }

  function handleAnswer(selectedIdx) {
    if (state.answered || state.paused) return;
    state.answered = true;
    clearInterval(state.tickInterval);
    el.pauseBtn.disabled = true;

    const q = state.questions[state.currentIndex];
    const isCorrect = selectedIdx === q.correctAnswer;
    const timeSpent = state.elapsed;
    state.responseTimes.push(timeSpent);

    const stats = state.categoryStats[q.category];
    stats.total += 1;

    const buttons = el.optionsContainer.querySelectorAll(".option-btn");
    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.correctAnswer) {
        btn.classList.add("correct");
      } else if (idx === selectedIdx) {
        btn.classList.add("incorrect");
      }
    });

    if (isCorrect) {
      state.correctCount += 1;
      state.streak += 1;
      state.longestStreak = Math.max(state.longestStreak, state.streak);
      stats.correct += 1;
      playCorrectSound();
    } else {
      state.streak = 0;
      playIncorrectSound();
      el.optionsContainer.classList.remove("shake");
      // eslint-disable-next-line no-unused-expressions
      el.optionsContainer.offsetWidth; // 리플로우 강제로 애니메이션 재실행
      el.optionsContainer.classList.add("shake");
    }

    const gained = scoreManager.calculateScore(isCorrect, timeSpent, state.streak, state.hintUsedThisQuestion);
    state.score += gained;

    el.scoreDisplay.textContent = `점수: ${state.score}`;
    el.streakDisplay.textContent = `🔥 연속 ${state.streak}`;

    showFeedback(isCorrect, q.explanation, gained);
  }

  function showFeedback(isCorrect, explanation, gained) {
    el.feedback.classList.remove("hidden");
    el.feedbackText.innerHTML = "";
    el.feedbackText.textContent = isCorrect ? "정답입니다! 🎉" : "오답입니다 😢";
    if (gained > 0) {
      const pointsSpan = document.createElement("span");
      pointsSpan.className = "feedback-points";
      pointsSpan.textContent = `+${gained}점`;
      el.feedbackText.appendChild(pointsSpan);
    }
    el.feedbackText.classList.toggle("correct-text", isCorrect);
    el.feedbackText.classList.toggle("incorrect-text", !isCorrect);
    el.feedbackExplanation.textContent = explanation;
  }

  function nextQuestion() {
    state.currentIndex += 1;
    if (state.currentIndex >= state.questions.length) {
      endGame();
    } else {
      loadQuestion();
    }
  }

  function endGame() {
    clearInterval(state.tickInterval);
    const total = state.questions.length;
    const accuracy = Math.round((state.correctCount / total) * 100);
    const avgResponseTime = state.responseTimes.length
      ? state.responseTimes.reduce((sum, t) => sum + t, 0) / state.responseTimes.length
      : 0;

    const prevBest = dataManager.getBestScore();
    dataManager.saveGameResult({
      mode: state.mode,
      category: state.selectedCategory,
      difficulty: state.selectedDifficulty,
      score: state.score,
      correctCount: state.correctCount,
      total,
      accuracy,
      avgResponseTime,
      longestStreak: state.longestStreak,
      categoryStats: state.categoryStats,
    });
    const isNewBest = state.score > prevBest;

    el.resultScore.textContent = state.score;
    el.resultCorrect.textContent = `${state.correctCount} / ${total}`;
    el.resultAccuracy.textContent = `${accuracy}%`;
    el.resultAvgTime.textContent = `${avgResponseTime.toFixed(1)}초`;
    el.resultStreak.textContent = `${state.longestStreak}회`;
    el.resultNewBest.classList.toggle("hidden", !isNewBest);

    el.resultCategoryStats.innerHTML = "";
    Object.keys(state.categoryStats).forEach((category) => {
      const stat = state.categoryStats[category];
      const row = document.createElement("div");
      row.className = "category-stat-row";
      row.innerHTML = `<span>${category}</span><strong>${stat.correct} / ${stat.total}</strong>`;
      el.resultCategoryStats.appendChild(row);
    });

    showScreen("result-screen");
  }

  // ===== 결과 공유 =====
  function fallbackCopy(text, onDone) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      onDone();
    } catch (e) {
      // 복사 실패 시 조용히 무시
    }
    document.body.removeChild(textarea);
  }

  function copyToClipboard(text) {
    const original = el.shareBtn.textContent;
    const onDone = () => {
      el.shareBtn.textContent = "✅ 복사됨!";
      setTimeout(() => {
        el.shareBtn.textContent = original;
      }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onDone).catch(() => fallbackCopy(text, onDone));
    } else {
      fallbackCopy(text, onDone);
    }
  }

  function shareResult() {
    const total = state.questions.length;
    const accuracy = Math.round((state.correctCount / total) * 100);
    const modeLabel = currentModeConfig() ? currentModeConfig().label : state.mode;
    const categoryPart = state.selectedCategory ? ` (${state.selectedCategory})` : "";
    const text = [
      "🧠 상식 퀴즈 결과",
      `모드: ${modeLabel}${categoryPart}`,
      `점수: ${state.score}점`,
      `정답: ${state.correctCount}/${total} (${accuracy}%)`,
      `최다 연속 정답: ${state.longestStreak}회`,
    ].join("\n");
    copyToClipboard(text);
  }

  // ===== 대시보드 =====
  function renderDashboard() {
    el.statPlayCount.textContent = dataManager.getPlayCount();
    el.statBestScore.textContent = dataManager.getBestScore();

    const catAcc = dataManager.getCategoryAccuracy();
    el.dashboardCategoryStats.innerHTML = "";
    ["한국사", "과학", "지리", "스포츠"].forEach((cat) => {
      const stat = catAcc[cat] || { correct: 0, total: 0 };
      const pct = stat.total ? Math.round((stat.correct / stat.total) * 100) : 0;
      const row = document.createElement("div");
      row.className = "dashboard-cat-row";
      row.innerHTML = `
        <div class="dashboard-cat-label"><span>${cat}</span><span>${stat.correct}/${stat.total} (${pct}%)</span></div>
        <div class="dashboard-bar"><div class="dashboard-bar-fill" style="width:${pct}%"></div></div>
      `;
      el.dashboardCategoryStats.appendChild(row);
    });

    renderTrend();
    renderLeaderboard(state.leaderboardRange);
  }

  function renderTrend() {
    const trend = dataManager.getScoreTrend(10);
    el.dashboardTrend.innerHTML = "";
    if (!trend.length) {
      el.dashboardTrend.innerHTML = `<p class="empty-hint">플레이 기록이 없습니다.</p>`;
      return;
    }
    const maxScore = Math.max(...trend.map((t) => t.score), 1);
    trend.forEach((t) => {
      const wrap = document.createElement("div");
      wrap.className = "trend-bar-wrap";
      const height = Math.max((t.score / maxScore) * 100, 4);
      wrap.innerHTML = `<div class="trend-bar" style="height:${height}%"></div>`;
      wrap.title = `${t.score}점`;
      el.dashboardTrend.appendChild(wrap);
    });
  }

  function renderLeaderboard(range) {
    const list = dataManager.getLeaderboard(range);
    el.dashboardLeaderboard.innerHTML = "";
    if (!list.length) {
      el.dashboardLeaderboard.innerHTML = `<p class="empty-hint">기록이 없습니다.</p>`;
      return;
    }
    list.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "leaderboard-item";
      const modeInfo = GAME_MODES[entry.mode];
      const modeLabel = entry.mode === "category" && entry.category
        ? `카테고리 · ${entry.category}`
        : modeInfo
        ? modeInfo.label
        : entry.mode;
      const date = new Date(entry.timestamp);
      const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
      li.innerHTML = `<span class="leaderboard-score">${entry.score}점</span><span class="leaderboard-meta">${modeLabel} · ${dateLabel}</span>`;
      el.dashboardLeaderboard.appendChild(li);
    });
  }

  // ===== 이벤트 바인딩 =====
  el.modeSelect.querySelectorAll(".btn-mode").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      if (mode === "category") {
        el.modeSelect.classList.add("hidden");
        el.categorySelect.classList.remove("hidden");
      } else {
        startGame(mode, null);
      }
    });
  });

  el.categorySelect.querySelectorAll(".btn-category").forEach((btn) => {
    btn.addEventListener("click", () => {
      startGame("category", btn.dataset.category);
    });
  });

  document.querySelectorAll(".btn-difficulty").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-difficulty").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.selectedDifficulty = btn.dataset.difficulty;
    });
  });

  document.querySelectorAll(".btn-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.leaderboardRange = btn.dataset.range;
      renderLeaderboard(state.leaderboardRange);
    });
  });

  el.dashboardBtn.addEventListener("click", () => {
    renderDashboard();
    showScreen("dashboard-screen");
  });
  el.dashboardBackBtn.addEventListener("click", showModeSelect);

  el.categoryBackBtn.addEventListener("click", showModeSelect);
  el.hintBtn.addEventListener("click", useHint);
  el.pauseBtn.addEventListener("click", togglePause);
  el.resumeBtn.addEventListener("click", togglePause);
  el.nextBtn.addEventListener("click", nextQuestion);
  el.restartBtn.addEventListener("click", showModeSelect);
  el.shareBtn.addEventListener("click", shareResult);
  el.themeToggleBtn.addEventListener("click", toggleTheme);

  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("quiz-screen").classList.contains("active")) return;
    if (state.paused) return;
    if (!state.answered) {
      if (["1", "2", "3", "4"].includes(e.key)) {
        const idx = Number(e.key) - 1;
        const buttons = el.optionsContainer.querySelectorAll(".option-btn");
        if (buttons[idx] && !buttons[idx].disabled) {
          handleAnswer(idx);
        }
      }
    } else if (e.key === "Enter" && !el.feedback.classList.contains("hidden")) {
      nextQuestion();
    }
  });

  initTheme();
})();
