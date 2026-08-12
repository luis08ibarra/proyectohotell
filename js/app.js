// ==============================
// 1. CONFIGURACIÓN DE LA API
// ==============================
const HOTELBEDS_CONFIG = {
    apiKey: "a4466aec5bdc52defff3c1459bd23cb5",
    secret: "HHkjXoHrj3",
    endpoint: "https://api.test.hotelbeds.com/hotel-api/1.0"
};

/**
 * Genera el hash SHA-256 en formato Hexadecimal usando CryptoJS
 */
function generarXSignature(apiKey, secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    return CryptoJS.SHA256(
        apiKey + secret + timestamp
    ).toString(CryptoJS.enc.Hex);
}

/**
 * Consulta de disponibilidad con manejo de fallos y formateo de fechas
 */
async function consultarDisponibilidadHotelbeds(checkIn, checkOut) {
    try {
        const signature = generarXSignature(
            HOTELBEDS_CONFIG.apiKey,
            HOTELBEDS_CONFIG.secret
        );

        // Formatear la fecha a YYYY-MM-DD
        const formattedCheckIn = checkIn.includes('/') ? checkIn.split('/').reverse().join('-') : checkIn;
        const formattedCheckOut = checkOut.includes('/') ? checkOut.split('/').reverse().join('-') : checkOut;

        const payload = {
            stay: {
                checkIn: formattedCheckIn,
                checkOut: formattedCheckOut
            },
            occupancies: [
                {
                    rooms: 1,
                    adults: 2,
                    children: 0
                }
            ],
            hotels: {
                hotel: [1067, 1070]
            }
        };

        const targetUrl = `${HOTELBEDS_CONFIG.endpoint}/hotels`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Api-key': HOTELBEDS_CONFIG.apiKey,
                'X-Signature': signature
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            return await response.json();
        }

        console.warn(`Respuesta de API no exitosa Status: ${response.status}. Cargando datos de respaldo.`);
    } catch (error) {
        console.warn("Fallo de red o CORS en API. Cargando datos de prueba locales:", error);
    }

    // Datos simulados (Fallback UI) para garantizar que la vista responda siempre
    return {
        hotels: {
            hotels: [
                {
                    code: 1067,
                    name: "Junior Suite Familiar",
                    categoryName: "Suite",
                    minRate: "$380,000",
                    currency: "COP"
                },
                {
                    code: 1070,
                    name: "Deluxe Ocean View",
                    categoryName: "Deluxe",
                    minRate: "$250,000",
                    currency: "COP"
                }
            ]
        }
    };
}


