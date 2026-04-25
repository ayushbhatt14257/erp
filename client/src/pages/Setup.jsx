import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Setup() {
  const [step,        setStep]        = useState(1);
  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading,     setLoading]     = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const createAdmin = async (e) => {
    e.preventDefault();
    if (!username || !password || !displayName) return toast.error('All fields required');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.post('/auth/setup', { username, password, displayName });
      toast.success('Admin account created!');
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.message || 'Setup failed';
      if (msg.includes('already')) { toast.error('Already set up — please login.'); navigate('/login'); }
      else toast.error(msg);
    } finally { setLoading(false); }
  };

  const seedAndLogin = async () => {
    setLoading(true);
    try {
      await login(username, password);
      await api.post('/masters/seed');
      toast.success('Master data ready!');
      setStep(3);
    } catch (err) { toast.error(err.response?.data?.message || 'Seeding failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--gray-100)', padding: 16 }}>
      <div style={{ width:'100%', maxWidth: 400 }}>
        <div style={{ textAlign:'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Cover ERP Setup</h1>
          <p style={{ color:'var(--gray-400)', fontSize: 14 }}>First-time configuration</p>
        </div>

        {/* Step dots */}
        <div style={{ display:'flex', justifyContent:'center', gap: 8, marginBottom: 24 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{
              width: 28, height: 28, borderRadius:'50%', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize: 13, fontWeight: 600,
              background: step >= s ? 'var(--primary)' : 'var(--gray-200)',
              color: step >= s ? '#fff' : 'var(--gray-400)',
            }}>{s}</div>
          ))}
        </div>

        <div className="card">
          {step === 1 && (
            <>
              <div className="card-title">Create admin account</div>
              <form onSubmit={createAdmin}>
                <div className="form-group">
                  <label className="form-label">Your name</label>
                  <input className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Ayush Bhatt" />
                </div>
                <div className="form-group">
                  <label className="form-label">Username (for login)</label>
                  <input className="form-input" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="e.g. ayush" autoCapitalize="none" />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Create Admin Account →'}
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <div className="card-title">Set up master data</div>
              <div className="alert alert-success" style={{marginBottom:16}}>✓ Admin account created!</div>
              <p style={{ fontSize: 14, color:'var(--gray-600)', marginBottom: 16, lineHeight: 1.7 }}>
                This will create your default:
              </p>
              <ul style={{ fontSize: 14, color:'var(--gray-600)', paddingLeft: 20, lineHeight: 2.2, marginBottom: 16 }}>
                <li><strong>10 machines</strong> — M-01 through M-10</li>
                <li><strong>4 operators</strong> — Rahul, Mohan, Rakesh, Amit</li>
                <li><strong>4 departments</strong> — Dispatch, Packaging, Printing, QC</li>
                <li><strong>50 godown rows</strong> — Row-1 through Row-50</li>
              </ul>
              <p style={{ fontSize: 12, color:'var(--gray-400)', marginBottom: 16 }}>All can be edited from the Admin panel later.</p>
              <button className="btn btn-success btn-block" onClick={seedAndLogin} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Set Up & Continue →'}
              </button>
            </>
          )}

          {step === 3 && (
            <div style={{ textAlign:'center', padding:'8px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Setup complete!</div>
              <p style={{ fontSize: 14, color:'var(--gray-600)', marginBottom: 20 }}>Your ERP is ready to use.</p>
              <div style={{ background:'var(--gray-50)', borderRadius: 8, padding:'12px 14px', marginBottom: 20, textAlign:'left' }}>
                <div style={{ fontSize: 13, lineHeight: 2.2, color:'var(--gray-600)' }}>
                  <div>1. Go to <strong>Admin → SKU Manager</strong> to add your models</div>
                  <div>2. Use <strong>Stock In</strong> for opening stock count</div>
                  <div>3. Add worker accounts from <strong>Admin → Users</strong></div>
                </div>
              </div>
              <button className="btn btn-primary btn-block" onClick={() => navigate('/')}>Go to Dashboard →</button>
            </div>
          )}
        </div>

        {step === 1 && (
          <p className="text-center text-muted mt-2">
            Already set up?{' '}
            <span style={{color:'var(--primary)',cursor:'pointer'}} onClick={() => navigate('/login')}>Sign in</span>
          </p>
        )}
      </div>
    </div>
  );
}
