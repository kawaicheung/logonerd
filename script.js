(function () {
  const grid = document.getElementById("grid");
  const eventFilter = document.getElementById("event-filter");
  const yearScroll = document.getElementById("year-scroll");
  const decadeScroll = document.getElementById("decade-scroll");
  const sortOrder = document.getElementById("sort-order");
  const resultCount = document.getElementById("result-count");
  const resetFilters = document.getElementById("reset-filters");
  const eventClear = document.getElementById("event-clear");

  let selectedYear = "all";
  let selectedDecade = "all";

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

    events.forEach((event) => {
      const opt = document.createElement("option");
      opt.value = event;
      opt.textContent = event;
      eventFilter.appendChild(opt);
    });

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
    selectedYear = value;
    if (value !== "all") selectedDecade = "all";
    updateActiveButtons();
    render();
  }

  function selectDecade(value) {
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
    const eventValue = eventFilter.value;
    const order = sortOrder.value;

    let items = LOGO_DATA.filter((item) => {
      const eventMatch = eventValue === "all" || item.event_type === eventValue;
      let yearMatch;
      if (selectedDecade !== "all") {
        const decadeStart = Number(selectedDecade);
        yearMatch = item.year >= decadeStart && item.year < decadeStart + 10;
      } else {
        yearMatch = selectedYear === "all" || String(item.year) === selectedYear;
      }
      return eventMatch && yearMatch;
    });

    items.sort((a, b) => (order === "asc" ? a.year - b.year : b.year - a.year));

    grid.innerHTML = "";

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No logos match those filters.";
      grid.appendChild(empty);
    } else {
      items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <div class="logo-wrap">
            <img src="${item.url}" alt="${item.label}" loading="lazy">
          </div>
          <div class="meta">${item.year} ${item.event_type}</div>
        `;
        grid.appendChild(card);
      });
    }

    resultCount.textContent = `${items.length} logo${items.length === 1 ? "" : "s"}`;

    eventClear.classList.toggle("visible", eventValue !== "all");

    syncURL();
  }

  [eventFilter, sortOrder].forEach((el) => el.addEventListener("change", render));

  eventClear.addEventListener("click", () => {
    eventFilter.value = "all";
    render();
  });

  resetFilters.addEventListener("click", () => {
    eventFilter.value = "all";
    selectedYear = "all";
    selectedDecade = "all";
    sortOrder.value = "desc";
    updateActiveButtons();
    render();
  });

  populateFilters(LOGO_DATA);
  applyFiltersFromURL();
  render();
})();
