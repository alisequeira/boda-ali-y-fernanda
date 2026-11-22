(() => {
  "use strict";

  // config.js (público) + config.local.js (privado: local o generado por el workflow de GitHub)
  const C = Object.assign(window.INVITE || {}, window.INVITE_LOCAL || {});
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const enc = encodeURIComponent;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gsap = window.gsap;
  const hasGsap = typeof gsap !== "undefined";
  const hasSplit = typeof window.SplitText !== "undefined";
  const hasScroll = typeof window.ScrollTrigger !== "undefined";
  const animate = hasGsap && !reducedMotion;

  if (hasGsap) {
    const plugins = [hasScroll && window.ScrollTrigger, hasSplit && window.SplitText].filter(Boolean);
    if (plugins.length) gsap.registerPlugin(...plugins);
  }

  /* ───────────────────────── Guest ───────────────────────── */

  /**
   * ?g=CODIGO  → busca al invitado en tu Google Sheet (guestLookupUrl) o, si no está
   *              configurado, en la lista local `guests` de config.js.
   * ?guest=Nombre → invitado por nombre (usa defaultAllowPlusOne).
   */
  async function lookupRemote(code) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(`${C.guestLookupUrl}?g=${enc(code)}`, { signal: ctrl.signal });
      const data = await res.json();
      return data && data.found
        ? { name: String(data.name || "").trim(), plusOne: !!data.plusOne, envelope: String(data.envelope || "").trim() }
        : null;
    } catch (err) {
      console.warn("[Invitados] No se pudo consultar la lista:", err);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function resolveGuest() {
    const params = new URLSearchParams(location.search);
    const code = (params.get("g") || "").trim().toLowerCase();
    const name = (params.get("guest") || "").trim().slice(0, 80);

    if (code) {
      let found = null;
      if (C.guestLookupUrl) {
        found = await lookupRemote(code);
      } else {
        const entry = (C.guests || {})[code];
        if (entry) found = { name: entry.name, plusOne: entry.plusOne, envelope: entry.envelope || "" };
      }
      if (found && found.name) {
        return { code, name: found.name, envelope: found.envelope || "", plusOne: found.plusOne ?? !!C.defaultAllowPlusOne };
      }
    }
    if (name) return { code: "", name, plusOne: !!C.defaultAllowPlusOne };
    return null;
  }

  let guest = null;
  let firstName = "";   // nombre corto para saludos ("Billi", o el nombre completo si es pareja/familia)
  let plural = false;   // pareja o familia → "los invitamos", "¿Nos acompañan?"

  // "Billi y Suleydi", "Ana & Luis", "Familia Ramírez" → invitación en plural
  const isGroup = (text) => /\s(y|e|&)\s/i.test(text) || /^(familia|fam\.|flia\.?)\s/i.test(text.trim());

  /* ───────────────────────── Content ───────────────────────── */

  const get = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), C);

  $$("[data-requires]").forEach((el) => {
    if (!get(el.dataset.requires)) el.remove();
  });

  // Una sola tarjeta de lugar (ceremonia o recepción) → centrarla en desktop
  if ($$(".card--venue").length === 1) $(".cards")?.classList.add("cards--single");

  $$("[data-f]").forEach((el) => {
    const value = get(el.dataset.f);
    if (value != null && value !== "") el.textContent = value;
  });

  /* ───────────────────────── Images (from config) ───────────────────────── */

  // Acepta "ruta.jpg" o { src, alt }
  const imgSrc = (v) => (typeof v === "string" ? v : v?.src) || "";

  // Hero en desktop: definir <source> antes que el <img> para no descargar dos fotos
  const wideSource = $("#heroWideSource");
  if (C.images?.heroWide) wideSource.srcset = C.images.heroWide;
  else wideSource.remove();
  if (C.images?.heroPosition) $("#heroImg").style.objectPosition = C.images.heroPosition;

  $$("[data-img]").forEach((img) => {
    const value = get(img.dataset.img);
    const src = imgSrc(value);
    if (!src) {
      img.closest(".card--photo")?.classList.remove("card--photo");
      img.remove();
      return;
    }
    if (value?.alt) img.alt = value.alt;
    img.src = src;
  });

  // Galería de "Nuestra historia"
  const gallery = $("#gallery");
  const storyPhotos = (C.story?.photos || []).filter((p) => imgSrc(p));
  if (gallery && storyPhotos.length) {
    storyPhotos.forEach((p) => {
      const fig = document.createElement("figure");
      fig.className = "gallery__item";
      fig.setAttribute("role", "listitem");
      const img = document.createElement("img");
      Object.assign(img, { src: imgSrc(p), alt: p.alt || "", loading: "lazy", decoding: "async" });
      fig.append(img);
      if (p.caption) {
        const cap = document.createElement("figcaption");
        cap.textContent = p.caption;
        fig.append(cap);
      }
      gallery.append(fig);
    });
  } else {
    gallery?.remove();
  }

  // Map + links
  const mapQuery = (C.map && C.map.query) || "";
  if (mapQuery) {
    $("#mapFrame").src = (C.map.embedSrc) || `https://www.google.com/maps?q=${enc(mapQuery)}&output=embed`;
    $("#mapsLink").href = `https://www.google.com/maps/search/?api=1&query=${enc(mapQuery)}`;
    $("#wazeLink").href = `https://waze.com/ul?q=${enc(mapQuery)}&navigate=yes`;
  } else {
    $("#location").remove();
  }

  // Calendar
  const title = `Boda de ${C.couple?.a || ""} & ${C.couple?.b || ""}`.trim();
  const calLocation = C.reception?.address || C.ceremony?.address || mapQuery;
  const toUTC = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  if (C.start && C.end && $("#gcalLink")) {
    const start = toUTC(C.start);
    const end = toUTC(C.end);
    $("#gcalLink").href =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${enc(title)}&dates=${start}/${end}&location=${enc(calLocation)}` +
      `&details=${enc("¡Te esperamos!")}`;

    const esc = (s) => String(s).replace(/([,;\\])/g, "\\$1");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Invitacion//ES",
      "BEGIN:VEVENT",
      `UID:${start}-boda@invitacion`,
      `DTSTAMP:${toUTC(new Date().toISOString())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${esc(title)}`,
      `LOCATION:${esc(calLocation)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    $("#icsLink").href = `data:text/calendar;charset=utf-8,${enc(ics)}`;
  } else if ($(".calendar")) {
    $(".calendar").remove();
  }

  /* ───────────────────────── RSVP form ───────────────────────── */

  const form = $("#rsvpForm");
  const nameField = $("#nameField");
  const nameInput = $("#nameInput");
  const nameError = $("#nameError");
  const plusBlock = $("#plusOneBlock");
  const plusToggle = $("#plusOneToggle");
  const plusField = $("#plusOneField");
  const plusName = $("#plusOneName");
  const confirmBtn = $("#confirmBtn");
  const declineBtn = $("#declineBtn");
  const formError = $("#formError");
  const done = $("#rsvpDone");
  const stickyCta = $("#stickyCta");

  // Remember the answer on this device (best effort)
  const storeKey = () => `rsvp:${guest ? guest.code || guest.name : "anon"}`;
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(storeKey())); } catch { return null; } },
    set(v) { try { localStorage.setItem(storeKey(), JSON.stringify(v)); } catch { /* ignore */ } },
    clear() { try { localStorage.removeItem(storeKey()); } catch { /* ignore */ } },
  };

  // +1 toggle
  function setPlusOne(open, instant = false) {
    plusField.setAttribute("aria-hidden", String(!open));
    if (animate && !instant) {
      gsap.to(plusField, {
        height: open ? "auto" : 0,
        autoAlpha: open ? 1 : 0,
        duration: 0.45,
        ease: "power2.inOut",
      });
    } else {
      Object.assign(plusField.style, {
        height: open ? "auto" : "0px",
        opacity: open ? "1" : "0",
        visibility: open ? "visible" : "hidden",
      });
    }
  }
  plusToggle?.addEventListener("change", () => setPlusOne(plusToggle.checked));

  function currentName() {
    return guest ? guest.name : nameInput.value.trim();
  }

  function validate() {
    if (guest) return true;
    const ok = nameInput.value.trim().length > 0;
    nameError.hidden = ok;
    nameInput.setAttribute("aria-invalid", String(!ok));
    if (!ok) nameInput.focus();
    return ok;
  }
  nameInput.addEventListener("input", () => {
    if (nameInput.value.trim()) {
      nameError.hidden = true;
      nameInput.removeAttribute("aria-invalid");
    }
  });

  async function send(attending) {
    const gf = C.googleForm || {};
    const fields = gf.fields || {};
    const values = gf.values || { yes: "Sí", no: "No" };
    const withPlus = attending && !!plusToggle?.checked;

    const data = new URLSearchParams();
    const add = (key, value) => { if (key) data.append(key, value); };
    add(fields.name, currentName());
    add(fields.attending, attending ? values.yes : values.no);
    add(fields.plusOne, withPlus ? values.yes : values.no);
    add(fields.plusOneName, withPlus ? plusName.value.trim() : "");
    add(fields.code, guest?.code || "");

    // 1) Apps Script (misma URL que la lista de invitados) → pestaña "Respuestas"
    if (C.guestLookupUrl) {
      const payload = {
        code: guest?.code || "",
        name: currentName(),
        attending,
        plusOne: withPlus,
        plusOneName: withPlus ? plusName.value.trim() : "",
      };
      try {
        // Sin cabecera Content-Type (text/plain) → no hay preflight CORS con Apps Script
        const res = await fetch(C.guestLookupUrl, { method: "POST", body: JSON.stringify(payload) });
        const out = await res.json();
        if (!out.ok) console.warn("[RSVP] El script rechazó la respuesta:", out.error);
        return !!out.ok;
      } catch (err) {
        console.error("[RSVP] No se pudo enviar:", err);
        return false;
      }
    }

    // 2) Google Form (opcional, alternativa) · 3) modo demo
    if (!gf.actionUrl) {
      console.info("[RSVP · modo demo] Configura guestLookupUrl en config.js. Datos:", Object.fromEntries(data));
      await wait(600);
      return true;
    }

    try {
      // Google Forms no envía cabeceras CORS: la respuesta es opaca, pero el envío llega.
      await fetch(gf.actionUrl, { method: "POST", mode: "no-cors", body: data });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  function setBusy(busy) {
    confirmBtn.disabled = busy;
    declineBtn.disabled = busy;
    confirmBtn.querySelector(".btn__label").textContent = busy ? "Enviando…" : "Confirmar";
  }

  function showDone(answer, { animated = true } = {}) {
    const name = firstName || (answer.name ? answer.name.split(/\s+/)[0] : "");
    $("#doneTitle").textContent = answer.attending
      ? `¡Nos vemos ahí${name ? `, ${name}` : ""}!`
      : `Gracias por avisarnos${name ? `, ${name}` : ""}`;
    $("#doneText").textContent = answer.attending
      ? plural ? "Su asistencia quedó confirmada."
        : answer.plusOne ? "Tu asistencia y la de tu acompañante quedaron confirmadas." : "Tu asistencia quedó confirmada."
      : plural ? "Los vamos a extrañar. ¡Gracias por acompañarnos con su cariño!" : "Te vamos a extrañar. ¡Gracias por acompañarnos con tu cariño!";

    form.hidden = true;
    done.hidden = false;
    stickyCta.classList.remove("is-visible");
    stickyCta.dataset.off = "true";

    if (animated && animate) {
      gsap.from(done.children, { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" });
    }
  }

  function resetForm() {
    store.clear();
    done.hidden = true;
    form.hidden = false;
    delete stickyCta.dataset.off;
    gsap?.set?.([confirmBtn, declineBtn, confirmBtn.querySelector(".btn__label"), confirmBtn.querySelector(".btn-confirm__check")], { clearProps: "all" });
    setBusy(false);
    if (animate) gsap.from(form, { autoAlpha: 0, y: 12, duration: 0.4 });
  }

  function playConfirmed() {
    if (!animate) return Promise.resolve();
    return new Promise((resolve) => {
      const label = confirmBtn.querySelector(".btn__label");
      const check = confirmBtn.querySelector(".btn-confirm__check");
      const path = check.querySelector("path");
      const size = confirmBtn.offsetHeight;

      gsap.set(confirmBtn, { width: confirmBtn.offsetWidth });
      gsap.timeline({ onComplete: resolve })
        .to(declineBtn, { autoAlpha: 0, duration: 0.2 })
        .to(label, { autoAlpha: 0, duration: 0.15 }, "<")
        .to(confirmBtn, { width: size, padding: 0, backgroundColor: "#7d8b6a", duration: 0.45, ease: "power3.inOut" })
        .set(check, { opacity: 1 })
        .fromTo(path, { strokeDashoffset: 24 }, { strokeDashoffset: 0, duration: 0.35, ease: "power2.out" })
        .to(confirmBtn, { scale: 1.12, duration: 0.14, yoyo: true, repeat: 1, ease: "power1.inOut" }, "<0.15")
        .add(() => confetti(confirmBtn), "<")
        .to({}, { duration: 0.7 });
    });
  }

  function confetti(origin) {
    if (!animate) return;
    const layer = document.createElement("div");
    layer.className = "confetti";
    document.body.append(layer);

    const rect = origin.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ["#b08d57", "#7d8b6a", "#e7d9c0", "#d8a7a0", "#2f2a24", "#cfac72"];
    const count = window.innerWidth < 480 ? 60 : 90;
    const R = gsap.utils.random;

    for (let i = 0; i < count; i++) {
      const piece = document.createElement("i");
      piece.style.left = `${cx}px`;
      piece.style.top = `${cy}px`;
      piece.style.background = colors[i % colors.length];
      if (i % 3 === 0) piece.style.borderRadius = "50%";
      layer.append(piece);

      const angle = R(-Math.PI * 0.92, -Math.PI * 0.08);
      const velocity = R(140, 340);
      gsap.timeline()
        .to(piece, {
          x: Math.cos(angle) * velocity,
          y: Math.sin(angle) * velocity,
          rotation: R(-540, 540),
          duration: R(0.45, 0.75),
          ease: "power3.out",
        })
        .to(piece, {
          x: `+=${R(-70, 70)}`,
          y: `+=${R(260, 520)}`,
          rotation: `+=${R(-180, 180)}`,
          autoAlpha: 0,
          duration: R(1.1, 1.8),
          ease: "power1.in",
        });
    }
    setTimeout(() => layer.remove(), 3000);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;
    formError.hidden = true;
    setBusy(true);
    const ok = await send(true);
    if (!ok) {
      setBusy(false);
      formError.hidden = false;
      return;
    }
    const answer = { attending: true, plusOne: !!plusToggle?.checked, name: currentName() };
    store.set(answer);
    await playConfirmed();
    showDone(answer);
  });

  declineBtn.addEventListener("click", async () => {
    if (!validate()) return;
    formError.hidden = true;
    setBusy(true);
    const ok = await send(false);
    if (!ok) {
      setBusy(false);
      formError.hidden = false;
      return;
    }
    const answer = { attending: false, plusOne: false, name: currentName() };
    store.set(answer);
    showDone(answer);
  });

  $("#changeBtn").addEventListener("click", resetForm);

  /* ───────────────────────── Apply guest ───────────────────────── */

  function applyGuest(g) {
    guest = g;
    plural = !!g && (isGroup(g.name) || isGroup(g.envelope || ""));
    firstName = g ? (plural ? g.envelope || g.name : g.name.split(/\s+/)[0]) : "";

    if (g) {
      // Sobre: columna "Sobre" si existe; si no, el nombre completo
      $("#envelopeName").textContent = g.envelope || g.name;
      $("#guestName").textContent = g.name;
      $("#heroEyebrow").textContent = "Con mucho cariño";
      $("#heroLead").textContent = plural ? "los invitamos a celebrar nuestra boda" : "te invitamos a celebrar nuestra boda";
      if (plural) {
        $("#rsvpTitle").textContent = "¿Nos acompañan?";
        $("#declineBtn").textContent = "No podremos asistir";
      }
      if (!g.plusOne) plusBlock?.remove();
    } else {
      nameField.hidden = false;
    }

    const saved = store.get();
    if (saved) showDone(saved, { animated: false });
  }

  const guestReady = resolveGuest().then(applyGuest, () => applyGuest(null));

  /* ───────────────────────── Envelope + hero ───────────────────────── */

  const envelope = $("#envelope");
  let opened = false;

  function unlock() {
    envelope.remove();
    document.body.classList.remove("is-locked");
    if (hasScroll) window.ScrollTrigger.refresh();
  }

  function heroIntro() {
    const tl = gsap.timeline();
    if (reducedMotion) return tl.from(".hero__inner", { autoAlpha: 0, duration: 0.6 });

    // Ken Burns: la foto entra con un zoom lento
    if ($("#heroImg")) tl.fromTo("#heroImg", { scale: 1.18 }, { scale: 1, duration: 2.6, ease: "power2.out" }, 0);
    tl.from("#heroEyebrow", { y: 12, autoAlpha: 0, duration: 0.5, ease: "power2.out" }, 0.15);
    if (hasSplit) {
      const split = new window.SplitText("#guestName", { type: "words,chars" });
      tl.from(split.chars, {
        yPercent: 60,
        autoAlpha: 0,
        rotate: 8,
        duration: 0.7,
        stagger: 0.035,
        ease: "power3.out",
      }, 0.45);
    } else {
      tl.from("#guestName", { y: 20, autoAlpha: 0, duration: 0.7 }, 0.45);
    }
    tl.from([".hero .lead", ".hero .couple", ".hero .divider", ".hero .date", ".hero__cta", ".scroll-cue"], {
      y: 22,
      autoAlpha: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out",
    }, 0.95);
    return tl;
  }

  async function openEnvelope() {
    if (opened) return;
    opened = true;

    // Si el invitado aún se está buscando en la hoja, esperar (normalmente < 1 s)
    const hint = $(".envelope__hint");
    const slow = setTimeout(() => { if (hint) hint.textContent = "Abriendo…"; }, 150);
    await guestReady;
    clearTimeout(slow);

    if (!hasGsap) return unlock();

    const tl = gsap.timeline();
    if (reducedMotion) {
      tl.to(envelope, { autoAlpha: 0, duration: 0.35 }).add(heroIntro(), "<").call(unlock, null, 0.35);
      return;
    }

    tl.to(".envelope__hint", { autoAlpha: 0, duration: 0.25 })
      .to(".envelope__seal", { scale: 0, autoAlpha: 0, duration: 0.35, ease: "back.in(2)" }, "<")
      .to(".envelope__flap", { rotateX: 180, duration: 0.7, ease: "power2.inOut" })
      .set(".envelope__flap", { zIndex: 0 }, "-=0.35")
      .to(".envelope__letter", { yPercent: -58, duration: 0.85, ease: "power3.out" }, "-=0.1")
      .to(".envelope__body", { scale: 1.12, autoAlpha: 0, duration: 0.6, ease: "power2.in" }, "+=0.35")
      .to(envelope, { autoAlpha: 0, duration: 0.5 }, "<0.15")
      // Desbloquear el scroll apenas desaparece el sobre (no esperar al zoom de la foto)
      .call(unlock)
      .add(heroIntro(), "-=0.35");
  }

  if (!hasGsap) {
    // Sin GSAP (CDN caído): mostrar todo sin animación
    guestReady.then(unlock);
  } else {
    envelope.addEventListener("click", openEnvelope);
    envelope.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openEnvelope();
      }
    });
  }

  /* ───────────────────────── Countdown ───────────────────────── */

  const countdownSection = $("#countdown");
  const startTime = C.start ? new Date(C.start).getTime() : NaN;
  const endTime = C.end ? new Date(C.end).getTime() : startTime + 8 * 3600e3;

  if (countdownSection && Number.isNaN(startTime)) {
    countdownSection.remove();
  } else if (countdownSection) {
    const clock = $("#countdownClock");
    const title = $("#countdownTitle");
    const message = $("#countdownMessage");
    const nums = Object.fromEntries($$("[data-unit]", clock).map((el) => [el.dataset.unit, el]));
    const labels = Object.fromEntries($$("[data-label]", clock).map((el) => [el.dataset.label, el]));
    const words = {
      days: ["Día", "Días"],
      hours: ["Hora", "Horas"],
      minutes: ["Minuto", "Minutos"],
      seconds: ["Segundo", "Segundos"],
    };
    const pad = (n) => String(n).padStart(2, "0");
    let timer = null;
    let state = "";

    function setUnit(unit, value, text) {
      labels[unit].textContent = words[unit][value === 1 ? 0 : 1];
      const el = nums[unit];
      if (el.textContent === text) return;
      el.textContent = text;
      // Animación suave del número que cambia (solo si la sección está en pantalla)
      if (animate && state === "counting" && el.getBoundingClientRect().bottom > 0 && el.getBoundingClientRect().top < innerHeight) {
        gsap.fromTo(el, { yPercent: -45, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.4, ease: "power2.out" });
      }
    }

    function showMessage(heading, text) {
      clock.hidden = true;
      title.textContent = heading;
      message.textContent = text;
      message.hidden = false;
      clearInterval(timer);
    }

    function tick() {
      const now = Date.now();
      if (now >= endTime) {
        state = "after";
        return showMessage("¡Gracias!", "Gracias por celebrar este día tan especial con nosotros.");
      }
      if (now >= startTime) {
        state = "today";
        // Vuelve a revisar cada minuto para pasar a "después" al terminar
        clearInterval(timer);
        timer = setInterval(tick, 60e3);
        clock.hidden = true;
        title.textContent = "¡Hoy es el gran día!";
        message.textContent = "Nos vemos en un rato.";
        message.hidden = false;
        return;
      }

      let s = Math.floor((startTime - now) / 1000);
      const d = Math.floor(s / 86400); s %= 86400;
      const h = Math.floor(s / 3600); s %= 3600;
      const m = Math.floor(s / 60); s %= 60;

      setUnit("days", d, String(d));
      setUnit("hours", h, pad(h));
      setUnit("minutes", m, pad(m));
      setUnit("seconds", s, pad(s));
      state = "counting";
    }

    tick();
    if (state === "counting") {
      // Alinear con el cambio de segundo del reloj
      setTimeout(() => {
        tick();
        timer = setInterval(tick, 1000);
      }, 1000 - (Date.now() % 1000));
    }
    // Al volver a la pestaña, corregir de inmediato
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && state !== "after") tick();
    });

    if (animate && hasScroll) {
      gsap.from(".countdown__unit", {
        y: 30,
        autoAlpha: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: clock, start: "top 88%", once: true },
      });
    }
  }

  /* ───────────────────────── Scroll ───────────────────────── */

  // Scroll suave para enlaces internos (#rsvp, #details)
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  });

  if (animate && hasScroll) {
    $$(".reveal").forEach((el) => {
      gsap.from(el, {
        y: 40,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });

    // Galería: las fotos entran escalonadas
    if ($(".gallery")) {
      gsap.from(".gallery__item", {
        y: 60,
        autoAlpha: 0,
        duration: 0.9,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: { trigger: ".gallery", start: "top 85%", once: true },
      });
    }

    // Fotos de las tarjetas: leve zoom-out al aparecer
    $$(".card__img").forEach((img) => {
      gsap.from(img, {
        scale: 1.15,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: { trigger: img, start: "top 90%", once: true },
      });
    });

    // Parallax del hero y de la franja
    gsap.to(".hero__media", {
      yPercent: 15,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
    if ($(".band")) {
      gsap.fromTo(".band__media", { yPercent: -10 }, {
        yPercent: 10,
        ease: "none",
        scrollTrigger: { trigger: ".band", start: "top bottom", end: "bottom top", scrub: true },
      });
      gsap.from(".band__quote > *", {
        y: 30,
        autoAlpha: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out",
        scrollTrigger: { trigger: ".band", start: "top 70%", once: true },
      });
    }
  }

  // Recalcular posiciones cuando terminen de cargar las fotos
  window.addEventListener("load", () => hasScroll && window.ScrollTrigger.refresh());

  if (hasScroll) {
    window.ScrollTrigger.create({
      trigger: ".hero",
      start: "bottom top+=60",
      endTrigger: "#rsvp",
      end: "top bottom",
      onToggle: (self) => {
        const on = self.isActive && !stickyCta.dataset.off;
        stickyCta.classList.toggle("is-visible", on);
      },
    });
  }
})();
