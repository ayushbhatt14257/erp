import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import SkuSearch from '../shared/SkuSearch';

export default function StockOut() {
  const [sku,          setSku]          = useState(null);
  const [quantity,     setQuantity]     = useState('');
  const [department,   setDepartment]   = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [departments,  setDepartments]  = useState([]);
  const [balance,      setBalance]      = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [lastSuccess,  setLastSuccess]  = useState(null);

  useEffect(() => {
    api.get('/masters/dropdowns').then(r => setDepartments(r.data.departments)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sku) { setBalance(null); return; }
    api.get(`/transactions/balance/${sku._id}`)
      .then(r => setBalance(r.data.balance))
      .catch(() => setBalance(null));
  }, [sku]);

  const qty       = parseInt(quantity) || 0;
  const overLimit = balance !== null && qty > balance;

  const handleSubmit = async () => {
    if (!sku)          return toast.error('Select a model name');
    if (qty < 1)       return toast.error('Enter a valid quantity');
    if (!department)   return toast.error('Select a department');
    if (!receiverName.trim()) return toast.error('Enter receiver name');
    if (overLimit)     return toast.error(`Only ${balance} pcs available`);

    setSubmitting(true);
    try {
      const { data } = await api.post('/transactions/out', {
        skuId: sku._id, quantity: qty, department, receiverName,
      });
      setLastSuccess(data);
      toast.success(`Stock Out ✓  Remaining: ${data.balance.toLocaleString()} pcs`);
      setSku(null); setQuantity(''); setReceiverName(''); setBalance(null);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'INSUFFICIENT_STOCK') toast.error(`Only ${err.response.data.available} pcs available`);
      else toast.error(err.response?.data?.message || 'Error recording Stock Out');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Stock Out</div>
        <div className="page-sub">Record department requisition</div>
      </div>

      <div className="card">
        {/* Model */}
        <div className="form-group">
          <label className="form-label">Model name <span style={{color:'var(--danger)'}}>*</span></label>
          <SkuSearch value={sku} onChange={setSku} />
        </div>

        {/* Balance indicator */}
        {sku && balance !== null && (
          <div className={`alert ${balance === 0 ? 'alert-danger' : overLimit ? 'alert-warning' : 'alert-success'}`} style={{ marginBottom: 14 }}>
            Available: <strong>{balance.toLocaleString()} pcs</strong>
            {overLimit && ' — quantity exceeds available stock'}
          </div>
        )}

        {/* Quantity */}
        <div className="form-group">
          <label className="form-label">Quantity Out <span style={{color:'var(--danger)'}}>*</span></label>
          <input className="form-input large"
            style={{ borderColor: overLimit ? 'var(--danger)' : undefined }}
            type="number" inputMode="numeric"
            value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" min="1" />
          {overLimit && <div className="form-error">Exceeds available stock ({balance?.toLocaleString()} pcs)</div>}
        </div>

        {/* Department */}
        <div className="form-group">
          <label className="form-label">Receiving department <span style={{color:'var(--danger)'}}>*</span></label>
          <div style={{ display:'flex', flexWrap:'wrap', gap: 8 }}>
            {departments.map(d => (
              <button key={d._id}
                onClick={() => setDepartment(d.departmentName)}
                style={{
                  padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
                  borderColor: department === d.departmentName ? 'var(--primary)' : 'var(--border)',
                  background:  department === d.departmentName ? 'var(--primary-light)' : '#fff',
                  color:       department === d.departmentName ? 'var(--primary)' : 'var(--gray-600)',
                  fontWeight:  department === d.departmentName ? 600 : 400,
                }}>
                {d.departmentName}
              </button>
            ))}
          </div>
        </div>

        {/* Receiver */}
        <div className="form-group">
          <label className="form-label">Receiver name <span style={{color:'var(--danger)'}}>*</span></label>
          <input className="form-input" value={receiverName}
            onChange={e => setReceiverName(e.target.value)} placeholder="Name of person receiving..." />
        </div>

        {lastSuccess && (
          <div className="alert alert-success" style={{ marginBottom: 14 }}>
            ✓ Recorded! Remaining: <strong>{lastSuccess.balance?.toLocaleString()} pcs</strong>
          </div>
        )}

        <button className="btn btn-danger btn-block" onClick={handleSubmit}
          disabled={submitting || overLimit || balance === 0}>
          {submitting ? <span className="spinner" /> : '↑ Submit Stock Out'}
        </button>
        <div className="form-hint text-center mt-2">Balance cannot go negative — server enforced</div>
      </div>
    </div>
  );
}
