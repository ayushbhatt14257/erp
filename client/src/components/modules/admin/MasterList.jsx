import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import ConfirmModal from '../../shared/ConfirmModal';

export default function MasterList({ entity, nameField, label, seedLabel }) {
  const [items,   setItems]   = useState([]);
  const [newName, setNewName] = useState('');
  const [adding,  setAdding]  = useState(false);
  const [confirm, setConfirm] = useState(null); // { id, name, action }

  const load = () => api.get(`/masters/${entity}`).then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, [entity]);

  const add = async () => {
    if (!newName.trim()) return toast.error(`${label} name required`);
    setAdding(true);
    try {
      await api.post(`/masters/${entity}`, { [nameField]: newName.trim() });
      toast.success(`${label} added`);
      setNewName(''); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setAdding(false); }
  };

  const toggleStatus = async (item) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/masters/${entity}/${item._id}`, { status: newStatus });
      toast.success(`${item[nameField]} ${newStatus}`);
      load();
    } catch { toast.error('Update failed'); }
  };

  const seed = async () => {
    try {
      const { data } = await api.post('/masters/seed');
      toast.success(data.message); load();
    } catch { toast.error('Seeding failed'); }
  };

  const active   = items.filter(i => i.status === 'active');
  const inactive = items.filter(i => i.status === 'inactive');

  return (
    <div>
      {/* Add form */}
      <div className="card">
        <div className="card-title">Add {label}</div>
        <div style={{ display:'flex', gap: 8 }}>
          <input className="form-input" style={{ flex: 1 }}
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()} name...`}
            onKeyDown={e => e.key==='Enter' && add()} />
          <button className="btn btn-primary btn-sm" style={{ flex:'none' }} onClick={add} disabled={adding}>
            {adding ? '...' : '+ Add'}
          </button>
          <button className="btn btn-outline btn-sm" style={{ flex:'none' }} onClick={() => setConfirm({ action:'seed' })}>
            Seed defaults
          </button>
        </div>
      </div>

      {/* Active list */}
      <div className="card">
        <div className="card-title">Active ({active.length})</div>
        {active.map(item => (
          <div key={item._id} className="master-item">
            <span className="badge badge-active">Active</span>
            <span className="master-item-name">{item[nameField]}</span>
            <button className="btn btn-outline btn-xs"
              onClick={() => setConfirm({ id: item._id, name: item[nameField], action:'deactivate', item })}>
              Deactivate
            </button>
          </div>
        ))}
        {!active.length && <div className="text-muted text-center" style={{padding:16}}>No active {label.toLowerCase()}s</div>}
      </div>

      {/* Inactive list */}
      {inactive.length > 0 && (
        <div className="card">
          <div className="card-title">Inactive ({inactive.length})</div>
          {inactive.map(item => (
            <div key={item._id} className="master-item">
              <span className="badge badge-inactive">Inactive</span>
              <span className="master-item-name" style={{color:'var(--gray-400)'}}>{item[nameField]}</span>
              <button className="btn btn-success btn-xs" onClick={() => toggleStatus(item)}>Activate</button>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirm?.action === 'seed' ? `Seed default ${label}s?` : `Deactivate "${confirm?.name}"?`}
        message={confirm?.action === 'seed'
          ? `This will create the default ${label.toLowerCase()}s. Existing records will not be overwritten.`
          : `This ${label.toLowerCase()} will be hidden from all dropdowns. You can reactivate it anytime.`
        }
        confirmLabel={confirm?.action === 'seed' ? 'Seed' : 'Deactivate'}
        confirmClass={confirm?.action === 'seed' ? 'btn-primary' : 'btn-danger'}
        onConfirm={() => {
          if (confirm?.action === 'seed') seed();
          else toggleStatus(confirm.item);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
