import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../../utils/api';
import SkuSearch from '../shared/SkuSearch';
import { useAuth } from '../../context/AuthContext';

// ── Stock Filter tab ──────────────────────────────────────────────────────────
function StockFilter() {
  const [minQty,    setMinQty]    = useState('');
  const [results,   setResults]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [searched,  setSearched]  = useState(false);

  const handleFilter = async () => {
    const qty = parseInt(minQty);
    if (isNaN(qty) || qty < 0) return toast.error('Enter a valid quantity');
    setLoading(true);
    setResults(null);
    try {
      const { data } = await api.get(`/dashboard/stock-filter?minQty=${qty}`);
      setResults(data);
      setSearched(true);
      if (data.count === 0) toast('No models found with stock ≥ ' + qty, { icon: '📦' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching stock');
    } finally { setLoading(false); }
  };

  const handleDownload = () => {
    if (!results?.results?.length) return;
    setDlLoading(true);
    try {
      // Format date-time in IST for filename and sheet
      const now    = new Date();
      const istStr = now.toLocaleString('en-IN', {
        timeZone:   'Asia/Kolkata',
        day:        '2-digit',
        month:      '2-digit',
        year:       'numeric',
        hour:       '2-digit',
        minute:     '2-digit',
        hour12:     true,
      });
      const fileDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
      const fileTime = now.toLocaleTimeString('en-IN', { timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', hour12:false }).replace(':','-');

      // Build Excel rows
      const rows = results.results.map((r, i) => ({
        '#':            i + 1,
        'Model Name':   r.skuName,
        'Stock (pcs)':  r.balance,
        'Location':     r.lastRow ? `${r.lastRow}${r.lastShelf ? ' / Shelf ' + r.lastShelf : ''}` : '—',
      }));

      // Info row at top
      const infoRows = [
        { '#': 'Report', 'Model Name': `Stock ≥ ${results.minQty} pcs`, 'Stock (pcs)': '', 'Location': '' },
        { '#': 'Date',   'Model Name': istStr,                           'Stock (pcs)': '', 'Location': '' },
        { '#': 'Total',  'Model Name': `${results.count} models`,        'Stock (pcs)': '', 'Location': '' },
        { '#': '',       'Model Name': '',                                'Stock (pcs)': '', 'Location': '' },
        ...rows,
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(infoRows);

      // Column widths
      ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 14 }, { wch: 20 }];

      XLSX.utils.book_append_sheet(wb, ws, 'Stock Filter');
      XLSX.writeFile(wb, `StockFilter_min${results.minQty}_${fileDate}_${fileTime}.xlsx`);
      toast.success('Excel downloaded');
    } catch {
      toast.error('Download failed');
    } finally { setDlLoading(false); }
  };

  return (
    <div>
      {/* Input card */}
      <div className="card">
        <div className="card-title">Filter by minimum stock</div>
        <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 14 }}>
          Enter a quantity — all models with stock greater than or equal to that number will be shown.
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Minimum quantity (pcs)</label>
            <input
              className="form-input large"
              type="number"
              inputMode="numeric"
              min="0"
              value={minQty}
              onChange={e => setMinQty(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFilter()}
              placeholder="e.g. 800"
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ flex: 'none', padding: '12px 24px', fontSize: 15 }}
            onClick={handleFilter}
            disabled={loading || minQty === ''}
          >
            {loading ? <span className="spinner" /> : 'Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="card">
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                Models with stock ≥ {results.minQty.toLocaleString()} pcs
              </div>
              <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
                {results.count} model{results.count !== 1 ? 's' : ''} found
                {' · '}sorted by highest stock first
              </div>
            </div>

            {/* Download button */}
            <button
              className="btn btn-success btn-sm"
              onClick={handleDownload}
              disabled={dlLoading || !results.results.length}
            >
              {dlLoading ? 'Downloading...' : '⬇ Download Excel'}
            </button>
          </div>

          {results.results.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Model Name</th>
                    <th style={{ textAlign: 'right' }}>Stock (pcs)</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((r, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{r.skuName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 16, color: 'var(--success)' }}>
                        {r.balance.toLocaleString()}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--gray-400)' }}>
                        {r.lastRow
                          ? `${r.lastRow}${r.lastShelf ? ' · Shelf ' + r.lastShelf : ''}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-muted" style={{ padding: 32 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
              <div>No models found with stock ≥ {results.minQty.toLocaleString()} pcs</div>
            </div>
          )}

          {/* Footer */}
          {results.results.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 12, textAlign: 'right' }}>
              Generated at{' '}
              {new Date(results.generatedAt).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit', minute: '2-digit', hour12: true,
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty state before first search */}
      {!loading && !results && (
        <div className="text-center text-muted" style={{ padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Enter a minimum quantity above</div>
          <div style={{ fontSize: 13 }}>e.g. enter 800 to see all models with 800+ pcs in stock</div>
        </div>
      )}
    </div>
  );
}

// ── Search Model tab (existing) ───────────────────────────────────────────────
function SearchModel() {
  const { user } = useAuth();

  const [sku,         setSku]         = useState(null);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [editing,     setEditing]     = useState(false);
  const [editRow,     setEditRow]     = useState('');
  const [editShelf,   setEditShelf]   = useState('');
  const [editMachine, setEditMachine] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [dropdowns,   setDropdowns]   = useState({ machines: [], rows: [] });

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

  const handleSelect = (selected) => { setSku(selected); fetchResult(selected); };

  const openEdit = () => {
    const loc = result?.latestIn?.location;
    setEditRow(loc?.row || '');
    setEditShelf(loc?.shelf || '');
    setEditMachine(result?.latestIn?.machineNumber || '');
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setEditRow(''); setEditShelf(''); setEditMachine(''); };

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
      await fetchResult(sku);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const canEdit = user && ['admin', 'worker'].includes(user.role);

  const info = (balance) => {
    if (balance === 0) return { label:'Out of stock', cls:'badge-short',  color:'var(--danger)'  };
    if (balance < 500) return { label:'Low stock',    cls:'badge-partial', color:'var(--warning)' };
    return               { label:'In stock',      cls:'badge-ready',   color:'var(--success)' };
  };

  return (
    <div>
      <div className="card">
        <label className="form-label">Search model</label>
        <SkuSearch value={sku} onChange={handleSelect} placeholder='Type model name e.g. "Sam A55"' />
        <div className="form-hint mt-2">Type 2+ characters to search</div>
      </div>

      {loading && <div className="text-center text-muted" style={{ padding: 32 }}>Checking stock...</div>}

      {result && sku && (() => {
        const st = info(result.balance);
        return (
          <div className="card">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{sku.name}</div>
                {sku.brand && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{sku.brand}</div>}
              </div>
              <span className={`badge ${st.cls}`} style={{ fontSize: 13 }}>{st.label}</span>
            </div>

            <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4 }}>Current balance</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: st.color }}>{result.balance.toLocaleString()}</div>
              <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>pieces</div>
            </div>

            <div className="two-col" style={{ marginBottom: 14 }}>
              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Total In</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--success)' }}>{result.totalIn.toLocaleString()}</div>
              </div>
              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Total Out</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--warning)' }}>{result.totalOut.toLocaleString()}</div>
              </div>
            </div>

            {/* Location + edit */}
            {!editing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: result.lastLocation?.row ? 'var(--primary-light)' : 'var(--gray-50)', borderRadius: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>📍</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: result.lastLocation?.row ? 'var(--primary)' : 'var(--gray-400)', marginBottom: 2 }}>
                    Current storage location
                  </div>
                  {result.lastLocation?.row ? (
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                      {result.lastLocation.row}{result.lastLocation.shelf ? ` · Shelf ${result.lastLocation.shelf}` : ''}
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, color: 'var(--gray-400)', fontStyle: 'italic' }}>No location set yet</div>
                  )}
                  {result.latestIn?.machineNumber && (
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>Machine: {result.latestIn.machineNumber}</div>
                  )}
                </div>
                {canEdit && result.latestIn && (
                  <button onClick={openEdit} style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 8, border: '1.5px solid var(--primary)', background: '#fff', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    ✎ Update
                  </button>
                )}
              </div>
            )}

            {editing && (
              <div style={{ padding: 16, background: 'var(--primary-light)', borderRadius: 10, border: '1.5px solid #93c5fd', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginBottom: 12 }}>
                  Update storage location for <strong>{sku.name}</strong>
                </div>
                <div className="form-group">
                  <label className="form-label">Machine</label>
                  <select className="form-select" value={editMachine} onChange={e => setEditMachine(e.target.value)}>
                    <option value="">Select machine (optional)...</option>
                    {dropdowns.machines.map(m => <option key={m._id} value={m.machineName}>{m.machineName}</option>)}
                  </select>
                </div>
                <div className="two-col">
                  <div>
                    <label className="form-label">Row <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select className="form-select" value={editRow} onChange={e => setEditRow(e.target.value)}>
                      <option value="">Select row...</option>
                      {dropdowns.rows.map(r => <option key={r._id} value={r.rowName}>{r.rowName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Shelf / Slot</label>
                    <input className="form-input" value={editShelf} onChange={e => setEditShelf(e.target.value)} placeholder="e.g. 3" inputMode="numeric" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveLocation} disabled={saving || !editRow}>
                    {saving ? <span className="spinner" /> : '✓ Save location'}
                  </button>
                  <button className="btn btn-outline" style={{ flex: 'none' }} onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            )}

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
        </div>
      )}
    </div>
  );
}

// ── Main QuickSearch page with two tabs ───────────────────────────────────────
export default function QuickSearch() {
  const [tab, setTab] = useState('search'); // 'search' | 'filter'

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Quick Search</div>
        <div className="page-sub">Search individual models or filter by stock level</div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setTab('search')}
          style={{
            padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            background: 'none', border: 'none', fontFamily: 'inherit',
            color:       tab === 'search' ? 'var(--primary)' : 'var(--gray-600)',
            borderBottom: tab === 'search' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          🔍 Search Model
        </button>
        <button
          onClick={() => setTab('filter')}
          style={{
            padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            background: 'none', border: 'none', fontFamily: 'inherit',
            color:       tab === 'filter' ? 'var(--primary)' : 'var(--gray-600)',
            borderBottom: tab === 'filter' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          📊 Stock Filter
        </button>
      </div>

      {tab === 'search' && <SearchModel />}
      {tab === 'filter' && <StockFilter />}
    </div>
  );
}
