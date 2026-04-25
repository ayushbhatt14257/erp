const express     = require('express');
const router      = express.Router();
const SKU         = require('../models/SKU');
const Transaction = require('../models/Transaction');
const { auth, adminOnly } = require('../middleware/auth');

function makeToken(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '');
}

// GET /api/skus/search?q=  — active only, used by form dropdowns
router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    const token = makeToken(q);

    let results = await SKU.find({
      status: 'active',
      searchToken: { $regex: `^${token}`, $options: 'i' },
    }).select('name brand _id').limit(30).lean();

    if (results.length < 5) {
      const extra = await SKU.find({
        status: 'active',
        name: { $regex: q, $options: 'i' },
        _id: { $nin: results.map(r => r._id) },
      }).select('name brand _id').limit(20).lean();
      results = [...results, ...extra];
    }
    res.json(results);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/skus  — paginated admin list
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 50;
    const q      = req.query.q      || '';
    const status = req.query.status || '';
    const filter = {};
    if (q)      filter.name   = { $regex: q, $options: 'i' };
    if (status) filter.status = status;

    const [skus, total] = await Promise.all([
      SKU.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      SKU.countDocuments(filter),
    ]);
    res.json({ skus, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/skus  — add single SKU
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, brand } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const searchToken = makeToken(name);
    const existing = await SKU.findOne({ searchToken });
    if (existing) return res.status(400).json({ message: `"${name}" already exists` });
    const sku = await SKU.create({ name: name.trim(), searchToken, brand: brand || '', createdBy: req.user._id });
    res.status(201).json(sku);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/skus/bulk
router.post('/bulk', auth, adminOnly, async (req, res) => {
  try {
    const { skus } = req.body;
    if (!Array.isArray(skus) || !skus.length)
      return res.status(400).json({ message: 'No SKUs provided' });

    const ops = skus.filter(s => s.name?.trim()).map(s => {
      const searchToken = makeToken(s.name);
      return {
        updateOne: {
          filter: { searchToken },
          update: {
            $setOnInsert: {
              name: s.name.trim(), searchToken,
              brand: s.brand || '', status: 'active', createdBy: req.user._id,
            },
          },
          upsert: true,
        },
      };
    });
    const result = await SKU.bulkWrite(ops);
    res.json({ inserted: result.upsertedCount, skipped: skus.length - result.upsertedCount, total: skus.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/skus/:id  — toggle status / rename
router.patch('/:id', auth, adminOnly, async (req, res) => {
  try {
    const sku = await SKU.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!sku) return res.status(404).json({ message: 'SKU not found' });
    res.json(sku);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/skus/:id  — Issue 4 fix: proper ERP deletion logic
// Rules:
//   1. If transactions exist → block hard delete, return warning (preserve history)
//   2. If balance > 0  → block, stock still on hand
//   3. If no transactions at all → safe to permanently delete
//   4. If transactions exist but balance = 0 → soft delete (archive) only
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const sku = await SKU.findById(req.params.id);
    if (!sku) return res.status(404).json({ message: 'SKU not found' });

    const oid = new mongoose.Types.ObjectId(req.params.id);

    // Count transactions
    const txCount = await Transaction.countDocuments({ sku: oid });

    if (txCount === 0) {
      // Safe: no history at all — hard delete
      await SKU.findByIdAndDelete(req.params.id);
      return res.json({ action: 'deleted', message: `"${sku.name}" permanently deleted (no transaction history)` });
    }

    // Has transactions — check balance
    const balanceAgg = await Transaction.aggregate([
      { $match: { sku: oid } },
      { $group: {
          _id: null,
          totalIn:  { $sum: { $cond: [{ $eq: ['$type','IN']  }, '$quantity', 0] } },
          totalOut: { $sum: { $cond: [{ $eq: ['$type','OUT'] }, '$quantity', 0] } },
      }},
    ]);
    const balance = balanceAgg.length
      ? balanceAgg[0].totalIn - balanceAgg[0].totalOut
      : 0;

    if (balance > 0) {
      // Stock still on hand — cannot delete or archive
      return res.status(400).json({
        action: 'blocked',
        message: `Cannot delete "${sku.name}" — ${balance.toLocaleString()} pcs still in stock. Dispatch or adjust stock to zero first.`,
        balance,
        txCount,
      });
    }

    // Balance = 0 but history exists — soft delete (archive)
    const updated = await SKU.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );
    return res.json({
      action: 'archived',
      message: `"${sku.name}" archived (${txCount} transaction records preserved). It will no longer appear in dropdowns.`,
      sku: updated,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
