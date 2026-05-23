import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api, { downloadFile } from '../../utils/api';

const STATUS_CONFIG = {
  READY:        { label: '✅ Ready',           badge: 'badge-ready',   color: 'var(--success)' },
  PARTIAL:      { label: '⚠ Partial',          badge: 'badge-partial', color: 'var(--warning)' },
  OUT_OF_STOCK: { label: '❌ Out of Stock',     badge: 'badge-short',   color: 'var(--danger)'  },
  NOT_FOUND:    { label: '❔ Model Not Found',  badge: 'badge-inactive',color: 'var(--gray-400)'},
};

export default function OrderCheck() {
  const [orderRef,   setOrderRef]   = useState('');
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [dlLoading,  setDlLoading]  = useState(false);
  const [drag,       setDrag]       = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchModel,  setSearchModel]  = useState('');
  const fileRef = useRef(null);

  // ── Upload and check ────────────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return;
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) return toast.error('Only .xlsx, .xls or .csv files accepted');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('orderRef', orderRef || file.name.replace(/\.[^.]+$/, ''));

    setLoading(true);
    setResult(null);
    setFilterStatus('ALL');
    setSearchModel('');

    try {
      const { data } = await api.post('/orders/check', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      toast.success(`Checked ${data.summary.total} models`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error processing file');
    } finally {
      setLoading(false);
      // Reset file input so same file can be re-uploaded
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ── Authenticated Excel download ────────────────────────────────────────────
  const handleDownload = async () => {
    if (!result) return;
    setDlLoading(true);
    try {
      // POST the results JSON to the export endpoint — axios adds JWT header
      const response = await api.post('/orders/export', {
        results:  filteredRows,   // export only what's currently filtered/shown
        orderRef: result.orderRef,
      }, { responseType: 'blob' });

      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `OrderCheck_${(result.orderRef || 'report').replace(/[^a-z0-9]/gi,'_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Excel downloaded');
    } catch {
      toast.error('Download failed');
    } finally { setDlLoading(false); }
  };

  // ── Filtering (client-side — no re-fetch needed) ────────────────────────────
  const filteredRows = result?.results?.filter(r => {
    const statusMatch = filterStatus === 'ALL' || r.status === filterStatus;
    const nameMatch   = !searchModel || r.modelName.toLowerCase().includes(searchModel.toLowerCase());
    return statusMatch && nameMatch;
  }) || [];

  // Summary pill counts
  const s = result?.summary;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Order Fulfilment Check</div>
        <div className="page-sub">Upload your order list — see live stock availability for every model</div>
      </div>

      {/* ── Upload card ── */}
      <div className="card">
        <div className="form-group">
          <label className="form-label">Order reference (optional)</label>
          <input
            className="form-input"
            value={orderRef}
            onChange={e => setOrderRef(e.target.value)}
            placeholder="e.g. Kwality Flip Cover Order May 2026"
          />
        </div>

        <div
          className={`upload-zone ${drag ? 'drag' : ''}`}
          onDragOver={e  => { e.preventDefault(); setDrag(true);  }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
            Drop your Excel file here or tap to browse
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>
            Col A = Model Name &nbsp;·&nbsp; Col B = Quantity (pis)
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
            .xlsx or .csv &nbsp;·&nbsp; Supports 800+ rows
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray-400)', fontSize: 14 }}>
            <div style={{ marginBottom: 8 }}>⏳ Checking stock for all models...</div>
            <div style={{ fontSize: 12 }}>Large lists may take a few seconds</div>
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {result && (
        <>
          {/* Summary bar */}
          <div className="metrics-grid" style={{ marginBottom: 12 }}>
            <div className="metric-card" style={{ cursor:'pointer', border: filterStatus==='ALL' ? '2px solid var(--primary)' : undefined }}
              onClick={() => setFilterStatus('ALL')}>
              <div className="metric-label">Total Models</div>
              <div className="metric-value">{s.total}</div>
            </div>
            <div className="metric-card" style={{ cursor:'pointer', border: filterStatus==='READY' ? '2px solid var(--success)' : undefined }}
              onClick={() => setFilterStatus(filterStatus === 'READY' ? 'ALL' : 'READY')}>
              <div className="metric-label">✅ Ready</div>
              <div className="metric-value green">{s.ready}</div>
            </div>
            <div className="metric-card" style={{ cursor:'pointer', border: filterStatus==='PARTIAL' ? '2px solid var(--warning)' : undefined }}
              onClick={() => setFilterStatus(filterStatus === 'PARTIAL' ? 'ALL' : 'PARTIAL')}>
              <div className="metric-label">⚠ Partial</div>
              <div className="metric-value" style={{ color:'var(--warning)' }}>{s.partial}</div>
            </div>
            <div className="metric-card" style={{ cursor:'pointer', border: filterStatus==='OUT_OF_STOCK' ? '2px solid var(--danger)' : undefined }}
              onClick={() => setFilterStatus(filterStatus === 'OUT_OF_STOCK' ? 'ALL' : 'OUT_OF_STOCK')}>
              <div className="metric-label">❌ Out of Stock</div>
              <div className="metric-value red">{s.outOfStock}</div>
            </div>
            <div className="metric-card" style={{ cursor:'pointer', border: filterStatus==='NOT_FOUND' ? '2px solid var(--gray-400)' : undefined }}
              onClick={() => setFilterStatus(filterStatus === 'NOT_FOUND' ? 'ALL' : 'NOT_FOUND')}>
              <div className="metric-label">❔ Not Found</div>
              <div className="metric-value" style={{ color:'var(--gray-400)' }}>{s.notFound}</div>
            </div>
          </div>

          {/* Results table card */}
          <div className="card">
            {/* Table header row — title + search + download */}
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:14 }}>
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ fontWeight:600, fontSize:15 }}>{result.orderRef}</div>
                <div style={{ fontSize:12, color:'var(--gray-400)' }}>
                  {filteredRows.length} of {result.results.length} shown
                  {filterStatus !== 'ALL' && ` · filtered: ${STATUS_CONFIG[filterStatus]?.label}`}
                </div>
              </div>

              {/* Model search */}
              <div style={{ position:'relative', minWidth:180 }}>
                <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }}>⌕</span>
                <input
                  className="form-input"
                  style={{ paddingLeft:30, fontSize:13, padding:'7px 10px 7px 30px' }}
                  placeholder="Search model..."
                  value={searchModel}
                  onChange={e => setSearchModel(e.target.value)}
                />
              </div>

              {/* Download button */}
              <button
                className="btn btn-success btn-sm"
                style={{ flex:'none' }}
                onClick={handleDownload}
                disabled={dlLoading}
              >
                {dlLoading ? 'Downloading...' : '⬇ Download Excel'}
              </button>
            </div>

            {/* Filter chips */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              {['ALL','READY','PARTIAL','OUT_OF_STOCK','NOT_FOUND'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    padding:'4px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                    border: '1.5px solid',
                    borderColor: filterStatus===st ? 'var(--primary)' : 'var(--border)',
                    background:  filterStatus===st ? 'var(--primary-light)' : '#fff',
                    color:       filterStatus===st ? 'var(--primary)' : 'var(--gray-600)',
                    fontWeight:  filterStatus===st ? 600 : 400,
                  }}
                >
                  {st === 'ALL' ? `All (${result.results.length})` :
                   st === 'READY' ? `Ready (${s.ready})` :
                   st === 'PARTIAL' ? `Partial (${s.partial})` :
                   st === 'OUT_OF_STOCK' ? `Out of Stock (${s.outOfStock})` :
                   `Not Found (${s.notFound})`}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width:40 }}>#</th>
                    <th>Model Name</th>
                    <th style={{ textAlign:'right' }}>Order Qty</th>
                    <th style={{ textAlign:'right' }}>Available Stock</th>
                    <th style={{ textAlign:'right' }}>Shortfall</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => {
                    const cfg = STATUS_CONFIG[row.status];
                    // Find original row number from full results
                    const originalIdx = result.results.indexOf(row);
                    return (
                      <tr key={idx}>
                        <td style={{ color:'var(--gray-400)', fontSize:12 }}>{originalIdx + 1}</td>
                        <td style={{ fontWeight:500 }}>{row.modelName}</td>
                        <td style={{ textAlign:'right', fontWeight:500 }}>
                          {row.orderQty.toLocaleString()}
                        </td>
                        <td style={{ textAlign:'right', fontWeight:700, color:
                          row.available === null ? 'var(--gray-400)' :
                          row.available === 0   ? 'var(--danger)'   :
                          row.available >= row.orderQty ? 'var(--success)' : 'var(--warning)'
                        }}>
                          {row.available === null ? '—' : row.available.toLocaleString()}
                        </td>
                        <td style={{ textAlign:'right', color: row.shortfall > 0 ? 'var(--danger)' : 'var(--gray-400)', fontWeight: row.shortfall > 0 ? 600 : 400 }}>
                          {row.shortfall === null ? '—' :
                           row.shortfall === 0    ? '—' :
                           row.shortfall.toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge ${cfg.badge}`} style={{ fontSize:11, whiteSpace:'nowrap' }}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted" style={{ padding:32 }}>
                        No results match the current filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Row count footer */}
            <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:12, textAlign:'right' }}>
              Checked at {new Date(result.checkedAt).toLocaleTimeString('en-IN', { timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit' })}
              &nbsp;·&nbsp; {result.results.length} total rows
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !result && (
        <div className="text-center text-muted" style={{ padding:48 }}>
          <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
          <div style={{ fontSize:15, fontWeight:500, marginBottom:6 }}>Upload your order list to get started</div>
          <div style={{ fontSize:13 }}>Supports Excel files with 800+ models</div>
        </div>
      )}
    </div>
  );
}
