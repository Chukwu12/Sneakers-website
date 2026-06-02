// ========== Portfolio Watchlist ==========
const LOCAL_API_URL = 'https://sneakers-website-production.up.railway.app/api/sneakers';
const CURRENT_PATH = (typeof window !== 'undefined' && window.location && window.location.pathname
  ? window.location.pathname
  : '')
  .toLowerCase();

function isPage(pageName) {
  return (
    CURRENT_PATH.endsWith(`/${pageName}.html`) ||
    CURRENT_PATH === `/${pageName}` ||
    CURRENT_PATH === `/${pageName}/`
  );
}

function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location && /^https?:$/.test(window.location.protocol)) {
    const host = window.location.hostname || '';

    if (host.includes('app.github.dev')) {
      return window.location.origin.replace('-5500.app.github.dev', '-3001.app.github.dev');
    }

    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:3001';
    }

    if (host.includes('netlify.app')) {
      return new URL(LOCAL_API_URL).origin;
    }

    return window.location.origin;
  }

  return new URL(LOCAL_API_URL).origin;
}

const WATCHLIST_API_URL = `${getApiBaseUrl()}/api/watchlist`;

let portfolioSortMode = 'recent';

function getSneakerId(sneaker) {
  const rawId =
    sneaker.id ||
    sneaker.uuid ||
    sneaker.productId ||
    sneaker.product_id ||
    sneaker.sku ||
    sneaker.slug ||
    sneaker.styleId ||
    sneaker.style_id ||
    sneaker.urlKey ||
    sneaker.name ||
    sneaker.title ||
    '';

  return String(rawId).trim().toLowerCase();
}

function getSneakerImage(sneaker) {
  return sneaker.image || (sneaker.media && sneaker.media.imageUrl) || 'img/placeholder.jpg';
}

function getSneakerName(sneaker) {
  return sneaker.title || sneaker.name || 'Sneaker';
}

function getSneakerPriceValue(sneaker) {
  const priceCandidates = [sneaker.retailPrice, sneaker.min_price, sneaker.max_price]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  return priceCandidates.length > 0 ? priceCandidates[0] : null;
}

function formatPrice(price) {
  if (!Number.isFinite(price)) return 'N/A';
  return `$${price.toFixed(2)}`;
}

function normalizeWatchlistPayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

async function fetchWatchlistItems() {
  try {
    const response = await fetch(WATCHLIST_API_URL);
    if (!response.ok) throw new Error('Watchlist API error');
    const data = await response.json();
    return normalizeWatchlistPayload(data);
  } catch (error) {
    console.error('Failed to fetch portfolio watchlist:', error);
    return [];
  }
}

function getPortfolioItemFromSneaker(sneaker) {
  const livePrice = getSneakerPriceValue(sneaker);
  return {
    id: getSneakerId(sneaker),
    name: getSneakerName(sneaker),
    image: getSneakerImage(sneaker),
    brand: sneaker.brand || '',
    livePrice,
    targetPrice: livePrice,
    addedAt: new Date().toISOString(),
  };
}

async function addPortfolioItem(sneaker) {
  const sneakerId = getSneakerId(sneaker);
  if (!sneakerId) return false;

  try {
    const response = await fetch(WATCHLIST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getPortfolioItemFromSneaker(sneaker)),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to save portfolio item:', error);
    return false;
  }
}

