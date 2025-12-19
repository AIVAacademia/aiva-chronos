/**
 * AIVA Chronos Pro - Core Engine v1.5
 * Desarrollado para AIVA Academia
 */

const { jsPDF } = window.jspdf;
const audio = document.getElementById('alarmaSound');
let vacationMode = localStorage.getItem('vacationMode') === 'true';

// 1. Inicialización y Registro PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('AIVA Chronos: PWA Activa'))
            .catch(err => console.log('Error PWA:', err));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateVacationUI(); // Sincroniza el color y estado del encabezado
    autolimpieza(); // Mantiene la agenda libre de tareas antiguas de 24h
    mostrarEventos(); // Carga la lista visual inicial
    
    // Tutorial automático para nuevos usuarios
    if (!localStorage.getItem('aiva_v2')) {
        toggleModal('modalGuia');
        localStorage.setItem('aiva_v2', 'true');
    }
    
    // Revisión de alarmas cada 10 segundos
    setInterval(revisarAlarmas, 10000);
});

// 2. Gestión de Tareas (CRUD)
function agregarEvento() {
    const t = document.getElementById('tarea').value;
    const d = document.getElementById('descripcion').value;
    const f = document.getElementById('fecha').value;
    const c = document.getElementById('categoria').value;

    if (!t || !f) return alert("Por favor, ingresa al menos un título y la fecha.");

    // Habilitar audio para móviles tras interacción
    audio.play().then(() => audio.pause()).catch(()=>{});

    const agenda = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    agenda.push({ 
        id: Date.now(), 
        tarea: t, 
        descripcion: d, 
        fecha: f, 
        categoria: c, 
        sonado: false 
    });
    
    localStorage.setItem('agenda_2025', JSON.stringify(agenda));
    document.getElementById('tarea').value = '';
    document.getElementById('descripcion').value = '';
    mostrarEventos();
}

function mostrarEventos() {
    const lista = document.getElementById('listaEventos');
    const agenda = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    const ahora = new Date().getTime();
    
    lista.innerHTML = '';

    // Separar tareas por estado temporal
    const pend = agenda.filter(ev => new Date(ev.fecha).getTime() >= ahora).sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    const pas = agenda.filter(ev => new Date(ev.fecha).getTime() < ahora).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

    if(pend.length) {
        lista.innerHTML += '<div class="section-title">Próximos Pendientes</div>';
        pend.forEach(ev => lista.innerHTML += generarHTML(ev, false));
    }
    if(pas.length) {
        lista.innerHTML += '<div class="section-title">Completadas (24h)</div>';
        pas.forEach(ev => lista.innerHTML += generarHTML(ev, true));
    }
    if(!agenda.length) {
        lista.innerHTML = '<div style="text-align:center; color:#94a3b8; margin-top:50px; font-size:14px;">Agenda vacía.</div>';
    }
}

