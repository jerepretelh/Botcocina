const recipes = [
  {
    id: "arroz-lentejas",
    name: "Arroz con lentejas",
    emoji: "🍲",
    meta: "35 min · Batch friendly",
    description: "Una receta cálida para arrancar la semana con algo rendidor y simple.",
    servings: "4 porciones",
    category: "Comfort meal",
    detailDescription:
      "Una receta cálida y rendidora para dejar la semana encaminada. Aquí la mostramos como vista interna, sin lógica real, pero con la sensación de una app lista para usarse.",
    stats: ["35 min", "4 porciones", "Olla + sartén"],
    ingredients: [
      { title: "Base", items: ["1 taza de arroz", "1 taza de lentejas", "1 cebolla roja"] },
      { title: "Sabor", items: ["2 dientes de ajo", "1 cda de aceite", "Sal y comino"] },
    ],
    steps: [
      "Lava arroz y lentejas por separado para empezar con la base lista.",
      "Sofríe cebolla y ajo hasta que el aroma cambie y se vea dorado suave.",
      "Integra lentejas, luego arroz, y termina con cocción controlada y reposo.",
    ],
    shopping: ["Arroz", "Lentejas", "Cebolla roja", "Ajo"],
  },
  {
    id: "arroz-perfecto",
    name: "Arroz perfecto",
    emoji: "🍚",
    meta: "22 min · Fondo neutro",
    description: "Ideal como base flexible para lunches rápidos y cenas con pocos ingredientes.",
    servings: "3 porciones",
    category: "Base",
    detailDescription:
      "Una receta-base pensada para acompañar otras preparaciones. La vista interna prioriza claridad, no complejidad, para que puedas decidir rápido si entra al plan.",
    stats: ["22 min", "3 porciones", "Una olla"],
    ingredients: [
      { title: "Base", items: ["1 taza de arroz", "2 tazas de agua", "1 cda de aceite"] },
      { title: "Terminación", items: ["Sal fina", "Opcional: laurel"] },
    ],
    steps: [
      "Enjuaga el arroz hasta que el agua salga más clara.",
      "Lleva a hervor con agua, aceite y sal, luego baja el fuego.",
      "Deja reposar tapado para terminar con grano suelto.",
    ],
    shopping: ["Arroz", "Aceite", "Laurel"],
  },
  {
    id: "huevo-sancochado",
    name: "Huevo sancochado",
    emoji: "🥚",
    meta: "10 min · High protein",
    description: "Una opción corta y práctica para desayunos o snacks de media mañana.",
    servings: "2 porciones",
    category: "Express",
    detailDescription:
      "Una preparación corta y muy clara para mostrar cómo una receta breve puede seguir viéndose premium por dentro, aunque no tenga runtime ni timers activos todavía.",
    stats: ["10 min", "2 porciones", "Una olla"],
    ingredients: [
      { title: "Base", items: ["4 huevos", "Agua suficiente"] },
      { title: "Servicio", items: ["Sal", "Pimienta", "Pan tostado opcional"] },
    ],
    steps: [
      "Coloca los huevos en agua fría y lleva a hervor suave.",
      "Retira según el punto que busques y enfría ligeramente.",
      "Sirve con sal, pimienta o una base simple para desayuno.",
    ],
    shopping: ["Huevos", "Pan", "Pimienta"],
  },
  {
    id: "keke-platano",
    name: "Keke de plátano",
    emoji: "🍌",
    meta: "50 min · Horno",
    description: "Un horneado suave para dejar listo y acompañar desayunos o cafés de la tarde.",
    servings: "8 slices",
    category: "Sweet bake",
    detailDescription:
      "Una receta dulce y visualmente generosa. La vista interna la presenta como una pantalla de decisión: entender qué lleva, cuánto toma y si conviene sumarla al plan.",
    stats: ["50 min", "8 slices", "Molde de loaf"],
    ingredients: [
      { title: "Masa", items: ["3 plátanos maduros", "2 tazas de harina", "2 huevos"] },
      { title: "Acabado", items: ["Azúcar", "Canela", "Mantequilla"] },
    ],
    steps: [
      "Maja el plátano hasta obtener una base suave y uniforme.",
      "Integra huevos, azúcar y harina sin sobrebatir.",
      "Hornea hasta que el centro se vea cocido y la superficie dorada.",
    ],
    shopping: ["Plátano", "Harina", "Huevos", "Azúcar", "Mantequilla"],
  },
];

