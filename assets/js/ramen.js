const API_BASE = "http://localhost:3000/api/recipes";

let cookingSteps = [
  {
    number: 1,
    title: "물 끓이기",
    description:
      "냄비에 물 550ml를 넣고 센 불에서 끓입니다. 물이 팔팔 끓기 시작하면 다음 단계로 넘어갑니다.",
    image:
      "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=300&fit=crop",
    alt: "물 끓이기",
    timer: {
      duration: 120,
    },
  },
  {
    number: 2,
    title: "면과 스프 넣기",
    description:
      "끓는 물에 라면과 스프를 넣습니다. 젓가락으로 면을 풀어가면서 2분 30초 정도 끓여주세요.",
    image:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop",
    alt: "면과 스프 넣기",
    timer: {
      duration: 150,
    },
  },
  {
    number: 3,
    title: "계란과 대파 추가",
    description:
      "면이 익을 정도가 되면 계란과 대파를 넣고, 취향에 따라 고명을 더해 1분 정도 더 끓입니다.",
    image:
      "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop",
    alt: "계란과 대파 추가",
    timer: {
      duration: 60,
    },
  },
  {
    number: 4,
    title: "마무리 및 완성",
    description:
      "불을 끄고 취향에 따라 김치나 치즈를 올려줍니다. 뜨거울 때 바로 드세요.",
    image:
      "https://cdnweb01.wikitree.co.kr/webdata/editor/202504/16/img_20250416102835_b3807a44.webp",
    alt: "완성된 라면",
    timer: null,
  },
];

const elements = {
  recipeTags: document.getElementById("recipe-tags"),
  recipeTitleMain: document.getElementById("recipe-title-main"),
  recipeDescriptionMain: document.getElementById("recipe-description-main"),
  recipeCookTimeChip: document.getElementById("recipe-cook-time-chip"),
  recipeDifficultyChip: document.getElementById("recipe-difficulty-chip"),
  recipeServingChip: document.getElementById("recipe-serving-chip"),
  recipeFinishedImage: document.getElementById("recipe-finished-image"),
  stepNumber: document.getElementById("step-number"),
  stepTitle: document.getElementById("step-title"),
  stepDescription: document.getElementById("step-description"),
  stepImage: document.getElementById("step-image"),
  stepCounter: document.getElementById("step-counter"),
  prevButton: document.getElementById("prev-btn"),
  nextButton: document.getElementById("next-btn"),
  timerContainer: document.getElementById("timer-container"),
  timerLabel: document.getElementById("timer-label"),
  timerDisplay: document.getElementById("timer-display"),
  timerProgressBar: document.getElementById("timer-progress-bar"),
  startTimerButton: document.getElementById("start-timer"),
  pauseTimerButton: document.getElementById("pause-timer"),
  resetTimerButton: document.getElementById("reset-timer"),
  notification: document.getElementById("notification"),
  ingredientCheckboxes: Array.from(
    document.querySelectorAll('#ingredient-form input[type="checkbox"]')
  ),
  missingInfo: document.getElementById("missing-info"),
  shoppingLinksWrap: document.getElementById("shopping-links-wrap"),
  shoppingLinksList: document.getElementById("shopping-links-list"),
  indicatorDots: Array.from(document.querySelectorAll(".indicator-dot")),
};

const shoppingSearchBaseUrl = "https://www.coupang.com/np/search?q=";

let currentStep = 0;
let timerInterval = null;
let currentTime = 0;
let totalTime = 0;
let isTimerRunning = false;

