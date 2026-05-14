/* ============================================
   Sistema Editorial pagou.ai — Dashboard
   ============================================ */

const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const PT_WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// State
const state = {
  user: null,
  posts: [],
  filter: 'all',
  currentPost: null,
};

// Init
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  state.user = params.get('user') || sessionStorage.getItem('currentUser');

  if (!state.user) {
    window.location.href = 'index.html';
    return;
  }

  setupHeader();
  setupEventListeners();
  loadPosts();
});

function setupHeader() {
  document.getElementById('userName').textContent = state.user;

  const today = new Date();
  document.getElementById('greetingDate').textContent =
    `${PT_WEEKDAYS[today.getDay()]}, ${today.getDate()} de ${PT_MONTHS[today.getMonth()].toLowerCase()}`;
}

function setupEventListeners() {
  // Logout / trocar usuário
  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  });

  // Filtros
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filter = chip.dataset.filter;
      renderPosts();
    });
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });

  // Esc closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

async function loadPosts() {
  try {
    const response = await fetch(`/api/get-posts?user=${encodeURIComponent(state.user)}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.posts = data.posts || [];
    renderPosts();
    updateGreetingStats();
  } catch (error) {
    console.error('Erro carregando posts:', error);
    showError(error.message);
  }
}

function updateGreetingStats() {
  const total = state.posts.length;
  const pending = state.posts.filter(p => p.status !== 'Publicado' && p.status !== 'Arquivado').length;

  let message;
  if (total === 0) {
    message = 'Nenhum post atribuído a você ainda';
  } else if (pending === 0) {
    message = `${total} posts no histórico · tudo publicado por enquanto`;
  } else {
    message = `${pending} ${pending === 1 ? 'post pendente' : 'posts pendentes'} · ${total} ${total === 1 ? 'total' : 'no total'}`;
  }

  document.getElementById('greetingStats').textContent = message;
}

function renderPosts() {
  const container = document.getElementById('postsContainer');
  const filtered = applyFilter(state.posts, state.filter);

  if (filtered.length === 0) {
    container.innerHTML = renderEmpty();
    return;
  }

  container.innerHTML = filtered.map((post, i) => renderPostCard(post, i)).join('');

  // Attach click handlers
  container.querySelectorAll('.post-card').forEach((card, i) => {
    card.addEventListener('click', () => openModal(filtered[i]));
  });
}

function applyFilter(posts, filter) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStr = today.toISOString().split('T')[0];
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  switch (filter) {
    case 'today':
      return posts.filter(p => p.data === todayStr);
    case 'upcoming':
      return posts.filter(p => {
        if (!p.data) return false;
        const postDate = new Date(p.data);
        return postDate >= today && postDate <= weekFromNow && p.status !== 'Publicado';
      });
    case 'published':
      return posts.filter(p => p.status === 'Publicado');
    case 'all':
    default:
      return posts;
  }
}

function renderPostCard(post, index) {
  const date = post.data ? parseDate(post.data) : null;
  const isPublished = post.status === 'Publicado';

  return `
    <article class="post-card ${isPublished ? 'published' : ''}" style="animation-delay: ${index * 0.04}s">
      <div class="post-card-top">
        <div class="post-date">
          ${date ? `
            <span class="post-date-day">${date.day}</span>
            <span class="post-date-month">${date.month}</span>
          ` : `
            <span class="post-date-day">—</span>
            <span class="post-date-month">sem data</span>
          `}
        </div>
        <div class="post-meta-row">
          <span class="chip chip-platform">${escapeHtml(post.plataforma || '—')}</span>
          <span class="chip chip-format">${escapeHtml(post.formato || '—')}</span>
          <span class="chip chip-status status-${escapeAttr(post.status || 'Ideia')}">${escapeHtml(post.status || 'Ideia')}</span>
        </div>
      </div>
      <h3 class="post-theme">${escapeHtml(post.tema || 'Sem tema')}</h3>
      <div class="post-bottom">
        <span class="post-pilar">
          <span class="post-pilar-dot"></span>
          ${escapeHtml(post.pilar || 'Sem pilar')}
        </span>
        <span class="post-cta">${isPublished ? '✓ Publicado' : 'Ver detalhes →'}</span>
      </div>
    </article>
  `;
}

function renderEmpty() {
  const messages = {
    today: { icon: '📅', title: 'Nada agendado pra hoje', message: 'Aproveita pra adiantar os próximos.' },
    upcoming: { icon: '📋', title: 'Sem posts na próxima semana', message: 'Vê os pendentes na aba "Todos".' },
    published: { icon: '🎯', title: 'Ainda nada publicado', message: 'Quando você marcar posts como publicados, eles aparecem aqui.' },
    all: { icon: '✨', title: 'Sua agenda está vazia', message: 'Quando linhas editoriais forem criadas pra você, vão aparecer aqui.' }
  };

  const m = messages[state.filter] || messages.all;

  return `
    <div class="empty-state">
      <div class="empty-state-icon">${m.icon}</div>
      <h3 class="empty-state-title">${m.title}</h3>
      <p class="empty-state-message">${m.message}</p>
    </div>
  `;
}

function openModal(post) {
  state.currentPost = post;
  const content = document.getElementById('modalContent');
  const date = post.data ? parseDate(post.data) : null;
  const isPublished = post.status === 'Publicado';

  content.innerHTML = `
    <div class="modal-header">
      <div class="modal-meta-row">
        ${date ? `<span class="chip chip-platform">${date.day} ${date.month}</span>` : ''}
        <span class="chip chip-platform">${escapeHtml(post.plataforma || '—')}</span>
        <span class="chip chip-format">${escapeHtml(post.formato || '—')}</span>
        <span class="chip chip-status status-${escapeAttr(post.status || 'Ideia')}">${escapeHtml(post.status || 'Ideia')}</span>
      </div>
      <h2 class="modal-theme">${escapeHtml(post.tema || 'Sem tema')}</h2>
    </div>

    ${post.legenda ? `
      <div class="modal-section">
        <div class="modal-section-label">
          <span>Legenda</span>
          <button class="modal-copy-btn" data-copy="legenda">📋 Copiar</button>
        </div>
        <p class="modal-text" id="legendaText">${escapeHtml(post.legenda)}</p>
      </div>
    ` : ''}

    ${post.hashtags ? `
      <div class="modal-section">
        <div class="modal-section-label">
          <span>Hashtags</span>
          <button class="modal-copy-btn" data-copy="hashtags">📋 Copiar</button>
        </div>
        <p class="modal-hashtags" id="hashtagsText">${escapeHtml(post.hashtags)}</p>
      </div>
    ` : ''}

    ${post.cta ? `
      <div class="modal-section">
        <div class="modal-section-label"><span>CTA</span></div>
        <p class="modal-text">${escapeHtml(post.cta)}</p>
      </div>
    ` : ''}

    ${post.linkMidia ? `
      <div class="modal-section">
        <div class="modal-section-label"><span>Mídia</span></div>
        <a class="modal-link" href="${escapeAttr(post.linkMidia)}" target="_blank" rel="noopener">
          📁 ${escapeHtml(post.linkMidia)}
        </a>
      </div>
    ` : ''}

    ${post.observacoes ? `
      <div class="modal-section">
        <div class="modal-section-label"><span>Observações</span></div>
        <div class="modal-obs">${escapeHtml(post.observacoes)}</div>
      </div>
    ` : ''}

    <div class="modal-actions">
      ${!isPublished ? `
        <button class="btn btn-primary" id="markPublishedBtn">
          ✓ Marquei como publicado
        </button>
      ` : `
        <button class="btn btn-secondary" disabled>
          ✓ Já publicado
        </button>
      `}
      <button class="btn btn-secondary" id="closeModalBtn">Fechar</button>
    </div>
  `;

  // Copy buttons
  content.querySelectorAll('.modal-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.copy;
      const text = target === 'legenda' ? post.legenda : post.hashtags;
      copyToClipboard(text, btn);
    });
  });

  // Action buttons
  const markBtn = document.getElementById('markPublishedBtn');
  if (markBtn) markBtn.addEventListener('click', () => markAsPublished(post));

  document.getElementById('closeModalBtn').addEventListener('click', closeModal);

  document.getElementById('modalBackdrop').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalBackdrop').hidden = true;
  document.body.style.overflow = '';
  state.currentPost = null;
}

async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = button.textContent;
    button.textContent = '✓ Copiado';
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 2000);
  } catch (err) {
    console.error('Erro ao copiar:', err);
    showToast('Não consegui copiar. Selecione e copie manualmente.');
  }
}

async function markAsPublished(post) {
  const btn = document.getElementById('markPublishedBtn');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    const response = await fetch('/api/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId: post.id,
        status: 'Publicado',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Update local state
    const postInState = state.posts.find(p => p.id === post.id);
    if (postInState) postInState.status = 'Publicado';

    showToast(`Post marcado como publicado!`);
    closeModal();
    renderPosts();
    updateGreetingStats();
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    btn.disabled = false;
    btn.textContent = '✓ Marquei como publicado';
    showToast('Erro ao salvar. Tente novamente.');
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = message;
  toast.hidden = false;

  setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}

function showError(detail) {
  const container = document.getElementById('postsContainer');
  container.innerHTML = `
    <div class="error-state">
      <strong>Não consegui carregar seus posts.</strong>
      Verifique se o token do Notion está configurado corretamente no Netlify.
      <br><br>
      <small style="opacity: 0.7;">Detalhe técnico: ${escapeHtml(detail)}</small>
    </div>
  `;
}

/* ============================================
   Utils
   ============================================ */

function parseDate(isoString) {
  // Aceita "2026-05-13" ou "2026-05-13T..."
  const datePart = isoString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return {
    day: String(day).padStart(2, '0'),
    month: PT_MONTHS[month - 1],
    year,
    full: new Date(year, month - 1, day),
  };
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  if (str == null) return '';
  return String(str).replace(/[^a-zA-Z0-9_\-]/g, '_');
}
