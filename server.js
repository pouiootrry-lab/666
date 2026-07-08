const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// --- Default Tool Database ---
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

const defaultStaff = ["阿光", "阿豪", "均濠", "弈豪", "阿凱", "文華", "阿強", "小楊", "冠章", "慶文", "子淵"];
const defaultVehicleTags = ["AYK-3162", "AMZ-8133", "1058-YW", "APT-7610"];
const defaultLocationTags = ["群聯", "竹科"];
const defaultCategories = ["電鑽", "網路設備", "設備", "梯子", "其他"];

// ==========================================
//  MONGOOSE SCHEMAS
// ==========================================

const RecordSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  date: String,
  vehicle: String,
  location: String,
  items: Array,
  checkoutStaff: Array,
  returnStaff: Array,
  createdAt: String,
  returnedAt: { type: String, default: null }
});

const ConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'main' },
  tools: Array,
  staffNames: Array,
  vehicleTags: Array,
  locationTags: Array,
  categories: Array,
  locationHistory: { type: Array, default: [] }
});

const Record = mongoose.model('Record', RecordSchema);
const Config = mongoose.model('Config', ConfigSchema);

// ==========================================
//  DATA HELPERS (MongoDB)
// ==========================================

async function getConfig() {
  let cfg = await Config.findById('main');
  if (!cfg) {
    cfg = await Config.create({
      _id: 'main',
      tools: defaultTools,
      staffNames: defaultStaff,
      vehicleTags: defaultVehicleTags,
      locationTags: defaultLocationTags,
      categories: defaultCategories,
      locationHistory: []
    });
    console.log('📋 已建立預設設定');
  }
  if (!cfg.locationHistory) cfg.locationHistory = [];
  return cfg;
}

async function saveConfig(updates) {
  await Config.findByIdAndUpdate('main', updates, { upsert: true, new: true });
}

async function getAllRecords() {
  return await Record.find({}).sort({ createdAt: -1 }).lean();
}

// ==========================================
//  CONNECT TO MONGODB
// ==========================================