async function removePortfolioItem(sneakerId) {
  try {
    const response = await fetch(`${WATCHLIST_API_URL}/${encodeURIComponent(sneakerId)}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to remove portfolio item:', error);
    return false;
  }
}

async function updatePortfolioTargetPrice(sneakerId, targetPrice) {
  try {
    const response = await fetch(`${WATCHLIST_API_URL}/${encodeURIComponent(sneakerId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPrice }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to update target price:', error);
    return false;
  }
}

async function togglePortfolioItem(sneaker, savedIds) {
  const sneakerId = getSneakerId(sneaker);
  if (!sneakerId) return false;

  if (savedIds.has(sneakerId)) {
    const removed = await removePortfolioItem(sneakerId);
    if (removed) savedIds.delete(sneakerId);
    return false;
  }

  const saved = await addPortfolioItem(sneaker);
  if (saved) savedIds.add(sneakerId);
  return true;
}

function applyPortfolioSort(items, sortMode) {
  const list = items.slice();
  if (sortMode === 'below-target') {
    return list.sort((a, b) => {
      const aLive = Number(a.livePrice);
      const bLive = Number(b.livePrice);
      const aTarget = Number(a.targetPrice);
      const bTarget = Number(b.targetPrice);
      const aScore = Number.isFinite(aLive) && Number.isFinite(aTarget) ? aLive - aTarget : Number.POSITIVE_INFINITY;
      const bScore = Number.isFinite(bLive) && Number.isFinite(bTarget) ? bLive - bTarget : Number.POSITIVE_INFINITY;
      return aScore - bScore;
    });
  }

  if (sortMode === 'highest-upside') {
    return list.sort((a, b) => {
      const aLive = Number(a.livePrice);
      const bLive = Number(b.livePrice);
      const aTarget = Number(a.targetPrice);
      const bTarget = Number(b.targetPrice);
      const aUpside = Number.isFinite(aLive) && Number.isFinite(aTarget) ? aTarget - aLive : Number.NEGATIVE_INFINITY;
      const bUpside = Number.isFinite(bLive) && Number.isFinite(bTarget) ? bTarget - bLive : Number.NEGATIVE_INFINITY;
      return bUpside - aUpside;
    });
  }

  return list.sort((a, b) => {
    const aTime = new Date(a.addedAt || 0).getTime();
    const bTime = new Date(b.addedAt || 0).getTime();
    return bTime - aTime;
  });
}

function mergeWatchlistWithLiveData(watchlist, liveSneakers) {
  const liveById = new Map();
  liveSneakers.forEach((sneaker) => {
    liveById.set(getSneakerId(sneaker), sneaker);
  });

  return watchlist.map((item) => {
    const live = liveById.get(item.id);
    if (!live) return item;

    const livePrice = getSneakerPriceValue(live);
    return {
      ...item,
      name: getSneakerName(live),
      image: getSneakerImage(live),
      brand: live.brand || item.brand || '',
      livePrice: livePrice ?? item.livePrice ?? null,
    };
  });
}

function renderDropCard(item) {
  const livePrice = Number(item.livePrice);
  const targetPrice = Number(item.targetPrice);
  const hasLive = Number.isFinite(livePrice);
  const hasTarget = Number.isFinite(targetPrice);

  let statusText = 'No target set';
  let statusClass = 'is-neutral';

  if (hasLive && hasTarget) {
    if (livePrice <= targetPrice) {
      statusText = 'At or below target';
      statusClass = 'is-positive';
    } else {
      statusText = `${formatPrice(livePrice - targetPrice)} above target`;
      statusClass = 'is-negative';
    }
  }

  return `
    <article class="shoe-card" data-portfolio-id="${item.id}">
      <img src="${item.image || 'img/placeholder.jpg'}" alt="${item.name || 'Sneaker'}" loading="lazy" />
      <div class="shoe-meta">
        <h2>${item.name || 'Sneaker'}</h2>
        <p class="shoe-price">${formatPrice(livePrice)}</p>
        <p class="shoe-target">Target: ${hasTarget ? formatPrice(targetPrice) : 'Not set'}</p>
        <div class="shoe-target-editor">
          <input
            class="shoe-target-input"
            type="number"
            min="0"
            step="0.01"
            value="${hasTarget ? targetPrice.toFixed(2) : ''}"
            placeholder="Set target"
            data-target-input="${item.id}"
          />
          <button class="shoe-target-btn" type="button" data-save-target="${item.id}">Save Target</button>
        </div>
        <p class="shoe-status ${statusClass}">${statusText}</p>
        <button class="shoe-remove-btn" type="button" data-remove-portfolio="${item.id}">Remove</button>
      </div>
    </article>
  `;
}

function setupPortfolioSortControls() {
  const controls = document.getElementById('portfolio-sort-controls');
  if (!controls) return;

  const chips = controls.querySelectorAll('[data-sort]');
  chips.forEach((chip) => {
    chip.classList.toggle('is-active', chip.getAttribute('data-sort') === portfolioSortMode);
    chip.addEventListener('click', () => {
      portfolioSortMode = chip.getAttribute('data-sort') || 'recent';
      chips.forEach((item) => {
        item.classList.toggle('is-active', item === chip);
        item.setAttribute('aria-pressed', item === chip ? 'true' : 'false');
      });
      loadUpcomingSneakers();
    });
  });
}

async function loadUpcomingSneakers() {
  const grid = document.getElementById('drop-grid');
  if (!grid) return;

  const watchlist = await fetchWatchlistItems();
  if (watchlist.length === 0) {
    grid.innerHTML = '<p>No saved sneakers yet. Add pairs from the Collection page to build your portfolio.</p>';
    return;
  }

  grid.innerHTML = '<p>Loading your portfolio...</p>';

  const liveSneakers = await fetchSneakers();
  const merged = mergeWatchlistWithLiveData(watchlist, liveSneakers);
  const sortedItems = applyPortfolioSort(merged, portfolioSortMode);

  grid.innerHTML = sortedItems.map(renderDropCard).join('');

  const removeButtons = grid.querySelectorAll('[data-remove-portfolio]');
  removeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const itemId = button.getAttribute('data-remove-portfolio');
      if (!itemId) return;
      button.disabled = true;
      await removePortfolioItem(itemId);
      await loadUpcomingSneakers();
    });
  });

  const targetButtons = grid.querySelectorAll('[data-save-target]');
  targetButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const itemId = button.getAttribute('data-save-target');
      if (!itemId) return;

      const card = button.closest('.shoe-card');
      const input = card ? card.querySelector('[data-target-input]') : null;
      if (!input) return;

      const targetPrice = Number(input.value);
      if (!Number.isFinite(targetPrice) || targetPrice < 0) {
        input.focus();
        return;
      }

      button.disabled = true;
      await updatePortfolioTargetPrice(itemId, targetPrice);
      await loadUpcomingSneakers();
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  if (isPage('profolio')) {
    setupPortfolioSortControls();
    loadUpcomingSneakers();
  }
});
// ========== Home Page ==========
async function fetchFeaturedSneakers() {
  // Use the same API as your collection, or filter for new/featured ones
  const response = await fetch('https://sneakers-website-production.up.railway.app/api/sneakers');
  const data = await response.json();
  // Sort sneakers by created_at (newest first)
  if (Array.isArray(data.data)) {
    const sorted = data.data.slice().sort((a, b) => {
      const dateA = new Date(a.created_at || a.updated_at || 0);
      const dateB = new Date(b.created_at || b.updated_at || 0);
      return dateB - dateA;
    });
    return sorted.slice(0, 3);
  }
  return [];
}

