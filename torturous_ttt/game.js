const winningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const board = document.querySelector(".board");
const statusMessage = document.querySelector("#status");
const restart = document.querySelector("#restart");
const music = document.querySelector("#countdown-music");
const musicToggle = document.querySelector("#music-toggle");
let musicEnabled = true;
let musicBlocked = false;
const celebrationColors = ["#dcff74", "#ff91d6", "#bc85ff", "#fff8ec"];

function celebrate(anchor, isWin = false) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const burst = document.createElement("span");
  burst.className = isWin ? "celebration win-celebration" : "celebration";
  burst.setAttribute("aria-hidden", "true");
  for (let index = 0; index < 12; index += 1) {
    const piece = document.createElement("span");
    const angle = index * Math.PI / 6;
    const distance = index % 2 === 0 ? 105 : 68;
    piece.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
    piece.style.setProperty("--color", celebrationColors[index % celebrationColors.length]);
    burst.append(piece);
  }
  anchor.append(burst);
  burst.addEventListener("animationend", () => burst.remove(), { once: true });
}

function celebrateWin() {
  winningLine.forEach(index => celebrate(cells[index], true));
}
const wheelPanel = document.querySelector("#wheel-panel");
const wheel = document.querySelector("#wheel");
const spinButton = document.querySelector("#spin");
const spinResults = document.querySelector("#spin-results");
const gameMessage = document.querySelector("#game-message");
const moveMessages = [
  "The corner was right there.",
  "Big swing for a game with nine squares.",
  "That move needed a second opinion.",
  "A gamble. The board loves those.",
  "If that was bait, fair play.",
  "Nine squares and somehow we’re in a crisis.",
  "Bold. The replay might be less kind.",
  "That square better have a five-year plan.",
  "Keep the receipt for that decision.",
  "Well, the opponent’s awake now 👀",
];
const disappearanceMessages = [
  "That token barely got through the door.",
  "The board just repossessed a square.",
  "Gone. Even the replay feels disrespectful.",
  "That token got cut from the final edit ✂️",
  "There goes the load-bearing token.",
  "The board saw a plan and took that personally.",
  "A casualty of the nine-square housing crisis.",
  "Brutal. That square was doing actual work.",
  "Single token. Gone without a forwarding address.",
  "That token’s entire career was a cameo.",
];
const wheelMessages = {
  "Place token": ["A spare token. No excuses now.", "The wheel’s offering a retake. Use it wisely."],
  "Shift row 1 up": ["Up a row. Down a game plan.", "Mind the gap between the plan and the result."],
  "Shift column 1 right": ["A one-square detour nobody ordered.", "The board took a hard right. Catch up."],
  "Powercard": ["Someone’s about to lose a load-bearing token.", "Pick a token. Ruin a perfectly good afternoon."],
  "Autoswap": ["Great placement. Shame it’s theirs now.", "The tokens traded seats and left the plans behind."],
  "Clear Board": ["All that plotting for an empty grid.", "The board deleted the evidence. Probably for the best."],
  "Switch Board": ["Perfect strategy. Wrong beneficiary.", "That’s a generous donation to the other team."],
};
const messagePositions = new WeakMap();
const messageEntrances = [
  [
    { opacity: 0, transform: "scale(0.75)", offset: 0 },
    { opacity: 1, transform: "scale(1.07)", offset: 0.12 },
  ],
  [
    { opacity: 0, transform: "translateY(8px) rotate(-5deg)", offset: 0 },
    { opacity: 1, transform: "rotate(4deg)", offset: 0.08 },
    { opacity: 1, transform: "rotate(-2deg)", offset: 0.14 },
  ],
  [
    { opacity: 0, transform: "translateY(20px)", offset: 0 },
    { opacity: 1, transform: "translateY(-3px)", offset: 0.12 },
  ],
];
let messageTimer;
let messageAnimation;
let previousEntrance = -1;

function nextMessage(messages) {
  const index = messagePositions.get(messages) ?? 0;
  messagePositions.set(messages, (index + 1) % messages.length);
  return messages[index];
}

