const express = require('express');
const router  = express.Router();
const { Machine, Operator, Department, GodownRow } = require('../models/Masters');
const { auth, adminOnly } = require('../middleware/auth');

// Escape special regex chars in a string
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Case-insensitive exact-match check
async function isDuplicate(Model, nameField, val) {
  const doc = await Model.findOne({
    [nameField]: { $regex: `^${escapeRegex(val)}$`, $options: 'i' },
  }).lean();
  return !!doc;
}

// ── Generic CRUD factory ──────────────────────────────────────────────────────
function makeCRUD(Model, nameField) {

  const getAll = async (req, res) => {
    try {
      const filter = req.query.active === 'true' ? { status: 'active' } : {};
      const docs   = await Model.find(filter).sort({ createdAt: 1 }).lean();
      res.json(docs);
    } catch (err) { res.status(500).json({ message: err.message }); }
  };

  const create = async (req, res) => {
    try {
      const val = (req.body[nameField] || '').trim();
      if (!val) return res.status(400).json({ message: `${nameField} is required` });

      if (await isDuplicate(Model, nameField, val))
        return res.status(400).json({ message: `"${val}" already exists` });

      const doc = await Model.create({ [nameField]: val, status: 'active' });
      res.status(201).json(doc);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  const update = async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(
        req.params.id, req.body, { new: true, runValidators: true }
      );
      if (!doc) return res.status(404).json({ message: 'Not found' });
      res.json(doc);
    } catch (err) { res.status(500).json({ message: err.message }); }
  };

  return { getAll, create, update };
}

const machineCRUD  = makeCRUD(Machine,    'machineName');
const operatorCRUD = makeCRUD(Operator,   'operatorName');
const deptCRUD     = makeCRUD(Department, 'departmentName');
const rowCRUD      = makeCRUD(GodownRow,  'rowName');

// ── Routes ────────────────────────────────────────────────────────────────────
router.get   ('/machines',      auth,            machineCRUD.getAll);
router.post  ('/machines',      auth, adminOnly, machineCRUD.create);
router.patch ('/machines/:id',  auth, adminOnly, machineCRUD.update);

router.get   ('/operators',     auth,            operatorCRUD.getAll);
router.post  ('/operators',     auth, adminOnly, operatorCRUD.create);
router.patch ('/operators/:id', auth, adminOnly, operatorCRUD.update);

router.get   ('/departments',     auth,            deptCRUD.getAll);
router.post  ('/departments',     auth, adminOnly, deptCRUD.create);
router.patch ('/departments/:id', auth, adminOnly, deptCRUD.update);

router.get   ('/rows',     auth,            rowCRUD.getAll);
router.post  ('/rows',     auth, adminOnly, rowCRUD.create);
router.patch ('/rows/:id', auth, adminOnly, rowCRUD.update);

// ── Combined dropdown endpoint ────────────────────────────────────────────────
router.get('/dropdowns', auth, async (req, res) => {
  try {
    const [machines, operators, departments, rows] = await Promise.all([
      Machine.find({ status: 'active' }).sort({ machineName: 1 }).lean(),
      Operator.find({ status: 'active' }).sort({ operatorName: 1 }).lean(),
      Department.find({ status: 'active' }).sort({ departmentName: 1 }).lean(),
      GodownRow.find({ status: 'active' }).sort({ rowName: 1 }).lean(),
    ]);
    res.json({ machines, operators, departments, rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Seed ─────────────────────────────────────────────────────────────────────
// Uses the same isDuplicate check — skips existing, inserts missing, never fails
router.post('/seed', auth, adminOnly, async (req, res) => {
  try {
    const counts = { machines: 0, operators: 0, departments: 0, rows: 0 };

    // Machines M-01 … M-10
    for (let i = 1; i <= 10; i++) {
      const name = `M-${String(i).padStart(2, '0')}`;
      if (!(await isDuplicate(Machine, 'machineName', name))) {
        await Machine.create({ machineName: name, status: 'active' });
        counts.machines++;
      }
    }

    // Operators
    for (const name of ['Rahul', 'Mohan', 'Rakesh', 'Amit']) {
      if (!(await isDuplicate(Operator, 'operatorName', name))) {
        await Operator.create({ operatorName: name, status: 'active' });
        counts.operators++;
      }
    }

    // Departments
    for (const name of ['Dispatch', 'Packaging', 'Printing', 'Quality Check']) {
      if (!(await isDuplicate(Department, 'departmentName', name))) {
        await Department.create({ departmentName: name, status: 'active' });
        counts.departments++;
      }
    }

    // Godown Rows Row-1 … Row-50
    for (let i = 1; i <= 50; i++) {
      const name = `Row-${i}`;
      if (!(await isDuplicate(GodownRow, 'rowName', name))) {
        await GodownRow.create({ rowName: name, status: 'active' });
        counts.rows++;
      }
    }

    res.json({
      message: `Seeded ✓  machines: +${counts.machines}, operators: +${counts.operators}, departments: +${counts.departments}, rows: +${counts.rows}`,
      counts,
    });
  } catch (err) {
    res.status(500).json({ message: `Seeding failed: ${err.message}` });
  }
});

// ── Legacy (backward compat) ──────────────────────────────────────────────────
router.get('/all', auth, async (req, res) => {
  try {
    const [machines, rows, departments] = await Promise.all([
      Machine.find({ status: 'active' }).sort({ machineName: 1 }).lean(),
      GodownRow.find({ status: 'active' }).sort({ rowName: 1 }).lean(),
      Department.find({ status: 'active' }).sort({ departmentName: 1 }).lean(),
    ]);
    res.json({ machines, rows, departments });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