async function startServer() {
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ 已連接 MongoDB Atlas');
    } catch (err) {
      console.error('❌ MongoDB 連接失敗:', err.message);
      process.exit(1);
    }
  } else {
    console.warn('⚠️  未設定 MONGODB_URI，使用記憶體模式（資料重啟後消失）');
    // Fallback: in-memory store
    global.memStore = {
      tools: [...defaultTools],
      staffNames: [...defaultStaff],
      vehicleTags: [...defaultVehicleTags],
      locationTags: [...defaultLocationTags],
      categories: [...defaultCategories],
      records: []
    };
  }

  // --- Serve Static Files ---
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.json());

  // --- REST API ---
  app.get('/api/config', async (req, res) => {
    try {
      if (MONGODB_URI) {
        const cfg = await getConfig();
        res.json({ tools: cfg.tools, staffNames: cfg.staffNames, vehicleTags: cfg.vehicleTags, locationTags: cfg.locationTags, categories: cfg.categories });
      } else {
        const s = global.memStore;
        res.json({ tools: s.tools, staffNames: s.staffNames, vehicleTags: s.vehicleTags, locationTags: s.locationTags, categories: s.categories });
      }
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/records', async (req, res) => {
    try {
      if (MONGODB_URI) {
        res.json(await getAllRecords());
      } else {
        res.json(global.memStore.records);
      }
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // --- Online Users Tracking ---
  let onlineUsers = new Map();

  // --- Socket.io Events ---
  io.on('connection', async (socket) => {
    console.log(`✅ 使用者連線: ${socket.id}`);

    // Send all data on connect
    try {
      let cfg, records;
      if (MONGODB_URI) {
        cfg = await getConfig();
        records = await getAllRecords();
      } else {
        cfg = global.memStore;
        records = global.memStore.records;
      }
      socket.emit('init', {
        records,
        tools: cfg.tools,
        staffNames: cfg.staffNames,
        vehicleTags: cfg.vehicleTags,
        locationTags: cfg.locationTags,
        categories: cfg.categories,
        locationHistory: cfg.locationHistory || [],
        onlineCount: onlineUsers.size
      });
    } catch (e) { console.error('init error:', e); }

    // Identify user
    socket.on('identify', (userName) => {
      onlineUsers.set(socket.id, userName);
      io.emit('online-count', onlineUsers.size);
      console.log(`👤 ${userName} 已上線 (在線: ${onlineUsers.size})`);
    });

    // ==========================================
    //  RECORD OPERATIONS
    // ==========================================

    socket.on('submit-record', async (payload) => {
      try {
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

        if (MONGODB_URI) {
          await Record.create(record);

          // Cross-record return logic
          const toolsBeingReturned = record.items
            .filter(item => item.status === 'return')
            .map(item => item.toolId);

          if (toolsBeingReturned.length > 0) {
            const openRecords = await Record.find({ returnedAt: null, id: { $ne: record.id } });
            for (const existing of openRecords) {
              let updated = false;
              existing.items.forEach(item => {
                if (toolsBeingReturned.includes(item.toolId) && item.status !== 'return') {
                  item.status = 'return';
                  updated = true;
                }
              });
              if (updated) {
                existing.markModified('items');
                const hasRemaining = existing.items.some(i => i.status === 'checkout' || i.status === 'onsite');
                if (!hasRemaining) {
                  existing.returnedAt = new Date().toISOString();
                  if (existing.returnStaff.length === 0) existing.returnStaff = payload.checkoutStaff;
                }
                await existing.save();
              }
            }
          }
          // Auto-update locationHistory (MongoDB)
          if (record.location) {
            const cfg = await getConfig();
            const hist = cfg.locationHistory || [];
            const newHist = [record.location, ...hist.filter(l => l !== record.location)].slice(0, 7);
            await saveConfig({ locationHistory: newHist });
            io.emit('location-history-update', newHist);
          }
          io.emit('records-refresh', await getAllRecords());

        } else {
          global.memStore.records.unshift(record);
          // Cross-record return logic (in-memory)
          const toolsBeingReturned = record.items.filter(i => i.status === 'return').map(i => i.toolId);
          if (toolsBeingReturned.length > 0) {
            global.memStore.records.forEach(existing => {
              if (existing.id === record.id || existing.returnedAt) return;
              let updated = false;
              existing.items.forEach(item => {
                if (toolsBeingReturned.includes(item.toolId) && item.status !== 'return') { item.status = 'return'; updated = true; }
              });
              if (updated) {
                const hasRemaining = existing.items.some(i => i.status === 'checkout' || i.status === 'onsite');
                if (!hasRemaining) { existing.returnedAt = new Date().toISOString(); if (existing.returnStaff.length === 0) existing.returnStaff = payload.checkoutStaff; }
              }
            });
          }
          // Auto-update locationHistory (in-memory)
          if (record.location) {
            const hist = global.memStore.locationHistory || [];
            const newHist = [record.location, ...hist.filter(l => l !== record.location)].slice(0, 7);
            global.memStore.locationHistory = newHist;
            io.emit('location-history-update', newHist);
          }
          io.emit('records-refresh', global.memStore.records);
        }
        console.log(`📦 新登記: ${record.checkoutStaff.join(',')} | ${record.vehicle} | ${record.location} | ${record.items.length} 項`);
      } catch (e) { console.error('submit-record error:', e); }
    });

    socket.on('return-record', async (payload) => {
      try {
        if (MONGODB_URI) {
          const record = await Record.findOne({ id: payload.recordId, returnedAt: null });
          if (record) {
            record.items.forEach(item => { if (item.status !== 'return') item.status = 'return'; });
            record.markModified('items');
            record.returnedAt = new Date().toISOString();
            record.returnStaff = payload.returnStaff || record.checkoutStaff;
            await record.save();
            io.emit('records-refresh', await getAllRecords());
            console.log(`✅ 全部歸還: ${record.vehicle} | ${record.location}`);
          }
        } else {
          const record = global.memStore.records.find(r => r.id === payload.recordId);
          if (record && !record.returnedAt) {
            record.items.forEach(item => { if (item.status !== 'return') item.status = 'return'; });
            record.returnedAt = new Date().toISOString();
            record.returnStaff = payload.returnStaff || record.checkoutStaff;
            io.emit('records-refresh', global.memStore.records);
          }
        }
      } catch (e) { console.error('return-record error:', e); }
    });

    socket.on('delete-record', async (recordId) => {
      try {
        if (MONGODB_URI) {
          await Record.deleteOne({ id: recordId });
          io.emit('records-refresh', await getAllRecords());
          console.log(`🗑️ 刪除紀錄: ${recordId}`);
        } else {
          const idx = global.memStore.records.findIndex(r => r.id === recordId);
          if (idx !== -1) { global.memStore.records.splice(idx, 1); io.emit('records-refresh', global.memStore.records); }
        }
      } catch (e) { console.error('delete-record error:', e); }
    });

    socket.on('edit-record', async (payload) => {
      try {
        if (MONGODB_URI) {
          const record = await Record.findOne({ id: payload.id });
          if (record) {
            if (payload.date !== undefined) record.date = payload.date;
            if (payload.vehicle !== undefined) record.vehicle = payload.vehicle;
            if (payload.location !== undefined) record.location = payload.location;
            if (payload.checkoutStaff !== undefined) record.checkoutStaff = payload.checkoutStaff;
            if (payload.returnStaff !== undefined) record.returnStaff = payload.returnStaff;
            if (payload.items !== undefined) { record.items = payload.items; record.markModified('items'); }
            if (payload.returnedAt !== undefined) record.returnedAt = payload.returnedAt;
            await record.save();
            io.emit('records-refresh', await getAllRecords());
            console.log(`✏️ 編輯紀錄: ${record.id}`);
          }
        } else {
          const record = global.memStore.records.find(r => r.id === payload.id);
          if (record) {
            if (payload.date !== undefined) record.date = payload.date;
            if (payload.vehicle !== undefined) record.vehicle = payload.vehicle;
            if (payload.location !== undefined) record.location = payload.location;
            if (payload.checkoutStaff !== undefined) record.checkoutStaff = payload.checkoutStaff;
            if (payload.returnStaff !== undefined) record.returnStaff = payload.returnStaff;
            if (payload.items !== undefined) record.items = payload.items;
            if (payload.returnedAt !== undefined) record.returnedAt = payload.returnedAt;
            io.emit('records-refresh', global.memStore.records);
          }
        }
      } catch (e) { console.error('edit-record error:', e); }
    });

    socket.on('clear-all-records', async () => {
      try {
        if (MONGODB_URI) {
          await Record.deleteMany({});
          io.emit('records-refresh', []);
        } else {
          global.memStore.records = [];
          io.emit('records-refresh', []);
        }
        console.log(`🗑️ 已清除所有紀錄`);
      } catch (e) { console.error('clear-all-records error:', e); }
    });

    // ==========================================
    //  ADMIN: STAFF MANAGEMENT
    // ==========================================

    socket.on('add-staff', async (name) => {
      try {
        const trimmed = (name || '').trim();
        if (!trimmed) return;
        if (MONGODB_URI) {
          const cfg = await getConfig();
          if (!cfg.staffNames.includes(trimmed)) {
            cfg.staffNames.push(trimmed);
            await saveConfig({ staffNames: cfg.staffNames });
            io.emit('config-refresh', { tools: cfg.tools, staffNames: cfg.staffNames, vehicleTags: cfg.vehicleTags, locationTags: cfg.locationTags, categories: cfg.categories });
            console.log(`👤+ 新增人員: ${trimmed}`);
          }
        } else {
          if (!global.memStore.staffNames.includes(trimmed)) {
            global.memStore.staffNames.push(trimmed);
            const s = global.memStore;
            io.emit('config-refresh', { tools: s.tools, staffNames: s.staffNames, vehicleTags: s.vehicleTags, locationTags: s.locationTags, categories: s.categories });
          }
        }
      } catch (e) { console.error('add-staff error:', e); }
    });

    socket.on('remove-staff', async (name) => {
      try {
        if (MONGODB_URI) {
          const cfg = await getConfig();
          const idx = cfg.staffNames.indexOf(name);
          if (idx !== -1) {
            cfg.staffNames.splice(idx, 1);
            await saveConfig({ staffNames: cfg.staffNames });
            io.emit('config-refresh', { tools: cfg.tools, staffNames: cfg.staffNames, vehicleTags: cfg.vehicleTags, locationTags: cfg.locationTags, categories: cfg.categories });
            console.log(`👤- 移除人員: ${name}`);
          }
        } else {
          const idx = global.memStore.staffNames.indexOf(name);
          if (idx !== -1) { global.memStore.staffNames.splice(idx, 1); const s = global.memStore; io.emit('config-refresh', { tools: s.tools, staffNames: s.staffNames, vehicleTags: s.vehicleTags, locationTags: s.locationTags, categories: s.categories }); }
        }
      } catch (e) { console.error('remove-staff error:', e); }
    });

    // ==========================================
    //  ADMIN: TOOL MANAGEMENT
    // ==========================================

    socket.on('add-tool', async (payload) => {
      try {
        const newTool = { id: 'custom_' + generateId(), name: (payload.name || '').trim(), category: (payload.category || '其他').trim() };
        if (!newTool.name) return;
        if (MONGODB_URI) {
          const cfg = await getConfig();
          cfg.tools.push(newTool);
          if (!cfg.categories.includes(newTool.category)) cfg.categories.push(newTool.category);
          await saveConfig({ tools: cfg.tools, categories: cfg.categories });
          io.emit('config-refresh', { tools: cfg.tools, staffNames: cfg.staffNames, vehicleTags: cfg.vehicleTags, locationTags: cfg.locationTags, categories: cfg.categories });
          console.log(`🔧+ 新增工具: ${newTool.name}`);
        } else {
          global.memStore.tools.push(newTool);
          if (!global.memStore.categories.includes(newTool.category)) global.memStore.categories.push(newTool.category);
          const s = global.memStore;
          io.emit('config-refresh', { tools: s.tools, staffNames: s.staffNames, vehicleTags: s.vehicleTags, locationTags: s.locationTags, categories: s.categories });
        }
      } catch (e) { console.error('add-tool error:', e); }
    });

    socket.on('remove-tool', async (toolId) => {
      try {
        if (MONGODB_URI) {
          const cfg = await getConfig();
          const idx = cfg.tools.findIndex(t => t.id === toolId);
          if (idx !== -1) {
            const removed = cfg.tools.splice(idx, 1)[0];
            await saveConfig({ tools: cfg.tools });
            io.emit('config-refresh', { tools: cfg.tools, staffNames: cfg.staffNames, vehicleTags: cfg.vehicleTags, locationTags: cfg.locationTags, categories: cfg.categories });
            console.log(`🔧- 移除工具: ${removed.name}`);
          }
        } else {
          const idx = global.memStore.tools.findIndex(t => t.id === toolId);
          if (idx !== -1) { global.memStore.tools.splice(idx, 1); const s = global.memStore; io.emit('config-refresh', { tools: s.tools, staffNames: s.staffNames, vehicleTags: s.vehicleTags, locationTags: s.locationTags, categories: s.categories }); }
        }
      } catch (e) { console.error('remove-tool error:', e); }
    });

    socket.on('edit-tool', async (payload) => {
      try {
        if (MONGODB_URI) {
          const cfg = await getConfig();
          const tool = cfg.tools.find(t => t.id === payload.id);
          if (tool) {
            if (payload.name) tool.name = payload.name.trim();
            if (payload.category) { tool.category = payload.category.trim(); if (!cfg.categories.includes(tool.category)) cfg.categories.push(tool.category); }
            cfg.markModified('tools');
            await saveConfig({ tools: cfg.tools, categories: cfg.categories });
            io.emit('config-refresh', { tools: cfg.tools, staffNames: cfg.staffNames, vehicleTags: cfg.vehicleTags, locationTags: cfg.locationTags, categories: cfg.categories });
            console.log(`🔧✏️ 編輯工具: ${tool.name}`);
          }
        } else {
          const tool = global.memStore.tools.find(t => t.id === payload.id);
          if (tool) { if (payload.name) tool.name = payload.name.trim(); if (payload.category) { tool.category = payload.category.trim(); if (!global.memStore.categories.includes(tool.category)) global.memStore.categories.push(tool.category); } const s = global.memStore; io.emit('config-refresh', { tools: s.tools, staffNames: s.staffNames, vehicleTags: s.vehicleTags, locationTags: s.locationTags, categories: s.categories }); }
        }
      } catch (e) { console.error('edit-tool error:', e); }
    });

    socket.on('reorder-tools', async (newOrder) => {
      try {
        if (MONGODB_URI) {
          const cfg = await getConfig();
          // Map to keep valid tools only
          const toolMap = new Map(cfg.tools.map(t => [t.id, t]));
          const updatedTools = [];
          for (const item of newOrder) {
            const tool = toolMap.get(item.id);
            if (tool) {
              tool.category = item.category;
              updatedTools.push(tool);
              toolMap.delete(item.id);
            }
          }
          // Append any missing tools that weren't in the new order
          for (const tool of toolMap.values()) {
            updatedTools.push(tool);
          }
          cfg.tools = updatedTools;
          await saveConfig({ tools: cfg.tools });
          io.emit('config-refresh', { tools: cfg.tools, staffNames: cfg.staffNames, vehicleTags: cfg.vehicleTags, locationTags: cfg.locationTags, categories: cfg.categories });
          console.log(`🔧🔄 更新工具排序`);
        } else {
          const s = global.memStore;
          const toolMap = new Map(s.tools.map(t => [t.id, t]));
          const updatedTools = [];
          for (const item of newOrder) {
            const tool = toolMap.get(item.id);
            if (tool) {
              tool.category = item.category;
              updatedTools.push(tool);
              toolMap.delete(item.id);
            }
          }
          for (const tool of toolMap.values()) updatedTools.push(tool);
          s.tools = updatedTools;
          io.emit('config-refresh', { tools: s.tools, staffNames: s.staffNames, vehicleTags: s.vehicleTags, locationTags: s.locationTags, categories: s.categories });
        }
      } catch (e) { console.error('reorder-tools error:', e); }
    });

    // ==========================================
    //  ADMIN: VEHICLE & LOCATION TAGS
    // ==========================================

    socket.on('add-vehicle-tag', async (tag) => {
      try {
        const trimmed = (tag || '').trim();
        if (!trimmed) return;
        if (MONGODB_URI) {
          const cfg = await getConfig();
          if (!cfg.vehicleTags.includes(trimmed)) { cfg.vehicleTags.push(trimmed); await saveConfig({ vehicleTags: cfg.vehicleTags }); io.emit('config-refresh', { tools: cfg.tools, staffNames: cfg.staffNames, vehicleTags: cfg.vehicleTags, locationTags: cfg.locationTags, categories: cfg.categories }); }
        } else { if (!global.memStore.vehicleTags.includes(trimmed)) { global.memStore.vehicleTags.push(trimmed); const s = global.memStore; io.emit('config-refresh', { tools: s.tools, staffNames: s.staffNames, vehicleTags: s.vehicleTags, locationTags: s.locationTags, categories: s.categories }); } }
      } catch (e) { console.error('add-vehicle-tag error:', e); }
    });

    socket.on('remove-vehicle-tag', async (tag) => {
      try {
        if (MONGODB_URI) {
          const cfg = await getConfig();
          const idx = cfg.vehicleTags.indexOf(tag);
          if (idx !== -1) { cfg.vehicleTags.splice(idx, 1); await saveConfig({ vehicleTags: cfg.vehicleTags }); io.emit('config-refresh', { tools: cfg.tools, staffNames: cfg.staffNames, vehicleTags: cfg.vehicleTags, locationTags: cfg.locationTags, categories: cfg.categories }); }
        } else { const idx = global.memStore.vehicleTags.indexOf(tag); if (idx !== -1) { global.memStore.vehicleTags.splice(idx, 1); const s = global.memStore; io.emit('config-refresh', { tools: s.tools, staffNames: s.staffNames, vehicleTags: s.vehicleTags, locationTags: s.locationTags, categories: s.categories }); } }
      } catch (e) { console.error('remove-vehicle-tag error:', e); }
    });

    socket.on('add-location-tag', async (tag) => {
      try {
        const trimmed = (tag || '').trim();
        if (!trimmed) return;
        if (MONGODB_URI) {
          const cfg = await getConfig();
          if (!cfg.locationTags.includes(trimmed)) { cfg.locationTags.push(trimmed); await saveConfig({ locationTags: cfg.locationTags }); io.emit('config-refresh', { tools: cfg.tools, staffNames: cfg.staffNames, vehicleTags: cfg.vehicleTags, locationTags: cfg.locationTags, categories: cfg.categories }); }
        } else { if (!global.memStore.locationTags.includes(trimmed)) { global.memStore.locationTags.push(trimmed); const s = global.memStore; io.emit('config-refresh', { tools: s.tools, staffNames: s.staffNames, vehicleTags: s.vehicleTags, locationTags: s.locationTags, categories: s.categories }); } }
      } catch (e) { console.error('add-location-tag error:', e); }
    });

    socket.on('remove-location-tag', async (tag) => {
      try {
        if (MONGODB_URI) {
          const cfg = await getConfig();
          const idx = cfg.locationTags.indexOf(tag);
          if (idx !== -1) { cfg.locationTags.splice(idx, 1); await saveConfig({ locationTags: cfg.locationTags }); io.emit('config-refresh', { tools: cfg.tools, staffNames: cfg.staffNames, vehicleTags: cfg.vehicleTags, locationTags: cfg.locationTags, categories: cfg.categories }); }
        } else { const idx = global.memStore.locationTags.indexOf(tag); if (idx !== -1) { global.memStore.locationTags.splice(idx, 1); const s = global.memStore; io.emit('config-refresh', { tools: s.tools, staffNames: s.staffNames, vehicleTags: s.vehicleTags, locationTags: s.locationTags, categories: s.categories }); } }
      } catch (e) { console.error('remove-location-tag error:', e); }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const userName = onlineUsers.get(socket.id) || '未知';
      onlineUsers.delete(socket.id);
      io.emit('online-count', onlineUsers.size);
      console.log(`❌ ${userName} 已離線 (在線: ${onlineUsers.size})`);
    });
  });

  // --- Start Server ---
  server.listen(PORT, async () => {
    const toolCount = MONGODB_URI ? (await getConfig()).tools.length : defaultTools.length;
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║   🔧 網門電通 — 工具出借即時同步系統              ║');
    console.log(`║   📡 http://localhost:${PORT}                        ║`);
    console.log('║   🌐 同一網路內皆可存取                            ║');
    console.log(`║   💾 ${MONGODB_URI ? 'MongoDB Atlas 持久化' : '⚠️  記憶體模式（無持久化）'}                  ║`);
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
  });
}

// --- Helpers ---
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

startServer().catch(err => {
  console.error('啟動失敗:', err);
  process.exit(1);
});
