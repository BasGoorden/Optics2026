/** HTML user interface on top of the 3D view. */
import { CHAPTERS, LEVELS } from '../content/levels';
import { TEXT } from '../content/text';
import type { ElementState, PlaceableKind } from '../game/elements';
import type { Evaluation, LevelDef } from '../game/level';
import { ITEM_DEFAULTS } from '../game/level';
import { BANDS, Band, bandName } from '../physics/colour';
import { fresnelReflectance } from '../physics/optics';
import { wavelengthToColor } from '../render/color';
import type { Interaction } from '../physics/trace';
import { rad2deg } from '../physics/vec';
import type { Quality } from '../render/stage';
import type { Settings } from '../save/progress';
import { audio } from '../audio/audio';
import { TRACKS, TrackId } from '../audio/music';

export interface HudCallbacks {
  selectLevel(id: string): void;
  backToMenu(): void;
  toggleOverlay(): void;
  hint(): void;
  topView(): void;
  toggleSound(): void;
  cycleMusic(): void;
  reset(): void;
  pickInventory(kind: PlaceableKind): void;
  changeSettings(s: Partial<Settings>): void;
  resetProgress(): void;
  next(): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

const ICONS: Record<string, string> = {
  mirror: '<svg viewBox="0 0 40 40"><line x1="8" y1="32" x2="32" y2="8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><line x1="11" y1="35" x2="35" y2="11" stroke="currentColor" stroke-width="1.5" opacity=".5"/></svg>',
  splitter: '<svg viewBox="0 0 40 40"><line x1="10" y1="30" x2="30" y2="10" stroke="currentColor" stroke-width="3" stroke-dasharray="4 3" stroke-linecap="round"/><line x1="2" y1="20" x2="38" y2="20" stroke="currentColor" stroke-width="1.5" opacity=".6"/><line x1="20" y1="20" x2="20" y2="2" stroke="currentColor" stroke-width="1.5" opacity=".6"/></svg>',
  lens: '<svg viewBox="0 0 40 40"><path d="M20 4 Q30 20 20 36 Q10 20 20 4Z" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
  dlens: '<svg viewBox="0 0 40 40"><path d="M13 4 H27 Q20 20 27 36 H13 Q20 20 13 4Z" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
  aperture: '<svg viewBox="0 0 40 40"><line x1="20" y1="3" x2="20" y2="16" stroke="currentColor" stroke-width="4"/><line x1="20" y1="24" x2="20" y2="37" stroke="currentColor" stroke-width="4"/><line x1="4" y1="20" x2="36" y2="20" stroke="currentColor" stroke-width="1.5" opacity=".6"/></svg>',
  dprism: '<svg viewBox="0 0 40 40"><polygon points="20,6 35,32 5,32" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><line x1="2" y1="22" x2="14" y2="20" stroke="#fff" stroke-width="1.5"/><line x1="26" y1="22" x2="38" y2="16" stroke="#ff5050" stroke-width="1.5"/><line x1="26" y1="23" x2="38" y2="26" stroke="#5080ff" stroke-width="1.5"/></svg>',
  filter: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="13" fill="currentColor" fill-opacity=".45" stroke="currentColor" stroke-width="3"/></svg>',
  dichroic: '<svg viewBox="0 0 40 40"><line x1="8" y1="32" x2="32" y2="8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><line x1="2" y1="20" x2="20" y2="20" stroke="#fff" stroke-width="1.5"/><line x1="20" y1="20" x2="20" y2="2" stroke="currentColor" stroke-width="1.5"/><line x1="20" y1="20" x2="38" y2="20" stroke="#ff5050" stroke-width="1.5"/></svg>',
  grating: '<svg viewBox="0 0 40 40"><rect x="16" y="5" width="8" height="30" fill="none" stroke="currentColor" stroke-width="2"/><line x1="18" y1="5" x2="18" y2="35" stroke="currentColor"/><line x1="20" y1="5" x2="20" y2="35" stroke="currentColor"/><line x1="22" y1="5" x2="22" y2="35" stroke="currentColor"/></svg>',
  polariser: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-width="3"/><line x1="10" y1="30" x2="30" y2="10" stroke="currentColor" stroke-width="2"/><line x1="14" y1="32" x2="32" y2="14" stroke="currentColor" stroke-width="1" opacity=".6"/><line x1="8" y1="26" x2="26" y2="8" stroke="currentColor" stroke-width="1" opacity=".6"/></svg>',
  slits: '<svg viewBox="0 0 40 40"><line x1="20" y1="3" x2="20" y2="16" stroke="currentColor" stroke-width="4"/><line x1="20" y1="19" x2="20" y2="21" stroke="currentColor" stroke-width="4"/><line x1="20" y1="24" x2="20" y2="37" stroke="currentColor" stroke-width="4"/></svg>',
  prism: '<svg viewBox="0 0 40 40"><polygon points="8,32 8,8 32,8" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>',
  block: '<svg viewBox="0 0 40 40"><rect x="12" y="6" width="16" height="28" fill="none" stroke="currentColor" stroke-width="3" rx="2"/></svg>',
};

const PANEL_TYPES = ['reflect', 'refract', 'tir', 'split', 'polariser', 'filter', 'dichroic', 'grating', 'slm', 'slits'];
/** CSS colour for a wavelength. */
const cssColour = (nm: number) => `#${wavelengthToColor(nm).getHexString()}`;
const colourDot = (band: Band, wl?: number) =>
  `<span class="cdot" style="background:${cssColour(wl ?? (band[0] + band[1]) / 2)}"></span>`;
const fresnelR = (it: Interaction) => fresnelReflectance(Math.cos(it.thetaI ?? 0), it.n1 ?? 1, it.n2 ?? 1);
const star = (on: boolean) => `<span class="star ${on ? 'on' : ''}">★</span>`;
const deg = (r?: number) => `${rad2deg(r ?? 0).toFixed(1)}°`;

export class Hud {
  private root: HTMLElement;
  private menu = el('div', 'menu hidden');
  private top = el('div', 'topbar hidden');
  private goals = el('div', 'goals hidden');
  private tray = el('div', 'tray hidden');
  private bubble = el('div', 'lumen-bubble hidden');
  private physics = el('div', 'physics-panel hidden');
  private selection = el('div', 'selection-info hidden');
  private modal = el('div', 'modal-backdrop hidden');
  private settingsPanel = el('div', 'settings-panel hidden');
  private toastEl = el('div', 'toast');
  private lines: string[] = [];
  private typing: number | null = null;
  private onLinesDone: (() => void) | null = null;

