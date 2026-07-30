const players = [createEmptyPlayer(), createEmptyPlayer()];
let characters = JSON.parse(localStorage.getItem('akz_characters') || '[]');
function saveCharacters() { localStorage.setItem('akz_characters', JSON.stringify(characters)); }
const state = {
  activeIndex: 0,
  phase: 'setup',
  selectedAction: null,
  rollResults: null,
  winner: null,
  battleLog: [],
};

const q = selector => document.querySelector(selector);
const qa = selector => Array.from(document.querySelectorAll(selector));

function createEmptyPlayer() {
  return {
    name: '',
    maxHp: 20,
    hp: 20,
    maxStamina: 10,
    stamina: 10,
    dex: 3,
    block: 0,
    saved: false,
  };
}

function init() {
  qa('[id^="save-player-"]').forEach(button => button.addEventListener('click', handleSavePlayer));
  qa('.player-title-button').forEach(button => button.addEventListener('click', handlePlayerTitleEdit));
  qa('.attribute-pill').forEach(button => button.addEventListener('click', handleAttributeEdit));
  q('#start-duel').addEventListener('click', showRollScreen);
  q('#roll-button').addEventListener('click', rollDice);
  q('#confirm-start').addEventListener('click', startBattle);
  const createBtn = q('#create-character');
  if (createBtn) createBtn.addEventListener('click', createCharacter);
  const viewHist = q('#view-history');
  if (viewHist) viewHist.addEventListener('click', toggleHistory);
  const startSel = q('#start-battle-selected');
  if (startSel) startSel.addEventListener('click', startBattleSelected);
  qa('.status-card[data-action]').forEach(card => card.addEventListener('click', handleActionSelect));
  const endBtn = q('#end-turn');
  if (endBtn) endBtn.addEventListener('click', finalizeTurn);
  const fsPopup = q('#fullscreen-popup');
  if (fsPopup) {
    // Show popup only if any fullscreen API is available
    const hasFs = !!(document.fullscreenEnabled || document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || document.documentElement.msRequestFullscreen);
    if (!hasFs) {
      fsPopup.style.display = 'none';
    } else {
      fsPopup.addEventListener('click', toggleFullscreen);
    }
  }
  const restart2 = q('#restart-button-2');
  if (restart2) restart2.addEventListener('click', resetGame);
  render();
}

function createCharacter() {
  const name = window.prompt('Nombre del nuevo personaje');
  if (!name) return;
  const hp = Number(window.prompt('Vida máxima', '20')) || 20;
  const stamina = Number(window.prompt('Stamina máxima', '10')) || 10;
  const dex = Number(window.prompt('Destreza (-5 a 5)', '3')) || 3;
  const c = { name: name.trim(), maxHp: hp, hp: hp, maxStamina: stamina, stamina: stamina, dex: dex };
  characters.push(c);
  saveCharacters();
  renderHome();
}

function editCharacter(idx) {
  const c = characters[idx];
  if (!c) return;
  const name = window.prompt('Nombre', c.name);
  if (name !== null) c.name = name.trim() || c.name;
  const hp = window.prompt('Vida máxima', String(c.maxHp));
  if (hp !== null) { const n = Number(hp); if (Number.isFinite(n) && n>0) { c.maxHp = n; c.hp = Math.min(c.hp, c.maxHp); } }
  const stam = window.prompt('Stamina máxima', String(c.maxStamina));
  if (stam !== null) { const n = Number(stam); if (Number.isFinite(n) && n>0) { c.maxStamina = n; c.stamina = Math.min(c.stamina, c.maxStamina); } }
  const dex = window.prompt('Destreza (-5 a 5)', String(c.dex||3));
  if (dex !== null) { const n = Number(dex); if (Number.isFinite(n)) c.dex = Math.max(-5, Math.min(5, n)); }
  saveCharacters();
  renderHome();
}

