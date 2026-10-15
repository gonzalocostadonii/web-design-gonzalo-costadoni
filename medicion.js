// Aviso de cookies + Píxel de Meta, compartido por la home y las landings de Tero y Zafra.
// El píxel carga solo si la persona acepta; la elección queda en localStorage («gc_cookies»: «si» o «no»).
(function () {
  var PIXEL = "3057609824570755", CLAVE = "gc_cookies";
  var leer = function () { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } };
  var guardar = function (v) { try { localStorage.setItem(CLAVE, v); } catch (e) { /* sin almacenamiento */ } };

  function cargarPixel() {
    if (window.fbq) return;
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", PIXEL);
    fbq("track", "PageView");
  }

  // Conversiones: escribir por WhatsApp (Lead) e ir a suscribirse a una app (InitiateCheckout)
  document.addEventListener("click", function (ev) {
    if (!window.fbq) return;
    var a = ev.target.closest && ev.target.closest("a[href]");
    if (!a) return;
    var h = a.href;
    if (/wa\.me|api\.whatsapp\.com/.test(h)) fbq("track", "Lead");
    else if (/\/suscribir\//.test(h)) fbq("track", "InitiateCheckout", { content_name: (h.match(/app=(\w+)/) || [])[1] || "app" });
  }, true);

  var eleccion = leer();
  if (eleccion === "si") { cargarPixel(); return; }
  if (eleccion === "no") return;

  var en = (function () { try { return (localStorage.getItem("gc_lang") || document.documentElement.lang) === "en"; } catch (e) { return false; } })();
  var T = en
    ? { txt: "We use a Meta cookie to measure our ads. Is that OK?", si: "Accept", no: "Reject", mas: "Learn more" }
    : { txt: "Usamos una cookie de Meta para medir nuestros anuncios. ¿Te parece bien?", si: "Aceptar", no: "Rechazar", mas: "Más info" };

  function mostrar() {
    var css = document.createElement("style");
    css.textContent =
      ".gc-ck{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:560px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;padding:16px 18px;border-radius:18px;background:#0D1B33;color:#E8EDF7;border:1px solid rgba(143,169,207,.3);box-shadow:0 20px 50px -18px rgba(0,0,0,.7);font:14.5px/1.45 Poppins,system-ui,sans-serif}" +
      ".gc-ck p{flex:1 1 260px;margin:0}.gc-ck a{color:#8FD9AE;text-decoration:underline;text-underline-offset:3px}" +
      ".gc-ck__b{display:flex;gap:8px;flex:none}.gc-ck button{min-height:44px;padding:0 18px;border-radius:999px;font:600 14.5px Poppins,system-ui,sans-serif;cursor:pointer}" +
      ".gc-ck__si{background:#34C873;color:#0A0F1F;border:0}.gc-ck__no{background:transparent;color:#E8EDF7;border:1px solid rgba(143,169,207,.45)}";
    document.head.appendChild(css);
    var d = document.createElement("div");
    d.className = "gc-ck"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Cookies");
    d.innerHTML = '<p>' + T.txt + ' <a href="https://gc-micro-apps.vercel.app/privacidad/#cookies" target="_blank" rel="noopener">' + T.mas + '</a></p>' +
      '<div class="gc-ck__b"><button type="button" class="gc-ck__no">' + T.no + '</button><button type="button" class="gc-ck__si">' + T.si + '</button></div>';
    d.querySelector(".gc-ck__si").onclick = function () { guardar("si"); d.remove(); cargarPixel(); };
    d.querySelector(".gc-ck__no").onclick = function () { guardar("no"); d.remove(); };
    document.body.appendChild(d);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mostrar); else mostrar();
})();
