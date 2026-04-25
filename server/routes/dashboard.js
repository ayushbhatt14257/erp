const express = require('express');
const router  = express.Router();
const Transaction = require('../models/Transaction');
const { auth }    = require('../middleware/auth');

function getTodayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

// GET /api/dashboard/summary
router.get('/summary', auth, async (req, res) => {
  try {
    const q     = req.query.q || '';
    const page  = parseInt(req.query.page) || 1;
    const limit = 50;
    const matchStage = q ? { skuName: { $regex: q, $options: 'i' } } : {};

    const [data, totalAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: matchStage },
        { $group: {
            _id: '$sku',
            skuName:      { $first: '$skuName' },
            totalIn:      { $sum: { $cond: [{ $eq: ['$type','IN']  }, '$quantity', 0] } },
            totalOut:     { $sum: { $cond: [{ $eq: ['$type','OUT'] }, '$quantity', 0] } },
            lastRow:      { $last: '$location.row' },
            lastShelf:    { $last: '$location.shelf' },
            lastMovement: { $max: '$timestamp' },
        }},
        { $addFields: { balance: { $subtract: ['$totalIn','$totalOut'] } } },
        { $sort: { skuName: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]),
      Transaction.aggregate([
        ...(q ? [{ $match: { skuName: { $regex: q, $options: 'i' } } }] : []),
        { $group: { _id: '$sku' } },
        { $count: 'total' },
      ]),
    ]);

    res.json({ data, total: totalAgg[0]?.total || 0, page, pages: Math.ceil((totalAgg[0]?.total || 0) / limit) || 1 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/dashboard/today
router.get('/today', auth, async (req, res) => {
  try {
    const today = getTodayIST();
    const [todayAgg, overallAgg, activeSkus] = await Promise.all([
      Transaction.aggregate([
        { $match: { txDate: today } },
        { $group: { _id: null,
            totalIn:  { $sum: { $cond: [{ $eq: ['$type','IN']  }, '$quantity', 0] } },
            totalOut: { $sum: { $cond: [{ $eq: ['$type','OUT'] }, '$quantity', 0] } },
            txCount:  { $sum: 1 },
        }},
      ]),
      Transaction.aggregate([
        { $group: { _id: null,
            grandIn:  { $sum: { $cond: [{ $eq: ['$type','IN']  }, '$quantity', 0] } },
            grandOut: { $sum: { $cond: [{ $eq: ['$type','OUT'] }, '$quantity', 0] } },
        }},
      ]),
      Transaction.distinct('sku').then(ids => ids.length),
    ]);

    const t = todayAgg[0]  || { totalIn: 0, totalOut: 0, txCount: 0 };
    const o = overallAgg[0] || { grandIn: 0, grandOut: 0 };

    res.json({
      todayIn: t.totalIn, todayOut: t.totalOut, todayTxCount: t.txCount,
      overallBalance: o.grandIn - o.grandOut,
      activeSkus, date: today,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/dashboard/monthly?year=&month=
router.get('/monthly', auth, async (req, res) => {
  try {
    const year   = parseInt(req.query.year)  || new Date().getFullYear();
    const month  = parseInt(req.query.month) || new Date().getMonth() + 1;
    const prefix = `${year}-${String(month).padStart(2,'0')}`;

    const data = await Transaction.aggregate([
      { $match: { txDate: { $regex: `^${prefix}` } } },
      { $group: { _id: { date: '$txDate', type: '$type' }, total: { $sum: '$quantity' } } },
      { $sort:  { '_id.date': 1 } },
    ]);

    const map = {};
    data.forEach(d => {
      const dt = d._id.date;
      if (!map[dt]) map[dt] = { date: dt, in: 0, out: 0 };
      if (d._id.type === 'IN')  map[dt].in  = d.total;
      if (d._id.type === 'OUT') map[dt].out = d.total;
    });

    res.json(Object.values(map).sort((a, b) => a.date.localeCompare(b.date)));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