function renderFeaturedCard(sneaker) {
  const image = sneaker.image || (sneaker.media && sneaker.media.imageUrl) || 'img/placeholder.jpg';
  const name = sneaker.title || sneaker.name || 'Sneaker';
  const description = getShortDescription(sneaker.description, 120);
  return `
    <article class="feature-card">
      <img src="${image}" alt="${name}">
      <div>
        <h3>${name}</h3>
        <p>${description}</p>
      </div>
    </article>
  `;
}

async function loadFeaturedSneakers() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  grid.innerHTML = '<p>Loading featured sneakers...</p>';
  const sneakers = await fetchFeaturedSneakers();
  if (sneakers.length === 0) {
    grid.innerHTML = '<p>No featured sneakers found.</p>';
    return;
  }
  grid.innerHTML = sneakers.map(renderFeaturedCard).join('');
}

if (
  isPage('index') ||
  CURRENT_PATH === '/' ||
  CURRENT_PATH === ''
) {
  loadFeaturedSneakers();
}
// Getting all elements from the DOM
const imgContainer = document.querySelector('.showcase > div');
const img = document.querySelector('.showcase img');
const shadow = document.querySelector('.shadow');

const pageBody = document.body;

if (pageBody) {
  window.requestAnimationFrame(() => {
    pageBody.classList.add('is-loaded');
  });
}

// ========== KicksDB API Integration (v3 StockX) ========== //


// ========== Collection Page ==========
async function fetchSneakers() {
  try {
    const response = await fetch(LOCAL_API_URL);
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    // Support both { data: [...] } and raw array payloads.
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  } catch (err) {
    console.error('Failed to fetch sneakers:', err);
    return [];
  }
}

function normalizeFilterValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function formatFilterLabel(filter) {
  return filter
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function collectFilterParts(source, target) {
  if (!source) return;
  if (Array.isArray(source)) {
    source.forEach((item) => collectFilterParts(item, target));
    return;
  }

  const text = String(source);
  text
    .split(/[|,/]/)
    .map(normalizeFilterValue)
    .filter(Boolean)
    .forEach((part) => target.add(part));
}

function getSneakerFilters(sneaker) {
  const filters = new Set();
  collectFilterParts(sneaker.category, filters);
  collectFilterParts(sneaker.categories, filters);
  collectFilterParts(sneaker.type, filters);
  collectFilterParts(sneaker.product_type, filters);
  collectFilterParts(sneaker.gender, filters);

  const searchBlob = [
    sneaker.title,
    sneaker.name,
    sneaker.description,
    sneaker.category,
    Array.isArray(sneaker.categories) ? sneaker.categories.join(' ') : sneaker.categories,
    sneaker.type,
    sneaker.product_type,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (searchBlob.includes('sneaker')) filters.add('sneakers');
  if (searchBlob.includes('shoe')) filters.add('shoes');
  if (filters.size === 0) filters.add('sneakers');

  return Array.from(filters);
}

function renderSneakerCard(sneaker, isSaved) {
  // Prefer sneaker.image, then sneaker.media.imageUrl, then placeholder
  const image =
    sneaker.image ||
    (sneaker.media && sneaker.media.imageUrl) ||
    'img/placeholder.jpg';
  const sneakerId = getSneakerId(sneaker);
  const name = sneaker.title || sneaker.name || 'Sneaker';
  const brand = sneaker.brand || '';
  const category = sneaker.category || '';
  const filters = getSneakerFilters(sneaker);
  const minPrice = sneaker.min_price ? `$${sneaker.min_price}` : '';
  const maxPrice = sneaker.max_price ? `$${sneaker.max_price}` : '';
  let priceDisplay = sneaker.retailPrice ? `$${sneaker.retailPrice}` : 'N/A';
  if (minPrice && maxPrice) {
    priceDisplay = `${minPrice} - ${maxPrice}`;
  } else if (minPrice) {
    priceDisplay = minPrice;
  } else if (maxPrice) {
    priceDisplay = maxPrice;
  }
  const description = getShortDescription(sneaker.description, 140);
  // No rating in StockX, so use 4 stars as default
  return `
    <article class="product-card" data-filters="${filters.join('|')}">
      <div class="product-card__img"><img src="${image}" alt="${name}"></div>
      <div class="product-card__body">
        <div class="product-card__row">
          <h3>${name}</h3>
          <span class="product-card__tag">${brand || category || 'Sneaker'}</span>
        </div>
        <p>${description}</p>
        <div class="product-card__row">
          <span class="product-card__price">${priceDisplay}</span>
          <span class="product-card__rating">★★★★☆</span>
        </div>
        <div class="product-card__actions">
          <button
            class="portfolio-save-btn ${isSaved ? 'is-saved' : ''}"
            type="button"
            data-save-sneaker="${sneakerId}"
            aria-pressed="${isSaved ? 'true' : 'false'}"
          >
            ${isSaved ? 'Saved to Portfolio' : 'Save to Portfolio'}
          </button>
        </div>
      </div>
    </article>
  `;
}

function updateSaveButtonState(button, isSaved) {
  button.classList.toggle('is-saved', isSaved);
  button.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
  button.textContent = isSaved ? 'Saved to Portfolio' : 'Save to Portfolio';
}

async function loadSneakerCollection() {
  const grid = document.querySelector('.collection-grid');
  const count = document.getElementById('collection-count');
  const empty = document.getElementById('collection-empty');
  const filtersContainer = document.getElementById('collection-filters');
  if (!grid) return;
  grid.innerHTML = '<p>Loading sneakers...</p>';
  const sneakers = await fetchSneakers();

  // 1. Extract unique categories
  const categorySet = new Set();
  sneakers.forEach((sneaker) => {
    getSneakerFilters(sneaker).forEach((filter) => categorySet.add(filter));
  });

  const sortedFilters = Array.from(categorySet).sort((a, b) => {
    const priority = ['sneakers', 'shoes'];
    const aPriority = priority.indexOf(a);
    const bPriority = priority.indexOf(b);
    if (aPriority !== -1 || bPriority !== -1) {
      if (aPriority === -1) return 1;
      if (bPriority === -1) return -1;
      return aPriority - bPriority;
    }
    return a.localeCompare(b);
  });

  // 2. Render filter buttons dynamically
  if (filtersContainer) {
    let filtersHtml = `<button class="filter-chip is-active" type="button" data-filter="all" aria-pressed="true">All</button>`;
    sortedFilters.forEach((filter) => {
      filtersHtml += `<button class="filter-chip" type="button" data-filter="${filter}" aria-pressed="false">${formatFilterLabel(filter)}</button>`;
    });
    filtersContainer.innerHTML = filtersHtml;
  }

  if (sneakers.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.hidden = false;
    if (count) count.innerText = '0 Sneakers';
    return;
  }
  const savedWatchlist = await fetchWatchlistItems();
  const savedIds = new Set(
    savedWatchlist
      .map((item) => String(item.id || '').trim().toLowerCase())
      .filter(Boolean)
  );

  grid.innerHTML = sneakers
    .map((sneaker) => renderSneakerCard(sneaker, savedIds.has(getSneakerId(sneaker))))
    .join('');
  if (count) count.innerText = sneakers.length + (sneakers.length === 1 ? ' Sneaker' : ' Sneakers');
  if (empty) empty.hidden = true;

  const sneakerMap = new Map();
  sneakers.forEach((sneaker) => {
    sneakerMap.set(getSneakerId(sneaker), sneaker);
  });

  const saveButtons = grid.querySelectorAll('[data-save-sneaker]');
  saveButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const sneakerId = button.getAttribute('data-save-sneaker') || '';
      const sneaker = sneakerMap.get(sneakerId);
      if (!sneaker) return;

      button.disabled = true;
      const isSaved = await togglePortfolioItem(sneaker, savedIds);
      saveButtons.forEach((targetButton) => {
        if ((targetButton.getAttribute('data-save-sneaker') || '') === sneakerId) {
          updateSaveButtonState(targetButton, isSaved);
        }
      });
      button.disabled = false;
    });
  });

  // 3. Add filter logic for dynamic buttons
  const filterChips = document.querySelectorAll('.filter-chip');
  const collectionCards = document.querySelectorAll('.collection-grid .product-card');
  if (filterChips.length > 0 && collectionCards.length > 0) {
    const applyFilter = (filterValue) => {
      let visibleCount = 0;
      collectionCards.forEach((card) => {
        const cardFilters = (card.getAttribute('data-filters') || '')
          .split('|')
          .map(normalizeFilterValue)
          .filter(Boolean);
        const isVisible = filterValue === 'all' || cardFilters.includes(filterValue);
        card.classList.toggle('is-hidden', !isVisible);
        if (isVisible) visibleCount++;
      });
      if (count) {
        const label = visibleCount === 1 ? 'Sneaker' : 'Sneakers';
        count.innerText = visibleCount + ' ' + label;
      }
      if (empty) empty.hidden = visibleCount !== 0;
    };

    filterChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const filterValue = chip.getAttribute('data-filter') || 'all';
        filterChips.forEach((item) => {
          item.classList.remove('is-active');
          item.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('is-active');
        chip.setAttribute('aria-pressed', 'true');
        applyFilter(filterValue);
      });
    });

    applyFilter('all');
  }
}

