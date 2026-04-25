import { useState } from 'react';
import SkuManager  from './admin/SkuManager';
import MasterList  from './admin/MasterList';
import UserManager from './admin/UserManager';
import Reports     from './admin/Reports';

const TABS = [
  { key:'skus',        label:'SKU Manager'   },
  { key:'operators',   label:'Operators'     },
  { key:'machines',    label:'Machines'      },
  { key:'departments', label:'Departments'   },
  { key:'rows',        label:'Godown Rows'   },
  { key:'users',       label:'Users'         },
  { key:'reports',     label:'Reports'       },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('skus');

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Admin Panel</div>
        <div className="page-sub">Manage master data, users and reports</div>
      </div>

      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`admin-tab ${tab===t.key?'active':''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'skus'        && <SkuManager />}
      {tab === 'operators'   && <MasterList entity="operators"   nameField="operatorName"   label="Operator"   seedLabel="Seed default operators" />}
      {tab === 'machines'    && <MasterList entity="machines"    nameField="machineName"    label="Machine"    seedLabel="Seed M-01 to M-10" />}
      {tab === 'departments' && <MasterList entity="departments" nameField="departmentName" label="Department" seedLabel="Seed default departments" />}
      {tab === 'rows'        && <MasterList entity="rows"        nameField="rowName"        label="Godown Row" seedLabel="Seed Row-1 to Row-50" />}
      {tab === 'users'       && <UserManager />}
      {tab === 'reports'     && <Reports />}
    </div>
  );
}
