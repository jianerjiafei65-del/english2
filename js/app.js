(() => {
  "use strict";

  // ===== 保存（localStorage が使えない環境でも動くように） =====
  const STORAGE_KEY = "english1-state";
  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  };
  const saved = load();

  const state = {
    view: saved.view || "card",           // card | list
    lang: saved.lang || "en",             // en: 英単語を表に / ja: 翻訳を表に
    listMode: saved.listMode || "both",   // en | ja | both
    autoSpeak: !!saved.autoSpeak,         // カード表示時に自動で読み上げ
    slow: !!saved.slow,                   // ゆっくり読み上げ
    pos: saved.pos || "all",
    scene: saved.scene || "all",
    learnedFilter: saved.learnedFilter || "all",
    learned: new Set(saved.learned || []),
    order: WORDS.map((_, i) => i),        // 出題順（WORDS のインデックス）
    index: 0,
    flipped: false,
  };

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        view: state.view, lang: state.lang, listMode: state.listMode,
        autoSpeak: state.autoSpeak, slow: state.slow,
        pos: state.pos, scene: state.scene, learnedFilter: state.learnedFilter, learned: [...state.learned],
      }));
    } catch { /* 保存できなくても動作は続ける */ }
  };

  // ===== 要素 =====
  const $ = (id) => document.getElementById(id);
  const el = {
    tabs: document.querySelectorAll(".tab"),
    langBtns: document.querySelectorAll(".lang-btn"),
    listModeBtns: document.querySelectorAll(".list-mode-btn"),
    cardView: $("cardView"), listView: $("listView"),
    posFilter: $("posFilter"), learnedFilter: $("learnedFilter"),
    learnedCount: $("learnedCount"), totalCount: $("totalCount"), progressFill: $("progressFill"),
    sceneChips: $("sceneChips"), progressScope: $("progressScope"),
    frontScene: $("frontScene"), backScene: $("backScene"),
    position: $("position"), card: $("card"), cardArea: $("cardArea"), emptyCard: $("emptyCard"),
    frontPos: $("frontPos"), frontText: $("frontText"),
    backPos: $("backPos"), backText: $("backText"), backSub: $("backSub"),
    exampleEn: $("exampleEn"), exampleJa: $("exampleJa"),
    speakBtn: $("speakBtn"), speakExampleBtn: $("speakExampleBtn"), learnBtn: $("learnBtn"),
    autoSpeakBtn: $("autoSpeakBtn"), slowBtn: $("slowBtn"), toast: $("toast"),
    prevBtn: $("prevBtn"), nextBtn: $("nextBtn"), flipBtn: $("flipBtn"),
    shuffleBtn: $("shuffleBtn"), resetOrderBtn: $("resetOrderBtn"),
    wordList: $("wordList"), emptyList: $("emptyList"),
    resetLearnedBtn: $("resetLearnedBtn"),
  };

  // ===== 発音読み上げ（Web Speech API） =====
  const canSpeak = "speechSynthesis" in window;
  let englishVoice = null;
  const pickVoice = () => {
    const voices = canSpeak ? speechSynthesis.getVoices() : [];
    englishVoice =
      voices.find((v) => v.lang === "en-US") ||
      voices.find((v) => v.lang && v.lang.startsWith("en")) || null;
  };
  if (canSpeak) {
    pickVoice();
    speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
  }
  let toastTimer = null;
  const showToast = (msg) => {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.toast.hidden = true), 2500);
  };

  // 読み上げ中のボタンを光らせる
  let speakingBtn = null;
  const setSpeaking = (btn) => {
    if (speakingBtn) speakingBtn.classList.remove("is-speaking");
    speakingBtn = btn || null;
    if (speakingBtn) speakingBtn.classList.add("is-speaking");
  };

  const speak = (text, btn) => {
    if (!canSpeak) { showToast("このブラウザは読み上げに対応していません"); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    if (englishVoice) u.voice = englishVoice;
    u.rate = state.slow ? 0.6 : 0.9;
    u.onstart = () => setSpeaking(btn);
    u.onend = () => setSpeaking(null);
    u.onerror = (e) => {
      setSpeaking(null);
      if (e.error !== "interrupted" && e.error !== "canceled") {
        showToast("音声を再生できませんでした。端末の音量やマナーモードを確認してください");
      }
    };
    speechSynthesis.speak(u);
  };

  const sceneLabel = (id) => {
    const s = SCENES.find((x) => x.id === id);
    return s ? `${s.icon} ${s.id}` : id;
  };

  // ===== 絞り込み =====
  const matches = (i) => {
    const w = WORDS[i];
    if (state.scene !== "all" && w.scene !== state.scene) return false;
    if (state.pos !== "all" && w.pos !== state.pos) return false;
    const isLearned = state.learned.has(w.en);
    if (state.learnedFilter === "learned" && !isLearned) return false;
    if (state.learnedFilter === "unlearned" && isLearned) return false;
    return true;
  };
  const filteredOrder = () => state.order.filter(matches);

  // ===== 描画：共通 =====
  const renderProgress = () => {
    // シーンを選んでいるときは、そのシーンの進捗を表示
    const scope = state.scene === "all" ? WORDS : WORDS.filter((w) => w.scene === state.scene);
    const total = scope.length;
    const count = scope.filter((w) => state.learned.has(w.en)).length;
    el.progressScope.textContent = state.scene === "all" ? "" : `（${state.scene}）`;
    el.learnedCount.textContent = count;
    el.totalCount.textContent = total;
    el.progressFill.style.width = `${(count / total) * 100}%`;
  };

  const renderToggles = () => {
    el.tabs.forEach((t) => {
      const on = t.dataset.view === state.view;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on);
    });
    el.langBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.lang === state.lang));
    el.listModeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.listmode === state.listMode));
    el.cardView.hidden = state.view !== "card";
    el.listView.hidden = state.view !== "list";
    el.sceneChips.querySelectorAll(".chip").forEach((c) => {
      const on = c.dataset.scene === state.scene;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-pressed", on);
    });
    el.posFilter.value = state.pos;
    el.learnedFilter.value = state.learnedFilter;
  };

  // ===== 描画：カード =====
  const renderCard = (anim) => {
    const list = filteredOrder();
    const empty = list.length === 0;
    el.card.hidden = empty;
    el.emptyCard.hidden = !empty;
    [el.speakBtn, el.speakExampleBtn, el.learnBtn, el.prevBtn, el.nextBtn, el.flipBtn].forEach((b) => (b.disabled = empty));
    if (empty) { el.position.textContent = "0 / 0"; return; }

    if (state.index >= list.length) state.index = list.length - 1;
    if (state.index < 0) state.index = 0;
    const w = WORDS[list[state.index]];
    const isEn = state.lang === "en";

    el.position.textContent = `${state.index + 1} / ${list.length}`;
    el.frontPos.textContent = w.pos;
    el.backPos.textContent = w.pos;
    el.frontScene.textContent = sceneLabel(w.scene);
    el.backScene.textContent = sceneLabel(w.scene);
    el.frontText.textContent = isEn ? w.en : w.ja;
    el.backText.textContent = isEn ? w.ja : w.en;
    el.backSub.textContent = isEn ? w.en : w.ja;
    el.exampleEn.textContent = w.example;
    el.exampleJa.textContent = w.exampleJa;

    el.card.classList.toggle("is-flipped", state.flipped);
    el.flipBtn.textContent = state.flipped ? "問題に戻る" : "答えを見る";

    const learned = state.learned.has(w.en);
    el.card.classList.toggle("is-learned", learned);
    el.learnBtn.classList.toggle("is-learned", learned);
    el.learnBtn.setAttribute("aria-pressed", learned);
    el.learnBtn.textContent = learned ? "☑ 覚えた！" : "☐ 覚えた";

    el.prevBtn.disabled = state.index === 0;
    el.nextBtn.disabled = state.index === list.length - 1;

    if (anim) {
      el.card.classList.remove("slide-left", "slide-right");
      void el.card.offsetWidth; // アニメーションを再実行するため
      el.card.classList.add(anim);
    }
  };

  // ===== 描画：一覧 =====
  const renderList = () => {
    const list = filteredOrder().slice().sort((a, b) => a - b);
    el.emptyList.hidden = list.length > 0;
    el.wordList.innerHTML = "";
    const frag = document.createDocumentFragment();

    let lastScene = null;
    list.forEach((i) => {
      const w = WORDS[i];
      // シーンが変わるところに見出しを入れる
      if (w.scene !== lastScene) {
        lastScene = w.scene;
        const h = document.createElement("li");
        h.className = "scene-heading";
        const all = WORDS.filter((x) => x.scene === w.scene);
        const done = all.filter((x) => state.learned.has(x.en)).length;
        h.textContent = `${sceneLabel(w.scene)}  ${done} / ${all.length}`;
        frag.appendChild(h);
      }
      const learned = state.learned.has(w.en);
      const li = document.createElement("li");
      li.className = "word-item" + (learned ? " is-learned" : "");

      const check = document.createElement("button");
      check.className = "check";
      check.textContent = learned ? "✓" : "";
      check.setAttribute("aria-label", `${w.en} を覚えた`);
      check.setAttribute("aria-pressed", learned);
      check.addEventListener("click", () => toggleLearned(w.en));

      const texts = document.createElement("div");
      texts.className = "word-texts";
      const en = document.createElement("div");
      en.className = "word-en";
      en.textContent = w.en;
      const pos = document.createElement("span");
      pos.className = "word-pos";
      pos.textContent = w.pos;
      en.appendChild(pos);
      const ja = document.createElement("div");
      ja.className = "word-ja";
      ja.textContent = w.ja;

      // 片方だけ表示するモードでは、もう片方を隠す（タップで表示）
      const hideTarget = state.listMode === "en" ? ja : state.listMode === "ja" ? en : null;
      if (hideTarget) {
        hideTarget.classList.add("masked");
        hideTarget.addEventListener("click", () => hideTarget.classList.toggle("masked"));
      }
      texts.append(en, ja);

      const sp = document.createElement("button");
      sp.className = "speak-mini";
      sp.textContent = "🔊";
      sp.setAttribute("aria-label", `${w.en} の発音を聞く`);
      sp.addEventListener("click", () => speak(w.en, sp));

      li.append(check, texts, sp);
      frag.appendChild(li);
    });
    el.wordList.appendChild(frag);
  };

  const renderAudio = () => {
    [[el.autoSpeakBtn, state.autoSpeak], [el.slowBtn, state.slow]].forEach(([b, on]) => {
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on);
      b.querySelector(".toggle-state").textContent = on ? "ON" : "OFF";
    });
  };

  const render = (anim) => {
    renderToggles();
    renderAudio();
    renderProgress();
    if (state.view === "card") renderCard(anim); else renderList();
  };

  // ===== 操作 =====
  const currentWord = () => {
    const list = filteredOrder();
    return list.length ? WORDS[list[state.index]] : null;
  };

  const toggleLearned = (key) => {
    if (state.learned.has(key)) state.learned.delete(key); else state.learned.add(key);
    save();
    render();
  };

  const move = (step) => {
    const list = filteredOrder();
    const next = state.index + step;
    if (next < 0 || next >= list.length) return;
    state.index = next;
    state.flipped = false;
    render(step > 0 ? "slide-left" : "slide-right");
    autoSpeak("show");
  };

  // 自動読み上げ：英語が表なら表示したとき、日本語が表ならめくって英語が出たとき
  const autoSpeak = (moment) => {
    if (!state.autoSpeak || state.view !== "card") return;
    const w = currentWord(); if (!w) return;
    if ((moment === "show" && state.lang === "en") || (moment === "flip" && state.lang === "ja" && state.flipped)) {
      speak(w.en, el.speakBtn);
    }
  };

  const flip = () => {
    if (!currentWord()) return;
    state.flipped = !state.flipped;
    render();
    autoSpeak("flip");
  };

  const shuffle = () => {
    const a = state.order;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    state.index = 0;
    state.flipped = false;
    render("slide-left");
    autoSpeak("show");
  };

  const resetFilterPosition = () => { state.index = 0; state.flipped = false; save(); render(); };

  // ===== イベント =====
  el.tabs.forEach((t) => t.addEventListener("click", () => {
    state.view = t.dataset.view; save(); render();
  }));
  el.langBtns.forEach((b) => b.addEventListener("click", () => {
    state.lang = b.dataset.lang;
    state.listMode = state.lang === "en" ? "en" : "ja";  // 一覧も合わせて切り替え
    state.flipped = false;
    save(); render();
  }));
  el.listModeBtns.forEach((b) => b.addEventListener("click", () => {
    state.listMode = b.dataset.listmode; save(); render();
  }));
  el.posFilter.addEventListener("change", (e) => { state.pos = e.target.value; resetFilterPosition(); });
  el.learnedFilter.addEventListener("change", (e) => { state.learnedFilter = e.target.value; resetFilterPosition(); });

  el.card.addEventListener("click", flip);
  el.flipBtn.addEventListener("click", flip);
  el.prevBtn.addEventListener("click", () => move(-1));
  el.nextBtn.addEventListener("click", () => move(1));
  el.shuffleBtn.addEventListener("click", shuffle);
  el.resetOrderBtn.addEventListener("click", () => {
    state.order = WORDS.map((_, i) => i); state.index = 0; state.flipped = false; render();
  });
  el.speakBtn.addEventListener("click", () => { const w = currentWord(); if (w) speak(w.en, el.speakBtn); });
  el.speakExampleBtn.addEventListener("click", () => { const w = currentWord(); if (w) speak(w.example, el.speakExampleBtn); });
  el.autoSpeakBtn.addEventListener("click", () => {
    state.autoSpeak = !state.autoSpeak; save(); renderAudio();
    showToast(state.autoSpeak ? "自動読み上げをONにしました" : "自動読み上げをOFFにしました");
    if (state.autoSpeak) autoSpeak("show");
  });
  el.slowBtn.addEventListener("click", () => {
    state.slow = !state.slow; save(); renderAudio();
    const w = currentWord(); if (w) speak(w.en, el.speakBtn); // 速さを試しに聞かせる
  });
  el.learnBtn.addEventListener("click", () => {
    const w = currentWord(); if (!w) return;
    toggleLearned(w.en);
  });
  // リセットは2回押しで確定（誤操作防止）
  let resetTimer = null;
  const resetLabel = el.resetLearnedBtn.textContent;
  el.resetLearnedBtn.addEventListener("click", () => {
    if (!resetTimer) {
      el.resetLearnedBtn.textContent = "もう一度押すとリセットします";
      el.resetLearnedBtn.classList.add("is-warning");
      resetTimer = setTimeout(() => {
        resetTimer = null;
        el.resetLearnedBtn.textContent = resetLabel;
        el.resetLearnedBtn.classList.remove("is-warning");
      }, 3000);
      return;
    }
    clearTimeout(resetTimer); resetTimer = null;
    state.learned.clear(); save(); render();
    el.resetLearnedBtn.textContent = "リセットしました";
    el.resetLearnedBtn.classList.remove("is-warning");
    setTimeout(() => (el.resetLearnedBtn.textContent = resetLabel), 1500);
  });

  if (!canSpeak) {
    [el.speakBtn, el.speakExampleBtn, el.autoSpeakBtn, el.slowBtn].forEach((b) => {
      b.disabled = true;
      b.title = "このブラウザは読み上げに対応していません";
    });
  }

  // キーボード操作（PC 用）
  document.addEventListener("keydown", (e) => {
    if (state.view !== "card" || e.target.tagName === "SELECT") return;
    if (e.key === "ArrowRight") move(1);
    else if (e.key === "ArrowLeft") move(-1);
    else if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
    else if (e.key.toLowerCase() === "s") { const w = currentWord(); if (w) speak(w.en, el.speakBtn); }
    else if (e.key.toLowerCase() === "e") { const w = currentWord(); if (w) speak(w.example, el.speakExampleBtn); }
  });

  // スワイプ操作（スマホ用）
  let startX = 0, startY = 0, swiped = false;
  el.cardArea.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX; startY = e.touches[0].clientY; swiped = false;
  }, { passive: true });
  el.cardArea.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped = true;
      move(dx < 0 ? 1 : -1);
    }
  });
  // スワイプ直後のタップ（カードめくり）を無効化
  el.card.addEventListener("click", (e) => {
    if (swiped) { e.stopImmediatePropagation(); swiped = false; }
  }, true);

  // ===== 初期化 =====
  // シーンのボタンを作る
  const makeChip = (id, label) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.dataset.scene = id;
    b.textContent = label;
    b.addEventListener("click", () => {
      state.scene = id;
      resetFilterPosition();
      // ボタンの列だけを横にスクロールして、選んだシーンを中央に
      const c = el.sceneChips;
      c.scrollTo({ left: b.offsetLeft - (c.clientWidth - b.offsetWidth) / 2, behavior: "smooth" });
    });
    el.sceneChips.appendChild(b);
  };
  makeChip("all", "すべて");
  SCENES.forEach((s) => makeChip(s.id, sceneLabel(s.id)));

  [...new Set(WORDS.map((w) => w.pos))].forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p; opt.textContent = p;
    el.posFilter.appendChild(opt);
  });
  render();
  // 保存されていたシーンのボタンを見える位置に
  const activeChip = el.sceneChips.querySelector(".chip.is-active");
  if (activeChip) el.sceneChips.scrollLeft = activeChip.offsetLeft - (el.sceneChips.clientWidth - activeChip.offsetWidth) / 2;
})();
