/**
 * Configuración del front end.
 * API_URL: URL de la aplicación web de Apps Script (termina en /exec).
 *          Mientras esté vacía, el tablero muestra los datos de demostración de data/demo.json.
 * REFRESH_TOKEN: solo si configuró REFRESH_TOKEN en las Propiedades del script.
 */
window.FINAV_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyh_xUsAtGKAqtrM7KEWFk7vk3iZGWTGjgqrd6dCRfL3zqcUuG5HJyXjdmW0C-OFw0/exec',
  REFRESH_TOKEN: 'MY-2026-actualizar-PBS1982',
  DEMO_DATA: 'data/demo.json',
  LOCALE: 'es-EC',
  TIMEOUT_MS: 330000 // la actualización puede tardar mientras Apps Script procesa la hoja
};
