<template>
  <div class="vault-page">
    <!-- HERO INPUT -->
    <div class="hero-input-section" :class="{ 'is-focused': isFocused }">
      <div class="smart-input-wrap" :class="{ 'is-url': inputMode === 'url', 'has-value': inputVal.length > 0 }">
        <input
          ref="smartInputEl"
          v-model="inputVal"
          type="text"
          class="smart-input"
          placeholder="Paste a link to save it, or search…"
          autocomplete="off"
          spellcheck="false"
          @input="onInputChange"
          @focus="isFocused = true"
          @blur="onBlur"
        />
        <i :class="['ph', inputIconClass, 'smart-input-icon']" aria-hidden="true" />
        <div class="smart-input-right">
          <span class="kbd-badge">⌘K</span>
          <button
            v-if="inputVal.length > 0"
            class="inline-save-btn"
            type="button"
            @click.prevent="doSave"
            :disabled="!isAuthenticated"
          >
            {{ inputMode === 'url' ? 'Save link' : inputMode === 'search' ? 'Search' : 'Save' }}
          </button>
        </div>
      </div>

      <!-- URL preview bar -->
      <div class="url-preview-bar" :class="{ 'is-visible': urlPreview && isFocused }">
        <div class="url-preview-favicon"><i class="ph ph-globe" style="color: var(--text-muted); font-size: 10px;" /></div>
        <span class="url-preview-domain">{{ urlPreview?.domain }}</span>
        <span class="url-preview-path">{{ urlPreview?.path }}</span>
        <span class="url-save-hint">Click "Save link" to save →</span>
      </div>

      <!-- Public read-only pill -->
      <div v-if="!isAuthenticated" class="public-pill">
        <i class="ph ph-eye" />
        Read-only —
        <NuxtLink to="/login" class="public-pill-link">Sign in to save</NuxtLink>
      </div>
    </div>

    <!-- VIEW MODE SWITCHER -->
    <div class="view-switcher-section">
      <div class="view-switcher" role="tablist" aria-label="View mode">
        <div
          class="view-switcher-pill"
          :style="{ transform: `translateX(${viewMode === 'categories' ? '100%' : '0%'})` }"
          aria-hidden="true"
        />
        <button
          class="view-switcher-btn"
          :class="{ active: viewMode === 'timeline' }"
          role="tab"
          :aria-selected="viewMode === 'timeline'"
          @click="setViewMode('timeline')"
        >
          <i class="ph ph-squares-four" />
          <span>Timeline</span>
        </button>
        <button
          class="view-switcher-btn"
          :class="{ active: viewMode === 'categories' }"
          role="tab"
          :aria-selected="viewMode === 'categories'"
          @click="setViewMode('categories')"
        >
          <i class="ph ph-stack" />
          <span>Categories</span>
        </button>
      </div>
    </div>

    <!-- RESULTS INFO (timeline only) -->
    <div v-if="viewMode === 'timeline'" class="results-info" :class="{ 'is-visible': searchQuery || activeTag || activeFilter !== 'all' }">
      <template v-if="searchQuery">
        Found <strong>{{ filteredCards.length }}</strong> results for "{{ searchQuery }}"
      </template>
      <template v-else-if="activeTag">
        Found <strong>{{ filteredCards.length }}</strong> results tagged with 
        <NuxtLink to="/" class="active-tag">#{{ activeTag }}</NuxtLink>
        <NuxtLink to="/" class="clear-filter">Clear</NuxtLink>
      </template>
      <template v-else-if="activeFilter !== 'all'">
        Showing <strong>{{ getFilterLabel(activeFilter) }}</strong>
        <button class="clear-filter" @click="clearFilter">Clear</button>
      </template>
    </div>

    <!-- CATEGORIES VIEW -->
    <Transition name="view-switch" mode="out-in">
      <section v-if="viewMode === 'categories'" key="categories" class="categories-view" aria-label="Categories">
        <div class="container">
          <div v-if="loading && cards.length === 0" class="buckets-skeleton">
            <div v-for="n in 4" :key="n" class="bucket-skeleton-card" />
          </div>
          <div v-else-if="sourceBuckets.length === 0" class="buckets-empty">
            <i class="ph ph-stack" />
            <p>Save some links to see them grouped here.</p>
          </div>
          <div v-else class="buckets-grid">
            <button
              v-for="(bucket, bi) in sourceBuckets"
              :key="bucket.type"
              class="bucket-card"
              :style="{ '--bucket-delay': `${bi * 55}ms` }"
              @click="enterBucket(bucket.type)"
            >
              <div class="bucket-deck">
                <div
                  v-for="preview in bucket.previews"
                  :key="preview.id"
                  class="deck-card"
                  :style="{ background: preview.ogImage ? 'transparent' : preview.gradient }"
                >
                  <img
                    v-if="preview.ogImage"
                    :src="preview.ogImage"
                    :alt="preview.title || ''"
                    class="deck-card-img"
                    loading="lazy"
                  />
                  <div v-else class="deck-card-placeholder">
                    <i :class="['ph', bucket.icon]" />
                  </div>
                </div>
                <div v-if="bucket.previews.length === 0" class="deck-card deck-card--empty">
                  <i :class="['ph', bucket.icon]" />
                </div>
              </div>
              <div class="bucket-meta">
                <div class="bucket-label-row">
                  <span class="bucket-icon-wrap">
                    <i :class="['ph ph-fill', bucket.icon]" />
                  </span>
                  <span class="bucket-label">{{ bucket.label }}</span>
                </div>
                <div class="bucket-bottom-row">
                  <span class="bucket-count">{{ bucket.count }} {{ bucket.count === 1 ? 'item' : 'items' }}</span>
                  <span class="bucket-cta">
                    Browse <i class="ph ph-arrow-right bucket-cta-arrow" />
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>
    </Transition>

    <!-- EMPTY STATE (timeline) -->
    <section v-if="viewMode === 'timeline' && !loading && filteredCards.length === 0" class="empty-state">
      <div class="empty-illustration">
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="60" r="50" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.6"/>
          <circle cx="60" cy="60" r="30" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
          <circle cx="60" cy="60" r="4" fill="currentColor" opacity="0.8"/>
          <path d="M60 30 V20 M60 90 V100 M30 60 H20 M90 60 H100" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
        </svg>
      </div>
      <h1>Your vault is empty.</h1>
      <p>Paste any link above or type a quick note — it saves instantly.</p>
    </section>

    <!-- MASONRY GRID (timeline only) -->
    <Transition name="view-switch" mode="out-in">
    <div v-if="viewMode === 'timeline'" key="timeline" class="container">
      <div v-if="loading && cards.length === 0" class="masonry-grid" :class="`cols-${columnCount}`">
        <div v-for="n in columnCount" :key="n" class="masonry-column">
          <div v-for="i in Math.ceil(8 / columnCount)" :key="i" class="card card-skeleton" />
        </div>
      </div>
      <div v-else class="masonry-grid" :class="`cols-${columnCountRef}`">
        <div v-for="colIndex in columnCountRef" :key="colIndex" class="masonry-column">
          <template v-if="colIndex === 1">
            <article
              v-for="note in optimisticNotes"
              :key="'opt-' + note.id"
              class="card card--note"
              data-type="note"
            >
              <div class="card-body note-body">
                <i class="ph ph-text-aa note-icon" />
                <h3 class="card-title">{{ note.text }}</h3>
                <div class="card-meta"><span>Quick thought</span><span class="dot" /><time class="numeric">just now</time></div>
              </div>
            </article>
          </template>
          
          <article
            v-for="(card, localIdx) in getColumnCards(colIndex -1)"
            :key="card.id"
            :class="cardClasses(card)"
            :data-type="cardType(card)"
            :style="{ animationDelay: `${Math.min(localIdx * 30, 240)}ms` }"
            @click.stop="openCard(card)"
          >
            <template v-if="cardType(card) !== 'note'">
              <div class="card-image" v-if="cardType(card) !== 'book'">
                <img v-if="card.ogImage || getTweetMediaImage(card)" :src="card.ogImage || getTweetMediaImage(card)!" :alt="card.title || ''" loading="lazy" />
                <div v-else class="card-gradient" :style="{ background: cardGradient(card) }" />
                <template v-if="cardType(card) === 'video'">
                  <div class="play-btn"><i class="ph-fill ph-play" /></div>
                  <span v-if="card.duration" class="duration-badge numeric">{{ card.duration }}</span>
                </template>
                <div v-if="cardType(card) === 'tweet'" class="tweet-badge">
                  <i class="ph-fill ph-x-logo" />
                </div>
                <div v-if="cardType(card) === 'github'" class="gh-badge">
                  <i class="ph-fill ph-github-logo" />
                </div>
                <div class="card-actions">
                  <button v-if="isAuthenticated" class="card-action" @click.stop="reprocessCard(card)" aria-label="Reprocess with AI">
                    <i class="ph ph-arrows-clockwise" :class="{ spin: reprocessing }" />
                  </button>
                  <button v-if="isAuthenticated" class="card-action" :aria-label="card.isPinned ? 'Unpin' : 'Pin'" @click.stop="togglePin(card)">
                    <i :class="['ph', card.isPinned ? 'ph-fill ph-push-pin' : 'ph-push-pin']" />
                  </button>
                  <button v-if="isAuthenticated" class="card-action" aria-label="Delete" @click.stop="remove(card.id)">
                    <i class="ph ph-trash" />
                  </button>
                </div>
              </div>
              <div v-if="cardType(card) === 'book'" class="book-cover" :style="{ background: cardGradient(card) }">
                <div class="book-3d">
                  <img v-if="card.ogImage" :src="card.ogImage" :alt="card.title || ''" loading="lazy" />
                  <div v-else class="book-placeholder"><i class="ph ph-book-open" /></div>
                  <div class="book-spine" />
                </div>
              </div>
            </template>

            <div class="card-body" :class="{ 'note-body': cardType(card) === 'note' }">
              <template v-if="isProcessing(card)">
                <div class="processing-pill"><span class="processing-dot" />Processing</div>
              </template>

              <div v-if="card.isPinned" class="pin-badge" title="Pinned">
                <i class="ph-fill ph-push-pin" />
              </div>

              <div v-if="cardType(card) === 'note' && isAuthenticated" class="note-card-actions">
                <button class="card-action" @click.stop="reprocessCard(card)" aria-label="Reprocess with AI">
                  <i class="ph ph-arrows-clockwise" :class="{ spin: reprocessing }" />
                </button>
                <button class="card-action" :aria-label="card.isPinned ? 'Unpin' : 'Pin'" @click.stop="togglePin(card)">
                  <i :class="['ph', card.isPinned ? 'ph-fill ph-push-pin' : 'ph-push-pin']" />
                </button>
                <button class="card-action" aria-label="Delete" @click.stop="remove(card.id)">
                  <i class="ph ph-trash" />
                </button>
              </div>
              <i v-if="cardType(card) === 'note'" class="ph ph-text-aa note-icon" />

              <template v-if="cardType(card) === 'product'">
                <span class="product-category">{{ productCategory(card) }}</span>
                <div v-if="card.price" class="product-price numeric">{{ card.price }}</div>
              </template>

              <h3 class="card-title">{{ cardType(card) === 'note' ? (cardDescription(card) || cardTitle(card)) : cardTitle(card) }}</h3>

              <p v-if="cardDescription(card) && cardType(card) !== 'note'" class="card-excerpt">{{ cardDescription(card) }}</p>
              <p v-if="isProcessing(card)" class="processing-status">{{ processingStatusText(card) }}</p>

              <div class="card-meta-row">
                <div class="card-meta">
                  <span>{{ cardDomain(card) }}</span>
                  <span v-if="card.savedAt" class="dot" />
                  <time v-if="card.savedAt" class="numeric">{{ relativeTime(card.savedAt) }}</time>
                </div>
                <a
                  v-if="card.url && cardType(card) !== 'note'"
                  :href="card.url"
                  target="_blank"
                  rel="noreferrer noopener"
                  class="card-open-link"
                  aria-label="Open original link"
                  @click.stop
                >
                  <i class="ph ph-arrow-square-out" />
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div ref="sentinel" class="sentinel" />
      <p v-if="!hasMore && cards.length > 0 && !loading" class="end-of-list">You've seen everything ✓</p>
      <p v-if="loadingMore" class="loading-more"><i class="ph ph-spinner-gap spin" /> Loading more…</p>
    </div>
    </Transition>

    <!-- FAB -->
    <div class="fab-wrap" v-if="isAuthenticated">
      <span class="fab-tooltip">Quick note</span>
      <button class="fab" @click="openTray" aria-label="Write a quick note">
        <i class="ph ph-pencil-simple" />
      </button>
    </div>

    <!-- QUICK NOTE TRAY -->
    <div class="glass-overlay" :class="{ 'is-active': trayOpen }" @click.self="closeTray">
      <div class="tray-content" role="dialog" aria-modal="true">
        <div class="tray-header">
          <h3>Quick note</h3>
          <button class="tray-dismiss" @click="closeTray"><i class="ph ph-x" /></button>
        </div>
        <textarea ref="trayInputEl" v-model="trayText" class="tray-input" placeholder="What's on your mind?" rows="3" @keydown="onTrayKey" />
        <div class="tray-actions">
          <button class="btn-primary" @click="saveNote">Save note</button>
        </div>
      </div>
    </div>

    <!-- TOAST CONTAINER (global) -->
    <div class="toast-container" id="toast-container" aria-live="polite" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from '#app';

