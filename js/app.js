// Global helper used by all sections
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showStatus(el, msg, type = 'success') {
  el.textContent = msg;
  el.className = `status-msg ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// ─── Router ────────────────────────────────────────────────────────────────

const SECTIONS = {
  config:      { label: 'Config. General',  icon: '⚙️',  module: () => SectionConfig },
  shows:       { label: 'Programación',      icon: '🎙️', module: () => SectionShows },
  splash:      { label: 'Splash Screen',     icon: '🖼️', module: () => SectionSplash },
  ads:         { label: 'Publicidad',        icon: '📢',  module: () => SectionAds },
  social:      { label: 'Redes Sociales',    icon: '🔗',  module: () => SectionSocial },
  events:      { label: 'Eventos',           icon: '🎪',  module: () => SectionEvents },
  promotions:  { label: 'Promociones',       icon: '🎁',  module: () => SectionPromotions },
};

let currentSection = null;

function navigate(id) {
  if (!SECTIONS[id]) return;
  currentSection = id;

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === id);
  });

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');

  // Render section
  const content = document.getElementById('main-content');
  const mod = SECTIONS[id].module();
  content.innerHTML = mod.html();
  mod.load();

  // Update URL hash for back/forward
  history.replaceState(null, '', `#${id}`);
}

function buildSidebar() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = Object.entries(SECTIONS).map(([id, s]) => `
    <button class="nav-item" data-section="${id}" onclick="navigate('${id}')">
      <span class="nav-icon">${s.icon}</span>
      <span class="nav-label">${s.label}</span>
    </button>`).join('');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  buildSidebar();

  const initial = location.hash.slice(1);
  navigate(SECTIONS[initial] ? initial : 'config');
});