if (isPage('collection')) {
  loadSneakerCollection();
}

// ========== Gallery Page ==========
function animate(element, time, anim) {
  if (!element) {
    return;
  }

  element.style.animation = anim;

  setTimeout(() => {
    element.style.animation = 'none';
  }, time);
}

function normalizeGalleryValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getGalleryImages(sneaker) {
  const images = [];

  const addImage = (value) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach(addImage);
      return;
    }

    if (typeof value === 'string') {
      images.push(value);
      return;
    }

    if (typeof value === 'object') {
      addImage(value.image);
      addImage(value.imageUrl);
      addImage(value.url);
      addImage(value.src);
      addImage(value.thumbnail);
      addImage(value.medium);
      addImage(value.large);
    }
  };

  addImage(sneaker.image);
  addImage(sneaker.images);
  addImage(sneaker.gallery);
  addImage(sneaker.media);
  addImage(sneaker.assets);
  addImage(sneaker.photos);
  addImage(sneaker.picture);
  addImage(sneaker.thumbnail);

  const uniqueImages = Array.from(new Set(images.filter(Boolean)));
  return uniqueImages.length > 0 ? uniqueImages.slice(0, 4) : ['img/placeholder.jpg'];
}

function getGallerySubtitle(sneaker) {
  const parts = [sneaker.brand, sneaker.category || sneaker.type || sneaker.product_type, sneaker.colorway]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.slice(0, 3).join(' · ') : 'Featured drop';
}

function getShortDescription(rawDescription, maxLength = 220) {
  const cleaned = String(rawDescription || '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'Fresh from the sneaker feed.';
  }

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const shortText = cleaned.slice(0, maxLength);
  const lastSpace = shortText.lastIndexOf(' ');
  return `${(lastSpace > 0 ? shortText.slice(0, lastSpace) : shortText).trim()}...`;
}

function getGalleryPriceLabel(sneaker) {
  const minPrice = Number(sneaker.min_price);
  const maxPrice = Number(sneaker.max_price);
  const retailPrice = getSneakerPriceValue(sneaker);

  if (Number.isFinite(minPrice) && Number.isFinite(maxPrice) && minPrice > 0 && maxPrice > 0 && minPrice !== maxPrice) {
    return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
  }

  if (Number.isFinite(retailPrice) && retailPrice > 0) {
    return formatPrice(retailPrice);
  }

  return 'Price on request';
}

