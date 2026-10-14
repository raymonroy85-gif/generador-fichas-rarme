let config = null;
let fichasGeneradas = [];

const fileConfig = document.getElementById('fileConfig');
const configName = document.getElementById('configName');

fileConfig.addEventListener('change', leerConfiguracion);

function leerConfiguracion(evento) {
  const archivo = evento.target.files[0];
  if (!archivo) return;
  procesarArchivo(archivo);
}

function procesarArchivo(archivo) {
  const lector = new FileReader();

  lector.onload = function (e) {
    try {
      config = JSON.parse(e.target.result);

      cargarEmpresa();
      cargarPerfiles();
      cargarVersion();

      configName.textContent = archivo.name;
      configName.style.color = '#16a34a';

      console.log('Configuración cargada correctamente');
    } catch (error) {
      console.error(error);
      alert('JSON inválido');
    }
  };

  lector.readAsText(archivo);
}

function cargarEmpresa() {
  if (!config) return;

  document.getElementById('txtEmpresa').value = config.empresa.nombre || '';
  document.getElementById('txtWhatsapp').value = config.empresa.whatsapp || '';
  document.getElementById('txtPortal').value = config.empresa.portal || '';
  document.getElementById('txtNombreRed').value = config.empresa.nombreRed || '';
  document.getElementById('txtLongitud').value = config.configuracion.credenciales.longitud || 4;
  document.getElementById('chkUsuarioPassword').checked = config.configuracion.credenciales.usuarioIgualPassword;
}

function cargarPerfiles() {
  if (!config) return;

  const combo = document.getElementById('cmbPerfil');
  combo.innerHTML = '';

  config.catalogos.perfilesVenta.forEach(perfil => {
    if (!perfil.activo) return;

    const opcion = document.createElement('option');
    opcion.value = perfil.codigo;
    opcion.textContent = `${perfil.nombre} - ${perfil.moneda} ${perfil.precio}`;
    combo.appendChild(opcion);
  });
}

function cargarVersion() {
  if (!config) return;

  document.getElementById('lblVersion').textContent =
    `${config.metadata.producto} v${config.metadata.version}`;
  document.getElementById('tituloProducto').textContent =
    config.metadata.producto;
}

document.getElementById('btnGenerar').addEventListener('click', generarFichas);

function generarFichas() {
  fichasGeneradas = [];

  const cantidad = parseInt(document.getElementById('txtCantidad').value);
  const longitud = parseInt(document.getElementById('txtLongitud').value);
  const perfil = document.getElementById('cmbPerfil').value;
  const usuarioPasswordIgual = document.getElementById('chkUsuarioPassword').checked;

  for (let i = 0; i < cantidad; i++) {
    const usuario = generarPin(longitud);
    const password = usuarioPasswordIgual ? usuario : generarPin(longitud);

    fichasGeneradas.push({
      usuario,
      password,
      perfil,
      qrUrl: config.empresa.portal + '?username=' + usuario + '&password=' + password
    });
  }

  mostrarPreview();
}

function generarPin(longitud) {
  let pin = '';
  for (let i = 0; i < longitud; i++) {
    pin += Math.floor(Math.random() * 10);
  }
  return pin;
}

function mostrarPreview() {
  const preview = document.getElementById('preview');

  preview.style.display = 'flex';
  preview.style.flexWrap = 'wrap';
  preview.style.justifyContent = 'center';
  preview.style.gap = '10px';

  let html = '';

  fichasGeneradas.forEach(ficha => {
    const color = obtenerColorPerfil(ficha.perfil);

    html += `
      <div class="ticket" data-perfil="${ficha.perfil}">
        <div class="ticket-header" style="background:${color}">
          <span class="ticket-wifi">📶</span>
          <span class="ticket-perfil">${obtenerNombrePerfil(ficha.perfil)}</span>
        </div>
        <div class="ticket-body">
          <div class="ticket-price">${obtenerPrecioPerfil(ficha.perfil)}</div>
          <div class="ticket-empresa">${config.empresa.nombre}</div>
          <div class="ticket-label">PIN</div>
          <div class="ticket-pin">${ficha.usuario}</div>
          <div class="ticket-red">
            <span>Red:</span>
            <strong>${config.empresa.nombreRed}</strong>
          </div>
        </div>
        <div class="ticket-footer" style="background:${color}">
          ¡Disfruta tu conexión!
        </div>
      </div>
    `;
  });

  preview.innerHTML = html;
}

function obtenerColorPerfil(codigo) {
  const perfil = config.catalogos.perfilesVenta.find(p => p.codigo === codigo);
  return perfil ? perfil.color : '#2563eb';
}

document.getElementById('btnScript').addEventListener('click', generarScriptMikrotik);

function obtenerNombrePerfil(codigo) {
  const perfil = config.catalogos.perfilesVenta.find(p => p.codigo === codigo);
  return perfil ? perfil.nombre : codigo;
}

