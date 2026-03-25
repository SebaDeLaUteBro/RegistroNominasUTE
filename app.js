const COSTO_FALTA = 150.00;
const COSTO_RETARDO = 50.00;
let docentes = JSON.parse(localStorage.getItem('edupay_docentes')) || [];
let historialRecibos = JSON.parse(localStorage.getItem('edupay_historial')) || [];
let editandoId = null;
let isAuthenticated = sessionStorage.getItem('edupay_auth') === 'true';
document.addEventListener('DOMContentLoaded', () => {
    verificarLogin();
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
    if (user === 'admin' && pass === '1234') {
        sessionStorage.setItem('edupay_auth', 'true');
        isAuthenticated = true;
        errorMsg.style.display = 'none';
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
        document.getElementById('form-login').reset();
        history.pushState({ page: 'login' }, 'Login', '#login');
        verificarLogin();
    }
});
window.addEventListener('popstate', (e) => {
    if (!e.state || e.state.page === 'login') {
        if (isAuthenticated && confirm('¿Deseas cerrar sesión al salir?')) {
            document.getElementById('btn-logout').click();
        } else if (!isAuthenticated) {
            verificarLogin();
        } else {
            history.pushState({ page: 'app' }, 'App', '#app');
        }
    }
    else if (e.state.page === 'app' && e.state.view) {
        if (!isAuthenticated) return;
        const btn = document.querySelector(`.nav-btn[data-target="${e.state.view}"]`);
        if (btn) cambiarVistaInterna(btn);
    }
});
function cambiarVistaInterna(btn) {
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('page-title');
    navBtns.forEach(b => b.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));
    const targetId = btn.getAttribute('data-target');
    btn.classList.add('active');
    document.getElementById(targetId).classList.add('active');
    pageTitle.innerText = btn.querySelector('span').innerText;

    // Limpiar formulario y recibo generado al cambiar de vista
    const formNomina = document.getElementById('form-nomina');
    if (formNomina) formNomina.reset();
    const placeholder = document.getElementById('recibo-placeholder');
    const resultado = document.getElementById('recibo-resultado');
    if (placeholder) placeholder.style.display = 'block';
    if (resultado) resultado.style.display = 'none';
}
function configurarNavegacion() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            cambiarVistaInterna(btn);
            const targetId = btn.getAttribute('data-target');
            history.pushState({ page: 'app', view: targetId }, '', `#${targetId}`);
        });
    });
}
function actualizarDashboard() {
    document.getElementById('stat-total-docentes').innerText = docentes.length;
    let sumaTarifas = docentes.reduce((sum, d) => sum + parseFloat(d.tarifa), 0);
    let promedio = docentes.length ? (sumaTarifas / docentes.length) : 0;
    document.getElementById('stat-promedio-hora').innerText = `$${promedio.toFixed(2)}`;
    document.getElementById('stat-total-nominas').innerText = historialRecibos.length;
    let desembolsoTotal = historialRecibos.reduce((sum, r) => sum + r.totalNeto, 0);
    document.getElementById('stat-desembolso-total').innerText = `$${desembolsoTotal.toFixed(2)}`;
}
function guardarDatos() {
    localStorage.setItem('edupay_docentes', JSON.stringify(docentes));
    localStorage.setItem('edupay_historial', JSON.stringify(historialRecibos));
    actualizarDashboard();
    renderizarTabla();
    renderizarHistorial();
    llenarSelectNómina();
}
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
    const estado = document.getElementById('docente-estado').value;
    if (editandoId) {
        const index = docentes.findIndex(d => d.id === editandoId);
        docentes[index] = { id: editandoId, matricula, nombre, depto, tarifa, estado };
    } else {
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
function llenarSelectNómina() {
    const select = document.getElementById('select-docente');
    select.innerHTML = '<option value="">-- Elige un docente --</option>';
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
    const gananciaHoras = docente.tarifa * horas;
    const subtotalBruto = gananciaHoras + bono;
    const penalizacionFaltas = faltas * COSTO_FALTA;
    const penalizacionRetardos = retardos * COSTO_RETARDO;
    const totalPenalizaciones = penalizacionFaltas + penalizacionRetardos;
    const deduccionSeguroISRMonto = subtotalBruto * (deduccionesPct / 100);
    let totalNeto = subtotalBruto - deduccionSeguroISRMonto - totalPenalizaciones;
    if (totalNeto < 0) totalNeto = 0;
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
    historialRecibos.unshift(nuevoRecibo);
    guardarDatos();
    generarReciboPantalla(nuevoRecibo, docente);
});
function obtenerHTMLRecibo(recibo, docente) {
    const fechaFormat = new Date(recibo.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    return `
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
                <span><strong>Carrera / Materia:</strong></span>
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
}

function generarReciboPantalla(recibo, docente) {
    document.getElementById('recibo-placeholder').style.display = 'none';
    const reciboContainer = document.getElementById('recibo-resultado');
    reciboContainer.innerHTML = obtenerHTMLRecibo(recibo, docente);
    reciboContainer.style.display = 'block';
}

function verReciboModal(recibo, docente) {
    const modalRecibo = document.getElementById('modal-ver-recibo');
    const contenido = document.getElementById('recibo-modal-contenido');
    contenido.innerHTML = obtenerHTMLRecibo(recibo, docente);
    modalRecibo.classList.add('active');
}
document.getElementById('buscar-historial').addEventListener('input', (e) => {
    renderizarHistorial(e.target.value);
});
function renderizarHistorial(filtro = '') {
    const tbody = document.getElementById('tabla-historial');
    const emptyState = document.getElementById('empty-historial');
    const table = document.querySelector('#historial .data-table');
    tbody.innerHTML = '';
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
    verReciboModal(recibo, docente);
}
function eliminarRecibo(reciboId, enPerfil) {
    if (confirm('¿Estás seguro de que deseas eliminar permanentemente este recibo? (Folio: ' + reciboId + ')')) {
        const recibo = historialRecibos.find(r => r.id === reciboId);
        historialRecibos = historialRecibos.filter(r => r.id !== reciboId);
        guardarDatos();
        if (enPerfil && recibo) {
            abrirPerfilDocente(recibo.docenteId);
        }
    }
}
function abrirPerfilDocente(docenteId) {
    const docente = docentes.find(d => d.id === docenteId);
    if (!docente) return;
    const historialPersonal = historialRecibos.filter(r => r.docenteId === docenteId);
    const gananciaTotal = historialPersonal.reduce((sum, r) => sum + r.totalNeto, 0);
    const horasTotales = historialPersonal.reduce((sum, r) => sum + r.horas, 0);
    const ultimoPago = historialPersonal.length > 0
        ? new Date(historialPersonal[0].fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Sin pagos';
    document.getElementById('perfil-nombre').innerText = docente.nombre;
    document.getElementById('perfil-puesto').innerText = docente.depto;
    document.getElementById('perfil-matricula').innerText = docente.matricula;
    document.getElementById('perfil-tarifa').innerText = `$${parseFloat(docente.tarifa).toFixed(2)}`;
    document.getElementById('perfil-ganancias').innerText = `$${gananciaTotal.toFixed(2)}`;
    document.getElementById('perfil-horas-totales').innerText = horasTotales;
    document.getElementById('perfil-ultimo-pago').innerText = ultimoPago;
    const badge = document.getElementById('perfil-estado-badge');
    if (docente.estado === 'inactivo') {
        badge.className = 'badge-inactive';
        badge.innerText = 'INACTIVO';
    } else {
        badge.className = 'badge-active';
        badge.innerText = 'ACTIVO';
    }
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
            let resumen = `${recibo.horas}h ($${(recibo.horas * recibo.tarifa).toFixed(2)})`;
            if (recibo.bono > 0) resumen += ` + Bono ($${recibo.bono})`;
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
    const views = document.querySelectorAll('.view');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('perfil-docente').classList.add('active');
    history.pushState({ page: 'app', view: 'perfil-docente' }, 'Perfil Docente', '#perfil-docente');
}
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
modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
});

const modalVerRecibo = document.getElementById('modal-ver-recibo');
if (document.getElementById('btn-close-recibo')) {
    document.getElementById('btn-close-recibo').addEventListener('click', () => {
        modalVerRecibo.classList.remove('active');
    });
}
if (modalVerRecibo) {
    modalVerRecibo.addEventListener('click', (e) => {
        if (e.target === modalVerRecibo) modalVerRecibo.classList.remove('active');
    });
}
