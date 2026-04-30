const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const recipeCards = Array.from(document.querySelectorAll(".recipe-card"));
const categoryControls = Array.from(
  document.querySelectorAll("[data-filter-type='category']")
);
const difficultyControls = Array.from(
  document.querySelectorAll("[data-filter-type='difficulty']")
);
const recipeButtons = Array.from(document.querySelectorAll(".recipe-btn"));

const filterState = {
  searchTerm: "",
  category: "all",
  difficulty: null,
};

function matchesFilters(card) {
  const title = card.querySelector("h3")?.textContent.toLowerCase() ?? "";
  const description =
    card.querySelector("p")?.textContent.toLowerCase() ?? "";
  const categories = card.dataset.category ?? "";
  const difficulty = Number.parseInt(card.dataset.difficulty ?? "", 10);
  const { searchTerm, category } = filterState;
  const matchesSearch =
    searchTerm === "" ||
    title.includes(searchTerm) ||
    description.includes(searchTerm);
  const matchesCategory = category === "all" || categories.includes(category);
  const matchesDifficulty =
    filterState.difficulty === null || difficulty === filterState.difficulty;

  return matchesSearch && matchesCategory && matchesDifficulty;
}

function renderCards() {
  recipeCards.forEach((card) => {
    card.hidden = !matchesFilters(card);
  });
}

function setActiveCategory(nextCategory) {
  categoryControls.forEach((control) => {
    const isActive = control.dataset.category === nextCategory;
    control.classList.toggle("active", isActive);
  });
}

function setActiveDifficulty(nextDifficulty) {
  difficultyControls.forEach((control) => {
    const difficulty = Number.parseInt(control.dataset.difficulty ?? "", 10);
    control.classList.toggle("active", difficulty === nextDifficulty);
  });
}

function applyCategory(category) {
  filterState.category = category;
  setActiveCategory(category);
  renderCards();
}

function applyDifficulty(difficulty) {
  filterState.difficulty = difficulty;
  setActiveDifficulty(difficulty);
  renderCards();
}

function updateSearch() {
  filterState.searchTerm = searchInput?.value.toLowerCase().trim() ?? "";
  renderCards();
}

categoryControls.forEach((control) => {
  control.addEventListener("click", (event) => {
    event.preventDefault();
    applyCategory(control.dataset.category ?? "all");
  });
});

difficultyControls.forEach((control) => {
  control.addEventListener("click", (event) => {
    event.preventDefault();
    const difficulty = Number.parseInt(control.dataset.difficulty ?? "", 10);
    applyDifficulty(Number.isNaN(difficulty) ? null : difficulty);
  });
});

searchButton?.addEventListener("click", updateSearch);

searchInput?.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    updateSearch();
  }
});

recipeCards.forEach((card) => {
  card.addEventListener("mouseenter", () => {
    card.style.transform = "translateY(-8px) scale(1.02)";
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "translateY(0) scale(1)";
  });

  card.style.opacity = "0";
  card.style.transform = "translateY(20px)";
  card.style.transition = "all 0.6s ease";
});

function animateNumbers() {
  const statNumbers = document.querySelectorAll(".stat-number");

  statNumbers.forEach((number) => {
    const target = number.textContent;
    const numericValue = Number.parseInt(target, 10);

    if (Number.isNaN(numericValue)) {
      return;
    }

    let current = 0;
    const increment = numericValue / 50;

    const timer = window.setInterval(() => {
      current += increment;

      if (current >= numericValue) {
        number.textContent = target;
        window.clearInterval(timer);
        return;
      }

      number.textContent = `${Math.floor(current)}${
        target.includes("+") ? "+" : ""
      }`;
    }, 30);
  });
}

recipeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const link = button.dataset.link;

    if (link) {
      window.location.href = link;
      return;
    }

    window.alert("준비 중인 레시피입니다!");
  });
});

window.addEventListener("load", () => {
  animateNumbers();
  renderCards();

  recipeCards.forEach((card, index) => {
    window.setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, index * 100);
  });
});
