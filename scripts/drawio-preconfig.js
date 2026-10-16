// Applied after upstream defaults and before the editor starts.
window.DRAWIO_BASE_URL = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
window.DRAWIO_SERVER_URL = window.DRAWIO_BASE_URL + '/';
window.DRAWIO_VIEWER_URL = window.DRAWIO_SERVER_URL + 'js/viewer-static.min.js';
window.DRAWIO_LIGHTBOX_URL = window.DRAWIO_SERVER_URL;
window.EXPORT_URL = null;
window.DRAWIO_CONFIG = { defaultFonts: ['Arial', 'Verdana', 'Times New Roman', 'Courier New'], enableAi: false };
urlParams.offline = '1';
urlParams.lockdown = '1';
urlParams.plugins = '0';
urlParams.local = '1';
