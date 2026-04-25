const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['IN', 'OUT'], required: true },
  sku:     { type: mongoose.Schema.Types.ObjectId, ref: 'SKU', required: true },
  skuName: { type: String, required: true },

  txDate: { type: String, required: true }, // "YYYY-MM-DD" IST — replaces shiftDate

  quantity: { type: Number, required: true, min: 1 },

  // Stock IN
  machineNumber: { type: String, default: null },
  operatorName:  { type: String, default: null },
  location: {
    row:   { type: String, default: null },
    shelf: { type: String, default: null },
  },

  // Stock OUT
  department:   { type: String, default: null },
  receiverName: { type: String, default: null },

  recordedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedByName: { type: String },
  timestamp:      { type: Date, default: Date.now },
}, { timestamps: true });

transactionSchema.index({ txDate: 1, type: 1 });
transactionSchema.index({ sku: 1, txDate: 1 });
transactionSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