function renderHome() {
  const list = q('#home-list');
  if (!list) return;
  list.innerHTML = '';
  if (characters.length === 0) {
    list.innerHTML = '<p class="muted">No hay personajes. Crea uno nuevo.</p>';
    return;
  }
  characters.forEach((c, i) => {
    const card = document.createElement('div');
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'space-between';
    card.style.padding = '8px';
    card.style.margin = '6px 0';
    card.style.background = 'rgba(15,23,42,0.6)';
    card.style.borderRadius = '8px';
    const left = document.createElement('div');
    left.innerHTML = `<strong>${c.name}</strong><div class="muted">Vida ${c.maxHp} · Stamina ${c.maxStamina} · Dex ${c.dex}</div>`;
    const right = document.createElement('div');
    right.style.display = 'flex'; right.style.gap = '6px';
    const sel = document.createElement('input'); sel.type = 'checkbox'; sel.dataset.idx = String(i); sel.className = 'select-char';
    const edit = document.createElement('button'); edit.className = 'small-button secondary-button'; edit.textContent = 'Editar'; edit.dataset.idx = String(i);
    edit.addEventListener('click', () => editCharacter(i));
    right.appendChild(sel); right.appendChild(edit);
    card.appendChild(left); card.appendChild(right);
    list.appendChild(card);
  });
}

