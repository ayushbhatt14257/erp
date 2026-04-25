import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import ConfirmModal from '../../shared/ConfirmModal';

export default function SkuManager() {
  const [skus,      setSkus]      = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [statusFil, setStatusFil] = useState('');
  const [newName,   setNewName]   = useState('');
  const [newBrand,  setNewBrand]  = useState('');
  const [bulkText,  setBulkText]  = useState('');
  const [showBulk,  setShowBulk]  = useState(false);
  const [adding,    setAdding]    = useState(false);
  const [confirm,   setConfirm]   = useState(null); // { sku, type: 'delete'|'toggle' }

  const load = async () => {
    try {
      const { data } = await api.get(`/skus?q=${search}&page=${page}&limit=50&status=${statusFil}`);
      setSkus(data.skus); setTotal(data.total);
    } catch { toast.error('Failed to load SKUs'); }
  };
  useEffect(() => { load(); }, [search, page, statusFil]);

  const add = async () => {
    if (!newName.trim()) return toast.error('Model name required');
    setAdding(true);
    try {
      await api.post('/skus', { name: newName.trim(), brand: newBrand.trim() });
      toast.success(`"${newName}" added`);
      setNewName(''); setNewBrand(''); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error adding SKU'); }
    finally { setAdding(false); }
  };

  const bulkImport = async () => {
    const lines = bulkText.trim().split('\n').filter(Boolean);
    const skus  = lines
      .map(l => { const p = l.split(','); return { name: p[0]?.trim(), brand: p[1]?.trim() || '' }; })
      .filter(s => s.name);
    if (!skus.length) return toast.error('No valid lines found');
    try {
      const { data } = await api.post('/skus/bulk', { skus });
      toast.success(`Added ${data.inserted} SKUs (${data.skipped} already existed)`);
      setBulkText(''); setShowBulk(false); load();
    } catch { toast.error('Bulk import failed'); }
  };

  // Issue 4 fix: handle three possible delete outcomes from backend
  const handleDelete = async (sku) => {
    try {
      const { data } = await api.delete(`/skus/${sku._id}`);
      if (data.action === 'deleted') {
        toast.success(data.message);
      } else if (data.action === 'archived') {
        toast(`⚠ ${data.message}`, { icon: '📦', duration: 5000 });
      }
      load();
    } catch (err) {
      // action === 'blocked' comes back as 400
      const msg = err.response?.data?.message || 'Error';
      toast.error(msg, { duration: 6000 });
    }
    setConfirm(null);
  };

  const toggleStatus = async (sku) => {
    const status = sku.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/skus/${sku._id}`, { status });
      toast.success(`"${sku.name}" ${status}`); load();
    } catch { toast.error('Update failed'); }
    setConfirm(null);
  };

  const confirmAction = () => {
    if (!confirm) return;
    if (confirm.type === 'delete')  handleDelete(confirm.sku);
    if (confirm.type === 'toggle')  toggleStatus(confirm.sku);
  };

  const totalPages = Math.ceil(total / 50) || 1;

  return (
    <div>
      {/* Add single */}
      <div className="card">
        <div className="card-title">Add model</div>
        <div style={{ display:'flex', gap: 8, flexWrap:'wrap' }}>
          <input className="form-input" style={{ flex: 2, minWidth: 150 }}
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder='e.g. "Sam A55"' onKeyDown={e => e.key === 'Enter' && add()} />
          <input className="form-input" style={{ flex: 1, minWidth: 100 }}
            value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="Brand (opt)" />
          <button className="btn btn-primary btn-sm" style={{ flex:'none' }} onClick={add} disabled={adding}>
            {adding ? '...' : '+ Add'}
          </button>
        </div>
        <div className="form-hint mt-2">
          <span style={{ color:'var(--primary)', cursor:'pointer', textDecoration:'underline' }}
            onClick={() => setShowBulk(!showBulk)}>
            {showBulk ? 'Hide bulk import' : 'Bulk import from list'}
          </span>
        </div>
        {showBulk && (
          <div style={{ marginTop: 12 }}>
            <div className="form-label">One per line — ModelName, Brand (brand optional)</div>
            <textarea className="form-input" rows={6} value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={"Sam A55, Samsung\niP 16PM, Apple\nVivo V40"}
              style={{ resize:'vertical', fontFamily:'monospace', fontSize: 13 }} />
            <button className="btn btn-success btn-sm" style={{ marginTop: 8 }} onClick={bulkImport}>
              Import {bulkText.split('\n').filter(Boolean).length} models
            </button>
          </div>
        )}
      </div>

      {/* SKU list */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>All SKUs ({total.toLocaleString()})</div>
          <select className="form-select" style={{ width:'auto', padding:'5px 10px', fontSize: 13 }}
            value={statusFil} onChange={e => { setStatusFil(e.target.value); setPage(1); }}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive / Archived</option>
          </select>
        </div>
        <div className="search-wrap" style={{ marginBottom: 12 }}>
          <span className="search-icon">⌕</span>
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search models..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Model name</th><th>Brand</th><th>Status</th><th>Added</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {skus.map(sku => (
                <tr key={sku._id}>
                  <td style={{ fontWeight: 500 }}>{sku.name}</td>
                  <td style={{ color:'var(--gray-400)' }}>{sku.brand || '—'}</td>
                  <td>
                    <span className={`badge ${sku.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                      {sku.status === 'active' ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color:'var(--gray-400)' }}>
                    {new Date(sku.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap: 6 }}>
                      {/* Toggle active/inactive */}
                      <button
                        className={`btn btn-xs ${sku.status === 'active' ? 'btn-outline' : 'btn-success'}`}
                        onClick={() => setConfirm({ sku, type: 'toggle' })}>
                        {sku.status === 'active' ? 'Deactivate' : 'Restore'}
                      </button>
                      {/* Delete — only shown for active SKUs */}
                      {sku.status === 'active' && (
                        <button className="btn btn-xs btn-danger"
                          onClick={() => setConfirm({ sku, type: 'delete' })}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!skus.length && (
                <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 24 }}>No SKUs found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next →</button>
          </div>
        )}
      </div>

      {/* Delete info callout */}
      <div className="alert alert-info" style={{ fontSize: 13 }}>
        <strong>Deletion rules:</strong> SKUs with no transaction history are permanently deleted.
        SKUs with history but zero balance are archived (preserved for reports, hidden from dropdowns).
        SKUs with stock on hand cannot be deleted — dispatch the stock first.
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        open={!!confirm}
        title={
          confirm?.type === 'delete'
            ? `Delete "${confirm?.sku?.name}"?`
            : confirm?.sku?.status === 'active'
              ? `Deactivate "${confirm?.sku?.name}"?`
              : `Restore "${confirm?.sku?.name}"?`
        }
        message={
          confirm?.type === 'delete'
            ? 'If this SKU has stock or transaction history it will be archived instead of permanently deleted. If it has no history at all, it will be permanently removed.'
            : confirm?.sku?.status === 'active'
              ? 'This SKU will be hidden from all dropdowns. Transaction history is preserved.'
              : 'This SKU will become active and appear in dropdowns again.'
        }
        confirmLabel={
          confirm?.type === 'delete' ? 'Delete / Archive'
          : confirm?.sku?.status === 'active' ? 'Deactivate'
          : 'Restore'
        }
        confirmClass={
          confirm?.type === 'delete' ? 'btn-danger'
          : confirm?.sku?.status === 'active' ? 'btn-danger'
          : 'btn-success'
        }
        onConfirm={confirmAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
