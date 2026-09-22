// =====================================================
// VARIABLES GLOBALES
// =====================================================
let carrito = [];

// =====================================================
// INICIALIZACIÓN
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    cargarCarritoGuardado();
    cargarModalCarrito();

    fetch("catalogo.json")
        .then(response => {
            if (!response.ok) throw new Error("No se pudo cargar el archivo JSON");
            return response.json();
        })
        .then(productos => {

            productos.forEach(producto => {
                console.log("Imagen:", producto.imagen);
                console.log(
                    "URL final:",
                    new URL(producto.imagen, document.baseURI).href
                );
            });

            cargarProductos(productos);
            configurarBuscador();
        })
        .catch(error => console.error("Error al cargar los productos:", error));
});

// =====================================================
// CARGAR PRODUCTOS EN EL DOM
// =====================================================
function cargarProductos(productos) {
    document.querySelectorAll(".categoria-productos").forEach(seccion => {
        const categoria = seccion.dataset.categoria;
        const contenedor = seccion.querySelector(".productos-container");
        const productosCategoria = productos.filter(p => p.categoria === categoria);

        contenedor.innerHTML = productosCategoria.map(producto => {
            const nombre = producto.nombre.replaceAll("_", " ");
            const descripcion = producto.descripcion ? `<p class="producto-descripcion mb-0">${producto.descripcion}</p>` : "";

            return `
                <div class="col producto-item" data-nombre="${nombre.toLowerCase()}" data-precio="${producto.precio}" data-categoria="${producto.categoria.toLowerCase()}">
                    <div class="card producto-card h-100 border border-primary-subtle shadow-sm">
                        
                        <div class="producto-imagen card m-2 overflow-hidden border border-primary-subtle">
                            <img src="${producto.imagen}" style="cursor: pointer;"alt="${nombre}" class="w-100 h-100 object-fit-cover" onclick="verImagenZoom('${producto.imagen}')">
                        </div>

                        <div class="card-body text-center d-flex flex-column">
                            <h6 class="fw-semibold producto-nombre mb-1">${nombre}</h6>
                            ${descripcion}
                            <p class="fw-bold producto-precio mb-1">
                                $ ${Number(producto.precio).toFixed(2)}
                            </p>
                            <button type="button" class="btn btn-sm btn-agregar-carrito mt-auto" onclick='agregarAlCarrito(${JSON.stringify(producto)})'>
                                <i class="fa-solid fa-cart-plus me-1"></i> Agregar al carrito
                            </button>
                        </div>

                    </div>
                </div>
            `;
        }).join("");
    });
}

// =====================================================
// BUSCADOR DE PRODUCTOS
// =====================================================
function configurarBuscador() {
    const buscador = document.getElementById("buscadorProductos");
    if (!buscador) return;

    // Función auxiliar para quitar tildes y pasar a minúsculas
    const normalizar = (texto) => {
        return texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    };

    buscador.addEventListener("input", () => {
        const busqueda = normalizar(buscador.value.trim());
        
        document.querySelectorAll(".producto-item").forEach(producto => {
            const { nombre = "", precio = "", categoria = "" } = producto.dataset;
            
            // Normalizamos también los datos del dataset
            const coincide = 
                normalizar(nombre).includes(busqueda) || 
                normalizar(precio).includes(busqueda) || 
                normalizar(categoria).includes(busqueda);
                
            producto.style.display = coincide ? "" : "none";
        });
    });

    buscador.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            buscador.blur(); 
        }
    });
}


// =====================================================
// CARRITO - ACCIONES Y LÓGICA
// =====================================================
function agregarAlCarrito(producto) {
    const productoExistente = carrito.find(item => item.nombre === producto.nombre);

    if (productoExistente) {
        productoExistente.cantidad++;
    } else {
        carrito.push({
            nombre: producto.nombre,
            precio: Number(producto.precio),
            imagen: producto.imagen,
            categoria: producto.categoria,
            cantidad: 1
        });
    }

    guardarCarrito();
    actualizarCarrito();
    mostrarToastCarrito(`${producto.nombre.replaceAll("_", " ")} agregado al carrito`);
}

