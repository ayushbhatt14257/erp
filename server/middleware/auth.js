const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.status === 'inactive') return res.status(401).json({ message: 'Unauthorized' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ message: 'Invalid token' }); }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

const workerOrAdmin = (req, res, next) => {
  if (!['admin','worker'].includes(req.user?.role)) return res.status(403).json({ message: 'Access denied' });
  next();
};

module.exports = { auth, adminOnly, workerOrAdmin };