  constructor(container: HTMLElement, private cb: HudCallbacks, private getSettings: () => Settings) {
    this.root = el('div', 'hud');
    this.root.append(this.top, this.goals, this.tray, this.physics, this.selection, this.menu, this.bubble, this.modal, this.settingsPanel, this.toastEl);
    container.appendChild(this.root);
    this.buildTopbar();
    this.bubble.addEventListener('click', () => this.advance());
  }

  // ---------- Menu ----------

  showMenu(stars: (id: string) => number): void {
    const unlockAll = this.getSettings().unlockAll;
    this.menu.innerHTML = '';
    const head = el('div', 'menu-head', `<h1>${TEXT.gameTitle}</h1><p>${TEXT.tagline}</p>`);
    this.menu.appendChild(head);
    for (const ch of CHAPTERS) {
      const sec = el('section', 'chapter');
      sec.appendChild(el('h2', '', `<span>${TEXT.chapter} ${ch.id}</span> ${ch.title} <small>${ch.subtitle}</small>`));
      const grid = el('div', 'level-grid');
      const levels = LEVELS.filter((l) => l.chapter === ch.id);
      levels.forEach((lvl) => {
        const gi = LEVELS.indexOf(lvl);
        const prev = gi > 0 ? LEVELS[gi - 1] : null;
        const unlocked = unlockAll || !prev || stars(prev.id) > 0;
        const s = stars(lvl.id);
        const card = el('button', `level-card ${unlocked ? '' : 'locked'} ${s > 0 ? 'done' : ''}`);
        card.innerHTML = `<div class="lc-id">${lvl.id}</div><div class="lc-title">${lvl.title}</div><div class="lc-stars">${star(s >= 1)}${star(s >= 2)}${star(s >= 3)}</div>`;
        if (unlocked) {
          card.addEventListener('click', () => { audio.click(); this.cb.selectLevel(lvl.id); });
        } else {
          card.title = TEXT.locked;
          card.disabled = true;
        }
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      this.menu.appendChild(sec);
    }
    // Controls list stays hidden until asked for.
    const help = el('div', 'controls-help hidden');
    help.innerHTML = TEXT.controls.map(([k, v]) => `<div><kbd>${k}</kbd> ${v}</div>`).join('');
    const row = el('div', 'menu-buttons');
    const controlsBtn = el('button', 'btn ghost', `⌨ ${TEXT.buttons.controls}`);
    controlsBtn.addEventListener('click', () => {
      audio.click();
      const open = help.classList.toggle('hidden') === false;
      controlsBtn.classList.toggle('active', open);
    });
    const settingsBtn = el('button', 'btn ghost', `⚙ ${TEXT.buttons.settings}`);
    settingsBtn.addEventListener('click', () => this.toggleSettings());
    const creditsBtn = el('button', 'btn ghost', `✦ ${TEXT.buttons.credits}`);
    creditsBtn.addEventListener('click', () => { audio.click(); this.showCredits(); });
    row.append(controlsBtn, settingsBtn, creditsBtn);
    this.menu.append(row, help);

    this.menu.classList.remove('hidden');
    for (const e of [this.top, this.goals, this.tray, this.physics, this.selection]) e.classList.add('hidden');
    this.hideModal();
    this.say([TEXT.menuLumen]);
  }

  // ---------- In-level ----------

  enterLevel(level: LevelDef): void {
    this.menu.classList.add('hidden');
    this.settingsPanel.classList.add('hidden');
    this.top.classList.remove('hidden');
    this.goals.classList.remove('hidden');
    this.tray.classList.remove('hidden');
    this.hideModal();
    this.top.querySelector('.level-name')!.innerHTML = `<span>${level.id}</span> ${level.title}`;
  }

  private buildTopbar(): void {
    const t = TEXT.buttons;
    this.top.innerHTML = `
      <button class="btn" data-a="levels">☰ ${t.levels}</button>
      <div class="level-name"></div>
      <div class="spacer"></div>
      <button class="btn toggle" data-a="overlay" title="F">∠ ${t.overlay} <kbd>F</kbd></button>
      <button class="btn" data-a="hint" title="H">💡 ${t.hint} <kbd>H</kbd></button>
      <button class="btn toggle" data-a="top" title="T">⬒ ${t.topView} <kbd>T</kbd></button>
      <button class="btn toggle" data-a="sound" title="M">🔊 ${t.sound}</button>
      <button class="btn" data-a="music" title="Switch music">♫ <span class="track-name"></span></button>
      <button class="btn" data-a="reset">↺ ${t.reset}</button>
      <button class="btn" data-a="settings">⚙</button>`;
    this.top.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('button')?.dataset.a;
      if (!a) return;
      audio.click();
      if (a === 'levels') this.cb.backToMenu();
      if (a === 'overlay') this.cb.toggleOverlay();
      if (a === 'hint') this.cb.hint();
      if (a === 'top') this.cb.topView();
      if (a === 'sound') this.cb.toggleSound();
      if (a === 'music') this.cb.cycleMusic();
      if (a === 'reset') this.cb.reset();
      if (a === 'settings') this.toggleSettings();
    });
  }