type Tag = { id: number; name: string; source: string; confidence: number };
type BookmarkCard = {
  id: number; url: string; title: string | null; description: string | null;
  ogImage: string | null; status: string; domain: string | null;
  aiStatus?: string | null; sourceType?: string | null; isPinned?: boolean;
  summary?: string | null; sourceMetadata?: string | null;
  tags: Tag[]; savedAt?: string; duration?: string | null; price?: string | null;
};
type OptNote = { id: number; text: string };

const route = useRoute();
const isAuthenticated = useState<boolean>('isAuthenticated', () => false);
const splashReady = useSplash();

// ── State ─────────────────────────────────────────────────────────────
const cards = ref<BookmarkCard[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const saving = ref(false);
const reprocessing = ref(false);
const page = ref(1);
const total = ref(0);
const viewMode = ref<'timeline' | 'categories'>('timeline');

function setViewMode(mode: 'timeline' | 'categories') {
  if (mode === 'timeline' && activeFilter.value !== 'all') {
    clearFilter();
  }
  viewMode.value = mode;
}

function enterBucket(type: string) {
  // Navigate to timeline filtered by source type
  navigateTo({ path: '/', query: { ...route.query, filter: type } });
  viewMode.value = 'timeline';
  activeFilter.value = type;
}

const sentinel = ref<HTMLElement | null>(null);
const smartInputEl = ref<HTMLInputElement | null>(null);
const trayInputEl = ref<HTMLTextAreaElement | null>(null);
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let observer: IntersectionObserver | null = null;

const inputVal = ref('');
let searchDebounce: ReturnType<typeof setTimeout> | null = null;
const inputMode = ref<'idle' | 'url' | 'search'>('idle');
const isFocused = ref(false);
const urlPreview = ref<{ domain: string; path: string } | null>(null);
const trayOpen = ref(false);
const trayText = ref('');
const optimisticNotes = ref<OptNote[]>([]);
const readingCard = ref<BookmarkCard | null>(null);

const activeFilter = ref((route.query.filter as string) || 'all');
watch(
  () => route.query.filter,
  (newFilter) => {
    activeFilter.value = (newFilter as string) || 'all';
  }
);

const hasMore = computed(() => cards.value.length < total.value);
const categoryId = computed(() => {
  const raw = route.query.categoryId;
  if (typeof raw === 'string' && raw) { const v = Number(raw); return Number.isFinite(v) ? v : null; }
  return null;
});
const searchQuery = computed(() => typeof route.query.q === 'string' ? route.query.q : '');
const activeTag = computed(() => typeof route.query.tag === 'string' ? route.query.tag : '');

const filters = [
  { label: 'All',      value: 'all',     icon: 'ph-squares-four' },
  { label: 'Articles', value: 'article', icon: 'ph-article' },
  { label: 'Notes',    value: 'note',    icon: 'ph-note-pencil' },
  { label: 'Videos',   value: 'video',   icon: 'ph-youtube-logo' },
  { label: 'Tweets',   value: 'tweet',   icon: 'ph-x-logo' },
  { label: 'GitHub',   value: 'github',  icon: 'ph-github-logo' },
  { label: 'Books',    value: 'book',    icon: 'ph-book-open' },
  { label: 'Products', value: 'product', icon: 'ph-shopping-bag' },
];

// ── Card classification ───────────────────────────────────────────────
const gradients = ['var(--gradient-amber)','var(--gradient-sage)','var(--gradient-terracotta)','var(--gradient-slate)','var(--gradient-pine)','var(--gradient-sand)'];

function cardType(b: BookmarkCard): string {
  const st = b.sourceType?.toLowerCase() || '';
  if (st === 'note' || st === 'text' || !b.url || b.url.startsWith('https://note.local/')) return 'note';
  if (st === 'youtube' || b.url?.includes('youtube.com') || b.url?.includes('youtu.be') || b.url?.includes('vimeo.com')) return 'video';
  if (st === 'twitter' || st === 'x' || b.url?.includes('twitter.com') || b.url?.includes('x.com')) return 'tweet';
  if (st === 'github' || b.url?.includes('github.com')) return 'github';
  if (st === 'book') return 'book';
  if (st === 'product') return 'product';
  return 'article';
}

function cardGradient(b: BookmarkCard): string {
  return gradients[b.id % gradients.length] ?? gradients[0]!
}

function cardClasses(b: BookmarkCard): string[] {
  const type = cardType(b);
  const cls = ['card'];
  if (type === 'note') cls.push('card--note');
  if (type === 'video') cls.push('card--video');
  if (type === 'book') cls.push('card--book');
  if (type === 'product') cls.push('card--product');
  if (type === 'tweet') cls.push('card--tweet');
  if (type === 'github') cls.push('card--github');
  if (isProcessing(b)) cls.push('card--processing');
  return cls;
}

function isProcessing(b: BookmarkCard): boolean {
  if (b.status === 'failed' || b.aiStatus === 'failed') return false;
  return b.status === 'pending' || b.status === 'processing' || 
         (Boolean(b.aiStatus) && (b.aiStatus === 'pending' || b.aiStatus === 'in_progress'));
}

function cardTitle(b: BookmarkCard): string {
  if (b.title) return b.title;
  if (isProcessing(b)) return b.domain || b.url;
  return 'Untitled';
}

function cardDescription(b: BookmarkCard): string {
  // AI summary takes priority, fall back to raw description
  return b.summary || b.description || '';
}

function cardDomain(b: BookmarkCard): string {
  if (b.domain) return b.domain;
  if (!b.url) return 'note';
  try { return new URL(b.url).hostname.replace('www.', ''); } catch { return ''; }
}

function productCategory(b: BookmarkCard): string {
  return b.tags?.[0]?.name || 'Product';
}

function processingStatusText(b: BookmarkCard): string {
  if (b.sourceType === 'youtube') return 'Pulling video title and transcript…';
  if (b.sourceType === 'twitter') return 'Extracting post content…';
  if (b.sourceType === 'github') return 'Indexing repository details…';
  return 'Fetching page content and generating tags…';
}

function getTweetMediaImage(b: BookmarkCard): string | null {
  if (cardType(b) !== 'tweet' || !b.sourceMetadata) return null;
  try {
    const meta = JSON.parse(b.sourceMetadata) as { media?: { photos?: Array<{ url: string }>; videos?: Array<{ thumbnail_url?: string; thumbnail?: string }> } };
    if (meta.media?.photos?.length) return meta.media.photos[0].url;
    if (meta.media?.videos?.length) return meta.media.videos[0].thumbnail_url || meta.media.videos[0].thumbnail || null;
    return null;
  } catch { return null; }
}

const inputIconClass = computed(() => {
  if (inputMode.value === 'url') return 'ph-link';
  if (inputMode.value === 'search') return 'ph-magnifying-glass';
  return 'ph-pencil-simple';
});

// ── Filtered cards ────────────────────────────────────────────────────
const filteredCards = computed(() => {
  let list = cards.value;
  if (activeFilter.value !== 'all') {
    list = list.filter(c => cardType(c) === activeFilter.value);
  }
  if (activeTag.value) {
    list = list.filter(c => c.tags?.some(t => t.name === activeTag.value));
  }
  return list;
});

function setFilter(val: string) { activeFilter.value = val; }

function getFilterLabel(val: string) {
  const f = SOURCE_TYPES.find(st => st.type === val);
  return f ? f.label : val;
}

function clearFilter() {
  activeFilter.value = 'all';
  const query = { ...route.query };
  delete query.filter;
  navigateTo({ path: '/', query });
}

// ── Source-type buckets for categories view ──────────────────────────
const SOURCE_TYPES = [
  { type: 'article', label: 'Articles',  icon: 'ph-article'      },
  { type: 'video',   label: 'Videos',    icon: 'ph-youtube-logo'  },
  { type: 'note',    label: 'Notes',     icon: 'ph-note-pencil'   },
  { type: 'tweet',   label: 'Tweets',    icon: 'ph-x-logo'        },
  { type: 'github',  label: 'GitHub',    icon: 'ph-github-logo'   },
  { type: 'book',    label: 'Books',     icon: 'ph-book-open'     },
  { type: 'product', label: 'Products',  icon: 'ph-shopping-bag'  },
] as const;

const sourceBuckets = computed(() => {
  return SOURCE_TYPES
    .map(st => {
      const matches = cards.value.filter(c => cardType(c) === st.type);
      const previews = matches.slice(0, 3).map((c, i) => ({
        id: c.id,
        title: c.title,
        ogImage: c.ogImage,
        gradient: gradients[c.id % gradients.length] ?? gradients[i % gradients.length]!,
      }));
      return { ...st, count: matches.length, previews };
    })
    .filter(b => b.count > 0);
});

// ── Stable column assignment for masonry grid ─────────────────────────
const columnCount = computed(() => {
  if (typeof window === 'undefined') return 4;
  const width = window.innerWidth;
  if (width <= 767) return 2;
  if (width <= 900) return 2;
  if (width <= 1200) return 3;
  return 4;
});

const columnCountRef = ref(4);

function getColumnCards(colIndex: number): BookmarkCard[] {
  const total = columnCountRef.value;
  return filteredCards.value.filter((_, idx) => idx % total === colIndex);
}

function updateColumnCount() {
  if (typeof window === 'undefined') return;
  const width = window.innerWidth;
  let cols = 4;
  if (width <= 767) cols = 2;
  else if (width <= 900) cols = 2;
  else if (width <= 1200) cols = 3;
  columnCountRef.value = cols;
}

// ── URL detection ─────────────────────────────────────────────────────
const URL_REGEX = /^https?:\/\/.+\..+/i;
function isUrl(v: string): boolean { return URL_REGEX.test(v.trim()); }
function parseUrl(raw: string): { domain: string; path: string } | null {
  try {
    const u = new URL(raw.trim().startsWith('http') ? raw.trim() : 'https://' + raw.trim());
    return { domain: u.hostname.replace('www.', ''), path: u.pathname === '/' ? '' : u.pathname };
  } catch { return null; }
}

function onInputChange() {
  const val = inputVal.value;
  if (searchDebounce) { clearTimeout(searchDebounce); searchDebounce = null; }
  if (!val) { inputMode.value = 'idle'; urlPreview.value = null; updateRouteSearch(''); return; }
  if (isUrl(val)) {
    inputMode.value = 'url';
    urlPreview.value = parseUrl(val);
  } else {
    inputMode.value = 'search';
    urlPreview.value = null;
    searchDebounce = setTimeout(() => updateRouteSearch(val), 150);
  }
}

function updateRouteSearch(q: string) {
  if (q.trim()) navigateTo({ path: '/', query: { ...route.query, q }, replace: true });
  else {
    const { q: _q, ...rest } = route.query as Record<string, string>;
    navigateTo({ path: '/', query: rest, replace: true });
  }
}

function onBlur() { setTimeout(() => { isFocused.value = false; }, 200); }

// ── Save ──────────────────────────────────────────────────────────────
async function doSave() {
  const val = inputVal.value.trim();
  if (!val || !isAuthenticated.value) return;
  if (inputMode.value === 'search') return; // Don't save on search mode
  
  saving.value = true;
  try {
    const isNote = !isUrl(val);
    const bodyUrl = isNote ? `https://note.local/${Date.now()}` : val;
    const bodyText = isNote ? val : undefined;

    await $fetch('/api/save', { 
      method: 'POST', 
      body: { 
        url: bodyUrl, 
        text: bodyText,
        categoryId: categoryId.value ?? undefined 
      } 
    });

    inputVal.value = '';
    inputMode.value = 'idle';
    urlPreview.value = null;
    updateRouteSearch('');
    
    if (isNote) {
      showToast('Note saved to your vault.');
    } else {
      const isYT = val.includes('youtube.com') || val.includes('youtu.be');
      showToast(isYT ? 'YouTube video saved — extracting transcript…' : 'Link saved — enriching in background.');
    }
    await loadInitial();
  } catch {
    showToast('Could not save item. Try again.');
  } finally {
    saving.value = false;
  }
}

function pasteYouTube() {
  inputVal.value = '';
  updateRouteSearch('');
  nextTick(() => {
    smartInputEl.value?.focus();
    // Leave empty — user pastes their own YouTube URL
  });
  showToast('Paste a YouTube URL to save it.');
}

// ── Tray ──────────────────────────────────────────────────────────────
function openTray() {
  trayOpen.value = true;
  nextTick(() => trayInputEl.value?.focus());
}
function closeTray() { trayOpen.value = false; trayText.value = ''; }
function onTrayKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveNote();
}
function saveQuickNote(text: string) {
  const note: OptNote = { id: Date.now(), text };
  optimisticNotes.value.unshift(note);
  
  $fetch('/api/save', { 
    method: 'POST', 
    body: { 
      url: `https://note.local/${Date.now()}`,
      text: text,
      categoryId: categoryId.value ?? undefined
    } 
  }).then(() => {
    showToast('Note saved to your vault.');
    loadInitial();
  }).catch(() => {
    showToast('Could not save note. Try again.');
  }).finally(() => {
    optimisticNotes.value = optimisticNotes.value.filter(n => n.id !== note.id);
  });
}