function toggleHistory() {
  const el = q('#history-list');
  if (!el) return;
  if (el.classList.contains('hidden')) {
    const hist = JSON.parse(localStorage.getItem('akz_battles') || '[]');
    if (hist.length === 0) el.innerHTML = '<p class="muted">No hay historial.</p>';
    else el.innerHTML = hist.map(h => `<div style="margin-bottom:6px">${new Date(h.time).toLocaleString()}: <strong>${h.winner}</strong> vs ${h.loser}</div>`).join('');
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

function startBattleSelected() {
  const checks = Array.from(document.querySelectorAll('.select-char:checked'));
  if (checks.length !== 2) { alert('Selecciona exactamente dos personajes para iniciar la batalla.'); return; }
  const a = characters[Number(checks[0].dataset.idx)];
  const b = characters[Number(checks[1].dataset.idx)];
  if (!a || !b) return;
  // copy into players
  players[0] = { ...a, saved: true, block: 0, hp: a.maxHp };
  players[1] = { ...b, saved: true, block: 0, hp: b.maxHp };
  state.phase = 'roll';
  state.rollResults = null;
  state.battleLog = [];
  render();
}

function updateFullscreenButton() {
  const fsPopup = q('#fullscreen-popup');
  if (!fsPopup) return;
  const fs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
  fsPopup.textContent = fs ? '✕' : '⤢';
  fsPopup.title = fs ? 'Salir de pantalla completa' : 'Pantalla completa';
}

function handleSavePlayer(event) {
  const index = Number(event.currentTarget.dataset.player);
  const nameEl = q(`#player-${index}-name`);
  const hpEl = q(`#player-${index}-hp`);
  const staminaEl = q(`#player-${index}-stamina`);
  const dexEl = q(`#player-${index}-dex`);
  const name = nameEl.value.trim();
  const maxHp = Number(hpEl.value);
  const maxStamina = Number(staminaEl.value);
  const dex = Number(dexEl.value);

  if (!name) {
    alert('Escribe el nombre del jugador.');
    return;
  }
  if (maxHp < 1 || maxStamina < 1 || dex < -5 || dex > 5) {
    alert('Valores inválidos. Verifica vida, stamina y destreza.');
    return;
  }

  players[index] = {
    name,
    maxHp,
    hp: maxHp,
    maxStamina,
    stamina: maxStamina,
    dex,
    block: 0,
    saved: true,
  };

  q(`#save-player-${index}`).textContent = `Jugador ${index + 1} guardado`;
  q(`#save-player-${index}`).disabled = true;
  syncSetupUI();
  render();
}

function showRollScreen() {
  state.phase = 'roll';
  state.rollResults = null;
  state.selectedAction = null;
  render();
}

function rollDice() {
  const dice1 = Math.floor(Math.random() * 20) + 1;
  const dice2 = Math.floor(Math.random() * 20) + 1;
  const score1 = dice1 + players[0].dex;
  const score2 = dice2 + players[1].dex;
  let winnerIndex = null;
  let text = `Jugador 1: ${dice1} + ${players[0].dex} = ${score1}. Jugador 2: ${dice2} + ${players[1].dex} = ${score2}. `;

  if (score1 === score2) {
    text += 'Empate. Vuelve a lanzar.';
    q('#starter-text').textContent = text;
    q('#confirm-start').classList.add('hidden');
    return;
  }

  winnerIndex = score1 > score2 ? 0 : 1;
  state.rollResults = { winnerIndex, score1, score2, dice1, dice2 };
  state.activeIndex = winnerIndex;
  text += `Comienza ${players[winnerIndex].name}.`;
  q('#starter-text').textContent = text;
  q('#confirm-start').classList.remove('hidden');
}

function startBattle() {
  state.phase = 'battle';
  state.selectedAction = null;
  state.battleLog = [];
  render();
}

function handleActionSelect(event) {
  if (state.phase !== 'battle' || state.winner) return;
  const action = event.currentTarget.dataset.action;
  state.selectedAction = action;
  render();
}

function resetGame() {
  players[0] = createEmptyPlayer();
  players[1] = createEmptyPlayer();
  state.phase = 'setup';
  state.activeIndex = 0;
  state.selectedAction = null;
  state.rollResults = null;
  state.winner = null;
  state.battleLog = [];

  q('#save-player-0').textContent = 'Guardar jugador 1';
  q('#save-player-1').textContent = 'Guardar jugador 2';
  q('#save-player-0').disabled = false;
  q('#save-player-1').disabled = false;
  syncSetupUI();
  render();
}

function syncSetupUI() {
  for (let index = 0; index < players.length; index++) {
    const player = players[index];
    const titleButton = q(`#player-${index}-title`);
    const nameInput = q(`#player-${index}-name`);
    const hpInput = q(`#player-${index}-hp`);
    const staminaInput = q(`#player-${index}-stamina`);
    const dexInput = q(`#player-${index}-dex`);
    const saveButton = q(`#save-player-${index}`);

    if (titleButton) {
      titleButton.textContent = player.name || `Jugador ${index + 1}`;
    }
    if (nameInput) nameInput.value = player.name || '';
    if (hpInput) hpInput.value = String(player.maxHp);
    if (staminaInput) staminaInput.value = String(player.maxStamina);
    if (dexInput) dexInput.value = String(player.dex);
    if (saveButton) {
      saveButton.textContent = player.saved ? `Jugador ${index + 1} guardado` : `Guardar jugador ${index + 1}`;
      saveButton.disabled = Boolean(player.saved);
    }

    const hpButton = q(`#player-${index}-card .attribute-pill[data-attr="hp"]`);
    const staminaButton = q(`#player-${index}-card .attribute-pill[data-attr="stamina"]`);
    const dexButton = q(`#player-${index}-card .attribute-pill[data-attr="dex"]`);
    if (hpButton) hpButton.textContent = `Vida: ${player.maxHp}`;
    if (staminaButton) staminaButton.textContent = `Stamina: ${player.maxStamina}`;
    if (dexButton) dexButton.textContent = `Destreza: ${player.dex}`;
  }
}

function handlePlayerTitleEdit(event) {
  const index = Number(event.currentTarget.dataset.player);
  const current = players[index].name || `Jugador ${index + 1}`;
  const value = window.prompt('Nombre del jugador', current);
  if (value === null) return;
  players[index].name = value.trim() || current;
  syncSetupUI();
}

function handleAttributeEdit(event) {
  const index = Number(event.currentTarget.dataset.player);
  const attr = event.currentTarget.dataset.attr;
  let currentValue = 0;
  let min = 1;
  let max = 20;
  let label = '';

  if (attr === 'hp') {
    currentValue = players[index].maxHp;
    label = 'Vida máxima';
    max = 200;
  } else if (attr === 'stamina') {
    currentValue = players[index].maxStamina;
    label = 'Stamina máxima';
    max = 100;
  } else if (attr === 'dex') {
    currentValue = players[index].dex;
    label = 'Destreza';
    min = -5;
    max = 5;
  }

  const value = window.prompt(`${label} (${min} a ${max})`, String(currentValue));
  if (value === null) return;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return;
  if (attr === 'hp') {
    players[index].maxHp = Math.max(min, Math.min(max, numeric));
    players[index].hp = players[index].maxHp;
  } else if (attr === 'stamina') {
    players[index].maxStamina = Math.max(min, Math.min(max, numeric));
    players[index].stamina = players[index].maxStamina;
  } else if (attr === 'dex') {
    players[index].dex = Math.max(min, Math.min(max, numeric));
  }
  syncSetupUI();
}

function toggleFullscreen() {
  const el = document.documentElement;
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
  if (!isFs) {
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) {
      try { req.call(el); } catch (e) { console.warn('Fullscreen request failed', e); }
    } else {
      alert('Pantalla completa no está disponible en este navegador.');
    }
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (exit) exit.call(document);
  }
  setTimeout(updateFullscreenButton, 100);
}

function render() {
  q('#setup-screen').classList.toggle('active-screen', state.phase === 'setup');
  q('#roll-screen').classList.toggle('active-screen', state.phase === 'roll');
  q('#battle-screen').classList.toggle('active-screen', state.phase === 'battle');
  q('#start-duel').disabled = !(players[0].saved && players[1].saved);

  if (state.phase === 'setup') {
    syncSetupUI();
  }

  if (state.phase === 'roll') {
    q('#roll-text').textContent = `Toca lanzar el dado para ver quién comienza.`;
    q('#starter-text').textContent = state.rollResults ? q('#starter-text').textContent : '';
  }

  if (state.phase === 'battle') {
    const active = players[state.activeIndex];
    q('#battle-title').textContent = `Turno de ${active.name}`;
    q('#current-turn-label').textContent = `Jugador activo: ${active.name}`;
    // Show only the active player's name in the main header
    const title = q('#app-title');
    if (title) title.textContent = active.name || `Jugador ${state.activeIndex + 1}`;
    q('#stat-health').textContent = `${active.hp} / ${active.maxHp}`;
    q('#health-bar').max = active.maxHp;
    q('#health-bar').value = Math.max(0, active.hp);
    q('#stat-stamina').textContent = `${active.stamina} / ${active.maxStamina}`;
    q('#stamina-bar').max = active.maxStamina;
    q('#stamina-bar').value = Math.max(0, active.stamina);
    q('#stat-block').textContent = `${active.block}`;
    q('#action-panel').classList.toggle('hidden', !state.selectedAction || state.winner);
    renderActionPanel();
    q('#battle-log').innerHTML = renderBattleLog();
  }
  else {
    const title = q('#app-title');
    if (title) title.textContent = '';
  }
}

function renderActionPanel() {
  const panel = q('#action-panel');
  const content = q('#action-content');
  content.innerHTML = '';
  const active = players[state.activeIndex];
  const opponent = players[1 - state.activeIndex];

  if (!state.selectedAction) {
    panel.classList.add('hidden');
    return;
  }

  let title = '';
  let controlNode;

  if (state.selectedAction === 'health') {
    title = 'Ajustar Vida';
    controlNode = createSliderAction('Selecciona cuánta vida sumar', 1, active.maxHp, Math.min(active.maxHp, 1), value => {
      active.hp = Math.min(active.maxHp, active.hp + value);
      afterAction(`${active.name} gana ${value} puntos de vida.`);
    });
  }

  if (state.selectedAction === 'stamina') {
    title = 'Usar Stamina';
    controlNode = createSliderAction('Selecciona cuánto stamina gastar', 1, 10, Math.min(10, active.stamina), value => {
      active.stamina = Math.max(0, active.stamina - value);
      afterAction(`${active.name} gasta ${value} de stamina.`);
    });
  }

  if (state.selectedAction === 'block') {
    title = 'Ajustar Bloqueo';
    const blockForm = document.createElement('div');
    blockForm.className = 'action-controls';
    const optionRow = document.createElement('div');
    optionRow.className = 'control-row';
    optionRow.innerHTML = `
      <label>
        <input type="radio" name="block-mode" value="more" checked /> Añadir
      </label>
      <label>
        <input type="radio" name="block-mode" value="less" /> Restar
      </label>
    `;
    const sliderRow = document.createElement('div');
    sliderRow.className = 'action-controls';
    const sliderLabel = document.createElement('label');
    sliderLabel.textContent = active.block === 0 ? 'Selecciona cuánto bloquear' : 'Selecciona cuánto ajustar';
    const blockSlider = document.createElement('input');
    blockSlider.type = 'range';
    blockSlider.min = 1;
    blockSlider.max = 30;
    blockSlider.value = 1;
    blockSlider.id = 'block-slider';
    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = '1';
    const displayRow = document.createElement('div');
    displayRow.className = 'control-row';
    displayRow.append(sliderLabel, valueDisplay);
    sliderRow.appendChild(blockSlider);
    blockForm.append(optionRow, displayRow, sliderRow);

    const updateSlider = () => {
      const mode = blockForm.querySelector('input[name="block-mode"]:checked').value;
      if (mode === 'more') {
        sliderLabel.textContent = 'Valor a sumar a bloqueo';
        blockSlider.min = 1;
        blockSlider.max = 30;
        if (blockSlider.value > 30) blockSlider.value = 30;
      } else {
        const maxValue = Math.max(1, active.block);
        sliderLabel.textContent = 'Valor a restar de bloqueo';
        blockSlider.min = 1;
        blockSlider.max = maxValue;
        if (blockSlider.value > maxValue) blockSlider.value = maxValue;
      }
      valueDisplay.textContent = blockSlider.value;
      blockSlider.disabled = mode === 'less' && active.block === 0;
      if (active.block === 0 && mode === 'less') {
        valueDisplay.textContent = '0';
      }
    };

    blockForm.querySelectorAll('input[name="block-mode"]').forEach(input => {
      input.addEventListener('change', updateSlider);
    });

    blockSlider.addEventListener('input', () => { valueDisplay.textContent = blockSlider.value; });
    updateSlider();

    const okButton = document.createElement('button');
    okButton.className = 'primary-button';
    okButton.textContent = 'Ok';
    okButton.addEventListener('click', () => {
      const mode = blockForm.querySelector('input[name="block-mode"]:checked').value;
      const value = Number(blockSlider.value);
      if (mode === 'more') {
        active.block += value;
        afterAction(`${active.name} suma ${value} a bloqueo.`);
      } else {
        if (active.block <= 0) {
          alert('No se puede restar bloqueo porque es cero.');
          return;
        }
        active.block = Math.max(0, active.block - value);
        afterAction(`${active.name} resta ${value} de bloqueo.`);
      }
    });

    blockForm.appendChild(okButton);
    controlNode = blockForm;
  }

  if (state.selectedAction === 'attack') {
    title = 'Atacar al rival';
    controlNode = createSliderAction(`Selecciona el daño para ${opponent.name}`, 1, active.maxHp, 1, value => {
      let remainingDamage = value;
      let blockUsed = 0;
      if (opponent.block > 0) {
        blockUsed = Math.min(opponent.block, remainingDamage);
        opponent.block = Math.max(0, opponent.block - blockUsed);
        remainingDamage -= blockUsed;
      }
      if (remainingDamage > 0) {
        opponent.hp = Math.max(opponent.hp - remainingDamage, 0);
      }
      const blockText = blockUsed > 0 ? `${blockUsed} al bloqueo` : '';
      const lifeText = remainingDamage > 0 ? `${remainingDamage} a la vida` : '';
      const parts = [blockText, lifeText].filter(Boolean).join(' y ');
      const detail = `Vida restante: ${opponent.hp}/${opponent.maxHp}; bloqueo restante: ${opponent.block}`;
      afterAction(`${active.name} inflige ${value} de daño a ${opponent.name} (${parts}). ${detail}`);
    });
  }

  if (state.selectedAction === 'self-damage') {
    title = 'Autodaño';
    controlNode = createSliderAction(`Selecciona el daño que te infliges`, 1, active.maxHp, 1, value => {
      let remainingDamage = value;
      let blockUsed = 0;
      if (active.block > 0) {
        blockUsed = Math.min(active.block, remainingDamage);
        active.block = Math.max(0, active.block - blockUsed);
        remainingDamage -= blockUsed;
      }
      if (remainingDamage > 0) {
        active.hp = Math.max(active.hp - remainingDamage, 0);
      }
      const blockText = blockUsed > 0 ? `${blockUsed} al bloqueo` : '';
      const lifeText = remainingDamage > 0 ? `${remainingDamage} a la vida` : '';
      const parts = [blockText, lifeText].filter(Boolean).join(' y ');
      const detail = `Vida restante: ${active.hp}/${active.maxHp}; bloqueo restante: ${active.block}`;
      afterAction(`${active.name} se inflige ${value} de daño (${parts}). ${detail}`);
    });
  }

  if (state.selectedAction === 'pass') {
    title = 'Pasar (ganar stamina)';
    controlNode = createSliderAction('Selecciona cuánto stamina ganar', 1, 30, 1, value => {
      const requested = active.stamina + value;
      if (requested <= active.maxStamina) {
        active.stamina = requested;
        afterAction(`${active.name} gana ${value} de stamina (ahora ${active.stamina}/${active.maxStamina}).`);
        return;
      }
      showIncreaseMaxPrompt(active, requested, value);
    });
  }

  q('#action-panel-title').textContent = title;
  content.appendChild(controlNode);
}

function createSliderAction(label, min, max, value, callback) {
  const wrapper = document.createElement('div');
  wrapper.className = 'action-controls';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  const valueRow = document.createElement('div');
  valueRow.className = 'control-row';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = min;
  slider.max = max;
  slider.value = value;
  slider.id = 'action-slider';
  const valueDisplay = document.createElement('span');
  valueDisplay.textContent = String(value);
  valueRow.appendChild(slider);
  valueRow.appendChild(valueDisplay);

  slider.addEventListener('input', () => { valueDisplay.textContent = slider.value; });

  const okButton = document.createElement('button');
  okButton.className = 'primary-button';
  okButton.textContent = 'Ok';
  okButton.addEventListener('click', () => {
    callback(Number(slider.value));
  });

  wrapper.append(labelEl, valueRow, okButton);
  return wrapper;
}

function afterAction(message, keepPanel = false) {
  // Record action in the fight log but DO NOT switch turn automatically.
  updateLog(message);
  if (!keepPanel) {
    state.selectedAction = null;
  }
  checkGameEnd();
  render();
}

function updateLog(entry) {
  state.battleLog.unshift(entry);
}

function renderBattleLog() {
  if (state.battleLog.length === 0) {
    return `<p>${players[state.activeIndex].name} está listo para actuar.</p>`;
  }
  return state.battleLog.map(entry => `<p>${entry}</p>`).join('');
}

function checkGameEnd() {
  for (let i = 0; i < players.length; i++) {
    if (players[i].hp <= 0) {
      state.winner = players[1 - i] || players[i];
      q('#action-panel').classList.add('hidden');
      updateLog(`${state.winner.name} ha ganado el duelo.`);
      // persist history
      try {
        const hist = JSON.parse(localStorage.getItem('akz_battles') || '[]');
        hist.unshift({ time: Date.now(), winner: state.winner.name, loser: players[i].name });
        localStorage.setItem('akz_battles', JSON.stringify(hist.slice(0,200)));
      } catch (e) { console.warn('hist save failed', e); }
      return true;
    }
  }
  return false;
}

function finalizeTurn() {
  if (state.winner) return;
  state.selectedAction = null;
  state.activeIndex = 1 - state.activeIndex;
  updateLog(`Turno: ahora es el turno de ${players[state.activeIndex].name}.`);
  render();
}

function showIncreaseMaxPrompt(player, requestedValue, addedValue) {
  const panel = q('#action-panel');
  const modal = document.createElement('div');
  modal.className = 'action-controls';
  modal.style.marginTop = '12px';
  const msg = document.createElement('p');
  msg.textContent = `${player.name} intenta ganar ${addedValue} de stamina, lo que llevaría su stamina a ${requestedValue} (máximo actual ${player.maxStamina}). ¿Deseas aumentar la stamina máxima?`;
  const controls = document.createElement('div');
  controls.className = 'control-row';
  const yesBtn = document.createElement('button');
  yesBtn.className = 'secondary-button';
  yesBtn.textContent = 'Sí';
  const noBtn = document.createElement('button');
  noBtn.className = 'primary-button';
  noBtn.textContent = 'No';
  controls.appendChild(yesBtn);
  controls.appendChild(noBtn);
  modal.appendChild(msg);
  modal.appendChild(controls);
  panel.appendChild(modal);

  yesBtn.addEventListener('click', () => {
    player.maxStamina = requestedValue;
    player.stamina = requestedValue;
    updateLog(`${player.name} aumenta su stamina máxima a ${requestedValue}.`);
    panel.removeChild(modal);
    render();
  });

  noBtn.addEventListener('click', () => {
    player.stamina = player.maxStamina;
    updateLog(`${player.name} decide no aumentar la stamina máxima y se queda con ${player.stamina}/${player.maxStamina}.`);
    panel.removeChild(modal);
    render();
  });
}

document.addEventListener('fullscreenchange', updateFullscreenButton);
init();
updateFullscreenButton();
