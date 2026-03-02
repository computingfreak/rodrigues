const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const gameSelect = document.getElementById("gameSelect");
const newGameBtn = document.getElementById("newGameBtn");
const hintBtn = document.getElementById("hintBtn");
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");

let state = null;
let selected = null;

function shuffledDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let v = 1; v <= 13; v++) {
      deck.push({ suit, value: v, rank: RANKS[v - 1], faceUp: true });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardColor(c) {
  return c.suit === "♥" || c.suit === "♦" ? "red" : "black";
}

function initGame(type) {
  selected = null;
  const deck = shuffledDeck();
  if (type === "freecell") {
    state = {
      type,
      freecells: [[], [], [], []],
      foundations: [[], [], [], []],
      columns: Array.from({ length: 8 }, () => []),
    };
    deck.forEach((card, i) => state.columns[i % 8].push(card));
  } else {
    const drawCount = type === "patience" ? 1 : 3;
    state = {
      type,
      drawCount,
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: Array.from({ length: 7 }, () => []),
    };
    for (let c = 0; c < 7; c++) {
      for (let r = 0; r <= c; r++) {
        const card = deck.pop();
        card.faceUp = r === c;
        state.tableau[c].push(card);
      }
    }
    while (deck.length) {
      const card = deck.pop();
      card.faceUp = false;
      state.stock.push(card);
    }
  }
  render();
}

function top(pile) { return pile[pile.length - 1]; }

function canMoveToFoundation(card, foundation) {
  if (!card) return false;
  if (!foundation.length) return card.value === 1;
  const t = top(foundation);
  return t.suit === card.suit && card.value === t.value + 1;
}

function canStackDescendingAlt(card, destTop) {
  if (!destTop) return card.value === 13;
  return card.value === destTop.value - 1 && cardColor(card) !== cardColor(destTop);
}

function canStackFreeCell(card, destTop) {
  if (!destTop) return true;
  return card.value === destTop.value - 1 && cardColor(card) !== cardColor(destTop);
}

function selectSource(ref) {
  selected = ref;
  render();
}

function clearSelection() { selected = null; }

function applyMove(from, to) {
  const src = resolvePile(from);
  const dst = resolvePile(to);
  if (!src || !dst || !src.length) return false;

  const card = top(src);
  if (!card.faceUp && state.type !== "freecell") return false;

  if (to.kind === "foundation") {
    if (!canMoveToFoundation(card, dst)) return false;
  } else if (state.type === "freecell") {
    if (to.kind === "freecell") {
      if (dst.length) return false;
    } else if (to.kind === "column") {
      if (!canStackFreeCell(card, top(dst))) return false;
    }
  } else {
    if (to.kind === "tableau") {
      if (!canStackDescendingAlt(card, top(dst))) return false;
    } else {
      return false;
    }
  }

  dst.push(src.pop());
  autoFlip();
  clearSelection();
  render();
  return true;
}

function resolvePile(ref) {
  if (!state) return null;
  if (state.type === "freecell") {
    if (ref.kind === "column") return state.columns[ref.index];
    if (ref.kind === "freecell") return state.freecells[ref.index];
    if (ref.kind === "foundation") return state.foundations[ref.index];
  } else {
    if (ref.kind === "tableau") return state.tableau[ref.index];
    if (ref.kind === "waste") return state.waste;
    if (ref.kind === "foundation") return state.foundations[ref.index];
  }
  return null;
}

function autoFlip() {
  if (state.type === "freecell") return;
  state.tableau.forEach((pile) => {
    if (pile.length && !top(pile).faceUp) top(pile).faceUp = true;
  });
}

function clickPile(targetRef) {
  if (!state) return;
  if (state.type !== "freecell" && targetRef.kind === "stock") {
    drawFromStock();
    render();
    return;
  }

  const pile = resolvePile(targetRef);
  if (!pile) return;

  if (selected) {
    if (selected.kind === targetRef.kind && selected.index === targetRef.index) {
      clearSelection();
      render();
      return;
    }
    if (applyMove(selected, targetRef)) return;
  }

  if (pile.length) {
    const candidate = top(pile);
    if (candidate.faceUp || state.type === "freecell") selectSource(targetRef);
  }
}

function drawFromStock() {
  if (!state.stock.length) {
    while (state.waste.length) {
      const c = state.waste.pop();
      c.faceUp = false;
      state.stock.push(c);
    }
    return;
  }
  for (let i = 0; i < state.drawCount && state.stock.length; i++) {
    const c = state.stock.pop();
    c.faceUp = true;
    state.waste.push(c);
  }
}

function cardEl(card, isSelected = false) {
  const el = document.createElement("div");
  el.className = `card ${cardColor(card)} ${card.faceUp ? "" : "back"} ${isSelected ? "selected" : ""}`.trim();
  el.textContent = card.faceUp ? `${card.rank}${card.suit}` : "##";
  return el;
}

function pileEl(label, cards, ref, showAll = true) {
  const el = document.createElement("div");
  el.className = "pile";
  if (selected && selected.kind === ref.kind && selected.index === ref.index) el.classList.add("highlight");
  el.onclick = () => clickPile(ref);

  const lbl = document.createElement("div");
  lbl.className = "pile-label";
  lbl.textContent = label;
  el.appendChild(lbl);

  if (!cards.length) return el;

  const displayCards = showAll ? cards : [top(cards)];
  displayCards.forEach((card) => {
    const isSelected = selected && selected.kind === ref.kind && selected.index === ref.index && card === top(cards);
    el.appendChild(cardEl(card, isSelected));
  });
  return el;
}

function renderFreecell() {
  boardEl.innerHTML = "";
  const topRow = document.createElement("div");
  topRow.className = "row top";

  state.freecells.forEach((p, i) => topRow.appendChild(pileEl(`Cell ${i + 1}`, p, { kind: "freecell", index: i }, false)));
  state.foundations.forEach((p, i) => topRow.appendChild(pileEl(`Foundation ${i + 1}`, p, { kind: "foundation", index: i }, false)));

  const bottom = document.createElement("div");
  bottom.className = "row bottom";
  state.columns.forEach((p, i) => bottom.appendChild(pileEl(`Column ${i + 1}`, p, { kind: "column", index: i })));

  boardEl.append(topRow, bottom);
}

function renderKlondike() {
  boardEl.innerHTML = "";
  const topRow = document.createElement("div");
  topRow.className = "row top";

  topRow.appendChild(pileEl("Stock", state.stock, { kind: "stock", index: 0 }, false));
  topRow.appendChild(pileEl("Waste", state.waste, { kind: "waste", index: 0 }, false));

  for (let i = 0; i < 2; i++) {
    const spacer = document.createElement("div");
    topRow.appendChild(spacer);
  }

  state.foundations.forEach((p, i) => topRow.appendChild(pileEl(`Foundation ${i + 1}`, p, { kind: "foundation", index: i }, false)));

  const bottom = document.createElement("div");
  bottom.className = "row bottom";
  state.tableau.forEach((p, i) => bottom.appendChild(pileEl(`Tableau ${i + 1}`, p, { kind: "tableau", index: i })));

  boardEl.append(topRow, bottom);
}

function isWon() {
  return state.foundations.every((f) => f.length === 13);
}

function findHint() {
  if (!state) return "";
  const moves = [];

  const refs = [];
  if (state.type === "freecell") {
    state.columns.forEach((p, i) => p.length && refs.push({ kind: "column", index: i }));
    state.freecells.forEach((p, i) => p.length && refs.push({ kind: "freecell", index: i }));
    refs.forEach((from) => {
      state.foundations.forEach((_, i) => applyHypothetical(from, { kind: "foundation", index: i }, moves));
      state.columns.forEach((_, i) => applyHypothetical(from, { kind: "column", index: i }, moves));
      state.freecells.forEach((_, i) => applyHypothetical(from, { kind: "freecell", index: i }, moves));
    });
  } else {
    if (state.waste.length) refs.push({ kind: "waste", index: 0 });
    state.tableau.forEach((p, i) => p.length && top(p).faceUp && refs.push({ kind: "tableau", index: i }));
    refs.forEach((from) => {
      state.foundations.forEach((_, i) => applyHypothetical(from, { kind: "foundation", index: i }, moves));
      state.tableau.forEach((_, i) => applyHypothetical(from, { kind: "tableau", index: i }, moves));
    });
  }

  return moves[0] || "No immediate move found. Try drawing or uncovering hidden cards.";
}

function applyHypothetical(from, to, moves) {
  if (from.kind === to.kind && from.index === to.index) return;
  const src = resolvePile(from);
  const dst = resolvePile(to);
  if (!src || !src.length || !dst) return;
  const card = top(src);
  let legal = false;
  if (to.kind === "foundation") legal = canMoveToFoundation(card, dst);
  else if (state.type === "freecell") legal = to.kind === "freecell" ? !dst.length : canStackFreeCell(card, top(dst));
  else legal = to.kind === "tableau" && canStackDescendingAlt(card, top(dst));
  if (legal) moves.push(`Try moving ${card.rank}${card.suit} from ${from.kind} ${from.index + 1} to ${to.kind} ${to.index + 1}.`);
}

function render() {
  if (!state) return;
  if (state.type === "freecell") renderFreecell();
  else renderKlondike();

  if (isWon()) statusEl.textContent = "🎉 You won!";
  else statusEl.textContent = "";
}

newGameBtn.addEventListener("click", () => initGame(gameSelect.value));
hintBtn.addEventListener("click", () => {
  statusEl.textContent = findHint();
});

initGame("klondike");
