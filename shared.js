// ============================================================
// SHARED.JS — Common logic between app_v3.html (artist) and manager_dashboard.html
// Edit here once, both apps get the fix. Covers:
//   - Rich text "Copy / concepto" sections editor
//   - Recurring task day-picker (used inside recurring templates)
//   - Date/cycle helpers for the recurrence engine
// Both HTML files must define: _ttRecType (let, mutable) before this loads,
// and provide the DOM structure with matching ids (#copy-sections-container,
// #tt-rec-days, #tt-rec-days-lbl, #tt-rec-weekly, #tt-rec-monthly).
// ============================================================

function getCopyValue(prefix=''){
  const containerId=(prefix?prefix+'-':'')+'copy-sections-container';
  const sections=[];
  document.querySelectorAll(`#${containerId} .copy-section`).forEach(div=>{
    const title=div.querySelector('.copy-section-title').value.trim();
    const html=div.querySelector('.copy-editor').innerHTML.trim();
    if(html&&html!=='<br>')sections.push({title,html});
  });
  if(!sections.length)return null;
  if(sections.length===1&&!sections[0].title){
    // Single untitled section - store as plain text for backward compat
    const tmp=document.createElement('div');
    tmp.innerHTML=sections[0].html;
    return tmp.innerText||null;
  }
  return JSON.stringify({v:1,sections});
}

function setCopyValue(val,prefix=''){
  const containerId=(prefix?prefix+'-':'')+'copy-sections-container';
  const container=document.getElementById(containerId);
  if(!container)return;
  container.innerHTML='';
  _copySectionCount=0;
  if(!val){addCopySection('','',prefix);return;}
  try{
    const parsed=JSON.parse(val);
    if(parsed?.v===1&&parsed.sections?.length){
      parsed.sections.forEach(s=>addCopySection(s.title||'',s.html||'',prefix));
      return;
    }
  }catch(e){}
  addCopySection('',val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'),prefix);
}

function addCopySection(title='',html='',prefix=''){
  const id=(prefix||'cs')+'-'+(++_copySectionCount);
  const containerId=(prefix?prefix+'-':'')+'copy-sections-container';
  const container=document.getElementById(containerId);
  if(!container)return;
  const div=document.createElement('div');
  div.className='copy-section';
  div.dataset.sid=id;
  div.innerHTML=`
    <div class="copy-section-header">
      <input class="copy-section-title" placeholder="Título de sección (opcional)" value="${title.replace(/"/g,'&quot;')}">
      <button type="button" class="copy-section-del" onclick="removeCopySection('${id}','${prefix}')" title="Eliminar sección"><i class="ti ti-x"></i></button>
    </div>
    <div class="copy-toolbar">
      <span class="tb-label">Formato</span>
      <div class="tb-sep"></div>
      <button type="button" onmousedown="event.preventDefault();document.execCommand('bold')" title="Negrita"><b style="font-size:11px">B</b></button>
      <button type="button" onmousedown="event.preventDefault();document.execCommand('italic')" title="Itálica"><i style="font-size:11px">I</i></button>
      <button type="button" onmousedown="event.preventDefault();document.execCommand('underline')" title="Subrayado"><span style="text-decoration:underline;font-size:11px">U</span></button>
      <button type="button" onmousedown="event.preventDefault();document.execCommand('strikeThrough')" title="Tachado"><span style="text-decoration:line-through;font-size:11px">S</span></button>
      <div class="tb-sep"></div>
      <button type="button" onmousedown="event.preventDefault();document.execCommand('insertUnorderedList')" title="Lista con viñetas" style="font-size:13px">≡</button>
      <button type="button" onmousedown="event.preventDefault();document.execCommand('insertOrderedList')" title="Lista numerada" style="font-size:11px">1.</button>
      <div class="tb-sep"></div>
      <button type="button" onmousedown="event.preventDefault();document.execCommand('removeFormat')" title="Limpiar formato" style="font-size:11px">✕</button>
    </div>
    <div class="copy-editor" contenteditable="true" data-placeholder="Escribe el copy, guión, descripción...">${html}</div>
  `;
  container.appendChild(div);
  const editor=div.querySelector('.copy-editor');
  if(!html)setTimeout(()=>editor.focus(),50);
}

function removeCopySection(id,prefix){
  const el=document.querySelector(`.copy-section[data-sid="${id}"]`);
  if(el)el.remove();
  const containerId=(prefix?prefix+'-':'')+'copy-sections-container';
  if(!document.querySelectorAll(`#${containerId} .copy-section`).length)addCopySection('','',prefix||'');
}

// Turns plain URLs inside a text/HTML string into clickable links.
// Safe to run on our own editor output since it never contains <a> tags
// or href attributes to begin with.
function linkify(text){
  if(!text)return text;
  return text.replace(/(\bhttps?:\/\/[^\s<]+)|(\bwww\.[^\s<]+)/gi,(match)=>{
    const trailMatch=match.match(/[.,;:!?)\]]+$/);
    let clean=match, trail='';
    if(trailMatch){clean=match.slice(0,-trailMatch[0].length);trail=trailMatch[0];}
    const href=clean.toLowerCase().startsWith('http')?clean:'https://'+clean;
    return`<a href="${href}" target="_blank" rel="noopener" style="color:var(--accent);word-break:break-all;text-decoration:underline">${clean}</a>${trail}`;
  });
}

