import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookReference } from './src/shared/ui/BookReference.jsx';
const diagram={id:'diagram',title:'Проверка диаграммы',xml:'<mxfile><diagram name="Page-1"/></mxfile>',preview_svg:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="180"><rect x="10" y="30" width="220" height="100" rx="10" fill="#c9f1d5"/><text x="35" y="85" font-size="22">Книга → Диаграмма</text></svg>'};
const lore={id:'lore',code:'TEST-1',current_revision:{title:'Проверка ЛОР',content:'# Полный текст\n\nПроверяем **Markdown**, таблицу и закрытие по Escape.\n\n| Колонка | Значение |\n|---|---|\n| Доступ | Сохранён |'}};
window.fetch=async(url)=>new Response(typeof url==='string'&&url.endsWith('/download')?'# Проверка файла\n\nФайл открыт в модалке.':JSON.stringify({data:url.includes('/diagrams/')?diagram:url.includes('/lore/')?lore:[{id:'file',name:'Проверка.md',mime_type:'text/markdown',size:70}],meta:{has_more:false}}),{status:200,headers:{'Content-Type':'application/json'}});
createRoot(document.getElementById('root')).render(<React.StrictMode><QueryClientProvider client={new QueryClient()}><main style={{maxWidth:800,margin:'24px auto',fontFamily:'Arial',display:'grid',gap:16}}><h1>Проверка встраивания в книгу</h1>{['file','diagram','lore'].map(kind=><BookReference key={kind} payload={{scope_id:'test',reference_type:kind,reference_id:kind}}/>)}</main></QueryClientProvider></React.StrictMode>);
