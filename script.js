// Selección de elementos del DOM
const zonaChat = document.getElementById('zona-chat');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Configuración de límites y tiempos de espera
const TIMEOUT_MS = 10000; // 10 segundos límite de espera
const COOLDOWN_MS = 1500;  // 1.5 segundos entre envíos

// Ajuste automático de altura del textarea
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = userInput.scrollHeight + 'px';
});

// Manejo del envío del formulario
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const mensaje = userInput.value.trim();
  if (!mensaje) return;

  // Renderizar mensaje del usuario
  agregarMensaje(mensaje, 'user');
  userInput.value = '';
  userInput.style.height = 'auto';

  // Bloquear interfaz contra envíos múltiples
  setEstadoCargando(true);

  // Crear id para reemplazar la burbuja de 'pensando'
  const loadingId = agregarIndicadorCarga();

  try {
    const respuestaTexto = await enviarAWebhook(mensaje);
    reemplazarCargaConTexto(loadingId, respuestaTexto, 'agent');
  } catch (error) {
    let mensajeError = 'Ocurrió un error al procesar tu consulta.';
    if (error.name === 'AbortError') {
      mensajeError = 'La respuesta tardó demasiado tiempo. Intentá nuevamente.';
    }
    reemplazarCargaConTexto(loadingId, mensajeError, 'error');
  } finally {
    // Aplicar temporizador de espera (cooldown) antes de rehabilitar
    setTimeout(() => {
      setEstadoCargando(false);
    }, COOLDOWN_MS);
  }
});

// Función de envío con fetch, AbortController y manejo de errores
async function enviarAWebhook(mensaje) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: mensaje }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error en el servidor: ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.output || "Respuesta recibida correctamente.";

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Funciones auxiliares del DOM
function agregarMensaje(texto, tipo) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${tipo}`;
  
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'bubble';
  bubbleDiv.innerHTML = texto.replace(/\n/g, '<br>');

  messageDiv.appendChild(bubbleDiv);
  zonaChat.appendChild(messageDiv);
  hacerScrollAlFinal();
}

function agregarIndicadorCarga() {
  const id = 'loading-' + Date.now();
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message agent';
  messageDiv.id = id;

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'bubble';
  bubbleDiv.innerHTML = `
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>`;

  messageDiv.appendChild(bubbleDiv);
  zonaChat.appendChild(messageDiv);
  hacerScrollAlFinal();
  return id;
}

function reemplazarCargaConTexto(id, texto, tipo) {
  const elem = document.getElementById(id);
  if (elem) {
    elem.className = `message ${tipo}`;
    const bubble = elem.querySelector('.bubble');
    if (bubble) {
      bubble.innerHTML = texto.replace(/\n/g, '<br>');
    }
  }
  hacerScrollAlFinal();
}

function setEstadoCargando(cargando) {
  sendBtn.disabled = cargando;
  userInput.disabled = cargando;
}

function hacerScrollAlFinal() {
  zonaChat.scrollTop = zonaChat.scrollHeight;
}