function showMessage(message) {
  window.clearTimeout(messageTimer);
  messageAnimation?.cancel();
  gameMessage.textContent = message;
  const duration = 2000;

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const entrances = messageEntrances.filter((_, index) => index !== previousEntrance);
    const entrance = entrances[Math.floor(Math.random() * entrances.length)];
    previousEntrance = messageEntrances.indexOf(entrance);
    messageAnimation = gameMessage.animate([
      ...entrance.map(frame => ({ ...frame, easing: "ease-out" })),
      { opacity: 1, transform: "none", offset: 0.2 },
      { opacity: 1, transform: "none", offset: 0.88 },
      { opacity: 0, transform: "translateY(5px)", offset: 1 },
    ], { duration, fill: "forwards" });
  }

  messageTimer = window.setTimeout(() => {
    gameMessage.textContent = "";
    messageAnimation?.cancel();
    messageAnimation = undefined;
  }, duration);
}

const animationSlowdown = 750;
const spinDuration = 1000 + animationSlowdown;
wheel.style.setProperty("--spin-duration", `${spinDuration}ms`);
const wheelOptions = [
  { name: "Place token", end: 90, color: "#2a5662" },
  { name: "Shift row 1 up", end: 990 / 7, color: "#593976", apply: shiftRowsUp, effect: "Rows shifted up" },
  { name: "Shift column 1 right", end: 1350 / 7, color: "#db88ae", darkText: true, apply: shiftColumnsRight, effect: "Columns shifted right" },
  { name: "Powercard", end: 1440 / 7, color: "#2a5662", powercard: true },
  { name: "Autoswap", end: 1800 / 7, color: "#d0b76c", darkText: true, apply: swapTokens, effect: "X and O swapped places", progress: "Swapping…" },
  { name: "Clear Board", end: 2160 / 7, color: "#593976", apply: clearBoard, effect: "Board cleared", progress: "Clearing…" },
  { name: "Switch Board", end: 360, color: "#db88ae", darkText: true, apply: switchBoard, effect: "Xs and Os switched", progress: "Switching…" },
];
const marks = Array(9).fill("");
let player = "X";
let winningLine;
let simultaneousWin = false;
let moveCount = 0;
let nextSpinAt = 12;
let spins = 0;
let rotation = 0;
let spinTimer;
let spinning = false;
let activeEffect;
let effectAnimations = [];
let bonusPlayer;
let powerPlayer;
const limitedMoves = { X: 0, O: 0 };

function opponentOf(mark) {
  return mark === "X" ? "O" : "X";
}

function syncMusic() {
  musicToggle.textContent = musicBlocked ? "Play music" : musicEnabled ? "Music on" : "Music off";
  musicToggle.setAttribute("aria-pressed", String(musicEnabled && !musicBlocked));
  if (document.hidden || !musicEnabled || winningLine || simultaneousWin) {
    music.pause();
    return;
  }
  music.play().catch(error => {
    if (error.name === "AbortError") return;
    musicBlocked = musicEnabled;
    if (musicBlocked) {
      musicToggle.textContent = "Play music";
      musicToggle.setAttribute("aria-pressed", "false");
    }
  });
}

music.volume = 0.55;
musicToggle.addEventListener("click", () => {
  musicEnabled = musicBlocked || !musicEnabled;
  musicBlocked = false;
  syncMusic();
});
document.addEventListener("visibilitychange", syncMusic);
window.addEventListener("pagehide", () => music.pause());
window.addEventListener("pageshow", syncMusic);

const segmentColors = wheelOptions.map((option, index) => {
  const start = wheelOptions[index - 1]?.end ?? 0;
  const angle = (start + option.end) / 2;
  const segment = document.createElement("div");
  const label = document.createElement("span");
  segment.className = "wheel-segment";
  segment.setAttribute("role", "listitem");
  segment.style.setProperty("--angle", `${angle}deg`);
  label.style.setProperty("--label-angle", angle > 180 ? "90deg" : "-90deg");
  if (option.darkText) label.classList.add("dark-label");
  label.textContent = option.name;
  segment.append(label);
  wheel.append(segment);
  return `${option.color} ${start}deg ${option.end}deg`;
});
wheel.style.background = `conic-gradient(${segmentColors.join(", ")})`;

function waitingForSpins() {
  return moveCount === nextSpinAt && spins < 2 && !winningLine;
}

