// =====================================================
// VARIABLES GLOBALES
// =====================================================
let carrito = [];
let productosActuales = [];
let productosPorId = {};
let mapaCategorias = {};

// =====================================================
// INICIALIZACIÓN
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    cargarCarritoGuardado();
    cargarModalCarrito();
    cargarProductos();
});

// =====================================================
// CARGAR PRODUCTOS Y CATEGORÍAS DESDE SUPABASE
// =====================================================
async function cargarProductos() {
    try {
        const [
            { data: productos, error: errorProductos },
            { data: categorias, error: errorCategorias }
        ] = await Promise.all([
            supabaseClient
                .from("productos")
                .select(`
                    id_producto,
                    id_categoria,
                    nombre,
                    precio,
                    activo,
                    imagen
                `)
                .order("id_producto", { ascending: true }),

            supabaseClient
                .from("categorias")
                .select(`
                    id_categoria,
                    nombre
                `)
                .order("id_categoria", { ascending: true })
        ]);

        if (errorProductos) throw errorProductos;
        if (errorCategorias) throw errorCategorias;

        productosActuales = productos || [];

        mapaCategorias = {};
        productosPorId = {};

        (categorias || []).forEach(categoria => {
            mapaCategorias[categoria.id_categoria] = categoria.nombre;
        });

        productosActuales.forEach(producto => {
            productosPorId[producto.id_producto] = producto;
        });

        validarCarritoConProductos();
        cargarProductosEnDOM();
        configurarBuscador();

    } catch (error) {
        console.error("Error al cargar los productos:", error);

        document.querySelectorAll(".productos-container").forEach(contenedor => {
            contenedor.innerHTML = `
                <div class="col-12 text-center py-4">
                    <p class="text-danger mb-0">
                        No se pudieron cargar los productos.
                    </p>
                </div>
            `;
        });
    }
}

// =====================================================
// CARGAR PRODUCTOS EN EL DOM
// =====================================================
function cargarProductosEnDOM() {
    document.querySelectorAll(".categoria-productos").forEach(seccion => {
        const categoriaSeccion = normalizarCategoria(seccion.dataset.categoria || "");
        const contenedor = seccion.querySelector(".productos-container");

        if (!contenedor) return;

        const productosCategoria = productosActuales.filter(producto => {
            const nombreCategoria =
                mapaCategorias[producto.id_categoria] || "";

            return normalizarCategoria(nombreCategoria) === categoriaSeccion;
        });

        if (productosCategoria.length === 0) {
            contenedor.innerHTML = "";
            return;
        }

        contenedor.innerHTML = productosCategoria.map(producto => {
            const nombre = producto.nombre || "";
            const categoria =
                mapaCategorias[producto.id_categoria] || "Sin categoría";

            const disponible = producto.activo === true;

            const boton = disponible
                ? `
                    <button
                        type="button"
                        class="btn btn-sm btn-agregar-carrito mt-auto"
                        data-id="${producto.id_producto}">
                        <i class="fa-solid fa-cart-plus me-1"></i>
                        Agregar al carrito
                    </button>
                `
                : `
                    <button
                        type="button"
                        class="btn btn-sm btn-agregar-carrito mt-auto producto-no-disponible"
                        data-id="${producto.id_producto}">
                        <i class="fa-solid fa-ban me-1"></i>
                        No disponible
                    </button>
                `;

            return `
                <div
                    class="col producto-item"
                    data-id="${producto.id_producto}"
                    data-nombre="${escapeHtml(nombre.toLowerCase())}"
                    data-precio="${producto.precio}"
                    data-categoria="${escapeHtml(categoria.toLowerCase())}"
                    data-activo="${disponible ? "disponible" : "inactivo"}">

                    <div class="card producto-card h-100 border border-primary-subtle shadow-sm">

                        <div class="producto-imagen card m-2 overflow-hidden border border-primary-subtle">

                            <img
                                src="${escapeHtml(producto.imagen || "")}"
                                alt="${escapeHtml(nombre)}"
                                class="w-100 h-100 object-fit-cover"
                                data-imagen="${escapeHtml(producto.imagen || "")}"
                                style="cursor: pointer;">

                        </div>

                        <div class="card-body text-center d-flex flex-column">

                            <h6 class="fw-semibold producto-nombre mb-1">
                                ${escapeHtml(nombre)}
                            </h6>

                            <p class="fw-bold producto-precio mb-1">
                                $ ${Number(producto.precio).toFixed(2)}
                            </p>

                            ${boton}

                        </div>

                    </div>

                </div>
            `;
        }).join("");
    });

    configurarEventosProductos();
}