function applyRecipeData(recipe) {
  if (elements.recipeTitleMain) {
    elements.recipeTitleMain.textContent = recipe.title || "레시피";
  }
  if (elements.recipeDescriptionMain) {
    elements.recipeDescriptionMain.textContent = recipe.description || "";
  }
  if (elements.recipeCookTimeChip) {
    elements.recipeCookTimeChip.innerHTML = `<span class="material-symbols-outlined text-base text-secondary">schedule</span>소요 시간: ${recipe.cookTime || "-"}`;
  }
  if (elements.recipeDifficultyChip) {
    elements.recipeDifficultyChip.innerHTML = `<span class="material-symbols-outlined text-base text-primary">signal_cellular_alt</span>난이도: ${recipe.difficulty || "-"}`;
  }
  if (elements.recipeServingChip) {
    elements.recipeServingChip.innerHTML = `<span class="material-symbols-outlined text-base text-tertiary">group</span>${recipe.servingSize || "-"}`;
  }
  if (elements.recipeFinishedImage && recipe.thumbnailUrl) {
    elements.recipeFinishedImage.src = recipe.thumbnailUrl;
    elements.recipeFinishedImage.alt = recipe.title || "완성 이미지";
  }
  if (elements.recipeTags && recipe.categories) {
    const tags = [
      recipe.categories.method,
      recipe.categories.situation,
      recipe.categories.mainIngredient,
      recipe.categories.type,
    ].filter(Boolean);
    const palettes = [
      "bg-primary text-on-primary",
      "bg-secondary-container text-on-secondary-container",
      "bg-tertiary-container text-on-tertiary-container",
      "bg-surface-container-highest text-on-surface",
    ];
    elements.recipeTags.innerHTML = tags
      .map((tag, index) => `<span class="${palettes[index % palettes.length]} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">#${tag}</span>`)
      .join("");
  }

  if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
    const ingredientForm = document.getElementById("ingredient-form");
    if (ingredientForm) {
      ingredientForm.innerHTML = recipe.ingredients.map((ingredient) => `
        <label class="flex items-center gap-3 p-3 bg-surface-container rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors group">
          <input type="checkbox" value="${ingredient.name}${ingredient.amount ? ` ${ingredient.amount}` : ""}" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/30 cursor-pointer"/>
          <span class="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">${ingredient.name}${ingredient.amount ? ` <span class="text-on-surface-variant font-normal">${ingredient.amount}</span>` : ""}</span>
        </label>
      `).join("");
      elements.ingredientCheckboxes = Array.from(
        document.querySelectorAll('#ingredient-form input[type="checkbox"]')
      );
      elements.ingredientCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", updateMissingIngredients);
      });
    }
  }

  if (Array.isArray(recipe.steps) && recipe.steps.length > 0) {
    cookingSteps = recipe.steps.map((step, index) => ({
      number: index + 1,
      title: `${index + 1}단계`,
      description: step.description,
      image: step.imageUrl || recipe.thumbnailUrl || "https://cdnweb01.wikitree.co.kr/webdata/editor/202504/16/img_20250416102835_b3807a44.webp",
      alt: `${index + 1}단계 이미지`,
      timer: step.timerSeconds ? { duration: step.timerSeconds } : null,
    }));

    const dotsWrap = document.querySelector(".flex.gap-2.items-center");
    if (dotsWrap) {
      dotsWrap.innerHTML = cookingSteps
        .map((step) => `<div class="indicator-dot${step.number === 1 ? " active" : ""}" data-step="${step.number}"></div>`)
        .join("");
      elements.indicatorDots = Array.from(document.querySelectorAll(".indicator-dot"));
      elements.indicatorDots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
          currentStep = index;
          updateStep();
        });
      });
    }
  }
}