function cambiarCantidad(index, cambio) {
    if (!carrito[index]) return;

    carrito[index].cantidad += cambio;
    if (carrito[index].cantidad <= 0) {
        carrito.splice(index, 1);
    }

    guardarCarrito();
    actualizarCarrito();
}

function eliminarDelCarrito(index) {
    if (!carrito[index]) return;
    carrito.splice(index, 1);
    guardarCarrito();
    actualizarCarrito();
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
        contador.textContent = carrito.reduce((acc, p) => acc + p.cantidad, 0);
    }

    const isEmpty = carrito.length === 0;
    if (carritoVacio) carritoVacio.classList.toggle("d-none", !isEmpty);
    if (btnWhatsApp) btnWhatsApp.disabled = isEmpty;

    if (isEmpty) {
        contenido.innerHTML = "";
        totalElemento.textContent = "$ 0.00";
        return;
    }

    let total = 0;
    contenido.innerHTML = carrito.map((producto, index) => {
        const subtotal = producto.precio * producto.cantidad;
        total += subtotal;
        const nombre = producto.nombre.replaceAll("_", " ");

        return `
            <div class="border-bottom pb-3 mb-3">
                <div class="d-flex gap-3 align-items-center">
                    <img src="${producto.imagen}" style="cursor: pointer;" alt="${nombre}" class="carrito-imagen" onclick="verImagenZoom('${producto.imagen}')">
                    <div class="flex-grow-1">
                        <div class="fw-semibold small">${nombre}</div>
                        <div class="text-primary fw-bold small mt-1">$ ${producto.precio.toFixed(2)}</div>
                        <div class="d-flex align-items-center mt-2 gap-1">
                            <button type="button" class="btn btn-sm btn-light border" onclick="cambiarCantidad(${index}, -1)">
                                <i class="fa-solid fa-minus"></i>
                            </button>
                            <span class="mx-1 fw-semibold">${producto.cantidad}</span>
                            <button type="button" class="btn btn-sm btn-light border" onclick="cambiarCantidad(${index}, 1)">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold small mb-2">$ ${subtotal.toFixed(2)}</div>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="eliminarDelCarrito(${index})">
                            <i class="fa-solid fa-trash text-danger"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    totalElemento.textContent = `$ ${total.toFixed(2)}`;
}

// =====================================================
// ENVÍO DE PEDIDO POR WHATSAPP
// =====================================================

/*
function enviarPedidoWhatsApp() {
    if (carrito.length === 0) return;

    const numeroWhatsApp = "50588076667";
    let mensaje = "Hola Club Dental, quiero realizar el siguiente pedido:%0A%0A";
    let total = 0;

    carrito.forEach((producto, index) => {
        const nombre = producto.nombre.replaceAll("_", " ");
        const subtotal = producto.precio * producto.cantidad;
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

    window.open(
        `https://wa.me/${numeroWhatsApp}?text=${mensaje}`,
        "_blank"
    );
}
*/

function obtenerFechaFormateada() {
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const ahora = new Date();
    const dia = ahora.getDate();
    const mes = meses[ahora.getMonth()];
    const anio = ahora.getFullYear();
    
    let horas = ahora.getHours();
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    const ampm = horas >= 12 ? 'PM' : 'AM';
    horas = horas % 12;
    horas = horas ? horas : 12; // Formato de 12 horas

    return `${dia} de ${mes} del ${anio} a las ${horas}:${minutos} ${ampm}`;
}

// ENVÍO DE PEDIDO POR WHATSAPP

