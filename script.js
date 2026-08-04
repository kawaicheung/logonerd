(function () {
  const grid = document.getElementById("grid");
  const eventFilter = document.getElementById("event-filter");
  const yearFilter = document.getElementById("year-filter");
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
  }

  function render() {
    const eventValue = eventFilter.value;
    const yearValue = yearFilter.value;
    const order = sortOrder.value;

    let items = LOGO_DATA.filter((item) => {
      const eventMatch = eventValue === "all" || item.event_type === eventValue;
      const yearMatch = yearValue === "all" || String(item.year) === yearValue;
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
          <div class="meta">
            <span class="event-name">${item.label}</span>
            <span class="year">${item.year} &middot; ${item.event_type}</span>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    resultCount.textContent = `${items.length} logo${items.length === 1 ? "" : "s"}`;
  }

  [eventFilter, yearFilter, sortOrder].forEach((el) =>
    el.addEventListener("change", render)
  );

  resetFilters.addEventListener("click", () => {
    eventFilter.value = "all";
    yearFilter.value = "all";
    sortOrder.value = "asc";
    render();
  });

  populateFilters(LOGO_DATA);
  render();
})();
