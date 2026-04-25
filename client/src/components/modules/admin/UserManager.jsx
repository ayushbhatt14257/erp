import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import ConfirmModal from '../../shared/ConfirmModal';

export default function UserManager() {
  const [users,       setUsers]       = useState([]);
  const [name,        setName]        = useState('');
  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [role,        setRole]        = useState('worker');
  const [adding,      setAdding]      = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [editPwd,     setEditPwd]     = useState('');
  const [confirm,     setConfirm]     = useState(null);

  const load = () => api.get('/auth/users').then(r => setUsers(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name||!username||!password) return toast.error('All fields required');
    if (password.length < 6) return toast.error('Password min 6 chars');
    setAdding(true);
    try {
      await api.post('/auth/users', { displayName:name, username, password, role });
      toast.success(`${name} added`);
      setName(''); setUsername(''); setPassword(''); setRole('worker'); load();
    } catch (err) { toast.error(err.response?.data?.message||'Error'); }
    finally { setAdding(false); }
  };

  const toggleStatus = async (user) => {
    const status = user.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/auth/users/${user._id}`, { status });
      toast.success(`${user.displayName} ${status}`); load();
    } catch { toast.error('Update failed'); }
    setConfirm(null);
  };

  const changePassword = async (id) => {
    if (!editPwd || editPwd.length < 6) return toast.error('Min 6 chars');
    try {
      await api.patch(`/auth/users/${id}`, { password: editPwd });
      toast.success('Password updated'); setEditId(null); setEditPwd('');
    } catch { toast.error('Failed'); }
  };

  const roleColor = { admin:{ bg:'var(--primary-light)', c:'var(--primary)' }, worker:{ bg:'var(--success-light)', c:'var(--success)' } };

  return (
    <div>
      {/* Role info */}
      <div className="card">
        <div className="card-title">Role permissions</div>
        <div className="two-col">
          {['admin','worker'].map(r => (
            <div key={r} style={{ background: roleColor[r].bg, borderRadius: 8, padding:'12px 14px' }}>
              <div style={{ fontWeight:600, color: roleColor[r].c, marginBottom:6, textTransform:'capitalize' }}>{r}</div>
              <div style={{ fontSize:12, color: roleColor[r].c, lineHeight:1.8 }}>
                {r==='admin'
                  ? 'Full access · Admin panel · Reports · Settings'
                  : 'Stock In · Stock Out · Dashboard · Quick Search · Order Check'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add user */}
      <div className="card">
        <div className="card-title">Add user</div>
        <div className="form-group">
          <label className="form-label">Full name</label>
          <input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Ravi Kumar" />
        </div>
        <div className="form-group">
          <label className="form-label">Username (login)</label>
          <input className="form-input" value={username}
            onChange={e=>setUsername(e.target.value.toLowerCase().replace(/\s+/g,''))}
            placeholder="e.g. ravi" autoCapitalize="none" />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 6 characters" />
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <div style={{display:'flex',gap:8}}>
            {['worker','admin'].map(r => (
              <button key={r} onClick={()=>setRole(r)}
                style={{
                  flex:1, padding:'9px 4px', borderRadius:8, border:'1.5px solid',
                  borderColor: role===r ? 'var(--primary)' : 'var(--border)',
                  background:  role===r ? 'var(--primary-light)' : '#fff',
                  color:       role===r ? 'var(--primary)' : 'var(--gray-600)',
                  fontWeight:  role===r ? 600 : 400, cursor:'pointer', textTransform:'capitalize', fontSize: 13,
                }}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-block" onClick={add} disabled={adding}>
          {adding ? <span className="spinner"/> : `+ Add ${role}`}
        </button>
      </div>

      {/* User list */}
      <div className="card">
        <div className="card-title">All users ({users.length})</div>
        {users.map(u => (
          <div key={u._id} style={{paddingBottom:12,marginBottom:12,borderBottom:'1px solid var(--gray-100)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{
                width:38,height:38,borderRadius:'50%',flexShrink:0,
                background: roleColor[u.role]?.bg, color: roleColor[u.role]?.c,
                display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,
              }}>
                {u.displayName.charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:500,fontSize:14}}>
                  {u.displayName}
                  <span className={`badge ${u.status==='active'?'badge-active':'badge-inactive'}`} style={{marginLeft:8,fontSize:11}}>
                    {u.status}
                  </span>
                </div>
                <div style={{fontSize:12,color:'var(--gray-400)'}}>
                  @{u.username} · <span style={{color:roleColor[u.role]?.c,fontWeight:500}}>{u.role}</span>
                </div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-outline btn-xs"
                  onClick={()=>{setEditId(editId===u._id?null:u._id);setEditPwd('');}}>
                  {editId===u._id?'Cancel':'🔑'}
                </button>
                <button className={`btn btn-xs ${u.status==='active'?'btn-danger':'btn-success'}`}
                  onClick={()=>setConfirm(u)}>
                  {u.status==='active'?'Deactivate':'Activate'}
                </button>
              </div>
            </div>
            {editId===u._id && (
              <div style={{display:'flex',gap:8,marginTop:10,paddingLeft:48}}>
                <input className="form-input" type="password" value={editPwd}
                  onChange={e=>setEditPwd(e.target.value)} placeholder="New password (min 6)" style={{flex:1}} />
                <button className="btn btn-success btn-sm" style={{flex:'none'}} onClick={()=>changePassword(u._id)}>Save</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.status==='active' ? `Deactivate ${confirm?.displayName}?` : `Activate ${confirm?.displayName}?`}
        message={confirm?.status==='active'
          ? 'This user will not be able to login until reactivated.'
          : 'This user will be able to login again.'}
        confirmLabel={confirm?.status==='active'?'Deactivate':'Activate'}
        confirmClass={confirm?.status==='active'?'btn-danger':'btn-success'}
        onConfirm={()=>toggleStatus(confirm)}
        onCancel={()=>setConfirm(null)}
      />
    </div>
  );
}
