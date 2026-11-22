/**
 * Invitación de boda: lista de invitados + respuestas (RSVP).
 *
 * Pega este código en tu Google Sheet: Extensiones → Apps Script.
 * Publica como "Aplicación web" (ver README → "Guest list").
 * Después de cambiar este código: Implementar → Gestionar implementaciones → ✏️ → Nueva versión.
 *
 * GET  <URL>/exec?g=CODIGO  → { found, name, plusOne, envelope }   (solo ese invitado)
 * POST <URL>/exec           → guarda/actualiza la respuesta en la pestaña "Respuestas"
 *
 * Pestaña "Invitados" (fila 1): Codigo | Nombre | PlusOne | Sobre (opcional)
 *   La columna "Respuesta" se agrega sola y muestra quién ya respondió.
 * Pestaña "Respuestas": se crea sola. Una fila por invitado; si cambia su respuesta, se actualiza.
 */

const GUESTS_SHEET = "Invitados";
const RSVP_SHEET = "Respuestas";
const RSVP_HEADERS = ["Codigo", "Nombre", "Asiste", "PlusOne", "Nombre +1", "Actualizado"];

/* ───────────── Buscar invitado ───────────── */

function doGet(e) {
  const code = normalize((e && e.parameter && e.parameter.g) || "");
  const guest = code ? findGuest(code) : null;
  const result = guest
    ? { found: true, name: guest.name, plusOne: guest.plusOne, envelope: guest.envelope }
    : { found: false };
  return json(result);
}

/* ───────────── Guardar respuesta ───────────── */

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const code = normalize(data.code || "");
    const attending = data.attending === true;
    let plusOne = attending && data.plusOne === true;
    let name;

    if (code) {
      // Con código: el nombre y el permiso de +1 vienen de la hoja, no del navegador
      const guest = findGuest(code);
      if (!guest) return json({ ok: false, error: "unknown_code" });
      name = guest.name;
      if (!guest.plusOne) plusOne = false;
    } else {
      name = clean(data.name).slice(0, 80);
      if (!name) return json({ ok: false, error: "missing_name" });
    }

    const row = [
      code,
      name,
      attending ? "Sí" : "No",
      plusOne ? "Sí" : "No",
      plusOne ? clean(data.plusOneName).slice(0, 80) : "",
      new Date(),
    ];

    upsertResponse(row, code, name);
    if (code) markGuest(code, attending ? (plusOne ? "Sí (+1)" : "Sí") : "No");

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ───────────── Hoja de invitados ───────────── */

function guestsTable() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(GUESTS_SHEET);
  if (!sheet) return null;
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(normalize);
  return {
    sheet: sheet,
    rows: rows,
    col: {
      code: headers.indexOf("codigo"),
      name: headers.indexOf("nombre"),
      plusOne: headers.indexOf("plusone"),
      envelope: headers.indexOf("sobre"),
      status: headers.indexOf("respuesta"),
    },
  };
}

function findGuest(code) {
  const t = guestsTable();
  if (!t || t.col.code === -1 || t.col.name === -1) return null;
  for (let i = 1; i < t.rows.length; i++) {
    if (normalize(t.rows[i][t.col.code]) === code) {
      const r = t.rows[i];
      return {
        row: i + 1,
        name: String(r[t.col.name]).trim(),
        plusOne: t.col.plusOne !== -1 && isYes(r[t.col.plusOne]),
        envelope: t.col.envelope !== -1 ? String(r[t.col.envelope]).trim() : "",
      };
    }
  }
  return null;
}

/** Escribe "Sí", "Sí (+1)" o "No" en la columna "Respuesta" de Invitados (la crea si no existe). */
function markGuest(code, status) {
  const t = guestsTable();
  if (!t) return;
  let statusCol = t.col.status;
  if (statusCol === -1) {
    statusCol = t.rows[0].length; // siguiente columna libre
    t.sheet.getRange(1, statusCol + 1).setValue("Respuesta").setFontWeight("bold");
  }
  const guest = findGuest(code);
  if (guest) t.sheet.getRange(guest.row, statusCol + 1).setValue(status);
}

/* ───────────── Hoja de respuestas ───────────── */

function responsesSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(RSVP_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(RSVP_SHEET);
    sheet.getRange(1, 1, 1, RSVP_HEADERS.length).setValues([RSVP_HEADERS]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Una fila por invitado: por código, o por nombre si no tiene código. */
function upsertResponse(row, code, name) {
  const sheet = responsesSheet();
  const values = sheet.getDataRange().getValues();
  const key = normalize(name);
  for (let i = 1; i < values.length; i++) {
    const sameCode = code && normalize(values[i][0]) === code;
    const sameName = !code && !values[i][0] && normalize(values[i][1]) === key;
    if (sameCode || sameName) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  sheet.appendRow(row);
}

/* ───────────── Utilidades ───────────── */

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** "Código" → "codigo", " PlusOne " → "plusone" */
function normalize(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** Casilla marcada, TRUE, "sí", "si", "x", "1" → true */
function isYes(value) {
  if (value === true) return true;
  return ["true", "si", "yes", "x", "1"].indexOf(normalize(value)) !== -1;
}

/** Texto seguro para la hoja (evita que "=..." se ejecute como fórmula). */
function clean(value) {
  const s = String(value == null ? "" : value).trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/* ───────────── Pruebas desde el editor (▶ Ejecutar) ───────────── */

function testLookup() {
  const firstCode = SpreadsheetApp.getActive().getSheetByName(GUESTS_SHEET).getRange(2, 1).getValue();
  Logger.log(doGet({ parameter: { g: String(firstCode) } }).getContent());
}

function testRsvp() {
  const firstCode = SpreadsheetApp.getActive().getSheetByName(GUESTS_SHEET).getRange(2, 1).getValue();
  const body = JSON.stringify({ code: String(firstCode), attending: true, plusOne: false });
  Logger.log(doPost({ postData: { contents: body } }).getContent());
}
