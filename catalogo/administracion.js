document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 1. VERIFICAR SESIÓN
    // ==========================================
    const usuarioGuardado = sessionStorage.getItem("admin_usuario");
    if (!usuarioGuardado) {
        window.location.href = "login.html";
        return;
    }

    const usuario = JSON.parse(usuarioGuardado);
    const elUsuarioActual = document.getElementById("usuarioActual");
    if (elUsuarioActual) elUsuarioActual.textContent = usuario.usuario;

    // ==========================================
    // 2. REFERENCIAS A ELEMENTOS DEL DOM
    // ==========================================
    const tablaProductos = document.getElementById("tablaProductos");
    const formProducto = document.getElementById("formProducto");
    const modalElemento = document.getElementById("modalProducto");
    const modalProducto = new bootstrap.Modal(modalElemento);
    const mensaje = document.getElementById("mensaje");
    const btnGuardar = formProducto.querySelector('button[type="submit"]');
    const buscadorProductos = document.getElementById("buscadorProductos");

    // ==========================================
    // 3. CREAR SELECT DE CATEGORÍA SI NO EXISTE
    // ==========================================
    let categoriaSelect = document.getElementById("categoria");
    if (!categoriaSelect) {
        const precioInput = document.getElementById("precio");
        const bloquePrecio = precioInput.closest(".mb-3");

        const bloqueCategoria = document.createElement("div");
        bloqueCategoria.className = "mb-3";
        bloqueCategoria.innerHTML = `
            <label for="categoria" class="form-label">Categoría</label>
            <select id="categoria" class="form-select" required>
                <option value="">Seleccionar categoría</option>
            </select>
        `;

        bloquePrecio.parentNode.insertBefore(bloqueCategoria, bloquePrecio);
        categoriaSelect = document.getElementById("categoria");
    }

    // ==========================================
    // 4. ESTADO GLOBAL
    // ==========================================
    let productosActuales = [];
    let mapaCategorias = {};

    // ==========================================
    // 5. INICIALIZACIÓN
    // ==========================================
    cargarDatosIniciales();
    inicializarEventos();

    // ==========================================
    // 6. FUNCIONES PRINCIPALES
    // ==========================================

    async function cargarDatosIniciales() {
        tablaProductos.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                    <i class="fa-solid fa-spinner fa-spin me-2"></i> Cargando productos y categorías...
                </td>
            </tr>
        `;

        const [resProductos, resCategorias] = await Promise.all([
            supabaseClient
                .from("productos")
                .select("id_producto, id_categoria, nombre, precio, activo, imagen")
                .order("id_producto", { ascending: false }),

            supabaseClient
                .from("categorias")
                .select("id_categoria, nombre")
                .order("nombre", { ascending: false })
        ]);

        if (resProductos.error || resCategorias.error) {
            console.error("Error al cargar datos:", resProductos.error || resCategorias.error);
            tablaProductos.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger py-4">
                        Error al cargar los datos del sistema.
                    </td>
                </tr>
            `;
            return;
        }

        // Mapear categorías de ID a Nombre
        mapaCategorias = {};
        resCategorias.data.forEach(cat => {
            mapaCategorias[cat.id_categoria] = cat.nombre;
        });

        productosActuales = resProductos.data || [];

        cargarOpcionesCategorias(resCategorias.data);
        renderizarProductos(productosActuales);
    }

    function cargarOpcionesCategorias(categorias) {
        categoriaSelect.innerHTML = `
            <option value="">Seleccionar categoría</option>
            ${categorias.map(cat => `
                <option value="${cat.id_categoria}">
                    ${escapeHtml(cat.nombre)}
                </option>
            `).join("")}
        `;
    }

    function renderizarProductos(productos) {
        if (!productos.length) {
            tablaProductos.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        No se encontraron productos.
                    </td>
                </tr>
            `;
            return;
        }

        tablaProductos.innerHTML = productos.map(producto => {
            const estado = producto.activo
                ? `<span class="estado disponible">Disponible</span>`
                : `<span class="estado sin-stock">Inactivo</span>`;

            const imagen = producto.imagen
                ? `
                    <div class="imagen-container">
                        <img src="${escapeHtml(producto.imagen)}" alt="${escapeHtml(producto.nombre)}" class="tabla-imagen">
                    </div>
                  `
                : `<span class="text-muted">Sin imagen</span>`;

            const nombreCategoria = mapaCategorias[producto.id_categoria] || "Sin categoría";

            return `
                <tr>
                    <td>${imagen}</td>
                    <td><strong>${escapeHtml(nombreCategoria)}</strong></td>
                    <td><strong>${escapeHtml(producto.nombre)}</strong></td>
                    <td>$ ${Number(producto.precio).toFixed(2)}</td>
                    <td>${estado}</td>
                    <td class="text-end">
                        <button type="button" class="btn btn-sm btn-outline-primary btn-editar" data-id="${producto.id_producto}" title="Editar">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    async function editarProducto(id) {
        const { data, error } = await supabaseClient
            .from("productos")
            .select("id_producto, id_categoria, nombre, precio, activo, imagen")
            .eq("id_producto", id)
            .maybeSingle();

        if (error || !data) {
            console.error("Error al obtener producto:", error);
            mostrarMensaje("No se pudo obtener el producto.", "danger");
            return;
        }

        document.getElementById("tituloModal").textContent = "Editar producto";
        document.getElementById("idProducto").value = data.id_producto;
        document.getElementById("nombre").value = data.nombre;
        document.getElementById("precio").value = data.precio;
        categoriaSelect.value = data.id_categoria ?? "";
        document.getElementById("activo").checked = data.activo;

        modalProducto.show();
    }

    // ==========================================
    // 7. CONFIGURACIÓN DE EVENTOS
    // ==========================================

    function inicializarEventos() {
        // Delegación de eventos para la tabla (Mejora de rendimiento al no reasignar eventos a cada botón)
        tablaProductos.addEventListener("click", e => {
            const btnEditar = e.target.closest(".btn-editar");
            if (btnEditar) {
                const id = Number(btnEditar.dataset.id);
                editarProducto(id);
            }
        });

        // Buscador en tiempo real
        if (buscadorProductos) {
            buscadorProductos.addEventListener("input", e => {
                const busqueda = e.target.value.toLowerCase().trim();

                const filtrados = productosActuales.filter(producto => {
                    const nombre = (producto.nombre || "").toLowerCase();
                    const precio = String(producto.precio ?? "").toLowerCase();
                    const categoria = (mapaCategorias[producto.id_categoria] || "").toLowerCase();
                    const estado = producto.activo ? "disponible activo" : "inactivo sin stock";

                    return (
                        nombre.includes(busqueda) ||
                        precio.includes(busqueda) ||
                        categoria.includes(busqueda) ||
                        estado.includes(busqueda)
                    );
                });

                renderizarProductos(filtrados);
            });
        }

        // Formulario de edición/actualización
        formProducto.addEventListener("submit", async e => {
            e.preventDefault();

            const idProducto = document.getElementById("idProducto").value;
            const nombre = document.getElementById("nombre").value.trim();
            const precio = Number(document.getElementById("precio").value);
            const categoriaId = categoriaSelect.value;
            const activo = document.getElementById("activo").checked;

            if (!idProducto || !nombre || isNaN(precio) || precio < 0 || !categoriaId) {
                mostrarMensaje("Por favor, completa todos los campos correctamente.", "danger");
                return;
            }

            btnGuardar.disabled = true;
            btnGuardar.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-1"></i> Guardando...`;

            const { error } = await supabaseClient
                .from("productos")
                .update({
                    nombre,
                    precio,
                    activo,
                    id_categoria: Number(categoriaId)
                })
                .eq("id_producto", Number(idProducto));

            btnGuardar.disabled = false;
            btnGuardar.innerHTML = `<i class="fa-solid fa-check me-1"></i> Guardar cambios`;

            if (error) {
                console.error("Error al actualizar producto:", error);
                mostrarMensaje("No se pudo actualizar el producto.", "danger");
                return;
            }

            modalProducto.hide();
            mostrarMensaje("Producto actualizado correctamente.", "success");
            cargarDatosIniciales();
        });

        // Cerrar sesión
        const btnCerrarSesion = document.getElementById("btnCerrarSesion");
        if (btnCerrarSesion) {
            btnCerrarSesion.addEventListener("click", () => {
                sessionStorage.removeItem("admin_usuario");
                window.location.href = "login.html";
            });
        }
    }

    // ==========================================
    // 8. UTILIDADES
    // ==========================================

    function mostrarMensaje(texto, tipo) {
        mensaje.textContent = texto;
        mensaje.className = `alert alert-${tipo}`;
        mensaje.style.display = "block";

        setTimeout(() => {
            mensaje.style.display = "none";
        }, 3000);
    }

    function escapeHtml(texto) {
        const div = document.createElement("div");
        div.textContent = texto ?? "";
        return div.innerHTML;
    }
});