'use client';
import {useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {PLAN_LABELS,PLAN_QUOTAS,type PlanId} from '@wa/shared';
import {AccountTrigger} from './account-modal';
const plans:PlanId[]=['starter','pro','enterprise'];
export function CompactPackageSelector(){const [selected,setSelected]=useState<PlanId>('pro');return <div className="v3-package-mobile"><div className="v3-package-choices" role="group" aria-label="Paket seçin">{plans.map(plan=><button type="button" key={plan} aria-pressed={selected===plan} onClick={()=>setSelected(plan)}>{PLAN_LABELS[plan]}</button>)}</div><div className="v3-package-quotas"><div><strong>{PLAN_QUOTAS[selected].accounts}</strong><span>WhatsApp hattı</span></div><div><strong>{new Intl.NumberFormat('tr-TR').format(PLAN_QUOTAS[selected].messages)}</strong><span>Aylık mesaj</span></div></div><AccountTrigger className="v3-primary">Paket bilgisini al<ArrowUpRight size={18}/></AccountTrigger><p>Güncel ücret ve üretim hakları panelinizde.</p></div>}
