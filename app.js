/**
 * EduPay - Lógica Principal (Vanilla JS + LocalStorage)
 * Sistema de nóminas 100% frontend sin servidor.
 */

// =========================================
// CONFIGURACIÓN DE DESCUENTOS
// =========================================
const COSTO_FALTA = 150.00; // Puedes cambiar esto después
const COSTO_RETARDO = 50.00; // Puedes cambiar esto después

// =========================================
// ESTADO DE LA APLICACIÓN (BASE DE DATOS LOCAL)
// =========================================
let docentes = JSON.parse(localStorage.getItem('edupay_docentes')) || [];
let historialRecibos = JSON.parse(localStorage.getItem('edupay_historial')) || [];
let editandoId = null;
let isAuthenticated = sessionStorage.getItem('edupay_auth') === 'true';

// =========================================
// INICIALIZACIÓN
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    verificarLogin();
    
    // Si no está autenticado, no cargamos el resto aún.
    if (!isAuthenticated) return;
    iniciarAplicacion();
});

function iniciarAplicacion() {
    actualizarDashboard();
    renderizarTabla();
    renderizarHistorial();
    llenarSelectNómina();
    configurarNavegacion();
    configurarModal();
    configurarBuscador();
}

// =========================================
// LOGIN SIMULADO
// =========================================
function verificarLogin() {
    const loginScreen = document.getElementById('login-screen');
    const appContent = document.getElementById('app-content');
    
    if (isAuthenticated) {
        loginScreen.style.display = 'none';
        appContent.style.display = 'flex';
    } else {
        loginScreen.style.display = 'flex';
        appContent.style.display = 'none';
    }
}

document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const errorMsg = document.getElementById('login-error');

    // Credenciales Simples Hardcodeadas
    if (user === 'admin' && pass === '1234') {
        sessionStorage.setItem('edupay_auth', 'true');
        isAuthenticated = true;
        errorMsg.style.display = 'none';
        
        // Empujamos el estado "app" al historial del navegador
        history.pushState({ page: 'app', view: 'dashboard' }, 'App', '#app');
        
        verificarLogin();
        iniciarAplicacion();
    } else {
        errorMsg.style.display = 'block';
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('¿Estás seguro de que deseas cerrar la sesión?')) {
        sessionStorage.removeItem('edupay_auth');
        isAuthenticated = false;
        
        // Limpiamos los campos del login
        document.getElementById('form-login').reset();
        
        // Empujamos el estado "login" al historial del navegador
        history.pushState({ page: 'login' }, 'Login', '#login');
        
        // Volvemos a mostrar la pantalla de Login y ocultamos la App
        verificarLogin();
    }
});

// Manejar los botones "Atrás/Adelante" del navegador
window.addEventListener('popstate', (e) => {
    // Si la persona navega "atrás" en el navegador y cae en el estado del Login original
    if (!e.state || e.state.page === 'login') {
        if (isAuthenticated && confirm('¿Deseas cerrar sesión al salir?')) {
            document.getElementById('btn-logout').click();
        } else if (!isAuthenticated) {
            verificarLogin();
        } else {
            // Si el usuario canceló el cerrar sesión, devolverlo a la app
            history.pushState({ page: 'app' }, 'App', '#app');
        }
    } 
    // Si navega atras/adelante entre vistas de la APP
    else if (e.state.page === 'app' && e.state.view) {
        if (!isAuthenticated) return;
        
        const btn = document.querySelector(`.nav-btn[data-target="${e.state.view}"]`);
        if (btn) cambiarVistaInterna(btn);
    }
});

// =========================================
// NAVEGACIÓN (SPA)
// =========================================
function cambiarVistaInterna(btn) {
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('page-title');

    // Quitar clase active de todos
    navBtns.forEach(b => b.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));

    // Añadir clase active al pulsado
    const targetId = btn.getAttribute('data-target');
    btn.classList.add('active');
    document.getElementById(targetId).classList.add('active');

    // Actualizar Título Topbar
    pageTitle.innerText = btn.querySelector('span').innerText;
}

function configurarNavegacion() {
    const navBtns = document.querySelectorAll('.nav-btn');

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            cambiarVistaInterna(btn);
            
            // Empujamos este "click de pestaña" al historial del navegador
            const targetId = btn.getAttribute('data-target');
            history.pushState({ page: 'app', view: targetId }, '', `#${targetId}`);
        });
    });
}

