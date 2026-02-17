// ============================================
// VARIABLES GLOBALES
// ============================================
const audio = document.getElementById("audio");
const lyricsContainer = document.getElementById("lyrics");
const lyricsScroll = document.getElementById("lyricsScroll");
const playPauseBtn = document.getElementById("playPauseBtn");
const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const progressHandle = document.getElementById("progressHandle");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const uploadZone = document.getElementById("uploadZone");
const audioUpload = document.getElementById("audioUpload");
const songInfo = document.getElementById("songInfo");
const songTitle = document.getElementById("songTitle");
const songArtist = document.getElementById("songArtist");

// Estado de la aplicación
let lyrics = [];
let currentLineIndex = -1;
let isDragging = false;
let audioContext = null;
let analyser = null;
let dataArray = null;
let bufferLength = 0;
let animationId = null;

// Configuración por defecto
let settings = {
  autoScroll: true,
  visualizer: true,
  particles: true,
  keyboardShortcuts: true,
  fontSize: 24,
  colorTheme: 'neon-pink',
  theme: 'dark'
};

// Letras por defecto (tu canción original)
const defaultLyrics = [
  { time: 30, text: "La conocí una mañana para una fiesta de enero" },
  { time: 32, text: "Nos ennoviamos en marzo el compromiso iba enserió" },
  { time: 34, text: "El matrimonio fue en mayo con ceremonia y festejo" },
  { time: 36, text: "Y no han pasado los años como si fuera el primero" },
  { time: 38, text: "En un instante se develan los misterios" },
  { time: 40, text: "La cenicienta del amor esta encantada" },
  { time: 42, text: "Era tan linda que alumbraba las estrellas" },
  { time: 44, text: "Era tan buena que todo se me olvidaba" },
  { time: 46, text: "Así, se fue esclareciendo" },
  { time: 48, text: "Así, me fui diluyendo" },
  { time: 50, text: "Así, y ya nunca yo supe de mi" },
  { time: 52, text: "La conocí una mañana para una fiesta de enero" },
  { time: 54, text: "Nos ennoviamos en marzo el compromiso iba enserió" },
  { time: 56, text: "El matrimonio fue en mayo con ceremonia y festejo" },
  { time: 58, text: "Y no han pasado los años como si fuera el primero" }
];

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  initLyrics(defaultLyrics);
  initEventListeners();
  initVisualizer();
  initParticles();
  applySettings();
  showToast('¡Bienvenido a LyricNova Pro! 🎤', 'success');
});

// ============================================
// GESTIÓN DE LETRAS
// ============================================
function initLyrics(lyricsData) {
  lyrics = lyricsData;
  lyricsContainer.innerHTML = '';
  
  lyrics.forEach((line, index) => {
    const p = document.createElement("p");
    p.textContent = line.text;
    p.classList.add("line");
    p.dataset.index = index;
    
    // Click en línea para saltar a ese momento
    p.addEventListener('click', () => {
      if (audio.src) {
        audio.currentTime = line.time;
      }
    });
    
    lyricsContainer.appendChild(p);
  });
}

function updateLyrics() {
  const currentTime = audio.currentTime;
  const lines = document.querySelectorAll(".line");
  
  // Encontrar la línea actual
  let newIndex = -1;
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (currentTime >= lyrics[i].time) {
      newIndex = i;
      break;
    }
  }
  
  if (newIndex !== currentLineIndex) {
    currentLineIndex = newIndex;
    
    lines.forEach((line, index) => {
      line.classList.remove("active", "next", "passed");
      
      if (index === currentLineIndex) {
        line.classList.add("active");
        if (settings.autoScroll) {
          scrollToActiveLine(line);
        }
      } else if (index === currentLineIndex + 1) {
        line.classList.add("next");
      } else if (index < currentLineIndex) {
        line.classList.add("passed");
      }
    });
  }
}

function scrollToActiveLine(line) {
  const container = lyricsScroll;
  const lineTop = line.offsetTop;
  const lineHeight = line.offsetHeight;
  const containerHeight = container.clientHeight;
  
  const scrollTo = lineTop - (containerHeight / 2) + (lineHeight / 2);
  container.scrollTo({
    top: scrollTo,
    behavior: 'smooth'
  });
}

