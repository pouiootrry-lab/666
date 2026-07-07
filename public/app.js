/* ===================================================
   網門電通 — 工具出借即時同步系統
   Frontend Application Logic (with Admin Panel)
   =================================================== */

(function () {
  'use strict';

  // --- State ---
  let records = [];
  let tools = [];
  let staffNames = [];
  let vehicleTags = [];
  let locationTags = [];
  let categories = [];
  let activeStatuses = {};
  let selectedStaff = { checkout: [], return: [] };
  let historyFilter = 'all';
  let historySearch = '';
  let historyDateFilter = '';
  let currentModalRecordId = null;
  let socket = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // --- Init ---
  function init() {
    connectSocket();
    bindEvents();
    const today = new Date();
    const dateStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');
    $('#borrow-date').value = dateStr;
  }

  // --- Socket Connection ---
  function connectSocket() {
    socket = io();

    socket.on('connect', () => {
      updateConnectionStatus(true);
      socket.emit('identify', 'user_' + Math.random().toString(36).substr(2, 4));
    });

    socket.on('disconnect', () => updateConnectionStatus(false));

    socket.on('init', (data) => {
      records = data.records || [];
      tools = data.tools || [];
      staffNames = data.staffNames || [];
      vehicleTags = data.vehicleTags || [];
      locationTags = data.locationTags || [];
      categories = data.categories || [];

      renderAll();
    });

    socket.on('records-refresh', (newRecords) => {
      records = newRecords;
      renderHistory();
      renderActiveTools();
      renderToolsList();
    });

    socket.on('config-refresh', (config) => {
      tools = config.tools || tools;
      staffNames = config.staffNames || staffNames;
      vehicleTags = config.vehicleTags || vehicleTags;
      locationTags = config.locationTags || locationTags;
      categories = config.categories || categories;
      renderAll();
      showToast('info', '📡 設定已即時同步更新');
    });

    socket.on('online-count', (count) => {
      $('#online-count').textContent = count;
    });
  }

  function renderAll() {
    renderVehicleTags();
    renderLocationTags();
    renderToolsList();
    renderStaffSelectors();
    renderHistory();
    renderActiveTools();
    renderAdminPanel();
  }

  function updateConnectionStatus(connected) {
    const el = $('#connection-status');
    el.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    $('.status-text').textContent = connected ? '已連線' : '連線中斷...';
    if (connected) {
      el.style.opacity = '1';
      setTimeout(() => { el.style.opacity = '0'; }, 2000);
    }
    $('#sync-pulse').style.display = connected ? 'flex' : 'none';
  }

  // --- Event Bindings ---
  function bindEvents() {
    // Tab navigation
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        $$('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        $(`#${btn.dataset.tab}`).classList.add('active');
      });
    });

    // Tool search
    $('#tool-search').addEventListener('input', () => renderToolsList());

    // History search & filters
    $('#history-search').addEventListener('input', (e) => {
      historySearch = e.target.value.trim().toLowerCase();
      renderHistory();
    });
    $('#history-date-filter').addEventListener('change', (e) => {
      historyDateFilter = e.target.value;
      renderHistory();
    });
    $$('#history-tab .filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('#history-tab .filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        historyFilter = tab.dataset.filter;
        renderHistory();
      });
    });

    // Form actions
    $('#reset-form-btn').addEventListener('click', () => {
      if (confirm('確定要清除目前輸入的內容嗎？')) resetForm();
    });
    $('#save-record-btn').addEventListener('click', saveRecord);

    // Modal
    $('#close-modal-btn').addEventListener('click', closeModal);
    $('#modal-close-foot-btn').addEventListener('click', closeModal);
    $('#modal-delete-btn').addEventListener('click', () => {
      if (currentModalRecordId && confirm('確定要刪除此紀錄嗎？')) {
        socket.emit('delete-record', currentModalRecordId);
        closeModal();
        showToast('warning', '🗑️ 紀錄已刪除');
      }
    });
    $('#record-modal').addEventListener('click', (e) => {
      if (e.target === $('#record-modal')) closeModal();
    });

    // ===== Admin Events =====
    // Staff
    $('#admin-add-staff-btn').addEventListener('click', () => {
      const input = $('#admin-new-staff');
      const name = input.value.trim();
      if (name) {
        socket.emit('add-staff', name);
        input.value = '';
        showToast('success', `👤 已新增人員: ${name}`);
      }
    });
    $('#admin-new-staff').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('#admin-add-staff-btn').click();
    });

    // Tools
    $('#admin-add-tool-btn').addEventListener('click', () => {
      const nameInput = $('#admin-new-tool-name');
      const catSelect = $('#admin-new-tool-category');
      const name = nameInput.value.trim();
      if (name) {
        socket.emit('add-tool', { name, category: catSelect.value });
        nameInput.value = '';
        showToast('success', `🔧 已新增工具: ${name}`);
      }
    });
    $('#admin-new-tool-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('#admin-add-tool-btn').click();
    });

    // Categories
    $('#admin-add-category-btn').addEventListener('click', () => {
      const input = $('#admin-new-category');
      const cat = input.value.trim();
      if (cat && !categories.includes(cat)) {
        // Add category by adding a placeholder tool (or just trigger config update)
        // For simplicity, add it as a new tool with that category
        socket.emit('add-tool', { name: `${cat} — 新工具`, category: cat });
        input.value = '';
        showToast('success', `📂 已新增分類: ${cat}`);
      }
    });

    // Vehicle tags
    $('#admin-add-vehicle-btn').addEventListener('click', () => {
      const input = $('#admin-new-vehicle');
      const tag = input.value.trim();
      if (tag) {
        socket.emit('add-vehicle-tag', tag);
        input.value = '';
        showToast('success', `🚗 已新增車號: ${tag}`);
      }
    });
    $('#admin-new-vehicle').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('#admin-add-vehicle-btn').click();
    });

    // Location tags
    $('#admin-add-location-btn').addEventListener('click', () => {
      const input = $('#admin-new-location');
      const tag = input.value.trim();
      if (tag) {
        socket.emit('add-location-tag', tag);
        input.value = '';
        showToast('success', `📍 已新增地點: ${tag}`);
      }
    });
    $('#admin-new-location').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('#admin-add-location-btn').click();
    });

    // Clear all records
    $('#admin-clear-records-btn').addEventListener('click', () => {
      if (confirm('⚠️ 確定要清除【所有】出借紀錄嗎？此動作無法復原！')) {
        if (confirm('再次確認：真的要刪除全部紀錄嗎？')) {
          socket.emit('clear-all-records');
          showToast('warning', '🗑️ 所有紀錄已清除');
        }
      }
    });
  }

  // --- Render Quick Tags ---
  function renderVehicleTags() {
    const container = $('#vehicle-tags');
    container.innerHTML = vehicleTags.map(v =>
      `<span class="quick-tag" data-value="${esc(v)}">${esc(v)}</span>`
    ).join('');
    container.onclick = (e) => {
      if (e.target.classList.contains('quick-tag'))
        $('#vehicle-num').value = e.target.dataset.value;
    };
  }

  function renderLocationTags() {
    const container = $('#location-tags');
    container.innerHTML = locationTags.map(l =>
      `<span class="quick-tag" data-value="${esc(l)}">${esc(l)}</span>`
    ).join('');
    container.onclick = (e) => {
      if (e.target.classList.contains('quick-tag'))
        $('#location').value = e.target.dataset.value;
    };
  }

  // --- Render Staff Selectors ---
  function renderStaffSelectors() {
    renderStaffGroup('checkout-staff', 'checkout');
    renderStaffGroup('return-staff', 'return');
  }

  function renderStaffGroup(containerId, type) {
    const container = $(`#${containerId}`);
    container.innerHTML = '';
    staffNames.forEach(name => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `staff-btn ${selectedStaff[type].includes(name) ? 'active' : ''}`;
      btn.textContent = name;
      btn.addEventListener('click', () => {
        const idx = selectedStaff[type].indexOf(name);
        if (idx > -1) selectedStaff[type].splice(idx, 1);
        else selectedStaff[type].push(name);
        renderStaffGroup(containerId, type);
      });
      container.appendChild(btn);
    });
  }

  // --- Tool Availability ---
  function getToolAvailability() {
    const borrowed = new Set();
    const onsiteMap = new Map();
    records.forEach(record => {
      if (record.returnedAt) return;
      record.items.forEach(item => {
        if (item.status === 'checkout') borrowed.add(item.toolId);
        else if (item.status === 'onsite') onsiteMap.set(item.toolId, record.location);
      });
    });
    return { borrowed, onsiteMap };
  }

  // --- Render Tools List ---
  function renderToolsList() {
    const query = ($('#tool-search')?.value || '').trim().toLowerCase();
    const container = $('#tools-container');
    container.innerHTML = '';

    const { borrowed, onsiteMap } = getToolAvailability();
    const currentLocation = ($('#location')?.value || '').trim().toLowerCase();

    categories.forEach(cat => {
      const catTools = tools.filter(t => t.category === cat && t.name.toLowerCase().includes(query));
      if (catTools.length === 0) return;

      const card = document.createElement('div');
      card.className = 'category-card';

      const header = document.createElement('div');
      header.className = 'category-header';
      header.innerHTML = `
        <span class="category-title">${esc(cat)}</span>
        <div class="batch-actions">
          <button class="batch-btn" data-action="checkout">全借</button>
          <button class="batch-btn" data-action="return">全還</button>
          <button class="batch-btn" data-action="onsite">全現</button>
          <button class="batch-btn" data-action="clear">清除</button>
        </div>
      `;
      header.querySelectorAll('.batch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          catTools.forEach(tool => {
            const isBorrowed = borrowed.has(tool.id);
            const isOnsite = onsiteMap.has(tool.id);
            const onsiteLoc = onsiteMap.get(tool.id) || '';
            const isDisabled = isBorrowed || (isOnsite && currentLocation && onsiteLoc.toLowerCase() !== currentLocation);
            if (!isDisabled) {
              activeStatuses[tool.id] = btn.dataset.action === 'clear' ? null : btn.dataset.action;
            }
          });
          renderToolsList();
        });
      });
      card.appendChild(header);

      const list = document.createElement('div');
      catTools.forEach(tool => {
        const isBorrowed = borrowed.has(tool.id);
        const isOnsite = onsiteMap.has(tool.id);
        const onsiteLoc = onsiteMap.get(tool.id) || '';
        const matchLoc = isOnsite && currentLocation && onsiteLoc.toLowerCase() === currentLocation;
        const isDisabled = isBorrowed || (isOnsite && !matchLoc);
        const currentStatus = activeStatuses[tool.id] || null;

        const row = document.createElement('div');
        row.className = `tool-row ${isDisabled ? 'disabled' : ''}`;

        let nameHtml = `<span class="tool-name-text">${esc(tool.name)}`;
        if (isBorrowed) nameHtml += `<span class="tool-status-tag borrowed">已借出</span>`;
        else if (isOnsite) nameHtml += `<span class="tool-status-tag onsite">現場 (${esc(onsiteLoc)})</span>`;
        nameHtml += `</span>`;

        const btns = ['checkout', 'return', 'onsite'];
        const labels = { checkout: '借出', return: '歸還', onsite: '現場' };
        let btnsHtml = '<div class="status-buttons">';
        btns.forEach(type => {
          btnsHtml += `<button class="status-btn ${currentStatus === type ? 'active' : ''}" data-type="${type}" data-tool="${tool.id}" ${isDisabled ? 'disabled' : ''}>${labels[type]}</button>`;
        });
        btnsHtml += '</div>';
        row.innerHTML = nameHtml + btnsHtml;

        row.querySelectorAll('.status-btn').forEach(btn => {
          if (!btn.disabled) {
            btn.addEventListener('click', () => {
              activeStatuses[btn.dataset.tool] = activeStatuses[btn.dataset.tool] === btn.dataset.type ? null : btn.dataset.type;
              renderToolsList();
            });
          }
        });
        list.appendChild(row);
      });
      card.appendChild(list);
      container.appendChild(card);
    });

    if (container.children.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>找不到符合的工具</p></div>';
    }
  }

  // --- Save Record ---
  function saveRecord() {
    const date = $('#borrow-date').value;
    const vehicle = $('#vehicle-num').value.trim();
    const location = $('#location').value.trim();

    if (!date || !vehicle || !location) { alert('請填寫日期、車號與施工地點！'); return; }

    const items = [];
    Object.keys(activeStatuses).forEach(toolId => {
      const status = activeStatuses[toolId];
      if (status) {
        const tool = tools.find(t => t.id === toolId);
        if (tool) items.push({ toolId: tool.id, name: tool.name, category: tool.category, status });
      }
    });

    if (items.length === 0) { alert('請至少選擇一項工具並標記狀態！'); return; }
    if (selectedStaff.checkout.length === 0) { alert('請選擇「借出人員」！'); return; }

    socket.emit('submit-record', {
      date, vehicle, location, items,
      checkoutStaff: [...selectedStaff.checkout],
      returnStaff: [...selectedStaff.return]
    });

    showToast('success', `✅ 出借登記已儲存 (${items.length} 項工具)`);
    resetForm();
  }

  function resetForm() {
    $('#vehicle-num').value = '';
    $('#location').value = '';
    $('#tool-search').value = '';
    activeStatuses = {};
    selectedStaff = { checkout: [], return: [] };
    renderStaffSelectors();
    renderToolsList();
    const today = new Date();
    $('#borrow-date').value = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');
  }

  // --- Render History ---
  function renderHistory() {
    const container = $('#history-list');
    container.innerHTML = '';

    let filtered = records;
    if (historyFilter === 'active') filtered = filtered.filter(r => !r.returnedAt);
    else if (historyFilter === 'returned') filtered = filtered.filter(r => !!r.returnedAt);
    if (historyDateFilter) filtered = filtered.filter(r => r.date === historyDateFilter);
    if (historySearch) {
      filtered = filtered.filter(r =>
        (r.vehicle || '').toLowerCase().includes(historySearch) ||
        (r.location || '').toLowerCase().includes(historySearch) ||
        (r.checkoutStaff || []).join(',').toLowerCase().includes(historySearch)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>沒有符合條件的紀錄</p></div>';
      return;
    }

    filtered.forEach(record => {
      const checkoutCount = record.items.filter(i => i.status === 'checkout').length;
      const returnCount = record.items.filter(i => i.status === 'return').length;
      const onsiteCount = record.items.filter(i => i.status === 'onsite').length;
      const isReturned = !!record.returnedAt;

      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div class="history-meta">
          <span class="history-date">${record.date}</span>
          <span class="history-tag">🚗 ${esc(record.vehicle)}</span>
          <span class="history-tag">📍 ${esc(record.location)}</span>
          <span class="history-status-badge ${isReturned ? 'returned-loan' : 'active-loan'}">
            ${isReturned ? '✅ 已歸還' : '📦 外借中'}
          </span>
        </div>
        <div class="history-stats">
          借出: <strong style="color:var(--accent-amber)">${checkoutCount}</strong> 項 |
          歸還: <strong style="color:var(--accent-green)">${returnCount}</strong> 項 |
          現場: <strong style="color:var(--accent-blue)">${onsiteCount}</strong> 項
        </div>
        <div class="history-staff">👤 ${esc((record.checkoutStaff || []).join(', '))}</div>
      `;
      item.addEventListener('click', () => openModal(record.id));
      container.appendChild(item);
    });
  }

  // --- Render Active Tools ---
  function renderActiveTools() {
    const container = $('#active-tools-list');
    container.innerHTML = '';

    const activeItems = [];
    records.forEach(record => {
      if (record.returnedAt) return;
      record.items.forEach(item => {
        if (item.status === 'checkout' || item.status === 'onsite') {
          activeItems.push({
            ...item, vehicle: record.vehicle, location: record.location,
            date: record.date, staff: record.checkoutStaff, recordId: record.id
          });
        }
      });
    });

    const badge = $('#active-badge');
    const countLabel = $('#active-count-label');
    if (activeItems.length > 0) {
      badge.style.display = 'flex';
      badge.textContent = activeItems.length;
      countLabel.textContent = `${activeItems.length} 項工具未歸還`;
    } else {
      badge.style.display = 'none';
      countLabel.textContent = '所有工具已歸還 ✅';
    }

    if (activeItems.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><p>所有工具皆已歸還</p></div>';
      return;
    }

    activeItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'active-tool-card';
      const statusLabel = item.status === 'checkout' ? '借出中' : '在現場';
      const statusColor = item.status === 'checkout' ? 'var(--accent-amber)' : 'var(--accent-blue)';
      card.innerHTML = `
        <div class="active-tool-info">
          <div class="active-tool-name">${esc(item.name)}</div>
          <div class="active-tool-meta">
            🚗 ${esc(item.vehicle)} · 📍 ${esc(item.location)} · 👤 ${esc((item.staff || []).join(', '))} · ${item.date}
          </div>
        </div>
        <span style="padding:4px 12px;border-radius:999px;font-size:0.72rem;font-weight:600;color:${statusColor};background:${statusColor}20;border:1px solid ${statusColor}40;">${statusLabel}</span>
      `;
      container.appendChild(card);
    });
  }

  // --- Modal ---
  function openModal(recordId) {
    const record = records.find(r => r.id === recordId);
    if (!record) return;
    currentModalRecordId = recordId;
    $('#modal-title').textContent = `紀錄明細 — ${record.date}`;
    const statusLabels = { checkout: '借出', return: '歸還', onsite: '現場' };

    // Active items (not yet returned) that can be acted on
    const activeItems = record.items.filter(i => i.status === 'checkout' || i.status === 'onsite');
    const doneItems = record.items.filter(i => i.status === 'return');

    let html = `
      <div class="detail-row"><span class="detail-label">📅 日期</span><span class="detail-value">${record.date}</span></div>
      <div class="detail-row"><span class="detail-label">🚗 車號</span><span class="detail-value">${esc(record.vehicle)}</span></div>
      <div class="detail-row"><span class="detail-label">📍 地點</span><span class="detail-value">${esc(record.location)}</span></div>
      <div class="detail-row"><span class="detail-label">狀態</span><span class="detail-value">${record.returnedAt ? '✅ 已歸還' : '📦 外借中'}</span></div>
    `;

    // Already returned items (read-only)
    if (doneItems.length > 0) {
      html += `
        <div class="detail-tools-list">
          <div class="detail-staff-label">✅ 已歸還 (${doneItems.length} 項)</div>
          ${doneItems.map(item => `
            <div class="detail-tool-item">
              <span class="detail-tool-name">${esc(item.name)}</span>
              <span class="detail-tool-status return">${statusLabels[item.status] || item.status}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Active items with interactive return/onsite selection
    if (activeItems.length > 0 && !record.returnedAt) {
      html += `
        <div class="detail-tools-list" id="modal-active-items">
          <div class="detail-staff-label" style="display:flex;align-items:center;justify-content:space-between;">
            <span>📦 外借中 / 現場 (${activeItems.length} 項)</span>
            <div style="display:flex;gap:6px;">
              <button class="btn-mini btn-mini-return" id="modal-select-all-return">全選歸還</button>
              <button class="btn-mini btn-mini-onsite" id="modal-select-all-onsite">全選現場</button>
              <button class="btn-mini btn-mini-clear" id="modal-deselect-all">清除</button>
            </div>
          </div>
          ${activeItems.map(item => `
            <div class="detail-tool-item modal-item-row" data-tool-id="${esc(item.toolId)}">
              <span class="detail-tool-name">${esc(item.name)}</span>
              <span class="detail-tool-status ${item.status}">${statusLabels[item.status] || item.status}</span>
              <div class="modal-item-actions">
                <button class="modal-action-btn modal-return-btn ${item.status === 'return' ? 'active' : ''}" data-tool-id="${esc(item.toolId)}" data-action="return">歸還</button>
                <button class="modal-action-btn modal-onsite-btn ${item.status === 'onsite' ? 'active-onsite' : ''}" data-tool-id="${esc(item.toolId)}" data-action="onsite">現場</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (activeItems.length > 0 && record.returnedAt) {
      html += `
        <div class="detail-tools-list">
          <div class="detail-staff-label">📦 工具清單 (${record.items.length} 項)</div>
          ${record.items.map(item => `
            <div class="detail-tool-item">
              <span class="detail-tool-name">${esc(item.name)}</span>
              <span class="detail-tool-status ${item.status}">${statusLabels[item.status] || item.status}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    html += `
      <div class="detail-staff-section">
        <div class="detail-staff-label">👤 借出人員</div>
        <div class="detail-staff-names">
          ${(record.checkoutStaff || []).map(n => `<span class="detail-staff-badge">${esc(n)}</span>`).join('')}
        </div>
      </div>
    `;

    if (record.returnStaff && record.returnStaff.length > 0) {
      html += `
        <div class="detail-staff-section">
          <div class="detail-staff-label">👤 歸還人員</div>
          <div class="detail-staff-names">
            ${record.returnStaff.map(n => `<span class="detail-staff-badge" style="background:rgba(16,185,129,0.15);color:var(--accent-green);">${esc(n)}</span>`).join('')}
          </div>
        </div>
      `;
    }

    // Return staff selector + confirm button (only if not fully returned)
    if (!record.returnedAt && activeItems.length > 0) {
      html += `
        <div class="detail-staff-section" style="margin-top:16px;">
          <div class="detail-staff-label">👤 選擇歸還人員</div>
          <div class="modal-return-staff" id="modal-return-staff-selector">
            ${staffNames.map(name => `
              <button type="button" class="staff-btn modal-staff-pick" data-name="${esc(name)}">${esc(name)}</button>
            `).join('')}
          </div>
        </div>
        <div style="margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-success btn-lg" id="modal-partial-return-btn">✅ 確認更新狀態</button>
          <button class="btn btn-warning btn-lg" id="modal-return-all-btn">⚡ 全部歸還</button>
        </div>
      `;
    }

    $('#modal-body').innerHTML = html;
    $('#record-modal').classList.add('show');

    // Track per-item action selections
    const itemActions = {};
    activeItems.forEach(item => { itemActions[item.toolId] = null; });

    // Track selected return staff
    let modalReturnStaff = [];

    // Item action button logic
    const updateItemBtn = (toolId, action) => {
      const row = document.querySelector(`.modal-item-row[data-tool-id="${toolId}"]`);
      if (!row) return;
      row.querySelectorAll('.modal-action-btn').forEach(b => {
        b.classList.remove('active', 'active-onsite');
      });
      if (action === 'return') {
        row.querySelector('.modal-return-btn')?.classList.add('active');
      } else if (action === 'onsite') {
        row.querySelector('.modal-onsite-btn')?.classList.add('active-onsite');
      }
    };

    document.querySelectorAll('.modal-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const toolId = btn.dataset.toolId;
        const action = btn.dataset.action;
        // Toggle: click same again = deselect
        itemActions[toolId] = itemActions[toolId] === action ? null : action;
        updateItemBtn(toolId, itemActions[toolId]);
      });
    });

    // Batch select buttons
    const selectAll = (action) => {
      activeItems.forEach(item => {
        itemActions[item.toolId] = action;
        updateItemBtn(item.toolId, action);
      });
    };
    document.getElementById('modal-select-all-return')?.addEventListener('click', () => selectAll('return'));
    document.getElementById('modal-select-all-onsite')?.addEventListener('click', () => selectAll('onsite'));
    document.getElementById('modal-deselect-all')?.addEventListener('click', () => {
      activeItems.forEach(item => {
        itemActions[item.toolId] = null;
        updateItemBtn(item.toolId, null);
      });
    });

    // Return staff selector
    document.querySelectorAll('.modal-staff-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const idx = modalReturnStaff.indexOf(name);
        if (idx > -1) { modalReturnStaff.splice(idx, 1); btn.classList.remove('active'); }
        else { modalReturnStaff.push(name); btn.classList.add('active'); }
      });
    });

    // Confirm partial return
    document.getElementById('modal-partial-return-btn')?.addEventListener('click', () => {
      const updates = Object.entries(itemActions).filter(([, action]) => action !== null);
      if (updates.length === 0) { showToast('warning', '請先選擇要更新的工具項目！'); return; }
      if (modalReturnStaff.length === 0) { showToast('warning', '請選擇歸還人員！'); return; }

      // Build updated items array
      const updatedItems = record.items.map(item => {
        const newAction = itemActions[item.toolId];
        if (newAction !== null && newAction !== undefined) {
          return { ...item, status: newAction };
        }
        return item;
      });

      // Check if all items are returned
      const allReturned = updatedItems.every(i => i.status === 'return');

      socket.emit('edit-record', {
        id: record.id,
        items: updatedItems,
        returnStaff: modalReturnStaff,
        returnedAt: allReturned ? new Date().toISOString() : null
      });

      closeModal();
      showToast('success', `✅ 已更新 ${updates.length} 項工具狀態`);
    });

    // Return all button
    document.getElementById('modal-return-all-btn')?.addEventListener('click', () => {
      const staff = modalReturnStaff.length > 0 ? modalReturnStaff : record.checkoutStaff;
      socket.emit('return-record', { recordId, returnStaff: staff });
      closeModal();
      showToast('success', '✅ 工具已全部歸還');
    });
  }

  function closeModal() {
    $('#record-modal').classList.remove('show');
    currentModalRecordId = null;
  }


  // ===================================================
  //  ADMIN PANEL RENDERING
  // ===================================================

  function renderAdminPanel() {
    renderAdminStaff();
    renderAdminTools();
    renderAdminVehicles();
    renderAdminLocations();
    updateCategorySelect();
  }

  function renderAdminStaff() {
    const container = $('#admin-staff-list');
    if (!container) return;
    container.innerHTML = staffNames.map(name =>
      `<div class="admin-item">
        <span>${esc(name)}</span>
        <button class="admin-remove-btn" data-name="${esc(name)}" title="移除 ${esc(name)}">✕</button>
      </div>`
    ).join('');
    container.querySelectorAll('.admin-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = btn.dataset.name;
        if (confirm(`確定要移除人員「${name}」嗎？`)) {
          socket.emit('remove-staff', name);
          showToast('warning', `👤 已移除人員: ${name}`);
        }
      });
    });
  }

  function renderAdminTools() {
    const container = $('#admin-tools-list');
    if (!container) return;
    container.innerHTML = '';

    const countEl = $('#admin-tool-count');
    if (countEl) countEl.textContent = `${tools.length} 項`;

    categories.forEach(cat => {
      const catTools = tools.filter(t => t.category === cat);
      if (catTools.length === 0) return;

      const catDiv = document.createElement('div');
      catDiv.className = 'admin-tool-category';
      catDiv.innerHTML = `<div class="admin-tool-cat-header">${esc(cat)} (${catTools.length})</div>`;

      catTools.forEach(tool => {
        const row = document.createElement('div');
        row.className = 'admin-tool-item';
        row.innerHTML = `
          <span>
            <span class="admin-tool-item-name">${esc(tool.name)}</span>
            <span class="admin-tool-item-id">${tool.id}</span>
          </span>
          <button class="admin-remove-btn" data-tool-id="${tool.id}" title="移除 ${esc(tool.name)}">✕</button>
        `;
        row.querySelector('.admin-remove-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`確定要移除工具「${tool.name}」嗎？`)) {
            socket.emit('remove-tool', tool.id);
            showToast('warning', `🔧 已移除工具: ${tool.name}`);
          }
        });
        catDiv.appendChild(row);
      });

      container.appendChild(catDiv);
    });
  }

  function renderAdminVehicles() {
    const container = $('#admin-vehicle-list');
    if (!container) return;
    container.innerHTML = vehicleTags.map(tag =>
      `<div class="admin-item">
        <span>🚗 ${esc(tag)}</span>
        <button class="admin-remove-btn" data-tag="${esc(tag)}" title="移除">✕</button>
      </div>`
    ).join('');
    container.querySelectorAll('.admin-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        socket.emit('remove-vehicle-tag', btn.dataset.tag);
        showToast('warning', `🚗 已移除車號: ${btn.dataset.tag}`);
      });
    });
  }

  function renderAdminLocations() {
    const container = $('#admin-location-list');
    if (!container) return;
    container.innerHTML = locationTags.map(tag =>
      `<div class="admin-item">
        <span>📍 ${esc(tag)}</span>
        <button class="admin-remove-btn" data-tag="${esc(tag)}" title="移除">✕</button>
      </div>`
    ).join('');
    container.querySelectorAll('.admin-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        socket.emit('remove-location-tag', btn.dataset.tag);
        showToast('warning', `📍 已移除地點: ${btn.dataset.tag}`);
      });
    });
  }

  function updateCategorySelect() {
    const select = $('#admin-new-tool-category');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = categories.map(cat =>
      `<option value="${esc(cat)}" ${cat === currentVal ? 'selected' : ''}>${esc(cat)}</option>`
    ).join('');
  }

  // --- Toast ---
  function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    $('#toast-container').appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // --- Helpers ---
  function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
