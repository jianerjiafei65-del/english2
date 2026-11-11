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
    voiceURI: saved.voiceURI || "auto",   // 選んだ声（auto = おすすめを自動で選ぶ）
    pos: saved.pos || "all",
    scene: saved.scene || "all",
    learnedFilter: saved.learnedFilter || "all",
    learned: new Set(saved.learned || []),
    order: WORDS.map((_, i) => i),        // 出題順（WORDS のインデックス）
    index: 0,
    query: "",                            // 日本語検索の文字（保存しない）
    flipped: false,
  };

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        view: state.view, lang: state.lang, listMode: state.listMode,
        autoSpeak: state.autoSpeak, slow: state.slow, voiceURI: state.voiceURI,
        pos: state.pos, scene: state.scene, learnedFilter: state.learnedFilter, learned: [...state.learned],
      }));
    } catch { /* 保存できなくても動作は続ける */ }
    cloudSave();
  };

  // ===== ページ専用の保存場所（claude.ai で開いたとき） =====
  // 「覚えた」の記録を、見ている人ごとの専用の場所（db の data/users/<id>/progress）にも保存する。
  // Claude アプリの中などブラウザの保存領域が消える環境でも記録が残る。
  // GitHub Pages などで開いたときは window.claude がないので、これまでどおりブラウザにだけ保存する。
  let cloudRef = null;          // 保存先のドキュメント（使えないときは null）
  let cloudLastSent = null;     // 最後に保存した内容（同じなら書き込まない）
  let cloudWriting = false;
  let cloudQueued = false;
  const learnedKey = () => JSON.stringify([...state.learned].sort());

  async function cloudSave() {
    if (!cloudRef) return;
    const key = learnedKey();
    if (key === cloudLastSent) return;
    if (cloudWriting) { cloudQueued = true; return; }   // 1つずつ順番に書き込む
    cloudWriting = true;
    try {
      await cloudRef.set({ learned: JSON.parse(key), updatedAt: new Date().toISOString() });
      cloudLastSent = key;
    } catch {
      /* 書き込めなくてもブラウザ側の保存は続く */
    } finally {
      cloudWriting = false;
      if (cloudQueued) { cloudQueued = false; cloudSave(); }
    }
  }

  const startCloudSync = async () => {
    if (!window.claude || typeof window.claude.use !== "function") return;
    try {
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      if (!db || !user) return;
      const uid = await user.id();
      if (!uid) return;
      const ref = db.doc("data/users/" + uid + "/progress");
      let first = true;
      ref.onSnapshot((snap) => {
        if (snap.metadata.hasPendingWrites) return;      // 自分の書き込み中は無視
        const remote = snap.exists ? (snap.data().learned || []) : [];
        if (first) {
          if (snap.metadata.fromCache) return;          // 確定した内容を待つ
          first = false;
          // 初回：この端末の記録と保存先の記録を合わせる
          const merged = new Set([...remote, ...state.learned]);
          state.learned = merged;
          cloudRef = ref;
          cloudLastSent = JSON.stringify([...remote].sort());
          save();      // 合わせた結果をブラウザと保存先の両方へ
          render();
          return;
        }
        // 2回目以降：ほかの端末で変えた記録を反映
        const key = JSON.stringify([...remote].sort());
        if (key === learnedKey()) return;
        state.learned = new Set(remote);
        cloudLastSent = key;
        save();
        render();
      }, () => { cloudRef = null; });
    } catch {
      cloudRef = null;
    }
  };

  // ===== 要素 =====
  const $ = (id) => document.getElementById(id);
  const el = {
    tabs: document.querySelectorAll(".tab"),
    langBtns: document.querySelectorAll(".lang-btn"),
    listModeBtns: document.querySelectorAll(".list-mode-btn"),
    cardView: $("cardView"), listView: $("listView"),
    posFilter: $("posFilter"), learnedFilter: $("learnedFilter"),
    searchInput: $("searchInput"), searchCount: $("searchCount"),
    learnedCount: $("learnedCount"), totalCount: $("totalCount"), progressFill: $("progressFill"),
    sceneChips: $("sceneChips"), progressScope: $("progressScope"),
    frontScene: $("frontScene"), backScene: $("backScene"),
    position: $("position"), card: $("card"), cardArea: $("cardArea"), emptyCard: $("emptyCard"),
    frontPos: $("frontPos"), frontText: $("frontText"),
    backPos: $("backPos"), backText: $("backText"), backSub: $("backSub"),
    frontKana: $("frontKana"), backKana: $("backKana"), backSubKana: $("backSubKana"),
    exampleEn: $("exampleEn"), exampleJa: $("exampleJa"),
    speakBtn: $("speakBtn"), speakExampleBtn: $("speakExampleBtn"), learnBtn: $("learnBtn"),
    autoSpeakBtn: $("autoSpeakBtn"), slowBtn: $("slowBtn"), toast: $("toast"),
    voiceSelect: $("voiceSelect"), voiceTestBtn: $("voiceTestBtn"),
    prevBtn: $("prevBtn"), nextBtn: $("nextBtn"), flipBtn: $("flipBtn"),
    shuffleBtn: $("shuffleBtn"), resetOrderBtn: $("resetOrderBtn"),
    wordList: $("wordList"), emptyList: $("emptyList"),
    resetLearnedBtn: $("resetLearnedBtn"),
  };

  // ===== 発音読み上げ（Web Speech API） =====
  const canSpeak = "speechSynthesis" in window;
  let englishVoices = [];   // 聞き取りやすい順に並べた英語の声
  let englishVoice = null;  // 実際に使う声

  // 声の「聞き取りやすさ」を点数にする（高品質な声を優先し、ふざけた声やこもった声は除く）
  const scoreVoice = (v) => {
    const name = `${v.name} ${v.voiceURI}`;
    let s = 0;
    if (/^en[-_]US/i.test(v.lang)) s += 4;
    else if (/^en[-_](GB|AU|CA|IE|NZ)/i.test(v.lang)) s += 2;
    if (/natural|neural/i.test(name)) s += 14;            // Edge / Windows の自然な声
    if (/premium/i.test(name)) s += 12;                   // iPhone・Mac のプレミアム音声
    if (/enhanced|拡張/i.test(name)) s += 10;              // iPhone・Mac の拡張音声
    if (/google us english/i.test(name)) s += 9;          // Chrome のはっきりした声
    if (/online/i.test(name)) s += 6;
    if (/\b(ava|samantha|allison|susan|zoe|evan|nathan|joelle|noelle|jenny|aria|guy|michelle|emma|brian|andrew|serena|daniel|karen|moira|tessa)\b/i.test(name)) s += 5;
    if (/compact|espeak|novelty/i.test(name)) s -= 15;
    if (/\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|grandma|grandpa|rocko|shelley|flo|eddy|reed|sandy|junior|ralph|fred|kathy)\b/i.test(name)) s -= 30;
    return s;
  };

  const pickVoice = () => {
    const voices = canSpeak ? speechSynthesis.getVoices() : [];
    englishVoices = voices
      .filter((v) => v.lang && /^en/i.test(v.lang))
      .map((v) => ({ v, score: scoreVoice(v) }))
      .filter((x) => x.score > -10)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.v);
    const chosen = state.voiceURI !== "auto" && englishVoices.find((v) => v.voiceURI === state.voiceURI);
    englishVoice = chosen || englishVoices[0] || null;
    renderVoiceSelect();
  };

  const renderVoiceSelect = () => {
    if (!el.voiceSelect) return;
    const sel = el.voiceSelect;
    sel.innerHTML = "";
    const auto = document.createElement("option");
    auto.value = "auto";
    auto.textContent = englishVoices[0] ? `おすすめ（${englishVoices[0].name}）` : "おすすめ（自動）";
    sel.appendChild(auto);
    englishVoices.forEach((v) => {
      const o = document.createElement("option");
      o.value = v.voiceURI;
      o.textContent = `${v.name}（${v.lang}）`;
      sel.appendChild(o);
    });
    sel.value = englishVoices.some((v) => v.voiceURI === state.voiceURI) ? state.voiceURI : "auto";
  };

  if (canSpeak) {
    pickVoice();
    speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
    // 一部のブラウザは声の一覧を遅れて返すので、少し待ってもう一度取得
    setTimeout(pickVoice, 500);
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
    u.lang = englishVoice ? englishVoice.lang : "en-US";
    if (englishVoice) u.voice = englishVoice;
    // ハキハキ聞こえるように：ほどよい速さ・少し高めの声・最大音量
    const isWord = !/\s/.test(text.trim());
    u.rate = state.slow ? 0.65 : (isWord ? 0.8 : 0.88);
    u.pitch = 1.08;
    u.volume = 1;
    u.onstart = () => setSpeaking(btn);
    u.onend = () => setSpeaking(null);
    u.onerror = (e) => {
      setSpeaking(null);
      if (e.error !== "interrupted" && e.error !== "canceled") {
        showToast("音声を再生できませんでした。端末の音量やマナーモードを確認してください");
      }
    };
    // cancel() の直後に speak() すると無視されるブラウザがあるので、少しだけ間をあける
    setTimeout(() => {
      speechSynthesis.resume?.();
      speechSynthesis.speak(u);
    }, 60);
  };


  // ===== 例文の中の答えの単語に下線 =====
  const IRREGULAR = {
    go: ["went", "goes", "gone"], come: ["came"], buy: ["bought"], eat: ["ate", "eaten"], write: ["wrote", "written"],
    speak: ["spoke", "spoken"], swim: ["swam"], sing: ["sang", "sung"], run: ["ran"], feel: ["felt"], think: ["thought"],
    catch: ["caught"], throw: ["threw", "thrown"], win: ["won"], lose: ["lost"], leave: ["left"], draw: ["drew", "drawn"],
    sleep: ["slept"], grow: ["grew", "grown"], hurt: ["hurt"], read: ["read"], understand: ["understood"], drink: ["drank"],
    begin: ["began", "begun"], wake: ["woke", "woken"], tooth: ["teeth"], leaf: ["leaves"], child: ["children"],
    foot: ["feet"], man: ["men"], woman: ["women"], person: ["people"], fall: ["fell"], learn: ["learned", "learnt"],
  };
  const wordForms = (w) => {
    const f = new Set([w, ...(IRREGULAR[w] || [])]);
    if (w.includes(" ")) return [...f];
    const last = w.slice(-1);
    ["s", "es", "ed", "d", "ing", "er", "est"].forEach((x) => f.add(w + x));
    if (last === "y" && !/[aeiou]/.test(w.slice(-2, -1))) { const b = w.slice(0, -1); ["ies", "ied", "ier", "iest"].forEach((x) => f.add(b + x)); }
    if (last === "e") f.add(w.slice(0, -1) + "ing");
    if (/[^aeiou][aeiou][bdgklmnprt]$/.test(w)) ["ed", "ing", "er"].forEach((x) => f.add(w + last + x));
    if (last === "f") f.add(w.slice(0, -1) + "ves");
    if (w.endsWith("fe")) f.add(w.slice(0, -2) + "ves");
    return [...f].sort((a, b) => b.length - a.length);
  };
  const findWordInSentence = (sentence, word) => {
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const alt = wordForms(word.toLowerCase()).map(esc).join("|");
    // まずは単語そのもの、なければ headache のような複合語の先頭
    const m = new RegExp("\\b(" + alt + ")\\b", "i").exec(sentence)
      || new RegExp("\\b(" + alt + ")(?=ache)", "i").exec(sentence);
    return m ? { start: m.index, end: m.index + m[0].length } : null;
  };
  const renderExample = (target, sentence, word) => {
    target.textContent = "";
    const hit = findWordInSentence(sentence, word);
    if (!hit) { target.textContent = sentence; return; }
    const u = document.createElement("u");
    u.className = "example-target";
    u.textContent = sentence.slice(hit.start, hit.end);
    target.append(sentence.slice(0, hit.start), u, sentence.slice(hit.end));
  };

  const sceneLabel = (id) => id;
  const sceneEn = (id) => (SCENES.find((x) => x.id === id) || {}).en || "";

  // ===== 絞り込み =====
  // ===== 日本語検索 =====
  // 日本語訳とカタカナ読みから探す。ひらがなで入力してもカタカナ読みに当たるようにする
  const normalizeJa = (s) => (s || "").normalize("NFKC").trim().toLowerCase()
    .replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
  const searchMatches = (w) => {
    const q = normalizeJa(state.query);
    if (!q) return true;
    return normalizeJa(w.ja).includes(q) || normalizeJa(w.kana).includes(q);
  };

  const matches = (i) => {
    const w = WORDS[i];
    if (state.query) { if (!searchMatches(w)) return false; }   // 検索中はすべてのシーンから探す
    else if (state.scene !== "all" && w.scene !== state.scene) return false;
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
      // シーンの単語をすべて覚えたら ✓ を付ける
      if (c.dataset.scene !== "all") {
        const words = WORDS.filter((w) => w.scene === c.dataset.scene);
        const complete = words.length > 0 && words.every((w) => state.learned.has(w.en));
        c.classList.toggle("is-complete", complete);
        c.textContent = c.dataset.scene + (complete ? " ✓" : "");
      }
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
    const tag = `${sceneEn(w.scene)} · ${w.scene}`;
    el.frontScene.textContent = tag;
    el.backScene.textContent = tag;
    el.frontText.textContent = isEn ? w.en : w.ja;
    el.backText.textContent = isEn ? w.ja : w.en;
    el.frontText.classList.toggle("is-ja", !isEn);
    el.backText.classList.toggle("is-ja", isEn);
    el.backSub.textContent = isEn ? w.en : w.ja;
    // 英単語の上にカタカナ読み（英単語が表示されている場所だけ）
    const kana = w.kana || "";
    el.frontKana.textContent = isEn ? kana : "";
    el.backKana.textContent = isEn ? "" : kana;
    el.backSubKana.textContent = isEn ? kana : "";
    el.frontKana.hidden = !el.frontKana.textContent;
    el.backKana.hidden = !el.backKana.textContent;
    el.backSubKana.hidden = !el.backSubKana.textContent;
    renderExample(el.exampleEn, w.example, w.en);
    el.exampleJa.textContent = w.exampleJa;

    el.card.classList.toggle("is-flipped", state.flipped);
    el.flipBtn.textContent = state.flipped ? "問題に戻る" : "答えを見る";

    const learned = state.learned.has(w.en);
    el.card.classList.toggle("is-learned", learned);
    el.learnBtn.classList.toggle("is-learned", learned);
    el.learnBtn.setAttribute("aria-pressed", learned);
    el.learnBtn.querySelector(".btn-label").textContent = learned ? "覚えた！" : "覚えた";

    // 端まで来てもとなりのシーン（またはリストの反対側）へつながるので、ボタンは押せたまま
    const single = list.length <= 1 && state.scene === "all";
    el.prevBtn.disabled = single;
    el.nextBtn.disabled = single;

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
        const name = document.createElement("span");
        name.className = "scene-heading-name";
        name.textContent = w.scene;
        const en = document.createElement("span");
        en.className = "scene-heading-en";
        en.textContent = sceneEn(w.scene).toUpperCase();
        name.appendChild(en);
        const cnt = document.createElement("span");
        cnt.className = "scene-heading-count";
        cnt.textContent = `${done} / ${all.length}`;
        h.append(name, cnt);
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
      if (w.kana) {
        const kanaEl = document.createElement("span");
        kanaEl.className = "word-kana";
        kanaEl.textContent = w.kana;
        en.prepend(kanaEl);
      }
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
      sp.innerHTML = '<svg aria-hidden="true"><use href="#i-speaker"/></svg>';
      sp.setAttribute("aria-label", `${w.en} の発音を聞く`);
      sp.addEventListener("click", () => speak(w.en, sp));

      const badge = document.createElement("span");
      badge.className = "learned-badge";
      badge.innerHTML = '<svg aria-hidden="true"><use href="#i-check"/></svg>覚えた';
      badge.hidden = !learned;

      li.append(check, texts, badge, sp);
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

  // カード上にスタンプを出す（覚えた / 外した）
  const showStamp = (learned) => {
    el.cardArea.querySelector(".stamp")?.remove();
    const s = document.createElement("div");
    s.className = "stamp" + (learned ? "" : " is-off");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = learned
      ? '<svg><use href="#i-check"/></svg><span>覚えた！</span>'
      : '<span class="stamp-x">×</span><span>チェックを外しました</span>';
    el.cardArea.appendChild(s);
    setTimeout(() => s.remove(), 900);
    try { navigator.vibrate?.(learned ? 18 : [8, 40, 8]); } catch { /* 対応していない端末は無視 */ }
  };

  // 今のカードの「覚えた」を変える（mode: "learn" | "unlearn" | "toggle"）
  const setCurrentLearned = (mode) => {
    const w = currentWord(); if (!w) return false;
    const has = state.learned.has(w.en);
    const want = mode === "toggle" ? !has : mode === "learn";
    if (want !== has) toggleLearned(w.en);
    showStamp(want);
    return want;
  };



  // ===== ページめくり =====
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let turnLayer = null;
  let turnTimer = null;

  // いま見えているカードの面を、id を外して複製する
  const snapshotFace = () => {
    const face = el.card.querySelector(state.flipped ? ".card-back" : ".card-front").cloneNode(true);
    face.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    face.classList.remove("card-back");
    face.classList.add("card-front");
    const wrap = document.createElement("div");
    wrap.className = "page-snap" + (el.card.classList.contains("is-learned") ? " is-learned" : "");
    wrap.appendChild(face);
    return wrap;
  };

  const makePage = (snap) => {
    const page = document.createElement("div");
    page.className = "page";
    const front = document.createElement("div");
    front.className = "page-face page-front";
    front.appendChild(snap);
    const back = document.createElement("div");
    back.className = "page-face page-back";
    page.append(front, back);
    return page;
  };

  const finishTurn = () => {
    clearTimeout(turnTimer);
    if (turnLayer) { turnLayer.remove(); turnLayer = null; }
  };

  // カードのめくれ（表/裏）を、アニメーションなしで表に戻す
  const resetFlipInstantly = () => {
    el.card.classList.add("no-anim");
    render();
    void el.card.offsetWidth;
    el.card.classList.remove("no-anim");
  };

  const pageTurn = (dir, oldSnap) => {
    finishTurn();
    const layer = document.createElement("div");
    layer.className = "page-turn";
    if (dir === "next") {
      // 今のページが左に向かってめくれ、下から次の単語が現れる
      const page = makePage(oldSnap);
      page.classList.add("turn-out");
      layer.appendChild(page);
    } else {
      // 前のページが左から戻ってきて、今のページの上にかぶさる
      const under = document.createElement("div");
      under.className = "page-under";
      under.appendChild(oldSnap);
      const page = makePage(snapshotFace());
      page.classList.add("turn-in");
      layer.append(under, page);
    }
    el.cardArea.appendChild(layer);
    turnLayer = layer;
    turnTimer = setTimeout(finishTurn, 700);
  };

  // 選んだシーンのボタンを、ボタンの列の中央に寄せる
  const centerActiveChip = (smooth) => {
    const c = el.sceneChips;
    const b = c.querySelector(".chip.is-active");
    if (b) c.scrollTo({ left: b.offsetLeft - (c.clientWidth - b.offsetWidth) / 2, behavior: smooth ? "smooth" : "auto" });
  };

  // シーンの端まで来たら、となりのシーンへつなげる（最後のシーンの次は最初に戻る）
  const crossScene = (step) => {
    const start = SCENES.findIndex((s) => s.id === state.scene);
    for (let k = 1; k <= SCENES.length; k++) {
      const id = SCENES[(start + step * k + SCENES.length * k) % SCENES.length].id;
      state.scene = id;
      const list = filteredOrder();
      if (list.length) return { list, wrapped: step > 0 ? start + k >= SCENES.length : start - k < 0 };
    }
    state.scene = SCENES[start].id;
    return null;
  };

  const move = (step) => {
    let list = filteredOrder();
    let next = state.index + step;
    let notice = "";
    if (!list.length) return;
    if (next < 0 || next >= list.length) {
      if (state.scene === "all" || state.query) {
        // すべて表示のときは、最後の次は最初へ（最初の前は最後へ）
        next = (next + list.length) % list.length;
        notice = step > 0 ? "最初の単語に戻りました" : "最後の単語へ移動しました";
      } else {
        const moved = crossScene(step);
        if (!moved) return;
        list = moved.list;
        next = step > 0 ? 0 : list.length - 1;
        notice = `${step > 0 ? "次" : "前"}のシーン：${state.scene}` + (moved.wrapped && step > 0 ? "（最初のシーンに戻りました）" : "");
        save();
      }
    }
    if (next === state.index && !notice) return;
    finishTurn();
    const oldSnap = reduceMotion ? null : snapshotFace();
    state.index = next;
    state.flipped = false;
    resetFlipInstantly();
    if (oldSnap) pageTurn(step > 0 ? "next" : "prev", oldSnap);
    if (notice) { showToast(notice); centerActiveChip(true); }
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
  el.searchInput.addEventListener("input", (e) => {
    state.query = e.target.value;
    const q = state.query.trim();
    if (q) {
      const n = filteredOrder().length;
      el.searchCount.textContent = n ? `「${q}」の検索結果：${n}語` : `「${q}」に当てはまる単語はありません`;
    }
    el.searchCount.hidden = !q;
    state.index = 0; state.flipped = false;
    render();
  });
  el.learnedFilter.addEventListener("change", (e) => { state.learnedFilter = e.target.value; resetFilterPosition(); });

  // タップでめくる（「覚えた」は覚えたボタンだけで付ける）
  el.card.addEventListener("click", flip);
  // 例文の英語はタップで隠す／表示する（カードはめくらない）
  el.exampleEn.addEventListener("click", (e) => {
    e.stopPropagation();
    el.exampleEn.classList.toggle("is-hidden");
  });
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
  el.voiceSelect.addEventListener("change", (e) => {
    state.voiceURI = e.target.value;
    save();
    pickVoice();
    speak("Hello! Nice to meet you.", el.voiceTestBtn);
  });
  el.voiceTestBtn.addEventListener("click", () => speak("Hello! Nice to meet you.", el.voiceTestBtn));
  el.slowBtn.addEventListener("click", () => {
    state.slow = !state.slow; save(); renderAudio();
    const w = currentWord(); if (w) speak(w.en, el.speakBtn); // 速さを試しに聞かせる
  });
  el.learnBtn.addEventListener("click", () => setCurrentLearned("toggle"));
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
    [el.speakBtn, el.speakExampleBtn, el.autoSpeakBtn, el.slowBtn, el.voiceSelect, el.voiceTestBtn].forEach((b) => {
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
  startCloudSync();
  // 保存されていたシーンのボタンを見える位置に
  const activeChip = el.sceneChips.querySelector(".chip.is-active");
  if (activeChip) el.sceneChips.scrollLeft = activeChip.offsetLeft - (el.sceneChips.clientWidth - activeChip.offsetWidth) / 2;
})();