function shiftRowsUp(reducedMotion) {
  marks.push(...marks.splice(0, 3));
  const distance = cells[3].offsetTop - cells[0].offsetTop;
  return animateShift(reducedMotion, "Y", distance, index => index >= 6);
}

function shiftColumnsRight(reducedMotion) {
  for (let row = 0; row < marks.length; row += 3) {
    const rightmost = marks[row + 2];
    marks[row + 2] = marks[row + 1];
    marks[row + 1] = marks[row];
    marks[row] = rightmost;
  }
  const distance = cells[0].offsetLeft - cells[1].offsetLeft;
  return animateShift(reducedMotion, "X", distance, index => index % 3 === 0);
}

function swapTokens(reducedMotion) {
  const [x, o] = ["X", "O"].map(mark => {
    const positions = marks.flatMap((value, index) => value === mark ? [index] : []);
    return positions[Math.floor(Math.random() * positions.length)];
  });
  if (x === undefined || o === undefined) return 0;

  [marks[x], marks[o]] = [marks[o], marks[x]];
  render();
  if (reducedMotion) return 600;

  const duration = 480 + animationSlowdown;
  effectAnimations = [[x, o], [o, x]].map(([destination, source]) => {
    const dx = cells[source].offsetLeft - cells[destination].offsetLeft;
    const dy = cells[source].offsetTop - cells[destination].offsetTop;
    return cells[destination].firstElementChild.animate([
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: `translate(${dx / 2 - dy * 0.15}px, ${dy / 2 + dx * 0.15}px)` },
      { transform: "none" },
    ], { duration, easing: "ease-in-out" });
  });
  return duration + 600;
}

function clearBoard(reducedMotion) {
  const tokens = cells.filter(cell => cell.dataset.mark).map(cell => cell.firstElementChild);
  marks.fill("");
  if (reducedMotion) {
    render();
    return 600;
  }

  const duration = 480 + animationSlowdown;
  effectAnimations = tokens.map(token => token.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    { duration, fill: "forwards", easing: "ease-out" },
  ));
  return duration + 600;
}

function switchBoard(reducedMotion) {
  const tokens = cells.filter(cell => cell.dataset.mark).map(cell => cell.firstElementChild);
  for (let index = 0; index < marks.length; index += 1) {
    if (marks[index]) marks[index] = marks[index] === "X" ? "O" : "X";
  }
  if (reducedMotion || tokens.length === 0) {
    render();
    return 600;
  }

  const halfDuration = (480 + animationSlowdown) / 2;
  const flipOut = tokens.map(token => token.animate(
    [{ transform: "rotateY(0deg)" }, { transform: "rotateY(90deg)" }],
    { duration: halfDuration, fill: "forwards", easing: "ease-in" },
  ));
  effectAnimations = flipOut;
  flipOut[0].onfinish = () => {
    if (effectAnimations !== flipOut) return;
    render();
    flipOut.forEach(animation => animation.cancel());
    effectAnimations = tokens.map(token => token.animate(
      [{ transform: "rotateY(-90deg)" }, { transform: "rotateY(0deg)" }],
      { duration: halfDuration, easing: "ease-out" },
    ));
  };
  return 2 * halfDuration + 600;
}

function animateShift(reducedMotion, axis, distance, wraps) {
  render();

  if (reducedMotion) return 600;

  const duration = 480 + animationSlowdown;
  const translate = steps => `translate${axis}(${steps * distance}px)`;
  effectAnimations = cells.map((cell, index) => {
    const frames = wraps(index)
      ? [
        { transform: translate(-2), opacity: 1 },
        { transform: translate(-3), opacity: 0, offset: 0.45 },
        { transform: translate(1), opacity: 0, offset: 0.5 },
        { transform: "none", opacity: 1 },
      ]
      : [{ transform: translate(1) }, { transform: "none" }];
    return cell.animate(frames, { duration, easing: "ease-in-out" });
  });
  return duration + 600;
}

function findWinningLine(mark) {
  return winningLines.find(line => line.every(position => marks[position] === mark));
}

const cells = Array.from({ length: marks.length }, (_, index) => {
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "cell";
  cell.append(document.createElement("span"));
  cell.addEventListener("click", () => play(index));
  board.append(cell);
  return cell;
});

