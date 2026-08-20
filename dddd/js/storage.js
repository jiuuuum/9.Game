(function () {
  const STORAGE_KEY = "quizGameHistory";
  const PREFS_KEY = "quizGamePrefs";

  class LocalDataManager {
    getGameHistory() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }

    saveGameResult(result) {
      const history = this.getGameHistory();
      const record = Object.assign({}, result, { timestamp: new Date().toISOString() });
      history.push(record);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (e) {
        // 저장 공간 부족 등은 조용히 무시 (게임 진행에는 영향 없음)
      }
      return record;
    }

    getBestScore(mode) {
      const history = this.getGameHistory().filter((h) => !mode || h.mode === mode);
      if (!history.length) return 0;
      return Math.max(...history.map((h) => h.score));
    }

    getPlayCount() {
      return this.getGameHistory().length;
    }

    getCategoryAccuracy() {
      const totals = {};
      this.getGameHistory().forEach((h) => {
        Object.entries(h.categoryStats || {}).forEach(([cat, stat]) => {
          if (!totals[cat]) totals[cat] = { correct: 0, total: 0 };
          totals[cat].correct += stat.correct;
          totals[cat].total += stat.total;
        });
      });
      return totals;
    }

    getScoreTrend(limit) {
      const history = this.getGameHistory();
      return history.slice(Math.max(history.length - (limit || 10), 0));
    }

    getLeaderboard(range) {
      const history = this.getGameHistory();
      const now = Date.now();
      const filtered = history.filter((h) => {
        if (range === "allTime" || !range) return true;
        const diffDays = (now - new Date(h.timestamp).getTime()) / 86400000;
        if (range === "daily") return diffDays <= 1;
        if (range === "weekly") return diffDays <= 7;
        return true;
      });
      return filtered
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    }

    getLeaderboardByCategory(category) {
      const history = this.getGameHistory().filter(
        (h) => h.mode === "category" && h.category === category
      );
      return history
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    }

    clearHistory() {
      localStorage.removeItem(STORAGE_KEY);
    }

    getPrefs() {
      try {
        const raw = localStorage.getItem(PREFS_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    }

    savePrefs(prefs) {
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch (e) {
        // 무시
      }
    }
  }

  window.LocalDataManager = LocalDataManager;
})();