  setToggles(t: { overlay: boolean; sound: boolean; topView: boolean }): void {
    this.top.querySelector('[data-a="overlay"]')!.classList.toggle('active', t.overlay);
    this.top.querySelector('[data-a="sound"]')!.classList.toggle('active', t.sound);
    this.top.querySelector('[data-a="top"]')!.classList.toggle('active', t.topView);
    const music = this.getSettings().music;
    this.top.querySelector('.track-name')!.textContent = TRACKS.find((x) => x.id === music)?.name ?? '';
  }

  setGoals(level: LevelDef, ev: Evaluation, elements: ElementState[]): void {
    const parOk = ev.placedCount <= level.par;
    const pct = (x: number) => `${Math.round(x * 100)}%`;
    const rows: string[] = [];
    // Receivers that need a share of a fan's power show a power meter instead of a count.
    const coloured = (e: ElementState) => !!(e.needs?.length || e.forbid?.length);
    const powered = elements.filter((e) => e.kind === 'target' && e.minPower !== undefined && !coloured(e));
    const colourIds = elements.filter((e) => e.kind === 'target' && coloured(e)).map((e) => e.id);
    const plain = ev.requiredTargets.length - powered.length - colourIds.length;
    if (plain > 0) {
      const special = (id: string) => powered.some((p) => p.id === id) || colourIds.includes(id);
      rows.push(`${plain > 1 ? TEXT.stars.solveAll : TEXT.stars.solve} <small>${ev.litTargets.filter((id) => !special(id)).length}/${plain}</small>`);
    }
    for (const t of powered) {
      const p = ev.trace.power.get(t.id) ?? 0;
      rows.push(`${TEXT.stars.power(pct(t.minPower!))} <small class="${p >= t.minPower! ? 'ok' : ''}">now ${pct(p)}</small>`);
    }
    for (const t of elements.filter((e) => e.kind === 'target' && (e.needs?.length || e.forbid?.length))) {
      const lit = ev.litTargets.includes(t.id);
      const want = (t.needs ?? []).map((n) => colourDot(n.band) + bandName(n.band)).join(' + ');
      rows.push(`${TEXT.stars.colour(want, !!t.forbid?.length)} <small class="${lit ? 'ok' : ''}">${lit ? 'lit' : 'dark'}</small>`);
    }
    for (const p of ev.patterns) {
      const what = p.goal.spacing ? TEXT.stars.fringes : TEXT.stars.central;
      const now = Number.isFinite(p.value) ? p.value.toFixed(3) : '—';
      // Tell the player which way to go: the pattern grows with the slit-to-screen distance L.
      let tip = '';
      if (!Number.isFinite(p.value)) tip = TEXT.stars.noPattern;
      else if (!p.ok) tip = p.value < p.target ? TEXT.stars.tooSmall : TEXT.stars.tooBig;
      rows.push(`${what(p.target.toFixed(2))} <small class="${p.ok ? 'ok' : ''}">now ${now}${p.L !== undefined ? ` · L = ${p.L.toFixed(1)}` : ''}</small>${tip ? `<br><small class="tip">${tip}</small>` : ''}`);
    }
    for (const im of ev.images) {
      const blur = im.formed ? im.blur.toFixed(2) : '—';
      rows.push(`${TEXT.stars.image} <small class="${im.sharp ? 'ok' : ''}">blur ${blur} / max ${im.goal.maxBlur}${im.formed ? ` · m = ${im.magnification.toFixed(2)}` : ''}</small>`);
    }
    this.goals.innerHTML = `
      <div class="goal ${ev.solved ? 'met' : ''}">${star(ev.solved)} ${rows.join('<br>')}</div>
      <div class="goal ${ev.solved && parOk ? 'met' : ''} ${!parOk ? 'fail' : ''}">${star(ev.solved && parOk)} ${TEXT.stars.par(level.par)}</div>
      <div class="goal ${ev.bonusMet ? 'met' : ''}">${star(ev.solved && ev.bonusMet)} ${level.bonus.description}</div>`;
  }

