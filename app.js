const FACTORS = {
  transport: { label: "Transport", color: "#6EE7B7", unit: "km", rate: 0.21 },
  energy: { label: "Home energy", color: "#A7F3D0", unit: "kWh", rate: 0.43 },
  food: { label: "Food choices", color: "#34D399", unit: "meal", rate: 1.1 },
  waste: { label: "Waste", color: "#059669", unit: "kg", rate: 0.7 },
};

const HABITS = [
  {
    id: "habit-bike",
    name: "Bike or walk for trips under 3km",
    impact: 0.6,
    description: "Swapping short drives for active travel avoids tailpipe CO₂.",
  },
  {
    id: "habit-plant",
    name: "Choose plant-forward meals",
    impact: 0.8,
    description: "Plant proteins typically emit 50–90% less than meat.",
  },
  {
    id: "habit-energy",
    name: "Unplug idle electronics",
    impact: 0.3,
    description: "Phantom loads can be 10% of a dorm's energy usage.",
  },
  {
    id: "habit-reuse",
    name: "Carry a reusable bottle or cup",
    impact: 0.2,
    description: "Cuts single-use plastics and their production footprint.",
  },
];

const STORAGE_KEY = "ecotrack-day";

const $ = (selector) => document.querySelector(selector);
const createEl = (tag, className) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
};

const state = {
  activities: [],
  habits: HABITS.map((habit) => ({ ...habit, active: false })),
};

const loadState = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  const parsed = JSON.parse(saved);
  state.activities = parsed.activities ?? state.activities;
  state.habits = HABITS.map((habit) => {
    const match = parsed.habits?.find((h) => h.id === habit.id);
    return match ? { ...habit, active: match.active } : habit;
  });
};

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const formatKg = (value) => `${value.toFixed(2)} kg`;

const computeTotals = () => {
  const total = state.activities.reduce((sum, item) => sum + item.impact, 0);
  const categoryTotals = Object.keys(FACTORS).reduce((acc, key) => {
    const subtotal = state.activities
      .filter((item) => item.category === key)
      .reduce((sum, item) => sum + item.impact, 0);
    acc[key] = subtotal;
    return acc;
  }, {});
  const activeHabits = state.habits.filter((habit) => habit.active);
  const habitSavings = activeHabits.reduce((sum, habit) => sum + habit.impact, 0);
  const ecoScore = Math.min(100, Math.round((activeHabits.length / HABITS.length) * 100));
  const topCategory =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    total,
    categoryTotals,
    habitSavings,
    ecoScore,
    topCategory,
  };
};

const renderHero = () => {
  const totalEl = $("#hero-total");
  const scoreEl = $("#hero-score");
  if (!totalEl || !scoreEl) return;
  const { total, ecoScore } = computeTotals();
  totalEl.textContent = `${total.toFixed(2)} kg CO₂e`;
  scoreEl.textContent = `${ecoScore}%`;
};

const renderSummary = () => {
  const totalEl = $("#total-emissions");
  const sourceEl = $("#top-source");
  const habitEl = $("#habit-savings");
  if (!totalEl || !sourceEl || !habitEl) return;
  const { total, topCategory, habitSavings } = computeTotals();
  totalEl.textContent = formatKg(total);
  habitEl.textContent = formatKg(habitSavings);
  sourceEl.textContent = topCategory ? FACTORS[topCategory].label : "—";
};

const renderBreakdown = () => {
  const { categoryTotals, total } = computeTotals();
  const container = $("#breakdown");
  if (!container) return;
  container.innerHTML = "";
  Object.entries(categoryTotals).forEach(([key, value]) => {
    const row = createEl("div", "breakdown-row");
    const label = createEl("strong");
    label.textContent = FACTORS[key].label;
    const amount = createEl("span");
    amount.textContent = formatKg(value);
    const bar = createEl("div", "breakdown-bar");
    const fill = createEl("span");
    fill.style.background = FACTORS[key].color;
    fill.style.width = total ? `${(value / total) * 100}%` : "0%";
    bar.appendChild(fill);
    row.append(label, bar, amount);
    container.appendChild(row);
  });
};