function enviarPedidoWhatsApp() {
    if (carrito.length === 0) return;

    const numeroWhatsApp = "50588076667";
    let mensaje = "Hola Club Dental, quiero realizar el siguiente pedido:%0A%0A";
    let total = 0;

    carrito.forEach((producto, index) => {
        const nombre = producto.nombre.replaceAll("_", " ");
        const subtotal = producto.precio * producto.cantidad;
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

    // 2. Crear un contenedor temporal oculto para diseñar el "Recibo/Factura" visual
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

    let itemsHtml = carrito.map(p => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
            <span>${p.cantidad}x ${p.nombre.replaceAll("_", " ")}</span>
            <span>$ ${(p.precio * p.cantidad).toFixed(2)}</span>
        </div>
    `).join("");

    facturaContainer.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #0d6efd; padding-bottom: 10px; margin-bottom: 15px;">
            <h3 style="margin: 0; color: #0d6efd;">Club Dental</h3>
            <p style="margin: 5px 0 0; font-size: 12px; color: #666;">Comprobante de Pedido</p>
        </div>
        <div style="margin-bottom: 15px;">
            <p style="margin: 0; font-size: 12px; color: #666;">Fecha: ${obtenerFechaFormateada()}</p>
        </div>
        <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
            ${itemsHtml}
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 10px;">
            <span>Total:</span>
            <span style="color: #0d6efd;">$ ${total.toFixed(2)}</span>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #aaa;">
            Gracias por su preferencia
        </div>
    `;

    document.body.appendChild(facturaContainer);

    // 3. Convertir el recibo HTML en una imagen descargable usando html2canvas
    html2canvas(facturaContainer, { scale: 2 }).then(canvas => {
        // Remover el contenedor temporal del DOM
        document.body.removeChild(facturaContainer);

        // Convertir canvas a imagen y forzar descarga para que el usuario la adjunte en WhatsApp
        const link = document.createElement("a");
        link.download = `Recibo_ClubDental_${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        // 4. Abrir WhatsApp con el texto estructurado
        window.open(
            `https://wa.me/${numeroWhatsApp}?text=${mensaje}`,
            "_blank"
        );
    }).catch(error => {
        console.error("Error al generar la factura visual:", error);
        // Si falla la imagen, al menos abre WhatsApp con el texto
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
// ZOOM DE IMÁGENES (LIGHTBOX)
// =====================================================
function verImagenZoom(urlImagen) {
    const imgModal = document.getElementById("imagenZoomSrc");
    const modalElemento = document.getElementById("modalImagenZoom");
    
    if (!imgModal || !modalElemento) return;

    imgModal.src = urlImagen;
    const modal = bootstrap.Modal.getOrCreateInstance(modalElemento);
    modal.show();
}

// =====================================================
// LOCAL STORAGE Y CARGA DINÁMICA DEL MODAL CARRITO
// =====================================================
function guardarCarrito() {
    localStorage.setItem("carritoClubDental", JSON.stringify(carrito));
}

function cargarCarritoGuardado() {
    const carritoGuardado = localStorage.getItem("carritoClubDental");
    if (!carritoGuardado) return;
    try {
        carrito = JSON.parse(carritoGuardado);
    } catch (error) {
        console.error("No se pudo cargar el carrito guardado:", error);
        carrito = [];
    }
}

function cargarModalCarrito() {
    fetch("carrito.html")
        .then(response => {
            if (!response.ok) throw new Error("No se pudo cargar carrito.html");
            return response.text();
        })
        .then(html => {
            document.body.insertAdjacentHTML("beforeend", html);
            actualizarCarrito();

            const btnCarrito = document.getElementById("btnCarrito");
            const modalElemento = document.getElementById("modalCarrito");

            if (btnCarrito && modalElemento) {
                btnCarrito.addEventListener("click", () => {
                    const modal = bootstrap.Modal.getOrCreateInstance(modalElemento);
                    actualizarCarrito();
                    modal.show();
                });
            }

            const btnWhatsApp = document.getElementById("btnEnviarWhatsApp");
            if (btnWhatsApp) {
                btnWhatsApp.addEventListener("click", enviarPedidoWhatsApp);
            }
        })
        .catch(error => console.error("Error al cargar el carrito:", error));
}

// =====================================================
// SISTEMA DE TOAST (NOTIFICACIONES)
// =====================================================
function mostrarToastCarrito(mensaje) {
    const toast = document.getElementById("toastCarrito");
    if (!toast) return;

    const texto = toast.querySelector(".toast-mensaje");
    if (texto) texto.textContent = mensaje;

    const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toast, { delay: 1500 });
    toastBootstrap.show();
}