// =====================================================
// EVENTOS DE PRODUCTOS
// =====================================================
function configurarEventosProductos() {
    document.querySelectorAll(".btn-agregar-carrito").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = Number(btn.dataset.id);
            const producto = productosPorId[id];

            if (!producto) return;

            agregarAlCarrito(producto);
        });
    });

    document.querySelectorAll("[data-imagen]").forEach(img => {
        img.addEventListener("click", () => {
            const urlImagen = img.dataset.imagen;

            if (urlImagen) {
                verImagenZoom(urlImagen);
            }
        });
    });
}

// =====================================================
// NORMALIZAR CATEGORÍAS
// Permite comparar:
// "Odontología General"
// con:
// "odontologia_general"
// =====================================================
function normalizarCategoria(texto) {
    return (texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[\s-]+/g, "_")
        .trim();
}

// =====================================================
// BUSCADOR DE PRODUCTOS
// =====================================================
function configurarBuscador() {
    const buscador = document.getElementById("buscadorProductos");

    if (!buscador) return;

    const normalizar = texto => {
        return (texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/_/g, " ")
            .toLowerCase()
            .trim();
    };

    buscador.addEventListener("input", () => {
        const busqueda = normalizar(buscador.value);

        document.querySelectorAll(".producto-item").forEach(producto => {
            const nombre = normalizar(producto.dataset.nombre);
            const precio = normalizar(producto.dataset.precio);
            const categoria = normalizar(producto.dataset.categoria);
            const activo = normalizar(producto.dataset.activo);

            const coincide =
                nombre.includes(busqueda) ||
                precio.includes(busqueda) ||
                categoria.includes(busqueda) ||
                activo.includes(busqueda);

            producto.style.display = coincide ? "" : "none";
        });
    });

    buscador.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            buscador.blur();
        }
    });
}

// =====================================================
// CARRITO - AGREGAR
// =====================================================
function agregarAlCarrito(producto) {
    if (!producto || producto.activo !== true) {
        mostrarToastCarrito("No disponible");
        return;
    }

    const productoExistente = carrito.find(
        item => item.id_producto === producto.id_producto
    );

    if (productoExistente) {
        productoExistente.cantidad++;
    } else {
        carrito.push({
            id_producto: producto.id_producto,
            nombre: producto.nombre,
            precio: Number(producto.precio),
            imagen: producto.imagen,
            categoria: mapaCategorias[producto.id_categoria] || "",
            cantidad: 1
        });
    }

    guardarCarrito();
    actualizarCarrito();
    mostrarToastCarrito(`${producto.nombre} agregado al carrito`);
}

// =====================================================
// CAMBIAR CANTIDAD
// =====================================================
function cambiarCantidad(index, cambio) {
    if (!carrito[index]) return;

    carrito[index].cantidad += cambio;

    if (carrito[index].cantidad <= 0) {
        carrito.splice(index, 1);
    }

    guardarCarrito();
    actualizarCarrito();
}

// =====================================================
// ELIMINAR DEL CARRITO
// =====================================================
function eliminarDelCarrito(index) {
    if (!carrito[index]) return;

    carrito.splice(index, 1);

    guardarCarrito();
    actualizarCarrito();
}

// =====================================================
// VALIDAR CARRITO CON PRODUCTOS ACTUALES
// =====================================================
function validarCarritoConProductos() {
    carrito = carrito.filter(item => {
        const producto = productosPorId[item.id_producto];

        if (!producto || producto.activo !== true) {
            return false;
        }

        item.nombre = producto.nombre;
        item.precio = Number(producto.precio);
        item.imagen = producto.imagen;
        item.categoria =
            mapaCategorias[producto.id_categoria] || "";

        return true;
    });

    guardarCarrito();
}