// ==============================
// 2. INICIALIZACIÓN DE LA APP
// ==============================
document.addEventListener("DOMContentLoaded", () => {

    // ==========================
    // MODO OSCURO / CLARO
    // ==========================
    const btnDark = document.getElementById("btnToggleDark");
    const html = document.documentElement;

    function aplicarTema(tema) {
        html.setAttribute("data-bs-theme", tema);
        localStorage.setItem("theme", tema);

        if (btnDark) {
            btnDark.textContent =
                tema === "dark"
                    ? "☀️ Modo Light"
                    : "🌙 Modo Dark";
        }
    }

    const temaGuardado = localStorage.getItem("theme");

    aplicarTema(
        temaGuardado ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light")
    );

    btnDark?.addEventListener("click", () => {
        const temaActual = html.getAttribute("data-bs-theme");
        aplicarTema(temaActual === "dark" ? "light" : "dark");
    });


    // ==========================
    // RESERVAS LOCALES
    // ==========================
    let reservas = JSON.parse(localStorage.getItem("reservas")) || [];


    // ==========================
    // HABITACIONES DUMMY
    // ==========================
    const habitaciones = [
        {
            id: 1,
            nombre: "Habitación Standard Simple",
            tipo: "Sencilla",
            precio: "$120,000 COP",
            img: "images/hab1.avif"
        },
        {
            id: 2,
            nombre: "Habitación Standard Doble",
            tipo: "Sencilla",
            precio: "$160,000 COP",
            img: "images/hab2.1.webp"
        },
        {
            id: 3,
            nombre: "Deluxe Ocean View",
            tipo: "Deluxe",
            precio: "$250,000 COP",
            img: "images/hab2.jpg"
        },
        {
            id: 4,
            nombre: "Deluxe con Balcón y Jacuzzi",
            tipo: "Deluxe",
            precio: "$320,000 COP",
            img: "images/jaz.jpg"
        },
        {
            id: 5,
            nombre: "Junior Suite Familiar",
            tipo: "Suite",
            precio: "$380,000 COP",
            img: "images/hab0.jpg"
        },
        {
            id: 6,
            nombre: "Presidential Suite VIP",
            tipo: "Suite",
            precio: "$500,000 COP",
            img: "images/hab3.webp"
        }
    ];


    // ==========================
    // RENDER HABITACIONES
    // ==========================
    const container = document.getElementById("habitacionesContainer");

    if (container) {
        const search = document.getElementById("searchInput");
        const filter = document.getElementById("filterSelect");
        const order = document.getElementById("orderSelect");
        const reset = document.getElementById("btnResetFilters");

        // Detecta si la página actual está dentro de /pages/
        const esSubcarpeta = window.location.pathname.includes("/pages/");

        let pagina = 1;
        const porPagina = 3;

        function renderHabitaciones() {
            let lista = habitaciones.filter(h => {
                const texto = search?.value.toLowerCase() || "";
                const categoria = filter?.value || "todos";

                return (
                    h.nombre.toLowerCase().includes(texto) &&
                    (categoria === "todos" || h.tipo === categoria)
                );
            });

            if (order?.value === "precio-asc") {
                lista.sort((a, b) =>
                    parseInt(a.precio.replace(/\D/g, "")) -
                    parseInt(b.precio.replace(/\D/g, ""))
                );
            }

            if (order?.value === "precio-desc") {
                lista.sort((a, b) =>
                    parseInt(b.precio.replace(/\D/g, "")) -
                    parseInt(a.precio.replace(/\D/g, ""))
                );
            }

            const total = Math.ceil(lista.length / porPagina);
            if (pagina > total && total > 0) pagina = total;

            const inicio = (pagina - 1) * porPagina;

            container.innerHTML = lista
                .slice(inicio, inicio + porPagina)
                .map(h => {
                    // Ajuste dinámico de la ruta para que cargue desde la raíz o desde /pages/
                    const rutaImagen = esSubcarpeta ? `../${h.img}` : `./${h.img}`;
                    const rutaReserva = esSubcarpeta ? "reservas.html" : "pages/reservas.html";

                    return `
                        <div class="col-md-4 mb-4">
                            <div class="card h-100 shadow-sm border-0">
                                <img src="${rutaImagen}" class="card-img-top" alt="${h.nombre}">
                                <div class="card-body d-flex flex-column">
                                    <h5 class="fw-bold">${h.nombre}</h5>
                                    <p>Categoría: <span class="badge bg-info text-dark">${h.tipo}</span></p>
                                    <p class="text-primary fw-bold fs-5">${h.precio}</p>
                                    <a href="${rutaReserva}" class="btn btn-primary mt-auto">Reservar</a>
                                </div>
                            </div>
                        </div>
                    `;
                }).join("");

            renderPaginacion(total);
        }

        function renderPaginacion(total) {
            const nav = document.getElementById("paginacionNav");

            if (!nav || total <= 1) {
                if (nav) nav.innerHTML = "";
                return;
            }

            nav.innerHTML = `
                <button class="btn btn-outline-primary me-2"
                        onclick="cambiarPagina(${pagina - 1})"
                        ${pagina === 1 ? "disabled" : ""}>
                    Anterior
                </button>
                <span class="btn btn-primary">${pagina} / ${total}</span>
                <button class="btn btn-outline-primary ms-2"
                        onclick="cambiarPagina(${pagina + 1})"
                        ${pagina === total ? "disabled" : ""}>
                    Siguiente
                </button>
            `;
        }

        window.cambiarPagina = n => {
            pagina = n;
            renderHabitaciones();
        };

        search?.addEventListener("input", () => {
            pagina = 1;
            renderHabitaciones();
        });

        filter?.addEventListener("change", () => {
            pagina = 1;
            renderHabitaciones();
        });

        order?.addEventListener("change", () => {
            pagina = 1;
            renderHabitaciones();
        });

        reset?.addEventListener("click", () => {
            if (search) search.value = "";
            if (filter) filter.value = "todos";
            if (order) order.value = "defecto";
            pagina = 1;
            renderHabitaciones();
        });

        renderHabitaciones();
    }


    // ==========================
    // CREAR RESERVA
    // ==========================
    const form = document.getElementById("reservaForm");

    if (form) {
        form.addEventListener("submit", e => {
            e.preventDefault();

            if (!form.checkValidity()) {
                form.classList.add("was-validated");
                return;
            }

            reservas.push({
                id: Date.now(),
                nombre: document.getElementById("nombre").value,
                email: document.getElementById("email").value,
                telefono: document.getElementById("telefono")?.value || "",
                tipoHabitacion: document.getElementById("tipoHabitacion").value,
                fecha: document.getElementById("fecha").value,
                salida: document.getElementById("salida")?.value || "",
                huespedes: document.getElementById("huespedes")?.value || ""
            });

            localStorage.setItem("reservas", JSON.stringify(reservas));
            alert("¡Reserva confirmada!");
            
            const esSubcarpeta = window.location.pathname.includes("/pages/");
            window.location.href = esSubcarpeta ? "administracion.html" : "pages/administracion.html";
        });
    }


    // ==========================
    // TABLA DE RESERVAS
    // ==========================
    const tabla = document.getElementById("tablaReservas");

    if (tabla) {
        function renderTabla() {
            if (!reservas.length) {
                tabla.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center text-muted py-4">
                            No hay reservas registradas.
                        </td>
                    </tr>
                `;
                return;
            }

            tabla.innerHTML = reservas.map(r => `
                <tr>
                    <td>${r.id}</td>
                    <td class="fw-bold">${r.nombre}</td>
                    <td>${r.email}</td>
                    <td>${r.telefono || "N/A"}</td>
                    <td>${r.tipoHabitacion}</td>
                    <td>${r.fecha}</td>
                    <td>${r.salida || "N/A"}</td>
                    <td>${r.huespedes || "N/A"}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="eliminarReserva(${r.id})">
                            Eliminar
                        </button>
                    </td>
                </tr>
            `).join("");
        }

        window.eliminarReserva = id => {
            if (!confirm("¿Desea eliminar esta reserva?")) return;

            reservas = reservas.filter(r => r.id !== id);
            localStorage.setItem("reservas", JSON.stringify(reservas));
            renderTabla();
        };

        renderTabla();
    }


    // ==========================
    // CLIMA
    // ==========================
    const apiCard = document.getElementById("apiCard");

    if (apiCard) {
        fetch(
            "https://api.open-meteo.com/v1/forecast?latitude=10.9685&longitude=-74.7813&current_weather=true"
        )
        .then(res => res.json())
        .then(data => {
            const clima = data.current_weather;
            apiCard.innerHTML = `
                <h4 class="fw-bold">Barranquilla / Malambo</h4>
                <p class="display-3 text-warning fw-bold">${clima.temperature} °C</p>
                <p>Viento: <strong>${clima.windspeed} km/h</strong></p>
            `;
        })
        .catch(() => {
            apiCard.innerHTML = `<p class="text-danger">Error al cargar el clima.</p>`;
        });
    }

});