// =========================================
// DASHBOARD
// =========================================
function actualizarDashboard() {
    // 1. Total Docentes
    document.getElementById('stat-total-docentes').innerText = docentes.length;
    
    // 2. Promedio por Hora
    let sumaTarifas = docentes.reduce((sum, d) => sum + parseFloat(d.tarifa), 0);
    let promedio = docentes.length ? (sumaTarifas / docentes.length) : 0;
    document.getElementById('stat-promedio-hora').innerText = `$${promedio.toFixed(2)}`;

    // 3. Total de Nóminas Generadas
    document.getElementById('stat-total-nominas').innerText = historialRecibos.length;

    // 4. Desembolso Total Histórico
    let desembolsoTotal = historialRecibos.reduce((sum, r) => sum + r.totalNeto, 0);
    document.getElementById('stat-desembolso-total').innerText = `$${desembolsoTotal.toFixed(2)}`;
}

// Guardar en "Base de Datos" (LocalStorage)
function guardarDatos() {
    localStorage.setItem('edupay_docentes', JSON.stringify(docentes));
    localStorage.setItem('edupay_historial', JSON.stringify(historialRecibos));
    actualizarDashboard();
    renderizarTabla();
    renderizarHistorial();
    llenarSelectNómina();
}

// =========================================
// CRUD DOCENTES Y BÚSQUEDA
// =========================================
function configurarBuscador() {
    const inputSearch = document.getElementById('buscar-docente');
    inputSearch.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        renderizarTabla(termino);
    });
}

const formDocente = document.getElementById('form-docente');

formDocente.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const matricula = document.getElementById('docente-matricula').value;
    const nombre = document.getElementById('docente-nombre').value;
    const depto = document.getElementById('docente-depto').value;
    const tarifa = parseFloat(document.getElementById('docente-tarifa').value);
    const estado = document.getElementById('docente-estado').value; // NUEVO

    if (editandoId) {
        // Actualizar
        const index = docentes.findIndex(d => d.id === editandoId);
        docentes[index] = { id: editandoId, matricula, nombre, depto, tarifa, estado };
    } else {
        // Crear
        const nuevoDocente = {
            id: Date.now().toString(),
            matricula,
            nombre,
            depto,
            tarifa,
            estado
        };
        docentes.push(nuevoDocente);
    }

    guardarDatos();
    cerrarModal();
});

