const mongoose = require('mongoose');

// NO unique index on the schema — uniqueness is enforced in application logic
// using case-insensitive regex checks. This avoids ALL index-related conflicts:
//   - Mongoose's pre-validation unique check (case-sensitive, wrong)
//   - Collation index conflicts across schema versions
//   - Race conditions on fresh collections

function makeSchema(nameField) {
  const schema = new mongoose.Schema(
    {
      [nameField]: { type: String, required: true, trim: true },
      status:      { type: String, enum: ['active', 'inactive'], default: 'active' },
    },
    { timestamps: true }
  );

  // Non-unique index for fast lookup / sort — no uniqueness constraint here
  schema.index({ [nameField]: 1 });
  schema.index({ status: 1 });

  return schema;
}

const Machine    = mongoose.model('Machine',    makeSchema('machineName'));
const Operator   = mongoose.model('Operator',   makeSchema('operatorName'));
const Department = mongoose.model('Department', makeSchema('departmentName'));
const GodownRow  = mongoose.model('GodownRow',  makeSchema('rowName'));

module.exports = { Machine, Operator, Department, GodownRow };