const recipeLookup = new Map(recipes.map((recipe) => [recipe.id, recipe]));
const recipeByName = new Map(recipes.map((recipe) => [recipe.name, recipe]));

const planDays = [
  {
    id: "lunes",
    name: "Lunes",
    caption: "Arranque simple",
    expanded: true,
    items: [{ recipeId: "arroz-lentejas", moment: "Almuerzo" }],
  },
  {
    id: "martes",
    name: "Martes",
    caption: "Carga ligera",
    expanded: false,
    items: [],
  },
  {
    id: "miercoles",
    name: "Miércoles",
    caption: "Mitad de semana",
    expanded: false,
    items: [{ recipeId: "keke-platano", moment: "Desayuno" }],
  },
];

const days = ["Lunes", "Martes", "Miércoles"];
const moments = ["Desayuno", "Almuerzo", "Cena"];
const budgetLimit = 40;

let activeScreen = "recipes";
let previousScreen = "recipes";
let selectedRecipe = recipes[0];
let selectedDay = days[0];
let selectedMoment = moments[1];
let toastTimeout = null;
let isSuperMode = false;
let shoppingItems = [];

const recipeList = document.getElementById("recipe-list");
const planList = document.getElementById("plan-list");
const shoppingList = document.getElementById("shopping-list");
const planCount = document.getElementById("plan-count");
const sheet = document.getElementById("plan-sheet");
const backdrop = document.getElementById("sheet-backdrop");
const toast = document.getElementById("toast");
const dayChips = document.getElementById("day-chips");
const momentChips = document.getElementById("moment-chips");
const sheetRecipeName = document.getElementById("sheet-recipe-name");
const totalLabel = document.getElementById("shopping-total");
const stickyTotal = document.getElementById("sticky-total");
const budgetLabel = document.getElementById("shopping-budget");
const completionOverlay = document.getElementById("completion-overlay");
const completionTotal = document.getElementById("completion-total");
const navItems = Array.from(document.querySelectorAll(".nav-item"));
const screens = Array.from(document.querySelectorAll(".screen"));
const headerBack = document.getElementById("header-back");
const headerEyebrow = document.getElementById("header-eyebrow");
const headerTitle = document.getElementById("header-title");
const headerSubtitle = document.getElementById("header-subtitle");
const detailEmoji = document.getElementById("detail-emoji");
const detailKicker = document.getElementById("detail-kicker");
const detailDescription = document.getElementById("detail-description");
const detailStats = document.getElementById("detail-stats");
const ingredientGroups = document.getElementById("ingredient-groups");
const stepList = document.getElementById("step-list");
const detailPrimary = document.getElementById("detail-primary");
const detailSecondary = document.getElementById("detail-secondary");

function formatCurrency(value) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

function getHeaderContent(screen) {
  if (screen === "recipe") {
    return {
      eyebrow: "Receta interna",
      title: selectedRecipe.name,
      subtitle: `${selectedRecipe.meta} · ${selectedRecipe.category}`,
      backVisible: true,
    };
  }

  if (screen === "plan") {
    return {
      eyebrow: "Meal planner",
      title: "Organiza tu semana",
      subtitle: "Edita tu plan con fricción mínima y deja el siguiente paso siempre visible.",
      backVisible: false,
    };
  }

  if (screen === "shopping") {
    return {
      eyebrow: "Shopping flow",
      title: "Compra sin perder el hilo",
      subtitle: "Una lista operativa derivada del plan activo, lista para usar dentro del súper.",
      backVisible: false,
    };
  }

  return {
    eyebrow: "Meal planner",
    title: "Organiza tu semana",
    subtitle: "Elige recetas, acomódalas rápido y convierte tu plan en una compra simple.",
    backVisible: false,
  };
}

function updateHeader(screen) {
  const content = getHeaderContent(screen);
  headerEyebrow.textContent = content.eyebrow;
  headerTitle.textContent = content.title;
  headerSubtitle.textContent = content.subtitle;
  headerBack.hidden = !content.backVisible;
}

