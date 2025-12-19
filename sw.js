/**
 * AIVA Chronos Pro - Core Logic
 * Gestión de productividad, alarmas y persistencia local.
 */

const { jsPDF } = window.jspdf;
const audio = document.getElementById('alarmaSound');
let vacationMode = localStorage.getItem('vacationMode') === 'true';

// 1. Inicialización del Sistema
document.addEventListener('DOMContentLoaded', () => {
    updateVacationUI(); // Sincroniza el estado visual del Modo Vacaciones
    autolimpieza(); // Elimina tareas de más de 24h para optimizar el rendimiento
    mostrarEventos(); // Renderiza la lista de tareas pendientes y cumplidas
    verificarTutorial(); // Muestra la guía automática si es la primera visita
    
    // Revisión constante de alarmas cada 10 segundos
    setInterval(revisarAlarmas, 10000); 
});

// 2. Registro de PWA (Service Worker) para instalación nativa
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('AIVA Chronos: Service Worker Activo'))
            .catch(err => console.error('Error PWA:', err));
    });
}

// 3. Gestión de Interfaz y Modales
function verificarTutorial() {
    if (!localStorage.getItem('aiva_v1')) {
        toggleModal('modalGuia');
        localStorage.setItem('aiva_v1', 'true'); // Marca el tutorial como visto
    }
}

function toggleModal(id) {
    const m = document.getElementById(id);
    m.style.display = m.style.display === 'none' ? 'flex' : 'none';
}

function showTab(t) {
    document.getElementById('cont-guia').style.display = t === 'guia' ? 'block' : 'none';
    document.getElementById('cont-faq').style.display = t === 'faq' ? 'block' : 'none';
    document.getElementById('t-guia').className = t === 'guia' ? 'tab-btn tab-active' : 'tab-btn';
    document.getElementById('t-faq').className = t === 'faq' ? 'tab-btn tab-active' : 'tab-btn';
}

// 4. Lógica de Tareas y Almacenamiento
function agregarEvento() {
    const t = document.getElementById('tarea').value;
    const f = document.getElementById('fecha').value;
    const c = document.getElementById('categoria').value;

    if (!t || !f) return alert("Por favor, completa los campos de tarea y fecha.");

    // Habilita el audio en navegadores móviles tras la interacción del usuario
    audio.play().then(() => audio.pause()).catch(() => {});

    const agenda = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    agenda.push({ id: Date.now(), tarea: t, fecha: f, categoria: c, sonado: false });
    
    localStorage.setItem('agenda_2025', JSON.stringify(agenda));
    document.getElementById('tarea').value = '';
    mostrarEventos();
}

function mostrarEventos() {
    const lista = document.getElementById('listaEventos');
    const agenda = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    const ahora = new Date().getTime();
    
    lista.innerHTML = '';

    // Filtrado y ordenamiento: Pendientes primero, luego completadas
    const pend = agenda.filter(ev => new Date(ev.fecha).getTime() >= ahora).sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    const pas = agenda.filter(ev => new Date(ev.fecha).getTime() < ahora).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

    if(pend.length) {
        lista.innerHTML += '<div class="section-title">Próximos Pendientes</div>';
        pend.forEach(ev => lista.innerHTML += generarHTML(ev, false));
    }
    if(pas.length) {
        lista.innerHTML += '<div class="section-title">Completadas (Recientes)</div>';
        pas.forEach(ev => lista.innerHTML += generarHTML(ev, true));
    }
    if(!agenda.length) {
        lista.innerHTML = '<div style="text-align:center; color:#94a3b8; margin-top:50px;">No hay tareas registradas.</div>';
    }
}

function generarHTML(ev, esV) {
    const f = new Date(ev.fecha).toLocaleString([], {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
    return `
        <div class="evento cat-${ev.categoria} ${esV ? 'vencida' : ''}">
            <div style="font-size:13px;"><small>${f}</small><br><strong>${ev.tarea}</strong></div>
            <button style="border:none; background:none; color:red; font-weight:bold; cursor:pointer; padding:10px;" 
                onclick="eliminar(${ev.id})">✕</button>
        </div>`;
}

// 5. Inteligencia de Alarmas y Modo Vacaciones
function toggleVacation() {
    vacationMode = !vacationMode;
    localStorage.setItem('vacationMode', vacationMode);
    updateVacationUI();
}

function updateVacationUI() {
    const btn = document.getElementById('vacationBtn');
    btn.className = vacationMode ? 'vacation-toggle vacation-active' : 'vacation-toggle';
    btn.innerHTML = vacationMode ? '🌴 Modo Vacaciones' : '💼 Modo Oficina';
}

function revisarAlarmas() {
    if(vacationMode) return; // Detiene las alertas si el modo vacaciones está activo

    const agenda = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    const ahora = new Date().getTime();
    let huboCambio = false;

    agenda.forEach(ev => {
        if (ahora >= new Date(ev.fecha).getTime() && !ev.sonado) {
            audio.play(); 
            alert("⏰ AIVA CHRONOS: " + ev.tarea);
            ev.sonado = true;
            huboCambio = true;
        }
    });

    if (huboCambio) {
        localStorage.setItem('agenda_2025', JSON.stringify(agenda));
        mostrarEventos();
    }
}

// 6. Funciones de Respaldo y Reportes
function exportarCSV() {
    const agenda = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    let csv = "id,tarea,fecha,categoria,sonado\n";
    agenda.forEach(ev => csv += `${ev.id},"${ev.tarea}",${ev.fecha},${ev.categoria},${ev.sonado}\n`);
    
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AIVA_Backup_${new Date().toLocaleDateString()}.csv`;
    link.click();
}

function importarCSV(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const lineas = event.target.result.split('\n').slice(1);
        const nuevaAgenda = lineas.filter(l => l.trim()).map(l => {
            const p = l.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            return { 
                id: p[0], 
                tarea: p[1].replace(/"/g,''), 
                fecha: p[2], 
                categoria: p[3], 
                sonado: p[4] === 'true' 
            };
        });
        localStorage.setItem('agenda_2025', JSON.stringify(nuevaAgenda));
        mostrarEventos();
        alert("Agenda restaurada correctamente.");
    };
    reader.readAsText(e.target.files[0]);
}

function exportarPDF() {
    const agenda = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    const doc = new jsPDF();
    
    doc.addImage(document.getElementById('logoPDF'), 'PNG', 15, 12, 25, 25);
    doc.setFontSize(18);
    doc.text("REPORTE AIVA CHRONOS", 45, 22);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 45, 30);
    doc.line(15, 40, 195, 40);

    let y = 55;
    agenda.forEach((ev, i) => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(`${i+1}. [${ev.fecha}] - ${ev.tarea} (${ev.categoria})`, 20, y);
        y += 10;
    });
    doc.save("Reporte_AIVA_Chronos.pdf");
}

function autolimpieza() { 
    let agenda = JSON.parse(localStorage.getItem('agenda_2025')) || [];
    const ahora = new Date().getTime();
    const UN_DIA = 24 * 60 * 60 * 1000;
    
    // Solo conserva tareas que no han pasado o que pasaron hace menos de 24 horas
    const limpia = agenda.filter(ev => (ahora - new Date(ev.fecha).getTime()) < UN_DIA);
    localStorage.setItem('agenda_2025', JSON.stringify(limpia));
}

function eliminar(id) {
    let agenda = JSON.parse(localStorage.getItem('agenda_2025')).filter(e => e.id != id);
    localStorage.setItem('agenda_2025', JSON.stringify(agenda));
    mostrarEventos();
}
