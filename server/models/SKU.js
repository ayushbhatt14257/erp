const mongoose = require('mongoose');

const skuSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  searchToken: { type: String, required: true, lowercase: true, unique: true },
  brand:       { type: String, trim: true, default: '' },
  status:      { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

skuSchema.index({ searchToken: 1 });
skuSchema.index({ status: 1, name: 1 });

module.exports = mongoose.model('SKU', skuSchema);
