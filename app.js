(() => {
  'use strict';

  /* ---------- Géométrie de la feuille (points PDF, origine en haut à gauche) ---------- */
  const W = 382.428, H = 268.498;
  const COLS = [39.47, 75.19, 110.91, 146.62, 182.34, 218.05, 253.77, 289.48, 332.0, 374.52];
  const ROW_Y0 = 56.34, ROW_H = (260.43 - 56.34) / 10;
  const LABEL_X = [8.3, 39.47];
  const NAME_BOX = [74, 25.2, 143.4, 38.6];
  const JOKER_BOXES = [
    [290.82, 17.18, 304.99, 31.36],
    [308.06, 17.18, 322.23, 31.36],
    [325.3, 17.18, 339.48, 31.36],
  ];
  const BONUS_BOXES = [
    [343.17, 17.81, 356.09, 30.73],
    [360.41, 17.81, 373.33, 30.73],
  ];
  const INSET = 0.6;

  /* ---------- Règles ---------- */
  const ROUNDS = 10, CELLS = 7, TARGET = 222;
  const ZONE_BONUS = [0, 0, 0, 5, 10, 15, 20];
  const COL_NAMES = ['RD', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
  const NORMAL_KEYS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const DOUBLE_KEYS = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 18, 20, 22, 24];
  const JOKER_NAMES = ['Filet de sécurité', 'Seconde chance', 'Double cadeau'];
  // Cases bonus vierges : vide → ")" → ")" utilisé → "2" → "2" utilisé
  const BONUS_CYCLE = [
    { t: '', used: false }, { t: ')', used: false }, { t: ')', used: true },
    { t: '2', used: false }, { t: '2', used: true },
  ];

  const STORE_KEY = 'happy-double/partie-en-cours';

  /* ---------- Icônes ---------- */
  const ICONS = {
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    del: '<path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><path d="m18 9-6 6"/><path d="m12 9 6 6"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

  /* ---------- Utilitaires ---------- */
  const $ = (s, root = document) => root.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const make = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };
  const uid = () => Math.random().toString(36).slice(2, 10);

  /* ---------- État ---------- */
  const emptyCell = () => ({ v: null, d: false, p: false });
  const emptyRow = () => ({ cells: Array.from({ length: CELLS }, emptyCell), elim: false, x2: false });
  const newPlayer = (name = '') => ({
    id: uid(), name,
    rows: Array.from({ length: ROUNDS }, emptyRow),
    jokers: [false, false, false],
    bonus: [0, 0],
  });
  const freshGame = () => ({ players: [newPlayer()], active: 0 });

  function normalize(s) {
    if (!s || !Array.isArray(s.players) || !s.players.length) return freshGame();
    const players = s.players.map(p => {
      const base = newPlayer(typeof p.name === 'string' ? p.name : '');
      if (p.id) base.id = String(p.id);
      base.rows = base.rows.map((row, r) => {
        const src = p.rows && p.rows[r];
        if (!src) return row;
        return {
          cells: row.cells.map((_, i) => {
            const c = (src.cells && src.cells[i]) || {};
            return { v: Number.isFinite(c.v) ? c.v : null, d: !!c.d, p: !!c.p };
          }),
          elim: !!src.elim,
          x2: !!src.x2,
        };
      });
      base.jokers = base.jokers.map((_, i) => !!(p.jokers && p.jokers[i]));
      base.bonus = base.bonus.map((_, i) => {
        const n = p.bonus && p.bonus[i];
        return Number.isInteger(n) && n >= 0 && n < BONUS_CYCLE.length ? n : 0;
      });
      return base;
    });
    const active = Math.min(Math.max(0, s.active | 0), players.length - 1);
    return { players, active };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { /* stockage indisponible ou corrompu */ }
    return freshGame();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignoré */ }
  }

  let state = load();
  let sel = null;           // { r, c } : case en cours de saisie
  let typed = '', typedAt = 0;
  let toastTimer = 0;
  let installPrompt = null;

  const player = () => state.players[state.active];
  const filled = c => c.v !== null || c.d;
  const displayName = (p, i) => p.name.trim() || `Joueur ${i + 1}`;

  /* ---------- Calcul des scores ---------- */
  function lastFilled(cells, upto = CELLS - 1) {
    let k = -1;
    for (let i = 0; i <= upto; i++) if (filled(cells[i])) k = i;
    return k;
  }
  const parenIndex = row => row.cells.reduce((k, c, i) => (c.p ? i : k), -1);

  function rowScore(row) {
    const touched = row.elim || row.x2 || row.cells.some(c => filled(c) || c.p);
    if (!touched) return { touched: false, points: 0, bonus: 0 };
    let upto = CELLS - 1;
    if (row.elim) {
      // Éliminé : seul ce qui précède la parenthèse (filet de sécurité) est conservé.
      upto = parenIndex(row);
      if (upto < 0) return { touched: true, points: 0, bonus: 0 };
    }
    const last = lastFilled(row.cells, upto);
    let sum = 0;
    for (let i = 0; i <= upto; i++) sum += row.cells[i].v || 0;
    const bonus = last >= 0 ? ZONE_BONUS[last] : 0;
    const x2 = row.x2 && !row.elim;
    return { touched: true, points: (sum + bonus) * (x2 ? 2 : 1), bonus, x2 };
  }

  function playerStats(p) {
    let total = 0, elims = 0, played = 0;
    const rounds = [], cumul = [];
    p.rows.forEach(row => {
      const s = rowScore(row);
      rounds.push(s);
      if (s.touched) { total += s.points; played++; }
      if (row.elim) elims++;
      cumul.push(total);
    });
    return { total, elims, played, rounds, cumul };
  }

  function duplicates(row) {
    const seen = new Map();
    row.cells.forEach((c, i) => {
      if (c.d || c.v === null) return;
      if (!seen.has(c.v)) seen.set(c.v, []);
      seen.get(c.v).push(i);
    });
    const dup = new Set();
    seen.forEach(ix => { if (ix.length > 1) ix.forEach(i => dup.add(i)); });
    return dup;
  }

  /* ---------- Construction de la feuille ---------- */
  const overlay = $('#overlay');
  const refs = { labels: [], cells: [], points: [], totals: [], strikes: [], jokers: [], bonus: [], name: null };

  const pct = (v, total) => (v / total * 100) + '%';
  function place(node, x0, y0, x1, y1) {
    node.style.left = pct(x0, W);
    node.style.top = pct(y0, H);
    node.style.width = pct(x1 - x0, W);
    node.style.height = pct(y1 - y0, H);
  }

  function buildSheet() {
    const frag = document.createDocumentFragment();
    for (let r = 0; r < ROUNDS; r++) {
      const y0 = ROW_Y0 + r * ROW_H, y1 = y0 + ROW_H;

      const lab = make('button', 'ov rowlabel');
      lab.type = 'button';
      lab.dataset.row = r;
      lab.setAttribute('aria-label', `Manche ${r + 1}`);
      place(lab, LABEL_X[0], y0, LABEL_X[1], y1);
      frag.append(lab);
      refs.labels.push(lab);

      const cells = [];
      for (let c = 0; c < CELLS; c++) {
        const b = make('button', 'ov cell');
        b.type = 'button';
        b.dataset.r = r;
        b.dataset.c = c;
        place(b, COLS[c] + INSET, y0 + INSET, COLS[c + 1] - INSET, y1 - INSET);
        frag.append(b);
        cells.push(b);
      }
      refs.cells.push(cells);

      const pts = make('button', 'ov points');
      pts.type = 'button';
      pts.dataset.row = r;
      place(pts, COLS[7] + INSET, y0 + INSET, COLS[8] - INSET, y1 - INSET);
      frag.append(pts);
      refs.points.push(pts);

      const tot = make('div', 'ov total');
      place(tot, COLS[8] + INSET, y0 + INSET, COLS[9] - INSET, y1 - INSET);
      frag.append(tot);
      refs.totals.push(tot);

      const strike = make('div', 'strike');
      strike.hidden = true;
      strike.style.top = pct(y0 + ROW_H / 2, H);
      frag.append(strike);
      refs.strikes.push(strike);
    }

    const name = make('input', 'ov name');
    name.type = 'text';
    name.autocomplete = 'off';
    name.maxLength = 24;
    name.setAttribute('aria-label', 'Prénom du joueur');
    name.setAttribute('enterkeyhint', 'done');
    place(name, ...NAME_BOX);
    frag.append(name);
    refs.name = name;

    JOKER_BOXES.forEach((box, i) => {
      const j = make('button', 'ov joker');
      j.type = 'button';
      j.dataset.joker = i;
      j.title = `Joker ${JOKER_NAMES[i]}`;
      place(j, ...box);
      frag.append(j);
      refs.jokers.push(j);
    });
    BONUS_BOXES.forEach((box, i) => {
      const b = make('button', 'ov joker');
      b.type = 'button';
      b.dataset.bonus = i;
      b.title = 'Case bonus (carte Filet de sécurité / Seconde chance Bonus)';
      place(b, ...box);
      frag.append(b);
      refs.bonus.push(b);
    });

    overlay.append(frag);
  }

  /* ---------- Rendu ---------- */
  function cellHTML(c) {
    let h = '';
    if (c.d) h += '<span class="d">D</span>';
    if (c.v !== null) h += `<span class="v">${c.v}</span>`;
    if (c.p) h += '<span class="paren">)</span>';
    return h;
  }

  function renderSheet() {
    const p = player();
    const st = playerStats(p);

    if (document.activeElement !== refs.name) refs.name.value = p.name;
    refs.name.placeholder = `Joueur ${state.active + 1}`;

    p.rows.forEach((row, r) => {
      const dup = duplicates(row);
      const s = st.rounds[r];
      const paren = parenIndex(row);

      row.cells.forEach((c, i) => {
        const b = refs.cells[r][i];
        b.innerHTML = cellHTML(c);
        b.classList.toggle('dup', dup.has(i));
        b.classList.toggle('sel', !!sel && sel.r === r && sel.c === i);
        b.classList.toggle('lost', row.elim && i > paren);
        b.setAttribute('aria-label', `Manche ${r + 1}, ${COL_NAMES[i]}${c.d ? ', double' : ''}${c.v !== null ? ', ' + c.v : ''}`);
      });

      const pt = refs.points[r];
      let ph = '';
      if (s.touched) {
        ph = `<span class="n">${s.points}</span>`;
        if (s.x2) ph += '<span class="tag">×2</span>';
        if (s.bonus) ph += `<span class="tag left">+${s.bonus}</span>`;
      }
      pt.innerHTML = ph;
      pt.classList.toggle('elim', row.elim);
      pt.setAttribute('aria-label', `Points manche ${r + 1} : ${s.points}`);

      // La première ligne de la colonne TOTAL est occupée par la chouette.
      refs.totals[r].textContent = r > 0 && s.touched ? st.cumul[r] : '';

      const strike = refs.strikes[r];
      const x0 = paren >= 0 ? COLS[paren + 1] : COLS[0];
      strike.hidden = !row.elim || x0 >= COLS[7];
      if (!strike.hidden) {
        strike.style.left = pct(x0 + 2, W);
        strike.style.width = pct(COLS[7] - x0 - 4, W);
      }

      refs.labels[r].classList.toggle('cur', !!sel && sel.r === r);
    });

    refs.jokers.forEach((j, i) => {
      j.classList.toggle('used', p.jokers[i]);
      j.setAttribute('aria-pressed', p.jokers[i]);
    });
    refs.bonus.forEach((b, i) => {
      const st2 = BONUS_CYCLE[p.bonus[i]];
      b.textContent = st2.t;
      b.classList.toggle('used', st2.used);
    });
  }

  function renderPlayers() {
    const wrap = $('#players');
    wrap.innerHTML = '';
    state.players.forEach((p, i) => {
      const { total } = playerStats(p);
      const b = make('button', 'ptab');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === state.active);
      b.classList.toggle('active', i === state.active);
      b.classList.toggle('goal', total >= TARGET);
      b.dataset.player = i;
      b.innerHTML = `<span class="pn">${esc(displayName(p, i))}</span><span class="pt">${total}</span>`;
      wrap.append(b);
    });
    const add = make('button', 'ptab add');
    add.type = 'button';
    add.dataset.add = '1';
    add.innerHTML = `${icon('plus')}<span>Joueur</span>`;
    wrap.append(add);
    const act = wrap.querySelector('.active');
    if (act) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function renderSummary() {
    const st = playerStats(player());
    let h = `Total <b>${st.total}</b> pts · ${st.elims} élimination${st.elims > 1 ? 's' : ''} · ${st.played}/${ROUNDS} manches`;
    if (st.total >= TARGET) h += ` · <span class="goal">${TARGET} atteint : fin de partie à la fin de la manche !</span>`;
    $('#summary').innerHTML = h;
  }

  function setPressed(act, on) {
    const b = $(`#keypad [data-act="${act}"]`);
    if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function renderKeypad() {
    const kp = $('#keypad');
    if (!sel) {
      kp.hidden = true;
      updateKeypadHeight();
      return;
    }
    kp.hidden = false;
    const p = player();
    const row = p.rows[sel.r];
    const c = row.cells[sel.c];

    $('#kp-player').textContent = displayName(p, state.active);
    $('#kp-where').textContent = `M${sel.r + 1} · ${COL_NAMES[sel.c]}`;

    const mode = c.d ? 'd' : 'n';
    const nums = $('#kp-nums');
    if (nums.dataset.mode !== mode) {
      const keys = c.d ? DOUBLE_KEYS : NORMAL_KEYS;
      nums.innerHTML = keys.map(k => `<button type="button" class="key" data-key="${k}">${k}</button>`).join('')
        + `<button type="button" class="key del" data-key="del" aria-label="Effacer la case">${icon('del')}</button>`;
      nums.dataset.mode = mode;
    }
    nums.querySelectorAll('[data-key]').forEach(b => b.classList.toggle('on', c.v !== null && String(c.v) === b.dataset.key));

    const hint = $('#kp-hint');
    hint.textContent = c.d ? 'Double : saisissez les points rapportés par la carte Action (0 si aucun).' : '';
    hint.hidden = !c.d;

    setPressed('double', c.d);
    setPressed('paren', row.cells.some(x => x.p));
    setPressed('elim', row.elim);
    setPressed('x2', row.x2);
    $('#keypad [data-act="elim"]').classList.toggle('pulse', !row.elim && duplicates(row).size > 0);

    const multi = state.players.length > 1;
    kp.querySelectorAll('[data-act$="-player"]').forEach(b => { b.style.visibility = multi ? '' : 'hidden'; });

    updateKeypadHeight();
  }

  function updateKeypadHeight() {
    const kp = $('#keypad');
    document.documentElement.style.setProperty('--kp-h', kp.hidden ? '0px' : kp.offsetHeight + 'px');
  }

  function render() {
    renderPlayers();
    renderSheet();
    renderKeypad();
    renderSummary();
  }

  function mutate(fn) {
    fn();
    save();
    render();
  }

  /* ---------- Saisie ---------- */
  function ensureVisible() {
    if (!sel) return;
    requestAnimationFrame(() => {
      updateKeypadHeight();
      refs.cells[sel.r][sel.c].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    });
  }

  function select(r, c) {
    if (document.activeElement === refs.name) refs.name.blur();
    sel = { r, c };
    typed = '';
    render();
    ensureVisible();
  }

  function firstEmpty(row) {
    const i = row.cells.findIndex(c => !filled(c));
    return i < 0 ? CELLS - 1 : i;
  }
  const selectRow = r => select(r, firstEmpty(player().rows[r]));

  function deselect() {
    if (!sel) return;
    sel = null;
    typed = '';
    render();
  }

  function move(step) {
    if (!sel) return;
    let idx = sel.r * CELLS + sel.c + step;
    idx = Math.max(0, Math.min(ROUNDS * CELLS - 1, idx));
    select(Math.floor(idx / CELLS), idx % CELLS);
  }
  function moveRow(step) {
    if (!sel) return;
    select(Math.max(0, Math.min(ROUNDS - 1, sel.r + step)), sel.c);
  }

  function checkDuplicate(r, c) {
    const row = player().rows[r];
    if (row.elim || !duplicates(row).has(c)) return;
    showToast('Valeur déjà notée dans cette manche.', 'Ligne nulle', () => mutate(() => { player().rows[r].elim = true; }));
  }

  function pressKey(k) {
    if (!sel) return;
    const { r, c } = sel;
    const cell = player().rows[r].cells[c];
    if (k === 'del') {
      mutate(() => Object.assign(cell, emptyCell()));
      return;
    }
    mutate(() => { cell.v = Number(k); });
    checkDuplicate(r, c);
    if (c < CELLS - 1) select(r, c + 1);
  }

  // Clavier physique : deux chiffres tapés rapidement forment un nombre (ex. 1 puis 2 → 12).
  function typeDigit(d) {
    if (!sel) return;
    const now = Date.now();
    let next = typed && now - typedAt < 1500 ? typed + d : d;
    if (Number(next) > 24) next = d;
    typed = next;
    typedAt = now;
    const { r, c } = sel;
    mutate(() => { player().rows[r].cells[c].v = Number(next); });
    if (Number(next) >= 2) checkDuplicate(r, c);
  }

  function act(name) {
    if (name === 'close') return deselect();
    if (name === 'next') return move(1);
    if (name === 'prev-player' || name === 'next-player') {
      const n = state.players.length;
      return switchPlayer((state.active + (name === 'next-player' ? 1 : n - 1)) % n);
    }
    if (!sel) return;
    const { r, c } = sel;
    const row = player().rows[r];
    const cell = row.cells[c];
    typed = '';

    if (name === 'double') {
      mutate(() => {
        cell.d = !cell.d;
        cell.v = null;
      });
    } else if (name === 'paren') {
      // Le filet se place derrière la dernière valeur notée (la case courante si elle est remplie).
      let target = -1;
      for (let i = c; i >= 0; i--) if (filled(row.cells[i])) { target = i; break; }
      const existing = parenIndex(row);
      if (existing >= 0 && (target < 0 || existing === target)) {
        mutate(() => { row.cells[existing].p = false; });
      } else if (target < 0) {
        showToast('Notez d\'abord une valeur avant de poser le filet de sécurité.');
      } else {
        mutate(() => {
          row.cells.forEach(x => { x.p = false; });
          row.cells[target].p = true;
        });
      }
    } else if (name === 'elim') {
      mutate(() => { row.elim = !row.elim; });
      hideToast();
    } else if (name === 'x2') {
      mutate(() => { row.x2 = !row.x2; });
    }
  }

  /* ---------- Joueurs ---------- */
  function switchPlayer(i) {
    if (i === state.active && !sel) return;
    state.active = i;
    save();
    if (sel) {
      // On reste sur la même manche, à la prochaine case libre du joueur.
      select(sel.r, firstEmpty(player().rows[sel.r]));
    } else {
      render();
    }
  }

  function addPlayer() {
    state.players.push(newPlayer());
    state.active = state.players.length - 1;
    sel = null;
    save();
    render();
    refs.name.focus();
  }

  function deletePlayer() {
    const p = player();
    if (!confirm(`Supprimer ${displayName(p, state.active)} et sa feuille de score ?`)) return;
    state.players.splice(state.active, 1);
    if (!state.players.length) state.players.push(newPlayer());
    state.active = Math.min(state.active, state.players.length - 1);
    sel = null;
    save();
    render();
  }

  function newGame() {
    if (!confirm('Commencer une nouvelle partie ? Les scores seront effacés, les joueurs conservés.')) return;
    state = {
      players: state.players.map(p => ({ ...newPlayer(p.name), id: p.id })),
      active: 0,
    };
    sel = null;
    save();
    render();
  }

  function resetAll() {
    if (!confirm('Tout réinitialiser ? Les scores et les joueurs seront effacés.')) return;
    state = freshGame();
    sel = null;
    save();
    render();
  }

  /* ---------- Toast ---------- */
  function showToast(msg, actionLabel, onAction) {
    const t = $('#toast');
    $('#toast-msg').textContent = msg;
    const b = $('#toast-action');
    b.hidden = !actionLabel;
    b.textContent = actionLabel || '';
    b.onclick = () => { hideToast(); if (onAction) onAction(); };
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
  }
  function hideToast() {
    $('#toast').hidden = true;
    clearTimeout(toastTimer);
  }

  /* ---------- Tableau des scores ---------- */
  function openScores() {
    const stats = state.players.map((p, i) => ({ i, name: displayName(p, i), ...playerStats(p) }));
    const ranked = [...stats].sort((a, b) => b.total - a.total || a.elims - b.elims || a.i - b.i);
    let prev = null;
    ranked.forEach((s, k) => {
      s.rank = prev && prev.total === s.total && prev.elims === s.elims ? prev.rank : k + 1;
      prev = s;
    });

    const status = $('#scores-status');
    const reached = stats.filter(s => s.total >= TARGET);
    status.classList.toggle('goal', reached.length > 0);
    if (reached.length) {
      status.textContent = `${reached.map(s => s.name).join(', ')} ${reached.length > 1 ? 'ont' : 'a'} atteint ${TARGET} points : terminez la manche en cours, le meilleur total l'emporte.`;
    } else if (stats.every(s => s.played >= ROUNDS)) {
      status.textContent = `Les ${ROUNDS} manches sont jouées : la partie est terminée.`;
    } else {
      const current = Math.max(1, ...stats.map(s => s.played));
      status.textContent = `Manche ${current} sur ${ROUNDS} · objectif ${TARGET} points.`;
    }

    const head = `<thead><tr><th>#</th><th class="pname">Joueur</th><th>Total</th><th>Élim.</th>${
      Array.from({ length: ROUNDS }, (_, r) => `<th>M${r + 1}</th>`).join('')}</tr></thead>`;
    const body = ranked.map(s => {
      const p = state.players[s.i];
      const cls = [s.rank === 1 ? 'first' : '', s.i === state.active ? 'me' : '', s.total >= TARGET ? 'goal' : ''].join(' ');
      const rounds = s.rounds.map((rs, r) => {
        if (!rs.touched) return '<td class="r">·</td>';
        const x = p.rows[r].elim;
        return `<td class="r${x ? ' x' : ''}">${x && rs.points === 0 ? '✕' : rs.points}</td>`;
      }).join('');
      return `<tr class="${cls}" data-player="${s.i}"><td class="rank"><span>${s.rank}</span></td><td class="pname">${esc(s.name)}</td><td class="tot">${s.total}</td><td>${s.elims}</td>${rounds}</tr>`;
    }).join('');
    $('#scores-table').innerHTML = head + `<tbody>${body}</tbody>`;
    $('#dlg-scores').showModal();
  }

  /* ---------- Impression ---------- */
  async function printBlank() {
    const layout = Number(($('#dlg-print input[name="layout"]:checked') || {}).value || 8);
    const area = $('#print-area');
    area.className = 'l' + layout;
    area.innerHTML = '';
    const imgs = Array.from({ length: layout }, () => {
      const img = new Image();
      img.src = 'assets/sheet.svg';
      img.alt = '';
      area.append(img);
      return img;
    });
    $('#page-style').textContent = `@page { size: A4 ${layout === 4 ? 'landscape' : 'portrait'}; margin: 8mm; }`;
    await Promise.all(imgs.map(i => (i.decode ? i.decode().catch(() => {}) : Promise.resolve())));
    $('#dlg-print').close();
    setTimeout(() => window.print(), 80);
  }
  window.addEventListener('afterprint', () => { $('#print-area').innerHTML = ''; });

  /* ---------- Évènements ---------- */
  document.querySelectorAll('[data-icon]').forEach(b => b.insertAdjacentHTML('afterbegin', icon(b.dataset.icon)));

  overlay.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (cell) return select(+cell.dataset.r, +cell.dataset.c);
    const rowEl = e.target.closest('[data-row]');
    if (rowEl) return selectRow(+rowEl.dataset.row);
    const j = e.target.closest('[data-joker]');
    if (j) return mutate(() => { const p = player(); p.jokers[+j.dataset.joker] = !p.jokers[+j.dataset.joker]; });
    const b = e.target.closest('[data-bonus]');
    if (b) mutate(() => { const p = player(); const i = +b.dataset.bonus; p.bonus[i] = (p.bonus[i] + 1) % BONUS_CYCLE.length; });
  });

  $('#players').addEventListener('click', e => {
    const tab = e.target.closest('.ptab');
    if (!tab) return;
    if (tab.dataset.add) addPlayer();
    else switchPlayer(+tab.dataset.player);
  });

  $('#keypad').addEventListener('click', e => {
    const k = e.target.closest('[data-key]');
    if (k) return pressKey(k.dataset.key);
    const a = e.target.closest('[data-act]');
    if (a) act(a.dataset.act);
  });

  // Après le build : le champ prénom existe.
  buildSheet();

  refs.name.addEventListener('focus', () => { if (sel) deselect(); });
  refs.name.addEventListener('input', () => {
    player().name = refs.name.value;
    save();
    renderPlayers();
  });
  refs.name.addEventListener('keydown', e => { if (e.key === 'Enter') refs.name.blur(); });

  document.addEventListener('keydown', e => {
    if (!sel || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest('input, textarea') || document.querySelector('dialog[open]')) return;
    const k = e.key;
    if (/^\d$/.test(k)) typeDigit(k);
    else if (k === 'd' || k === 'D') act('double');
    else if (k === ')' || k === '(' || k === 'p' || k === 'P') act('paren');
    else if (k === 'x' || k === 'X') act('elim');
    else if (k === 'Backspace' || k === 'Delete') pressKey('del');
    else if (k === 'Enter' || (k === 'Tab' && !e.shiftKey) || k === 'ArrowRight') move(1);
    else if (k === 'ArrowLeft' || (k === 'Tab' && e.shiftKey)) move(-1);
    else if (k === 'ArrowDown') moveRow(1);
    else if (k === 'ArrowUp') moveRow(-1);
    else if (k === 'Escape') deselect();
    else return;
    e.preventDefault();
  });

  // Toucher en dehors de la feuille et du clavier ferme la saisie.
  document.addEventListener('pointerdown', e => {
    if (sel && !e.target.closest('.overlay, .keypad, .toast, dialog, .players, .topbar')) deselect();
  });

  window.addEventListener('resize', updateKeypadHeight);

  $('#btn-scores').addEventListener('click', openScores);
  $('#btn-print').addEventListener('click', () => $('#dlg-print').showModal());
  $('#btn-do-print').addEventListener('click', printBlank);
  $('#btn-menu').addEventListener('click', () => {
    $('#m-del-label').textContent = `Supprimer ${displayName(player(), state.active)}`;
    $('#m-install').hidden = !installPrompt;
    $('#dlg-menu').showModal();
  });

  document.querySelectorAll('dialog').forEach(d => {
    d.addEventListener('click', e => {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
  });

  $('#scores-table').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-player]');
    if (!tr) return;
    $('#dlg-scores').close();
    switchPlayer(+tr.dataset.player);
  });

  const fromMenu = fn => () => { $('#dlg-menu').close(); fn(); };
  $('#m-new').addEventListener('click', fromMenu(newGame));
  $('#m-del-player').addEventListener('click', fromMenu(deletePlayer));
  $('#m-reset').addEventListener('click', fromMenu(resetAll));
  $('#m-help').addEventListener('click', fromMenu(() => $('#dlg-help').showModal()));
  $('#m-install').addEventListener('click', fromMenu(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => {});
    installPrompt = null;
  }));

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
  });

  // Synchronise si la partie est modifiée dans un autre onglet.
  window.addEventListener('storage', e => {
    if (e.key !== STORE_KEY) return;
    state = load();
    sel = null;
    render();
  });

  render();

  /* ---------- PWA ---------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
