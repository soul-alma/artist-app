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

// Strips empty trailing lines (repeated <br>, or empty <div>/<p> blocks
// left over from pressing Enter multiple times) so saved copy never ends
// in a block of unnecessary blank space. Only trims from the END —
// intentional blank lines in the middle of the text are left alone.
function trimTrailingEmptyLines(html){
  if(!html)return html;
  let prev;
  do{
    prev=html;
    html=html
      .replace(/(<br\s*\/?>)+\s*$/i,'')
      .replace(/<div>(\s|<br\s*\/?>|&nbsp;)*<\/div>\s*$/i,'')
      .replace(/<p>(\s|<br\s*\/?>|&nbsp;)*<\/p>\s*$/i,'')
      .trim();
  }while(html!==prev);
  return html;
}

function getCopyValue(prefix=''){
  const containerId=(prefix?prefix+'-':'')+'copy-sections-container';
  const sections=[];
  document.querySelectorAll(`#${containerId} .copy-section`).forEach(div=>{
    const title=div.querySelector('.copy-section-title').value.trim();
    const html=trimTrailingEmptyLines(div.querySelector('.copy-editor').innerHTML.trim());
    if(html&&html!=='<br>')sections.push({title,html});
  });
  if(!sections.length)return null;
  // Always keep the structured format (even for a single untitled section)
  // so rich formatting — bold, italic, lists — survives the round trip.
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
      <button type="button" onmousedown="event.preventDefault();insertChecklistItem(this)" title="Agregar paso con casilla">☑</button>
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

// Keyboard shortcuts for the copy editor. Ctrl/Cmd+B/I/U already work
// natively in any contenteditable, no wiring needed. These are the ones
// browsers have no default binding for, using Google Docs' conventions so
// they're familiar and never collide with a reserved browser shortcut.
document.addEventListener('keydown',(e)=>{
  if(!e.target.closest?.('.copy-editor'))return;
  const mod=e.ctrlKey||e.metaKey;
  if(!mod)return;
  const k=e.key.toLowerCase();
  if(!e.shiftKey&&k==='b'){e.preventDefault();document.execCommand('bold');}
  else if(!e.shiftKey&&k==='i'){e.preventDefault();document.execCommand('italic');}
  else if(!e.shiftKey&&k==='u'){e.preventDefault();document.execCommand('underline');}
  else if(e.shiftKey&&k==='x'){e.preventDefault();document.execCommand('strikeThrough');}
  else if(e.shiftKey&&e.key==='8'){e.preventDefault();document.execCommand('insertUnorderedList');}
  else if(e.shiftKey&&e.key==='7'){e.preventDefault();document.execCommand('insertOrderedList');}
  else if(!e.shiftKey&&e.key==='\\'){e.preventDefault();document.execCommand('removeFormat');}
});

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

// ===== CHECKLISTS inside Copy/concepto and Nota/referencia =====
// A lighter alternative to a full subtask — simple steps you check off
// inline, without an assignee/due-date/status of their own.

function insertChecklistItem(){
  const clid='cl'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  // The checkbox itself needs its own contenteditable="false" island —
  // otherwise clicking it just moves the text cursor instead of toggling
  // it (a well-known quirk of form elements inside contenteditable).
  // Inserted inline (not as a block/div) so the cursor lands right after
  // it, ready to type — and so it doesn't force an oversized line.
  const html=`<span contenteditable="false" style="display:inline-block;vertical-align:middle"><input type="checkbox" class="cl-check" data-clid="${clid}" style="vertical-align:middle;cursor:pointer;margin:0 4px 0 0"></span>`;
  document.execCommand('insertHTML',false,html);
}

// Checkbox "checked" is a live DOM PROPERTY that toggling doesn't write
// back to the HTML ATTRIBUTE — so innerHTML (what getCopyValue reads to
// save) would always show the item as unchecked otherwise. This keeps
// the attribute in sync with every click, anywhere a .cl-check exists.
document.addEventListener('change',(e)=>{
  if(!e.target.classList?.contains('cl-check'))return;
  if(e.target.checked)e.target.setAttribute('checked','');
  else e.target.removeAttribute('checked');
});

// Injects (or strips) the interactive onchange handler on every checklist
// checkbox in a rendered HTML string. With no taskId (card previews, etc.)
// checkboxes are disabled — nothing to save a toggle to there, and an
// enabled-but-inert checkbox would misleadingly "un-toggle" on refresh.
function wireChecklistCheckboxes(html,taskId,field){
  if(!html)return html;
  if(!taskId){
    return html.replace(/<input type="checkbox" class="cl-check"/g,'<input type="checkbox" class="cl-check" disabled');
  }
  return html.replace(/<input type="checkbox" class="cl-check"([^>]*)>/g,
    (m,attrs)=>`<input type="checkbox" class="cl-check"${attrs} onchange="toggleChecklistItem('${taskId}','${field}',this.dataset.clid,this.checked)">`
  );
}

function updateCheckboxInHtml(html,clid,checked){
  const tmp=document.createElement('div');
  tmp.innerHTML=html;
  const cb=tmp.querySelector(`input[data-clid="${clid}"]`);
  if(cb){
    if(checked)cb.setAttribute('checked','');
    else cb.removeAttribute('checked');
  }
  return tmp.innerHTML;
}

// Persists a single checklist toggle straight to the DB — works from the
// read-only task detail view, no need to open the full editor.
async function toggleChecklistItem(taskId,field,clid,checked){
  const{data:task}=await db.from('tasks').select(field).eq('id',taskId).maybeSingle();
  const raw=task?.[field];
  if(!raw)return;
  let updated;
  try{
    const parsed=JSON.parse(raw);
    if(parsed?.v===1&&parsed.sections?.length){
      parsed.sections.forEach(s=>{s.html=updateCheckboxInHtml(s.html,clid,checked);});
      updated=JSON.stringify(parsed);
    }else{
      updated=updateCheckboxInHtml(raw,clid,checked);
    }
  }catch(e){
    updated=updateCheckboxInHtml(raw,clid,checked);
  }
  await db.from('tasks').update({[field]:updated}).eq('id',taskId);
}

function renderCopyValue(val,taskId,field){
  if(!val)return'';
  try{
    const parsed=JSON.parse(val);
    if(parsed?.v===1&&parsed.sections?.length){
      return parsed.sections.map(s=>`
        <div class="copy-section-view">
          ${s.title?`<div class="copy-section-view-title">${s.title}</div>`:''}
          <div class="copy-section-view-body">${wireChecklistCheckboxes(linkify(s.html),taskId,field)}</div>
        </div>`).join('');
    }
  }catch(e){}
  // Plain text
  return`<div class="copy-section-view-body">${wireChecklistCheckboxes(linkify(val.replace(/\n/g,'<br>')),taskId,field)}</div>`;
}

// For Nota/referencia: renders formatting (bold, italic, lists...) when the
// content already contains HTML tags, but still works correctly for plain
// text (just converts newlines to line breaks). Links get linkified either
// way. Unlike renderCopyValue, this never expects our internal {v:1,...}
// JSON section format — notes are always a single freeform string.
function renderNoteValue(val){
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
  const hasHtml=/<[a-z][\s\S]*>/i.test(val);
  if(hasHtml)return linkify(val);
  return linkify(val.replace(/\n/g,'<br>'));
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

// ===== SUBTASK-GATED COMPLETION =====
// Shared between the artist app and the manager dashboard so a task with
// pending subtasks can't be completed from either side, and progress
// always cascades to the parent the same way regardless of who did it.
async function getSubtasks(taskId){
  const{data}=await db.from('tasks').select('id,status,due_date').eq('parent_task_id',taskId);
  return data||[];
}

// Call BEFORE marking a task complete. Blocks (with a toast) if the task
// has subtasks that aren't all done yet.
async function canCompleteTask(taskId){
  const subs=await getSubtasks(taskId);
  if(!subs.length)return true;
  const incomplete=subs.filter(s=>!['published','late-pub'].includes(s.status));
  if(incomplete.length){
    toast(`⚠️ Completa primero las ${incomplete.length} subtarea${incomplete.length!==1?'s':''} pendiente${incomplete.length!==1?'s':''}`);
    return false;
  }
  return true;
}

// Call AFTER a task's status successfully changes. If it's a subtask,
// bumps the parent to "En proceso" once the first sibling is done, and to
// fully completed once every sibling is done — without ever downgrading a
// parent that's already further along (review/approved/etc).
async function cascadeParentStatus(taskId){
  const{data:task}=await db.from('tasks').select('parent_task_id').eq('id',taskId).maybeSingle();
  if(!task?.parent_task_id)return;
  const parentId=task.parent_task_id;
  const{data:parent}=await db.from('tasks').select('id,status,due_date').eq('id',parentId).maybeSingle();
  if(!parent)return;
  const siblings=await getSubtasks(parentId);
  const allDone=siblings.length>0&&siblings.every(s=>['published','late-pub'].includes(s.status));
  if(allDone){
    if(!['published','late-pub'].includes(parent.status)){
      const ns=dU(parent.due_date)<0?'late-pub':'published';
      await db.from('tasks').update({status:ns,updated_at:new Date().toISOString()}).eq('id',parentId);
    }
  } else if(['todo','late'].includes(parent.status)){
    await db.from('tasks').update({status:'in-progress',updated_at:new Date().toISOString()}).eq('id',parentId);
  }
}

// ===== TASK LABELS (custom, per-artist, optional workflow tags) =====
// A curated palette rather than a free color-wheel — easier to pick from,
// and every combination stays legible against the chip's light background.
const LABEL_COLORS=['#22c55e','#3b82f6','#a855f7','#ec4899','#f97316','#eab308','#14b8a6','#ef4444','#6366f1','#64748b'];

window._labelsCache=window._labelsCache||{};

async function loadArtistLabels(artistSlug){
  if(!artistSlug)return[];
  const{data}=await db.from('task_labels').select('*').eq('artist_slug',artistSlug).order('created_at',{ascending:true});
  window._labelsCache[artistSlug]=data||[];
  return window._labelsCache[artistSlug];
}

function getCachedLabels(artistSlug){
  return window._labelsCache?.[artistSlug]||[];
}

async function createTaskLabel(artistSlug,name,color,createdBy){
  const{data,error}=await db.from('task_labels').insert([{artist_slug:artistSlug,name,color,created_by:createdBy}]).select().single();
  if(error){toast('Error creando etiqueta: '+error.message);return null;}
  if(!window._labelsCache[artistSlug])window._labelsCache[artistSlug]=[];
  window._labelsCache[artistSlug].push(data);
  return data;
}

async function updateTaskLabel(labelId,artistSlug,name,color){
  const{data,error}=await db.from('task_labels').update({name,color}).eq('id',labelId).select().single();
  if(error){toast('Error actualizando etiqueta: '+error.message);return null;}
  if(window._labelsCache[artistSlug]){
    const idx=window._labelsCache[artistSlug].findIndex(l=>l.id===labelId);
    if(idx>=0)window._labelsCache[artistSlug][idx]=data;
  }
  return data;
}

async function updateTaskLabel(labelId,artistSlug,name,color){
  const{data,error}=await db.from('task_labels').update({name,color}).eq('id',labelId).select().single();
  if(error){toast('Error actualizando etiqueta: '+error.message);return null;}
  if(window._labelsCache[artistSlug]){
    const idx=window._labelsCache[artistSlug].findIndex(l=>l.id===labelId);
    if(idx>=0)window._labelsCache[artistSlug][idx]=data;
  }
  return data;
}

async function deleteTaskLabel(labelId,artistSlug){
  await db.from('task_labels').delete().eq('id',labelId);
  if(window._labelsCache[artistSlug])window._labelsCache[artistSlug]=window._labelsCache[artistSlug].filter(l=>l.id!==labelId);
  // Strip this label from any tasks that had it, so nothing dangles.
  const{data:allArtistTasks}=await db.from('tasks').select('id,label_ids,projects!inner(artist_id)').eq('projects.artist_id',artistSlug);
  const toClean=(allArtistTasks||[]).filter(t=>Array.isArray(t.label_ids)&&t.label_ids.includes(labelId));
  await Promise.all(toClean.map(t=>db.from('tasks').update({label_ids:t.label_ids.filter(id=>id!==labelId)}).eq('id',t.id)));
}

// Toggles a label on a task, persists to DB, returns the new label_ids array.
async function toggleTaskLabel(taskId,labelId,currentLabelIds){
  let ids=Array.isArray(currentLabelIds)?[...currentLabelIds]:[];
  if(ids.includes(labelId))ids=ids.filter(id=>id!==labelId);
  else ids.push(labelId);
  await db.from('tasks').update({label_ids:ids}).eq('id',taskId);
  return ids;
}

// Small colored chips for showing labels on a task card, without opening it.
function renderLabelChips(labelIds,artistSlug){
  if(!labelIds||!labelIds.length)return'';
  const all=getCachedLabels(artistSlug);
  const chips=labelIds.map(id=>all.find(l=>l.id===id)).filter(Boolean);
  if(!chips.length)return'';
  return`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${chips.map(l=>
    `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;background:${l.color}18;color:${l.color}">
      <span style="width:6px;height:6px;border-radius:50%;background:${l.color}"></span>${l.name}
    </span>`
  ).join('')}</div>`;
}

// Compact version for narrow rows (Esta semana, Próximas): shows just the
// first label as a small dot + short name, plus a "+N" if there are more.
function renderLabelDot(labelIds,artistSlug){
  if(!labelIds||!labelIds.length)return'';
  const all=getCachedLabels(artistSlug);
  const chips=labelIds.map(id=>all.find(l=>l.id===id)).filter(Boolean);
  if(!chips.length)return'';
  const first=chips[0];
  const extra=chips.length-1;
  return`<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;color:${first.color};margin-top:2px">
    <span style="width:6px;height:6px;border-radius:50%;background:${first.color};flex-shrink:0"></span>${first.name}${extra>0?` +${extra}`:''}
  </span>`;
}

// ===== IMMEDIATE TASK-COMPLETION POINTS =====
// Small, instant reward separate from the achievements/milestones system
// (which stays as the "big goal" layer). This gives quick positive
// feedback on every single completion, no matter how small the task.
async function awardTaskPoints(artistSlug,isOnTime,taskId){
  if(!artistSlug)return;
  const pts=isOnTime?2:1;
  await db.from('task_points_log').insert([{artist_slug:artistSlug,task_id:taskId||null,points:pts}]);
  showPointsPop(pts);
  return pts;
}

// Sum of task-completion points earned in a given period. Defaults to the
// current calendar month. Pass fromDate=null to get the lifetime total.
async function getTaskPointsSum(artistSlug,fromDate){
  if(!artistSlug)return 0;
  let q=db.from('task_points_log').select('points').eq('artist_slug',artistSlug);
  if(fromDate)q=q.gte('created_at',fromDate);
  const{data}=await q;
  return(data||[]).reduce((s,r)=>s+(r.points||0),0);
}

// A small floating "+N pts" pill that pops in, drifts up, and fades —
// deliberately brief and off to the side so it never blocks anything.
function showPointsPop(points){
  if(!document.getElementById('points-pop-style')){
    const style=document.createElement('style');
    style.id='points-pop-style';
    style.textContent=`
      @keyframes pointsPopIn{
        0%{opacity:0;transform:translate(-50%,10px) scale(.7)}
        15%{opacity:1;transform:translate(-50%,0) scale(1.08)}
        25%{transform:translate(-50%,0) scale(1)}
        80%{opacity:1;transform:translate(-50%,-6px) scale(1)}
        100%{opacity:0;transform:translate(-50%,-22px) scale(.95)}
      }`;
    document.head.appendChild(style);
  }
  const el=document.createElement('div');
  el.textContent=`✨ +${points} pts`;
  el.style.cssText=`
    position:fixed;left:50%;top:70px;z-index:9999;
    background:#111;color:#fff;font-weight:700;font-size:13px;
    padding:8px 16px;border-radius:100px;
    box-shadow:0 6px 20px rgba(0,0,0,.25);
    pointer-events:none;
    animation:pointsPopIn 1.6s ease-out forwards;`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1700);
}

// Shows/hides a dismissible explanatory text box — used by the small "ⓘ"
// icons throughout Stats so people can peek at an explanation and close
// it again without it taking up permanent space.
function toggleInfoBox(boxId){
  const el=document.getElementById(boxId);
  if(!el)return;
  el.style.display=el.style.display==='none'?'block':'none';
}

// Short preview of copy/note content for compact card contexts (Para hoy),
// keeping rich formatting (bold, italic, lists) intact — only the text
// length gets cut, not the tags around it.
function truncatePreview(html,maxChars=90){
  if(!html)return'';
  let content=html;
  try{
    const parsed=JSON.parse(html);
    if(parsed?.v===1&&parsed.sections?.length){
      content=parsed.sections.map(s=>(s.title?`<strong>${s.title}: </strong>`:'')+s.html).join(' — ');
    }
  }catch(e){}

  const container=document.createElement('div');
  container.innerHTML=content;

  let charCount=0,truncated=false;
  function walk(node){
    if(truncated)return null;
    if(node.nodeType===Node.TEXT_NODE){
      const remaining=maxChars-charCount;
      if(node.textContent.length<=remaining){
        charCount+=node.textContent.length;
        return document.createTextNode(node.textContent);
      }
      truncated=true;
      return document.createTextNode(node.textContent.slice(0,Math.max(0,remaining))+'…');
    }
    if(node.nodeType===Node.ELEMENT_NODE){
      const clone=node.cloneNode(false);
      for(const child of node.childNodes){
        const walked=walk(child);
        if(walked)clone.appendChild(walked);
        if(truncated)break;
      }
      return clone;
    }
    return null;
  }

  const result=document.createElement('div');
  for(const child of container.childNodes){
    const walked=walk(child);
    if(walked)result.appendChild(walked);
    if(truncated)break;
  }
  return result.innerHTML;
}
