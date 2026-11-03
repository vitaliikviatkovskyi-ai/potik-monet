document.querySelectorAll(".menu-toggle").forEach((toggle) => {
	const overlayId = toggle.getAttribute("aria-controls");
	const overlay = overlayId ? document.getElementById(overlayId) : null;

	if (!overlay) {
		return;
	}

	const closeMenu = () => {
		overlay.classList.remove("open");
		overlay.setAttribute("aria-hidden", "true");
		toggle.setAttribute("aria-expanded", "false");
		document.body.classList.remove("mobile-menu-open");
		toggle.focus();
	};

	toggle.addEventListener("click", () => {
		overlay.classList.add("open");
		overlay.setAttribute("aria-hidden", "false");
		toggle.setAttribute("aria-expanded", "true");
		document.body.classList.add("mobile-menu-open");
		overlay.querySelector(".close-menu").focus();
	});

	overlay.querySelector(".close-menu").addEventListener("click", () => {
		closeMenu();
	});

	overlay.querySelectorAll("a").forEach((link) => {
		link.addEventListener("click", closeMenu);
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && overlay.classList.contains("open")) {
			closeMenu();
		}
	});
});

const savedGoalsKey = "potikMonetSavedGoals";
const demoGoal = {
	id: "ferrari-f8-tributo",
	title: "Придбання Ferrari F8 Tributo",
	targetAmount: 12000000,
	savedAmount: 2500000,
	monthlyContribution: 150000,
	months: 64,
	targetDate: "Лютий 2032 року"
};

const saveDemoGoalButton = document.getElementById("save-demo-goal");
if (saveDemoGoalButton) {
	saveDemoGoalButton.addEventListener("click", () => {
		const status = document.getElementById("demo-save-status");
		try {
			const storedGoals = localStorage.getItem(savedGoalsKey);
			const goals = storedGoals ? JSON.parse(storedGoals) : [];
			if (!Array.isArray(goals)) {
				throw new Error("Збережені цілі мають некоректний формат.");
			}
			const updatedGoals = goals.filter((goal) => goal.id !== demoGoal.id);
			updatedGoals.push(demoGoal);
			localStorage.setItem(savedGoalsKey, JSON.stringify(updatedGoals));
			window.location.href = "goals.html?added=ferrari-f8-tributo";
		} catch (error) {
			status.textContent = "Не вдалося зберегти ціль у цьому браузері. Спробуйте ще раз або перевірте налаштування сховища.";
			status.classList.add("demo-save-error");
			console.error("Не вдалося зберегти приклад цілі:", error);
		}
	});
}

// Довідковий інформер НБУ. Помилка мережі не впливає на симулятор.
async function loadExchangeRates() {
  const status = document.getElementById("exchange-status");
  const list = document.getElementById("exchange-rates");
  if (!status || !list) return;
  try {
    const response = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const selected = ["USD", "EUR"].map(code => data.find(item => item.cc === code));
    if (selected.some(item => !item || !Number.isFinite(item.rate))) throw new Error("Немає курсів");
    for (const item of selected) {
      const row = document.createElement("div");
      row.className = "rounded-xl bg-slate-50 p-4 transition-colors duration-200 hover:bg-gray-100/80 cursor-pointer";
      const name = document.createElement("dt");
      name.className = "text-sm font-semibold text-slate-600";
      name.textContent = item.cc;
      const value = document.createElement("dd");
      value.className = "mt-1 text-2xl font-bold text-[#0d1829]";
      value.textContent = `${new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 4 }).format(item.rate)} ₴`;
      row.append(name, value);
      list.append(row);
    }
    status.textContent = `Оновлено НБУ: ${selected[0].exchangedate}`;
  } catch (_) {
    status.textContent = "Не вдалося завантажити курси. Скористайтеся посиланням на сайт НБУ нижче.";
  }
}
loadExchangeRates();

const goalsList = document.querySelector(".goals-selected > .goals-container");
if (goalsList) {
	try {
		const storedGoals = localStorage.getItem(savedGoalsKey);
		const goals = storedGoals ? JSON.parse(storedGoals) : [];
		if (!Array.isArray(goals)) {
			throw new Error("Збережені цілі мають некоректний формат.");
		}

		const savedDemoGoal = goals.find((goal) => goal.id === demoGoal.id);
		if (savedDemoGoal) {
			const amount = new Intl.NumberFormat("uk-UA").format(savedDemoGoal.targetAmount);
			const savedAmount = new Intl.NumberFormat("uk-UA").format(savedDemoGoal.savedAmount);
			const progress = Math.min(100, (savedDemoGoal.savedAmount / savedDemoGoal.targetAmount) * 100);
			const card = document.createElement("article");
			card.className = "goal-card demo-saved-goal bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-gray-300 group cursor-pointer";
			card.innerHTML = `
				<div class="goal-card-top">
					<div><span class="goal-saved-badge">Ваша ціль</span><h2 class="goal-title"></h2></div>
					<div class="goal-amount"><span>Сума цілі</span><strong>${amount} ₴</strong></div>
				</div>
				<div class="goal-progress-heading"><span></span><span></span></div>
				<progress class="goal-progress" max="100"></progress>
				<p class="goal-disclaimer"></p>
				<div class="goal-actions"><a class="btn goal-result-button inline-flex items-center justify-center px-5 py-2.5 bg-[#254d7e] hover:bg-[#1e3e67] text-white font-semibold text-sm rounded-lg transition duration-200 shadow-sm hover:shadow-md active:scale-95 hover:!bg-[#1e3e67] hover:!shadow-md" href="demo-goal.html">Переглянути приклад</a></div>
			`;
			card.querySelector(".goal-title").textContent = savedDemoGoal.title;
			card.querySelector(".goal-progress-heading span:first-child").textContent = `${savedAmount} ₴ із ${amount} ₴`;
			card.querySelector(".goal-progress-heading span:last-child").textContent = `${progress.toLocaleString("uk-UA", { maximumFractionDigits: 1 })}%`;
			card.querySelector(".goal-progress").value = progress;
			card.querySelector(".goal-progress").setAttribute("aria-label", `Прогрес цілі: ${progress.toLocaleString("uk-UA", { maximumFractionDigits: 1 })}%`);
			card.querySelector(".goal-disclaimer").textContent = `Щомісячний внесок ${new Intl.NumberFormat("uk-UA").format(savedDemoGoal.monthlyContribution)} ₴. Орієнтовне досягнення — ${savedDemoGoal.targetDate}.`;
			const existingGoalCard = goalsList.querySelector(".goal-card");
			existingGoalCard.insertAdjacentElement("afterend", card);
		}

		if (new URLSearchParams(window.location.search).get("added") === demoGoal.id) {
			const notice = document.createElement("p");
			notice.className = "demo-saved-notice";
			notice.setAttribute("role", "status");
			notice.textContent = "Ціль успішно додано до вашого списку!";
			goalsList.prepend(notice);
		}
	} catch (error) {
		console.error("Не вдалося завантажити збережені цілі:", error);
		if (goalsList) {
			const notice = document.createElement("p");
			notice.className = "demo-saved-notice is-error";
			notice.setAttribute("role", "alert");
			notice.textContent = "Не вдалося завантажити збережену ціль із цього браузера.";
			goalsList.prepend(notice);
		}
	}
}
