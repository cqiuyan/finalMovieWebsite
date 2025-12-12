
const API_BASE = "https://api.disneyapi.dev";
const NUM_MOVIES_TO_SHOW = 3;
const WATCHLIST_KEY = "disneyWatchlist";

let charactersCache = null;
let moviesCache = null;
let watchlist = [];
let toastTimeoutId = null;


function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;

  if (toastTimeoutId !== null) {
    clearTimeout(toastTimeoutId);
  }

  toast.classList.add("toast--visible");

  toastTimeoutId = setTimeout(() => {
    toast.classList.remove("toast--visible");
    toastTimeoutId = null;
  }, 3000);
}


async function fetchCharactersPage(page = 1) {
  const response = await fetch(`${API_BASE}/character?page=${page}`);
  if (!response.ok) throw new Error("API fetch failed");

  return (await response.json()).data;
}

function buildMoviesFromCharacters(chars) {
  const moviesMap = new Map();

  chars.forEach((char) => {
    (char.films || []).forEach((filmTitle) => {
      if (!moviesMap.has(filmTitle)) {
        moviesMap.set(filmTitle, {
          title: filmTitle,
          characters: [],
          tvShows: new Set(),
          shortFilms: new Set(),
          parkAttractions: new Set(),
        });
      }

      const movie = moviesMap.get(filmTitle);
      movie.characters.push(char);

      (char.tvShows || []).forEach((tv) => movie.tvShows.add(tv));
      (char.shortFilms || []).forEach((s) => movie.shortFilms.add(s));
      (char.parkAttractions || []).forEach((p) => movie.parkAttractions.add(p));
    });
  });

  return Array.from(moviesMap.values()).map((m) => ({
    ...m,
    tvShows: Array.from(m.tvShows),
    shortFilms: Array.from(m.shortFilms),
    parkAttractions: Array.from(m.parkAttractions),
  }));
}

function pickRandomItems(array, count) {
  const copy = [...array];
  const result = [];
  for (let i = 0; i < Math.min(count, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

function createMovieCard(movie) {
  const card = document.createElement("article");
  card.className = "movie-card";

  const title = document.createElement("h3");
  title.textContent = movie.title;
  card.appendChild(title);

  const chars = movie.characters.filter((c) => c.imageUrl);
  if (chars.length > 0) {
    const label = document.createElement("p");
    label.className = "movie-label";
    label.textContent = "Main characters:";
    card.appendChild(label);

    const castRow = document.createElement("div");
    castRow.className = "movie-cast-row";

    chars.slice(0, 4).forEach((char) => {
      const div = document.createElement("div");
      div.className = "movie-character";

      const img = document.createElement("img");
      img.src = char.imageUrl;

      const span = document.createElement("span");
      span.textContent = char.name;

      div.appendChild(img);
      div.appendChild(span);
      castRow.appendChild(div);
    });

    card.appendChild(castRow);
  }


  const meta = document.createElement("div");
  meta.className = "movie-meta";

  if (movie.tvShows.length > 0)
    meta.innerHTML += `<p><strong>TV shows:</strong> ${movie.tvShows.join(", ")}</p>`;

  if (movie.shortFilms.length > 0)
    meta.innerHTML += `<p><strong>Short films:</strong> ${movie.shortFilms.join(", ")}</p>`;

  if (movie.parkAttractions.length > 0)
    meta.innerHTML += `<p><strong>Park attractions:</strong> ${movie.parkAttractions.join(", ")}</p>`;

  card.appendChild(meta);


  const btn = document.createElement("button");
  btn.className = "secondary-btn";
  btn.textContent = "Add to watchlist";

  btn.addEventListener("click", () => {
    addToWatchlist(movie.title);
    showToast(`Added "${movie.title}" to your watchlist`);
  });

  card.appendChild(btn);

  return card;
}

function renderMovies(container, movies) {
  container.innerHTML = "";
  movies.forEach((m) => container.appendChild(createMovieCard(m)));
}


function loadWatchlist() {
  const saved = localStorage.getItem(WATCHLIST_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveWatchlist() {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
}

function addToWatchlist(title) {
  if (!watchlist.includes(title)) {
    watchlist.push(title);
    saveWatchlist();
    renderWatchlist();
  }
}

function removeFromWatchlist(title) {
  watchlist = watchlist.filter((t) => t !== title);
  saveWatchlist();
  renderWatchlist();
}

function renderWatchlist() {
  const list = document.getElementById("watchlistItems");
  list.innerHTML = "";

  if (watchlist.length === 0) {
    list.innerHTML = "<li>Your watchlist is empty.</li>";
    return;
  }

  watchlist.forEach((title) => {
    const li = document.createElement("li");

    const span = document.createElement("span");
    span.textContent = title;

    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.className = "secondary-btn";
    btn.addEventListener("click", () => {
      removeFromWatchlist(title);
      showToast(`Removed "${title}"`);
    });

    li.appendChild(span);
    li.appendChild(btn);
    list.appendChild(li);
  });
}


function setupScrollTopButton() {
  const btn = document.getElementById("scrollTopBtn");
  const footer = document.getElementById("siteFooter");

  window.addEventListener("scroll", () => {
    btn.classList.toggle("visible", window.scrollY > 200);

    const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 50;
    footer.classList.toggle("visible", atBottom);
  });


  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}




document.addEventListener("DOMContentLoaded", () => {
  watchlist = loadWatchlist();
  renderWatchlist();

  const generateBtn = document.getElementById("generateBtn");
  const moviesContainer = document.getElementById("moviesContainer");

  generateBtn.addEventListener("click", async () => {
    generateBtn.disabled = true;
    generateBtn.textContent = "Loading...";

    try {
      if (!charactersCache) charactersCache = await fetchCharactersPage(1);
      if (!moviesCache) moviesCache = buildMoviesFromCharacters(charactersCache);

      const movies = pickRandomItems(moviesCache, NUM_MOVIES_TO_SHOW);
      renderMovies(moviesContainer, movies);
    } catch {
      moviesContainer.innerHTML = "<p>Error loading movies.</p>";
    }

    generateBtn.disabled = false;
    generateBtn.textContent = "Generate Movies";
  });


  const clearBtn = document.getElementById("clearWatchlistBtn");
  clearBtn.addEventListener("click", () => {
    watchlist = [];
    saveWatchlist();
    renderWatchlist();
    showToast("Watchlist cleared");
  });

  setupScrollTopButton();
});

