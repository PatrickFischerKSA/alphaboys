"use strict";
/* =========================================================
   APP.JS — Alpha Boys Lernumgebung
   ÄNDERUNGSPROTOKOLL
   [2026-02-01] v1.0 Initial
   - Navigation, Scrollspy, Quiz (MC/MS/Short), Punkte, Fortschritt, localStorage
   - Modal, Regeln, Reset, Export (Text)
   ========================================================= */
const STORE_KEY="alpha_boys_unit_v1";
const state={points:0,answered:{},notes:{}};
function $(s,r=document){return r.querySelector(s)}; function $all(s,r=document){return Array.from(r.querySelectorAll(s))}
function load(){try{const raw=localStorage.getItem(STORE_KEY); if(!raw) return; const saved=JSON.parse(raw); if(saved&&typeof saved==="object"){Object.assign(state,saved)}}catch(e){}}
function save(){localStorage.setItem(STORE_KEY,JSON.stringify(state)); renderProgress();}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function toastModal(title,html){$("#modalTitle").textContent=title; $("#modalBody").innerHTML=html; $("#modalBg").style.display="flex"; $("#modalClose").focus();}
function closeModal(){$("#modalBg").style.display="none"; $("#modalBody").innerHTML="";}
function initNav(){
  const links=$all(".nav a");
  links.forEach(a=>a.addEventListener("click",(ev)=>{ev.preventDefault(); const id=a.getAttribute("href").slice(1); const el=document.getElementById(id); if(el){el.scrollIntoView({behavior:"smooth",block:"start"}); history.replaceState(null,"",`#${id}`);}}));
  const sections=links.map(a=>document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
  const io=new IntersectionObserver((entries)=>{
    let best=null;
    for(const e of entries){if(e.isIntersecting){if(!best||e.intersectionRatio>best.intersectionRatio) best=e;}}
    if(best){const id=best.target.id; links.forEach(a=>a.classList.toggle("active",a.getAttribute("href")===`#${id}`));}
  },{threshold:[0.15,0.25,0.35,0.5,0.7]});
  sections.forEach(s=>io.observe(s));
}
function computeTotals(){
  const items=$all("[data-quiz]"); const total=items.length;
  let done=0, correct=0;
  for(const el of items){const id=el.getAttribute("data-quiz"); if(state.answered[id]){done++; if(state.answered[id].correct) correct++;}}
  return {total,done,correct};
}
function renderProgress(){
  const {total,done,correct}=computeTotals();
  $("#statDone").textContent=`${done}/${total}`;
  $("#statCorrect").textContent=`${correct}`;
  $("#statPoints").textContent=`${state.points} Punkte`;
  const pct= total? (done/total)*100 : 0;
  $("#progressFill").style.width=`${pct}%`;
  $("#progressPct").textContent=`${Math.round(pct)}%`;
}
function markAnswered(id,ok){
  const prev=state.answered[id]||{attempts:0,correct:false};
  prev.attempts += 1;
  const wasCorrect=prev.correct===true;
  prev.correct = prev.correct || ok;
  if(!wasCorrect && ok){
    const pts=clamp(6-(prev.attempts-1)*2,2,6);
    state.points += pts;
  }else if(!ok){
    state.points=Math.max(0,state.points-1);
  }
  state.answered[id]=prev; save();
}
function setFeedback(item,kind,html){
  const fb=item.querySelector(".feedback");
  fb.classList.remove("good","bad","neutral");
  fb.classList.add(kind);
  fb.innerHTML=html;
}
function initQuiz(){
  $all("[data-quiz]").forEach(item=>{
    const id=item.getAttribute("data-quiz");
    const type=item.getAttribute("data-type");

    // restore feedback summary
    if(state.answered[id]){
      const fb=item.querySelector(".feedback");
      fb.style.display="block";
      const status=state.answered[id].correct ? "good":"neutral";
      const msg=state.answered[id].correct ? `Gespeichert: ✅ korrekt (Versuche: ${state.answered[id].attempts})` : `Gespeichert: ⏳ begonnen (Versuche: ${state.answered[id].attempts})`;
      setFeedback(item,status,msg);
    }

    if(type==="mc"){
      $all(".opt",item).forEach(opt=>opt.addEventListener("click",()=>{const r=opt.querySelector("input[type=radio]"); r.checked=true;}));
      item.querySelector(".checkBtn").addEventListener("click",()=>{
        const correct=item.getAttribute("data-answer");
        const picked=item.querySelector("input[type=radio]:checked");
        item.querySelector(".feedback").style.display="block";
        if(!picked){setFeedback(item,"neutral","Bitte wähle eine Antwort aus."); return;}
        const ok=picked.value===correct; markAnswered(id,ok);
        if(ok){setFeedback(item,"good",item.getAttribute("data-ok"));}
        else{
          const attempts=state.answered[id].attempts;
          const hint = attempts>=2 ? `<div class="small"><b>Hinweis:</b> ${item.getAttribute("data-hint")}</div>` : "";
          setFeedback(item,"bad",item.getAttribute("data-bad")+hint);
        }
      });
      item.querySelector(".revealBtn").addEventListener("click",()=>{
        const attempts=(state.answered[id]?.attempts||0);
        if(attempts<3){toastModal("Modelllösung gesperrt",`<p>Nach <b>3 Versuchen</b> verfügbar. Aktuell: ${attempts}/3.</p>`); return;}
        toastModal("Modelllösung",`<p>${item.getAttribute("data-model")}</p>`);
      });
    }
    if(type==="ms"){
      $all(".opt",item).forEach(opt=>opt.addEventListener("click",(ev)=>{if(ev.target.tagName.toLowerCase()==="input") return; const cb=opt.querySelector("input[type=checkbox]"); cb.checked=!cb.checked;}));
      item.querySelector(".checkBtn").addEventListener("click",()=>{
        const correct=(item.getAttribute("data-answer")||"").split(",").map(s=>s.trim()).filter(Boolean).sort();
        const picked=$all("input[type=checkbox]:checked",item).map(x=>x.value).sort();
        item.querySelector(".feedback").style.display="block";
        if(picked.length===0){setFeedback(item,"neutral","Bitte wähle mindestens eine Option aus."); return;}
        const ok=JSON.stringify(correct)===JSON.stringify(picked); markAnswered(id,ok);
        if(ok){setFeedback(item,"good",item.getAttribute("data-ok"));}
        else{
          const attempts=state.answered[id].attempts;
          const hint = attempts>=2 ? `<div class="small"><b>Hinweis:</b> ${item.getAttribute("data-hint")}</div>` : "";
          setFeedback(item,"bad",item.getAttribute("data-bad")+hint);
        }
      });
      item.querySelector(".revealBtn").addEventListener("click",()=>{
        const attempts=(state.answered[id]?.attempts||0);
        if(attempts<3){toastModal("Modelllösung gesperrt",`<p>Nach <b>3 Versuchen</b> verfügbar. Aktuell: ${attempts}/3.</p>`); return;}
        toastModal("Modelllösung",`<p>${item.getAttribute("data-model")}</p>`);
      });
    }
    if(type==="short"){
      const inp=item.querySelector("input[type=text]");
      if(state.notes[id]) inp.value=state.notes[id];
      inp.addEventListener("input",()=>{state.notes[id]=inp.value; save();});
      item.querySelector(".checkBtn").addEventListener("click",()=>{
        const raw=(inp.value||"").trim().toLowerCase();
        item.querySelector(".feedback").style.display="block";
        if(!raw){setFeedback(item,"neutral","Bitte gib eine Antwort ein."); return;}
        const keywords=(item.getAttribute("data-keywords")||"").split("|").map(s=>s.trim().toLowerCase()).filter(Boolean);
        const minHits=parseInt(item.getAttribute("data-minhits")||"1",10);
        let hits=0; for(const k of keywords){if(raw.includes(k)) hits++;}
        const ok=hits>=minHits; markAnswered(id,ok);
        if(ok){setFeedback(item,"good",item.getAttribute("data-ok")+`<div class="small">Treffer: ${hits}/${keywords.length}</div>`);}
        else{
          const attempts=state.answered[id].attempts;
          const hint = attempts>=2 ? `<div class="small"><b>Hinweis:</b> ${item.getAttribute("data-hint")}</div>` : "";
          setFeedback(item,"bad",item.getAttribute("data-bad")+`<div class="small">Treffer: ${hits}/${keywords.length}</div>`+hint);
        }
      });
      item.querySelector(".revealBtn").addEventListener("click",()=>{
        const attempts=(state.answered[id]?.attempts||0);
        if(attempts<3){toastModal("Beispiel gesperrt",`<p>Nach <b>3 Versuchen</b> verfügbar. Aktuell: ${attempts}/3.</p>`); return;}
        toastModal("Beispiel",`<p>${item.getAttribute("data-model")}</p>`);
      });
    }
  });
}
function initSafety(){
  $("#rulesBtn").addEventListener("click",()=>toastModal("Diskussionsregeln (verbindlich)",`
    <div class="notice safe"><b>Ziel:</b> Analyse & Prävention – ohne Abwertung.</div>
    <ul class="ul">
      <li><b>Keine Abwertung</b> (weder gegen Geschlechter noch gegen Einzelpersonen).</li>
      <li><b>Keine Diagnosen</b>. Wir sprechen über Inhalte und Mechanismen.</li>
      <li><b>Zitat-Regel:</b> Problematische Aussagen nicht reproduzieren – paraphrasieren.</li>
      <li><b>Stop-Signal</b>: Jede Person kann „Stopp“ sagen.</li>
      <li><b>Beleg-Pflicht</b>: Behauptungen als Fakt/Interpretation/Beobachtung markieren.</li>
    </ul>`));
}
function resetAll(){if(!confirm("Wirklich alles zurücksetzen?")) return; localStorage.removeItem(STORE_KEY); location.reload();}

function bindTextarea(id, key){
  const el=document.getElementById(id); if(!el) return;
  if(state.notes[key]) el.value=state.notes[key];
  el.addEventListener("input",()=>{state.notes[key]=el.value; save();});
}

function exportAll(){
  const {total,done,correct}=computeTotals();
  const lines=[];
  lines.push("ALPHA BOYS – EXPORT");
  lines.push(`Datum: ${new Date().toLocaleString()}`);
  lines.push(`Punkte: ${state.points}`);
  lines.push(`Quiz: ${done}/${total} beantwortet, ${correct} korrekt`);
  lines.push("");
  lines.push("NOTIZEN:");
  for(const [k,v] of Object.entries(state.notes||{})){ if(!v) continue; lines.push(`- ${k}: ${String(v).replace(/\s+/g," ").trim()}`); }
  toastModal("Export (kopieren)",`<textarea readonly style="min-height:280px">${lines.join("\n").replaceAll("&","&amp;").replaceAll("<","&lt;")}</textarea>`);
}

window.addEventListener("DOMContentLoaded",()=>{
  load();
  initNav(); initSafety(); initQuiz();
  renderProgress();

  $("#resetBtn").addEventListener("click",resetAll);
  $("#modalClose").addEventListener("click",closeModal);
  $("#modalBg").addEventListener("click",(e)=>{if(e.target.id==="modalBg") closeModal();});
  document.addEventListener("keydown",(e)=>{if(e.key==="Escape") closeModal();});

  bindTextarea("note_m1","note_m1");
  bindTextarea("note_m3","note_m3");
  bindTextarea("finalText","finalText");
  bindTextarea("roleplayNotes","roleplayNotes");

  const exportBtn=$("#exportBtn"); if(exportBtn) exportBtn.addEventListener("click",exportAll);
});