function renderCopyValue(val){
  if(!val)return'';
  try{
    const parsed=JSON.parse(val);
    if(parsed?.v===1&&parsed.sections?.length){
      return parsed.sections.map(s=>`
        <div class="copy-section-view">
          ${s.title?`<div class="copy-section-view-title">${s.title}</div>`:''}
          <div class="copy-section-view-body">${linkify(s.html)}</div>
        </div>`).join('');
    }
  }catch(e){}
  // Plain text
  return`<div class="copy-section-view-body">${linkify(val.replace(/\n/g,'<br>'))}</div>`;
}

function setTTRecType(t){
  _ttRecType=t;
  document.getElementById('tt-rec-weekly').classList.toggle('active',t==='weekly');
  document.getElementById('tt-rec-monthly').classList.toggle('active',t==='monthly');
  initTTRecDayPicker();
}

function initTTRecDayPicker(){
  const container=document.getElementById('tt-rec-days');
  const lbl=document.getElementById('tt-rec-days-lbl');
  if(!container)return;
  container.innerHTML='';
  if(_ttRecType==='weekly'){
    lbl.textContent='Días de la semana';
    [{v:1,l:'Lun'},{v:2,l:'Mar'},{v:3,l:'Mié'},{v:4,l:'Jue'},{v:5,l:'Vie'},{v:6,l:'Sáb'},{v:0,l:'Dom'}].forEach(d=>{
      const btn=document.createElement('button');
      btn.type='button';btn.textContent=d.l;btn.dataset.val=d.v;
      btn.style.cssText='padding:6px 12px;border-radius:100px;border:1.5px solid var(--border);background:var(--bg);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;color:var(--text2);transition:all .15s';
      btn.onclick=()=>{btn.classList.toggle('rec-day-sel');btn.style.background=btn.classList.contains('rec-day-sel')?'var(--accent)':'var(--bg)';btn.style.color=btn.classList.contains('rec-day-sel')?'#000':'var(--text2)';btn.style.borderColor=btn.classList.contains('rec-day-sel')?'var(--accent)':'var(--border)';};
      container.appendChild(btn);
    });
  } else {
    lbl.textContent='Días del mes';
    for(let d=1;d<=28;d++){
      const btn=document.createElement('button');
      btn.type='button';btn.textContent=d;btn.dataset.val=d;
      btn.style.cssText='width:36px;height:36px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;color:var(--text2);transition:all .15s';
      btn.onclick=()=>{btn.classList.toggle('rec-day-sel');btn.style.background=btn.classList.contains('rec-day-sel')?'var(--accent)':'var(--bg)';btn.style.color=btn.classList.contains('rec-day-sel')?'#000':'var(--text2)';btn.style.borderColor=btn.classList.contains('rec-day-sel')?'var(--accent)':'var(--border)';};
      container.appendChild(btn);
    }
  }
}

function getTTRecDays(){
  return[...document.querySelectorAll('#tt-rec-days .rec-day-sel')].map(b=>parseInt(b.dataset.val));
}

function getRecurrenceDates(type,days,from,periods){
  const dates=[];
  const d=new Date(from);
  d.setHours(0,0,0,0);

  if(type==='weekly'){
    // Generate dates for next N weeks
    // Find Monday of current week
    const mon=new Date(d);
    const dow=d.getDay();
    mon.setDate(d.getDate()-(dow===0?6:dow-1));

    for(let w=0;w<periods;w++){
      for(const day of days){
        const date=new Date(mon);
        date.setDate(mon.getDate()+(w*7)+(day===0?6:day-1));
        if(date>=d)dates.push(localDateStr(date));
      }
    }
  } else if(type==='monthly'){
    // Generate dates for next N months
    for(let m=0;m<periods;m++){
      const month=new Date(d.getFullYear(),d.getMonth()+m,1);
      for(const day of days){
        const date=new Date(month.getFullYear(),month.getMonth(),day);
        if(date.getMonth()===month.getMonth()&&date>=d){
          dates.push(localDateStr(date));
        }
      }
    }
  }
  return[...new Set(dates)].sort();
}

function formatCycleLabel(type,startDate,days){
  const start=new Date(startDate+'T12:00:00');
  if(type==='weekly'){
    const end=new Date(start);
    end.setDate(start.getDate()+6);
    const fmt=d=>d.getDate()+' '+['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()];
    return`${fmt(start)} al ${fmt(end)}`;
  } else {
    const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const lastDay=new Date(start.getFullYear(),start.getMonth()+1,0).getDate();
    return`1 al ${lastDay} de ${months[start.getMonth()]}`;
  }
}

function localDateStr(d){
  const dt=d||new Date();
  return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
}
