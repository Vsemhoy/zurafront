import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IconX } from '@tabler/icons-react';
import { ledgerApi } from '../entities/ledger/api';
import { formatMoney, minorToDecimal } from '../entities/ledger/model';
import './LedgerStatement.css';

const currentMonth = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

export default function LedgerStatement({ scopeId, account, onClose }) {
  const dialog = useRef(null);
  const [month, setMonth] = useState(currentMonth);
  const statement = useQuery({ queryKey: ['ledger-statement', scopeId, account.id, month], queryFn: ({ signal }) => ledgerApi.statement(scopeId, account.id, month, signal), enabled: Boolean(month) });
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  const money = (value) => formatMoney(value, account.currency);
  const data = statement.data;
  return <dialog ref={dialog} className="ledger-dialog ledger-statement" aria-label={`Расчёт счёта ${account.title}`} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="ledger-editor"><header><div><small>Ledger · Расчёт на конец дня</small><h2>{account.title}</h2></div><button type="button" aria-label="Закрыть расчёт" onClick={onClose}><IconX size={20}/></button></header>
      <div className="ledger-editor-body"><label className="ledger-statement-month">Месяц<input type="month" required min="1900-01" max={currentMonth()} value={month} onChange={(event) => { const value = event.target.value; if (value && value >= '1900-01' && value <= currentMonth()) setMonth(value); }}/></label>
        <p className="ledger-help">{account.type === 'credit' ? `Годовая ставка ${minorToDecimal(account.interest_rate_bps ?? 0)}%. Сначала движения дня, затем проценты на отрицательный остаток. Ежедневная капитализация, 365/366 дней, округление до копейки.` : 'Проведённые движения и остатки по дням.'} Только фактические операции по текущую дату. Расчётная модель не заменяет банковскую выписку. Проценты не создают отдельные платежи.</p>
        {statement.isPending ? <p role="status">Считаю…</p> : statement.error ? <p role="alert" className="ledger-error">{statement.error.message}</p> : data && <>
          <div className="ledger-statement-totals"><span>На начало <strong>{money(data.opening_minor)}</strong></span><span>Движения <strong>{money(data.movement_minor)}</strong></span><span>Проценты <strong>{money(data.interest_minor)}</strong></span><span>На {data.as_of} <strong>{money(data.closing_minor)}</strong></span></div>
          <div className="ledger-table-scroll"><table className="ledger-table"><thead><tr><th>Дата</th><th>Начало дня</th><th>Движения</th><th>Проценты</th><th>Конец дня</th></tr></thead><tbody>{data.days.map((day) => <tr key={day.date}><td>{day.date}</td>{['opening_minor', 'movement_minor', 'interest_minor', 'closing_minor'].map((key) => <td key={key} className="ledger-amount">{formatMoney(day[key])}</td>)}</tr>)}</tbody></table></div>
        </>}
      </div><footer className="ledger-editor-footer"><button type="button" onClick={onClose}>Закрыть</button></footer>
    </div>
  </dialog>;
}