// ============================================
// REPRODUCTOR DE AUDIO
// ============================================
function togglePlayPause() {
  if (!audio.src) {
    showToast('Por favor carga una canción primero', 'error');
    return;
  }
  
  if (audio.paused) {
    audio.play();
    playPauseBtn.querySelector('.play-icon').textContent = '⏸';
    playPauseBtn.classList.add('playing');
    if (settings.visualizer) startVisualizer();
  } else {
    audio.pause();
    playPauseBtn.querySelector('.play-icon').textContent = '▶';
    playPauseBtn.classList.remove('playing');
  }
}

function updateProgress() {
  if (!audio.duration) return;
  
  const percent = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width = `${percent}%`;
  progressHandle.style.left = `${percent}%`;
  
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function seekAudio(e) {
  if (!audio.duration) return;
  
  const rect = progressBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  const time = percent * audio.duration;
  audio.currentTime = Math.max(0, Math.min(time, audio.duration));
}

// ============================================
// CARGA DE ARCHIVOS
// ============================================
function loadAudioFile(file) {
  if (!file) return;
  
  const url = URL.createObjectURL(file);
  audio.src = url;
  
  // Actualizar información de la canción
  const fileName = file.name.replace(/\.[^/.]+$/, "");
  songTitle.textContent = fileName;
  songArtist.textContent = "Artista desconocido";
  
  uploadZone.style.display = 'none';
  songInfo.style.display = 'block';
  
  // Intentar obtener metadata
  audio.addEventListener('loadedmetadata', () => {
    showToast(`Canción cargada: ${fileName}`, 'success');
  }, { once: true });
  
  // Limpiar letras para nueva canción
  if (lyrics.length === 0 || confirm('¿Quieres cargar letras nuevas para esta canción?')) {
    lyrics = [];
    lyricsContainer.innerHTML = '<p class="line">Sin letras cargadas. Haz clic en "Editar Letras" para agregar.</p>';
  }
}

// Drag and drop
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('audio/')) {
    loadAudioFile(file);
  } else {
    showToast('Por favor arrastra un archivo de audio válido', 'error');
  }
});

uploadZone.addEventListener('click', () => {
  audioUpload.click();
});

audioUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) loadAudioFile(file);
});

// ============================================
// CONTROLES AVANZADOS
// ============================================

// Volumen
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');

volumeSlider.addEventListener('input', (e) => {
  const volume = e.target.value / 100;
  audio.volume = volume;
  volumeValue.textContent = `${e.target.value}%`;
});

// Velocidad
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');

speedSlider.addEventListener('input', (e) => {
  const speed = e.target.value / 100;
  audio.playbackRate = speed;
  speedValue.textContent = `${speed.toFixed(1)}x`;
});

// Tono (Pitch) - Simulado con preservesPitch
const pitchSlider = document.getElementById('pitchSlider');
const pitchValue = document.getElementById('pitchValue');

pitchSlider.addEventListener('input', (e) => {
  const pitch = parseInt(e.target.value);
  pitchValue.textContent = pitch > 0 ? `+${pitch}` : pitch;
  // Nota: El cambio de tono real requiere Web Audio API avanzado
  // Esta es una simulación básica
  showToast(`Tono: ${pitch > 0 ? '+' : ''}${pitch} semitonos`, 'success');
});

// Loop
const loopBtn = document.getElementById('loopBtn');
let isLooping = false;

loopBtn.addEventListener('click', () => {
  isLooping = !isLooping;
  audio.loop = isLooping;
  loopBtn.style.opacity = isLooping ? '1' : '0.6';
  loopBtn.style.color = isLooping ? 'var(--primary-color)' : 'var(--text-primary)';
  showToast(isLooping ? 'Repetición activada' : 'Repetición desactivada', 'success');
});

