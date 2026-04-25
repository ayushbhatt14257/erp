import { useState, useRef, useEffect } from 'react';
import api from '../../utils/api';

export default function SkuSearch({ value, onChange, placeholder = 'Search model name...' }) {
  const [query,   setQuery]   = useState(value?.name || '');
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const debounce = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => { setQuery(value?.name || ''); }, [value]);

  useEffect(() => {
    const close = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    onChange(null);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/skus/search?q=${encodeURIComponent(q)}`);
        setResults(data); setOpen(true);
      } catch { setResults([]); }
    }, 200);
  };

  const select = (sku) => { setQuery(sku.name); setOpen(false); setResults([]); onChange(sku); };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div className="search-wrap">
        <span className="search-icon">⌕</span>
        <input className="form-input" value={query} onChange={handleInput} placeholder={placeholder} autoComplete="off" />
      </div>
      {open && (
        <div className="search-dropdown">
          {results.length > 0
            ? results.map(s => (
                <div key={s._id} className="search-option" onMouseDown={() => select(s)}>
                  <strong>{s.name}</strong>
                  {s.brand && <span style={{ color: 'var(--gray-400)', fontSize: 12, marginLeft: 8 }}>{s.brand}</span>}
                </div>
              ))
            : <div className="search-option" style={{ color: 'var(--gray-400)' }}>No results for "{query}"</div>
          }
        </div>
      )}
    </div>
  );
}
