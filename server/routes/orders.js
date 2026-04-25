const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Transaction = require('../models/Transaction');
const SKU = require('../models/SKU');
const { auth } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Helper: get balances for multiple SKU IDs in one aggregation
async function getBulkBalances(skuIds) {
  const results = await Transaction.aggregate([
    { $match: { sku: { $in: skuIds } } },
    {
      $group: {
        _id: '$sku',
        totalIn: { $sum: { $cond: [{ $eq: ['$type', 'IN'] }, '$quantity', 0] } },
        totalOut: { $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, '$quantity', 0] } },
      },
    },
  ]);
  const map = {};
  results.forEach(r => {
    map[r._id.toString()] = r.totalIn - r.totalOut;
  });
  return map;
}

// POST /api/orders/check — upload Excel order list and get gap analysis
router.post('/check', auth, upload.single('file'), async (req, res) => {
  try {
    const { orderRef } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Parse Excel: col A = model name, col B = quantity
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Skip header row if first cell looks like text header
    const startRow = isNaN(rows[0]?.[1]) && typeof rows[0]?.[0] === 'string' && rows[0][0].toLowerCase().includes('model') ? 1 : 0;

    const orderItems = [];
    for (let i = startRow; i < rows.length; i++) {
      const name = String(rows[i][0] || '').trim();
      const qty = parseInt(rows[i][1]);
      if (name && !isNaN(qty) && qty > 0) {
        orderItems.push({ name, required: qty });
      }
    }

    if (!orderItems.length) return res.status(400).json({ message: 'No valid rows found in file. Ensure col A = model name, col B = quantity.' });

    // Match each order item to SKU
    const matched = [];
    const unmatched = [];

    for (const item of orderItems) {
      const token = item.name.toLowerCase().replace(/\s+/g, '');
      const sku = await SKU.findOne({
        isActive: true,
        $or: [
          { searchToken: token },
          { searchToken: { $regex: `^${token}`, $options: 'i' } },
          { name: { $regex: item.name, $options: 'i' } },
        ],
      }).lean();

      if (sku) {
        matched.push({ ...item, skuId: sku._id, skuName: sku.name });
      } else {
        unmatched.push(item.name);
      }
    }

    // Get balances in bulk
    const balanceMap = await getBulkBalances(matched.map(m => m.skuId));

    // Build result
    const ready = [], partial = [], short = [], results = [];
    matched.forEach(item => {
      const available = balanceMap[item.skuId.toString()] || 0;
      const shortfall = item.required - available;
      let status;
      if (available >= item.required) status = 'READY';
      else if (available > 0) status = 'PARTIAL';
      else status = 'SHORT';

      const row = { skuName: item.skuName, required: item.required, available, shortfall: Math.max(0, shortfall), status };
      results.push(row);
      if (status === 'READY') ready.push(row);
      else if (status === 'PARTIAL') partial.push(row);
      else short.push(row);
    });

    res.json({
      orderRef: orderRef || 'Unnamed Order',
      summary: { total: orderItems.length, ready: ready.length, partial: partial.length, short: short.length, unmatched: unmatched.length },
      results,
      unmatched,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/orders/check-manual — paste list instead of upload
router.post('/check-manual', auth, async (req, res) => {
  try {
    const { items, orderRef } = req.body;
    // items: [{ name, required }]
    if (!Array.isArray(items) || !items.length)
      return res.status(400).json({ message: 'Items array required' });

    const matched = [];
    const unmatched = [];

    for (const item of items) {
      const token = item.name.toLowerCase().replace(/\s+/g, '');
      const sku = await SKU.findOne({
        isActive: true,
        $or: [
          { searchToken: token },
          { name: { $regex: item.name, $options: 'i' } },
        ],
      }).lean();
      if (sku) matched.push({ ...item, skuId: sku._id, skuName: sku.name });
      else unmatched.push(item.name);
    }

    const balanceMap = await getBulkBalances(matched.map(m => m.skuId));

    const results = matched.map(item => {
      const available = balanceMap[item.skuId.toString()] || 0;
      const shortfall = Math.max(0, item.required - available);
      let status = available >= item.required ? 'READY' : available > 0 ? 'PARTIAL' : 'SHORT';
      return { skuName: item.skuName, required: item.required, available, shortfall, status };
    });

    const counts = results.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

    res.json({
      orderRef: orderRef || 'Manual Check',
      summary: { total: items.length, ready: counts.READY || 0, partial: counts.PARTIAL || 0, short: counts.SHORT || 0, unmatched: unmatched.length },
      results,
      unmatched,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