  setInventory(level: LevelDef, remaining: (k: PlaceableKind) => number, active: PlaceableKind | null): void {
    const kinds = Object.keys(level.inventory) as PlaceableKind[];
    this.tray.innerHTML = '';
    this.tray.classList.toggle('empty', kinds.length === 0);
    if (kinds.length === 0) {
      this.tray.innerHTML = `<div class="tray-note">${TEXT.fixedNote}</div>`;
      return;
    }
    for (const k of kinds) {
      const n = remaining(k);
      const b = el('button', `tray-item ${active === k ? 'active' : ''} ${n <= 0 ? 'empty' : ''}`);
      const spec = { ...ITEM_DEFAULTS[k], ...level.templates?.[k] };
      const name = TEXT.inventory[k] ?? spec.label ?? TEXT.elementNames[spec.kind ?? k] ?? k;
      const icon = ICONS[k] ?? ICONS[spec.kind ?? ''] ?? ICONS.mirror;
      const tint = spec.band ? ` style="color:${cssColour((spec.band[0] + spec.band[1]) / 2)}"` : '';
      b.innerHTML = `<i${tint}>${icon}</i><span>${name}</span><b>×${n}</b>`;
      b.disabled = n <= 0;
      b.addEventListener('click', () => this.cb.pickInventory(k));
      this.tray.appendChild(b);
    }
  }

