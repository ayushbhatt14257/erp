import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import SkuSearch from '../shared/SkuSearch';

export default function StockIn() {
  const [sku,          setSku]          = useState(null);
  const [machine,      setMachine]      = useState('');
  const [operator,     setOperator]     = useState('');
  const [quantity,     setQuantity]     = useState('');
  const [row,          setRow]          = useState('');
  const [shelf,        setShelf]        = useState('');
  const [dropdowns,    setDropdowns]    = useState({ machines: [], operators: [], rows: [] });
  const [lastLocation, setLastLocation] = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [lastSuccess,  setLastSuccess]  = useState(null);

  useEffect(() => {
    api.get('/masters/dropdowns').then(r => setDropdowns(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sku) { setLastLocation(null); return; }
    api.get(`/transactions/balance/${sku._id}`)
      .then(r => setLastLocation(r.data.lastLocation))
      .catch(() => {});
  }, [sku]);

  const handleSubmit = async () => {
    if (!sku)          return toast.error('Select a model name');
    if (!machine)      return toast.error('Select a machine');
    if (!quantity || parseInt(quantity) < 1) return toast.error('Enter a valid quantity');

    setSubmitting(true);
    try {
      const { data } = await api.post('/transactions/in', {
        skuId: sku._id,
        machineNumber: machine,
        operatorName: operator || null,
        quantity: parseInt(quantity),
        location: { row: row || null, shelf: shelf || null },
      });
      setLastSuccess(data);
      toast.success(`Stock In ✓  Balance: ${data.balance.toLocaleString()} pcs`);
      setSku(null); setQuantity(''); setRow(''); setShelf(''); setLastLocation(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error recording Stock In');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Stock In</div>
        <div className="page-sub">Record production entry into godown</div>
      </div>

      <div className="card">
        {/* Machine */}
        <div className="form-group">
          <label className="form-label">Machine <span style={{color:'var(--danger)'}}>*</span></label>
          <select className="form-select" value={machine} onChange={e => setMachine(e.target.value)}>
            <option value="">Select machine...</option>
            {dropdowns.machines?.map(m => <option key={m._id} value={m.machineName}>{m.machineName}</option>)}
          </select>
        </div>

        {/* Model */}
        <div className="form-group">
          <label className="form-label">Model name <span style={{color:'var(--danger)'}}>*</span></label>
          <SkuSearch value={sku} onChange={setSku} />
          <div className="form-hint">Type 2+ characters to search</div>
        </div>

        {/* Operator */}
        <div className="form-group">
          <label className="form-label">Operator name</label>
          <select className="form-select" value={operator} onChange={e => setOperator(e.target.value)}>
            <option value="">Select operator (optional)...</option>
            {dropdowns.operators?.map(o => <option key={o._id} value={o.operatorName}>{o.operatorName}</option>)}
          </select>
        </div>

        {/* Quantity */}
        <div className="form-group">
          <label className="form-label">Quantity In <span style={{color:'var(--danger)'}}>*</span></label>
          <input className="form-input large" type="number" inputMode="numeric"
            value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" min="1" />
        </div>

        <hr className="divider" />

        {/* Location */}
        <label className="form-label">Storage location</label>
        {lastLocation?.row && (
          <div className="alert alert-info" style={{ cursor:'pointer', marginBottom: 10 }}
            onClick={() => { setRow(lastLocation.row); setShelf(lastLocation.shelf || ''); }}>
            📍 Last: Row {lastLocation.row} · Shelf {lastLocation.shelf} — tap to reuse
          </div>
        )}
        <div className="two-col" style={{ marginBottom: 14 }}>
          <div>
            <label className="form-label">Row</label>
            <select className="form-select" value={row} onChange={e => setRow(e.target.value)}>
              <option value="">Select row...</option>
              {dropdowns.rows?.map(r => <option key={r._id} value={r.rowName}>{r.rowName}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Shelf / slot</label>
            <input className="form-input" value={shelf} onChange={e => setShelf(e.target.value)}
              placeholder="e.g. 3" inputMode="numeric" />
          </div>
        </div>

        {lastSuccess && (
          <div className="alert alert-success" style={{ marginBottom: 14 }}>
            ✓ Recorded! Balance now: <strong>{lastSuccess.balance?.toLocaleString()} pcs</strong>
          </div>
        )}

        <button className="btn btn-success btn-block" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <span className="spinner" /> : '✓ Submit Stock In'}
        </button>
        <div className="form-hint text-center mt-2">Updates all devices in real time</div>
      </div>
    </div>
  );
}
