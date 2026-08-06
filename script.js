(function () {
  const grid = document.getElementById("grid");
  const eventFilter = document.getElementById("event-filter");
  const yearScroll = document.getElementById("year-scroll");
  const decadeScroll = document.getElementById("decade-scroll");
  const sortOrder = document.getElementById("sort-order");
  const resetFilters = document.getElementById("reset-filters");
  const eventClear = document.getElementById("event-clear");
  const metaToggle = document.getElementById("meta-toggle-input");
  const favoritesToggle = document.getElementById("favorites-toggle-input");

  const FAVORITES_KEY = "logonerd:favorites";
  const STAR_ICON =
    '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.26 6.6.6-5 4.53 1.5 6.7L12 16.9l-6 3.7 1.5-6.7-5-4.53 6.6-.6z"/></svg>';

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveFavorites() {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  }

  const favorites = loadFavorites();

  let selectedYear = "all";
  let selectedDecade = "all";

  const LEAGUES = {
    MLB: ["MLB All-Star Game", "MLB Spring Training", "World Series"],
    NFL: ["NFL Draft", "Super Bowl"],
    NHL: ["NHL All-Star Game"],
    NBA: ["NBA All-Star Game", "NBA Finals"],
    WNBA: ["WNBA All-Star Game", "WNBA Finals"],
  };
  const GROUP_PREFIX = "group:";

  function populateFilters(data) {
    const events = [...new Set(data.map((d) => d.event_type))].sort();
    const presentYears = new Set(data.map((d) => d.year));
    const minYear = Math.min(...presentYears);
    const maxYear = Math.max(...presentYears);

    const years = [];
    for (let year = maxYear; year >= minYear; year--) years.push(year);

    const decades = [];
    for (
      let decade = Math.floor(maxYear / 10) * 10;
      decade >= Math.floor(minYear / 10) * 10;
      decade -= 10
    ) {
      decades.push(decade);
    }

    const remainingEvents = new Set(events);

    Object.keys(LEAGUES).forEach((league) => {
      const leagueEvents = LEAGUES[league].filter((event) =>
        remainingEvents.has(event)
      );
      if (leagueEvents.length === 0) return;
      leagueEvents.forEach((event) => remainingEvents.delete(event));

      const group = document.createElement("optgroup");
      group.label = league;

      const allOpt = document.createElement("option");
      allOpt.value = GROUP_PREFIX + league;
      allOpt.textContent = `All ${league}`;
      group.appendChild(allOpt);

      leagueEvents.forEach((event) => {
        const opt = document.createElement("option");
        opt.value = event;
        opt.textContent = event;
        group.appendChild(opt);
      });

      eventFilter.appendChild(group);
    });

    if (remainingEvents.size > 0) {
      const group = document.createElement("optgroup");
      group.label = "Other";
      events
        .filter((event) => remainingEvents.has(event))
        .forEach((event) => {
          const opt = document.createElement("option");
          opt.value = event;
          opt.textContent = event;
          group.appendChild(opt);
        });
      eventFilter.appendChild(group);
    }

    yearScroll.appendChild(makeScrollItem("all", "All", selectYear));
    years.forEach((year) => {
      const btn = makeScrollItem(String(year), String(year), selectYear);
      if (!presentYears.has(year)) btn.disabled = true;
      yearScroll.appendChild(btn);
    });

    decades.forEach((decade) => {
      decadeScroll.appendChild(
        makeDecadeItem(String(decade), `The ${decade}s`, selectDecade)
      );
    });

    layoutDecadeItems();
  }

  function makeScrollItem(value, label, onSelect) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "scroll-item";
    btn.dataset.value = value;
    btn.textContent = label;
    btn.addEventListener("click", () => onSelect(value));
    return btn;
  }

  function makeDecadeItem(value, label, onSelect) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "decade-item";
    btn.dataset.value = value;
    const span = document.createElement("span");
    span.className = "decade-label";
    span.textContent = label;
    btn.appendChild(span);
    btn.addEventListener("click", () => onSelect(value));
    return btn;
  }

  // Sizes/positions each decades-rail item to exactly span the years-rail
  // items it corresponds to, so the two rails read as one aligned timeline.
  function layoutDecadeItems() {
    const yearItems = [...yearScroll.children].slice(1); // skip the "All" year button
    const decadeItems = [...decadeScroll.children];
    const railTop = yearScroll.getBoundingClientRect().top;

    let yi = 0;
    decadeItems.forEach((decadeBtn) => {
      const decadeValue = Number(decadeBtn.dataset.value);
      let runLength = 0;
      while (
        yi + runLength < yearItems.length &&
        Math.floor(Number(yearItems[yi + runLength].dataset.value) / 10) * 10 ===
          decadeValue
      ) {
        runLength++;
      }

      const firstRect = yearItems[yi].getBoundingClientRect();
      const lastRect = yearItems[yi + runLength - 1].getBoundingClientRect();
      decadeBtn.style.top = `${firstRect.top - railTop}px`;
      decadeBtn.style.height = `${lastRect.bottom - firstRect.top}px`;

      yi += runLength;
    });

    decadeScroll.style.height = `${yearScroll.scrollHeight}px`;
  }

  function selectYear(value) {
    favoritesToggle.checked = false;
    selectedYear = value;
    if (value !== "all") selectedDecade = "all";
    updateActiveButtons();
    render();
  }

  function selectDecade(value) {
    favoritesToggle.checked = false;
    selectedDecade = value;
    if (value !== "all") selectedYear = "all";
    updateActiveButtons();
    render();
  }

  function updateActiveButtons() {
    [...yearScroll.children].forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === selectedYear);
    });
    [...decadeScroll.children].forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === selectedDecade);
    });
  }

  function hasOption(select, value) {
    return [...select.options].some((opt) => opt.value === value);
  }

  function hasScrollItem(container, value) {
    return [...container.children].some(
      (btn) => btn.dataset.value === value && !btn.disabled
    );
  }

  function applyFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const event = params.get("event");
    const year = params.get("year");
    const decade = params.get("decade");
    const sort = params.get("sort");

    if (event && hasOption(eventFilter, event)) {
      eventFilter.value = event;
    }

    if (decade && hasScrollItem(decadeScroll, decade)) {
      selectedDecade = decade;
    } else if (year && hasScrollItem(yearScroll, year)) {
      selectedYear = year;
    }
    updateActiveButtons();

    if (sort === "asc") {
      sortOrder.value = "asc";
    }
  }

  function syncURL() {
    const params = new URLSearchParams();
    if (eventFilter.value !== "all") params.set("event", eventFilter.value);
    if (selectedDecade !== "all") {
      params.set("decade", selectedDecade);
    } else if (selectedYear !== "all") {
      params.set("year", selectedYear);
    }
    if (sortOrder.value !== "desc") params.set("sort", sortOrder.value);

    const queryString = params.toString();
    const newURL = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;
    window.history.replaceState(null, "", newURL);
  }

  function render() {
    const favoritesOnly = favoritesToggle.checked;
    const eventValue = eventFilter.value;
    const order = sortOrder.value;

    let items;
    if (favoritesOnly) {
      items = LOGO_DATA.filter((item) => favorites.has(item.url));
    } else {
      items = LOGO_DATA.filter((item) => {
        let eventMatch;
        if (eventValue === "all") {
          eventMatch = true;
        } else if (eventValue.startsWith(GROUP_PREFIX)) {
          const league = eventValue.slice(GROUP_PREFIX.length);
          eventMatch = (LEAGUES[league] || []).includes(item.event_type);
        } else {
          eventMatch = item.event_type === eventValue;
        }
        let yearMatch;
        if (selectedDecade !== "all") {
          const decadeStart = Number(selectedDecade);
          yearMatch = item.year >= decadeStart && item.year < decadeStart + 10;
        } else {
          yearMatch = selectedYear === "all" || String(item.year) === selectedYear;
        }
        return eventMatch && yearMatch;
      });
    }

    items.sort((a, b) => (order === "asc" ? a.year - b.year : b.year - a.year));

    grid.innerHTML = "";

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = favoritesOnly
        ? "No favorites yet. Click the star on a logo to save it."
        : "No logos match those filters.";
      grid.appendChild(empty);
    } else {
      items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "card";
        const isFavorited = favorites.has(item.url);
        card.innerHTML = `
          <button class="favorite-btn${isFavorited ? " favorited" : ""}" type="button" data-url="${item.url}" aria-label="Toggle favorite">${STAR_ICON}</button>
          <div class="logo-wrap">
            <img src="${item.url}" alt="${item.label}" loading="lazy">
          </div>
          <div class="meta">${item.year} ${item.event_type}</div>
        `;
        grid.appendChild(card);
      });
    }

    eventClear.classList.toggle("visible", eventValue !== "all");

    syncURL();
  }

  [eventFilter, sortOrder].forEach((el) =>
    el.addEventListener("change", () => {
      favoritesToggle.checked = false;
      render();
    })
  );

  metaToggle.addEventListener("change", () => {
    grid.classList.toggle("hide-meta", !metaToggle.checked);
  });

  favoritesToggle.addEventListener("change", () => {
    if (favoritesToggle.checked) {
      eventFilter.value = "all";
      selectedYear = "all";
      selectedDecade = "all";
      sortOrder.value = "desc";
      updateActiveButtons();
    }
    render();
  });

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".favorite-btn");
    if (!btn) return;
    const url = btn.dataset.url;
    if (favorites.has(url)) {
      favorites.delete(url);
    } else {
      favorites.add(url);
    }
    saveFavorites();
    if (favoritesToggle.checked) {
      render();
    } else {
      btn.classList.toggle("favorited", favorites.has(url));
    }
  });

  eventClear.addEventListener("click", () => {
    eventFilter.value = "all";
    favoritesToggle.checked = false;
    render();
  });

  resetFilters.addEventListener("click", () => {
    eventFilter.value = "all";
    selectedYear = "all";
    selectedDecade = "all";
    sortOrder.value = "desc";
    metaToggle.checked = true;
    favoritesToggle.checked = false;
    grid.classList.remove("hide-meta");
    updateActiveButtons();
    render();
  });

  populateFilters(LOGO_DATA);
  applyFiltersFromURL();
  render();
})();