function updateActiveScreen(target, options = {}) {
  previousScreen = options.preservePrevious ? previousScreen : activeScreen;
  activeScreen = target;

  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === target);
  });

  navItems.forEach((item) => {
    const targetState = target === "recipe" ? "recipes" : target;
    item.classList.toggle("is-active", item.dataset.target === targetState);
  });

  if (target !== "shopping") {
    completionOverlay.hidden = true;
  }

  updateHeader(target);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");

  if (toastTimeout) clearTimeout(toastTimeout);

  toastTimeout = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

function renderRecipes() {
  recipeList.innerHTML = recipes
    .map((recipe) => `
      <article class="recipe-card">
        <div class="recipe-emoji" aria-hidden="true">${recipe.emoji}</div>
        <div class="recipe-meta">
          <div class="recipe-title-row">
            <div>
              <h3>${recipe.name}</h3>
              <p class="recipe-caption">${recipe.category}</p>
            </div>
            <span class="recipe-tag">${recipe.meta}</span>
          </div>
          <p class="recipe-description">${recipe.description}</p>
          <div class="recipe-actions">
            <button class="button button-secondary" type="button" data-planify="${recipe.id}">Planificar</button>
            <button class="button button-primary" type="button" data-open="${recipe.id}">Abrir</button>
          </div>
        </div>
      </article>
    `)
    .join("");
}

function renderRecipeDetail() {
  detailEmoji.textContent = selectedRecipe.emoji;
  detailKicker.textContent = selectedRecipe.servings;
  detailDescription.textContent = selectedRecipe.detailDescription;
  document.getElementById("recipe-detail-title").textContent = selectedRecipe.name;

  detailStats.innerHTML = selectedRecipe.stats
    .map((stat) => `<span class="recipe-stat">${stat}</span>`)
    .join("");

  ingredientGroups.innerHTML = selectedRecipe.ingredients
    .map(
      (group) => `
        <div class="ingredient-block">
          <p class="ingredient-title">${group.title}</p>
          <ul class="ingredient-list">
            ${group.items.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </div>
      `,
    )
    .join("");

  stepList.innerHTML = selectedRecipe.steps
    .map(
      (step, index) => `
        <div class="step-row">
          <span class="step-index">${index + 1}</span>
          <p>${step}</p>
        </div>
      `,
    )
    .join("");
}

function renderPlan() {
  planList.innerHTML = planDays
    .map((day) => `
      <article class="plan-day-card ${day.expanded ? "is-open" : ""}" data-day-id="${day.id}">
        <button class="plan-day-header" type="button" data-toggle-day="${day.id}">
          <div class="plan-day-copy">
            <h3>${day.name}</h3>
            <p>${day.caption}</p>
          </div>
          <span class="plan-day-chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
            </svg>
          </span>
        </button>
        <div class="plan-day-body">
          ${
            day.items.length
              ? day.items
                  .map((item) => {
                    const recipe = recipeLookup.get(item.recipeId);
                    return `
                      <div class="plan-entry">
                        <div class="plan-entry-header">
                          <div>
                            <h4>${recipe?.name ?? item.recipeId}</h4>
                            <p class="plan-item-meta">${recipe?.meta ?? "Mock recipe"} · ${day.name}</p>
                          </div>
                          <span class="plan-slot">${item.moment}</span>
                        </div>
                        <p class="plan-item-meta">Este bloque alimenta visualmente la lista de compras activa.</p>
                      </div>
                    `;
                  })
                  .join("")
              : `<div class="plan-placeholder">Sin recetas aún. Usa “Planificar” para poblar este día.</div>`
          }
        </div>
      </article>
    `)
    .join("");

  const populatedDays = planDays.filter((day) => day.items.length > 0).length;
  planCount.textContent = `${populatedDays} día${populatedDays === 1 ? "" : "s"}`;
}