function saveNote() {
  const text = trayText.value.trim();
  if (!text) { trayInputEl.value?.focus(); return; }
  closeTray();
  saveQuickNote(text);
}

// ── Delete / Reading ──────────────────────────────────────────────────
// ── Pin / Reprocess ───────────────────────────────────────────────────
async function togglePin(card: BookmarkCard) {
  await $fetch(`/api/bookmarks/${card.id}/pin`, { method: 'POST' });
  const isPinned = !card.isPinned;
  const idx = cards.value.findIndex(c => c.id === card.id);
  if (idx !== -1) cards.value[idx] = { ...cards.value[idx], isPinned } as BookmarkCard;
  if (readingCard.value?.id === card.id) readingCard.value = { ...readingCard.value, isPinned } as BookmarkCard;
  showToast(isPinned ? 'Pinned to top.' : 'Unpinned.');
}
async function reprocessCard(card: BookmarkCard) {
  if (reprocessing.value) return;
  reprocessing.value = true;
  try {
    await $fetch(`/api/bookmarks/${card.id}/reprocess`, { method: 'POST' });
    showToast('Reprocessing with AI… card will update shortly.');
    setTimeout(() => loadInitial(), 5000);
  } catch {
    showToast('Reprocess failed. Try again.');
  } finally {
    reprocessing.value = false;
  }
}

