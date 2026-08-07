/* ============================================================
   Shopee · Stand Alone Services — standalone buyer prototype
   Screens, flows and interactions are a 1:1 port of the
   Claude Design prototype. Nothing here redesigns a screen.
   ============================================================ */
(function () {
'use strict';

var FLOWS = [
  { id:'happy', name:'Happy flow', sub:'Discovery → booking → service completed', steps:[
    ['home','Shopee home'],['tela-0','See More · Services added'],['loc-v2','Services home · address header'],['3a','Service list · by service'],
    ['tela-4','Details · dynamic form'],['6a2','Scheduling · nothing picked'],['6a','Scheduling · slot picked'],['6b','Service review page'],
    ['tela-6c','Slot reserved · 30 min'],['tela-7a','Checkout'],['tela-7b','Payment confirmed'],['tela-7b3','Scheduled · service day'],
    ['tela-7b2','Scheduled · PIN released'],['tela-7d0','Professional arrived'],['tela-7d','Service in progress'],['tela-7c','Completed · rating']
  ]},
  { id:'reschedule', name:'Reschedule', sub:'Buyer-initiated new date, until D-1', steps:[
    ['c1','Order · scheduled'],['c5','Reschedule booking'],['c6b','Booking rescheduled']
  ]},
  { id:'cancel', name:'Cancellation', sub:'Cancel before the service starts', steps:[
    ['c1','Order · cancellable'],['c3','Cancellation reason'],['c4','Reason selected · fee'],['c6a','Cancellation requested']
  ]},
  { id:'refund', name:'Refund', sub:'Refund outcome and tracking', steps:[
    ['c6a','Refund on its way'],['tela-7e','Order cancelled · refund status']
  ]},
  { id:'states', name:'Alternative states', sub:'Reference screens — not a journey', steps:[
    ['tela-endereco','Address gate · new address'],['tela-endereco-b','Address gate · saved'],['tela-2b','Address · coverage OK'],
    ['tela-2c','Address · out of coverage'],['3b','Service list · by provider'],['tela-4b','Details · A/C config'],
    ['tela-7a-pix','Checkout · Pix selected'],['tela-7a-pix-codigo','Pix code · awaiting payment'],['tela-7a-reserva-expirada','Reservation expired'],
    ['c2b','Cancellation window closed'],['tela-7f','Awaiting new date']
  ]}
];

var HOTS = {
  'tela-0': [{ all:['Services'], up:1, go:'loc-v2' }],
  'tela-1': [{ all:['Furniture assembly','from R$'], go:'3a' }, { all:['Assembly'], exact:true, go:'3a' }],
  'loc-v2': [
    { all:['Service at','Av. Paulista'], go:'tela-endereco-b' },
    { all:['Furniture assembly','from R$'], go:'3a' },
    { all:['Assembly'], exact:true, go:'3a' }
  ],
  '3a': [{ all:['MonteBem','320 sold'], go:'tela-4' }, { all:['By provider'], exact:true, go:'3b' }],
  '3b': [{ all:['By service'], exact:true, go:'3a' }, { all:['MonteBem','320 sold'], go:'tela-4' }],
  'tela-4': [{ btn:'Continue', go:'6a2' }],
  '6a2': [{ btn:'Continue', hint:'Pick a date, then a time window' }],
  '6a': [{ btn:'Continue', go:'6b' }],
  '6b': [{ btn:'Submit request', go:'tela-6c' }],
  'tela-6c': [{ btn:'Go to payment', go:'tela-7a' }],
  'tela-7a': [{ btn:'Pay now', go:'tela-7b' }],
  'tela-7b': [{ btn:'Cancel order', hint:'Cancellation is its own flow — pick it in the flow menu' }],
  'tela-7b3': [{ all:['Reschedule'], exact:true, hint:'Reschedule is its own flow — pick it in the flow menu' }],
  'tela-7c': [{ btn:'Submit rating', hint:'Rating submitted — end of the happy flow' }],
  'c1': [{ btn:'Cancel', go:'c3' }, { all:['Reschedule'], exact:true, go:'c5' }],
  'c3': [{ btn:'Submit', hint:'Pick a reason first' }],
  'c4': [{ btn:'Submit', go:'c6a' }],
  'c5': [{ btn:'Confirm', go:'c6b' }],
  'c6a': [{ btn:'Back to orders', go:'tela-7e' }],
  'c6b': [{ btn:'View order', hint:'End of the reschedule flow — the order returns to Scheduled' }],
  'tela-7e': [{ btn:'View refund', hint:'Refund detail is out of scope for this prototype' }, { btn:'Book again', hint:'Restart the happy flow from the flow menu' }],
  'tela-endereco': [{ btn:'Continue', go:'tela-endereco-b' }],
  'tela-endereco-b': [{ btn:'Use this address', go:'tela-2b' }, { all:['Add new address'], go:'tela-endereco' }],
  'tela-2b': [{ btn:'Continue', go:'loc-v2' }],
  'tela-2c': [{ btn:'Use another address', go:'tela-endereco-b' }],
  'tela-4b': [{ btn:'Continue', go:'6a2' }],
  'tela-7a-pix': [{ btn:'Pay now', go:'tela-7a-pix-codigo' }],
  'tela-7a-pix-codigo': [{ btn:'Copy Pix code', hint:'Pix code copied' }],
  'tela-7a-reserva-expirada': [{ btn:'Pick a new slot', go:'6a2' }],
  'tela-7f': [{ btn:'Pick a slot', go:'c5' }, { btn:'Cancel order', go:'c3' }]
};

var BOOKING = ['6a','6b','tela-6c','tela-7a','tela-7a-pix','tela-7a-pix-codigo','tela-7a-reserva-expirada','tela-7b','tela-7b3','tela-7b2','tela-7d0','tela-7d','tela-7c'];
var DOW_LONG = { Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday', Thu:'Thursday', Fri:'Friday', Sat:'Saturday', Sun:'Sunday', Today:'Tuesday' };
var EASE = 'cubic-bezier(.32,.72,0,1)';
var STORE = 'sas-proto-standalone-v1';
var TRANSITION_MS = 320;

var $ = function (id) { return document.getElementById(id); };

var App = {
  flowId: 'happy',
  screen: 'home',
  stack: [],
  pick: null,
  reason: null,
  ratings: {},
  formSel: {},
  busy: false,
  present: false,

  /* ---------- boot ---------- */
  init: function () {
    this.stage = $('stage');
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
    if (saved && this.flowById(saved.flow) && this.html(saved.screen)) {
      this.flowId = saved.flow; this.screen = saved.screen;
      if (saved.present) this.setPresent(true, true);
    }
    this.buildRail();
    this.paint(this.screen);
    this.render();
    this.wireChrome();
  },

  /* ---------- data helpers ---------- */
  flowById: function (id) { for (var i = 0; i < FLOWS.length; i++) if (FLOWS[i].id === id) return FLOWS[i]; return null; },
  flow: function () { return this.flowById(this.flowId) || FLOWS[0]; },
  stepIndex: function () {
    var st = this.flow().steps;
    for (var i = 0; i < st.length; i++) if (st[i][0] === this.screen) return i;
    return -1;
  },
  labelFor: function (id) {
    for (var i = 0; i < FLOWS.length; i++) {
      var st = FLOWS[i].steps;
      for (var j = 0; j < st.length; j++) if (st[j][0] === id) return st[j][1];
    }
    return id;
  },
  html: function (id) {
    var lib = window.PROTO_SCREENS || {};
    var h = lib[id];
    if (!h) return null;
    var p = this.pick;
    if (p && BOOKING.indexOf(id) > -1 && !(p.day === '16' && p.win === '08:00 – 12:00')) {
      var dl = DOW_LONG[p.dow] || p.dow;
      var win = p.win.replace(/\s/g, '');
      h = h.split('Wed, Jul 16').join(p.dow + ', Jul ' + p.day)
           .split('Wednesday, July 16').join(dl + ', July ' + p.day)
           .split('Window: 08:00 – 12:00').join('Window: ' + p.win)
           .split('08:00–12:00').join(win)
           .split('window 08:00–12:00').join('window ' + win);
    }
    return h;
  },
  save: function () {
    try { localStorage.setItem(STORE, JSON.stringify({ flow:this.flowId, screen:this.screen, present:this.present })); } catch (e) {}
  },

  /* ---------- navigation ---------- */
  go: function (id, dir) {
    if (this.busy && Date.now() - (this.busyAt || 0) > 1200) this.busy = false;
    if (!this.html(id) || id === this.screen || this.busy) return;
    if (dir !== 'pop') this.stack.push(this.screen);
    this.transition(id, dir || 'push');
    this.screen = id; this.save(); this.render();
  },
  back: function () {
    if (this.stack.length) {
      var prev = this.stack.pop();
      this.transition(prev, 'pop');
      this.screen = prev; this.save(); this.render();
      return;
    }
    var i = this.stepIndex();
    if (i > 0) this.go(this.flow().steps[i - 1][0], 'pop');
  },
  next: function () {
    var st = this.flow().steps, i = this.stepIndex();
    if (i > -1 && i < st.length - 1) this.go(st[i + 1][0], 'push');
    else if (i === -1 && st.length) this.go(st[0][0], 'push');
  },
  pickFlow: function (id) {
    var f = this.flowById(id); if (!f) return;
    this.stack = []; this.flowId = id; this.screen = f.steps[0][0];
    this.paint(this.screen); this.save(); this.buildSteps(); this.render();
  },
  jump: function (id) {
    if (id === this.screen) return;
    var cur = this.stepIndex(), st = this.flow().steps, tgt = -1;
    for (var i = 0; i < st.length; i++) if (st[i][0] === id) tgt = i;
    this.stack = [];
    this.go(id, (tgt > -1 && cur > -1 && tgt < cur) ? 'pop' : 'push');
  },
  restart: function () {
    this.stack = []; this.screen = this.flow().steps[0][0];
    this.paint(this.screen); this.save(); this.render();
  },

  /* ---------- device rendering ---------- */
  makeLayer: function (id) {
    var d = document.createElement('div');
    d.dataset.layer = 'cur';
    d.style.cssText = 'position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;background:#F5F5F5;will-change:transform';
    d.innerHTML = this.html(id) || '';
    return d;
  },
  paint: function (id) {
    var stage = this.stage; if (!stage) return;
    stage.innerHTML = '';
    var l = this.makeLayer(id);
    stage.appendChild(l);
    this.bind(l, id);
  },
  transition: function (id, dir) {
    var self = this, stage = this.stage; if (!stage) return;
    var cur = stage.querySelector('[data-layer="cur"]');
    if (!cur) { this.paint(id); return; }
    var ms = TRANSITION_MS;
    var next = this.makeLayer(id);
    cur.dataset.layer = 'out';
    var stale = stage.querySelectorAll('[data-layer="out"]');
    for (var q = 0; q < stale.length; q++) stale[q].remove();
    if (ms === 0) { cur.remove(); stage.appendChild(next); this.bind(next, id); return; }
    this.busy = true; this.busyAt = Date.now();
    stage.style.pointerEvents = 'none';

    var front = dir === 'push' ? next : cur;
    var behind = dir === 'push' ? cur : next;
    behind.style.transform = 'translateX(0)';
    front.style.transition = 'none';
    front.style.transform = dir === 'push' ? 'translateX(100%)' : 'translateX(0)';
    front.style.boxShadow = '-12px 0 26px rgba(0,0,0,.16)';
    front.style.zIndex = '2';
    behind.style.zIndex = '1';

    var dim = document.createElement('div');
    dim.style.cssText = 'position:absolute;inset:0;background:#000;pointer-events:none;z-index:3;opacity:' + (dir === 'push' ? '0' : '.2');
    behind.appendChild(dim);
    if (dir === 'pop') behind.style.transform = 'translateX(-26%)';
    stage.appendChild(next);
    this.bind(next, id);

    requestAnimationFrame(function () { requestAnimationFrame(function () {
      var t = 'transform ' + ms + 'ms ' + EASE;
      front.style.transition = t; behind.style.transition = t;
      dim.style.transition = 'opacity ' + ms + 'ms linear';
      if (dir === 'push') { front.style.transform = 'translateX(0)'; behind.style.transform = 'translateX(-26%)'; dim.style.opacity = '.2'; }
      else { front.style.transform = 'translateX(100%)'; behind.style.transform = 'translateX(0)'; dim.style.opacity = '0'; }
    }); });

    setTimeout(function () {
      cur.remove();
      next.style.transition = 'none'; next.style.boxShadow = 'none'; next.style.zIndex = '1'; next.style.transform = 'none';
      var d = next.querySelector(':scope > div[style*="z-index:3"]'); if (d) d.remove();
      stage.style.pointerEvents = '';
      self.busy = false;
    }, ms + 60);
  },

  /* ---------- hotspots ---------- */
  toast: function (msg) {
    var stage = this.stage; if (!stage) return;
    var old = stage.querySelector('[data-toast]'); if (old) old.remove();
    var t = document.createElement('div');
    t.dataset.toast = '1';
    t.textContent = msg;
    t.style.cssText = 'position:absolute;left:24px;right:24px;bottom:84px;z-index:40;background:rgba(0,0,0,.82);color:#fff;font-size:12.5px;line-height:1.4;text-align:center;padding:10px 14px;border-radius:4px;opacity:0;transition:opacity 180ms ease-in-out;pointer-events:none';
    stage.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; });
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 250); }, 1900);
  },
  markHot: function (el, fn) {
    if (!el || el.dataset.hot) return;
    if (el.tagName === 'BUTTON' && el.disabled) {
      var cs = getComputedStyle(el);
      var bg = cs.backgroundColor, fg = cs.color;
      el.disabled = false;
      el.style.background = bg; el.style.color = fg;
    }
    el.dataset.hot = '1';
    el.style.cursor = 'pointer';
    el.addEventListener('pointerdown', function () { el.style.filter = 'brightness(.95)'; });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
      el.addEventListener(ev, function () { el.style.filter = ''; });
    });
    el.addEventListener('click', function (e) { e.stopPropagation(); fn(e); });
  },
  findBox: function (root, texts) {
    var best = null, bestN = 1e9;
    root.querySelectorAll('div,span,button,li,section').forEach(function (el) {
      var t = el.textContent || '';
      for (var i = 0; i < texts.length; i++) if (t.indexOf(texts[i]) === -1) return;
      var n = el.getElementsByTagName('*').length;
      if (n < bestN) { bestN = n; best = el; }
    });
    return best;
  },
  climb: function (el, up, exact) {
    var e = el, i;
    for (i = 0; i < (up || 0); i++) if (e.parentElement) e = e.parentElement;
    if (exact) return e;
    var guard = 0;
    while (e.offsetHeight < 30 && e.parentElement && guard < 3) { e = e.parentElement; guard++; }
    return e;
  },
  bind: function (root, id) {
    var self = this;

    var chev = Array.prototype.slice.call(root.querySelectorAll('path')).filter(function (p) {
      return (p.getAttribute('d') || '').indexOf('M15 5l-7 7 7 7') === 0;
    })[0];
    if (chev) {
      var holder = chev.closest('span,div');
      if (holder) this.markHot(holder, function () { self.back(); });
    }

    root.querySelectorAll('[data-go]').forEach(function (el) {
      self.markHot(el, function () { self.go(el.getAttribute('data-go'), 'push'); });
    });

    (HOTS[id] || []).forEach(function (rule) {
      var el = null;
      if (rule.btn) {
        el = Array.prototype.slice.call(root.querySelectorAll('button')).filter(function (b) {
          return (b.textContent || '').trim() === rule.btn;
        })[0] || null;
      } else if (rule.all) {
        var box = self.findBox(root, rule.all);
        if (box) el = self.climb(box, rule.up, rule.exact);
      }
      if (!el) return;
      if (rule.go) self.markHot(el, function () { self.go(rule.go, 'push'); });
      else if (rule.hint) self.markHot(el, function () { self.toast(rule.hint); });
    });

    if (id === 'tela-4' || id === 'tela-4b') this.form(root, id);
    if (id === 'c3' || id === 'c4') this.reasons(root, id);
    if (id === '6a2') this.slots(root, '6a');
    if (id === '6a' || id === 'c5') this.slots(root, null);
    this.stars(root);
    this.sticky(root);

    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-hot]')) return;
      if (e.target.closest('button, .sp-btn, .sp-tab, .sp-chip, .vm-cell, .sp-product, .sp-flash-card, .sp-ic, .sp-search, .sp-cats-grid > div')) {
        self.toast('Not part of this prototype');
      }
    });
  },
  sticky: function (root) {
    root.querySelectorAll('[data-sticky]').forEach(function (el) {
      el.style.position = 'sticky'; el.style.bottom = '0'; el.style.zIndex = '6';
    });
    var kids = Array.prototype.slice.call(root.children);
    var cap = Math.min(140, root.clientHeight * 0.2);
    for (var i = kids.length - 1; i >= Math.max(0, kids.length - 2); i--) {
      var k = kids[i];
      if (k.dataset.sticky) return;
      if (k.querySelector('button, .sp-btn') && k.offsetHeight > 0 && k.offsetHeight <= cap) {
        k.style.position = 'sticky'; k.style.bottom = '0'; k.style.zIndex = '6'; return;
      }
    }
  },
  form: function (root, id) {
    var self = this;
    var mem = (this.formSel[id] = this.formSel[id] || { radio:null, chips:{} });
    var rows = Array.prototype.slice.call(root.querySelectorAll('div')).filter(function (d) {
      return (d.getAttribute('style') || '').indexOf('padding:12px;display:flex;gap:12px;align-items:flex-start') > -1;
    });
    var dotOn = 'width:20px;height:20px;border-radius:50%;border:1.5px solid var(--shopee-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0';
    var dotOff = 'width:20px;height:20px;border-radius:50%;border:1.5px solid var(--disabled-hex);display:block;flex-shrink:0';
    var dot = '<span style="width:11px;height:11px;border-radius:50%;background:var(--shopee-primary)"></span>';
    var paintRows = function () {
      rows.forEach(function (r, n) {
        var on = mem.radio === n;
        r.style.background = on ? 'var(--shopee-primary-bg-light)' : '#fff';
        var wrap = r.firstElementChild;
        if (wrap) wrap.style.fontWeight = '';
        var title = wrap && wrap.firstElementChild;
        if (title) title.style.fontWeight = on ? '500' : '400';
        var s = r.querySelector('span');
        if (s) { s.setAttribute('style', on ? dotOn : dotOff); s.innerHTML = on ? dot : ''; }
      });
    };
    paintRows();
    rows.forEach(function (r, n) {
      self.markHot(r, function () { mem.radio = mem.radio === n ? null : n; paintRows(); });
    });

    var groups = [];
    root.querySelectorAll('.sp-chip').forEach(function (c) {
      if (groups.indexOf(c.parentElement) === -1) groups.push(c.parentElement);
    });
    groups.forEach(function (g, gi) {
      var chips = Array.prototype.slice.call(g.querySelectorAll('.sp-chip'));
      var head = g.previousElementSibling;
      var multi = !!head && (head.textContent || '').indexOf('Select one or more') > -1;
      var sel = (mem.chips[gi] = mem.chips[gi] || []);
      var paint = function () {
        chips.forEach(function (c, ci) { c.classList.toggle('sp-active', sel.indexOf(ci) > -1); });
      };
      paint();
      chips.forEach(function (c, ci) {
        self.markHot(c, function () {
          var at = sel.indexOf(ci);
          if (at > -1) sel.splice(at, 1);
          else { if (!multi) sel.length = 0; sel.push(ci); }
          paint();
        });
      });
    });
  },
  reasons: function (root, id) {
    var self = this;
    var rows = Array.prototype.slice.call(root.querySelectorAll('div')).filter(function (d) {
      return (d.getAttribute('style') || '').indexOf('padding:13px 12px') > -1;
    });
    if (!rows.length) return;
    var off = 'width:20px;height:20px;border-radius:50%;border:1.5px solid var(--disabled-hex);flex-shrink:0';
    var on = 'width:20px;height:20px;border-radius:50%;border:1.5px solid var(--shopee-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0';
    var dot = '<span style="width:11px;height:11px;border-radius:50%;background:var(--shopee-primary)"></span>';
    var label = function (r) {
      var d = r.querySelector('div');
      if (!d) return '';
      return ((d.firstElementChild ? d.firstElementChild.textContent : d.textContent) || '').trim();
    };
    var paint = function (sel) {
      rows.forEach(function (r) {
        var hit = !!sel && label(r) === sel;
        r.style.background = hit ? 'var(--shopee-primary-bg-light)' : '#fff';
        var d = r.querySelector('div'); if (d) d.style.fontWeight = hit ? '500' : '400';
        var s = r.querySelector('span');
        if (s) { s.setAttribute('style', hit ? on : off); s.innerHTML = hit ? dot : ''; }
      });
    };
    paint(this.reason || (id === 'c4' ? 'I no longer want the service' : null));
    if (id !== 'c3') return;
    rows.forEach(function (r) {
      self.markHot(r, function () {
        self.reason = label(r);
        paint(self.reason);
        var target = self.reason.indexOf('change the booking date') > -1 ? 'c5' : 'c4';
        setTimeout(function () { self.go(target, 'push'); }, 170);
      });
    });
  },
  stars: function (root) {
    var self = this, n = 0;
    root.querySelectorAll('div,span').forEach(function (el) {
      if ((el.textContent || '').trim() !== '☆☆☆☆☆' || el.children.length) return;
      var key = 'r' + (n++);
      var paint = function (v) {
        var s = '', i;
        for (i = 0; i < 5; i++) s += i < v ? '★' : '☆';
        el.textContent = s; el.style.color = 'var(--coins-yellow)';
      };
      if (self.ratings[key]) paint(self.ratings[key]);
      self.markHot(el, function (e) {
        var r = el.getBoundingClientRect();
        var v = Math.min(5, Math.max(1, Math.ceil((e.clientX - r.left) / (r.width / 5))));
        self.ratings[key] = v; paint(v);
      });
    });
  },
  slots: function (root, advanceTo) {
    var self = this;
    var chips = Array.prototype.slice.call(root.querySelectorAll('div')).filter(function (d) {
      return (d.getAttribute('style') || '').indexOf('min-width:52px') > -1;
    });
    var wins = Array.prototype.slice.call(root.querySelectorAll('div')).filter(function (d) {
      var s = d.getAttribute('style') || '';
      return s.indexOf('padding:12px 14px') > -1 && s.indexOf('border-radius:8px') > -1 && (d.textContent || '').indexOf('Sold out') === -1;
    });
    var dimmed = wins.length ? wins[0].parentElement : null;
    var emptyLbl = Array.prototype.slice.call(root.querySelectorAll('span,div')).filter(function (el) {
      return (el.textContent || '').trim() === 'Pick a date first';
    })[0];
    var summary = Array.prototype.slice.call(root.querySelectorAll('div')).filter(function (el) {
      return !el.children.length && (el.textContent || '').trim() === 'No date or time chosen';
    })[0];
    var chipOff = 'min-width:52px;padding:8px 6px;border:1px solid var(--divider-hex);border-radius:8px;text-align:center;flex-shrink:0';
    var chipOn = 'min-width:52px;padding:8px 6px;border:1px solid var(--shopee-primary);background:var(--shopee-primary-bg-light);border-radius:8px;text-align:center;flex-shrink:0;color:var(--shopee-primary)';
    var winOff = 'border:1px solid var(--divider-hex);border-radius:8px;padding:12px 14px;display:flex;align-items:center;gap:12px';
    var winOn = 'border:1px solid var(--shopee-primary);background:var(--shopee-primary-bg-light);border-radius:8px;padding:12px 14px;display:flex;align-items:center;gap:12px';
    var radioOff = 'width:20px;height:20px;border-radius:50%;border:1.5px solid var(--disabled-hex);flex-shrink:0';
    var radioOn = 'width:20px;height:20px;border-radius:50%;border:1.5px solid var(--shopee-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0';
    var radio = function (w, on) {
      var s = w.querySelector('span'); if (!s) return;
      s.setAttribute('style', on ? radioOn : radioOff);
      s.innerHTML = on ? '<span style="width:11px;height:11px;border-radius:50%;background:var(--shopee-primary)"></span>' : '';
    };
    var resetWins = function () {
      wins.forEach(function (x) { x.setAttribute('style', winOff); x.style.cursor = 'pointer'; radio(x, false); });
    };
    var meta = function (c) {
      var kids = Array.prototype.slice.call(c.children).map(function (k) { return (k.textContent || '').trim(); });
      var dow = kids[0] || '', day = kids[1] || '';
      if (!day) {
        var m = /^([A-Za-z]+)\s*(\d+)$/.exec((c.textContent || '').trim());
        if (m) { dow = m[1]; day = m[2]; }
      }
      if (dow === 'Today') dow = 'Tue';
      return { dow:dow, day:day };
    };
    var chosen = { chip:null, win:null };
    var selectChip = function (c, silent) {
      chips.forEach(function (x) { x.setAttribute('style', chipOff); });
      c.setAttribute('style', chipOn);
      chosen.chip = c;
      if (dimmed) dimmed.style.opacity = '1';
      var m = meta(c);
      if (emptyLbl) emptyLbl.textContent = m.dow + ', Jul ' + m.day;
      if (summary && !chosen.win) summary.textContent = m.dow + ', Jul ' + m.day + ' · pick a time';
      if (!silent) self.pick = { dow:m.dow, day:m.day, win:(self.pick && self.pick.win) || '08:00 – 12:00' };
    };
    var selectWin = function (w) {
      resetWins();
      w.setAttribute('style', winOn); radio(w, true);
      chosen.win = w;
      var timeEl = Array.prototype.slice.call(w.querySelectorAll('div')).filter(function (d) {
        return /^\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}$/.test((d.textContent || '').trim());
      })[0];
      var time = (timeEl ? timeEl.textContent.trim() : '08:00 – 12:00').replace(/\s*-\s*/, ' – ');
      var m = chosen.chip ? meta(chosen.chip) : { dow:'Wed', day:'16' };
      self.pick = { dow:m.dow, day:m.day, win:time };
      if (summary) summary.textContent = m.dow + ', Jul ' + m.day + ' · ' + time.replace(/\s/g, '');
    };
    chips.forEach(function (c) { self.markHot(c, function () { selectChip(c); }); });
    wins.forEach(function (w) {
      self.markHot(w, function () {
        if (dimmed && !chosen.chip && dimmed.style.opacity !== '1') { self.toast('Pick a date first'); return; }
        selectWin(w);
        if (advanceTo) setTimeout(function () { self.go(advanceTo, 'push'); }, 170);
      });
    });
    if (this.pick) {
      var c = chips.filter(function (x) { return meta(x).day === self.pick.day; })[0];
      if (c) selectChip(c, true);
      var tidy = function (s) { return (s || '').replace(/\s/g, '').replace(/-/g, '–'); };
      var w = wins.filter(function (x) {
        var el = Array.prototype.slice.call(x.querySelectorAll('div')).filter(function (d) {
          return /^\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}$/.test((d.textContent || '').trim());
        })[0];
        return el && tidy(el.textContent) === tidy(self.pick.win);
      })[0];
      if (w) { resetWins(); w.setAttribute('style', winOn); radio(w, true); chosen.win = w; }
    }
  },

  /* ---------- shell ---------- */
  buildRail: function () {
    var self = this, list = $('flowList');
    list.innerHTML = '';
    FLOWS.forEach(function (f) {
      var row = document.createElement('div');
      row.className = 'flow-row';
      row.dataset.flow = f.id;
      row.innerHTML = '<div class="top"><span class="dot"></span><span class="name"></span><span class="count"></span></div><div class="sub"></div>';
      row.querySelector('.name').textContent = f.name;
      row.querySelector('.count').textContent = f.steps.length + ' screens';
      row.querySelector('.sub').textContent = f.sub;
      row.addEventListener('click', function () { self.pickFlow(f.id); });
      list.appendChild(row);
    });
    this.buildSteps();
    this.buildHudMenu();
  },
  buildSteps: function () {
    var self = this, list = $('stepList');
    list.innerHTML = '';
    this.flow().steps.forEach(function (s, n) {
      var row = document.createElement('div');
      row.className = 'step-row';
      row.dataset.screen = s[0];
      row.innerHTML = '<span class="n"></span><span class="lbl"></span><span class="sid"></span>';
      row.querySelector('.n').textContent = String(n + 1);
      row.querySelector('.lbl').textContent = s[1];
      row.querySelector('.sid').textContent = s[0];
      row.addEventListener('click', function () { self.jump(s[0]); });
      list.appendChild(row);
    });
  },
  buildHudMenu: function () {
    var self = this, menu = $('hudMenu');
    menu.innerHTML = '';
    FLOWS.forEach(function (f) {
      var row = document.createElement('div');
      row.className = 'hud-flow';
      row.dataset.flow = f.id;
      row.innerHTML = '<span class="dot"></span><span class="t"></span><span class="c"></span>';
      row.querySelector('.t').textContent = f.name;
      row.querySelector('.c').textContent = f.steps.length;
      row.addEventListener('click', function (e) {
        e.stopPropagation();
        self.pickFlow(f.id);
        menu.classList.remove('open');
      });
      menu.appendChild(row);
    });
  },
  render: function () {
    var flow = this.flow(), i = this.stepIndex(), inFlow = i > -1;
    $('flowName').textContent = flow.name;
    $('screenTitle').textContent = this.labelFor(this.screen);
    $('stepCounter').textContent = inFlow ? 'Step ' + (i + 1) + ' of ' + flow.steps.length : 'State screen';
    $('flowNote').textContent = flow.id === 'states'
      ? 'Reference states — not a journey'
      : (inFlow && i === flow.steps.length - 1 ? 'End of the ' + flow.name.toLowerCase() : 'Tap the screen or use Next');

    $('backBtn').classList.toggle('off', !(this.stack.length || i > 0));
    $('nextBtn').classList.toggle('off', !(inFlow && i < flow.steps.length - 1));

    $('hudFlow').textContent = flow.name;
    $('hudStep').textContent = inFlow ? this.labelFor(this.screen) + ' · ' + (i + 1) + '/' + flow.steps.length : this.labelFor(this.screen);

    var self = this;
    document.querySelectorAll('#flowList .flow-row, #hudMenu .hud-flow').forEach(function (r) {
      r.classList.toggle('active', r.dataset.flow === self.flowId);
    });
    document.querySelectorAll('#stepList .step-row').forEach(function (r) {
      r.classList.toggle('active', r.dataset.screen === self.screen);
    });
  },
  fit: function () {
    var d = $('device');
    if (!this.present) { d.style.removeProperty('--fit'); return; }
    var scale = Math.min(1, (window.innerHeight - 60) / 874, (window.innerWidth - 60) / 412);
    d.style.setProperty('--fit', String(Math.max(0.4, scale)));
  },
  setPresent: function (on, quiet) {
    this.present = on;
    document.body.classList.toggle('present', on);
    this.fit();
    if (on) this.showHud();
    if (!quiet) this.save();
  },
  showHud: function () {
    var hud = $('hud');
    hud.classList.add('show');
    clearTimeout(this._hudT);
    var self = this;
    this._hudT = setTimeout(function () {
      if (!$('hudMenu').classList.contains('open')) hud.classList.remove('show');
    }, 2800);
  },
  wireChrome: function () {
    var self = this;
    $('backBtn').addEventListener('click', function () { self.back(); });
    $('nextBtn').addEventListener('click', function () { self.next(); });
    $('restartBtn').addEventListener('click', function () { self.restart(); });
    $('presentBtn').addEventListener('click', function () { self.setPresent(true); });

    $('hud').addEventListener('click', function (e) {
      var b = e.target.closest('[data-hud]'); if (!b) return;
      var a = b.dataset.hud;
      if (a === 'back') self.back();
      if (a === 'next') self.next();
      if (a === 'restart') self.restart();
      if (a === 'exit') self.setPresent(false);
      if (a === 'menu') { $('hudMenu').classList.toggle('open'); }
      self.showHud();
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#hud')) $('hudMenu').classList.remove('open');
    });

    window.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); self.next(); self.showHud(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); self.back(); self.showHud(); }
      if (e.key === 'p' || e.key === 'P') self.setPresent(!self.present);
      if (e.key === 'r' || e.key === 'R') self.restart();
      if (e.key === 'Escape' && self.present) self.setPresent(false);
      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
      }
    });
    window.addEventListener('mousemove', function () { if (self.present) self.showHud(); });
    window.addEventListener('resize', function () { self.fit(); });
  }
};

document.addEventListener('DOMContentLoaded', function () { App.init(); });
window.PROTOTYPE = App;

})();