  setSelection(text: string | null): void {
    this.selection.classList.toggle('hidden', !text);
    if (text) this.selection.innerHTML = text;
  }

  setPhysics(on: boolean, interactions: Interaction[], extra = ''): void {
    this.physics.classList.toggle('hidden', !on);
    if (!on) return;
    const pct = (x: number) => `${Math.round(x * 100)}%`;
    const rows = interactions
      .filter((i) => i.intensity >= 0.05 && PANEL_TYPES.includes(i.type))
      .slice(0, 12)
      .map((it): [string, string] => {
        const nm = it.wavelength ? `${it.wavelength} nm` : '';
        if (it.type === 'polariser') {
          const law = it.polIn === null || it.polIn === undefined
            ? 'unpolarised light → ½ passes'
            : `cos²(${it.polIn}° − ${it.axis}°) = ${pct(it.transmitted ?? 0)} passes`;
          return [`Polariser ${it.axis}°`, `<code>Malus: ${law}</code>`];
        }
        if (it.type === 'filter') return ['Colour filter', `<code>${colourDot(BANDS.green, it.wavelength)} ${nm}: only the filter's own colour band gets through</code>`];
        if (it.type === 'dichroic') return ['Dichroic mirror', `<code>${nm}: reflects its band, transmits the rest</code>`];
        if (it.type === 'grating' || it.type === 'slm') {
          const d = it.period ?? 2;
          const s1 = (it.wavelength ?? 532) / 1000 / d;
          const what = it.type === 'slm' ? 'SLM phase grating' : 'Diffraction grating';
          return [what, `<code>sin θₘ = sin θᵢ + m·λ/d, d = ${d} µm</code><code>${nm}: each order adds λ/d = ${s1.toFixed(3)} to sin θ (head-on: θ₁ = ${deg(Math.asin(Math.min(1, s1)))})</code>`];
        }
        if (it.type === 'slits') return ['Slits', '<code>pattern on the screen: Δy = λL/d (double), W = 2λL/a (single)</code>'];
        if (it.type === 'reflect') {
          return ['Reflection', `<code>θᵢ = θᵣ = ${deg(it.thetaI)}</code>`];
        }
        if (it.type === 'split') {
          return ['Beam splitter', `<code>in ${pct(it.intensity)} → ${pct(it.intensity / 2)} reflected + ${pct(it.intensity / 2)} through</code><code>θᵢ = θᵣ = ${deg(it.thetaI)}</code>`];
        }
        if (it.type === 'tir') {
          const c = Math.asin((it.n2 ?? 1) / (it.n1 ?? 1.5));
          return ['Total internal reflection', `<code>sin θc = ${it.n2?.toFixed(2)} / ${it.n1?.toFixed(2)} → θc = ${deg(c)}</code><code>θ = ${deg(it.thetaI)} &gt; θc: all light reflects</code>`];
        }
        return [`Refraction <small>(${it.ar ? 'AR coated: no reflection' : `${pct(fresnelR(it))} reflected`})</small>`, `<code>${it.n1?.toFixed(2)} · sin ${deg(it.thetaI)} = ${it.n2?.toFixed(2)} · sin ${deg(it.thetaT)}</code><code>${((it.n1 ?? 1) * Math.sin(it.thetaI ?? 0)).toFixed(3)} = ${((it.n2 ?? 1) * Math.sin(it.thetaT ?? 0)).toFixed(3)}</code>`];
      })
      // Merge identical consecutive steps (e.g. many bounces inside a fibre).
      .reduce<{ title: string; body: string; count: number; first: number }[]>((acc, [title, body], i) => {
        const last = acc[acc.length - 1];
        if (last && last.title === title && last.body === body) last.count++;
        else acc.push({ title, body, count: 1, first: i + 1 });
        return acc;
      }, [])
      .slice(0, 8)
      .map((r) => `<li><b>${r.count > 1 ? `#${r.first}–${r.first + r.count - 1}` : `#${r.first}`} ${r.title}${r.count > 1 ? ` ×${r.count}` : ''}</b>${r.body}</li>`);
    const body = rows.length ? `<ol>${rows.join('')}</ol>` : extra ? '' : '<p>No surfaces hit yet. Put something in the beam!</p>';
    this.physics.innerHTML = `<h3>Physics overlay</h3>${extra}${body}${rows.length ? '<p class="muted">Angles are measured from the normal (dashed line).</p>' : ''}`;
  }

  // ---------- Lumen ----------

  say(lines: string[], onDone?: () => void): void {
    this.lines = [...lines];
    this.onLinesDone = onDone ?? null;
    this.bubble.classList.remove('hidden');
    this.showLine();
  }

  get talking(): boolean {
    return !this.bubble.classList.contains('hidden');
  }

  private showLine(): void {
    const line = this.lines.shift();
    if (line === undefined) {
      this.bubble.classList.add('hidden');
      const done = this.onLinesDone;
      this.onLinesDone = null;
      done?.();
      return;
    }
    const more = this.lines.length > 0;
    this.bubble.innerHTML = `<div class="lumen-avatar"><i></i><i></i></div><div class="lumen-text"><div class="lumen-name">LUMEN</div><p></p><div class="lumen-more">${more ? 'Click to continue ▸' : 'Click to close ✕'}</div></div>`;
    const p = this.bubble.querySelector('p')!;
    if (this.typing) clearInterval(this.typing);
    let i = 0;
    this.typing = window.setInterval(() => {
      i += 2;
      p.textContent = line.slice(0, i);
      if (i % 6 === 0) audio.talk();
      if (i >= line.length) {
        clearInterval(this.typing!);
        this.typing = null;
      }
    }, 18);
    p.dataset.full = line;
  }

  /** Next line (or finish the current one instantly). */
  advance(): void {
    const p = this.bubble.querySelector('p');
    if (this.typing && p) {
      clearInterval(this.typing);
      this.typing = null;
      p.textContent = p.dataset.full ?? '';
      return;
    }
    this.showLine();
  }

  // ---------- Completion ----------

  showComplete(level: LevelDef, stars: number, newBest: boolean, hasNext: boolean, lumenLine: string): void {
    const ex = level.explanation;
    this.modal.innerHTML = `
      <div class="modal">
        <div class="modal-stars">${[1, 2, 3].map((i) => `<span class="big-star ${stars >= i ? 'on' : ''}" style="animation-delay:${i * 0.15}s">★</span>`).join('')}</div>
        <div class="modal-lumen"><div class="lumen-avatar small"><i></i><i></i></div><span>${lumenLine}${newBest ? ' <em>New best!</em>' : ''}</span></div>
        <h2>${ex.title}</h2>
        <p>${ex.body}</p>
        <details><summary>${TEXT.buttons.deeper}</summary><p>${ex.deeper}</p></details>
        <div class="modal-actions">
          ${stars < 3 ? `<button class="btn" data-a="replay">${TEXT.buttons.replay}</button>` : ''}
          <button class="btn" data-a="keep">${TEXT.buttons.keep}</button>
          ${hasNext ? `<button class="btn primary" data-a="next">${TEXT.buttons.next} ▸</button>` : `<button class="btn primary" data-a="levels">${TEXT.buttons.levels}</button>`}
        </div>
      </div>`;
    this.modal.classList.remove('hidden');
    this.modal.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => {
        audio.click();
        const a = b.dataset.a;
        this.hideModal();
        if (a === 'next') this.cb.next();
        if (a === 'levels') this.cb.backToMenu();
        if (a === 'replay') this.cb.reset();
      }),
    );
  }