function buildShoppingFromPlan() {
  const grouped = new Map();

  planDays.forEach((day) => {
    day.items.forEach((item) => {
      const recipe = recipeLookup.get(item.recipeId);
      if (!recipe) return;

      recipe.shopping.forEach((ingredient) => {
        const key = ingredient.toLowerCase();
        const existing = grouped.get(key);
        if (existing) {
          existing.sources.add(recipe.name);
          return;
        }

        grouped.set(key, {
          id: key.replace(/\s+/g, "-"),
          name: ingredient,
          sources: new Set([recipe.name]),
          checked: false,
          price: "",
        });
      });
    });
  });

  const nextItems = Array.from(grouped.values()).map((item, index) => ({
    id: item.id,
    name: item.name,
    source: `Para: ${Array.from(item.sources).join(" · ")}`,
    checked: index === 0 ? true : false,
    price: index === 0 ? "8.50" : "",
  }));

  shoppingItems = nextItems.length
    ? nextItems
    : [
        { id: "azucar", name: "Azúcar", source: "Para: Keke de plátano", checked: false, price: "" },
        { id: "harina", name: "Harina", source: "Para: Keke de plátano", checked: false, price: "" },
        { id: "huevos", name: "Huevos", source: "Para: Huevo sancochado", checked: true, price: "12.50" },
      ];
}

function renderShopping() {
  shoppingList.innerHTML = shoppingItems
    .map((item) => `
      <article class="shopping-item ${item.checked ? "is-complete" : ""}" data-shopping-id="${item.id}">
        <button class="shopping-check" type="button" data-toggle-item="${item.id}" aria-label="${item.checked ? "Desmarcar" : "Marcar"} ${item.name}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 12.5l4 4L18 8.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
          </svg>
        </button>
        <div class="shopping-main">
          <h3>${item.name}</h3>
          <p class="shopping-source">${item.source}</p>
        </div>
        <input
          class="price-field"
          type="number"
          min="0"
          step="0.10"
          inputmode="decimal"
          placeholder="S/"
          value="${item.price}"
          data-price-input="${item.id}"
          ${item.checked ? "" : "disabled"}
        />
      </article>
    `)
    .join("");

  updateTotals();
}

function updateTotals() {
  const total = shoppingItems.reduce((sum, item) => {
    const value = Number(item.price);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  totalLabel.textContent = formatCurrency(total);
  stickyTotal.textContent = formatCurrency(total);
  completionTotal.textContent = formatCurrency(total);

  const remaining = budgetLimit - total;
  budgetLabel.textContent = remaining >= 0
    ? `Restante ${formatCurrency(remaining)}`
    : `Excedido ${formatCurrency(Math.abs(remaining))}`;
  budgetLabel.style.color = remaining >= 0 ? "var(--text-base)" : "var(--success-text)";
}

function openSheet(recipeId) {
  selectedRecipe = recipeLookup.get(recipeId) || recipes[0];
  sheetRecipeName.textContent = selectedRecipe.name;
  renderRecipeDetail();
  sheet.hidden = false;
  sheet.setAttribute("aria-hidden", "false");
  backdrop.hidden = false;
  requestAnimationFrame(() => {
    sheet.classList.add("is-open");
    backdrop.classList.add("is-visible");
  });
}

function closeSheet() {
  sheet.setAttribute("aria-hidden", "true");
  sheet.classList.remove("is-open");
  backdrop.classList.remove("is-visible");
  window.setTimeout(() => {
    if (!sheet.classList.contains("is-open")) {
      sheet.hidden = true;
      backdrop.hidden = true;
    }
  }, 220);
}

function renderSelectorChips() {
  dayChips.innerHTML = days
    .map((day) => `
      <button class="chip ${day === selectedDay ? "is-selected" : ""}" type="button" data-day-chip="${day}">
        ${day}
      </button>
    `)
    .join("");

  momentChips.innerHTML = moments
    .map((moment) => `
      <button class="chip ${moment === selectedMoment ? "is-selected" : ""}" type="button" data-moment-chip="${moment}">
        ${moment}
      </button>
    `)
    .join("");
}

function insertPlannedRecipe() {
  const targetDay = planDays.find((day) => day.name === selectedDay);
  if (targetDay) {
    const existingIndex = targetDay.items.findIndex((item) => item.moment === selectedMoment);
    const payload = { recipeId: selectedRecipe.id, moment: selectedMoment };
    if (existingIndex >= 0) {
      targetDay.items[existingIndex] = payload;
    } else {
      targetDay.items.push(payload);
    }
    targetDay.expanded = true;
  }

  buildShoppingFromPlan();
  renderPlan();
  renderShopping();
  closeSheet();
  updateActiveScreen("plan");
  showToast("Añadido al plan");
}

function togglePlanDay(dayId) {
  planDays.forEach((day) => {
    if (day.id === dayId) day.expanded = !day.expanded;
  });
  renderPlan();
}

function toggleShoppingItem(itemId) {
  shoppingItems = shoppingItems.map((item) => {
    if (item.id !== itemId) return item;
    const checked = !item.checked;
    return {
      ...item,
      checked,
      price: checked ? item.price : "",
    };
  });

  renderShopping();
  showToast("Marcado actualizado");
}

function setShoppingPrice(itemId, value) {
  const target = shoppingItems.find((item) => item.id === itemId);
  if (!target) return;
  target.price = value;
  updateTotals();
}

function setSuperMode(enabled) {
  isSuperMode = enabled;
  document.body.classList.toggle("is-super-mode", enabled);
  document.getElementById("super-mode-toggle").setAttribute("aria-pressed", String(enabled));
}

function finishShopping() {
  completionOverlay.hidden = false;
  showToast("Compra finalizada");
}

function resetExperience() {
  completionOverlay.hidden = true;
  updateActiveScreen("recipes");
}

function openRecipe(recipeId) {
  selectedRecipe = recipeLookup.get(recipeId) || recipes[0];
  renderRecipeDetail();
  updateActiveScreen("recipe");
}

recipeList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const planifyButton = target.closest("[data-planify]");
  const openButton = target.closest("[data-open]");

  if (planifyButton instanceof HTMLElement) {
    openSheet(planifyButton.dataset.planify);
  }

  if (openButton instanceof HTMLElement) {
    openRecipe(openButton.dataset.open);
  }
});