function generarHTML(ev, esV) {
    const f = new Date(ev.fecha).toLocaleString([], {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
    return `
        <div class="evento cat-${ev.categoria} ${esV ? 'vencida' : ''}">
            <div class="evento-info" onclick="abrirEditor(${ev.id})">
                <small style="font-weight:bold; color:var(--primary);">${f}</small><br>
                <strong>${ev.tarea}</strong>
                ${ev.descripcion ? '<br><span style="font-size:11px; color:#64748b;">📝 Ver detalles...</span>' : ''}
            </div>
            <button class="btn-del" onclick="eliminar(${ev.id})">✕</button>
        </div>`;
}

// 3. Sistema de Edición
function abrirEditor(id) {
    const agenda = JSON.parse(localStorage.getItem('agenda_2025'));
    const ev = agenda.find(e => e.id == id);
    
    document.getElementById('editId').value = ev.id;
    document.getElementById('editTarea').value = ev.tarea;
    document.getElementById('editDescripcion').value = ev.descripcion || '';
    document.getElementById('editFecha').value = ev.fecha;
    document.getElementById('editCategoria').value = ev.categoria;
    
    toggleModal('modalEdit');
}

function guardarEdicion() {
    const id = document.getElementById('editId').value;
    let agenda = JSON.parse(localStorage.getItem('agenda_2025'));
    const idx = agenda.findIndex(e => e.id == id);

    agenda[idx].tarea = document.getElementById('editTarea').value;
    agenda[idx].descripcion = document.getElementById('editDescripcion').value;
    agenda[idx].fecha = document.getElementById('editFecha').value;
    agenda[idx].categoria = document.getElementById('editCategoria').value;
    agenda[idx].sonado = false; // Permite que la alarma vuelva a sonar si se cambió la hora

    localStorage.setItem('agenda_2025', JSON.stringify(agenda));
    toggleModal('modalEdit');
    mostrarEventos();
}

// 4. Modo Vacaciones y Alertas
function toggleVacation() {
    vacationMode = !vacationMode;
    localStorage.setItem('vacationMode', vacationMode);
    updateVacationUI();
}

function updateVacationUI() {
    const btn = document.getElementById('vacationBtn');
    const header = document.getElementById('mainHeader');
    if (vacationMode) {
        btn.className = 'vacation-toggle vacation-active';
        btn.innerHTML = '🌴 Modo Vacaciones';
        header.style.background = 'var(--vacation)';
    } else {
        btn.className = 'vacation-toggle';
        btn.innerHTML = '💼 Modo Oficina';
        header.style.background = 'var(--primary)';
    }
}

function revisarAlarmas() {
    if(vacationMode) return; // Silencia el sistema en vacaciones

    const agenda = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    const ahora = new Date().getTime();
    let cambio = false;

    agenda.forEach(ev => {
        if (ahora >= new Date(ev.fecha).getTime() && !ev.sonado) {
            audio.play(); 
            alert("⏰ AIVA RECORDATORIO: " + ev.tarea);
            ev.sonado = true;
            cambio = true;
        }
    });

    if (cambio) {
        localStorage.setItem('agenda_2025', JSON.stringify(agenda));
        mostrarEventos();
    }
}

// 5. Herramientas de Datos
function exportarCSV() {
    const a = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    if (!a.length) return alert("No hay datos para descargar.");

    let csv = "id,tarea,descripcion,fecha,categoria,sonado\n";
    a.forEach(ev => csv += `${ev.id},"${ev.tarea}","${ev.descripcion || ''}",${ev.fecha},${ev.categoria},${ev.sonado}\n`);
    
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Agenda_AIVA_${new Date().toLocaleDateString()}.csv`;
    link.click();
}

function importarCSV(e) {
    const r = new FileReader();
    r.onload = (event) => {
        const lineas = event.target.result.split('\n').slice(1);
        const n = lineas.filter(l => l.trim()).map(l => {
            const p = l.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            return { 
                id: p[0], 
                tarea: p[1].replace(/"/g,''), 
                descripcion: p[2].replace(/"/g,''),
                fecha: p[3], 
                categoria: p[4], 
                sonado: p[5] === 'true' 
            };
        });
        if(confirm(`¿Cargar ${n.length} tareas? Esto reemplazará tu lista actual.`)) {
            localStorage.setItem('agenda_2025', JSON.stringify(n));
            mostrarEventos();
            alert("Agenda cargada.");
        }
    };
    r.readAsText(e.target.files[0]);
}

function exportarPDF() {
    const a = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    const doc = new jsPDF();
    doc.addImage(document.getElementById('logoPDF'), 'PNG', 15, 12, 25, 25);
    doc.setFontSize(18); doc.text("REPORTE AIVA CHRONOS", 45, 22);
    let y = 50;
    a.forEach((ev, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`${i+1}. [${ev.fecha}] ${ev.tarea}`, 20, y);
        y += 10;
    });
    doc.save("Reporte_AIVA.pdf");
}

// 6. Utilidades de Sistema
function autolimpieza() { 
    let a = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    const ahora = new Date().getTime();
    const UN_DIA = 86400000;
    const l = a.filter(ev => (ahora - new Date(ev.fecha).getTime()) < UN_DIA);
    localStorage.setItem('agenda_2025', JSON.stringify(l));
}

function eliminar(id) {
    if(!confirm("¿Eliminar tarea?")) return;
    let a = JSON.parse(localStorage.getItem('agenda_2025')).filter(e => e.id != id);
    localStorage.setItem('agenda_2025', JSON.stringify(a));
    mostrarEventos();
}

function toggleModal(id) {
    const m = document.getElementById(id);
    m.style.display = m.style.display === 'none' ? 'flex' : 'none';
}

function switchTab(t) {
    document.getElementById('content-guia').style.display = t === 'guia' ? 'block' : 'none';
    document.getElementById('content-faq').style.display = t === 'faq' ? 'block' : 'none';
    document.getElementById('btn-guia').className = t === 'guia' ? 'tab-btn tab-active' : 'tab-btn';
    document.getElementById('btn-faq').className = t === 'faq' ? 'tab-btn tab-active' : 'tab-btn';
}
