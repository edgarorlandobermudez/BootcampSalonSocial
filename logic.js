// Espera a que todo el contenido del DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", function () {

  // Referencias a los elementos del DOM
  const formulario = document.getElementById("solicitudForm");
  const lista = document.getElementById("listaSolicitudes");
  const exportarBtn = document.getElementById("exportar");
  const importarInput = document.getElementById("importar");
  const indiceEdicionInput = document.getElementById("indiceEdicion");
  const toastSuccess = new bootstrap.Toast(document.getElementById("toastSuccess"));

  // Muestra un mensaje de error en pantalla
  function mostrarError(mensaje) {
    const errorDiv = document.getElementById("mensajeError");
    errorDiv.textContent = mensaje;
    errorDiv.classList.remove("d-none"); // lo muestra
    setTimeout(() => errorDiv.classList.add("d-none"), 5000); // lo oculta después de 5s
  }

  // Obtiene las solicitudes guardadas en localStorage
  function obtenerSolicitudes() {
    const datos = localStorage.getItem("solicitudes");
    return datos ? JSON.parse(datos) : [];
  }

  // Guarda las solicitudes en localStorage y también crea un backup del día
  function guardarSolicitudes(solicitudes) {
    localStorage.setItem("solicitudes", JSON.stringify(solicitudes));
    const hoy = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    localStorage.setItem(`solicitudes_backup_${hoy}`, JSON.stringify(solicitudes));
  }

  // Muestra todas las solicitudes en la sección "Solicitudes Registradas"
  function mostrarSolicitudes() {
    lista.innerHTML = "";
    const solicitudes = obtenerSolicitudes().filter(Boolean);

    solicitudes.forEach((sol, index) => {
      const div = document.createElement("div");
      div.className = "solicitud p-3 mb-3 border rounded shadow-sm";
      div.innerHTML = `
        <strong>${sol.nombre} ${sol.apellido}</strong> - Apto: ${sol.apartamento}<br>
        Desde: ${sol.fechaInicio} ${sol.horaInicio}<br>
        Hasta: ${sol.fechaFin} ${sol.horaFin}<br>
        Observación: ${sol.observacion}<br>
        <button class="eliminar btn btn-danger btn-sm mt-2" onclick="eliminarSolicitud(${index})">🗑️ Eliminar</button>
        <button class="editar btn btn-primary btn-sm mt-2" onclick="editarSolicitud(${index})">✏️ Editar</button>
      `;
      lista.appendChild(div);
    });

    document.getElementById("totalSolicitudes").textContent = solicitudes.length;
  }

  // Función global para eliminar una solicitud específica
  window.eliminarSolicitud = function (indice) {
    const solicitudes = obtenerSolicitudes().filter(Boolean);
    solicitudes.splice(indice, 1); // elimina la solicitud
    guardarSolicitudes(solicitudes);
    mostrarSolicitudes();
    renderizarCalendario();
  }

  // Función global para cargar una solicitud al formulario para editarla
  window.editarSolicitud = function (indice) {
    const solicitudes = obtenerSolicitudes().filter(Boolean);
    const sol = solicitudes[indice];

    // Llenar el formulario con los datos existentes
    document.getElementById("nombre").value = sol.nombre;
    document.getElementById("apellido").value = sol.apellido;
    document.getElementById("apartamento").value = sol.apartamento;
    document.getElementById("fechaInicio").value = sol.fechaInicio;
    document.getElementById("horaInicio").value = sol.horaInicio;
    document.getElementById("fechaFin").value = sol.fechaFin;
    document.getElementById("horaFin").value = sol.horaFin;
    document.getElementById("observacion").value = sol.observacion;
    indiceEdicionInput.value = indice;
  }

  // Manejo del formulario para crear o actualizar solicitudes