// ============================================
// VISUALIZADOR DE AUDIO
// ============================================
function initVisualizer() {
  const canvas = document.getElementById('visualizer');
  const ctx = canvas.getContext('2d');
  
  // Ajustar tamaño del canvas
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Inicializar Web Audio API
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    // Conectar audio al analizador
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
  }
  
  // Función de animación
  function draw() {
    if (!settings.visualizer) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    
    animationId = requestAnimationFrame(draw);
    
    analyser.getByteFrequencyData(dataArray);
    
    // Degradado de fondo
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(15, 15, 26, 0.1)');
    gradient.addColorStop(1, 'rgba(15, 15, 26, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
      
      // Color dinámico basado en la frecuencia
      const hue = (i / bufferLength) * 360;
      const primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary-color').trim();
      
      ctx.fillStyle = `rgba(${hexToRgb(primaryColor)}, ${dataArray[i] / 255})`;
      
      // Dibujar barra desde el centro
      const y = canvas.height / 2 - barHeight / 2;
      ctx.fillRect(x, y, barWidth - 2, barHeight);
      
      // Reflejar en la parte inferior
      ctx.fillStyle = `rgba(${hexToRgb(primaryColor)}, ${dataArray[i] / 510})`;
      ctx.fillRect(x, canvas.height / 2 + barHeight / 2, barWidth - 2, -barHeight / 2);
      
      x += barWidth;
    }
  }
  
  draw();
}

function startVisualizer() {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '255, 76, 96';
}

