(function () {
  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

  // Google Fonts for the LogoNerd wordmark, one per letter (loaded in index.html's
  // Google Fonts link). Edit/reorder this list to change the look; it cycles if the
  // word is longer than the list.
  const LOGO_FONTS = [
    "'Bungee', sans-serif",
   /* "'Permanent Marker', cursive",
    "'Bangers', sans-serif",
    "'Righteous', sans-serif",
    "'Anton', sans-serif",
    "'Righteous', sans-serif",
    "'Luckiest Guy', cursive",
    "'Righteous', sans-serif",*/
  ];

  function paintLogoWordmark(el) {
    if (!el) return;
    const letters = el.textContent.split("");
    el.textContent = "";
    letters.forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "logo-letter";
      span.style.fontFamily = LOGO_FONTS[i % LOGO_FONTS.length];
      span.textContent = ch;
      el.appendChild(span);
    });
  }

  paintLogoWordmark(document.getElementById("mobile-brand-title"));

  function logoPath(filename, variant) {
    return `logos/${variant}/${filename}`;
  }

  if (isTouchDevice) {
    initMobile();
  } else {
    initDesktop();
  }

  function initMobile() {
    const titleBar = document.getElementById("mobile-title-bar");
    const filterTitle = document.getElementById("mobile-filter-title");
    const itemImg = document.getElementById("mobile-item-img");
    const randomizeBtn = document.getElementById("mobile-randomize-btn");

    function rollDice() {
      const isFirstRoll = !document.body.classList.contains("mobile-rolled");
      const animClass = isFirstRoll ? "rolling" : "rolling-repeat";

      randomizeBtn.classList.remove("rolling", "rolling-repeat");
      void randomizeBtn.offsetWidth;
      randomizeBtn.classList.add(animClass);
      document.body.classList.add("mobile-rolled");

      const item = LOGO_DATA[Math.floor(Math.random() * LOGO_DATA.length)];
      setTimeout(() => {
        itemImg.src = logoPath(item.url, "hi-res");
        itemImg.alt = item.label;
        itemImg.classList.add("visible");
        filterTitle.textContent = `${item.year} ${item.event_type}`;
        titleBar.classList.add("visible");
      }, isFirstRoll ? 260 : 225);
    }

    const autoRollTimeout = setTimeout(rollDice, 2000);

    randomizeBtn.addEventListener("click", () => {
      clearTimeout(autoRollTimeout);
      rollDice();
    });
  }

  function initDesktop() {
    const grid = document.getElementById("grid");
    const eventsFilter = document.getElementById("events-filter");
    const eventsList = document.getElementById("events-list");
    const placesFilter = document.getElementById("places-filter");
    const placesList = document.getElementById("places-list");
    const timelineFilters = document.getElementById("timeline-filters");
    const timelineList = document.getElementById("timeline-list");
    const sortOrder = document.getElementById("sort-order-btn");
    const favoritesToggle = document.getElementById("favorites-toggle");
    const randomizeBtn = document.getElementById("randomize-btn");
    const searchToggle = document.getElementById("search-toggle");
    const searchOptions = document.getElementById("search-options");
    const logo = document.getElementById("logo");
    const filterTitle = document.getElementById("filter-title");
    const itemMeta = document.getElementById("item-meta");
    const shareFavorites = document.getElementById("share-favorites");
    const shareFavoritesBtn = document.getElementById("share-favorites-btn");
    const shareFeedback = document.getElementById("share-feedback");
    const itemFavorite = document.getElementById("item-favorite");
    const itemDisplay = document.getElementById("item-display");
    const itemImg = document.getElementById("item-img");
    const itemPrev = document.getElementById("item-prev");
    const itemNext = document.getElementById("item-next");

    let sortDirection = "desc";
    let showFavorites = false;
    let randomItem = null;
    let copyTimeout = null;
    let currentItems = [];
    let viewedIndex = -1;
    let activeGridIndex = -1;

    function setSortDirection(value) {
      sortDirection = value;
      sortOrder.classList.toggle("asc", value === "asc");
      sortOrder.setAttribute(
        "aria-label",
        value === "asc" ? "Sort newest first" : "Sort oldest first"
      );
    }

    function updateFavoritesToggleState() {
      favoritesToggle.setAttribute("aria-pressed", String(showFavorites));
    }

    function capitalize(text) {
      return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function setShowFavorites(value) {
      showFavorites = value;
      updateFavoritesToggleState();
      grid.classList.toggle("favorites-view", value);
    }

    function exitSpecialModes() {
      pinnedFavoriteIds = null;
      randomItem = null;
      viewedIndex = -1;
      setShowFavorites(false);
    }

    const FAVORITES_KEY = "logonerd:favorites";
    const STAR_ICON =
      '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.26 6.6.6-5 4.53 1.5 6.7L12 16.9l-6 3.7 1.5-6.7-5-4.53 6.6-.6z"/></svg>';

    function popElement(el) {
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    }

    function spawnFavoriteSparks(target) {
      popElement(target);

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
        target.appendChild(spark);
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
    const validIds = new Set(LOGO_DATA.map((item) => item.id));

    // Set when a shared "?favorites=" link is opened: a fixed list of ids to
    // show, independent of the viewer's own localStorage favorites. Null
    // means "show whatever's currently in my own localStorage favorites,"
    // which is restored as soon as the viewer toggles favorites view by hand.
    let pinnedFavoriteIds = null;

    let selectedYear = "all";
    let selectedDecade = "all";
    let selectedEvent = "all";
    let selectedPlace = "all";

    const US_STATE_CODES = new Set([
      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
      "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
      "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
      "VA", "WA", "WV", "WI", "WY", "DC",
    ]);
    const CA_PROVINCE_CODES = new Set([
      "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
    ]);
    const MULTI_COUNTRY_LABEL = "Multiple Countries";
    const PLACE_GROUP_PREFIX = "place-group:";

    // Location strings ("City, ST" / "City, Country" / bare country names)
    // grouped by inferred country, filled in by populateFilters.
    let placesByCountry = new Map();

    function countryForLocation(location) {
      if (location.includes(" & ")) return MULTI_COUNTRY_LABEL;
      const commaIndex = location.lastIndexOf(", ");
      if (commaIndex === -1) return location;
      const suffix = location.slice(commaIndex + 2);
      if (US_STATE_CODES.has(suffix)) return "United States";
      if (CA_PROVINCE_CODES.has(suffix)) return "Canada";
      return suffix;
    }

    function cityLabelForLocation(location) {
      if (location.includes(" & ")) return location;
      const commaIndex = location.lastIndexOf(", ");
      return commaIndex === -1 ? location : location.slice(0, commaIndex);
    }

    const LEAGUES = {
      MLB: ["World Series", "MLB All-Star Game", "MLB Spring Training", "MLB Postseason", "MLB Opening Day"],
      NFL: ["Super Bowl", "NFL Draft", "Pro Bowl"],
      NHL: ["NHL All-Star Game", "NHL Draft", "NHL Winter Classic", "Stanley Cup Playoffs"],
      NBA: ["NBA All-Star Game", "NBA Draft", "NBA Finals", "NBA Playoffs"],
      WNBA: ["WNBA All-Star Game", "WNBA Finals"],
      Olympics: ["Summer Olympics", "Winter Olympics"],
    };
    const LEAGUE_LOGOS = {
      MLB: "logos/league/mlb.svg",
      NFL: "logos/league/nfl.svg",
      NHL: "logos/league/nhl.svg",
      NBA: "logos/league/nba.svg",
      WNBA: "logos/league/wnba.svg",
      Olympics: "logos/league/olympics.svg",
    };
    const GROUP_PREFIX = "group:";
    const OTHER_LABEL = "Other";

    // Decades below this are lumped into one trailing "& earlier" column
    // instead of standing alone (see populateFilters).
    const LUMP_BELOW = 1950;

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
        makeEventItem("all", "All events", selectEvent, "all-nav-item")
      );

      Object.keys(LEAGUES).forEach((league) => {
        const leagueEvents = LEAGUES[league].filter((event) =>
          remainingEvents.has(event)
        );
        if (leagueEvents.length === 0) return;
        leagueEvents.forEach((event) => remainingEvents.delete(event));

        eventsList.appendChild(
          makeEventItem(GROUP_PREFIX + league, league, selectEvent, "event-group-label", LEAGUE_LOGOS[league])
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

      placesByCountry = new Map();
      data.forEach((item) => {
        if (!item.location) return;
        const country = countryForLocation(item.location);
        if (!placesByCountry.has(country)) placesByCountry.set(country, new Set());
        placesByCountry.get(country).add(item.location);
      });

      placesList.appendChild(
        makeEventItem("all", "All places", selectPlace, "all-nav-item")
      );

      [...placesByCountry.keys()].sort().forEach((country) => {
        const places = [...placesByCountry.get(country)].sort();
        if (places.length === 1 && places[0] === country) {
          placesList.appendChild(
            makeEventItem(places[0], country, selectPlace, "event-group-label")
          );
          return;
        }
        placesList.appendChild(
          makeEventItem(PLACE_GROUP_PREFIX + country, country, selectPlace, "event-group-label")
        );
        places.forEach((place) => {
          placesList.appendChild(
            makeEventItem(place, cityLabelForLocation(place), selectPlace)
          );
        });
      });

      const allTimeGroup = document.createElement("div");
      allTimeGroup.className = "decade-group";
      allTimeGroup.appendChild(makeScrollItem("all", "All", selectYear, "all-nav-item"));
      timelineList.appendChild(allTimeGroup);

      function appendDecadeColumn(label, value, years) {
        const group = document.createElement("div");
        group.className = "decade-group";
        group.appendChild(makeDecadeItem(value, label, selectDecade));

        const yearsCol = document.createElement("div");
        yearsCol.className = "years-col";
        years.forEach((year) => {
          if (!presentYears.has(year)) return;
          yearsCol.appendChild(makeScrollItem(String(year), String(year), selectYear));
        });
        group.appendChild(yearsCol);

        timelineList.appendChild(group);
      }

      for (
        let decade = Math.floor(maxYear / 10) * 10;
        decade >= LUMP_BELOW;
        decade -= 10
      ) {
        const years = [];
        for (let year = decade + 9; year >= decade; year--) {
          if (year <= maxYear && year >= minYear) years.push(year);
        }
        appendDecadeColumn(`${decade}s`, String(decade), years);
      }

      if (minYear < LUMP_BELOW) {
        const years = [];
        for (let year = Math.min(maxYear, LUMP_BELOW - 1); year >= minYear; year--) {
          years.push(year);
        }
        appendDecadeColumn(`${LUMP_BELOW - 10}s & earlier`, "lump", years);
      }
    }

    function makeScrollItem(value, label, onSelect, extraClass) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = extraClass ? `nav-item year-item ${extraClass}` : "nav-item year-item";
      btn.dataset.value = value;
      btn.textContent = label;
      btn.addEventListener("click", () => onSelect(value));
      return btn;
    }

    function makeEventItem(value, label, onSelect, extraClass, iconSrc) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = extraClass ? `nav-item event-item ${extraClass}` : "nav-item event-item";
      btn.dataset.value = value;
      if (iconSrc) {
        const span = document.createElement("span");
        span.textContent = label;
        btn.appendChild(span);
        const img = document.createElement("img");
        img.className = `event-group-icon event-group-icon--${label.toLowerCase()}`;
        img.src = iconSrc;
        img.alt = "";
        img.loading = "lazy";
        btn.appendChild(img);
      } else {
        btn.textContent = label;
      }
      btn.addEventListener("click", () => onSelect(value));
      return btn;
    }

    function makeDecadeItem(value, label, onSelect) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-item decade-item";
      btn.dataset.value = value;
      btn.textContent = label;
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

    function clearPlace() {
      if (selectedPlace === "all") return;
      selectedPlace = "all";
      placesFilter.scrollTop = 0;
    }

    function clearEventAndTimeline() {
      selectedEvent = "all";
      selectedYear = "all";
      selectedDecade = "all";
      eventsFilter.scrollTop = 0;
      timelineFilters.scrollTop = 0;
    }

    function selectEvent(value) {
      exitSpecialModes();
      clearPlace();
      selectedEvent = value;
      if (value === "all") {
        eventsFilter.scrollTop = 0;
      } else {
        centerInScroll(eventsFilter, eventsList.querySelector(`.event-item[data-value="${value}"]`));
      }
      updateActiveButtons();
      render();
    }

    function selectPlace(value) {
      exitSpecialModes();
      clearEventAndTimeline();
      selectedPlace = value;
      if (value === "all") {
        placesFilter.scrollTop = 0;
      } else {
        centerInScroll(placesFilter, placesList.querySelector(`.event-item[data-value="${value}"]`));
      }
      updateActiveButtons();
      render();
    }

    function selectYear(value) {
      exitSpecialModes();
      clearPlace();
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
      exitSpecialModes();
      clearPlace();
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
      placesList.querySelectorAll(".event-item").forEach((btn) => {
        let active = btn.dataset.value === selectedPlace;
        if (!active && selectedPlace.startsWith(PLACE_GROUP_PREFIX)) {
          const country = selectedPlace.slice(PLACE_GROUP_PREFIX.length);
          active = placesByCountry.get(country)?.has(btn.dataset.value) ?? false;
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
      const place = params.get("place");
      const year = params.get("year");
      const decade = params.get("decade");
      const sort = params.get("sort");
      const favoritesParam = params.get("favorites");

      if (favoritesParam) {
        const ids = favoritesParam
          .split(",")
          .map((s) => Number(s))
          .filter((id) => validIds.has(id));
        if (ids.length > 0) {
          // This is someone else's shared set, not "my" favorites -- leave
          // the checkbox unchecked and the normal filters at their defaults.
          pinnedFavoriteIds = new Set(ids);
          searchOptions.classList.add("disabled");
          return;
        }
      }

      if (event && hasItem(eventsList, ".event-item", event)) {
        selectedEvent = event;
      }

      if (place && hasItem(placesList, ".event-item", place)) {
        selectedPlace = place;
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
        if (selectedPlace !== "all") params.set("place", selectedPlace);
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

    function renderItemDisplay() {
      const item = viewedIndex !== -1 ? currentItems[viewedIndex] : null;
      searchOptions.classList.toggle("disabled", showFavorites || !!item);
      if (!item) {
        grid.classList.remove("hidden");
        itemDisplay.classList.remove("visible");
        itemFavorite.classList.remove("visible");
        itemMeta.classList.remove("visible");
        return false;
      }
      grid.classList.add("hidden");
      itemDisplay.classList.add("visible");
      itemImg.src = logoPath(item.url, "hi-res");
      itemImg.alt = item.label;
      itemPrev.disabled = viewedIndex <= 0;
      itemNext.disabled = viewedIndex >= currentItems.length - 1;
      itemPrev.classList.toggle("hidden", !!randomItem);
      itemNext.classList.toggle("hidden", !!randomItem);

      filterTitle.textContent = `${item.year} ${item.event_type}`;
      const dateText = item.date === String(item.year) ? "" : item.date;
      const metaText = [item.location, dateText].filter(Boolean).join(" · ");
      itemMeta.textContent = metaText;
      itemMeta.classList.toggle("visible", !!metaText);
      itemFavorite.classList.add("visible");
      itemFavorite.classList.toggle("favorited", favorites.has(item.url));
      sortOrder.classList.add("hidden");
      shareFavorites.classList.remove("visible");
      return true;
    }

    function render() {
      const viewingShared = pinnedFavoriteIds !== null;
      const favoritesOnly = viewingShared || showFavorites;

      let items;
      if (randomItem) {
        items = [randomItem];
      } else if (viewingShared) {
        items = LOGO_DATA.filter((item) => pinnedFavoriteIds.has(item.id));
      } else if (favoritesOnly) {
        items = LOGO_DATA.filter((item) => favorites.has(item.url));
      } else {
        items = LOGO_DATA.filter((item) => {
          let eventMatch;
          if (selectedEvent === "all") {
            eventMatch = true;
          } else if (selectedEvent.startsWith(GROUP_PREFIX)) {
            const league = selectedEvent.slice(GROUP_PREFIX.length);
            eventMatch = eventsForGroup(league).includes(item.event_type);
          } else {
            eventMatch = item.event_type === selectedEvent;
          }
          let yearMatch;
          if (selectedDecade === "lump") {
            yearMatch = item.year < LUMP_BELOW;
          } else if (selectedDecade !== "all") {
            const decadeStart = Number(selectedDecade);
            yearMatch = item.year >= decadeStart && item.year < decadeStart + 10;
          } else {
            yearMatch = selectedYear === "all" || String(item.year) === selectedYear;
          }
          let placeMatch;
          if (selectedPlace === "all") {
            placeMatch = true;
          } else if (selectedPlace.startsWith(PLACE_GROUP_PREFIX)) {
            const country = selectedPlace.slice(PLACE_GROUP_PREFIX.length);
            placeMatch = !!item.location && (placesByCountry.get(country)?.has(item.location) ?? false);
          } else {
            placeMatch = item.location === selectedPlace;
          }
          return eventMatch && yearMatch && placeMatch;
        });
      }

      items.sort((a, b) => (sortDirection === "asc" ? a.year - b.year : b.year - a.year));
      currentItems = items;

      if (randomItem) viewedIndex = 0;

      activeGridIndex = -1;
      grid.innerHTML = "";
      grid.scrollTop = 0;

      if (!renderItemDisplay()) {
        if (items.length === 0) {
          const empty = document.createElement("div");
          empty.className = "empty-state";
          if (viewingShared) {
            empty.textContent = "None of these logos are available anymore.";
          } else if (favoritesOnly) {
            empty.innerHTML =
              'You do not have any favorites. Click the star on a logo to favorite it. <a href="#" id="empty-state-back">Click to go back</a>.';
          } else {
            empty.textContent = "No logos exist for the given time period.";
          }
          grid.appendChild(empty);
        } else {
          items.forEach((item) => {
            const card = document.createElement("div");
            card.className = "card";
            card.dataset.url = item.url;
            const isFavorited = favorites.has(item.url);
            card.innerHTML = `
              <button class="favorite-btn${isFavorited ? " favorited" : ""}" type="button" data-url="${item.url}" aria-label="Toggle favorite">${STAR_ICON}</button>
              <img src="${logoPath(item.url, "low-res")}" alt="${item.label}" loading="lazy">
              <div class="meta">${item.year} ${item.event_type}</div>
            `;
            grid.appendChild(card);
          });
        }

        const isOwnFavorites = showFavorites && !viewingShared;

        if (isOwnFavorites) {
          filterTitle.textContent = "Your Favorites";
          sortOrder.classList.add("hidden");
          const ids = favoriteIdsFromLocal();
          if (ids.length > 0) {
            shareFavoritesBtn.dataset.shareUrl = `${window.location.origin}${window.location.pathname}?favorites=${ids.join(",")}`;
            shareFavorites.classList.add("visible");
          } else {
            shareFavorites.classList.remove("visible");
          }
        } else {
          let eventLabel = "";
          if (!viewingShared && selectedEvent !== "all") {
            eventLabel = selectedEvent.startsWith(GROUP_PREFIX)
              ? selectedEvent.slice(GROUP_PREFIX.length)
              : selectedEvent;
          }

          let placeLabel = "";
          if (!viewingShared && selectedPlace !== "all") {
            placeLabel = selectedPlace.startsWith(PLACE_GROUP_PREFIX)
              ? selectedPlace.slice(PLACE_GROUP_PREFIX.length)
              : selectedPlace;
          }

          let title;
          if (!viewingShared && !eventLabel && !placeLabel && selectedDecade === "all" && selectedYear === "all") {
            title = "100+ years of major sporting event logos";
          } else {
            const logoWord = items.length === 1 ? "logo" : "logos";
            title = capitalize(`${eventLabel ? eventLabel + " " : ""}${logoWord}`);
            if (!viewingShared) {
              if (selectedDecade === "lump") {
                title += ` from before ${LUMP_BELOW}`;
              } else if (selectedDecade !== "all") {
                title += ` from the ${selectedDecade}s`;
              } else if (selectedYear !== "all") {
                title += ` from ${selectedYear}`;
              }
              if (placeLabel) {
                title += ` in ${placeLabel}`;
              }
            }
          }
          filterTitle.textContent = title;
          sortOrder.classList.remove("hidden");
          shareFavorites.classList.remove("visible");
        }
      }

      syncURL();
    }

    sortOrder.addEventListener("click", () => {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      render();
    });

    function rollDice(btn) {
      btn.classList.remove("rolling");
      void btn.offsetWidth;
      btn.classList.add("rolling");

      exitSpecialModes();
      randomItem = LOGO_DATA[Math.floor(Math.random() * LOGO_DATA.length)];
      searchOptions.classList.add("disabled");
      render();
    }

    randomizeBtn.addEventListener("click", () => rollDice(randomizeBtn));

    function setSearchOptionsOpen(open) {
      searchOptions.classList.toggle("open", open);
    }

    searchToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const opening = !searchOptions.classList.contains("open");
      if (opening) {
        exitSpecialModes();
        render();
      }
      setSearchOptionsOpen(opening);
    });

    document.addEventListener("click", (e) => {
      if (!searchOptions.classList.contains("open")) return;
      if (e.target.closest("#search-options") || e.target.closest("#search-toggle")) return;
      setSearchOptionsOpen(false);
    });

    favoritesToggle.addEventListener("click", () => {
      // A hand click always means "show MY favorites," not whatever list
      // (if any) was pinned by an incoming shared link.
      pinnedFavoriteIds = null;
      randomItem = null;
      viewedIndex = -1;
      setShowFavorites(!showFavorites);
      render();
    });

    function toggleFavorite(url, btn) {
      const nowFavorited = !favorites.has(url);
      if (nowFavorited) {
        favorites.add(url);
        spawnFavoriteSparks(favoritesToggle);
        if (btn) spawnFavoriteSparks(btn);
      } else {
        favorites.delete(url);
      }
      saveFavorites();
      updateFavoritesToggleState();
      return nowFavorited;
    }

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".favorite-btn");
      if (btn) {
        const url = btn.dataset.url;
        const nowFavorited = toggleFavorite(url, btn);
        if (showFavorites) {
          render();
        } else {
          btn.classList.toggle("favorited", nowFavorited);
        }
        return;
      }

      const card = e.target.closest(".card");
      if (card) {
        openItem(card.dataset.url);
        return;
      }

      if (e.target.closest("#empty-state-back")) {
        e.preventDefault();
      }

      if (showFavorites) {
        exitSpecialModes();
        render();
      }
    });

    function openItem(url) {
      const index = currentItems.findIndex((item) => item.url === url);
      if (index === -1) return;
      viewedIndex = index;
      renderItemDisplay();
    }

    function getGridColumnCount() {
      const cards = grid.querySelectorAll(".card");
      if (cards.length === 0) return 0;
      const firstTop = cards[0].offsetTop;
      let count = 0;
      for (const card of cards) {
        if (card.offsetTop !== firstTop) break;
        count += 1;
      }
      return count;
    }

    function setActiveGridIndex(index) {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      const cards = grid.querySelectorAll(".card");
      cards.forEach((c) => c.classList.remove("active"));
      activeGridIndex = index;
      const card = cards[index];
      if (card) {
        card.classList.add("active");
        card.scrollIntoView({ block: "nearest" });
      }
    }

    function closeItem() {
      const viewedItem = currentItems[viewedIndex];
      if (randomItem) {
        exitSpecialModes();
      } else {
        viewedIndex = -1;
      }
      render();
      if (viewedItem) {
        const index = currentItems.findIndex((i) => i.url === viewedItem.url);
        if (index !== -1) setActiveGridIndex(index);
      }
    }

    itemDisplay.addEventListener("click", closeItem);

    itemPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      if (viewedIndex > 0) {
        viewedIndex -= 1;
        renderItemDisplay();
      }
    });

    itemNext.addEventListener("click", (e) => {
      e.stopPropagation();
      if (viewedIndex < currentItems.length - 1) {
        viewedIndex += 1;
        renderItemDisplay();
      }
    });

    itemFavorite.addEventListener("click", (e) => {
      e.stopPropagation();
      const item = currentItems[viewedIndex];
      if (!item) return;
      const nowFavorited = toggleFavorite(item.url, itemFavorite);
      const card = grid.querySelector(`.card[data-url="${item.url}"] .favorite-btn`);
      if (card) card.classList.toggle("favorited", nowFavorited);

      if (showFavorites) {
        render();
        viewedIndex = currentItems.findIndex((i) => i.url === item.url);
        render();
      } else {
        itemFavorite.classList.toggle("favorited", nowFavorited);
      }
    });

    filterTitle.addEventListener("click", () => itemFavorite.click());

    document.addEventListener("keydown", (e) => {
      const isHorizontal = e.key === "ArrowLeft" || e.key === "ArrowRight";
      const isVertical = e.key === "ArrowUp" || e.key === "ArrowDown";
      if (!isHorizontal && !isVertical) return;

      if (viewedIndex !== -1) {
        if (!isHorizontal || randomItem) return;
        e.preventDefault();
        if (e.key === "ArrowLeft" && viewedIndex > 0) {
          viewedIndex -= 1;
          renderItemDisplay();
        } else if (e.key === "ArrowRight" && viewedIndex < currentItems.length - 1) {
          viewedIndex += 1;
          renderItemDisplay();
        }
        return;
      }

      if (currentItems.length === 0) return;
      e.preventDefault();
      if (activeGridIndex === -1) {
        setActiveGridIndex(0);
        return;
      }

      if (isHorizontal) {
        if (e.key === "ArrowRight" && activeGridIndex < currentItems.length - 1) {
          setActiveGridIndex(activeGridIndex + 1);
        } else if (e.key === "ArrowLeft" && activeGridIndex > 0) {
          setActiveGridIndex(activeGridIndex - 1);
        }
        return;
      }

      const columns = getGridColumnCount();
      if (columns <= 0) return;
      const target = e.key === "ArrowDown" ? activeGridIndex + columns : activeGridIndex - columns;
      if (target >= 0 && target < currentItems.length) {
        setActiveGridIndex(target);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && viewedIndex === -1 && activeGridIndex !== -1) {
        e.preventDefault();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        const item = currentItems[activeGridIndex];
        if (item) openItem(item.url);
        return;
      }
      if (e.key === "Enter" && viewedIndex !== -1) {
        e.preventDefault();
        closeItem();
        return;
      }
      if (e.key === "Escape") {
        if (viewedIndex !== -1) {
          closeItem();
        } else if (searchOptions.classList.contains("open")) {
          setSearchOptionsOpen(false);
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "f") {
        favoritesToggle.click();
      } else if (key === "s") {
        searchToggle.click();
      } else if (key === "d") {
        randomizeBtn.click();
      }
    });

    shareFavoritesBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(shareFavoritesBtn.dataset.shareUrl);

      shareFavoritesBtn.classList.remove("bounce");
      void shareFavoritesBtn.offsetWidth;
      shareFavoritesBtn.classList.add("bounce");

      shareFeedback.classList.add("visible");
      clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => {
        shareFeedback.classList.remove("visible");
      }, 1200);
    });

    searchOptions.addEventListener("click", () => {
      if (!searchOptions.classList.contains("disabled")) return;
      exitSpecialModes();
      render();
    });

    logo.addEventListener("click", (e) => {
      if (e.target.closest(".icon-shortcut")) return;
      exitSpecialModes();
      selectedEvent = "all";
      selectedPlace = "all";
      selectedYear = "all";
      selectedDecade = "all";
      updateActiveButtons();
      render();
    });

    populateFilters(LOGO_DATA);
    applyFiltersFromURL();
    updateFavoritesToggleState();
    render();
  }
})();