function getGalleryMeta(sneaker) {
  const meta = [];
  const category = sneaker.category || sneaker.type || sneaker.product_type;

  if (sneaker.brand) meta.push(sneaker.brand);
  if (category) meta.push(category);
  if (sneaker.gender) meta.push(sneaker.gender);
  if (sneaker.colorway) meta.push(sneaker.colorway);

  return Array.from(new Set(meta.map((item) => String(item).trim()).filter(Boolean)));
}

function scoreGalleryMatch(candidate, active) {
  if (!candidate || !active) return 0;

  let score = 0;
  const candidateBrand = normalizeGalleryValue(candidate.brand);
  const activeBrand = normalizeGalleryValue(active.brand);
  const candidateCategory = normalizeGalleryValue(candidate.category || candidate.type || candidate.product_type);
  const activeCategory = normalizeGalleryValue(active.category || active.type || active.product_type);

  if (candidateBrand && candidateBrand === activeBrand) score += 4;
  if (candidateCategory && candidateCategory === activeCategory) score += 3;

  const candidateName = normalizeGalleryValue(getSneakerName(candidate));
  const activeName = normalizeGalleryValue(getSneakerName(active));
  if (candidateName && activeName && candidateName.split(' ')[0] === activeName.split(' ')[0]) score += 1;

  return score;
}

function renderGalleryCard(sneaker, index, activeId) {
  const image = getGalleryImages(sneaker)[0];
  const name = getSneakerName(sneaker);
  const price = getGalleryPriceLabel(sneaker);
  const subtitle = getGallerySubtitle(sneaker);
  const isActive = getSneakerId(sneaker) === activeId;

  return `
    <article class="gallery-rail-card ${isActive ? 'is-active' : ''}" data-gallery-card="${index}">
      <div class="gallery-rail-card__media">
        <img src="${image}" alt="${name}">
      </div>
      <div class="gallery-rail-card__body">
        <div>
          <h3>${name}</h3>
          <p>${subtitle}</p>
        </div>
        <div class="gallery-rail-card__meta">
          <span>${price}</span>
        </div>
        <button type="button" data-gallery-select="${index}">${isActive ? 'Showing now' : 'View this drop'}</button>
      </div>
    </article>
  `;
}