function render() {
  cells.forEach((cell, index) => {
    const mark = marks[index];
    const row = Math.floor(index / 3) + 1;
    const column = index % 3 + 1;
    cell.firstElementChild.textContent = mark;
    cell.dataset.mark = mark;
    cell.setAttribute("aria-label", `Row ${row}, column ${column}, ${mark || "empty"}`);
    const unavailable = powerPlayer
      ? mark !== opponentOf(powerPlayer)
      : Boolean(winningLine || simultaneousWin || mark || (waitingForSpins() && !bonusPlayer));
    cell.setAttribute("aria-disabled", String(unavailable));
    cell.classList.toggle("winner", winningLine?.includes(index) ?? false);
  });

  if (simultaneousWin) {
    statusMessage.textContent = "Both players have winning lines. It’s a draw.";
  } else if (winningLine) {
    statusMessage.textContent = `${marks[winningLine[0]]} wins!`;
  } else if (powerPlayer) {
    statusMessage.textContent = `${powerPlayer}, choose an opposing token to remove`;
  } else if (bonusPlayer) {
    statusMessage.textContent = `${bonusPlayer}, choose an empty square`;
  } else if (activeEffect) {
    statusMessage.textContent = activeEffect.effect;
  } else if (waitingForSpins()) {
    statusMessage.textContent = `${spins === 0 ? "X" : "O"}’s spin`;
  } else {
    statusMessage.textContent = `${player}’s turn`;
  }
  const waitingForSpin = waitingForSpins();
  wheelPanel.hidden = spins === 0 && !waitingForSpin;
  board.inert = waitingForSpin && !bonusPlayer && !powerPlayer;
  spinButton.disabled = spinning || !waitingForSpin;
  const spinLabel = powerPlayer ? "Remove token"
    : bonusPlayer ? "Place token"
    : activeEffect ? activeEffect.progress ?? "Shifting…"
    : spinning ? "Spinning…"
    : spins === 2 ? "Done"
    : "Spin";
  spinButton.textContent = spinLabel;
  spinButton.setAttribute("aria-label", spinLabel === "Spin" ? `Spin for ${spins === 0 ? "X" : "O"}` : spinLabel);
}

function play(index) {
  if (powerPlayer) {
    if (marks[index] !== opponentOf(powerPlayer)) return;
    const spinner = powerPlayer;
    marks[index] = "";
    showMessage("That token’s out 👋");
    powerPlayer = undefined;
    beginBonusPlacement(spinner);
    return;
  }
  if (bonusPlayer) {
    if (!marks[index]) placeBonusToken(index);
    return;
  }
  if (winningLine || simultaneousWin || marks[index] || waitingForSpins()) return;

  showMessage(nextMessage(moveMessages));
  winningLine = placeMark(index, player);
  if (winningLine) {
    showMessage(`Three in a row for ${player} 🎉`);
    celebrateWin();
    syncMusic();
  }
  if (limitedMoves[player] > 0) limitedMoves[player] -= 1;
  moveCount += 1;
  if (!winningLine) {
    player = opponentOf(player);
    if (moveCount === nextSpinAt) spins = 0;
  }
  render();
  if (waitingForSpins()) spinButton.focus();
}

function placeMark(index, mark) {
  const previousTokens = marks.flatMap((value, position) => value === mark ? [position] : []);
  marks[index] = mark;
  const completedLines = winningLines.filter(line => line.every(position => marks[position] === mark));
  const tokenLimit = limitedMoves[mark] > 0 ? 2 : 3;

  if (previousTokens.length >= tokenLimit) {
    const protectedPositions = completedLines.flat();
    const removableTokens = previousTokens.filter(position => !protectedPositions.includes(position));
    const removalCount = Math.min(previousTokens.length + 1 - tokenLimit, removableTokens.length);
    for (let removed = 0; removed < removalCount; removed += 1) {
      const randomIndex = Math.floor(Math.random() * removableTokens.length);
      const [position] = removableTokens.splice(randomIndex, 1);
      marks[position] = "";
    }
    if (removalCount > 0) showMessage(nextMessage(disappearanceMessages));
  }
  return completedLines[0];
}

function beginBonusPlacement(mark) {
  bonusPlayer = mark;
  render();
  cells[marks.indexOf("")].focus();
}

