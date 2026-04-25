const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const SKU = require('../models/SKU');
const { auth } = require('../middleware/auth');

function toOid(id) {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(String(id));
}

async function getBalance(skuId) {
  const oid = toOid(skuId);
  const result = await Transaction.aggregate([
    { $match: { sku: oid } },
    {
      $group: {
        _id: null,
        totalIn:  { $sum: { $cond: [{ $eq: ['$type', 'IN']  }, '$quantity', 0] } },
        totalOut: { $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, '$quantity', 0] } },
      },
    },
  ]);
  if (!result.length) return { totalIn: 0, totalOut: 0, balance: 0 };
  const { totalIn, totalOut } = result[0];
  return { totalIn, totalOut, balance: totalIn - totalOut };
}

function getTodayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

// POST /api/transactions/in — Stock In (no shift)
router.post('/in', auth, async (req, res) => {
  try {
    const { skuId, machineNumber, operatorName, quantity, location } = req.body;
    if (!skuId || !machineNumber || !quantity)
      return res.status(400).json({ message: 'skuId, machineNumber, quantity required' });

    const sku = await SKU.findById(skuId);
    if (!sku || sku.status !== 'active')
      return res.status(404).json({ message: 'SKU not found or inactive' });

    const tx = await Transaction.create({
      type: 'IN',
      sku: sku._id,
      skuName: sku.name,
      txDate: getTodayIST(),
      quantity: parseInt(quantity),
      machineNumber,
      operatorName: operatorName || null,
      location: location || { row: null, shelf: null },
      recordedBy: req.user._id,
      recordedByName: req.user.displayName,
    });

    const balanceData = await getBalance(sku._id);
    req.app.get('io').emit('transaction:new', { transaction: tx, skuId: sku._id, skuName: sku.name, ...balanceData });
    res.status(201).json({ transaction: tx, ...balanceData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/transactions/out — Stock Out (no shift gate, balance guard only)
router.post('/out', auth, async (req, res) => {
  try {
    const { skuId, quantity, department, receiverName } = req.body;
    if (!skuId || !quantity || !department || !receiverName)
      return res.status(400).json({ message: 'skuId, quantity, department, receiverName required' });

    const sku = await SKU.findById(skuId);
    if (!sku || sku.status !== 'active')
      return res.status(404).json({ message: 'SKU not found or inactive' });

    const qtyInt = parseInt(quantity);
    const { balance } = await getBalance(sku._id);
    if (qtyInt > balance) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${balance} pcs. Requested: ${qtyInt} pcs.`,
        code: 'INSUFFICIENT_STOCK',
        available: balance,
      });
    }

    const tx = await Transaction.create({
      type: 'OUT',
      sku: sku._id,
      skuName: sku.name,
      txDate: getTodayIST(),
      quantity: qtyInt,
      department,
      receiverName,
      recordedBy: req.user._id,
      recordedByName: req.user.displayName,
    });

    const balanceData = await getBalance(sku._id);
    req.app.get('io').emit('transaction:new', { transaction: tx, skuId: sku._id, skuName: sku.name, ...balanceData });
    res.status(201).json({ transaction: tx, ...balanceData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/transactions/daily?date=YYYY-MM-DD
router.get('/daily', auth, async (req, res) => {
  try {
    const date = req.query.date || getTodayIST();
    const txs = await Transaction.find({ txDate: date }).sort({ timestamp: -1 }).limit(500).lean();
    res.json(txs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/transactions/balance/:skuId
router.get('/balance/:skuId', auth, async (req, res) => {
  try {
    const oid = toOid(req.params.skuId);
    const data = await getBalance(oid);
    const lastIn = await Transaction.findOne({ sku: oid, type: 'IN', 'location.row': { $ne: null } })
      .sort({ timestamp: -1 }).select('location txDate').lean();
    res.json({ ...data, lastLocation: lastIn?.location || null, lastIn });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
