const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElement() {
  return {
    className: '',
    textContent: '',
    innerHTML: '',
    onclick: null,
    children: [],
    draggable: false,
    classList: { add() {} },
    addEventListener() {},
    appendChild(child) { this.children.push(child); return child; },
    append(...children) { this.children.push(...children); },
  };
}

function loadApp() {
  const ids = new Map();
  const document = {
    getElementById(id) {
      if (!ids.has(id)) ids.set(id, createElement());
      return ids.get(id);
    },
    createElement,
  };

  const context = {
    document,
    window: {},
    setInterval: () => 1,
    clearInterval: () => {},
    Math,
    JSON,
  };
  context.window = context;

  const script = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  vm.runInNewContext(script, context);
  return context.__solitaireTest;
}

function card(suit, value, faceUp = true) {
  const rank = value === 1 ? 'A' : value === 11 ? 'J' : value === 12 ? 'Q' : value === 13 ? 'K' : String(value);
  return { suit, value, rank, faceUp };
}

test('isSameRef compares cardIndex when present', () => {
  const api = loadApp();
  assert.equal(api.isSameRef({ kind: 'tableau', index: 0, cardIndex: 0 }, { kind: 'tableau', index: 0, cardIndex: 1 }), false);
  assert.equal(api.isSameRef({ kind: 'tableau', index: 0, cardIndex: 1 }, { kind: 'tableau', index: 0, cardIndex: 1 }), true);
});

test('clicking a specific tableau card reference selects and toggles that exact card', () => {
  const api = loadApp();
  api.setState({
    type: 'klondike',
    drawCount: 1,
    stats: { elapsedSeconds: 0, moves: 0, score: 0 },
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [
      [card('♠', 7), card('♥', 6)],
      [], [], [], [], [], [],
    ],
  });

  const ref = { kind: 'tableau', index: 0, cardIndex: 0 };
  api.clickPile(ref);
  assert.deepEqual(api.getSelected(), ref);

  api.clickPile(ref);
  assert.equal(api.getSelected(), null);
});
