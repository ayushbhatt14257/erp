const express     = require('express');
const router      = express.Router();
const multer      = require('multer');
const XLSX        = require('xlsx');
const mongoose    = require('mongoose');
const SKU         = require('../models/SKU');
const Transaction = require('../models/Transaction');
const { auth }    = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function getBulkBalances(skuIds) {
  if (!skuIds.length) return {};
  const oids = skuIds.map(id => new mongoose.Types.ObjectId(String(id)));
  const results = await Transaction.aggregate([
    { $match: { sku: { $in: oids } } },
    {
      $group: {
        _id:      '$sku',
        totalIn:  { $sum: { $cond: [{ $eq: ['$type', 'IN']  }, '$quantity', 0] } },
        totalOut: { $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, '$quantity', 0] } },
      },
    },
  ]);
  const map = {};
  results.forEach(r => { map[r._id.toString()] = r.totalIn - r.totalOut; });
  return map;
}

// POST /api/orders/check
router.post('/check', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    const firstCell = String(rows[0]?.[0] || '').toLowerCase().trim();
    const startRow  = ['model', 'name', 'model name', 'item'].includes(firstCell) ? 1 : 0;

    const orderItems = [];
    for (let i = startRow; i < rows.length; i++) {
      const name = String(rows[i][0] || '').trim();
      const qty  = parseInt(rows[i][1]);
      if (name && !isNaN(qty) && qty > 0) orderItems.push({ name, orderQty: qty });
    }

    if (!orderItems.length)
      return res.status(400).json({ message: 'No valid rows found. Ensure Col A = Model Name, Col B = Quantity.' });

    // FIX: fetch all SKUs and match in JavaScript — avoids regex special char crash
    // Model names like "Oppo A1 Pro/Reno 8T (5G)", "1+Nord CE" contain regex chars
    // that break MongoDB $regex when passed unescaped. JS string comparison is safe.
    const allSkus = await SKU.find({ status: 'active' }).select('_id name').lean();
    const skuByName = {};
    allSkus.forEach(s => { skuByName[s.name.toLowerCase().trim()] = s; });

    const matched   = [];
    const unmatched = [];

    orderItems.forEach(item => {
      const sku = skuByName[item.name.toLowerCase().trim()];
      if (sku) matched.push({ ...item, skuId: sku._id, skuName: sku.name });
      else     unmatched.push(item);
    });

    const balanceMap = await getBulkBalances(matched.map(m => m.skuId));

    const results = [];

    matched.forEach(item => {
      const available = balanceMap[item.skuId.toString()] ?? 0;
      const shortfall = Math.max(0, item.orderQty - available);
      let status;
      if (available >= item.orderQty) status = 'READY';
      else if (available > 0)         status = 'PARTIAL';
      else                            status = 'OUT_OF_STOCK';
      results.push({ modelName: item.skuName, orderQty: item.orderQty, available, shortfall, status, found: true });
    });

    unmatched.forEach(item => {
      results.push({ modelName: item.name, orderQty: item.orderQty, available: null, shortfall: null, status: 'NOT_FOUND', found: false });
    });

    const nameIndex = {};
    orderItems.forEach((item, i) => { nameIndex[item.name.toLowerCase().trim()] = i; });
    results.sort((a, b) =>
      (nameIndex[a.modelName.toLowerCase().trim()] ?? 9999) -
      (nameIndex[b.modelName.toLowerCase().trim()] ?? 9999)
    );

    const summary = {
      total:      orderItems.length,
      ready:      results.filter(r => r.status === 'READY').length,
      partial:    results.filter(r => r.status === 'PARTIAL').length,
      outOfStock: results.filter(r => r.status === 'OUT_OF_STOCK').length,
      notFound:   results.filter(r => r.status === 'NOT_FOUND').length,
    };

    const orderRef = req.body.orderRef || req.file.originalname.replace(/\.[^.]+$/, '');
    res.json({ orderRef, summary, results, checkedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/orders/export
router.post('/export', auth, async (req, res) => {
  try {
    const { results, orderRef } = req.body;
    if (!results?.length) return res.status(400).json({ message: 'No results to export' });

    const statusLabel = {
      READY: 'Ready', PARTIAL: 'Partial',
      OUT_OF_STOCK: 'Out of Stock', NOT_FOUND: 'Model Not Found',
    };

    const rows = results.map((r, i) => ({
      '#':               i + 1,
      'Model Name':      r.modelName,
      'Order Qty':       r.orderQty,
      'Available Stock': r.available !== null ? r.available : '—',
      'Shortfall':       r.shortfall > 0 ? r.shortfall : '—',
      'Status':          statusLabel[r.status] || r.status,
    }));

    const summaryRows = [
      { Category: 'Total Models',    Count: results.length },
      { Category: 'Ready',           Count: results.filter(r => r.status === 'READY').length },
      { Category: 'Partial',         Count: results.filter(r => r.status === 'PARTIAL').length },
      { Category: 'Out of Stock',    Count: results.filter(r => r.status === 'OUT_OF_STOCK').length },
      { Category: 'Model Not Found', Count: results.filter(r => r.status === 'NOT_FOUND').length },
    ];

    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows),        'Order Check');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

    const buf      = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `OrderCheck_${(orderRef || 'report').replace(/[^a-z0-9]/gi, '_')}_${new Date().toLocaleDateString('en-CA')}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
