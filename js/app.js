/**
 * DSShed - Main Application Logic
 * Handles data loading, search, category filtering, and card rendering.
 */

(function () {
  'use strict';

  // ===== State =====
  let siteData = null;
  let activeCategory = 'all';
  let searchQuery = '';

  // ===== DOM References =====
  const els = {
    siteName: document.getElementById('site-name'),
    siteTagline: document.getElementById('site-tagline'),
    siteOwner: document.getElementById('site-owner'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    categoryTabs: document.getElementById('category-tabs'),
    itemsGrid: document.getElementById('items-grid'),
    itemsCount: document.getElementById('items-count'),
    footerYear: document.getElementById('footer-year'),
  };

  // ===== Init =====
  async function init() {
    showLoading();
    try {
      siteData = await loadData();
      renderHeader(siteData.site);
      renderCategories(siteData.categories);
      renderItems();
      bindEvents();
      updateFooter();
    } catch (err) {
      showError(err.message);
    }
  }

  // ===== Data Loading =====
  async function loadData() {
    const res = await fetch('data/data.json');
    if (!res.ok) throw new Error('Failed to load data.json. Make sure the file exists.');
    return await res.json();
  }

  // ===== Header Rendering =====
  function renderHeader(site) {
    els.siteName.textContent = site.name;
    els.siteTagline.textContent = site.tagline;
    els.siteOwner.textContent = `By ${site.owner}`;
  }

  // ===== Category Tabs =====
  function renderCategories(categories) {
    const allCount = siteData.items.length;

    let html = `
      <button class="category-tab active" data-category="all">
        🏠 全部
        <span class="category-tab__count">${allCount}</span>
      </button>
    `;

    categories.forEach((cat) => {
      const count = siteData.items.filter((i) => i.categoryId === cat.id).length;
      if (count > 0) {
        html += `
          <button class="category-tab" data-category="${cat.id}">
            ${cat.icon} ${cat.name}
            <span class="category-tab__count">${count}</span>
          </button>
        `;
      }
    });

    els.categoryTabs.innerHTML = html;

    // Bind tab clicks
    els.categoryTabs.querySelectorAll('.category-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        els.categoryTabs.querySelector('.active')?.classList.remove('active');
        tab.classList.add('active');
        activeCategory = tab.dataset.category;
        renderItems();
      });
    });
  }

  // ===== Items Rendering =====
  function renderItems() {
    let items = siteData.items;

    // Filter by category
    if (activeCategory !== 'all') {
      items = items.filter((i) => i.categoryId === activeCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((item) => {
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.tags && item.tags.some((t) => t.toLowerCase().includes(q))) ||
          (item.version && item.version.toLowerCase().includes(q))
        );
      });
    }

    // Update count
    els.itemsCount.textContent = `${items.length} 项`;

    // Render
    if (items.length === 0) {
      els.itemsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state__icon">${searchQuery ? '🔍' : '📭'}</div>
          <div class="empty-state__title">${searchQuery ? '未找到匹配的内容' : '暂无内容'}</div>
          <div class="empty-state__desc">${
            searchQuery ? '试试其他关键词，或清除搜索后查看全部' : '主人还没放东西进来呢~'
          }</div>
        </div>
      `;
      return;
    }

    els.itemsGrid.innerHTML = items
      .map((item, index) => renderCard(item, index))
      .join('');

    // Highlight search matches
    if (searchQuery.trim()) {
      highlightMatches(searchQuery.trim());
    }
  }

  // ===== Card HTML =====
  function renderCard(item, index) {
    const category = siteData.categories.find((c) => c.id === item.categoryId);
    const catName = category ? category.name : '';

    // Determine primary action button
    let primaryBtn = '';
    let secondaryBtn = '';

    if (item.downloadUrl && item.downloadUrl !== '#') {
      primaryBtn = `<a class="item-card__btn item-card__btn--primary" href="${item.downloadUrl}" target="_blank" rel="noopener">⬇️ 下载</a>`;
    } else if (item.releaseUrl && item.releaseUrl !== '#') {
      primaryBtn = `<a class="item-card__btn item-card__btn--primary" href="${item.releaseUrl}" target="_blank" rel="noopener">📦 Releases 下载</a>`;
    } else if (item.fileUrl && item.fileUrl !== '#') {
      primaryBtn = `<a class="item-card__btn item-card__btn--primary" href="${item.fileUrl}" target="_blank" rel="noopener">📄 查看文档</a>`;
    } else if (item.toolUrl && item.toolUrl !== '#') {
      primaryBtn = `<a class="item-card__btn item-card__btn--primary" href="${item.toolUrl}" target="_blank" rel="noopener">🚀 打开工具</a>`;
    } else {
      primaryBtn = `<span class="item-card__btn item-card__btn--primary" style="opacity:0.4;cursor:not-allowed;">🔜 待添加</span>`;
    }

    if (item.releaseUrl && item.releaseUrl !== '#' && primaryBtn.includes('Releases')) {
      // Already primary
    } else if (item.releaseUrl && item.releaseUrl !== '#') {
      secondaryBtn = `<a class="item-card__btn item-card__btn--secondary" href="${item.releaseUrl}" target="_blank" rel="noopener">📦 Releases</a>`;
    }

    // Version badge
    const versionBadge = item.version
      ? `<span class="item-card__version">v${item.version}</span>`
      : '';

    // Meta info
    let metaParts = [];
    if (item.size) metaParts.push(`💾 ${item.size}`);
    if (catName) metaParts.push(`📂 ${catName}`);
    if (item.lastUpdated) metaParts.push(`🕒 ${item.lastUpdated}`);

    // Tags
    const tagsHtml = item.tags
      ? item.tags.map((t) => `<span class="item-card__tag">${escapeHtml(t)}</span>`).join('')
      : '';

    return `
      <div class="item-card" style="animation-delay: ${index * 0.06}s" data-id="${item.id}">
        <div class="item-card__header">
          <div class="item-card__icon">${item.icon || '📌'}</div>
          <div>
            <div class="item-card__title">${escapeHtml(item.name)}</div>
            ${versionBadge}
          </div>
        </div>
        <div class="item-card__description">${escapeHtml(item.description)}</div>
        ${metaParts.length ? `<div class="item-card__meta">${metaParts.map(s => `<span>${s}</span>`).join('')}</div>` : ''}
        ${tagsHtml ? `<div class="item-card__tags">${tagsHtml}</div>` : ''}
        <div class="item-card__actions">
          ${primaryBtn}
          ${secondaryBtn}
        </div>
      </div>
    `;
  }

  // ===== Search Highlighting =====
  function highlightMatches(query) {
    const cards = els.itemsGrid.querySelectorAll('.item-card');
    cards.forEach((card) => {
      const titleEl = card.querySelector('.item-card__title');
      const descEl = card.querySelector('.item-card__description');
      if (titleEl) wrapMatches(titleEl, query);
      if (descEl) wrapMatches(descEl, query);
    });
  }

  function wrapMatches(el, query) {
    const original = el.textContent;
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    if (regex.test(original)) {
      el.innerHTML = original.replace(regex, '<mark>$1</mark>');
    }
  }

  // ===== Loading & Error States =====
  function showLoading() {
    els.itemsGrid.innerHTML = `
      <div class="skeleton" style="height: 220px; grid-column: 1 / -1; max-width: 340px;"></div>
      <div class="skeleton" style="height: 220px; grid-column: 1 / -1; max-width: 340px;"></div>
      <div class="skeleton" style="height: 220px; grid-column: 1 / -1; max-width: 340px;"></div>
    `;
  }

  function showError(message) {
    els.itemsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state__icon">⚠️</div>
        <div class="empty-state__title">加载失败</div>
        <div class="empty-state__desc">${escapeHtml(message)}</div>
      </div>
    `;
  }

  function updateFooter() {
    els.footerYear.textContent = new Date().getFullYear();
  }

  // ===== Event Binding =====
  function bindEvents() {
    // Search input
    let debounceTimer;
    els.searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      els.searchClear.classList.toggle('visible', searchQuery.length > 0);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => renderItems(), 200);
    });

    // Clear search
    els.searchClear.addEventListener('click', () => {
      els.searchInput.value = '';
      searchQuery = '';
      els.searchClear.classList.remove('visible');
      renderItems();
      els.searchInput.focus();
    });

    // Keyboard shortcut: Ctrl+K / Cmd+K to focus search
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        els.searchInput.focus();
        els.searchInput.select();
      }
      // Escape to clear search
      if (e.key === 'Escape' && searchQuery) {
        els.searchInput.value = '';
        searchQuery = '';
        els.searchClear.classList.remove('visible');
        renderItems();
      }
    });

    // Back to top button
    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
      window.addEventListener('scroll', () => {
        backToTop.classList.toggle('visible', window.scrollY > 400);
      });
      backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  // ===== Utility =====
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ===== Start =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