async function remove(id: number) {
  await $fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
  cards.value = cards.value.filter(c => c.id !== id);
  total.value = Math.max(0, total.value - 1);
  showToast('Removed from vault.');
}
function openReading(card: BookmarkCard) {
  if (isProcessing(card)) { navigateTo(`/bookmarks/${card.id}`); return; }
  readingCard.value = card;
  document.body.style.overflow = 'hidden';
}

watch(readingCard, (val) => { if (!val) document.body.style.overflow = ''; });

// ── Scroll position preservation ──────────────────────────────────────
const SCROLL_KEY = 'glean:home:scrollY';

function openCard(card: BookmarkCard) {
  sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  navigateTo('/bookmarks/' + card.id);
}

// ── Data fetching ─────────────────────────────────────────────────────
function normalizeCards(items: BookmarkCard[]): BookmarkCard[] {
  return (items || []).map(item => ({ ...item, tags: item.tags || [] }));
}
async function fetchPage(pageNum: number) {
  const params: Record<string, string | number> = {
    page: pageNum, limit: 24,
    ...(categoryId.value ? { categoryId: categoryId.value } : {})
  };
  const rawQuery = searchQuery.value;
  const query = (rawQuery && typeof rawQuery === 'string' ? rawQuery.trim() : '').replace(/\s+/g, ' ');
  if (query.length > 0) {
    const searchMode = isAuthenticated.value ? 'semantic' : 'keyword';
    return await $fetch('/api/search', { query: { q: query, mode: searchMode, ...params } }) as { items: BookmarkCard[]; total: number };
  }
  return await $fetch('/api/bookmarks', { query: params }) as { items: BookmarkCard[]; total: number };
}
async function loadInitial() {
  const scrollY = window.scrollY;
  loading.value = true; page.value = 1;
  const result = await fetchPage(1);
  cards.value = normalizeCards(result.items);
  total.value = result.total;
  loading.value = false;
  await nextTick();
  window.scrollTo(0, scrollY);
}
async function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  loadingMore.value = true;
  const result = await fetchPage(page.value + 1);
  cards.value = [...cards.value, ...normalizeCards(result.items)];
  total.value = result.total; page.value += 1;
  loadingMore.value = false;
}
function setupObserver() {
  if (!sentinel.value) return;
  observer = new IntersectionObserver(entries => {
    if (entries[0]?.isIntersecting && hasMore.value && !loadingMore.value && viewMode.value === 'timeline') void loadMore();
  }, { rootMargin: '200px' });
  observer.observe(sentinel.value);
}

