import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import SkuSearch from '../shared/SkuSearch';
import { useAuth } from '../../context/AuthContext';

export default function QuickSearch() {
  const { user } = useAuth();

  const [sku,       setSku]       = useState(null);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);

  // Location edit state
  const [editing,   setEditing]   = useState(false);
  const [editRow,   setEditRow]   = useState('');
  const [editShelf, setEditShelf] = useState('');
  const [editMachine, setEditMachine] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [dropdowns, setDropdowns] = useState({ machines: [], rows: [] });

  // Load dropdown data once
  useEffect(() => {
    api.get('/masters/dropdowns')
      .then(r => setDropdowns({ machines: r.data.machines || [], rows: r.data.rows || [] }))
      .catch(() => {});
  }, []);

  const fetchResult = async (selected) => {
    if (!selected) { setResult(null); setEditing(false); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/transactions/balance/${selected._id}`);
      setResult(data);
      setEditing(false);
    } catch { setResult(null); }
    finally { setLoading(false); }
  };

  const handleSelect = (selected) => {
    setSku(selected);
    fetchResult(selected);
  };

  const openEdit = () => {
    // Pre-fill with current location from the most recent IN transaction
    const loc = result?.latestIn?.location;
    setEditRow(loc?.row || '');
    setEditShelf(loc?.shelf || '');
    setEditMachine(result?.latestIn?.machineNumber || '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditRow(''); setEditShelf(''); setEditMachine('');
  };

  const saveLocation = async () => {
    if (!result?.latestIn?._id) return toast.error('No Stock In transaction found for this model');
    if (!editRow) return toast.error('Row is required');

    setSaving(true);
    try {
      await api.patch(`/transactions/${result.latestIn._id}/location`, {
        machineNumber: editMachine || null,
        row:           editRow     || null,
        shelf:         editShelf   || null,
      });
      toast.success(`Location updated to ${editRow}${editShelf ? ' / Shelf ' + editShelf : ''}`);
      cancelEdit();
      // Refresh result to show new location
      await fetchResult(sku);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const info = (balance) => {
    if (balance === 0) return { label:'Out of stock', cls:'badge-short',  color:'var(--danger)'  };
    if (balance < 500) return { label:'Low stock',    cls:'badge-partial', color:'var(--warning)' };
    return               { label:'In stock',      cls:'badge-ready',   color:'var(--success)' };
  };

  // Show edit button for both admin and worker roles
  const canEdit = user && ['admin', 'worker'].includes(user.role);

  return (
    <div style={{ maxWidth: 480, margin:'0 auto' }}>
      <div className="page-header">
        <div className="page-title">Quick Stock Check</div>
        <div className="page-sub">Search any model to see balance and location</div>
      </div>

      <div className="card">
        <label className="form-label">Search model</label>
        <SkuSearch value={sku} onChange={handleSelect} placeholder='Type model name e.g. "Sam A55"' />
        <div className="form-hint mt-2">Type 2+ characters to search</div>
      </div>

      {loading && (
        <div className="text-center text-muted" style={{padding:32}}>Checking stock...</div>
      )}

      {result && sku && (() => {
        const st = info(result.balance);
        const hasLatestIn = !!result.latestIn;

        return (
          <div className="card">

            {/* ── Header ── */}
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{sku.name}</div>
                {sku.brand && <div style={{ fontSize: 12, color:'var(--gray-400)' }}>{sku.brand}</div>}
              </div>
              <span className={`badge ${st.cls}`} style={{ fontSize: 13 }}>{st.label}</span>
            </div>

            {/* ── Balance ── */}
            <div style={{
              textAlign:'center', padding:'20px 0',
              borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, color:'var(--gray-400)', marginBottom: 4 }}>Current balance</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: st.color }}>
                {result.balance.toLocaleString()}
              </div>
              <div style={{ fontSize: 13, color:'var(--gray-400)' }}>pieces</div>
            </div>

            {/* ── In / Out totals ── */}
            <div className="two-col" style={{ marginBottom: 14 }}>
              <div style={{ background:'var(--gray-50)', borderRadius: 8, padding:'10px 12px' }}>
                <div style={{ fontSize: 11, color:'var(--gray-400)' }}>Total In</div>
                <div style={{ fontSize: 16, fontWeight: 600, color:'var(--success)' }}>
                  {result.totalIn.toLocaleString()}
                </div>
              </div>
              <div style={{ background:'var(--gray-50)', borderRadius: 8, padding:'10px 12px' }}>
                <div style={{ fontSize: 11, color:'var(--gray-400)' }}>Total Out</div>
                <div style={{ fontSize: 16, fontWeight: 600, color:'var(--warning)' }}>
                  {result.totalOut.toLocaleString()}
                </div>
              </div>
            </div>

            {/* ── Current location + edit trigger ── */}
            {!editing && (
              <div style={{
                display:'flex', alignItems:'center', gap: 10,
                padding:'12px 14px',
                background: result.lastLocation?.row ? 'var(--primary-light)' : 'var(--gray-50)',
                borderRadius: 8, marginBottom: 12,
              }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>📍</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: result.lastLocation?.row ? 'var(--primary)' : 'var(--gray-400)',
                    marginBottom: 2,
                  }}>
                    Current storage location
                  </div>
                  {result.lastLocation?.row ? (
                    <div style={{ fontSize: 16, fontWeight: 700, color:'var(--primary)' }}>
                      {result.lastLocation.row}
                      {result.lastLocation.shelf ? ` · Shelf ${result.lastLocation.shelf}` : ''}
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, color:'var(--gray-400)', fontStyle:'italic' }}>
                      No location set yet
                    </div>
                  )}
                  {result.latestIn?.machineNumber && (
                    <div style={{ fontSize: 12, color:'var(--gray-400)', marginTop: 2 }}>
                      Machine: {result.latestIn.machineNumber}
                    </div>
                  )}
                </div>

                {/* Edit / Update location button */}
                {canEdit && hasLatestIn && (
                  <button
                    onClick={openEdit}
                    style={{
                      flexShrink: 0,
                      padding: '7px 14px',
                      borderRadius: 8,
                      border: '1.5px solid var(--primary)',
                      background: '#fff',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    ✎ Update
                  </button>
                )}
              </div>
            )}

            {/* ── Location edit form ── */}
            {editing && (
              <div style={{
                padding: '16px',
                background: 'var(--primary-light)',
                borderRadius: 10,
                border: '1.5px solid #93c5fd',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color:'var(--primary)', marginBottom: 12 }}>
                  Update storage location for <strong>{sku.name}</strong>
                </div>
                <div style={{ fontSize: 12, color:'var(--primary)', marginBottom: 14, opacity: 0.8 }}>
                  Last stocked: {result.latestIn?.txDate}
                  {result.latestIn?.quantity ? ` · ${result.latestIn.quantity.toLocaleString()} pcs` : ''}
                </div>

                {/* Machine */}
                <div className="form-group">
                  <label className="form-label">Machine</label>
                  <select
                    className="form-select"
                    value={editMachine}
                    onChange={e => setEditMachine(e.target.value)}
                  >
                    <option value="">Select machine (optional)...</option>
                    {dropdowns.machines.map(m => (
                      <option key={m._id} value={m.machineName}>{m.machineName}</option>
                    ))}
                  </select>
                </div>

                {/* Row + Shelf side by side */}
                <div className="two-col">
                  <div>
                    <label className="form-label">
                      Row <span style={{color:'var(--danger)'}}>*</span>
                    </label>
                    <select
                      className="form-select"
                      value={editRow}
                      onChange={e => setEditRow(e.target.value)}
                    >
                      <option value="">Select row...</option>
                      {dropdowns.rows.map(r => (
                        <option key={r._id} value={r.rowName}>{r.rowName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Shelf / Slot</label>
                    <input
                      className="form-input"
                      value={editShelf}
                      onChange={e => setEditShelf(e.target.value)}
                      placeholder="e.g. 3"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display:'flex', gap: 10, marginTop: 14 }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={saveLocation}
                    disabled={saving || !editRow}
                  >
                    {saving ? <span className="spinner" /> : '✓ Save location'}
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 'none' }}
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>

                <div style={{ fontSize: 11, color:'var(--primary)', opacity: 0.7, marginTop: 10 }}>
                  This updates the most recent Stock In entry for this model.
                  Stock quantities remain unchanged.
                </div>
              </div>
            )}

            {/* ── Last stocked info ── */}
            {result.latestIn && (
              <div className="text-muted" style={{ fontSize: 12 }}>
                Last stocked: {result.latestIn.txDate}
                {result.latestIn.operatorName ? ` · ${result.latestIn.operatorName}` : ''}
              </div>
            )}
          </div>
        );
      })()}

      {!loading && !result && !sku && (
        <div className="text-center text-muted" style={{ padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div>Search a model name above</div>
          {canEdit && (
            <div style={{ fontSize: 12, marginTop: 8, color:'var(--gray-400)' }}>
              You can update storage location from search results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