async function loadRecipeFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const recipeId = params.get("id");

  if (!recipeId) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/${recipeId}`);
    const data = await response.json();

    if (!response.ok || !data.recipe) {
      return;
    }

    applyRecipeData(data.recipe);
  } catch (error) {
    console.error("Recipe fetch error:", error);
  }
}

function updateTimerDisplay() {
  const minutes = Math.floor(currentTime / 60);
  const seconds = currentTime % 60;
  elements.timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function updateProgressBar() {
  if (totalTime <= 0) {
    elements.timerProgressBar.style.width = "0%";
    return;
  }

  const percent = ((totalTime - currentTime) / totalTime) * 100;
  elements.timerProgressBar.style.width = `${percent}%`;
}

function pauseTimer() {
  if (!isTimerRunning) {
    return;
  }

  isTimerRunning = false;
  window.clearInterval(timerInterval);
  elements.startTimerButton.style.display = "inline-block";
  elements.pauseTimerButton.style.display = "none";
}

function showNotification() {
  elements.notification.classList.add("show");

  window.setTimeout(() => {
    elements.notification.classList.remove("show");
  }, 3000);
}

function playNotificationSound() {
  console.log("타이머가 종료되었습니다.");
}

function updateTimer() {
  if (currentTime > 0) {
    currentTime -= 1;
    updateTimerDisplay();
    updateProgressBar();
    return;
  }

  pauseTimer();
  elements.timerContainer.classList.add("timer-finished");
  showNotification();
  playNotificationSound();
}

function startTimer() {
  if (isTimerRunning || currentTime <= 0) {
    return;
  }

  isTimerRunning = true;
  timerInterval = window.setInterval(updateTimer, 1000);
  elements.startTimerButton.style.display = "none";
  elements.pauseTimerButton.style.display = "inline-block";
}

function resetTimer() {
  pauseTimer();

  const step = cookingSteps[currentStep];

  if (!step.timer) {
    return;
  }

  currentTime = step.timer.duration;
  totalTime = step.timer.duration;
  updateTimerDisplay();
  updateProgressBar();
  elements.timerContainer.classList.remove("timer-finished");
}

function updateStep() {
  const step = cookingSteps[currentStep];

  elements.stepNumber.textContent = step.number;
  elements.stepTitle.textContent = step.title;
  elements.stepDescription.textContent = step.description;
  elements.stepImage.src = step.image;
  elements.stepImage.alt = step.alt;
  elements.stepCounter.textContent = `${step.number} / ${cookingSteps.length}`;
  elements.prevButton.disabled = currentStep === 0;
  elements.nextButton.disabled = currentStep === cookingSteps.length - 1;

  elements.indicatorDots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentStep);
  });

  if (step.timer) {
    elements.timerContainer.style.display = "flex";
    elements.timerLabel.textContent = "⏰";
    currentTime = step.timer.duration;
    totalTime = step.timer.duration;
    updateTimerDisplay();
    updateProgressBar();
    elements.timerContainer.classList.remove("timer-finished");
    elements.startTimerButton.style.display = "inline-block";
    elements.pauseTimerButton.style.display = "none";
    isTimerRunning = false;
    window.clearInterval(timerInterval);
    return;
  }

  elements.timerContainer.style.display = "none";
  isTimerRunning = false;
  window.clearInterval(timerInterval);
}

function nextStep() {
  if (currentStep >= cookingSteps.length - 1) {
    return;
  }

  currentStep += 1;
  updateStep();
}

function previousStep() {
  if (currentStep <= 0) {
    return;
  }

  currentStep -= 1;
  updateStep();
}

function updateMissingIngredients() {
  const missing = elements.ingredientCheckboxes
    .filter((checkbox) => !checkbox.checked)
    .map((checkbox) => checkbox.value);

  if (missing.length === 0) {
    if (elements.missingInfo) {
      elements.missingInfo.hidden = true;
    }
    if (elements.shoppingLinksWrap) {
      elements.shoppingLinksWrap.hidden = true;
    }
    if (elements.shoppingLinksList) {
      elements.shoppingLinksList.innerHTML = "";
    }
    return;
  }

  if (elements.missingInfo) {
    elements.missingInfo.hidden = false;
  }

  if (!elements.shoppingLinksWrap || !elements.shoppingLinksList) {
    return;
  }

  const shoppingLinksMarkup = missing
    .map((ingredient) => {
      const searchUrl = `${shoppingSearchBaseUrl}${encodeURIComponent(ingredient)}`;

      return `<a class="shopping-link" href="${searchUrl}" target="_blank" rel="noopener noreferrer">${ingredient}</a>`;
    })
    .join("");

  elements.shoppingLinksList.innerHTML = shoppingLinksMarkup;
  elements.shoppingLinksWrap.hidden = false;
}

elements.startTimerButton?.addEventListener("click", startTimer);
elements.pauseTimerButton?.addEventListener("click", pauseTimer);
elements.resetTimerButton?.addEventListener("click", resetTimer);
elements.prevButton?.addEventListener("click", previousStep);
elements.nextButton?.addEventListener("click", nextStep);

elements.ingredientCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", updateMissingIngredients);
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    event.preventDefault();
    const href = anchor.getAttribute("href");
    const target = href ? document.querySelector(href) : null;

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    nextStep();
  } else if (event.key === "ArrowLeft") {
    previousStep();
  }
});

elements.indicatorDots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    currentStep = index;
    updateStep();
  });
});

loadRecipeFromQuery().finally(() => {
  updateMissingIngredients();
  updateStep();
});
