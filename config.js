/**
 * ─────────────────────────────────────────────────────────────
 *  CONFIGURACIÓN DE LA INVITACIÓN
 *  Edita solo este archivo para cambiar textos, fechas y lugares.
 * ─────────────────────────────────────────────────────────────
 */
window.INVITE = {
  couple: {
    a: "Ali",
    b: "Fernanda",
    initials: "A & F",
  },

  // Texto visible de la fecha
  dateText: "Domingo 27 de diciembre de 2026",

  // Fecha/hora para "Agregar al calendario" (ISO 8601 con zona horaria; Nicaragua = -06:00)
  start: "2026-12-27T19:00:00-06:00",
  end:   "2026-12-28T00:00:00-06:00",

  // Cuenta regresiva hasta `start`. Pon false para ocultar la sección.
  showCountdown: true,

  /**
   * Fotos generales. Rutas relativas a index.html (o URLs completas).
   * Deja una ruta en "" para quitar esa foto.
   * Nota: la imagen de vista previa de WhatsApp (assets/og.jpg) se define en index.html
   * porque WhatsApp no ejecuta JavaScript.
   */
  images: {
    hero: "assets/photos/hero.jpg",          // vertical 1080×1920 (móvil)
    heroWide: "assets/photos/hero.jpg", // horizontal 1920×1080 (desktop)
    heroPosition: "50% 30%",                 // encuadre: ajusta si las caras quedan cortadas
    band: "assets/photos/hero-2.jpg",          // franja con la frase, horizontal 1920×1280
  },

  // Sección "Nuestra historia". Pon story: null para ocultarla.
  // Puedes poner las fotos que quieras (verticales 4:5, 1080×1350).
  // Caption (optional) text que se mostrara abajo de la image.
  story: {
    title: "Cómo empezó todo",
    text: "Hace once años nuestros caminos se cruzaron sin imaginar todo lo que viviríamos. Entre sueños, aprendizajes y recuerdos, seguimos eligiéndonos para comenzar nuestro capítulo más bonito.",
    photos: [
      { src: "assets/photos/galery-1.jpg", alt: "foto fer y ali sentados", caption: "" },
      { src: "assets/photos/story-2.jpg", alt: "", caption: "" },
      { src: "assets/photos/story-3.jpg", alt: "", caption: "" },
    ],
  },

  // Frase sobre la franja de foto (assets/photos/band.jpg). Pon quote: null para ocultarla.
  quote: {
    text: "“Donde tú vayas, iré yo.”",
    author: "Rut 1:16",
  },

  ceremony: null,

  // Pon reception: null si no hay recepción aparte
  reception: {
    time: "7:00 PM",
    venue: "Casa Jardin",
    address: "Club Campestre Las Colinas 3.5c. arriba. Casa #296, Managua",
    photo: { src: "assets/photos/casa-jardin.jpg", alt: "Casa Jardin Eventos" }, // 16:10, 1200×750
  },

  // Pon dressCode: "" para ocultar la tarjeta
  dressCode: "Formal · Evitar el color blanco o beige",

  // Lugar que se muestra en el mapa y en los botones de Google Maps / Waze
  map: {
    query: "Casa Jardin Eventos, Managua, Nicaragua",
    // Opcional: pega aquí el src del iframe de Google Maps ("Compartir" → "Insertar un mapa")
    embedSrc: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.2674166805564!2d-86.22646689999999!3d12.093836499999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f73fe4d55729123%3A0x9bfa97f966c907f!2sCasa%20Jardin%20Eventos!5e0!3m2!1ses!2sni!4v1795369519334!5m2!1ses!2sni",
  },

  rsvpDeadline: "10 de diciembre de 2026",

  /**
   * Regalo: se muestra en la sección de confirmación. Pon regalo: null para ocultarlo.
   * messagePlural (opcional) se usa para parejas y familias.
   */
  regalo: {
    title: "Regalo",
    message: "Nuestro mejor regalo es tu presencia, pero si tu deseo es tener un detalle puedes hacerlo dentro de un sobre.",
    messagePlural: "Nuestro mejor regalo es su presencia, pero si su deseo es tener un detalle pueden hacerlo dentro de un sobre.",
  },

  /**
   * Las respuestas se guardan en tu Google Sheet (pestaña "Respuestas") a través de
   * guestLookupUrl (más abajo). Esta sección de Google Form es solo una alternativa:
   * se usa únicamente si guestLookupUrl está vacío. Puedes dejarla como está.
   */
  googleForm: {
    actionUrl: "", // https://docs.google.com/forms/d/e/XXXXXXXX/formResponse
    fields: {
      name: "",        // entry.1111111111
      attending: "",   // entry.2222222222
      plusOne: "",     // entry.3333333333
      plusOneName: "", // entry.4444444444
      code: "",        // entry.5555555555 (opcional)
    },
    values: { yes: "Sí", no: "No" },
  },

  // ¿Se permite +1 a invitados que llegan con ?guest=Nombre (sin código)?
  defaultAllowPlusOne: true,

  /**
   * Lista de invitados (privada) en tu Google Sheet → pestaña "Invitados".
   * La URL del Apps Script NO va aquí (este archivo se sube a GitHub):
   *   - Local: ponla en config.local.js (ignorado por git; copia config.local.example.js).
   *   - GitHub Pages: secreto del repo GUEST_LOOKUP_URL (el workflow crea config.local.js al publicar).
   * Link de cada invitado: https://tu-sitio/?g=CODIGO
   */
  guestLookupUrl: "",

};