// ── Toast ─────────────────────────────────────────────────────────────
function showToast(msg: string) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<i class="ph-fill ph-check-circle" style="color: var(--color-success);"></i> ${msg}`;
  container.appendChild(t);
  setTimeout(() => { t.classList.add('exit'); setTimeout(() => t.remove(), 200); }, 3000);
}

// ── Scroll (compact search is handled in default.vue) ────────────────
function onScroll() { /* noop — compact header search is in layout */ }

// ── Keyboard shortcut ─────────────────────────────────────────────────
function onKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); smartInputEl.value?.focus(); }
  if (e.key === 'Escape') {
    if (trayOpen.value) closeTray();
    else if (readingCard.value) readingCard.value = null;
    else if (document.activeElement === smartInputEl.value) smartInputEl.value?.blur();
  }
}

// ── Time formatting ───────────────────────────────────────────────────
function relativeTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Watch only the query params that affect data fetching.
// The `mountedRef` guard prevents a double-fetch on initial mount
// (onMounted already calls loadInitial directly).
const mountedRef = ref(false);
watch(
  () => [route.query.q, route.query.tag, route.query.categoryId] as const,
  () => { if (mountedRef.value) void loadInitial(); },
);

onMounted(async () => {
  await loadInitial();
  splashReady.value = true;
  setupObserver();
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', updateColumnCount);
  updateColumnCount();

  // Restore scroll position after returning from a bookmark detail page
  const savedScrollY = sessionStorage.getItem(SCROLL_KEY);
  if (savedScrollY) {
    sessionStorage.removeItem(SCROLL_KEY);
    await nextTick();
    window.scrollTo({ top: Number(savedScrollY), behavior: 'instant' });
  }

  // Activate route watcher only after initial load so it doesn't double-fetch
  mountedRef.value = true;

  refreshTimer = setInterval(() => {
    if (cards.value.some(isProcessing)) {
      const scrollY = window.scrollY;
      fetchPage(1).then(result => {
        const ids = new Set(cards.value.filter(isProcessing).map(c => c.id));
        result.items.forEach(updated => {
          if (ids.has(updated.id)) {
            const idx = cards.value.findIndex(c => c.id === updated.id);
            if (idx !== -1) cards.value[idx] = { ...cards.value[idx], ...updated };
          }
        });
        nextTick(() => window.scrollTo(0, scrollY));
      });
    }
  }, 4000);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
  if (observer) observer.disconnect();
  if (searchDebounce) clearTimeout(searchDebounce);
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', updateColumnCount);
  document.removeEventListener('keydown', onKeyDown);
});
</script>

<style scoped>
/* ── Page ────────────────────────────────────────────────────────── */
.vault-page { min-height: 100dvh; }

/* ── Hero Input ──────────────────────────────────────────────────── */
.hero-input-section {
  padding: 40px 48px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}

.smart-input-wrap { width: 100%; max-width: 620px; position: relative; }
.smart-input {
  width: 100%; padding: 16px 140px 16px 52px;
  background: var(--bg-surface); border: 1.5px solid var(--border-subtle);
  border-radius: 18px; font-size: var(--text-base); color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--d-fast) var(--ease-out), box-shadow var(--d-fast) var(--ease-out);
}
.smart-input::placeholder { color: var(--text-muted); }
.smart-input:focus { border-color: var(--border-default); box-shadow: var(--shadow-md); }
.smart-input-wrap.is-url .smart-input {
  border-color: var(--color-accent);
  box-shadow: 0 4px 18px oklch(38% 0.105 189 / 0.14);
}


.smart-input-icon {
  position: absolute; left: 18px; top: 50%; transform: translateY(-50%);
  font-size: 18px; color: var(--text-muted); pointer-events: none;
  transition: color var(--d-fast) var(--ease-out);
}
.smart-input-wrap.is-url .smart-input-icon { color: var(--color-accent); }
.smart-input-wrap.has-value .smart-input-icon { color: var(--text-secondary); }

.smart-input-right {
  position: absolute; right: 10px; top: 50%;
  transform: translateY(-50%); display: flex; align-items: center; gap: 6px;
}
.kbd-badge {
  background: var(--bg-raised); border: 1px solid var(--border-default);
  border-radius: 6px; padding: 2px 8px; font-size: var(--text-xs);
  color: var(--text-muted); pointer-events: none;
  transition: opacity var(--d-fast);
}
.smart-input-wrap.has-value .kbd-badge { opacity: 0; }

.inline-save-btn {
  height: 34px; padding: 0 16px;
  background: var(--bg-inverted); color: var(--text-inverse);
  border-radius: 10px; font-size: var(--text-sm); font-weight: 500;
  opacity: 0; transform: scale(0.9) translateX(4px);
  transition: opacity var(--d-fast) var(--ease-out), transform var(--d-fast) var(--ease-spring),
    background-color var(--d-fast), box-shadow var(--d-fast);
  pointer-events: none; white-space: nowrap;
}
.smart-input-wrap.has-value .inline-save-btn { opacity: 1; transform: scale(1) translateX(0); pointer-events: auto; }
.smart-input-wrap.is-url .inline-save-btn { background: var(--color-accent); box-shadow: var(--shadow-accent); }
.inline-save-btn:hover { transform: scale(1) translateX(0) translateY(-1px) !important; }

/* hint text removed — UI is self-explanatory */

.url-save-hint { color: var(--text-muted); font-size: var(--text-xs); flex: 1; text-align: right; }

.url-preview-bar {
  width: 100%; max-width: 620px;
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  border-top: 1.5px solid var(--color-accent);
  border-radius: 0 0 16px 16px;
  padding: 10px 18px; display: flex; align-items: center; gap: 10px;
  font-size: var(--text-sm); color: var(--text-secondary);
  opacity: 0; transform: translateY(-6px);
  transition: opacity var(--d-fast) var(--ease-out), transform var(--d-fast) var(--ease-out);
  pointer-events: none;
}
.url-preview-bar.is-visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
.url-preview-favicon {
  width: 16px; height: 16px; border-radius: 4px;
  background: var(--bg-raised); flex-shrink: 0; display: grid; place-items: center;
}
.url-preview-domain { font-weight: 500; color: var(--text-primary); }
.url-preview-path { color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }

.public-pill {
  display: flex; align-items: center; gap: 6px;
  font-size: var(--text-xs); color: var(--text-tertiary);
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  border-radius: 999px; padding: 5px 14px;
}
.public-pill-link { color: var(--color-accent); font-weight: 500; }

/* ── View Mode Switcher ────────────────────────────────────────────── */
.view-switcher-section {
  display: flex; justify-content: center;
  padding: 0 48px 32px;
}
.view-switcher {
  position: relative;
  display: inline-flex;
  padding: 3px;
  background: var(--bg-raised);
  border-radius: 100px;
  border: 1px solid var(--border-subtle);
  gap: 0;
}
.view-switcher-pill {
  position: absolute;
  top: 3px; left: 3px;
  width: calc(50% - 3px);
  height: calc(100% - 6px);
  background: var(--bg-surface);
  border-radius: 100px;
  box-shadow: var(--shadow-sm);
  transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}
.view-switcher-btn {
  position: relative; z-index: 1;
  padding: 7px 20px; border-radius: 100px; border: none;
  font-size: var(--text-xs); font-weight: 600;
  display: flex; align-items: center; gap: 5px;
  color: var(--text-tertiary); background: transparent;
  transition: color 200ms var(--ease-out), transform var(--d-instant);
  white-space: nowrap;
}
.view-switcher-btn i { font-size: 13px; transition: opacity 200ms; opacity: 0.6; }
.view-switcher-btn.active { color: var(--text-primary); }
.view-switcher-btn.active i { opacity: 1; }
.view-switcher-btn:active { transform: scale(0.97); }

/* ── Results / Empty ─────────────────────────────────────────────── */
.results-info { padding: 0 48px 24px; font-size: var(--text-sm); color: var(--text-secondary); display: none; }
.results-info.is-visible { display: block; }
.results-info strong { color: var(--text-primary); }
.active-tag {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--color-accent-bg); color: var(--color-accent);
  padding: 2px 10px; border-radius: 6px;
  font-weight: 500; margin: 0 4px;
}
.clear-filter {
  margin-left: 12px; color: var(--text-muted);
  font-size: var(--text-xs); text-decoration: underline;
  background: transparent; border: none; cursor: pointer; padding: 0; font-family: inherit;
}
.clear-filter:hover { color: var(--text-secondary); }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; text-align: center;
  padding: 64px 20px; min-height: 50vh;
}
.empty-illustration { width: 100px; height: 100px; margin-bottom: 24px; animation: float 3s ease-in-out infinite; color: var(--color-accent); opacity: 0.5; }
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
.empty-state h1 { font-size: var(--text-3xl); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; }
.empty-state p { font-size: var(--text-lg); color: var(--text-secondary); max-width: 360px; }

/* ── Grid ────────────────────────────────────────────────────────── */
.container { max-width: 1440px; margin: 0 auto; padding: 0 48px; }
.masonry-grid { display: flex; gap: 32px; }
.masonry-column { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 24px; }
.masonry-grid.cols-4 { gap: 24px; }
.masonry-grid.cols-3 { gap: 24px; }
.masonry-grid.cols-2 { gap: 12px; }
.masonry-grid.cols-2 .masonry-column { gap: 12px; }

/* ── Card Base ───────────────────────────────────────────────────── */
.card {
  background: var(--bg-surface); border-radius: 16px;
  border: 1px solid var(--border-subtle); overflow: hidden;
  position: relative; cursor: pointer;
  transition: transform var(--d-fast) var(--ease-quart), box-shadow var(--d-fast) var(--ease-quart);
  will-change: transform; opacity: 0;
  animation: card-enter var(--d-base) var(--ease-out) both;
  user-select: none; -webkit-user-select: none;
}
@keyframes card-enter { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
.card:active { transform: scale(0.98) translateY(-2px); transition-duration: var(--d-instant); }

.card-skeleton { height: 240px; background: var(--bg-raised); animation: skeleton-pulse 1.5s ease-in-out infinite; }
@keyframes skeleton-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

/* Card image */
.card-image { position: relative; overflow: hidden; }
.card-image img { width: 100%; height: auto; display: block; object-fit: cover; transition: transform var(--d-slow) var(--ease-out); }
.card:hover .card-image img { transform: scale(1.04); }
.card-gradient { width: 100%; height: 160px; }

/* Card body */
.card-body { padding: 14px 16px; }
.card-title {
  font-size: var(--text-base); font-weight: 600; line-height: 1.3;
  letter-spacing: -0.01em; color: var(--text-primary);
  display: -webkit-box; -webkit-box-orient: vertical;
  -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; margin-bottom: 8px;
}

/* Card meta row — holds domain info + open-link button */
.card-meta-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}

/* Direct open-link button — bottom-left of the card, minimal */
.card-open-link {
  flex-shrink: 0;
  width: 24px; height: 24px; border-radius: 6px;
  display: grid; place-items: center;
  color: var(--text-muted); font-size: 13px;
  opacity: 0; transform: scale(0.85);
  transition: opacity var(--d-fast) var(--ease-out), transform var(--d-fast) var(--ease-out), color var(--d-fast), background var(--d-fast);
  text-decoration: none;
}
.card:hover .card-open-link {
  opacity: 1; transform: scale(1);
}
.card-open-link:hover {
  color: var(--color-accent) !important;
  background: var(--color-accent-bg);
  transform: scale(1.1) !important;
}
.card-excerpt {
  font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.55;
  display: -webkit-box; -webkit-box-orient: vertical;
  -webkit-line-clamp: 3; line-clamp: 3; overflow: hidden; margin-bottom: 12px;
}
.card-meta { display: flex; align-items: center; gap: 8px; font-size: var(--text-xs); color: var(--text-tertiary); flex: 1; min-width: 0; }
.dot::before { content: "·"; }
.card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.card-tag { font-size: var(--text-xs); color: var(--ref-pine); background: var(--color-accent-bg); border-radius: 6px; padding: 2px 8px; font-weight: 500; }

/* Card hover actions */
.card-actions { position: absolute; top: 10px; right: 10px; display: flex; gap: 6px; }
.card-action {
  width: 30px; height: 30px; border-radius: 50%;
  background: oklch(99.2% 0.007 78 / 0.90); backdrop-filter: blur(8px);
  display: grid; place-items: center; color: var(--text-secondary); font-size: 14px;
  opacity: 0; transform: scale(0.9) translateY(4px);
  transition: opacity var(--d-fast) var(--ease-out), transform var(--d-fast) var(--ease-out);
}
.card:hover .card-action { opacity: 1; transform: scale(1) translateY(0); }
.card-action:hover { color: oklch(55% 0.18 20) !important; transform: scale(1.15) !important; }

/* Pin badge — overlays top-left corner of pinned cards */
.pin-badge {
  position: absolute; top: 8px; left: 8px; z-index: 2;
  width: 22px; height: 22px; border-radius: 6px;
  background: var(--color-accent); color: #fff;
  display: grid; place-items: center; font-size: 11px;
  box-shadow: var(--shadow-accent);
}

/* Note card actions — shown on hover for cards without an image header */
.note-card-actions {
  position: absolute; top: 8px; right: 8px; z-index: 2;
  display: flex; gap: 4px;
  opacity: 0; transform: translateY(-4px);
  transition: opacity var(--d-fast) var(--ease-out), transform var(--d-fast);
}
.card:hover .note-card-actions { opacity: 1; transform: translateY(0); }

/* Reading action states */
.reading-action-btn.danger:hover { color: oklch(55% 0.18 20); }
.reading-action-btn.is-active-action { color: var(--color-accent); }

/* Processing card */
.card--processing { border-color: oklch(62% 0.130 75 / 0.30); }
.processing-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 100px;
  background: var(--color-process-bg); color: var(--color-process-text);
  font-size: var(--text-xs); font-weight: 600;
  letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 8px;
}
.processing-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-process); animation: pulse-dot 1.4s ease-in-out infinite; }
@keyframes pulse-dot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.75); } }
.processing-status { font-size: var(--text-sm); color: var(--text-tertiary); font-style: italic; }

/* Note card */
.card--note { background: var(--bg-raised); }
.note-body {
  padding: 20px; position: relative;
  background-image: repeating-linear-gradient(0deg, transparent, transparent 27px, oklch(13% 0.016 58 / 0.04) 27px, oklch(13% 0.016 58 / 0.04) 28px);
}
.note-icon { position: absolute; top: 12px; right: 12px; color: var(--text-muted); font-size: 16px; }
.card--note .card-title { font-size: var(--text-base); font-weight: 500; -webkit-line-clamp: 10; line-clamp: 10; line-height: 1.6; }

/* Video card */
.play-btn {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 52px; height: 52px; border-radius: 50%;
  background: oklch(99.2% 0.007 78 / 0.92); backdrop-filter: blur(8px);
  display: grid; place-items: center; color: var(--text-primary); font-size: 22px;
  opacity: 0; transition: opacity var(--d-fast) var(--ease-out); box-shadow: var(--shadow-md);
}
.card--video:hover .play-btn { opacity: 1; }
.duration-badge {
  position: absolute; bottom: 10px; right: 10px;
  background: oklch(13% 0.016 58 / 0.68); backdrop-filter: blur(6px);
  color: var(--text-inverse); font-size: var(--text-xs); font-weight: 500;
  padding: 3px 8px; border-radius: 6px;
}

/* Tweet card */
.tweet-badge, .gh-badge {
  position: absolute; top: 10px; left: 10px;
  width: 28px; height: 28px; border-radius: 8px;
  display: grid; place-items: center; font-size: 14px;
}
.tweet-badge { background: oklch(13% 0.016 58 / 0.80); color: var(--text-inverse); }
.gh-badge { background: oklch(13% 0.016 58 / 0.80); color: var(--text-inverse); }

/* Book card */
.card--book .book-cover { padding: 20px 24px; display: flex; justify-content: center; perspective: 600px; background: var(--gradient-sand); }
.book-3d { width: 110px; transform: rotateY(-12deg); transform-style: preserve-3d; transition: transform var(--d-slow) var(--ease-out); position: relative; }
.card--book:hover .book-3d { transform: rotateY(-6deg); }
.book-3d img { width: 100%; border-radius: 4px; box-shadow: var(--shadow-md); display: block; }
.book-placeholder { width: 100%; height: 140px; display: grid; place-items: center; background: var(--bg-raised); border-radius: 4px; font-size: 32px; color: var(--text-muted); }
.book-spine { position: absolute; top: 4px; left: -8px; width: 8px; height: calc(100% - 8px); background: var(--ref-terracotta-dark); border-radius: 2px 0 0 2px; transform: rotateY(90deg); transform-origin: right center; }

/* Product card */
.card--product .card-image img { aspect-ratio: 1; object-fit: cover; }
.product-price { font-size: var(--text-lg); font-weight: 600; margin-bottom: 4px; color: var(--ref-pine); }
.product-category { display: inline-block; background: var(--color-accent-bg); padding: 3px 10px; border-radius: 100px; font-size: var(--text-xs); color: var(--ref-pine); font-weight: 500; margin-bottom: 8px; }

/* ── FAB ─────────────────────────────────────────────────────────── */
.fab-wrap { position: fixed; bottom: 32px; right: 32px; z-index: var(--z-sticky); }
.fab-tooltip {
  position: absolute; right: 60px; top: 50%;
  transform: translateY(-50%) translateX(4px);
  background: var(--bg-inverted); color: var(--text-inverse);
  font-size: var(--text-xs); font-weight: 500;
  padding: 5px 12px; border-radius: 8px; white-space: nowrap;
  opacity: 0; pointer-events: none;
  transition: opacity var(--d-fast) var(--ease-out), transform var(--d-fast) var(--ease-out);
}
.fab-wrap:hover .fab-tooltip { opacity: 1; transform: translateY(-50%) translateX(0); }
.fab {
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--color-accent); color: var(--text-inverse);
  box-shadow: var(--shadow-lg), var(--shadow-accent);
  display: grid; place-items: center; font-size: 22px;
  transition: transform var(--d-fast) var(--ease-out), box-shadow var(--d-fast) var(--ease-out);
}
.fab:hover { transform: scale(1.08); box-shadow: var(--shadow-xl), 0 6px 24px oklch(38% 0.105 189 / 0.35); }
.fab:active { transform: scale(0.93); }

/* ── Tray ────────────────────────────────────────────────────────── */
.glass-overlay {
  position: fixed; inset: 0;
  background: oklch(13% 0.016 58 / 0.4); backdrop-filter: blur(8px);
  z-index: var(--z-modal); display: none; opacity: 0;
  transition: opacity var(--d-base) var(--ease-out);
  align-items: flex-end; justify-content: center;
}
.glass-overlay.is-active { display: flex; opacity: 1; }
.tray-content {
  width: 100%; max-width: 560px;
  background: var(--bg-surface); border-radius: 24px 24px 0 0;
  padding: 32px; box-shadow: 0 -14px 52px oklch(13% 0.016 58 / 0.07);
  transform: translateY(100%);
  transition: transform var(--d-slow) var(--ease-spring);
}
.glass-overlay.is-active .tray-content { transform: translateY(0); }
.tray-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.tray-header h3 { font-size: var(--text-xl); font-weight: 600; }
.tray-dismiss {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--bg-raised); display: grid; place-items: center;
  color: var(--text-secondary); font-size: 14px;
  transition: background var(--d-fast), color var(--d-fast);
}
.tray-dismiss:hover { background: var(--border-default); color: var(--text-primary); }
.tray-input {
  width: 100%; font-size: var(--text-xl); padding: 16px 0;
  border-bottom: 2px solid var(--border-subtle); margin-bottom: 20px;
  background: transparent; color: var(--text-primary); font-family: var(--font-ui);
  line-height: 1.6; resize: none;
  transition: border-color var(--d-fast);
}
.tray-input:focus { border-color: var(--color-accent); outline: none; }
.tray-input::placeholder { color: var(--text-muted); }
.tray-actions { display: flex; justify-content: flex-end; }

/* ── Reading Mode ────────────────────────────────────────────────── */
.reading-mode-overlay {
  position: fixed; inset: 0; background: var(--bg-ground);
  z-index: var(--z-modal); opacity: 0; pointer-events: none;
  transform: translateY(20px);
  transition: opacity var(--d-slow) var(--ease-out), transform var(--d-slow) var(--ease-out);
  display: flex; flex-direction: column;
}
.reading-mode-overlay.is-active { opacity: 1; transform: translateY(0); pointer-events: auto; }
.reading-header {
  padding: 16px 48px; display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface);
}
.reading-back-btn {
  display: flex; align-items: center; gap: 8px;
  font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary);
  transition: color var(--d-fast);
}
.reading-back-btn:hover { color: var(--color-accent); }
.reading-actions { display: flex; gap: 12px; }
.reading-action-btn {
  width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
  color: var(--text-secondary); font-size: 18px;
  transition: background var(--d-fast), color var(--d-fast);
  text-decoration: none;
}
.reading-action-btn:hover { background: var(--bg-raised); color: var(--text-primary); }
.reading-scroll-area { flex: 1; overflow-y: auto; padding: 48px 0 64px; }
.reading-container { max-width: 680px; margin: 0 auto; padding: 0 20px; }
.reading-hero-image { width: 100%; height: 320px; border-radius: 20px; object-fit: cover; margin-bottom: 24px; box-shadow: var(--shadow-sm); }
.reading-domain { font-size: var(--text-sm); font-weight: 600; color: var(--color-accent); margin-bottom: 8px; display: block; }
.reading-title { font-size: var(--text-4xl); font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 16px; }
.reading-meta-bar { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24px; margin-bottom: 24px; border-bottom: 1px solid var(--border-subtle); }
.reading-author { font-size: var(--text-sm); color: var(--text-secondary); }
.reading-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.reading-tag { background: var(--color-accent-bg); color: var(--ref-pine); font-size: var(--text-xs); padding: 4px 10px; border-radius: 6px; border: 1px solid oklch(38% 0.105 189 / 0.18); font-weight: 500; }
.reading-body { font-size: var(--text-lg); line-height: 1.75; color: var(--text-primary); }
.reading-body p { margin-bottom: 1.5em; }

/* ── Misc ───────────────────────────────────────────────────────── */
.sentinel { height: 1px; width: 100%; }
.end-of-list, .loading-more { text-align: center; color: var(--text-muted); font-size: var(--text-sm); padding: 24px 0; }
.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* ── View switch transition ──────────────────────────────────────── */
.view-switch-enter-active {
  transition: opacity 260ms cubic-bezier(0.16, 1, 0.3, 1), transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}
.view-switch-leave-active {
  transition: opacity 180ms cubic-bezier(0.4, 0, 1, 1), transform 180ms cubic-bezier(0.4, 0, 1, 1);
  position: absolute; width: 100%;
}
.view-switch-enter-from { opacity: 0; transform: translateY(8px); }
.view-switch-leave-to   { opacity: 0; transform: translateY(-6px); }

/* ── Categories View ─────────────────────────────────────────────── */
.categories-view { padding-bottom: 80px; padding-top: 4px; }
.buckets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}
@media (min-width: 900px) {
  .buckets-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
}
@media (min-width: 1200px) {
  .buckets-grid { grid-template-columns: repeat(4, 1fr); }
}

/* Bucket card */
.bucket-card {
  display: flex; flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 280ms cubic-bezier(0.16, 1, 0.3, 1),
              border-color 200ms;
  animation: bucket-enter 380ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--bucket-delay, 0ms);
  will-change: transform;
}
.bucket-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-default);
}
.bucket-card:hover .deck-card:nth-child(1) { transform: rotate(-10deg) translateX(-10px) translateY(-14px); }
.bucket-card:hover .deck-card:nth-child(2) { transform: rotate(7deg) translateX(10px) translateY(-10px); }
.bucket-card:hover .deck-card:nth-child(3) { transform: rotate(-1deg) translateY(0px); }
.bucket-card:hover .bucket-cta-arrow { transform: translateX(3px); }
.bucket-card:active { transform: translateY(-2px); }

@keyframes bucket-enter {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Stacked deck */
.bucket-deck {
  position: relative;
  height: 196px;
  background: var(--bg-raised);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.deck-card {
  position: absolute;
  width: 118px; height: 150px;
  border-radius: 12px;
  border: 1.5px solid var(--border-subtle);
  overflow: hidden;
  box-shadow: 0 4px 16px oklch(0 0 0 / 0.12);
  transition: transform 350ms cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}
/* stack positions: bottom to top */
.deck-card:nth-child(1) {
  transform: rotate(-7deg) translateX(-6px) translateY(4px);
  z-index: 1; opacity: 0.72;
}
.deck-card:nth-child(2) {
  transform: rotate(4deg) translateX(8px) translateY(-2px);
  z-index: 2; opacity: 0.86;
}
.deck-card:nth-child(3) {
  transform: rotate(-1deg);
  z-index: 3; opacity: 1;
}
.deck-card-img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.deck-card-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.deck-card-placeholder i { font-size: 28px; opacity: 0.25; color: var(--text-primary); }
.deck-card--empty {
  background: var(--bg-raised);
  border-style: dashed;
}

/* Bucket metadata */
.bucket-meta {
  padding: 14px 16px 16px;
  display: flex; flex-direction: column; gap: 8px;
  border-top: 1px solid var(--border-subtle);
}
.bucket-label-row {
  display: flex; align-items: center; gap: 8px;
}
.bucket-icon-wrap {
  width: 24px; height: 24px; border-radius: 7px;
  background: var(--color-accent-bg);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.bucket-icon-wrap i { font-size: 13px; color: var(--color-accent); }
.bucket-label {
  font-size: var(--text-sm); font-weight: 650;
  letter-spacing: -0.01em; color: var(--text-primary);
}
.bucket-bottom-row {
  display: flex; align-items: center; justify-content: space-between;
}
.bucket-count {
  font-size: var(--text-xs); color: var(--text-muted); font-weight: 500;
}
.bucket-cta {
  display: flex; align-items: center; gap: 3px;
  font-size: var(--text-xs); font-weight: 600; color: var(--color-accent);
}
.bucket-cta-arrow {
  font-size: 11px;
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
  display: inline-block;
}

/* Skeleton and empty */
.buckets-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}
.bucket-skeleton-card {
  height: 256px; border-radius: 20px;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  animation: shimmer 1.6s ease-in-out infinite;
}
@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
.buckets-empty {
  text-align: center; padding: 72px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  color: var(--text-muted);
}
.buckets-empty i { font-size: 40px; opacity: 0.3; }
.buckets-empty p { font-size: var(--text-base); }

/* ── Responsive ──────────────────────────────────────────────────── */
@media (max-width: 1200px) {
  .masonry-grid { gap: 24px; }
  .masonry-column { gap: 20px; }
}
@media (max-width: 900px) {
  .masonry-grid { gap: 16px; }
  .masonry-column { gap: 16px; }
}

@media (max-width: 767px) {
  /* Hero */
  .hero-input-section { padding: 24px 16px 16px; gap: 8px; }
  .smart-input-wrap { max-width: 100%; }
  .smart-input { padding: 14px 120px 14px 44px; font-size: var(--text-sm); border-radius: 14px; }

  /* View switcher */
  .view-switcher-section { padding: 0 16px 20px; }

  /* Buckets */
  .buckets-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .bucket-deck { height: 156px; }
  .deck-card { width: 96px; height: 120px; border-radius: 10px; }

  /* Grid — stable 2-col layout */
  .masonry-grid { gap: 12px; }
  .masonry-column { gap: 12px; }
  .card { border-radius: 14px; }
  .card-body { padding: 12px; }
  .card-title { font-size: var(--text-sm); }
  .card-gradient { height: 120px; }
  .card-image img { max-height: 180px; object-fit: cover; }

  /* Container */
  .container { padding: 0 16px; }

  /* Reading mode */
  .reading-header { padding: 14px 16px; }
  .reading-title { font-size: var(--text-2xl); }
  .reading-scroll-area { padding: 28px 0 60px; }

  /* FAB */
  .fab-wrap { bottom: 20px; right: 16px; }
  .fab { width: 46px; height: 46px; font-size: 20px; }

  /* Note icon - position in corner with spacing */
  .note-icon { top: 8px; right: 8px; }
  .card--note .note-body { padding-top: 36px; }
}

@media (max-width: 400px) {
  /* Very small phones: tighter gaps */
  .masonry-grid { gap: 8px; }
  .masonry-column { gap: 8px; }
}


@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
</style>