async function initGalleryLookbook() {
  const titleText = document.getElementById('gallery-title');
  const description = document.getElementById('gallery-description');
  const price = document.getElementById('gallery-price');
  const saveButton = document.getElementById('gallery-save-btn');
  const rail = document.getElementById('gallery-rail');
  const pagination = document.getElementById('gallery-pagination');
  const shoeNum = document.querySelector('.shoe-num');
  const shoeTotal = document.querySelector('.shoe-total');
  const titleOverlay = document.querySelector('.titleOverlay');
  const homeKicker = document.querySelector('.home-kicker');
  const homeTitle = document.querySelector('.home-title');
  const homeCopy = document.querySelector('.home-copy');
  const imgContainer = document.querySelector('.showcase > div');
  const img = document.querySelector('.showcase img');
  const shadow = document.querySelector('.shadow');
  const thumb = document.querySelectorAll('.thumbs img');
  const prev = document.querySelector('.arr-left');
  const next = document.querySelector('.arr-right');
  const watchVideo = document.querySelector('.watch-video');
  const lightbox = document.querySelector('[data-lightbox]');
  const lightboxImage = document.querySelector('[data-lightbox-image]');
  const lightboxCloseTriggers = document.querySelectorAll('[data-lightbox-close]');

  if (!titleText || !description || !price || !rail || !pagination || !shoeNum || !shoeTotal || !img || !imgContainer || !prev || !next || !homeKicker || !homeTitle || !homeCopy) {
    return;
  }

  const loadedSneakers = await fetchSneakers();
  const galleryItems = (Array.isArray(loadedSneakers) ? loadedSneakers : [])
    .filter((item) => getSneakerId(item))
    .map((item, index) => ({ ...item, _galleryIndex: index }));

  if (galleryItems.length === 0) {
    const emptyMessage = '<p>No gallery items are available right now.</p>';
    titleText.textContent = 'No sneakers found';
    description.textContent = 'Your API did not return any sneakers for the lookbook yet.';
    price.textContent = 'N/A';
    rail.innerHTML = emptyMessage;
    return;
  }

  const watchlist = await fetchWatchlistItems();
  const savedIds = new Set(
    watchlist
      .map((item) => String(item.id || '').trim().toLowerCase())
      .filter(Boolean)
  );

  let currentIndex = 0;
  let touchStartX = 0;
  let touchEndX = 0;
  let lastSwipeAt = 0;

  const isTypingTarget = (target) => {
    if (!target) {
      return false;
    }

    const tagName = target.tagName;
    return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
  };

  const updateSaveButton = (activeItem) => {
    if (!saveButton) return;

    const activeId = getSneakerId(activeItem);
    const isSaved = savedIds.has(activeId);
    saveButton.classList.toggle('is-saved', isSaved);
    saveButton.textContent = isSaved ? 'Saved to Portfolio' : 'Save To Portfolio';
  };

  const renderPagination = () => {
    pagination.innerHTML = galleryItems
      .map((_, index) => `<span class="pag ${index === currentIndex ? 'pag-active' : ''}" data-gallery-page="${index}"></span>`)
      .join('');

    const dots = pagination.querySelectorAll('[data-gallery-page]');
    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const index = Number(dot.getAttribute('data-gallery-page'));
        if (Number.isFinite(index)) {
          updateGallery(index);
        }
      });
    });
  };

  const renderThumbs = (images, activeImage) => {
    const paddedImages = images.slice(0, 4);
    while (paddedImages.length < 4) {
      paddedImages.push(images[0]);
    }

    thumb.forEach((node, index) => {
      const src = paddedImages[index] || paddedImages[0] || 'img/placeholder.jpg';
      node.src = src;
      node.alt = `${getSneakerName(galleryItems[currentIndex])} preview ${index + 1}`;
      node.classList.toggle('thumb-active', index === 0);
      node.onclick = () => {
        if (img && src) {
          img.src = src;
          img.alt = `${getSneakerName(galleryItems[currentIndex])} preview ${index + 1}`;
          animate(imgContainer, 450, 'fade 400ms ease-in-out');
        }
      };
    });
  };

  const renderRelatedRail = () => {
    const activeItem = galleryItems[currentIndex];
    const related = galleryItems
      .filter((item) => item._galleryIndex !== currentIndex)
      .sort((a, b) => scoreGalleryMatch(b, activeItem) - scoreGalleryMatch(a, activeItem))
      .slice(0, 4);

    if (related.length === 0) {
      rail.innerHTML = '<p>No related sneakers available yet.</p>';
      return;
    }

    rail.innerHTML = related.map((item) => renderGalleryCard(item, item._galleryIndex, getSneakerId(activeItem))).join('');

    const buttons = rail.querySelectorAll('[data-gallery-select]');
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.getAttribute('data-gallery-select'));
        if (Number.isFinite(index)) {
          updateGallery(index);
        }
      });
    });
  };

  const updateGallery = (nextIndex) => {
    currentIndex = (nextIndex + galleryItems.length) % galleryItems.length;
    const activeItem = galleryItems[currentIndex];
    const activeName = getSneakerName(activeItem);
    const activeDescription = getShortDescription(activeItem.description, 220);
    const images = getGalleryImages(activeItem);
    const activeImage = images[0] || 'img/placeholder.jpg';

    homeKicker.textContent = getGallerySubtitle(activeItem);
    homeTitle.textContent = activeName;
    homeCopy.textContent = activeDescription;

    titleText.textContent = activeName;
    description.textContent = activeDescription;
    price.textContent = getGalleryPriceLabel(activeItem);
    shoeNum.textContent = String(currentIndex + 1).padStart(2, '0');
    shoeTotal.textContent = String(galleryItems.length).padStart(2, '0');

    if (img) {
      img.src = activeImage;
      img.alt = activeName;
    }

    if (watchVideo) {
      watchVideo.href = 'collection.html';
    }

    if (titleOverlay) {
      animate(titleOverlay, 850, 'title 800ms ease');
    }

    if (shadow) {
      animate(shadow, 550, 'shadow 500ms ease-in-out');
    }

    if (img) {
      animate(img, 550, 'fade 500ms ease-in-out');
    }

    renderThumbs(images, activeImage);
    renderPagination();
    renderRelatedRail();
    updateSaveButton(activeItem);
  };

  const goPrev = () => updateGallery(currentIndex - 1);
  const goNext = () => updateGallery(currentIndex + 1);

  const handleSwipe = () => {
    const deltaX = touchEndX - touchStartX;
    const threshold = 45;

    if (Math.abs(deltaX) < threshold) {
      return;
    }

    lastSwipeAt = Date.now();

    if (deltaX > 0) {
      goPrev();
    } else {
      goNext();
    }
  };

  const openLightbox = () => {
    if (!lightbox || !lightboxImage || !img) {
      return;
    }

    if (Date.now() - lastSwipeAt < 350) {
      return;
    }

    lightboxImage.src = img.src;
    lightboxImage.alt = img.alt;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
  };

  const closeLightbox = () => {
    if (!lightbox) {
      return;
    }

    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
  };

  prev.addEventListener('click', goPrev);
  next.addEventListener('click', goNext);

  if (img) {
    img.addEventListener('click', openLightbox);
    img.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox();
      }
    });
  }

  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      const activeItem = galleryItems[currentIndex];
      if (!activeItem) return;

      const activeId = getSneakerId(activeItem);
      saveButton.disabled = true;

      const shouldSave = !savedIds.has(activeId);
      const result = shouldSave
        ? await addPortfolioItem(activeItem)
        : await removePortfolioItem(activeId);

      if (result) {
        if (shouldSave) {
          savedIds.add(activeId);
        } else {
          savedIds.delete(activeId);
        }
      }

      updateSaveButton(activeItem);
      saveButton.disabled = false;
    });
  }

  lightboxCloseTriggers.forEach((node) => {
    node.addEventListener('click', closeLightbox);
  });

  if (imgContainer) {
    imgContainer.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0].screenX;
    }, { passive: true });

    imgContainer.addEventListener('touchend', (event) => {
      touchEndX = event.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox && lightbox.classList.contains('is-open')) {
      closeLightbox();
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    const lightboxOpen = lightbox && lightbox.classList.contains('is-open');
    if (lightboxOpen) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrev();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    }
  });

  updateGallery(0);
}