const renderHabits = () => {
  const container = $("#habit-list");
  if (!container) return;
  container.innerHTML = "";
  state.habits.forEach((habit) => {
    const row = createEl("div", "habit");
    const info = createEl("div", "habit-info");
    const name = createEl("span");
    name.textContent = habit.name;
    const desc = createEl("small");
    desc.textContent = `${habit.description} (~${habit.impact} kg)`;
    info.append(name, desc);

    const toggle = createEl("label", "toggle");
    const input = createEl("input");
    input.type = "checkbox";
    input.checked = habit.active;
    input.addEventListener("change", () => {
      habit.active = input.checked;
      saveState();
      updateUI();
    });
    const slider = createEl("span", "slider");
    toggle.append(input, slider);

    row.append(info, toggle);
    container.appendChild(row);
  });
};

const renderActivities = () => {
  const tbody = $("#activity-table");
  const empty = $("#empty-state");
  if (!tbody || !empty) return;
  tbody.innerHTML = "";
  if (!state.activities.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  state.activities.forEach((activity, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${activity.description}</td>
      <td>${FACTORS[activity.category].label}</td>
      <td>${activity.amount} ${FACTORS[activity.category].unit}</td>
      <td>${formatKg(activity.impact)}</td>
      <td><button class="remove-btn" data-index="${index}">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });
};

const renderInsights = () => {
  const container = $("#insight-list");
  if (!container) return;
  container.innerHTML = "";
  const { total, categoryTotals, habitSavings, ecoScore } = computeTotals();
  const tips = [];
  const target = 5;
  if (total > target) {
    tips.push({
      title: "Above daily target",
      body: `You're ${formatKg(total - target)} over 5 kg. Try swapping one car ride for transit tomorrow.`,
    });
  } else {
    tips.push({
      title: "On track",
      body: `Nice! You're ${formatKg(target - total)} under today's target. Capture what worked and repeat it.`,
    });
  }

  const highest = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  if (highest && highest[1] > 0) {
    tips.push({
      title: `${FACTORS[highest[0]].label} leads emissions`,
      body: `Consider a lower-impact alternative for this category tomorrow to shave off ${formatKg(
        Math.min(highest[1], 1.5)
      )}.`,
    });
  }

  tips.push({
    title: "Habits impact",
    body: `Active habits avoided ~${formatKg(habitSavings)}. Keep at least ${
      HABITS.length - state.habits.filter((h) => h.active).length
    } more on to reach a ${ecoScore + 25}% score.`,
  });

  tips.forEach((tip) => {
    const card = createEl("div", "insight-card");
    card.innerHTML = `<strong>${tip.title}</strong><p class="helper">${tip.body}</p>`;
    container.appendChild(card);
  });
};

const handleRemove = (event) => {
  if (!event.target.matches(".remove-btn")) return;
  const index = Number(event.target.dataset.index);
  state.activities.splice(index, 1);
  saveState();
  updateUI();
};

const handleSubmit = (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const description = formData.get("description").trim();
  const category = formData.get("category");
  const amount = Number(formData.get("amount"));
  if (!description || !category || Number.isNaN(amount) || amount <= 0) return;
  const impact = amount * FACTORS[category].rate;
  state.activities.push({ description, category, amount, impact });
  event.target.reset();
  saveState();
  updateUI();
};

const handleReset = () => {
  state.activities = [];
  state.habits = HABITS.map((habit) => ({ ...habit, active: false }));
  saveState();
  updateUI();
};

const updateUI = () => {
  renderHero();
  renderSummary();
  renderBreakdown();
  renderHabits();
  renderActivities();
  renderInsights();
};

const init = () => {
  loadState();
  const form = $("#activity-form");
  const table = $("#activity-table");
  const resetBtn = $("#reset-day");
  if (form) form.addEventListener("submit", handleSubmit);
  if (table) table.addEventListener("click", handleRemove);
  if (resetBtn) resetBtn.addEventListener("click", handleReset);
  updateUI();
};

init();

