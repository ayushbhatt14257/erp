import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../utils/api';
import { getSocket } from '../../utils/api';

export default function Dashboard() {
  const [today,      setToday]      = useState(null);
  const [summary,    setSummary]    = useState([]);
  const [dailyLog,   setDailyLog]   = useState([]);
  const [monthly,    setMonthly]    = useState([]);
  const [view,       setView]       = useState('log');
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    try {
      const [t, s, l] = await Promise.all([
        api.get('/dashboard/today'),
        api.get(`/dashboard/summary?q=${search}&page=${page}`),
        api.get('/transactions/daily'),
      ]);
      setToday(t.data);
      setSummary(s.data.data);
      setTotalPages(s.data.pages || 1);
      setDailyLog(l.data);
    } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (view === 'monthly') {
      const now = new Date();
      api.get(`/dashboard/monthly?year=${now.getFullYear()}&month=${now.getMonth()+1}`)
        .then(r => setMonthly(r.data)).catch(() => {});
    }
  }, [view]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('transaction:new', () => load());
    return () => socket.off('transaction:new');
  }, [load]);

  const stockStatus = (balance) => {
    if (balance === 0) return { label: 'Out', cls: 'badge-short' };
    if (balance < 500) return { label: 'Low', cls: 'badge-partial' };
    return { label: 'OK', cls: 'badge-ready' };
  };

  if (loading) return <div className="text-center text-muted" style={{ padding: 48 }}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-sub">{new Date().toLocaleDateString('en-IN',{ weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
      </div>

      {/* Metrics */}
      <div className="metrics-grid">
        <div className="metric-card"><div className="metric-label">Today In</div><div className="metric-value green">{(today?.todayIn||0).toLocaleString()}</div></div>
        <div className="metric-card"><div className="metric-label">Today Out</div><div className="metric-value red">{(today?.todayOut||0).toLocaleString()}</div></div>
        <div className="metric-card"><div className="metric-label">Overall Balance</div><div className="metric-value blue">{(today?.overallBalance||0).toLocaleString()}</div></div>
        <div className="metric-card"><div className="metric-label">Active SKUs</div><div className="metric-value">{(today?.activeSkus||0).toLocaleString()}</div></div>
      </div>

      {/* Stock summary table */}
      <div className="card">
        <div className="card-title">Stock summary</div>
        <div className="search-wrap" style={{ marginBottom: 12 }}>
          <span className="search-icon">⌕</span>
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search model..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Model name</th>
                <th>Location</th>
                <th className="text-right">Total In</th>
                <th className="text-right">Total Out</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(row => {
                const st = stockStatus(row.balance);
                return (
                  <tr key={row._id}>
                    <td style={{ fontWeight: 500 }}>{row.skuName}</td>
                    <td style={{ color:'var(--gray-400)', fontSize: 12 }}>{row.lastRow ? `${row.lastRow} · ${row.lastShelf}` : '—'}</td>
                    <td className="text-right" style={{ color:'var(--success)', fontWeight: 500 }}>{row.totalIn.toLocaleString()}</td>
                    <td className="text-right" style={{ color:'var(--warning)', fontWeight: 500 }}>{row.totalOut.toLocaleString()}</td>
                    <td className="text-right" style={{ fontWeight: 700 }}>{row.balance.toLocaleString()}</td>
                    <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                  </tr>
                );
              })}
              {!summary.length && <tr><td colSpan={6} className="text-center text-muted" style={{padding:24}}>No data found</td></tr>}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>← Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}>Next →</button>
          </div>
        )}
      </div>

      {/* Log / Monthly toggle */}
      <div className="card">
        <div style={{ display:'flex', gap: 8, marginBottom: 14 }}>
          <button className={`btn btn-sm ${view==='log' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('log')}>Today's Log</button>
          <button className={`btn btn-sm ${view==='monthly' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('monthly')}>Monthly Trends</button>
        </div>

        {view === 'log' && (
          <>
            <div className="card-title">Today's transactions ({dailyLog.length})</div>
            {dailyLog.map(tx => (
              <div key={tx._id} className="log-row">
                <span className={`badge ${tx.type==='IN' ? 'badge-in' : 'badge-out'}`}>{tx.type}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.skuName}</div>
                  <div className="log-meta">
                    {tx.type==='IN'
                      ? `${tx.machineNumber||''}${tx.operatorName ? ' · '+tx.operatorName : ''}${tx.location?.row ? ' · '+tx.location.row : ''}`
                      : `${tx.department} · ${tx.receiverName}`
                    }
                    {' · '}{new Date(tx.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                  </div>
                </div>
                <div className="log-qty" style={{ color: tx.type==='IN' ? 'var(--success)' : 'var(--warning)' }}>
                  {tx.type==='IN' ? '+' : '-'}{tx.quantity.toLocaleString()}
                </div>
              </div>
            ))}
            {!dailyLog.length && <div className="text-muted text-center" style={{padding:24}}>No transactions today yet</div>}
          </>
        )}

        {view === 'monthly' && (
          <>
            <div className="card-title">In vs Out — {new Date().toLocaleString('default',{month:'long',year:'numeric'})}</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly} margin={{top:4,right:8,bottom:4,left:0}}>
                <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d.slice(5)} />
                <YAxis tick={{fontSize:10}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
                <Tooltip formatter={v=>v.toLocaleString()} labelFormatter={l=>`Date: ${l}`} />
                <Legend />
                <Bar dataKey="in"  name="Stock In"  fill="#057a55" radius={[3,3,0,0]} />
                <Bar dataKey="out" name="Stock Out" fill="#b45309" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}