  hideModal(): void {
    this.modal.classList.add('hidden');
  }

  get modalOpen(): boolean {
    return !this.modal.classList.contains('hidden');
  }

  // ---------- Settings ----------

  private showCredits(): void {
    this.modal.innerHTML = `
      <div class="modal credits">
        <h2>${TEXT.gameTitle}</h2>
        ${TEXT.credits.map((line) => `<p>${line}</p>`).join('')}
        <div class="modal-actions"><button class="btn primary" data-a="close">${TEXT.buttons.close}</button></div>
      </div>`;
    this.modal.classList.remove('hidden');
    this.modal.querySelector('button')!.addEventListener('click', () => { audio.click(); this.hideModal(); });
  }

  /** Larger interface text, for classroom projectors. */
  applyLargeText(on: boolean): void {
    this.root.classList.toggle('large', on === true);
  }

  private toggleSettings(): void {
    if (!this.settingsPanel.classList.contains('hidden')) {
      this.settingsPanel.classList.add('hidden');
      return;
    }
    const s = this.getSettings();
    const T = TEXT.settings;
    const opts = (Object.keys(T.qualityOptions) as Quality[])
      .map((q) => `<option value="${q}" ${s.quality === q ? 'selected' : ''}>${T.qualityOptions[q]}</option>`).join('');
    this.settingsPanel.innerHTML = `
      <h3>${TEXT.buttons.settings}</h3>
      <label>${T.quality}<select data-s="quality">${opts}</select></label>
      <label>${T.music}<select data-s="music">${TRACKS.map((tr) => `<option value="${tr.id}" ${s.music === tr.id ? 'selected' : ''}>${tr.name}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" data-s="unlock" ${s.unlockAll ? 'checked' : ''}> ${T.unlockAll}</label>
      <label class="check"><input type="checkbox" data-s="large" ${s.largeText ? 'checked' : ''}> ${T.largeText}</label>
      <button class="btn danger" data-s="reset">${T.resetProgress}</button>
      <button class="btn" data-s="close">${TEXT.buttons.close}</button>`;
    this.settingsPanel.classList.remove('hidden');
    this.settingsPanel.querySelector('[data-s="quality"]')!.addEventListener('change', (e) =>
      this.cb.changeSettings({ quality: (e.target as HTMLSelectElement).value as Quality }));
    this.settingsPanel.querySelector('[data-s="music"]')!.addEventListener('change', (e) =>
      this.cb.changeSettings({ music: (e.target as HTMLSelectElement).value as TrackId }));
    this.settingsPanel.querySelector('[data-s="unlock"]')!.addEventListener('change', (e) =>
      this.cb.changeSettings({ unlockAll: (e.target as HTMLInputElement).checked }));
    this.settingsPanel.querySelector('[data-s="large"]')!.addEventListener('change', (e) =>
      this.cb.changeSettings({ largeText: (e.target as HTMLInputElement).checked }));
    this.settingsPanel.querySelector('[data-s="reset"]')!.addEventListener('click', () => {
      if (confirm(T.confirmReset)) this.cb.resetProgress();
    });
    this.settingsPanel.querySelector('[data-s="close"]')!.addEventListener('click', () => this.settingsPanel.classList.add('hidden'));
  }

  toast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
  }
}