// ============================================
// PARTÍCULAS
// ============================================
function initParticles() {
  const particlesContainer = document.getElementById('particles');
  
  function createParticle() {
    if (!settings.particles) return;
    
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    const size = Math.random() * 4 + 2;
    const startX = Math.random() * window.innerWidth;
    const drift = (Math.random() - 0.5) * 200;
    const duration = Math.random() * 10 + 10;
    const delay = Math.random() * 5;
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${startX}px`;
    particle.style.setProperty('--drift', `${drift}px`);
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `${delay}s`;
    
    particlesContainer.appendChild(particle);
    
    setTimeout(() => {
      particle.remove();
    }, (duration + delay) * 1000);
  }
  
  // Crear partículas periódicamente
  setInterval(() => {
    if (settings.particles && document.querySelectorAll('.particle').length < 50) {
      createParticle();
    }
  }, 300);
  
  // Crear batch inicial
  for (let i = 0; i < 20; i++) {
    setTimeout(() => createParticle(), i * 100);
  }
}

// ============================================
// MODALES
// ============================================

// Modal de temas de color
const colorModal = document.getElementById('colorModal');
const colorThemeBtn = document.getElementById('colorThemeBtn');
const closeColorModal = document.getElementById('closeColorModal');

colorThemeBtn.addEventListener('click', () => {
  colorModal.classList.add('active');
});

closeColorModal.addEventListener('click', () => {
  colorModal.classList.remove('active');
});

// Seleccionar tema
document.querySelectorAll('.theme-option').forEach(option => {
  option.addEventListener('click', () => {
    const theme = option.dataset.theme;
    document.body.dataset.colorTheme = theme;
    settings.colorTheme = theme;
    saveSettings();
    
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    option.classList.add('selected');
    
    showToast('Tema aplicado correctamente', 'success');
  });
});

// Modal de configuración
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsModal = document.getElementById('closeSettingsModal');

settingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('active');
});

closeSettingsModal.addEventListener('click', () => {
  settingsModal.classList.remove('active');
});

// Configuración
document.getElementById('autoScrollCheck').addEventListener('change', (e) => {
  settings.autoScroll = e.target.checked;
  saveSettings();
});

document.getElementById('visualizerCheck').addEventListener('change', (e) => {
  settings.visualizer = e.target.checked;
  saveSettings();
});

document.getElementById('particlesCheck').addEventListener('change', (e) => {
  settings.particles = e.target.checked;
  saveSettings();
  if (!settings.particles) {
    document.querySelectorAll('.particle').forEach(p => p.remove());
  }
});

document.getElementById('keyboardShortcuts').addEventListener('change', (e) => {
  settings.keyboardShortcuts = e.target.checked;
  saveSettings();
});

const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');

fontSizeSlider.addEventListener('input', (e) => {
  settings.fontSize = parseInt(e.target.value);
  fontSizeValue.textContent = `${settings.fontSize}px`;
  applyFontSize();
  saveSettings();
});

document.getElementById('resetSettings').addEventListener('click', () => {
  if (confirm('¿Restablecer toda la configuración a los valores por defecto?')) {
    localStorage.removeItem('lyricnova-settings');
    location.reload();
  }
});

// Modal de editor de letras
const lyricsEditorModal = document.getElementById('lyricsEditorModal');
const editLyricsBtn = document.getElementById('editLyricsBtn');
const closeLyricsEditor = document.getElementById('closeLyricsEditor');
const lyricsEditor = document.getElementById('lyricsEditor');
const saveLyricsBtn = document.getElementById('saveLyricsBtn');

editLyricsBtn.addEventListener('click', () => {
  // Cargar letras actuales al editor
  const lyricsText = lyrics.map(line => `[${line.time}] ${line.text}`).join('\n');
  lyricsEditor.value = lyricsText;
  lyricsEditorModal.classList.add('active');
});

closeLyricsEditor.addEventListener('click', () => {
  lyricsEditorModal.classList.remove('active');
});

saveLyricsBtn.addEventListener('click', () => {
  const text = lyricsEditor.value;
  const newLyrics = [];
  
  const lines = text.split('\n');
  lines.forEach(line => {
    const match = line.match(/\[(\d+(?:\.\d+)?)\]\s*(.+)/);
    if (match) {
      newLyrics.push({
        time: parseFloat(match[1]),
        text: match[2].trim()
      });
    }
  });
  
  if (newLyrics.length > 0) {
    newLyrics.sort((a, b) => a.time - b.time);
    initLyrics(newLyrics);
    lyricsEditorModal.classList.remove('active');
    showToast('Letras guardadas correctamente', 'success');
  } else {
    showToast('Formato de letras inválido', 'error');
  }
});

// Sincronización en vivo
const syncLyricsBtn = document.getElementById('syncLyricsBtn');
let syncMode = false;
let syncLyrics = [];
let lastSyncTime = 0;

syncLyricsBtn.addEventListener('click', () => {
  syncMode = !syncMode;
  
  if (syncMode) {
    if (!audio.src) {
      showToast('Carga una canción primero', 'error');
      syncMode = false;
      return;
    }
    
    syncLyrics = [];
    lastSyncTime = 0;
    lyricsEditor.value = '';
    syncLyricsBtn.textContent = '⏹ Detener sincronización';
    syncLyricsBtn.style.background = 'var(--primary-color)';
    showToast('Modo sincronización activado. Presiona Enter para marcar cada línea', 'success');
    
    audio.play();
    lyricsEditor.focus();
  } else {
    syncLyricsBtn.textContent = '🎯 Sincronizar en vivo';
    syncLyricsBtn.style.background = '';
    
    if (syncLyrics.length > 0) {
      const lyricsText = syncLyrics.map(line => `[${line.time}] ${line.text}`).join('\n');
      lyricsEditor.value = lyricsText;
      showToast('Sincronización completada', 'success');
    }
  }
});

lyricsEditor.addEventListener('keydown', (e) => {
  if (syncMode && e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    
    const currentTime = Math.floor(audio.currentTime);
    const lines = lyricsEditor.value.split('\n');
    const lastLine = lines[lines.length - 1];
    
    if (lastLine && !lastLine.startsWith('[')) {
      syncLyrics.push({
        time: currentTime,
        text: lastLine
      });
      
      const updatedLine = `[${currentTime}] ${lastLine}`;
      lines[lines.length - 1] = updatedLine;
      lyricsEditor.value = lines.join('\n') + '\n';
      
      // Scroll al final
      lyricsEditor.scrollTop = lyricsEditor.scrollHeight;
    }
  }
});

// ============================================
// TEMA OSCURO/CLARO
// ============================================
const themeToggle = document.getElementById('themeToggle');

themeToggle.addEventListener('click', () => {
  const currentTheme = document.body.dataset.theme || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.body.dataset.theme = newTheme;
  settings.theme = newTheme;
  saveSettings();
  
  themeToggle.querySelector('.icon').textContent = newTheme === 'dark' ? '🌙' : '☀️';
  showToast(`Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado`, 'success');
});

// ============================================
// PANTALLA COMPLETA
// ============================================
const fullscreenBtn = document.getElementById('fullscreenBtn');

fullscreenBtn.addEventListener('click', toggleFullscreen);

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    fullscreenBtn.querySelector('.icon').textContent = '⛶';
  } else {
    document.exitFullscreen();
    fullscreenBtn.querySelector('.icon').textContent = '⛶';
  }
}

// ============================================
// ATAJOS DE TECLADO
// ============================================
document.addEventListener('keydown', (e) => {
  if (!settings.keyboardShortcuts) return;
  
  // No activar si está escribiendo en un input/textarea
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    return;
  }
  
  switch(e.key) {
    case ' ':
      e.preventDefault();
      togglePlayPause();
      break;
    case 'ArrowRight':
      e.preventDefault();
      audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      audio.currentTime = Math.max(audio.currentTime - 5, 0);
      break;
    case 'ArrowUp':
      e.preventDefault();
      volumeSlider.value = Math.min(parseInt(volumeSlider.value) + 5, 100);
      volumeSlider.dispatchEvent(new Event('input'));
      break;
    case 'ArrowDown':
      e.preventDefault();
      volumeSlider.value = Math.max(parseInt(volumeSlider.value) - 5, 0);
      volumeSlider.dispatchEvent(new Event('input'));
      break;
    case 'f':
    case 'F':
      e.preventDefault();
      toggleFullscreen();
      break;
    case 'm':
    case 'M':
      e.preventDefault();
      audio.muted = !audio.muted;
      showToast(audio.muted ? 'Silenciado' : 'Audio activado', 'success');
      break;
  }
});

// ============================================
// EVENT LISTENERS GENERALES
// ============================================
function initEventListeners() {
  // Audio
  audio.addEventListener('timeupdate', () => {
    updateProgress();
    updateLyrics();
  });
  
  audio.addEventListener('ended', () => {
    playPauseBtn.querySelector('.play-icon').textContent = '▶';
    playPauseBtn.classList.remove('playing');
  });
  
  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
  });
  
  // Controles
  playPauseBtn.addEventListener('click', togglePlayPause);
  
  // Barra de progreso
  progressBar.addEventListener('click', seekAudio);
  
  progressBar.addEventListener('mousedown', (e) => {
    isDragging = true;
    seekAudio(e);
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      seekAudio(e);
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  // Cerrar modales al hacer clic fuera
  [colorModal, settingsModal, lyricsEditorModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

// ============================================
// CONFIGURACIÓN Y PERSISTENCIA
// ============================================
function saveSettings() {
  localStorage.setItem('lyricnova-settings', JSON.stringify(settings));
}

function loadSettings() {
  const saved = localStorage.getItem('lyricnova-settings');
  if (saved) {
    settings = { ...settings, ...JSON.parse(saved) };
  }
}

function applySettings() {
  // Aplicar tema
  document.body.dataset.theme = settings.theme;
  document.body.dataset.colorTheme = settings.colorTheme;
  themeToggle.querySelector('.icon').textContent = settings.theme === 'dark' ? '🌙' : '☀️';
  
  // Aplicar configuración a controles
  document.getElementById('autoScrollCheck').checked = settings.autoScroll;
  document.getElementById('visualizerCheck').checked = settings.visualizer;
  document.getElementById('particlesCheck').checked = settings.particles;
  document.getElementById('keyboardShortcuts').checked = settings.keyboardShortcuts;
  
  fontSizeSlider.value = settings.fontSize;
  fontSizeValue.textContent = `${settings.fontSize}px`;
  applyFontSize();
  
  // Marcar tema seleccionado
  document.querySelectorAll('.theme-option').forEach(opt => {
    if (opt.dataset.theme === settings.colorTheme) {
      opt.classList.add('selected');
    }
  });
}

function applyFontSize() {
  const lines = document.querySelectorAll('.line');
  lines.forEach(line => {
    if (!line.classList.contains('active')) {
      line.style.fontSize = `${settings.fontSize}px`;
    } else {
      line.style.fontSize = `${settings.fontSize + 8}px`;
    }
  });
}

// ============================================
// NOTIFICACIONES TOAST
// ============================================
function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.classList.add('toast', type);
  
  const icon = type === 'success' ? '✓' : '✕';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastSlide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) reverse';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ============================================
// UTILIDADES
// ============================================

// Prevenir acciones por defecto en drag/drop global
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  document.body.addEventListener(eventName, (e) => {
    if (e.target !== uploadZone && !uploadZone.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, false);
});

// Log de bienvenida
console.log('%c🎤 LyricNova Pro ', 'background: linear-gradient(135deg, #ff4c60, #ff1744); color: white; font-size: 24px; padding: 10px 20px; border-radius: 10px; font-weight: bold;');
console.log('%cVersión: 2.0.0 | Desarrollado con ❤️', 'color: #ff4c60; font-size: 14px;');
console.log('%cAtalhos de teclado disponibles:', 'color: #00d4ff; font-size: 12px; font-weight: bold;');
console.log('Espacio: Play/Pausa | ← →: Adelantar/Atrasar 5s | ↑ ↓: Volumen | F: Pantalla completa | M: Silenciar');