// =====================================================
// ACTUALIZAR VISTA DEL CARRITO
// =====================================================
function actualizarCarrito() {
    const contador = document.getElementById("contadorCarrito");
    const contenido = document.getElementById("contenidoCarrito");
    const totalElemento = document.getElementById("totalCarrito");
    const btnWhatsApp = document.getElementById("btnEnviarWhatsApp");
    const carritoVacio = document.getElementById("carritoVacio");

    if (!contenido || !totalElemento) return;

    if (contador) {
        contador.textContent = carrito.reduce(
            (acc, producto) => acc + producto.cantidad,
            0
        );
    }

    const isEmpty = carrito.length === 0;

    if (carritoVacio) {
        carritoVacio.classList.toggle("d-none", !isEmpty);
    }

    if (btnWhatsApp) {
        btnWhatsApp.disabled = isEmpty;
    }

    if (isEmpty) {
        contenido.innerHTML = "";
        totalElemento.textContent = "$ 0.00";
        return;
    }

    let total = 0;

    contenido.innerHTML = carrito.map((producto, index) => {
        const subtotal =
            producto.precio * producto.cantidad;

        total += subtotal;

        const nombre = producto.nombre;

        return `
            <div class="border-bottom pb-3 mb-3">

                <div class="d-flex gap-3 align-items-center">

                    <img
                        src="${escapeHtml(producto.imagen || "")}"
                        alt="${escapeHtml(nombre)}"
                        class="carrito-imagen"
                        data-imagen-carrito="${escapeHtml(producto.imagen || "")}"
                        style="cursor: pointer;">

                    <div class="flex-grow-1">

                        <div class="fw-semibold small">
                            ${escapeHtml(nombre)}
                        </div>

                        <div class="text-primary fw-bold small mt-1">
                            $ ${producto.precio.toFixed(2)}
                        </div>

                        <div class="d-flex align-items-center mt-2 gap-1">

                            <button
                                type="button"
                                class="btn btn-sm btn-light border"
                                onclick="cambiarCantidad(${index}, -1)">
                                <i class="fa-solid fa-minus"></i>
                            </button>

                            <span class="mx-1 fw-semibold">
                                ${producto.cantidad}
                            </span>

                            <button
                                type="button"
                                class="btn btn-sm btn-light border"
                                onclick="cambiarCantidad(${index}, 1)">
                                <i class="fa-solid fa-plus"></i>
                            </button>

                        </div>

                    </div>

                    <div class="text-end">

                        <div class="fw-bold small mb-2">
                            $ ${subtotal.toFixed(2)}
                        </div>

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-danger"
                            onclick="eliminarDelCarrito(${index})">
                            <i class="fa-solid fa-trash text-danger"></i>
                        </button>

                    </div>

                </div>

            </div>
        `;
    }).join("");

    totalElemento.textContent =
        `$ ${total.toFixed(2)}`;

    document.querySelectorAll("[data-imagen-carrito]").forEach(img => {
        img.addEventListener("click", () => {
            const urlImagen = img.dataset.imagenCarrito;

            if (urlImagen) {
                verImagenZoom(urlImagen);
            }
        });
    });
}

// =====================================================
// FECHA FORMATEADA
// =====================================================
function obtenerFechaFormateada() {
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril",
        "Mayo", "Junio", "Julio", "Agosto",
        "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const ahora = new Date();

    const dia = ahora.getDate();
    const mes = meses[ahora.getMonth()];
    const anio = ahora.getFullYear();

    let horas = ahora.getHours();
    const minutos = ahora.getMinutes().toString().padStart(2, "0");
    const ampm = horas >= 12 ? "PM" : "AM";

    horas = horas % 12;
    horas = horas || 12;

    return `${dia} de ${mes} del ${anio} a las ${horas}:${minutos} ${ampm}`;
}

// =====================================================
// ENVÍO DE PEDIDO POR WHATSAPP
// =====================================================
function enviarPedidoWhatsApp() {
    if (carrito.length === 0) return;

    const numeroWhatsApp = "50588076667";

    let mensaje =
        "Hola Club Dental, quiero realizar el siguiente pedido:%0A%0A";

    let total = 0;

    carrito.forEach((producto, index) => {
        const nombre = producto.nombre;
        const subtotal =
            producto.precio * producto.cantidad;

        total += subtotal;

        mensaje +=
            `${index + 1}. ${nombre}%0A` +
            `Cantidad: ${producto.cantidad}%0A` +
            `Precio: $ ${producto.precio.toFixed(2)}%0A` +
            `Subtotal: $ ${subtotal.toFixed(2)}%0A%0A`;
    });

    mensaje +=
        `--------------------%0A` +
        `Total: $ ${total.toFixed(2)}%0A%0A` +
        `Quedo pendiente de confirmación. Gracias.`;

    const facturaContainer = document.createElement("div");

    facturaContainer.style.position = "absolute";
    facturaContainer.style.left = "-9999px";
    facturaContainer.style.top = "0";
    facturaContainer.style.width = "400px";
    facturaContainer.style.padding = "20px";
    facturaContainer.style.background = "#ffffff";
    facturaContainer.style.fontFamily = "Arial, sans-serif";
    facturaContainer.style.color = "#333333";
    facturaContainer.style.border = "1px solid #ddd";
    facturaContainer.style.borderRadius = "8px";

    const itemsHtml = carrito.map(producto => `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;">
            <span>${producto.cantidad}x ${escapeHtml(producto.nombre)}</span>
            <span>$ ${(producto.precio * producto.cantidad).toFixed(2)}</span>
        </div>
    `).join("");

    facturaContainer.innerHTML = `
        <div style="text-align:center;border-bottom:2px solid #0d6efd;padding-bottom:10px;margin-bottom:15px;">
            <h3 style="margin:0;color:#0d6efd;">Club Dental</h3>
            <p style="margin:5px 0 0;font-size:12px;color:#666;">
                Comprobante de Pedido
            </p>
        </div>

        <div style="margin-bottom:15px;">
            <p style="margin:0;font-size:12px;color:#666;">
                Fecha: ${obtenerFechaFormateada()}
            </p>
        </div>

        <div style="border-bottom:1px solid #eee;padding-bottom:10px;margin-bottom:10px;">
            ${itemsHtml}
        </div>

        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px;margin-top:10px;">
            <span>Total:</span>
            <span style="color:#0d6efd;">
                $ ${total.toFixed(2)}
            </span>
        </div>

        <div style="text-align:center;margin-top:20px;font-size:10px;color:#aaa;">
            Gracias por su preferencia
        </div>
    `;

    document.body.appendChild(facturaContainer);

    html2canvas(facturaContainer, { scale: 2 })
        .then(canvas => {
            document.body.removeChild(facturaContainer);

            const link = document.createElement("a");

            link.download =
                `Recibo_ClubDental_${Date.now()}.png`;

            link.href =
                canvas.toDataURL("image/png");

            link.click();

            window.open(
                `https://wa.me/${numeroWhatsApp}?text=${mensaje}`,
                "_blank"
            );
        })
        .catch(error => {
            console.error(
                "Error al generar la factura visual:",
                error
            );

            if (document.body.contains(facturaContainer)) {
                document.body.removeChild(facturaContainer);
            }

            window.open(
                `https://wa.me/${numeroWhatsApp}?text=${mensaje}`,
                "_blank"
            );
        });
}