function renderizarTabla(filtro = '') {
    const tbody = document.getElementById('tabla-docentes');
    const emptyState = document.getElementById('empty-docentes');
    const table = document.querySelector('#docentes .data-table');

    tbody.innerHTML = '';
    
    // Filtrar docentes si hay un texto de búsqueda
    const docentesFiltrados = docentes.filter(d => 
        d.nombre.toLowerCase().includes(filtro) || 
        d.matricula.toLowerCase().includes(filtro)
    );

    if (docentesFiltrados.length === 0) {
        emptyState.style.display = 'block';
        table.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    table.style.display = 'table';

    docentesFiltrados.forEach(docente => {
        const badgeClass = docente.estado === 'inactivo' ? 'badge-inactive' : 'badge-active';
        const badgeText = docente.estado === 'inactivo' ? 'INACTIVO' : 'ACTIVO';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${docente.matricula}</strong></td>
            <td>${docente.nombre}</td>
            <td>${docente.depto}</td>
            <td>$${parseFloat(docente.tarifa).toFixed(2)}</td>
            <td><span class="${badgeClass}" style="padding: 4px 10px; border-radius: 100px; font-size: 0.75rem; font-weight: 700;">${badgeText}</span></td>
            <td class="actions-cell">
                <button class="btn btn-primary btn-icon" onclick="abrirPerfilDocente('${docente.id}')" title="Ver Perfil">
                    <i class="fa-solid fa-user-tie"></i>
                </button>
                <button class="btn btn-secondary btn-icon" onclick="editarDocente('${docente.id}')" title="Editar">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-danger btn-icon" onclick="eliminarDocente('${docente.id}')" title="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarDocente(id) {
    const docente = docentes.find(d => d.id === id);
    if (!docente) return;

    editandoId = id;
    document.getElementById('modal-title').innerText = 'Editar Docente';
    document.getElementById('docente-matricula').value = docente.matricula;
    document.getElementById('docente-nombre').value = docente.nombre;
    document.getElementById('docente-depto').value = docente.depto;
    document.getElementById('docente-tarifa').value = docente.tarifa;
    document.getElementById('docente-estado').value = docente.estado || 'activo';

    abrirModal();
}

function eliminarDocente(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este docente?')) {
        docentes = docentes.filter(d => d.id !== id);
        guardarDatos();
    }
}

// =========================================
// NÓMINA - CÁLCULOS
// =========================================
function llenarSelectNómina() {
    const select = document.getElementById('select-docente');
    select.innerHTML = '<option value="">-- Elige un docente --</option>';
    
    // Solo permitir seleccionar docentes que estén ACTIVOS
    const docentesActivos = docentes.filter(d => d.estado !== 'inactivo');
    
    docentesActivos.forEach(docente => {
        const option = document.createElement('option');
        option.value = docente.id;
        option.innerText = `${docente.nombre} (${docente.matricula})`;
        select.appendChild(option);
    });
}

document.getElementById('form-nomina').addEventListener('submit', (e) => {
    e.preventDefault();

    const docenteId = document.getElementById('select-docente').value;
    const horas = parseFloat(document.getElementById('input-horas').value);
    const bono = parseFloat(document.getElementById('input-bono').value) || 0;
    const faltas = parseInt(document.getElementById('input-faltas').value) || 0;
    const retardos = parseInt(document.getElementById('input-retardos').value) || 0;
    const deduccionesPct = parseFloat(document.getElementById('input-deducciones').value) || 0;

    const docente = docentes.find(d => d.id === docenteId);
    if (!docente) return;

    // Matemáticas Refinadas
    const gananciaHoras = docente.tarifa * horas;
    const subtotalBruto = gananciaHoras + bono;
    
    // Calcular Penalizaciones (las variables COSTO están hasta arriba)
    const penalizacionFaltas = faltas * COSTO_FALTA;
    const penalizacionRetardos = retardos * COSTO_RETARDO;
    const totalPenalizaciones = penalizacionFaltas + penalizacionRetardos;
    
    // La deducción (Impuestos/Seguro) se calcula en base al subtotal bruto
    const deduccionSeguroISRMonto = subtotalBruto * (deduccionesPct / 100);
    
    // Total Neto Final
    let totalNeto = subtotalBruto - deduccionSeguroISRMonto - totalPenalizaciones;
    if (totalNeto < 0) totalNeto = 0; // Prevenir pagos negativos absurdos

    // Guardar en Historial
    const nuevoRecibo = {
        id: 'REC-' + Date.now().toString().slice(-6),
        docente: docente.nombre,
        docenteId: docente.id,
        fecha: new Date().toISOString(),
        horas,
        tarifa: docente.tarifa,
        bono,
        faltas,
        penalizacionFaltas,
        retardos,
        penalizacionRetardos,
        subtotalBruto,
        deduccionesPct,
        deduccionSeguroISRMonto,
        totalNeto
    };
    
    historialRecibos.unshift(nuevoRecibo); // Añade al inicio (los más nuevos primero)
    guardarDatos();

    generarReciboPantalla(nuevoRecibo, docente);
});

function generarReciboPantalla(recibo, docente) {
    document.getElementById('recibo-placeholder').style.display = 'none';
    const reciboContainer = document.getElementById('recibo-resultado');
    
    const fechaFormat = new Date(recibo.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    reciboContainer.innerHTML = `
        <div class="receipt-wrapper fade-in">
            <div class="receipt-header">
                <img src="logo.png" alt="Logo UTE" style="max-height: 60px; margin-bottom: 15px; border-radius: 4px;">
                <h2>Universidad Tecnológica General Mariano Escobedo</h2>
                <p style="color: #64748b; margin-top: 4px;">Sistema de Nóminas (UTE) - Folio: <b>${recibo.id}</b></p>
                <small>Fecha de Emisión: ${fechaFormat}</small>
            </div>
            
            <div class="receipt-row">
                <span><strong>Docente:</strong></span>
                <span>${docente.nombre}</span>
            </div>
            <div class="receipt-row">
                <span><strong>Número de Empleado:</strong></span>
                <span>${docente.matricula}</span>
            </div>
            <div class="receipt-row">
                <span><strong>Departamento:</strong></span>
                <span>${docente.depto}</span>
            </div>
            <hr style="margin: 15px 0; border: 1px dashed #cbd5e1;">
            
            <div class="receipt-row">
                <span>Tarifa por Hora:</span>
                <span>$${parseFloat(recibo.tarifa).toFixed(2)}</span>
            </div>
            <div class="receipt-row">
                <span>Horas Impartidas:</span>
                <span>${recibo.horas} h &nbsp;&nbsp; -> &nbsp;&nbsp; <b>$${(recibo.tarifa * recibo.horas).toFixed(2)}</b></span>
            </div>
            ${recibo.bono > 0 ? `
            <div class="receipt-row" style="color: var(--success);">
                <span>Bono Extra/Asistencia:</span>
                <span>+ $${recibo.bono.toFixed(2)}</span>
            </div>` : ''}
            
            <div class="receipt-row">
                <span><strong>Subtotal Bruto:</strong></span>
                <span><strong>$${recibo.subtotalBruto.toFixed(2)}</strong></span>
            </div>
            
            <hr style="margin: 15px 0; border: 1px dashed #cbd5e1;">
            
            <div class="receipt-row" style="color: var(--danger);">
                <span>Deducciones de Ley (${recibo.deduccionesPct}%):</span>
                <span>- $${recibo.deduccionSeguroISRMonto.toFixed(2)}</span>
            </div>
            ${recibo.faltas > 0 ? `
            <div class="receipt-row" style="color: var(--danger);">
                <span>Faltas Injustificadas (${recibo.faltas}):</span>
                <span>- $${recibo.penalizacionFaltas.toFixed(2)}</span>
            </div>` : ''}
            ${recibo.retardos > 0 ? `
            <div class="receipt-row" style="color: var(--danger);">
                <span>Retardos (${recibo.retardos}):</span>
                <span>- $${recibo.penalizacionRetardos.toFixed(2)}</span>
            </div>` : ''}
            
            <div class="receipt-row receipt-total">
                <span>TOTAL NETO A PAGAR:</span>
                <span>$${recibo.totalNeto.toFixed(2)}</span>
            </div>
            
            <div style="margin-top: 20px; text-align: center;" class="no-print">
                <button class="btn btn-primary" onclick="window.print()">
                    <i class="fa-solid fa-print"></i> Imprimir Recibo
                </button>
            </div>
        </div>
    `;
    reciboContainer.style.display = 'block';
}

// =========================================
// HISTORIAL (NUEVA VISTA) Y BUSCADOR
// =========================================
document.getElementById('buscar-historial').addEventListener('input', (e) => {
    renderizarHistorial(e.target.value);
});

function renderizarHistorial(filtro = '') {
    const tbody = document.getElementById('tabla-historial');
    const emptyState = document.getElementById('empty-historial');
    const table = document.querySelector('#historial .data-table');

    tbody.innerHTML = '';
    
    // Buscador general por folio, fecha o maestro
    const busqueda = filtro.toLowerCase();
    const filtrados = historialRecibos.filter(r => {
        const docenteNombre = r.docente.toLowerCase();
        const fechaTxt = new Date(r.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }).toLowerCase();
        
        return r.id.toLowerCase().includes(busqueda) || 
               docenteNombre.includes(busqueda) || 
               fechaTxt.includes(busqueda);
    });

    if (filtrados.length === 0) {
        emptyState.style.display = 'block';
        table.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    table.style.display = 'table';

    filtrados.forEach(recibo => {
        const fechaFormat = new Date(recibo.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${recibo.id}</strong></td>
            <td>${fechaFormat}</td>
            <td>${recibo.docente}</td>
            <td>${recibo.horas} hrs</td>
            <td style="color: var(--primary); font-weight: 700;">$${recibo.totalNeto.toFixed(2)}</td>
            <td class="actions-cell">
                <button class="btn btn-secondary btn-icon" onclick="reimprimirRecibo('${recibo.id}')" title="Ver Recibo">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button class="btn btn-danger btn-icon" onclick="eliminarRecibo('${recibo.id}', false)" title="Eliminar Recibo">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function reimprimirRecibo(reciboId) {
    const recibo = historialRecibos.find(r => r.id === reciboId);
    const docente = docentes.find(d => d.id === recibo.docenteId) || { nombre: recibo.docente, matricula: 'N/A', depto: 'N/A' };
    
    // Cambiar a la vista de nóminas
    document.querySelector('.nav-btn[data-target="nominas"]').click();
    
    // Generar el recibo en pantalla nuevamente
    generarReciboPantalla(recibo, docente);
}

function eliminarRecibo(reciboId, enPerfil) {
    if (confirm('¿Estás seguro de que deseas eliminar permanentemente este recibo? (Folio: ' + reciboId + ')')) {
        // Encontrar quién era el dueño antes de borrarlo si estamos en la vista perfil
        const recibo = historialRecibos.find(r => r.id === reciboId);
        
        historialRecibos = historialRecibos.filter(r => r.id !== reciboId);
        guardarDatos(); // Esto actualiza el localStorage y el historial general
        
        // Si estamos viendo el perfil, debemos re-calcular su historial también
        if (enPerfil && recibo) {
            abrirPerfilDocente(recibo.docenteId);
        }
    }
}

// =========================================
// PERFIL INDIVIDUAL DOCENTE (NUEVO)
// =========================================
function abrirPerfilDocente(docenteId) {
    const docente = docentes.find(d => d.id === docenteId);
    if (!docente) return;

    // Filtramos solo el historial que le pertenece a ESTE docente
    const historialPersonal = historialRecibos.filter(r => r.docenteId === docenteId);

    // Cálculos estadísticos
    const gananciaTotal = historialPersonal.reduce((sum, r) => sum + r.totalNeto, 0);
    const horasTotales = historialPersonal.reduce((sum, r) => sum + r.horas, 0);
    const ultimoPago = historialPersonal.length > 0 
        ? new Date(historialPersonal[0].fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) 
        : 'Sin pagos';

    // Llenar Tarjeta Cabecera
    document.getElementById('perfil-nombre').innerText = docente.nombre;
    document.getElementById('perfil-puesto').innerText = docente.depto;
    document.getElementById('perfil-matricula').innerText = docente.matricula;
    document.getElementById('perfil-tarifa').innerText = `$${parseFloat(docente.tarifa).toFixed(2)}`;
    
    // Estadísticas Extra (Nuevas)
    document.getElementById('perfil-ganancias').innerText = `$${gananciaTotal.toFixed(2)}`;
    document.getElementById('perfil-horas-totales').innerText = horasTotales;
    document.getElementById('perfil-ultimo-pago').innerText = ultimoPago;
    
    // Configurar Estado visual
    const badge = document.getElementById('perfil-estado-badge');
    if (docente.estado === 'inactivo') {
        badge.className = 'badge-inactive';
        badge.innerText = 'INACTIVO';
    } else {
        badge.className = 'badge-active';
        badge.innerText = 'ACTIVO';
    }

    // Llenar Tabla del Expediente
    const tbody = document.getElementById('tabla-perfil-recibos');
    const emptyState = document.getElementById('empty-perfil');
    const table = document.querySelector('#perfil-docente .data-table');

    tbody.innerHTML = '';

    if (historialPersonal.length === 0) {
        emptyState.style.display = 'block';
        table.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        table.style.display = 'table';

        historialPersonal.forEach(recibo => {
            const fechaFormat = new Date(recibo.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
            
            // Texto para mostrar resumen de lo impartido
            let resumen = `${recibo.horas}h ($${(recibo.horas * recibo.tarifa).toFixed(2)})`;
            if (recibo.bono > 0) resumen += ` + Bono ($${recibo.bono})`;
            
            // Texto para mostrar penalizaciones
            let penalizaciones = [];
            if (recibo.faltas > 0) penalizaciones.push(`${recibo.faltas} Faltas`);
            if (recibo.retardos > 0) penalizaciones.push(`${recibo.retardos} RT`);
            let pText = penalizaciones.length > 0 ? penalizaciones.join(', ') : 'Ninguna';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${recibo.id}</strong><br><small style="color:var(--text-muted)">${fechaFormat}</small></td>
                <td>${resumen}</td>
                <td style="${penalizaciones.length > 0 ? 'color: var(--danger); font-weight: 500;' : 'color: var(--text-muted);'}">${pText}</td>
                <td style="color: var(--primary); font-weight: 700;">$${recibo.totalNeto.toFixed(2)}</td>
                <td class="actions-cell">
                    <button class="btn btn-secondary btn-icon" onclick="reimprimirRecibo('${recibo.id}')" title="Ver Recibo Completo">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="btn btn-danger btn-icon" onclick="eliminarRecibo('${recibo.id}', true)" title="Eliminar Recibo del Historial">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Cambiar a la vista del Perfil internamente sin tocar los botones de barra lateral
    const views = document.querySelectorAll('.view');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('perfil-docente').classList.add('active');
    
    // Registrar el paso en el historial del navegador para que funcione el botón 'Atrás'
    history.pushState({ page: 'app', view: 'perfil-docente' }, 'Perfil Docente', '#perfil-docente');
}

// =========================================
// MODALES (UI)
// =========================================
const modal = document.getElementById('modal-docente');

document.getElementById('btn-nuevo-docente').addEventListener('click', () => {
    editandoId = null;
    document.getElementById('modal-title').innerText = 'Registrar Nuevo Docente';
    formDocente.reset();
    document.getElementById('docente-estado').value = 'activo';
    abrirModal();
});

document.getElementById('btn-close-modal').addEventListener('click', cerrarModal);
document.getElementById('btn-cancelar').addEventListener('click', cerrarModal);

function abrirModal() {
    modal.classList.add('active');
}

function cerrarModal() {
    modal.classList.remove('active');
}

// Ocultar modal al hacer clic en el fondo oscuro
modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
});
