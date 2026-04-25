import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api, { downloadFile } from '../../../utils/api';

function getTodayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function Reports() {
  const today = getTodayIST();
  const [reportView, setReportView] = useState('daily');

  // Daily
  const [dailyDate, setDailyDate] = useState(today);
  const [dailyType, setDailyType] = useState('ALL');
  const [dailySku,  setDailySku]  = useState('');
  const [dailyData, setDailyData] = useState(null);
  const [dailyLoad, setDailyLoad] = useState(false);

  // Range
  const [fromDate,  setFromDate]  = useState(today);
  const [toDate,    setToDate]    = useState(today);
  const [rangeType, setRangeType] = useState('ALL');
  const [rangeSku,  setRangeSku]  = useState('');
  const [rangeData, setRangeData] = useState(null);
  const [rangeLoad, setRangeLoad] = useState(false);
  const [dlLoad,    setDlLoad]    = useState(false);

  // Monthly
  const now = new Date();
  const [year,        setYear]        = useState(now.getFullYear());
  const [month,       setMonth]       = useState(now.getMonth() + 1);
  const [monthReport, setMonthReport] = useState(null);
  const [monthLoad,   setMonthLoad]   = useState(false);
  const [monthDlLoad, setMonthDlLoad] = useState(false);
  const [savedList,   setSavedList]   = useState([]);

  useEffect(() => {
    api.get('/reports/list').then(r => setSavedList(r.data)).catch(() => {});
  }, []);

  // ── Daily ─────────────────────────────────────────────────────────────────
  const loadDaily = async () => {
    setDailyLoad(true);
    try {
      const { data } = await api.get(
        `/reports/daily?date=${dailyDate}&type=${dailyType}&skuName=${encodeURIComponent(dailySku)}`
      );
      setDailyData(data);
    } catch { toast.error('Failed to load daily report'); }
    finally { setDailyLoad(false); }
  };

  // ── Range ─────────────────────────────────────────────────────────────────
  const loadRange = async () => {
    setRangeLoad(true);
    try {
      const { data } = await api.get(
        `/reports/range?from=${fromDate}&to=${toDate}&type=${rangeType}&skuName=${encodeURIComponent(rangeSku)}`
      );
      setRangeData(data);
    } catch { toast.error('Failed to load report'); }
    finally { setRangeLoad(false); }
  };

  // Issue 3 fix: use authenticated blob download instead of plain <a href>
  const downloadRangeExcel = async () => {
    setDlLoad(true);
    try {
      await downloadFile(
        `/reports/export?from=${fromDate}&to=${toDate}`,
        `Report_${fromDate}_to_${toDate}.xlsx`
      );
      toast.success('Excel downloaded');
    } catch (err) { toast.error(err.message); }
    finally { setDlLoad(false); }
  };

  // ── Monthly ───────────────────────────────────────────────────────────────
  const loadMonthly = async () => {
    setMonthLoad(true);
    try {
      const { data } = await api.get(`/reports/monthly?year=${year}&month=${month}`);
      setMonthReport(data);
      const list = await api.get('/reports/list');
      setSavedList(list.data);
    } catch { toast.error('Failed to load monthly report'); }
    finally { setMonthLoad(false); }
  };

  const generateMonthly = async () => {
    setMonthLoad(true);
    try {
      const { data } = await api.post('/reports/generate', { year, month });
      setMonthReport(data);
      toast.success('Report generated and saved');
      const list = await api.get('/reports/list');
      setSavedList(list.data);
    } catch { toast.error('Generation failed'); }
    finally { setMonthLoad(false); }
  };

  const downloadMonthlyExcel = async () => {
    setMonthDlLoad(true);
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay  = new Date(year, month, 0).toLocaleDateString('en-CA');
    try {
      await downloadFile(
        `/reports/export?from=${firstDay}&to=${lastDay}`,
        `Report_${MONTHS[month - 1]}_${year}.xlsx`
      );
      toast.success('Excel downloaded');
    } catch (err) { toast.error(err.message); }
    finally { setMonthDlLoad(false); }
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const years  = [now.getFullYear(), now.getFullYear() - 1];

  return (
    <div>
      {/* View tabs */}
      <div style={{ display:'flex', gap: 8, marginBottom: 16, flexWrap:'wrap' }}>
        {[['daily','Daily Report'],['range','Date Range'],['monthly','Monthly']].map(([k,l]) => (
          <button key={k} className={`btn btn-sm ${reportView===k?'btn-primary':'btn-outline'}`}
            onClick={() => setReportView(k)}>{l}</button>
        ))}
      </div>

      {/* ── Daily ── */}
      {reportView === 'daily' && (
        <div>
          <div className="card">
            <div className="card-title">Daily Stock Report</div>
            <div className="three-col" style={{ marginBottom: 12 }}>
              <div>
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={dailyDate}
                  onChange={e => setDailyDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Type</label>
                <select className="form-select" value={dailyType} onChange={e => setDailyType(e.target.value)}>
                  <option value="ALL">All</option>
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                </select>
              </div>
              <div>
                <label className="form-label">Model filter</label>
                <input className="form-input" value={dailySku}
                  onChange={e => setDailySku(e.target.value)} placeholder="e.g. Sam A55" />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={loadDaily} disabled={dailyLoad}>
              {dailyLoad ? 'Loading...' : 'Generate Report'}
            </button>
          </div>

          {dailyData && (
            <>
              <div className="metrics-grid">
                <div className="metric-card"><div className="metric-label">Total In</div><div className="metric-value green">{dailyData.totalIn.toLocaleString()}</div></div>
                <div className="metric-card"><div className="metric-label">Total Out</div><div className="metric-value red">{dailyData.totalOut.toLocaleString()}</div></div>
                <div className="metric-card"><div className="metric-label">Transactions</div><div className="metric-value">{dailyData.count}</div></div>
              </div>
              <div className="card">
                <div className="card-title">Transactions — {dailyData.date}</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Time</th><th>Type</th><th>Model</th><th>Qty</th><th>Machine / Operator</th><th>Dept / Receiver</th></tr>
                    </thead>
                    <tbody>
                      {dailyData.transactions.map(tx => (
                        <tr key={tx._id}>
                          <td style={{fontSize:12,color:'var(--gray-400)',whiteSpace:'nowrap'}}>
                            {new Date(tx.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                          </td>
                          <td><span className={`badge ${tx.type==='IN'?'badge-in':'badge-out'}`}>{tx.type}</span></td>
                          <td style={{fontWeight:500}}>{tx.skuName}</td>
                          <td style={{fontWeight:600,color:tx.type==='IN'?'var(--success)':'var(--warning)'}}>
                            {tx.quantity.toLocaleString()}
                          </td>
                          <td style={{fontSize:12}}>{tx.machineNumber||''}{tx.operatorName?` · ${tx.operatorName}`:''}</td>
                          <td style={{fontSize:12}}>{tx.department||''}{tx.receiverName?` · ${tx.receiverName}`:''}</td>
                        </tr>
                      ))}
                      {!dailyData.transactions.length && (
                        <tr><td colSpan={6} className="text-center text-muted" style={{padding:20}}>No transactions found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Range ── */}
      {reportView === 'range' && (
        <div>
          <div className="card">
            <div className="card-title">Date Range Report</div>
            <div className="three-col" style={{ marginBottom: 12 }}>
              <div>
                <label className="form-label">From</label>
                <input type="date" className="form-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label">To</label>
                <input type="date" className="form-input" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Type</label>
                <select className="form-select" value={rangeType} onChange={e => setRangeType(e.target.value)}>
                  <option value="ALL">All</option>
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Model filter (optional)</label>
              <input className="form-input" value={rangeSku}
                onChange={e => setRangeSku(e.target.value)} placeholder="e.g. Sam A55" />
            </div>
            <div style={{ display:'flex', gap: 8, flexWrap:'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={loadRange} disabled={rangeLoad}>
                {rangeLoad ? 'Loading...' : 'Generate Report'}
              </button>
              {/* Issue 3 fix: authenticated blob download */}
              <button className="btn btn-success btn-sm" onClick={downloadRangeExcel} disabled={dlLoad}>
                {dlLoad ? 'Downloading...' : '⬇ Download Excel'}
              </button>
            </div>
          </div>

          {rangeData && (
            <>
              <div className="metrics-grid">
                <div className="metric-card"><div className="metric-label">Total In</div><div className="metric-value green">{rangeData.totalIn.toLocaleString()}</div></div>
                <div className="metric-card"><div className="metric-label">Total Out</div><div className="metric-value red">{rangeData.totalOut.toLocaleString()}</div></div>
                <div className="metric-card"><div className="metric-label">Net</div><div className="metric-value blue">{(rangeData.totalIn-rangeData.totalOut).toLocaleString()}</div></div>
                <div className="metric-card"><div className="metric-label">Transactions</div><div className="metric-value">{rangeData.count}</div></div>
              </div>

              <div className="card">
                <div className="card-title">Daily breakdown</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Date</th><th className="text-right">In</th><th className="text-right">Out</th><th className="text-right">Net</th></tr></thead>
                    <tbody>
                      {rangeData.dailySummary.map(d => (
                        <tr key={d.date}>
                          <td>{d.date}</td>
                          <td className="text-right" style={{color:'var(--success)',fontWeight:500}}>{d.in.toLocaleString()}</td>
                          <td className="text-right" style={{color:'var(--warning)',fontWeight:500}}>{d.out.toLocaleString()}</td>
                          <td className="text-right" style={{fontWeight:600}}>{(d.in-d.out).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Model-wise summary ({rangeData.skuSummary.length} SKUs)</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Model</th><th className="text-right">Total In</th><th className="text-right">Total Out</th><th className="text-right">Balance</th></tr></thead>
                    <tbody>
                      {rangeData.skuSummary.map(s => (
                        <tr key={s.skuName}>
                          <td style={{fontWeight:500}}>{s.skuName}</td>
                          <td className="text-right" style={{color:'var(--success)',fontWeight:500}}>{s.totalIn.toLocaleString()}</td>
                          <td className="text-right" style={{color:'var(--warning)',fontWeight:500}}>{s.totalOut.toLocaleString()}</td>
                          <td className="text-right" style={{fontWeight:700}}>{(s.totalIn-s.totalOut).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Monthly ── */}
      {reportView === 'monthly' && (
        <div>
          <div className="card">
            <div className="card-title">Monthly Report</div>
            <div style={{ display:'flex', gap: 8, flexWrap:'wrap', marginBottom: 12 }}>
              <div style={{flex:1,minWidth:100}}>
                <label className="form-label">Month</label>
                <select className="form-select" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                  {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div style={{flex:1,minWidth:100}}>
                <label className="form-label">Year</label>
                <select className="form-select" value={year} onChange={e => setYear(parseInt(e.target.value))}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap: 8, flexWrap:'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={loadMonthly} disabled={monthLoad}>
                {monthLoad ? 'Loading...' : 'View Report'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={generateMonthly} disabled={monthLoad}>
                ↺ Regenerate
              </button>
              {/* Issue 3 fix: authenticated blob download */}
              <button className="btn btn-success btn-sm" onClick={downloadMonthlyExcel} disabled={monthDlLoad}>
                {monthDlLoad ? 'Downloading...' : '⬇ Excel'}
              </button>
            </div>
          </div>

          {monthReport && (
            <>
              <div className="metrics-grid">
                <div className="metric-card"><div className="metric-label">Total In</div><div className="metric-value green">{(monthReport.summary?.totalIn||0).toLocaleString()}</div></div>
                <div className="metric-card"><div className="metric-label">Total Out</div><div className="metric-value red">{(monthReport.summary?.totalOut||0).toLocaleString()}</div></div>
                <div className="metric-card"><div className="metric-label">Net Balance</div><div className="metric-value blue">{(monthReport.summary?.netBalance||0).toLocaleString()}</div></div>
                <div className="metric-card"><div className="metric-label">Unique SKUs</div><div className="metric-value">{monthReport.summary?.uniqueSkus||0}</div></div>
              </div>

              {monthReport.summary?.topModels?.length > 0 && (
                <div className="card">
                  <div className="card-title">Top 10 models by movement</div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Model</th><th className="text-right">Total In</th><th className="text-right">Total Out</th></tr></thead>
                      <tbody>
                        {monthReport.summary.topModels.map((m,i) => (
                          <tr key={i}>
                            <td style={{fontWeight:500}}>{m.skuName}</td>
                            <td className="text-right" style={{color:'var(--success)',fontWeight:500}}>{m.totalIn.toLocaleString()}</td>
                            <td className="text-right" style={{color:'var(--warning)',fontWeight:500}}>{m.totalOut.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {savedList.length > 0 && (
            <div className="card">
              <div className="card-title">Saved reports archive</div>
              {savedList.map(r => (
                <div key={r._id} className="flex-between" style={{padding:'10px 0',borderBottom:'1px solid var(--gray-100)'}}>
                  <div>
                    <div style={{fontWeight:500}}>{MONTHS[r.month-1]} {r.year}</div>
                    <div style={{fontSize:12,color:'var(--gray-400)'}}>
                      {r.isAutoGenerated?'Auto-generated':'Manual'} · {new Date(r.generatedAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <button className="btn btn-outline btn-xs"
                    onClick={() => { setYear(r.year); setMonth(r.month); setTimeout(loadMonthly, 100); }}>
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
