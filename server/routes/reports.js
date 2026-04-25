const express = require('express');
const router  = express.Router();
const XLSX    = require('xlsx');
const Transaction = require('../models/Transaction');
const Report      = require('../models/Report');
const { auth, adminOnly }       = require('../middleware/auth');
const { generateMonthlyReport } = require('../utils/reportGenerator');

function getTodayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

// GET /api/reports/daily?date=&type=IN|OUT|ALL&skuName=
router.get('/daily', auth, adminOnly, async (req, res) => {
  try {
    const date    = req.query.date    || getTodayIST();
    const type    = req.query.type    || 'ALL';
    const skuName = req.query.skuName || '';

    const filter = { txDate: date };
    if (type !== 'ALL') filter.type = type;
    if (skuName) filter.skuName = { $regex: skuName, $options: 'i' };

    const txs = await Transaction.find(filter).sort({ timestamp: -1 }).limit(1000).lean();

    const totals = txs.reduce((acc, t) => {
      if (t.type === 'IN')  acc.totalIn  += t.quantity;
      if (t.type === 'OUT') acc.totalOut += t.quantity;
      return acc;
    }, { totalIn: 0, totalOut: 0 });

    res.json({ date, transactions: txs, ...totals, count: txs.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/reports/range?from=YYYY-MM-DD&to=YYYY-MM-DD&type=&skuName=
router.get('/range', auth, adminOnly, async (req, res) => {
  try {
    const from    = req.query.from || getTodayIST();
    const to      = req.query.to   || getTodayIST();
    const type    = req.query.type || 'ALL';
    const skuName = req.query.skuName || '';

    const filter = { txDate: { $gte: from, $lte: to } };
    if (type !== 'ALL') filter.type = type;
    if (skuName) filter.skuName = { $regex: skuName, $options: 'i' };

    const txs = await Transaction.find(filter).sort({ txDate: 1, timestamp: 1 }).limit(5000).lean();

    // Daily breakdown
    const dailyMap = {};
    txs.forEach(t => {
      if (!dailyMap[t.txDate]) dailyMap[t.txDate] = { date: t.txDate, in: 0, out: 0 };
      if (t.type === 'IN')  dailyMap[t.txDate].in  += t.quantity;
      if (t.type === 'OUT') dailyMap[t.txDate].out += t.quantity;
    });

    // SKU breakdown
    const skuMap = {};
    txs.forEach(t => {
      if (!skuMap[t.skuName]) skuMap[t.skuName] = { skuName: t.skuName, totalIn: 0, totalOut: 0 };
      if (t.type === 'IN')  skuMap[t.skuName].totalIn  += t.quantity;
      if (t.type === 'OUT') skuMap[t.skuName].totalOut += t.quantity;
    });

    const totals = txs.reduce((a, t) => {
      if (t.type === 'IN')  a.totalIn  += t.quantity;
      if (t.type === 'OUT') a.totalOut += t.quantity;
      return a;
    }, { totalIn: 0, totalOut: 0 });

    res.json({
      from, to,
      transactions: txs,
      dailySummary: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
      skuSummary:   Object.values(skuMap).sort((a, b) => a.skuName.localeCompare(b.skuName)),
      ...totals,
      count: txs.length,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/reports/export?from=&to= — download Excel
router.get('/export', auth, adminOnly, async (req, res) => {
  try {
    const from = req.query.from || getTodayIST();
    const to   = req.query.to   || getTodayIST();

    const txs = await Transaction.find({ txDate: { $gte: from, $lte: to } })
      .sort({ txDate: 1, timestamp: 1 }).lean();

    const txRows = txs.map(t => ({
      'Date':          t.txDate,
      'Type':          t.type,
      'Model Name':    t.skuName,
      'Quantity':      t.quantity,
      'Machine':       t.machineNumber || '',
      'Operator':      t.operatorName  || '',
      'Row':           t.location?.row   || '',
      'Shelf':         t.location?.shelf || '',
      'Department':    t.department    || '',
      'Receiver':      t.receiverName  || '',
      'Recorded By':   t.recordedByName || '',
      'Time':          new Date(t.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
    }));

    const skuMap = {};
    txs.forEach(t => {
      if (!skuMap[t.skuName]) skuMap[t.skuName] = { 'Model Name': t.skuName, 'Total In': 0, 'Total Out': 0 };
      if (t.type === 'IN')  skuMap[t.skuName]['Total In']  += t.quantity;
      if (t.type === 'OUT') skuMap[t.skuName]['Total Out'] += t.quantity;
    });
    const skuRows = Object.values(skuMap)
      .map(r => ({ ...r, 'Balance': r['Total In'] - r['Total Out'] }))
      .sort((a, b) => a['Model Name'].localeCompare(b['Model Name']));

    const dailyMap = {};
    txs.forEach(t => {
      if (!dailyMap[t.txDate]) dailyMap[t.txDate] = { 'Date': t.txDate, 'Total In': 0, 'Total Out': 0 };
      if (t.type === 'IN')  dailyMap[t.txDate]['Total In']  += t.quantity;
      if (t.type === 'OUT') dailyMap[t.txDate]['Total Out'] += t.quantity;
    });
    const dailyRows = Object.values(dailyMap).sort((a, b) => a['Date'].localeCompare(b['Date']));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows),    'Transactions');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(skuRows),   'SKU Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'Daily Summary');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="Report_${from}_to_${to}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/reports/monthly?year=&month=
router.get('/monthly', auth, adminOnly, async (req, res) => {
  try {
    const year  = parseInt(req.query.year)  || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    let report  = await Report.findOne({ year, month });
    if (!report) report = await generateMonthlyReport(year, month, false);
    res.json(report);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/reports/list
router.get('/list', auth, adminOnly, async (req, res) => {
  try {
    const reports = await Report.find().sort({ year: -1, month: -1 }).select('-dailyData -shiftData').lean();
    res.json(reports);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/reports/generate
router.post('/generate', auth, adminOnly, async (req, res) => {
  try {
    const year  = parseInt(req.body.year)  || new Date().getFullYear();
    const month = parseInt(req.body.month) || new Date().getMonth() + 1;
    const report = await generateMonthlyReport(year, month, false);
    res.json(report);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