// =====================================================
// ZOOM DE IMÁGENES
// =====================================================
function verImagenZoom(urlImagen) {
    const imgModal =
        document.getElementById("imagenZoomSrc");

    const modalElemento =
        document.getElementById("modalImagenZoom");

    if (!imgModal || !modalElemento) return;

    imgModal.src = urlImagen;

    const modal =
        bootstrap.Modal.getOrCreateInstance(modalElemento);

    modal.show();
}

// =====================================================
// LOCAL STORAGE
// =====================================================
function guardarCarrito() {
    localStorage.setItem(
        "carritoClubDental",
        JSON.stringify(carrito)
    );
}

function cargarCarritoGuardado() {
    const carritoGuardado =
        localStorage.getItem("carritoClubDental");

    if (!carritoGuardado) return;

    try {
        carrito = JSON.parse(carritoGuardado);

        if (!Array.isArray(carrito)) {
            carrito = [];
        }
    } catch (error) {
        console.error(
            "No se pudo cargar el carrito guardado:",
            error
        );

        carrito = [];
    }
}

// =====================================================
// CARGAR MODAL DEL CARRITO
// =====================================================
function cargarModalCarrito() {
    fetch("carrito.html")
        .then(response => {
            if (!response.ok) {
                throw new Error(
                    "No se pudo cargar carrito.html"
                );
            }

            return response.text();
        })
        .then(html => {
            document.body.insertAdjacentHTML(
                "beforeend",
                html
            );

            actualizarCarrito();

            const btnCarrito =
                document.getElementById("btnCarrito");

            const modalElemento =
                document.getElementById("modalCarrito");

            if (btnCarrito && modalElemento) {
                btnCarrito.addEventListener("click", () => {
                    const modal =
                        bootstrap.Modal.getOrCreateInstance(
                            modalElemento
                        );

                    actualizarCarrito();
                    modal.show();
                });
            }

            const btnWhatsApp =
                document.getElementById("btnEnviarWhatsApp");

            if (btnWhatsApp) {
                btnWhatsApp.addEventListener(
                    "click",
                    enviarPedidoWhatsApp
                );
            }
        })
        .catch(error => {
            console.error(
                "Error al cargar el carrito:",
                error
            );
        });
}

// =====================================================
// TOAST
// =====================================================
function mostrarToastCarrito(mensaje) {
    const toast =
        document.getElementById("toastCarrito");

    if (!toast) return;

    const texto =
        toast.querySelector(".toast-mensaje");

    if (texto) {
        texto.textContent = mensaje;
    }

    const toastBootstrap =
        bootstrap.Toast.getOrCreateInstance(
            toast,
            { delay: 1500 }
        );

    toastBootstrap.show();
}

// =====================================================
// SEGURIDAD HTML
// =====================================================
function escapeHtml(texto) {
    const div = document.createElement("div");

    div.textContent = texto ?? "";

    return div.innerHTML;
}