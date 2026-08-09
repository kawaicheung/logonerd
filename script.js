(function () {
  const grid = document.getElementById("grid");
  const eventsFilter = document.getElementById("events-filter");
  const eventsList = document.getElementById("events-list");
  const timelineFilters = document.getElementById("timeline-filters");
  const timelineList = document.getElementById("timeline-list");
  const sortOrder = document.getElementById("sort-order");
  const favoritesToggle = document.getElementById("favorites-toggle");
  const shareFavorites = document.getElementById("share-favorites");
  const shareFavoritesLink = document.getElementById("share-favorites-link");

  let sortDirection = "desc";
  let showFavorites = false;

  function setSortDirection(value) {
    sortDirection = value;
    sortOrder.classList.toggle("asc", value === "asc");
    sortOrder.setAttribute(
      "aria-label",
      value === "asc" ? "Sort newest first" : "Sort oldest first"
    );
  }

  function setShowFavorites(value) {
    showFavorites = value;
    favoritesToggle.classList.toggle("active", value);
    favoritesToggle.setAttribute("aria-pressed", String(value));
  }

  const FAVORITES_KEY = "logonerd:favorites";
  const STAR_ICON =
    '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.26 6.6.6-5 4.53 1.5 6.7L12 16.9l-6 3.7 1.5-6.7-5-4.53 6.6-.6z"/></svg>';

  function spawnFavoriteSparks() {
    favoritesToggle.classList.remove("bounce");
    void favoritesToggle.offsetWidth;
    favoritesToggle.classList.add("bounce");

    const count = 12;
    for (let i = 0; i < count; i++) {
      const baseAngle = (360 / count) * i;
      const angle = baseAngle + (Math.random() * 24 - 12);
      const spark = document.createElement("span");
      spark.className = "spark";
      spark.style.setProperty("--angle", `${angle}deg`);
      spark.style.setProperty("--size", `${6 + Math.random() * 8}px`);
      spark.style.setProperty("--start", `${14 + Math.random() * 10}px`);
      spark.style.setProperty("--distance", `${40 + Math.random() * 35}px`);
      spark.style.setProperty("--duration", `${0.35 + Math.random() * 0.35}s`);
      spark.style.setProperty("--delay", `${Math.random() * 0.08}s`);
      spark.innerHTML = STAR_ICON;
      spark.firstElementChild.style.transform = `rotate(${Math.random() * 360}deg)`;
      spark.addEventListener("animationend", () => spark.remove());
      favoritesToggle.appendChild(spark);
    }
  }

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

  const urlToId = new Map(LOGO_DATA.map((item) => [item.url, item.id]));
  const idToItem = new Map(LOGO_DATA.map((item) => [item.id, item]));

  // Set when a shared "?favorites=" link is opened: a fixed list of ids to
  // show, independent of the viewer's own localStorage favorites. Null
  // means "show whatever's currently in my own localStorage favorites,"
  // which is restored as soon as the viewer toggles favorites view by hand.
  let pinnedFavoriteIds = null;

  let selectedYear = "all";
  let selectedDecade = "all";
  let selectedEvent = "all";

  const LEAGUES = {
    MLB: ["World Series", "MLB All-Star Game", "MLB Spring Training"],
    NFL: ["Super Bowl", "NFL Draft", "Pro Bowl"],
    NHL: ["NHL All-Star Game", "NHL Draft", "Stanley Cup Playoffs"],
    NBA: ["NBA All-Star Game", "NBA Draft", "NBA Finals"],
    WNBA: ["WNBA All-Star Game", "WNBA Finals"],
    Olympics: ["Summer Olympics", "Winter Olympics"],
  };
  const GROUP_PREFIX = "group:";
  const OTHER_LABEL = "Other";

  // Event types that don't belong to any league in LEAGUES, filled in by
  // populateFilters once the data's actual event types are known.
  let otherEvents = [];

  function eventsForGroup(league) {
    return league === OTHER_LABEL ? otherEvents : LEAGUES[league] || [];
  }

  function populateFilters(data) {
    const events = [...new Set(data.map((d) => d.event_type))].sort();
    const presentYears = new Set(data.map((d) => d.year));
    const minYear = Math.min(...presentYears);
    const maxYear = Math.max(...presentYears);

    const remainingEvents = new Set(events);

    eventsList.appendChild(
      makeEventItem("all", "All events", selectEvent, "all-events")
    );

    Object.keys(LEAGUES).forEach((league) => {
      const leagueEvents = LEAGUES[league].filter((event) =>
        remainingEvents.has(event)
      );
      if (leagueEvents.length === 0) return;
      leagueEvents.forEach((event) => remainingEvents.delete(event));

      eventsList.appendChild(
        makeEventItem(GROUP_PREFIX + league, league, selectEvent, "event-group-label")
      );
      leagueEvents.forEach((event) => {
        eventsList.appendChild(makeEventItem(event, event, selectEvent));
      });
    });

    if (remainingEvents.size > 0) {
      otherEvents = events.filter((event) => remainingEvents.has(event));

      eventsList.appendChild(
        makeEventItem(
          GROUP_PREFIX + OTHER_LABEL,
          OTHER_LABEL,
          selectEvent,
          "event-group-label"
        )
      );

      otherEvents.forEach((event) => {
        eventsList.appendChild(makeEventItem(event, event, selectEvent));
      });
    }

    timelineList.appendChild(makeScrollItem("all", "All-Time", selectYear));

    for (
      let decade = Math.floor(maxYear / 10) * 10;
      decade >= Math.floor(minYear / 10) * 10;
      decade -= 10
    ) {
      const group = document.createElement("div");
      group.className = "decade-group";

      group.appendChild(
        makeDecadeItem(String(decade), `${decade}s`, selectDecade)
      );

      const yearsCol = document.createElement("div");
      yearsCol.className = "years-col";
      for (let year = decade + 9; year >= decade; year--) {
        if (year > maxYear || year < minYear) continue;
        const btn = makeScrollItem(String(year), String(year), selectYear);
        if (!presentYears.has(year)) btn.disabled = true;
        yearsCol.appendChild(btn);
      }
      group.appendChild(yearsCol);

      timelineList.appendChild(group);
    }
  }

  function makeScrollItem(value, label, onSelect) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "year-item";
    btn.dataset.value = value;
    btn.textContent = label;
    btn.addEventListener("click", () => onSelect(value));
    return btn;
  }

  function makeEventItem(value, label, onSelect, extraClass) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = extraClass ? `event-item ${extraClass}` : "event-item";
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

  // The current browser's own favorites, as sorted ids -- used only to
  // build the "Share this set" link, never to decide what's on screen.
  function favoriteIdsFromLocal() {
    return [...favorites]
      .map((url) => urlToId.get(url))
      .filter((id) => id !== undefined)
      .sort((a, b) => a - b);
  }

  function centerInScroll(container, el) {
    if (!container || !el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    container.scrollTop +=
      elRect.top - containerRect.top - containerRect.height / 2 + elRect.height / 2;
  }

  function selectEvent(value) {
    setShowFavorites(false);
    pinnedFavoriteIds = null;
    selectedEvent = value;
    if (value === "all") eventsFilter.scrollTop = 0;
    updateActiveButtons();
    render();
  }

  function selectYear(value) {
    setShowFavorites(false);
    pinnedFavoriteIds = null;
    selectedYear = value;
    selectedDecade = "all";
    if (value === "all") {
      timelineFilters.scrollTop = 0;
    } else {
      centerInScroll(timelineFilters, timelineList.querySelector(`.year-item[data-value="${value}"]`));
    }
    updateActiveButtons();
    render();
  }

  function selectDecade(value) {
    setShowFavorites(false);
    pinnedFavoriteIds = null;
    selectedDecade = value;
    if (value !== "all") selectedYear = "all";
    const decadeBtn = timelineList.querySelector(`.decade-item[data-value="${value}"]`);
    centerInScroll(timelineFilters, decadeBtn ? decadeBtn.closest(".decade-group") : null);
    updateActiveButtons();
    render();
  }

  function updateActiveButtons() {
    timelineList.querySelectorAll(".year-item").forEach((btn) => {
      const active =
        btn.dataset.value === "all"
          ? selectedYear === "all" && selectedDecade === "all"
          : btn.dataset.value === selectedYear;
      btn.classList.toggle("active", active);
    });
    timelineList.querySelectorAll(".decade-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === selectedDecade);
    });
    eventsList.querySelectorAll(".event-item").forEach((btn) => {
      let active = btn.dataset.value === selectedEvent;
      if (!active && selectedEvent.startsWith(GROUP_PREFIX)) {
        const league = selectedEvent.slice(GROUP_PREFIX.length);
        active = eventsForGroup(league).includes(btn.dataset.value);
      }
      btn.classList.toggle("active", active);
    });
  }

  function hasItem(container, selector, value) {
    return [...container.querySelectorAll(selector)].some(
      (btn) => btn.dataset.value === value && !btn.disabled
    );
  }

  function applyFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const event = params.get("event");
    const year = params.get("year");
    const decade = params.get("decade");
    const sort = params.get("sort");
    const favoritesParam = params.get("favorites");

    if (favoritesParam) {
      const ids = favoritesParam
        .split(",")
        .map((s) => Number(s))
        .filter((id) => idToItem.has(id));
      if (ids.length > 0) {
        // This is someone else's shared set, not "my" favorites -- leave
        // the checkbox unchecked and the normal filters at their defaults.
        pinnedFavoriteIds = new Set(ids);
        return;
      }
    }

    if (event && hasItem(eventsList, ".event-item", event)) {
      selectedEvent = event;
    }

    if (decade && hasItem(timelineList, ".decade-item", decade)) {
      selectedDecade = decade;
    } else if (year && hasItem(timelineList, ".year-item", year)) {
      selectedYear = year;
    }
    updateActiveButtons();

    if (sort === "asc") {
      setSortDirection("asc");
    }
  }

  function syncURL() {
    const params = new URLSearchParams();
    if (pinnedFavoriteIds) {
      // Viewing someone else's shared set: keep the link that got us here
      // intact (so refreshing/copying it still works).
      const ids = [...pinnedFavoriteIds].sort((a, b) => a - b);
      params.set("favorites", ids.join(","));
    } else if (!showFavorites) {
      if (selectedEvent !== "all") params.set("event", selectedEvent);
      if (selectedDecade !== "all") {
        params.set("decade", selectedDecade);
      } else if (selectedYear !== "all") {
        params.set("year", selectedYear);
      }
      if (sortDirection !== "desc") params.set("sort", sortDirection);
    }

    const queryString = params.toString();
    const newURL = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;
    window.history.replaceState(null, "", newURL);
  }

  function render() {
    const viewingShared = pinnedFavoriteIds !== null;
    const favoritesOnly = viewingShared || showFavorites;
    const eventValue = selectedEvent;
    const order = sortDirection;

    let items;
    if (viewingShared) {
      items = LOGO_DATA.filter((item) => pinnedFavoriteIds.has(item.id));
    } else if (favoritesOnly) {
      items = LOGO_DATA.filter((item) => favorites.has(item.url));
    } else {
      items = LOGO_DATA.filter((item) => {
        let eventMatch;
        if (eventValue === "all") {
          eventMatch = true;
        } else if (eventValue.startsWith(GROUP_PREFIX)) {
          const league = eventValue.slice(GROUP_PREFIX.length);
          eventMatch = eventsForGroup(league).includes(item.event_type);
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
    grid.scrollTop = 0;

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = viewingShared
        ? "None of these logos are available anymore."
        : favoritesOnly
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

    if (showFavorites && !viewingShared) {
      const ids = favoriteIdsFromLocal();
      if (ids.length > 0) {
        shareFavoritesLink.href = `${window.location.pathname}?favorites=${ids.join(",")}`;
        shareFavorites.classList.add("visible");
      } else {
        shareFavorites.classList.remove("visible");
      }
    } else {
      shareFavorites.classList.remove("visible");
    }

    syncURL();
  }

  sortOrder.addEventListener("click", () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    render();
  });

  favoritesToggle.addEventListener("click", () => {
    // A hand click always means "show MY favorites," not whatever list
    // (if any) was pinned by an incoming shared link.
    pinnedFavoriteIds = null;
    setShowFavorites(!showFavorites);
    if (showFavorites) {
      selectedEvent = "all";
      selectedYear = "all";
      selectedDecade = "all";
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
      spawnFavoriteSparks();
    }
    saveFavorites();
    if (showFavorites) {
      render();
    } else {
      btn.classList.toggle("favorited", favorites.has(url));
    }
  });

  populateFilters(LOGO_DATA);
  applyFiltersFromURL();
  render();
})();
