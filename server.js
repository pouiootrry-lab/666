const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// --- Default Tool Database (synced from ndet54770722.com) ---
const defaultTools = [
  { id: "mwq_zk", name: "美沃奇鑽孔電鑽", category: "電鑽" },
  { id: "mwq_a", name: "美沃奇電鑽 A", category: "電鑽" },
  { id: "mwq_b", name: "美沃奇電鑽 B", category: "電鑽" },
  { id: "mwq_c", name: "美沃奇電鑽 C", category: "電鑽" },
  { id: "mkt_zk", name: "MAKITA鑽孔電鑽", category: "電鑽" },
  { id: "mkt_drill", name: "MAKITA電鑽", category: "電鑽" },
  { id: "mkt_pink", name: "MAKITA電鑽(粉)", category: "電鑽" },
  { id: "hlt_a", name: "HILTI大電鑽 A", category: "電鑽" },
  { id: "hlt_b", name: "HILTI大電鑽 B", category: "電鑽" },
  { id: "flk_dsx", name: "Fluke/DSX8000", category: "網路設備" },
  { id: "flk_cha", name: "Fluke/CHA002", category: "網路設備" },
  { id: "netally", name: "NETALLY測試器", category: "網路設備" },
  { id: "scr_a", name: "小螢幕 A", category: "網路設備" },
  { id: "scr_b", name: "小螢幕 B", category: "網路設備" },
  { id: "fiber_weld", name: "光纖熔接機", category: "網路設備" },
  { id: "bh_a", name: "標號機 A", category: "設備" },
  { id: "bh_b", name: "標號機 B", category: "設備" },
  { id: "bh_c", name: "標號機 C", category: "設備" },
  { id: "vac_a", name: "吸塵器 A", category: "設備" },
  { id: "vac_b", name: "吸塵器 B", category: "設備" },
  { id: "saber_a", name: "軍刀機 A", category: "設備" },
  { id: "saber_b", name: "軍刀機 B", category: "設備" },
  { id: "grinder", name: "砂輪機", category: "設備" },
  { id: "mkt_grinder", name: "MAKITA砂輪機", category: "設備" },
  { id: "grinder_cut", name: "砂輪機/切台", category: "設備" },
  { id: "grinder_base", name: "砂輪機/底座式", category: "設備" },
  { id: "band_saw", name: "袋鋸機", category: "設備" },
  { id: "curve_saw", name: "曲線機", category: "設備" },
  { id: "power_box", name: "座電箱", category: "設備" },
  { id: "ladder_5a", name: "5尺梯 A", category: "梯子" },
  { id: "ladder_5b", name: "5尺梯 B", category: "梯子" },
  { id: "ladder_6a", name: "6尺梯 A", category: "梯子" },
  { id: "ladder_6b", name: "6尺梯 B", category: "梯子" },
  { id: "ladder_6c", name: "6尺梯 C", category: "梯子" },
  { id: "ladder_6d", name: "6尺梯 D", category: "梯子" },
  { id: "ladder_7a", name: "7尺梯 A", category: "梯子" },
  { id: "ladder_7b", name: "7尺梯 B", category: "梯子" },
  { id: "ladder_7c", name: "7尺梯 C", category: "梯子" },
  { id: "ladder_8a", name: "8尺梯 A", category: "梯子" },
  { id: "ladder_8b", name: "8尺梯 B", category: "梯子" },
  { id: "ladder_9a", name: "9尺梯 A", category: "梯子" },
  { id: "ladder_9b", name: "9尺梯 B", category: "梯子" },
  { id: "ladder_9c", name: "9尺梯 C", category: "梯子" },
  { id: "ladder_10", name: "10尺梯", category: "梯子" },
  { id: "ladder_12", name: "12尺梯", category: "梯子" },
  { id: "ladder_pull_h", name: "拉梯 高A", category: "梯子" },
  { id: "ladder_pull_l", name: "拉梯 矮B", category: "梯子" },
  { id: "screw_y", name: "螺絲盒 黃A", category: "其他" },
  { id: "screw_g", name: "螺絲盒 綠B", category: "其他" },
  { id: "gun", name: "火藥槍", category: "其他" },
  { id: "ext_a", name: "軸-延長線 A", category: "其他" },
  { id: "ext_b", name: "軸-延長線 B", category: "其他" }
];

