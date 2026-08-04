(function () {
  const grid = document.getElementById("grid");
  const eventFilter = document.getElementById("event-filter");
  const yearFilter = document.getElementById("year-filter");
  const decadeFilter = document.getElementById("decade-filter");
  const yearControl = document.getElementById("year-control");
  const decadeControl = document.getElementById("decade-control");
  const sortOrder = document.getElementById("sort-order");
  const resultCount = document.getElementById("result-count");
  const resetFilters = document.getElementById("reset-filters");

  function populateFilters(data) {
    const events = [...new Set(data.map((d) => d.event_type))].sort();
    const years = [...new Set(data.map((d) => d.year))].sort((a, b) => a - b);

    events.forEach((event) => {
      const opt = document.createElement("option");
      opt.value = event;
      opt.textContent = event;
      eventFilter.appendChild(opt);
    });

    years.forEach((year) => {
      const opt = document.createElement("option");
      opt.value = year;
      opt.textContent = year;
      yearFilter.appendChild(opt);
    });

    const decades = [...new Set(years.map((year) => Math.floor(year / 10) * 10))].sort(
      (a, b) => a - b
    );

    decades.forEach((decade) => {
      const opt = document.createElement("option");
      opt.value = decade;
      opt.textContent = `${decade}s`;
      decadeFilter.appendChild(opt);
    });
  }

  function setActiveControl(active) {
    yearControl.classList.toggle("filter-active", active === "year");
    decadeControl.classList.toggle("filter-active", active === "decade");
  }

  function hasOption(select, value) {
    return [...select.options].some((opt) => opt.value === value);
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

    if (decade && hasOption(decadeFilter, decade)) {
      decadeFilter.value = decade;
      setActiveControl("decade");
    } else if (year && hasOption(yearFilter, year)) {
      yearFilter.value = year;
      setActiveControl("year");
    }

    if (sort === "asc") {
      sortOrder.value = "asc";
    }
  }

  function syncURL() {
    const params = new URLSearchParams();
    if (eventFilter.value !== "all") params.set("event", eventFilter.value);
    if (decadeFilter.value !== "all") {
      params.set("decade", decadeFilter.value);
    } else if (yearFilter.value !== "all") {
      params.set("year", yearFilter.value);
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
    const yearValue = yearFilter.value;
    const decadeValue = decadeFilter.value;
    const order = sortOrder.value;

    let items = LOGO_DATA.filter((item) => {
      const eventMatch = eventValue === "all" || item.event_type === eventValue;
      let yearMatch;
      if (decadeValue !== "all") {
        const decadeStart = Number(decadeValue);
        yearMatch = item.year >= decadeStart && item.year < decadeStart + 10;
      } else {
        yearMatch = yearValue === "all" || String(item.year) === yearValue;
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

    syncURL();
  }

  [eventFilter, sortOrder].forEach((el) => el.addEventListener("change", render));

  yearFilter.addEventListener("change", () => {
    if (yearFilter.value !== "all") {
      decadeFilter.value = "all";
      setActiveControl("year");
    } else {
      setActiveControl(null);
    }
    render();
  });

  decadeFilter.addEventListener("change", () => {
    if (decadeFilter.value !== "all") {
      yearFilter.value = "all";
      setActiveControl("decade");
    } else {
      setActiveControl(null);
    }
    render();
  });

  resetFilters.addEventListener("click", () => {
    eventFilter.value = "all";
    yearFilter.value = "all";
    decadeFilter.value = "all";
    sortOrder.value = "desc";
    setActiveControl(null);
    render();
  });

  populateFilters(LOGO_DATA);
  applyFiltersFromURL();
  render();
})();