formulario.addEventListener("submit", function (e) {
  e.preventDefault();

  // Recolectar valores y formatearlos
  const nombre = document.getElementById("nombre").value.trim().toUpperCase();
  const apellido = document.getElementById("apellido").value.trim().toUpperCase();
  const apartamento = document.getElementById("apartamento").value.trim().toUpperCase();
  const fechaInicio = document.getElementById("fechaInicio").value.trim();
  const horaInicio = document.getElementById("horaInicio").value.trim();
  const fechaFin = document.getElementById("fechaFin").value.trim();
  const horaFin = document.getElementById("horaFin").value.trim();
  const observacion = document.getElementById("observacion").value.trim().toUpperCase();
  const indiceEdicion = indiceEdicionInput.value;

  if (!nombre || !apellido || !apartamento || !fechaInicio || !horaInicio || !fechaFin || !horaFin || !observacion) {
    mostrarError("Por favor, complete todos los campos.");
    return;
  }

  const inicio = new Date(`${fechaInicio}T${horaInicio}`);
  const fin = new Date(`${fechaFin}T${horaFin}`);
  const ahora = new Date();

  if (inicio.getTime() < ahora.getTime() + 3600000) {
    mostrarError("La hora de inicio debe ser al menos una hora en el futuro.");
    return;
  }

  if (fin <= inicio) {
    mostrarError("La fecha y hora de fin debe ser posterior a la de inicio.");
    return;
  }

  const solicitudes = obtenerSolicitudes().filter(Boolean);

  // Validar traslape de fechas y horas con otras solicitudes
  for (const existente of solicitudes) {
    const existenteInicio = new Date(`${existente.fechaInicio}T${existente.horaInicio}`);
    const existenteFin = new Date(`${existente.fechaFin}T${existente.horaFin}`);
    const seTraslapa = inicio < existenteFin && fin > existenteInicio;
    const esLaMisma = parseInt(indiceEdicion) === solicitudes.indexOf(existente);

    if (seTraslapa && !esLaMisma) {
      mostrarError("Ya existe una reserva en ese rango de fecha y hora.");
      return;
    }
  }

  const nuevaSolicitud = { nombre, apellido, apartamento, fechaInicio, horaInicio, fechaFin, horaFin, observacion };

  if (!isNaN(parseInt(indiceEdicion))) {
    solicitudes[parseInt(indiceEdicion)] = nuevaSolicitud;
    indiceEdicionInput.value = "";
  } else {
    solicitudes.push(nuevaSolicitud);
  }

  guardarSolicitudes(solicitudes);
  formulario.reset();
  mostrarSolicitudes();
  renderizarCalendario();
});

  // Exporta las solicitudes a un archivo JSON
  exportarBtn.addEventListener("click", function () {
    const solicitudes = obtenerSolicitudes().filter(Boolean);
    const blob = new Blob([JSON.stringify(solicitudes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "solicitudes.json";
    a.click();

    URL.revokeObjectURL(url); // limpia el blob de la memoria
  });

  // Importar solicitudes desde un archivo JSON
  importarInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        try {
          const solicitudes = JSON.parse(event.target.result);
          guardarSolicitudes(solicitudes);
          mostrarSolicitudes();
          renderizarCalendario();
          toastSuccess.show(); // muestra mensaje "importado correctamente"
        } catch (error) {
          mostrarError("Error al leer el archivo. Asegúrese de que sea un JSON válido.");
        }
      };
      reader.readAsText(file);
    }
  });

  // Dibuja el calendario con los eventos cargados
  function renderizarCalendario() {
    const solicitudes = obtenerSolicitudes();
    const eventos = solicitudes.map(sol => ({
      title: `👤 ${sol.nombre} ${sol.apellido}\n🏢 ${sol.apartamento}\n🕒 ${sol.horaInicio} - ${sol.horaFin}\n📌 ${sol.observacion}`,
      start: `${sol.fechaInicio}T${sol.horaInicio}`,
      end: `${sol.fechaFin}T${sol.horaFin}`,
      backgroundColor: '#ff6b6b',
      borderColor: '#ff4757',
      textColor: '#ffffff'
    }));

    const calendarEl = document.getElementById('calendar');
    calendarEl.innerHTML = ""; // limpia el contenedor

    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      events: eventos,
      eventDisplay: 'block',
      eventContent: function (arg) {
        const lines = arg.event.title.split('\n');
        const customHtml = lines.map(line => `<div>${line}</div>`).join('');
        return { html: customHtml };
      },
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: ''
      },
      height: 'auto'
    });

    calendar.render();
  }

  // Inicializar la vista al cargar
  renderizarCalendario();
  mostrarSolicitudes();
});