planList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const toggleButton = target.closest("[data-toggle-day]");
  if (toggleButton instanceof HTMLElement) {
    togglePlanDay(toggleButton.dataset.toggleDay);
  }
});

shoppingList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const toggleButton = target.closest("[data-toggle-item]");
  const shoppingCard = target.closest("[data-shopping-id]");

  if (toggleButton instanceof HTMLElement) {
    toggleShoppingItem(toggleButton.dataset.toggleItem);
    return;
  }

  if (shoppingCard instanceof HTMLElement && !target.closest(".price-field")) {
    toggleShoppingItem(shoppingCard.dataset.shoppingId);
  }
});

shoppingList.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.dataset.priceInput) {
    setShoppingPrice(target.dataset.priceInput, target.value);
  }
});

dayChips.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const chip = target.closest("[data-day-chip]");
  if (!(chip instanceof HTMLElement)) return;
  selectedDay = chip.dataset.dayChip;
  renderSelectorChips();
});

momentChips.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const chip = target.closest("[data-moment-chip]");
  if (!(chip instanceof HTMLElement)) return;
  selectedMoment = chip.dataset.momentChip;
  renderSelectorChips();
});

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    updateActiveScreen(item.dataset.target);
  });
});

headerBack.addEventListener("click", () => {
  updateActiveScreen(previousScreen === "recipe" ? "recipes" : previousScreen);
});

detailPrimary.addEventListener("click", () => {
  openSheet(selectedRecipe.id);
});

detailSecondary.addEventListener("click", () => {
  showToast("Idea guardada visualmente");
});

document.getElementById("sheet-close").addEventListener("click", closeSheet);
document.getElementById("sheet-cancel").addEventListener("click", closeSheet);
document.getElementById("sheet-confirm").addEventListener("click", insertPlannedRecipe);
document.getElementById("generate-shopping").addEventListener("click", () => {
  buildShoppingFromPlan();
  renderShopping();
  updateActiveScreen("shopping");
  showToast("Lista de compras generada");
});
document.getElementById("super-mode-toggle").addEventListener("click", () => {
  setSuperMode(!isSuperMode);
});
document.getElementById("finish-shopping").addEventListener("click", finishShopping);
document.getElementById("completion-reset").addEventListener("click", resetExperience);
backdrop.addEventListener("click", closeSheet);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sheet.classList.contains("is-open")) {
    closeSheet();
  }
});

renderRecipes();
renderRecipeDetail();
renderPlan();
buildShoppingFromPlan();
renderShopping();
renderSelectorChips();
updateActiveScreen(activeScreen);
setSuperMode(false);
