const players = [createEmptyPlayer(), createEmptyPlayer()];
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
  q('#start-duel').addEventListener('click', showRollScreen);
  q('#roll-button').addEventListener('click', rollDice);
  q('#confirm-start').addEventListener('click', startBattle);
  q('#restart-button').addEventListener('click', resetGame);
  qa('.status-card').forEach(card => card.addEventListener('click', handleActionSelect));
  q('#end-turn').addEventListener('click', finalizeTurn);
  const restart2 = q('#restart-button-2');
  if (restart2) restart2.addEventListener('click', resetGame);
  render();
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
  if (maxHp < 1 || maxStamina < 1 || dex < 1 || dex > 5) {
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
  q('#player-0-name').value = '';
  q('#player-0-hp').value = '20';
  q('#player-0-stamina').value = '10';
  q('#player-0-dex').value = '3';
  q('#player-1-name').value = '';
  q('#player-1-hp').value = '20';
  q('#player-1-stamina').value = '10';
  q('#player-1-dex').value = '3';
  render();
}

function render() {
  q('#setup-screen').classList.toggle('active-screen', state.phase === 'setup');
  q('#roll-screen').classList.toggle('active-screen', state.phase === 'roll');
  q('#battle-screen').classList.toggle('active-screen', state.phase === 'battle');
  q('#start-duel').disabled = !(players[0].saved && players[1].saved);

  if (state.phase === 'roll') {
    q('#roll-text').textContent = `Toca lanzar el dado para ver quién comienza.`;
    q('#starter-text').textContent = state.rollResults ? q('#starter-text').textContent : '';
  }

  if (state.phase === 'battle') {
    const active = players[state.activeIndex];
    q('#battle-title').textContent = `Turno de ${active.name}`;
    q('#current-turn-label').textContent = `Jugador activo: ${active.name}`;
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
      const previous = active.stamina;
      const next = Math.min(active.maxStamina, active.stamina + value);
      const overflow = Math.max(0, previous + value - active.maxStamina);
      active.stamina = next;
      const message = `${active.name} gana ${value} de stamina (ahora ${active.stamina}/${active.maxStamina}).`;
      if (overflow > 0) {
        const cappedMessage = `${active.name} intenta ganar ${value}, pero solo se le permite llegar a ${active.maxStamina} de stamina. El exceso (${overflow}) no se suma.`;
        afterAction(cappedMessage);
        return;
      }
      afterAction(message);
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

function showIncreaseMaxPrompt(player, added) {
  const panel = q('#action-panel');
  const modal = document.createElement('div');
  modal.className = 'action-controls';
  modal.style.marginTop = '12px';
  const msg = document.createElement('p');
  msg.textContent = `La stamina actual (${player.stamina}) excede la stamina máxima (${player.maxStamina}). ¿Deseas aumentar la stamina máxima?`;
  const controls = document.createElement('div');
  controls.className = 'control-row';
  const yesBtn = document.createElement('button');
  yesBtn.className = 'secondary-button';
  yesBtn.textContent = 'Sí';
  const noBtn = document.createElement('button');
  // "No" resaltada según tu petición: la mostramos como botón primario
  noBtn.className = 'primary-button';
  noBtn.textContent = 'No';
  controls.appendChild(yesBtn);
  controls.appendChild(noBtn);
  modal.appendChild(msg);
  modal.appendChild(controls);
  panel.appendChild(modal);

  yesBtn.addEventListener('click', () => {
    // aumentar la stamina máxima para acomodar el valor actual
    player.maxStamina = player.stamina;
    updateLog(`${player.name} aumenta stamina máxima a ${player.maxStamina}.`);
    panel.removeChild(modal);
    render();
  });

  noBtn.addEventListener('click', () => {
    // no aumenta la stamina máxima; dejar la stamina actual como está (puede seguir > max)
    updateLog(`${player.name} decidió no aumentar la stamina máxima.`);
    panel.removeChild(modal);
    render();
  });
}

init();