// --- Default Staff (synced from ndet54770722.com + 子淵) ---
const defaultStaff = ["阿光", "阿豪", "均濠", "弈豪", "阿凱", "文華", "阿強", "小楊", "冠章", "慶文", "子淵"];

// --- Vehicle & Location Quick Tags ---
const defaultVehicleTags = ["AYK-3162", "AMZ-8133", "1058-YW", "APT-7610"];
const defaultLocationTags = ["群聯", "竹科"];

// --- Tool Categories Order ---
const defaultCategories = ["電鑽", "網路設備", "設備", "梯子", "其他"];

// --- Data Persistence ---
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    // Ensure all fields exist (migration)
    if (!data.tools) data.tools = [...defaultTools];
    if (!data.staffNames) data.staffNames = [...defaultStaff];
    if (!data.vehicleTags) data.vehicleTags = [...defaultVehicleTags];
    if (!data.locationTags) data.locationTags = [...defaultLocationTags];
    if (!data.categories) data.categories = [...defaultCategories];
    if (!data.records) data.records = [];
    return data;
  } catch (e) {
    return {
      tools: [...defaultTools],
      staffNames: [...defaultStaff],
      vehicleTags: [...defaultVehicleTags],
      locationTags: [...defaultLocationTags],
      categories: [...defaultCategories],
      records: []
    };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Initialize data file if needed
const initialData = loadData();
saveData(initialData);

// --- Serve Static Files ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- REST API ---
app.get('/api/config', (req, res) => {
  const data = loadData();
  res.json({
    tools: data.tools,
    staffNames: data.staffNames,
    vehicleTags: data.vehicleTags,
    locationTags: data.locationTags,
    categories: data.categories
  });
});

app.get('/api/records', (req, res) => {
  const data = loadData();
  res.json(data.records);
});

// --- Online Users Tracking ---
let onlineUsers = new Map();

// --- Socket.io Events ---
io.on('connection', (socket) => {
  console.log(`✅ 使用者連線: ${socket.id}`);

  // Send all data on connect
  const data = loadData();
  socket.emit('init', {
    records: data.records,
    tools: data.tools,
    staffNames: data.staffNames,
    vehicleTags: data.vehicleTags,
    locationTags: data.locationTags,
    categories: data.categories,
    onlineCount: onlineUsers.size
  });

  // Identify user
  socket.on('identify', (userName) => {
    onlineUsers.set(socket.id, userName);
    io.emit('online-count', onlineUsers.size);
    console.log(`👤 ${userName} 已上線 (在線: ${onlineUsers.size})`);
  });

  // ==========================================
  //  RECORD OPERATIONS
  // ==========================================

  // Submit a borrow record
  socket.on('submit-record', (payload) => {
    const data = loadData();
    const record = {
      id: generateId(),
      date: payload.date,
      vehicle: payload.vehicle,
      location: payload.location,
      items: payload.items,
      checkoutStaff: payload.checkoutStaff,
      returnStaff: payload.returnStaff || [],
      createdAt: new Date().toISOString(),
      returnedAt: null
    };
    data.records.unshift(record);

    // Cross-record return logic
    const toolsBeingReturned = record.items
      .filter(item => item.status === 'return')
      .map(item => item.toolId);

    if (toolsBeingReturned.length > 0) {
      data.records.forEach(existingRecord => {
        if (existingRecord.id === record.id) return;
        if (existingRecord.returnedAt) return;
        let updated = false;
        existingRecord.items.forEach(item => {
          if (toolsBeingReturned.includes(item.toolId) && item.status !== 'return') {
            item.status = 'return';
            updated = true;
          }
        });
        if (updated) {
          const hasRemaining = existingRecord.items.some(
            item => item.status === 'checkout' || item.status === 'onsite'
          );
          if (!hasRemaining) {
            existingRecord.returnedAt = new Date().toISOString();
            if (existingRecord.returnStaff.length === 0) {
              existingRecord.returnStaff = payload.checkoutStaff;
            }
          }
        }
      });
    }

    saveData(data);
    io.emit('records-refresh', data.records);
    console.log(`📦 新登記: ${record.checkoutStaff.join(',')} | ${record.vehicle} | ${record.location} | ${record.items.length} 項`);
  });

  // Return entire record
  socket.on('return-record', (payload) => {
    const data = loadData();
    const record = data.records.find(r => r.id === payload.recordId);
    if (record && !record.returnedAt) {
      record.items.forEach(item => { if (item.status !== 'return') item.status = 'return'; });
      record.returnedAt = new Date().toISOString();
      record.returnStaff = payload.returnStaff || record.checkoutStaff;
      saveData(data);
      io.emit('records-refresh', data.records);
      console.log(`✅ 全部歸還: ${record.vehicle} | ${record.location}`);
    }
  });

  // Delete a record (admin)
  socket.on('delete-record', (recordId) => {
    const data = loadData();
    const idx = data.records.findIndex(r => r.id === recordId);
    if (idx !== -1) {
      const removed = data.records.splice(idx, 1)[0];
      saveData(data);
      io.emit('records-refresh', data.records);
      console.log(`🗑️ 刪除紀錄: ${removed.vehicle} | ${removed.location}`);
    }
  });

  // Edit a record (admin)
  socket.on('edit-record', (payload) => {
    const data = loadData();
    const record = data.records.find(r => r.id === payload.id);
    if (record) {
      if (payload.date !== undefined) record.date = payload.date;
      if (payload.vehicle !== undefined) record.vehicle = payload.vehicle;
      if (payload.location !== undefined) record.location = payload.location;
      if (payload.checkoutStaff !== undefined) record.checkoutStaff = payload.checkoutStaff;
      if (payload.returnStaff !== undefined) record.returnStaff = payload.returnStaff;
      if (payload.items !== undefined) record.items = payload.items;
      if (payload.returnedAt !== undefined) record.returnedAt = payload.returnedAt;
      saveData(data);
      io.emit('records-refresh', data.records);
      console.log(`✏️ 編輯紀錄: ${record.id}`);
    }
  });

  // Clear all records (admin)
  socket.on('clear-all-records', () => {
    const data = loadData();
    data.records = [];
    saveData(data);
    io.emit('records-refresh', data.records);
    console.log(`🗑️ 已清除所有紀錄`);
  });

  // ==========================================
  //  ADMIN: STAFF MANAGEMENT
  // ==========================================

  socket.on('add-staff', (name) => {
    const data = loadData();
    const trimmed = (name || '').trim();
    if (trimmed && !data.staffNames.includes(trimmed)) {
      data.staffNames.push(trimmed);
      saveData(data);
      io.emit('config-refresh', {
        tools: data.tools,
        staffNames: data.staffNames,
        vehicleTags: data.vehicleTags,
        locationTags: data.locationTags,
        categories: data.categories
      });
      console.log(`👤+ 新增人員: ${trimmed}`);
    }
  });

  socket.on('remove-staff', (name) => {
    const data = loadData();
    const idx = data.staffNames.indexOf(name);
    if (idx !== -1) {
      data.staffNames.splice(idx, 1);
      saveData(data);
      io.emit('config-refresh', {
        tools: data.tools,
        staffNames: data.staffNames,
        vehicleTags: data.vehicleTags,
        locationTags: data.locationTags,
        categories: data.categories
      });
      console.log(`👤- 移除人員: ${name}`);
    }
  });

  // ==========================================
  //  ADMIN: TOOL MANAGEMENT
  // ==========================================

  socket.on('add-tool', (payload) => {
    const data = loadData();
    const newTool = {
      id: 'custom_' + generateId(),
      name: (payload.name || '').trim(),
      category: (payload.category || '其他').trim()
    };
    if (newTool.name) {
      data.tools.push(newTool);
      // Add category if new
      if (!data.categories.includes(newTool.category)) {
        data.categories.push(newTool.category);
      }
      saveData(data);
      io.emit('config-refresh', {
        tools: data.tools,
        staffNames: data.staffNames,
        vehicleTags: data.vehicleTags,
        locationTags: data.locationTags,
        categories: data.categories
      });
      console.log(`🔧+ 新增工具: ${newTool.name} (${newTool.category})`);
    }
  });

  socket.on('remove-tool', (toolId) => {
    const data = loadData();
    const idx = data.tools.findIndex(t => t.id === toolId);
    if (idx !== -1) {
      const removed = data.tools.splice(idx, 1)[0];
      saveData(data);
      io.emit('config-refresh', {
        tools: data.tools,
        staffNames: data.staffNames,
        vehicleTags: data.vehicleTags,
        locationTags: data.locationTags,
        categories: data.categories
      });
      console.log(`🔧- 移除工具: ${removed.name}`);
    }
  });

  socket.on('edit-tool', (payload) => {
    const data = loadData();
    const tool = data.tools.find(t => t.id === payload.id);
    if (tool) {
      if (payload.name) tool.name = payload.name.trim();
      if (payload.category) {
        tool.category = payload.category.trim();
        if (!data.categories.includes(tool.category)) {
          data.categories.push(tool.category);
        }
      }
      saveData(data);
      io.emit('config-refresh', {
        tools: data.tools,
        staffNames: data.staffNames,
        vehicleTags: data.vehicleTags,
        locationTags: data.locationTags,
        categories: data.categories
      });
      console.log(`🔧✏️ 編輯工具: ${tool.name}`);
    }
  });

  // ==========================================
  //  ADMIN: VEHICLE & LOCATION TAGS
  // ==========================================

  socket.on('add-vehicle-tag', (tag) => {
    const data = loadData();
    const trimmed = (tag || '').trim();
    if (trimmed && !data.vehicleTags.includes(trimmed)) {
      data.vehicleTags.push(trimmed);
      saveData(data);
      io.emit('config-refresh', {
        tools: data.tools, staffNames: data.staffNames,
        vehicleTags: data.vehicleTags, locationTags: data.locationTags,
        categories: data.categories
      });
    }
  });

  socket.on('remove-vehicle-tag', (tag) => {
    const data = loadData();
    const idx = data.vehicleTags.indexOf(tag);
    if (idx !== -1) {
      data.vehicleTags.splice(idx, 1);
      saveData(data);
      io.emit('config-refresh', {
        tools: data.tools, staffNames: data.staffNames,
        vehicleTags: data.vehicleTags, locationTags: data.locationTags,
        categories: data.categories
      });
    }
  });

  socket.on('add-location-tag', (tag) => {
    const data = loadData();
    const trimmed = (tag || '').trim();
    if (trimmed && !data.locationTags.includes(trimmed)) {
      data.locationTags.push(trimmed);
      saveData(data);
      io.emit('config-refresh', {
        tools: data.tools, staffNames: data.staffNames,
        vehicleTags: data.vehicleTags, locationTags: data.locationTags,
        categories: data.categories
      });
    }
  });

  socket.on('remove-location-tag', (tag) => {
    const data = loadData();
    const idx = data.locationTags.indexOf(tag);
    if (idx !== -1) {
      data.locationTags.splice(idx, 1);
      saveData(data);
      io.emit('config-refresh', {
        tools: data.tools, staffNames: data.staffNames,
        vehicleTags: data.vehicleTags, locationTags: data.locationTags,
        categories: data.categories
      });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const userName = onlineUsers.get(socket.id) || '未知';
    onlineUsers.delete(socket.id);
    io.emit('online-count', onlineUsers.size);
    console.log(`❌ ${userName} 已離線 (在線: ${onlineUsers.size})`);
  });
});

// --- Helpers ---
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

// --- Start Server ---
server.listen(PORT, () => {
  const data = loadData();
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   🔧 網門電通 — 工具出借即時同步系統              ║');
  console.log(`║   📡 http://localhost:${PORT}                        ║`);
  console.log('║   🌐 同一網路內皆可存取                            ║');
  console.log(`║   📦 ${data.tools.length} 項工具 | 👥 ${data.staffNames.length} 位人員 已載入           ║`);
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
});