if (isPage('gallery')) {
  initGalleryLookbook();
}

/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById('nav-menu');
const navToggle = document.getElementById('nav-toggle');
const navClose = document.getElementById('nav-close');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.add('show-menu');
  });
}

if (navClose && navMenu) {
  navClose.addEventListener('click', () => {
    navMenu.classList.remove('show-menu');
  });
}

/*=============== ACTIVE NAV LINK ===============*/
const navLinks = document.querySelectorAll('.nav__link');

if (navLinks.length > 0) {
  const currentPath = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';

  navLinks.forEach((link) => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    const normalizedHref = href === '' ? 'index.html' : href;
    const isActive = normalizedHref === currentPath;

    link.classList.toggle('active', isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

const navLink = document.querySelectorAll('.nav__link');

const linkAction = () => {
  if (navMenu) {
    navMenu.classList.remove('show-menu');
  }
};

navLink.forEach((n) => n.addEventListener('click', linkAction));

/*=============== SWIPER SHOE ===============*/
if (typeof Swiper !== 'undefined' && document.querySelector('.banner__swiper')) {
  new Swiper('.banner__swiper', {
    loop: true,
    spaceBetween: 32,
    grabCursor: true,
    effect: 'creative',
    creativeEffect: {
      prev: {
        translate: [-100, 0, -500],
        opacity: 0
      },
      next: {
        translate: [-100, 0, -500],
        opacity: 0
      }
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true
    }
  });
}

/*=============== SHADOW HEADER ===============*/
const header = document.getElementById('header');

if (header) {
  const shadowHeader = () => {
    if (window.scrollY >= 50) {
      header.classList.add('scroll-header');
    } else {
      header.classList.remove('scroll-header');
    }
  };

  window.addEventListener('scroll', shadowHeader);
}

const filterChips = document.querySelectorAll('[data-filter]');
const collectionCards = document.querySelectorAll('.collection-grid .product-card');
const collectionCount = document.getElementById('collection-count');
const collectionEmpty = document.getElementById('collection-empty');

if (filterChips.length > 0 && collectionCards.length > 0) {
  const applyFilter = (filterValue) => {
    let visibleCount = 0;

    collectionCards.forEach((card) => {
      const categories = (card.getAttribute('data-category') || '').split(' ');
      const isVisible = filterValue === 'all' || categories.includes(filterValue);

      card.classList.toggle('is-hidden', !isVisible);
      if (isVisible) {
        visibleCount++;
      }
    });

    if (collectionCount) {
      const label = visibleCount === 1 ? 'Sneaker' : 'Sneakers';
      collectionCount.innerText = visibleCount + ' ' + label;
    }

    if (collectionEmpty) {
      collectionEmpty.hidden = visibleCount !== 0;
    }
  };

  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const filterValue = chip.getAttribute('data-filter') || 'all';

      filterChips.forEach((item) => {
        item.classList.remove('is-active');
        item.setAttribute('aria-pressed', 'false');
      });

      chip.classList.add('is-active');
      chip.setAttribute('aria-pressed', 'true');
      applyFilter(filterValue);
    });
  });

  applyFilter('all');
}
