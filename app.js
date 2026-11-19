"use strict";

// Todos los elementos existentes se localizan mediante getElementById.
const estado = document.getElementById("estado");
const sinSesion = document.getElementById("sin-sesion");
const conSesion = document.getElementById("con-sesion");
const nombre = document.getElementById("nombre");
const botonPasskey = document.getElementById("crear-passkey");
const volverAqui = window.location.origin + window.location.pathname;

// Infraestructura: carga una biblioteca externa y espera a que esté disponible.
function cargarScript(url, clave) {
  return new Promise(function (resolve, reject) {
    const script = document.createElement("script");
    script.src = url;
    script.crossOrigin = "anonymous";
    if (clave) script.setAttribute("data-clerk-publishable-key", clave);
    script.onload = resolve;
    script.onerror = function () {
      reject(new Error("No se pudo cargar Clerk. Revisa el dominio, la conexión y los bloqueadores."));
    };
    document.head.appendChild(script);
  });
}

// La interfaz refleja la sesión que comunica Clerk, no un dato de localStorage.
function actualizarPantalla() {
  const conectado = Boolean(window.Clerk.user && window.Clerk.session);
  sinSesion.hidden = conectado;
  conSesion.hidden = !conectado;
  nombre.textContent = "";
  if (conectado) {
    const usuario = window.Clerk.user;
    nombre.textContent = usuario.fullName || usuario.primaryEmailAddress?.emailAddress || "Alumno/a";
    estado.textContent = "Sesión iniciada. Puedes crear o gestionar tu passkey.";
  } else {
    estado.textContent = "Sin sesión. Crea una cuenta o inicia sesión para continuar.";
  }
}

async function iniciar() {
  try {
    if (window.location.protocol === "file:") {
      throw new Error("Abre la práctica con un servidor local o una dirección HTTPS. Consulta la guía.");
    }
    if (!window.isSecureContext) {
      throw new Error("Para probar passkeys en el móvil necesitas HTTPS; una IP local por HTTP no basta.");
    }
    if (!CONFIG_CLERK.clavePublicable.startsWith("pk_") ||
        CONFIG_CLERK.dominio.includes("PEGA_AQUI")) {
      throw new Error("Primero completa los dos valores de config.js. Sigue la guía de configuración.");
    }
    // ClerkJS 6 utiliza un paquete separado para sus formularios.
    const base = "https://" + CONFIG_CLERK.dominio;
    await cargarScript(base + "/npm/@clerk/ui@1/dist/ui.browser.js");
    await cargarScript(base + "/npm/@clerk/clerk-js@6/dist/clerk.browser.js", CONFIG_CLERK.clavePublicable);
    await window.Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });

    document.getElementById("entrar").addEventListener("click", function () {
      window.Clerk.openSignIn({ forceRedirectUrl: volverAqui, signUpForceRedirectUrl: volverAqui });
    });
    document.getElementById("registrar").addEventListener("click", function () {
      window.Clerk.openSignUp({ forceRedirectUrl: volverAqui, signInForceRedirectUrl: volverAqui });
    });
    document.getElementById("perfil").addEventListener("click", function () {
      window.Clerk.openUserProfile();
    });

    // Se llama desde un clic: el móvil solicita autorización al alumno.
    botonPasskey.addEventListener("click", async function () {
      if (!window.Clerk.user) return;
      if (!window.PublicKeyCredential) {
        estado.textContent = "Este navegador no ofrece WebAuthn. Prueba con un navegador compatible actualizado.";
        return;
      }
      botonPasskey.disabled = true;
      estado.textContent = "Sigue las instrucciones del móvil para guardar la passkey…";
      try {
        await window.Clerk.user.createPasskey();
        estado.textContent = "Passkey creada. Cierra sesión y vuelve a entrar eligiendo el acceso con passkey.";
      } catch (error) {
        console.error("Creación de passkey:", error);
        estado.textContent = "No se ha creado la passkey. Puede que hayas cancelado: puedes volver a intentarlo. Si persiste, revisa la guía.";
      } finally {
        botonPasskey.disabled = false;
      }
    });
    document.getElementById("salir").addEventListener("click", async function () {
      try {
        await window.Clerk.signOut();
        actualizarPantalla();
      } catch (error) {
        console.error("Cierre de sesión:", error);
        estado.textContent = "No se ha podido cerrar la sesión. Revisa la conexión y vuelve a intentarlo.";
      }
    });
    window.Clerk.addListener(actualizarPantalla);
    actualizarPantalla();
  } catch (error) {
    estado.textContent = error.message;
    console.error(error);
  }
}

iniciar();
