const { jsPDF } = window.jspdf;
const audio = document.getElementById('alarmaSound');
let vacationMode = localStorage.getItem('vacationMode') === 'true';

// Registro de PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateVacationUI();
    autolimpieza();
    mostrarEventos();
    if (!localStorage.getItem('aiva_v1')) toggleModal('modalGuia'), localStorage.setItem('aiva_v1', 'true');
    setInterval(revisarAlarmas, 10000);
});

function toggleVacation() {
    vacationMode = !vacationMode;
    localStorage.setItem('vacationMode', vacationMode);
    updateVacationUI();
}

function updateVacationUI() {
    const btn = document.getElementById('vacationBtn');
    const header = document.getElementById('mainHeader');
    header.style.background = vacationMode ? 'var(--vacation)' : 'var(--primary)';
    btn.innerHTML = vacationMode ? '🌴 Modo Vacaciones' : '💼 Modo Oficina';
}

function agregarEvento() {
    const t = document.getElementById('tarea').value, f = document.getElementById('fecha').value, c = document.getElementById('categoria').value;
    if (!t || !f) return alert("Completa los campos");
    audio.play().then(() => audio.pause()).catch(()=>{});
    const agenda = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    agenda.push({ id: Date.now(), tarea: t, fecha: f, categoria: c, sonado: false });
    localStorage.setItem('agenda_2025', JSON.stringify(agenda));
    document.getElementById('tarea').value = '';
    mostrarEventos();
}

function mostrarEventos() {
    const lista = document.getElementById('listaEventos'), agenda = JSON.parse(localStorage.getItem('agenda_2025')) || [], ahora = new Date().getTime();
    lista.innerHTML = '';
    const p = agenda.filter(ev => new Date(ev.fecha).getTime() >= ahora).sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    const v = agenda.filter(ev => new Date(ev.fecha).getTime() < ahora).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    if(p.length) lista.innerHTML += '<div class="section-title">Pendientes</div>', p.forEach(ev => lista.innerHTML += generarHTML(ev, false));
    if(v.length) lista.innerHTML += '<div class="section-title">Completadas</div>', v.forEach(ev => lista.innerHTML += generarHTML(ev, true));
}

function generarHTML(ev, esV) {
    return `<div class="evento cat-${ev.categoria} ${esV?'vencida':''}">
        <div><strong>${ev.tarea}</strong></div>
        <button onclick="eliminar(${ev.id})" style="color:red; background:none; border:none; cursor:pointer;">✕</button>
    </div>`;
}

function revisarAlarmas() {
    if(vacationMode) return;
    const a = JSON.parse(localStorage.getItem('agenda_2025')) || [], ahora = new Date().getTime();
    a.forEach(ev => {
        if (ahora >= new Date(ev.fecha).getTime() && !ev.sonado) {
            audio.play(); alert("⏰ AIVA: " + ev.tarea);
            ev.sonado = true; localStorage.setItem('agenda_2025', JSON.stringify(a)); mostrarEventos();
        }
    });
}

function exportarCSV() {
    const a = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    let csv = "id,tarea,fecha,categoria,sonado\n";
    a.forEach(ev => csv += `${ev.id},"${ev.tarea}",${ev.fecha},${ev.categoria},${ev.sonado}\n`);
    const blob = new Blob([csv], {type: 'text/csv'}), url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = "Agenda_AIVA.csv"; link.click();
}

function importarCSV(e) {
    const r = new FileReader();
    r.onload = (event) => {
        const lineas = event.target.result.split('\n').slice(1);
        const n = lineas.filter(l => l.trim()).map(l => {
            const p = l.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            return { id: p[0], tarea: p[1].replace(/"/g,''), fecha: p[2], categoria: p[3], sonado: p[4]==='true' };
        });
        localStorage.setItem('agenda_2025', JSON.stringify(n)); mostrarEventos(); alert("Agenda cargada");
    };
    r.readAsText(e.target.files[0]);
}

function exportarPDF() {
    const a = JSON.parse(localStorage.getItem('agenda_2025')) || [], doc = new jsPDF();
    doc.text("REPORTE AIVA CHRONOS", 20, 20);
    let y = 30; a.forEach((ev, i) => { doc.text(`${i+1}. ${ev.tarea}`, 20, y); y += 10; });
    doc.save("Reporte_AIVA.pdf");
}

function toggleModal(id) { document.getElementById(id).style.display = document.getElementById(id).style.display === 'none' ? 'flex' : 'none'; }
function switchTab(t) {
    document.getElementById('content-guia').style.display = t === 'guia' ? 'block' : 'none';
    document.getElementById('content-faq').style.display = t === 'faq' ? 'block' : 'none';
    document.getElementById('btn-guia').className = t === 'guia' ? 'tab-btn tab-active' : 'tab-btn';
    document.getElementById('btn-faq').className = t === 'faq' ? 'tab-btn tab-active' : 'tab-btn';
}
function autolimpieza() { 
    let a = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    const l = a.filter(ev => (new Date().getTime() - new Date(ev.fecha).getTime()) < 86400000);
    localStorage.setItem('agenda_2025', JSON.stringify(l));
}
function eliminar(id) { localStorage.setItem('agenda_2025', JSON.stringify(JSON.parse(localStorage.getItem('agenda_2025')).filter(e => e.id != id))); mostrarEventos(); }