function placeBonusToken(index) {
  const mark = bonusPlayer;
  placeMark(index, mark);
  bonusPlayer = undefined;
  activeEffect = { effect: `${mark} placed an extra token`, progress: "Placing…" };
  render();

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = 360 + animationSlowdown;
  if (!reducedMotion) {
    effectAnimations = [cells[index].firstElementChild.animate([
      { opacity: 0, transform: "scale(0.3)" },
      { opacity: 1, transform: "scale(1.18)", offset: 0.7 },
      { opacity: 1, transform: "scale(1)" },
    ], { duration, easing: "ease-out" })];
  }
  spinTimer = window.setTimeout(finishSpin, reducedMotion ? 0 : duration);
}

spinButton.addEventListener("click", () => {
  if (spinning || !waitingForSpins()) return;

  const spinner = spins === 0 ? "X" : "O";
  const angle = Math.random() * 360;
  const outcome = wheelOptions.find(option => angle < option.end);
  const target = 360 - angle;
  rotation += 1080 + (target - rotation % 360 + 360) % 360;
  spinning = true;
  wheel.style.transform = `rotate(${rotation}deg)`;
  render();

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  spinTimer = window.setTimeout(() => {
    const rule = outcome.powercard
      ? ` ${opponentOf(spinner)} can have at most two tokens on the board for their next two regular moves.`
      : "";
    const result = `${spinner} spun “${outcome.name}”.${rule}`;
    spinResults.textContent = spins === 0 ? result : `${spinResults.textContent} ${result}`;
    showMessage(nextMessage(wheelMessages[outcome.name]));

    if (outcome.powercard) {
      celebrate(wheelPanel);
      const affected = opponentOf(spinner);
      limitedMoves[affected] = 2;
      const target = marks.indexOf(affected);
      if (target === -1) {
        beginBonusPlacement(spinner);
        return;
      }
      powerPlayer = spinner;
      render();
      cells[target].focus();
    } else if (outcome.name === "Place token" && marks.includes("")) {
      beginBonusPlacement(spinner);
    } else if (outcome.apply) {
      activeEffect = outcome;
      render();
      const previewTime = outcome.apply(reducedMotion);
      spinTimer = window.setTimeout(finishSpin, previewTime);
    } else {
      finishSpin();
    }
  }, reducedMotion ? 0 : spinDuration);
});

function finishSpin() {
  effectAnimations.forEach(animation => animation.cancel());
  effectAnimations = [];
  activeEffect = undefined;
  spinning = false;
  spins += 1;
  if (spins === 2) {
    nextSpinAt += 6;
    const xLine = findWinningLine("X");
    const oLine = findWinningLine("O");
    simultaneousWin = Boolean(xLine && oLine);
    winningLine = simultaneousWin ? undefined : xLine ?? oLine;
    if (simultaneousWin) showMessage("A line each. Nicely played 🤝");
    else if (winningLine) {
      showMessage("The wheel had the last word 🎉");
      celebrateWin();
    }
    if (winningLine || simultaneousWin) syncMusic();
  }
  render();
  if (spins === 1) spinButton.focus();
  else if (winningLine || simultaneousWin) restart.focus();
  else (cells.find(cell => cell.dataset.mark === "") ?? restart).focus();
}

document.querySelector("#start").addEventListener("click", () => {
  document.querySelector("#start-screen").hidden = true;
  document.querySelector("#game-screen").hidden = false;
  musicBlocked = false;
  syncMusic();
  cells[0].focus();
});

restart.addEventListener("click", () => {
  document.querySelectorAll(".celebration").forEach(burst => burst.remove());
  window.clearTimeout(spinTimer);
  effectAnimations.forEach(animation => animation.cancel());
  effectAnimations = [];
  marks.fill("");
  player = "X";
  winningLine = undefined;
  simultaneousWin = false;
  moveCount = 0;
  nextSpinAt = 12;
  spins = 0;
  spinning = false;
  activeEffect = undefined;
  bonusPlayer = undefined;
  powerPlayer = undefined;
  limitedMoves.X = 0;
  limitedMoves.O = 0;
  rotation = 0;
  wheel.style.transform = "";
  spinResults.textContent = "";
  music.currentTime = 0;
  syncMusic();
  showMessage("Fresh board. Run it back 🔄");
  render();
  cells[0].focus();
});

render();
syncMusic();