function obtenerPrecioPerfil(codigo) {
  const perfil = config.catalogos.perfilesVenta.find(p => p.codigo === codigo);
  return perfil ? perfil.precio : 0;
}

function generarScriptMikrotik() {
  let script = '';

  fichasGeneradas.forEach(ficha => {
    script += `/ip hotspot user add name=${ficha.usuario} password=${ficha.password} profile=${ficha.perfil}\n\n`;
  });

  document.getElementById('txtScript').value = script;
}

document.getElementById('btnCopiarScript').addEventListener('click', copiarScript);

document.getElementById('btnPdf').addEventListener('click', generarPDF);

function copiarScript() {
  const textarea = document.getElementById('txtScript');

  if (!textarea.value) {
    alert('Primero genera el script.');
    return;
  }

  textarea.select();
  textarea.setSelectionRange(0, 999999);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textarea.value)
      .then(() => mostrarCopiado())
      .catch(() => fallbackCopiar(textarea));
  } else {
    fallbackCopiar(textarea);
  }
}

function fallbackCopiar(textarea) {
  try {
    document.execCommand('copy');
    mostrarCopiado();
  } catch (err) {
    alert('No se pudo copiar el script.');
  }
}

function mostrarCopiado() {
  const boton = document.getElementById('btnCopiarScript');
  const textoOriginal = boton.textContent;

  boton.textContent = '✅ Copiado';
  boton.classList.add('copied');

  setTimeout(() => {
    boton.textContent = textoOriginal;
    boton.classList.remove('copied');
  }, 2000);
}

async function generarPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');

  const tickets = document.querySelectorAll('#preview > div');
  const ticketsPorPagina = 30;

  for (let inicio = 0; inicio < tickets.length; inicio += ticketsPorPagina) {
    if (inicio > 0) {
      pdf.addPage();
    }

    const contenedor = document.createElement('div');
    contenedor.style.width = '794px';
    contenedor.style.height = '1123px';
    contenedor.style.display = 'grid';
    contenedor.style.gridTemplateColumns = 'repeat(5, 150px)';
    contenedor.style.gridTemplateRows = 'repeat(6, 170px)';
    contenedor.style.justifyContent = 'space-evenly';
    contenedor.style.alignContent = 'space-evenly';
    contenedor.style.background = '#fff';
    contenedor.style.padding = '10px';
    contenedor.style.boxSizing = 'border-box';

    for (let i = inicio; i < Math.min(inicio + ticketsPorPagina, tickets.length); i++) {
      const ticketOriginal = tickets[i];
      const color = ticketOriginal.querySelector('.ticket-header').style.background;
      const perfilNombre = ticketOriginal.querySelector('.ticket-perfil').textContent;
      const precioRaw = ticketOriginal.querySelector('.ticket-price').textContent;
      const precio = precioRaw.indexOf('$') === -1 ? '$' + precioRaw : precioRaw;
      const empresa = ticketOriginal.querySelector('.ticket-empresa').textContent;
      const pin = ticketOriginal.querySelector('.ticket-pin').textContent;
      const red = ticketOriginal.querySelector('.ticket-red strong').textContent;

      const ticket = document.createElement('div');
      ticket.style.width = '150px';
      ticket.style.height = '170px';
      ticket.style.background = '#fff';
      ticket.style.border = '1px dashed #94a3b8';
      ticket.style.borderRadius = '8px';
      ticket.style.textAlign = 'center';
      ticket.style.fontFamily = '"Segoe UI", Arial, sans-serif';
      ticket.style.overflow = 'hidden';
      ticket.style.display = 'flex';
      ticket.style.flexDirection = 'column';
      ticket.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;gap:3px;padding:6px 4px;color:#fff;font-weight:700;font-size:0.7rem;background:${color};line-height:1">
          <span style="font-size:0.8rem">📶</span>
          <span>${perfilNombre}</span>
        </div>
        <div style="flex:1;padding:8px 5px 6px 5px;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-size:1.3rem;font-weight:800;color:#1e293b;line-height:1;margin-bottom:3px">${precio}</div>
          <div style="font-size:0.62rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:5px;line-height:1.1">${empresa}</div>
          <div style="font-size:0.58rem;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px">PIN</div>
          <div style="font-size:1.7rem;font-weight:900;letter-spacing:2px;color:#1e293b;line-height:1;margin-bottom:6px">${pin}</div>
          <div style="display:inline-flex;align-items:center;justify-content:center;gap:2px;font-size:0.65rem;color:#475569;background:#f1f5f9;padding:3px 8px;border-radius:12px;border:1px solid #e2e8f0;max-width:95%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            <span>Red:</span>
            <strong style="color:#1e293b">${red}</strong>
          </div>
        </div>
      `;

      contenedor.appendChild(ticket);
    }

    document.body.appendChild(contenedor);

    const canvas = await html2canvas(contenedor, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);

    document.body.removeChild(contenedor);
  }

  pdf.save('fichas-rarme.pdf');
}
