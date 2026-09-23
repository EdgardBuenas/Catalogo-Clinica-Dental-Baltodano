document.addEventListener("DOMContentLoaded", () => {

    const formLogin = document.getElementById("formLogin");
    const mensaje = document.getElementById("mensaje");

    formLogin.addEventListener("submit", async (e) => {

        e.preventDefault();

        const usuario = document.getElementById("usuario").value.trim();
        const contrasena = document.getElementById("contrasena").value;

        mensaje.style.display = "none";

        try {

            const { data, error } = await supabaseClient
                .from("usuarios")
                .select("id_usuario, usuario, activo")
                .eq("usuario", usuario)
                .eq("contrasena", contrasena)
                .eq("activo", true)
                .maybeSingle();

            if (error) {
                console.error(error);
                mostrarMensaje("Error al iniciar sesión.", "danger");
                return;
            }

            if (!data) {
                mostrarMensaje("Usuario o contraseña incorrectos.", "danger");
                return;
            }

            sessionStorage.setItem(
                "admin_usuario",
                JSON.stringify({
                    id_usuario: data.id_usuario,
                    usuario: data.usuario
                })
            );

            window.location.href = "administracion.html";

        } catch (error) {

            console.error(error);
            mostrarMensaje("Ocurrió un error inesperado.", "danger");

        }

    });

    function mostrarMensaje(texto, tipo) {

        mensaje.textContent = texto;
        mensaje.className = `alert alert-${tipo}`;
        mensaje.style.display = "block";

    }

});