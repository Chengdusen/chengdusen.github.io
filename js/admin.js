/**
 * DSShed Admin — Online Admin Panel
 * Manages site data via GitHub API.
 */
(function () {
  'use strict';

  // ===== State =====
  const REPO = 'chengdusen/chengdusen.github.io';
  const DATA_PATH = 'data/data.json';
  const STORAGE_KEY_TOKEN = 'dsshed_github_token';
  const STORAGE_KEY_PASSWORD_HASH = 'dsshed_admin_password_hash';
  const STORAGE_KEY_REPO = 'dsshed_github_repo';

  let githubToken = '';
  let repo = REPO;
  let data = null;
  let dataSha = null;
  let selectedItemId = null;
  let editingItemId = null;
  let currentTags = [];
  let logs = [];

  // ===== DOM Helpers =====
  const $ = (id) => document.getElementById(id);

  // ===== Init =====
  function init() {
    // Check for stored credentials
    const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    const storedRepo = localStorage.getItem(STORAGE_KEY_REPO);
    if (storedToken) {
      githubToken = storedToken;
      $('login-token').value = storedToken;
    }
    if (storedRepo) {
      repo = storedRepo;
      $('login-repo').value = storedRepo;
    }

    // Bind live preview
    ['item-icon','item-name','item-desc','item-version','item-size','item-category'].forEach(fid => {
      const el = $(fid);
      if (el) {
        el.addEventListener('input', updatePreview);
        el.addEventListener('change', updatePreview);
      }
    });

    // Tags input
    const tagsInput = $('tags-input');
    if (tagsInput) {
      tagsInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = this.value.trim();
          if (val && !currentTags.includes(val)) {
            currentTags.push(val);
            renderTags();
          }
          this.value = '';
        }
      });
    }
  }

  // ===== Login =====
  window.handleLogin = async function() {
    const token = $('login-token').value.trim();
    const password = $('login-password').value.trim();
    const repoInput = $('login-repo').value.trim();

    if (!token) return showLoginError('请输入 GitHub Token');
    if (!password) return showLoginError('请输入管理密码');
    if (!repoInput) return showLoginError('请输入仓库路径');

    // Verify token by fetching repo info
    $('login-error').textContent = '⏳ 验证 Token...';

    try {
      const res = await fetch(`https://api.github.com/repos/${repoInput}`, {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
      });

      if (!res.ok) {
        if (res.status === 401) return showLoginError('Token 无效或已过期');
        if (res.status === 404) return showLoginError('仓库不存在，请检查仓库路径');
        return showLoginError(`GitHub API 错误: ${res.status}`);
      }

      // Token valid, check password
      const storedHash = localStorage.getItem(STORAGE_KEY_PASSWORD_HASH);
      const inputHash = await sha256(password);

      if (storedHash && storedHash !== inputHash) {
        return showLoginError('密码错误');
      }

      // First time or password matches — store
      if (!storedHash) {
        localStorage.setItem(STORAGE_KEY_PASSWORD_HASH, inputHash);
      }

      githubToken = token;
      repo = repoInput;
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_REPO, repoInput);

      // Hide login, show admin
      $('login-screen').style.display = 'none';
      $('admin-screen').style.display = 'block';

      addLog('登录成功', 'success');
      await syncFromGitHub();

    } catch (err) {
      showLoginError(`网络错误: ${err.message}`);
    }
  };

  function showLoginError(msg) {
    $('login-error').textContent = '❌ ' + msg;
  }

  window.handleLogout = function() {
    if (confirm('确定要退出吗？Token 将保留在浏览器中，下次可直接登录。')) {
      $('login-screen').style.display = 'flex';
      $('admin-screen').style.display = 'none';
      data = null;
      addLog('已退出', 'info');
    }
  };

  // ===== GitHub API =====
  async function githubAPI(method, path, body) {
    const url = `https://api.github.com/repos/${repo}/contents/${path}`;
    const headers = {
      Authorization: `token ${githubToken}`,
      Accept: 'application/vnd.github.v3+json'
    };

    const opts = { method, headers };
    if (body) {
      opts.body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API ${res.status}`);
    }
    return res.json();
  }

  window.syncFromGitHub = async function() {
    try {
      $('sync-status').textContent = '🔄 同步中...';
      const file = await githubAPI('GET', DATA_PATH);
      const content = JSON.parse(atob(file.content));
      data = content;
      dataSha = file.sha;
      $('sync-status').textContent = '🟢 已同步';
      refreshAll();
      addLog('已从 GitHub 同步数据', 'success');
    } catch (err) {
      $('sync-status').textContent = '🔴 同步失败';
      addLog(`同步失败: ${err.message}`, 'error');
      toast('❌ 同步失败: ' + err.message, 'error');
    }
  };

  async function commitToGitHub(message) {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const body = {
      message,
      content,
      sha: dataSha
    };

    try {
      $('sync-status').textContent = '🔄 提交中...';
      const result = await githubAPI('PUT', DATA_PATH, body);
      dataSha = result.content.sha;
      $('sync-status').textContent = '🟢 已同步';
      addLog(`已提交: ${message}`, 'success');
      return true;
    } catch (err) {
      $('sync-status').textContent = '🔴 提交失败';
      addLog(`提交失败: ${err.message}`, 'error');
      toast('❌ 提交失败: ' + err.message, 'error');
      return false;
    }
  }

  // ===== Navigation =====
  window.switchPanel = function(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav__item').forEach(b => b.classList.remove('active'));
    $(`panel-${name}`).classList.add('active');
    document.querySelector(`[data-panel="${name}"]`).classList.add('active');

    if (name === 'items') refreshItemsList();
    if (name === 'categories') refreshCategoryList();
    if (name === 'settings') loadSettings();
    if (name === 'logs') renderLogs();
  };

  // ===== Items =====
  function refreshItemsList() {
    if (!data) return;
    const filterText = ($('items-filter')?.value || '').toLowerCase();
    let items = data.items;
    if (filterText) {
      items = items.filter(i =>
        i.name.toLowerCase().includes(filterText) ||
        i.description.toLowerCase().includes(filterText)
      );
    }

    const container = $('items-list');
    if (items.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">📭 没有匹配的工具项</div>`;
      return;
    }

    container.innerHTML = items.map(item => {
      const cat = data.categories.find(c => c.id === item.categoryId);
      const catName = cat ? cat.name : '未分类';
      const isSel = item.id === selectedItemId ? ' selected' : '';
      return `
        <div class="items-list__item${isSel}" onclick="selectItem('${item.id}')">
          <div class="items-list__icon">${escHtml(item.icon || '📌')}</div>
          <div class="items-list__info">
            <div class="items-list__name">${escHtml(item.name)}</div>
            <div class="items-list__desc">${escHtml(item.description)}</div>
          </div>
        </div>`;
    }).join('');
  }

  window.selectItem = function(id) {
    selectedItemId = id;
    refreshItemsList();
    $('btn-delete').disabled = false;
    const item = data.items.find(i => i.id === id);
    if (item) loadItemIntoForm(item);
  };

  window.addItem = function() {
    editingItemId = null;
    selectedItemId = null;
    $('form-title').textContent = '➕ 新增工具项';
    $('btn-save').textContent = '💾 保存到 GitHub';
    $('btn-delete').disabled = true;
    resetForm();
    refreshItemsList();
  };

  function loadItemIntoForm(item) {
    editingItemId = item.id;
    $('form-title').textContent = '✏️ 编辑工具项';
    $('btn-save').textContent = '💾 更新到 GitHub';
    $('item-id').value = item.id;
    $('item-icon').value = item.icon || '';
    $('item-name').value = item.name || '';
    $('item-desc').value = item.description || '';
    $('item-version').value = item.version || '';
    $('item-size').value = item.size || '';
    $('item-storage').value = item.storageType || 'local';
    $('item-download').value = item.downloadUrl || item.fileUrl || item.toolUrl || '';
    $('item-release').value = item.releaseUrl || '';
    currentTags = item.tags ? [...item.tags] : [];
    renderTags();
    populateCategorySelect(item.categoryId);
  }

  function resetForm() {
    editingItemId = null;
    $('item-id').value = '';
    $('item-icon').value = '📌';
    $('item-name').value = '';
    $('item-desc').value = '';
    $('item-version').value = '';
    $('item-size').value = '';
    $('item-storage').value = 'local';
    $('item-download').value = '';
    $('item-release').value = '';
    currentTags = [];
    renderTags();
    populateCategorySelect();
  }

  window.saveItem = async function(e) {
    e.preventDefault();

    if (!data) {
      toast('❌ 请先同步数据', 'error');
      return;
    }

    const id = editingItemId || generateId();
    const categoryId = $('item-category').value;
    const storageType = $('item-storage').value;
    const downloadValue = $('item-download').value.trim();
    const releaseValue = $('item-release').value.trim();

    const item = {
      id,
      categoryId: categoryId || (data.categories[0] ? data.categories[0].id : ''),
      name: $('item-name').value.trim(),
      icon: $('item-icon').value.trim() || '📌',
      description: $('item-desc').value.trim(),
      version: $('item-version').value.trim() || undefined,
      size: $('item-size').value.trim() || undefined,
      storageType: storageType !== 'local' ? storageType : undefined,
      tags: currentTags.length > 0 ? [...currentTags] : undefined,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };

    // Handle URLs
    if (downloadValue) {
      if (downloadValue.startsWith('http')) item.downloadUrl = downloadValue;
      else if (downloadValue.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)) item.fileUrl = downloadValue;
      else if (downloadValue.startsWith('files/')) item.downloadUrl = downloadValue;
      else item.toolUrl = downloadValue;
    }
    if (releaseValue) item.releaseUrl = releaseValue;

    // Update or add
    const idx = data.items.findIndex(i => i.id === id);
    const isNew = idx < 0;
    if (isNew) {
      data.items.push(item);
    } else {
      data.items[idx] = item;
    }

    const action = isNew ? '添加' : '更新';
    const success = await commitToGitHub(`${action}工具项: ${item.name}`);

    if (success) {
      editingItemId = null;
      $('form-title').textContent = '➕ 新增工具项';
      $('btn-save').textContent = '💾 保存到 GitHub';
      refreshItemsList();
      resetForm();
      toast(`✅ 工具项「${item.name}」已${action}`, 'success');
    }
  };

  window.deleteItem = async function() {
    if (!selectedItemId || !data) return;
    const item = data.items.find(i => i.id === selectedItemId);
    if (!item) return;
    if (!confirm(`确定要删除「${item.name}」吗？此操作不可恢复。`)) return;

    data.items = data.items.filter(i => i.id !== selectedItemId);
    const success = await commitToGitHub(`删除工具项: ${item.name}`);

    if (success) {
      selectedItemId = null;
      $('btn-delete').disabled = true;
      refreshItemsList();
      resetForm();
      toast('🗑 工具项已删除', 'info');
    }
  };

  // ===== Tags =====
  function removeTag(idx) {
    currentTags.splice(idx, 1);
    renderTags();
  }

  function renderTags() {
    const wrapper = $('tags-wrapper');
    if (!wrapper) return;
    const input = $('tags-input');
    const chips = currentTags.map((t, i) =>
      `<span class="tag-chip">${escHtml(t)}<span class="tag-chip__remove" onclick="removeTag(${i});event.stopPropagation();">×</span></span>`
    ).join('');
    wrapper.innerHTML = chips;
    wrapper.appendChild(input);
  }

  window.removeTag = removeTag;

  // ===== Categories =====
  function refreshCategoryList() {
    if (!data) return;
    const container = $('category-list');
    if (data.categories.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">📂 还没有分类</div>`;
      return;
    }
    container.innerHTML = data.categories.map(cat => `
      <div class="category-list__item">
        <input type="text" class="form-input" value="${escHtml(cat.icon)}" style="width:50px;text-align:center;"
          onchange="updateCategory('${cat.id}','icon',this.value)">
        <input type="text" class="form-input" value="${escHtml(cat.name)}"
          onchange="updateCategory('${cat.id}','name',this.value)">
        <input type="text" class="form-input" value="${escHtml(cat.description || '')}" placeholder="描述..."
          onchange="updateCategory('${cat.id}','description',this.value)" style="flex:1;">
        <span style="color:var(--text-muted);font-size:0.82rem;">
          ${data.items.filter(i => i.categoryId === cat.id).length} 项
        </span>
        <button class="btn btn-danger btn-xs" onclick="deleteCategory('${cat.id}')">🗑</button>
      </div>`).join('');
  }

  window.updateCategory = async function(id, field, value) {
    if (!data) return;
    const cat = data.categories.find(c => c.id === id);
    if (!cat) return;
    const oldValue = cat[field];
    cat[field] = value;

    const success = await commitToGitHub(`更新分类 ${cat.name}: ${field}`);
    if (!success) {
      cat[field] = oldValue;
      refreshCategoryList();
    }
    $('cats-badge').textContent = data.categories.length;
  };

  window.addCategory = async function() {
    if (!data) return;
    const id = 'cat-' + Date.now();
    data.categories.push({ id, name: '新分类', icon: '📂', description: '' });

    const success = await commitToGitHub('添加新分类');
    if (success) {
      refreshCategoryList();
      $('cats-badge').textContent = data.categories.length;
    } else {
      data.categories.pop();
    }
  };

  window.deleteCategory = async function(id) {
    if (!data) return;
    const cat = data.categories.find(c => c.id === id);
    if (!cat) return;
    const count = data.items.filter(i => i.categoryId === id).length;
    if (count > 0) {
      if (!confirm(`该分类下有 ${count} 个工具项，删除后这些项的将为"未分类"。确定删除？`)) return;
    }

    data.categories = data.categories.filter(c => c.id !== id);
    const success = await commitToGitHub(`删除分类: ${cat.name}`);
    if (success) {
      refreshCategoryList();
      $('cats-badge').textContent = data.categories.length;
      toast(`🗑 分类「${cat.name}」已删除`, 'info');
    }
  };

  // ===== Settings =====
  function loadSettings() {
    if (!data) return;
    $('site-name').value = data.site.name || '';
    $('site-tagline').value = data.site.tagline || '';
    $('site-owner').value = data.site.owner || '';
  }

  window.saveSiteSettings = async function() {
    if (!data) return;
    data.site.name = $('site-name').value.trim();
    data.site.tagline = $('site-tagline').value.trim();
    data.site.owner = $('site-owner').value.trim();

    const success = await commitToGitHub('更新站点设置');
    if (success) toast('✅ 站点设置已保存', 'success');
  };

  // ===== Logs =====
  function addLog(msg, type) {
    const time = new Date().toLocaleTimeString('zh-CN');
    logs.unshift({ time, msg, type });
    if (logs.length > 100) logs.pop();
    renderLogs();
  }

  function renderLogs() {
    const container = $('logs-container');
    if (!container) return;
    if (logs.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">📜 暂无日志</div>`;
      return;
    }
    container.innerHTML = logs.map(l => `
      <div class="log-entry">
        <span class="log-entry__time">${l.time}</span>
        <span class="log-entry__msg ${l.type}">${escHtml(l.msg)}</span>
      </div>`).join('');
  }

  window.clearLogs = function() {
    logs = [];
    renderLogs();
  };

  // ===== Preview =====
  function updatePreview() {
    // Preview functionality is lightweight in the online panel
    // Mainly shows in the card below the form
  }

  // ===== Utility =====
  function generateId() {
    return 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function populateCategorySelect(selected) {
    if (!data) return;
    const select = $('item-category');
    select.innerHTML = data.categories.map(c =>
      `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${c.icon} ${c.name}</option>`
    ).join('');
  }

  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function refreshAll() {
    refreshItemsList();
    refreshCategoryList();
    loadSettings();
    populateCategorySelect();
    $('items-badge').textContent = data.items.length;
    $('cats-badge').textContent = data.categories.length;
  }

  function toast(msg, type) {
    const container = $('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = '0.3s'; }, 3000);
    setTimeout(() => el.remove(), 3300);
  }

  // ===== Start =====
  init();

  // Expose functions to window for inline handlers
  window.selectItem = window.selectItem;
  window.addItem = window.addItem;
})();