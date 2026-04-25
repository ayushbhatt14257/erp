import { useState } from 'react';
import api from '../../utils/api';
import SkuSearch from '../shared/SkuSearch';

export default function QuickSearch() {
  const [sku,     setSku]     = useState(null);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (selected) => {
    setSku(selected);
    if (!selected) { setResult(null); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/transactions/balance/${selected._id}`);
      setResult(data);
    } catch { setResult(null); }
    finally { setLoading(false); }
  };

  const info = (balance) => {
    if (balance === 0) return { label:'Out of stock', cls:'badge-short',   color:'var(--danger)'  };
    if (balance < 500) return { label:'Low stock',    cls:'badge-partial',  color:'var(--warning)' };
    return               { label:'In stock',      cls:'badge-ready',    color:'var(--success)' };
  };

  return (
    <div style={{ maxWidth: 480, margin:'0 auto' }}>
      <div className="page-header">
        <div className="page-title">Quick Stock Check</div>
        <div className="page-sub">Search any model to see balance and location</div>
      </div>

      <div className="card">
        <label className="form-label">Search model</label>
        <SkuSearch value={sku} onChange={handleSelect} placeholder='Type model name e.g. "Sam A55"' />
        <div className="form-hint mt-2">Type 2+ characters · read-only view</div>
      </div>

      {loading && <div className="text-center text-muted" style={{padding:32}}>Checking stock...</div>}

      {result && sku && (() => {
        const st = info(result.balance);
        return (
          <div className="card">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{sku.name}</div>
                {sku.brand && <div style={{ fontSize: 12, color:'var(--gray-400)' }}>{sku.brand}</div>}
              </div>
              <span className={`badge ${st.cls}`} style={{ fontSize: 13 }}>{st.label}</span>
            </div>

            <div style={{ textAlign:'center', padding:'20px 0', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color:'var(--gray-400)', marginBottom: 4 }}>Current balance</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: st.color }}>{result.balance.toLocaleString()}</div>
              <div style={{ fontSize: 13, color:'var(--gray-400)' }}>pieces</div>
            </div>

            <div className="two-col" style={{ marginBottom: 14 }}>
              <div style={{ background:'var(--gray-50)', borderRadius: 8, padding:'10px 12px' }}>
                <div style={{ fontSize: 11, color:'var(--gray-400)' }}>Total In</div>
                <div style={{ fontSize: 16, fontWeight: 600, color:'var(--success)' }}>{result.totalIn.toLocaleString()}</div>
              </div>
              <div style={{ background:'var(--gray-50)', borderRadius: 8, padding:'10px 12px' }}>
                <div style={{ fontSize: 11, color:'var(--gray-400)' }}>Total Out</div>
                <div style={{ fontSize: 16, fontWeight: 600, color:'var(--warning)' }}>{result.totalOut.toLocaleString()}</div>
              </div>
            </div>

            {result.lastLocation?.row && (
              <div style={{ display:'flex', gap: 10, padding:'10px 12px', background:'var(--primary-light)', borderRadius: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>📍</span>
                <div>
                  <div style={{ fontSize: 12, color:'var(--primary)', fontWeight: 600 }}>Last known location</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color:'var(--primary)' }}>
                    {result.lastLocation.row} · Shelf {result.lastLocation.shelf}
                  </div>
                </div>
              </div>
            )}

            {result.lastIn && (
              <div className="text-muted" style={{ fontSize: 12 }}>
                Last Stock In: {result.lastIn.txDate}
                {result.lastIn.operatorName ? ` · ${result.lastIn.operatorName}` : ''}
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
