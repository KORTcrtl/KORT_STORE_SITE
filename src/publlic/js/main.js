// Infobox premium
function showInfobox(msg, timeout = 4000) {
  function _show() {
    const infobox = document.getElementById('infobox');
    const infoboxMsg = document.getElementById('infoboxMsg');
    if (infobox && infoboxMsg) {
      infoboxMsg.textContent = msg;
      infobox.style.display = 'flex';
      setTimeout(() => {
        infobox.style.opacity = 1;
      }, 10);
      if (timeout > 0) {
        setTimeout(() => {
          infobox.style.opacity = 0;
          setTimeout(() => { infobox.style.display = 'none'; }, 300);
        }, timeout);
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _show);
  } else {
    _show();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function() {
      nav.classList.toggle('open');
    });
  }
  // Fechar menu ao clicar em um link (mobile)
  document.querySelectorAll('.nav a').forEach(link => {
    link.addEventListener('click', () => {
      if (nav) nav.classList.remove('open');
    });
  });
  // Scroll suave para âncoras
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  const profileMenu = document.querySelector('.profile-menu');
  const profileBtn = document.querySelector('.profile-btn');
  const profileDropdown = document.querySelector('.profile-dropdown');
  if (profileMenu && profileBtn) {
    profileBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      profileMenu.classList.toggle('open');
    });
    document.addEventListener('click', function(e) {
      if (!profileMenu.contains(e.target)) {
        profileMenu.classList.remove('open');
      }
    });
  }
  // Redirecionar para login/registro ao clicar nos links do menu de perfil
  const profileLoginLink = document.querySelector('.profile-dropdown .login-link');
  const profileRegisterLink = document.querySelector('.profile-dropdown .register-link');
  if (profileLoginLink) {
    profileLoginLink.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = 'login.html';
    });
  }
  if (profileRegisterLink) {
    profileRegisterLink.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = 'login.html#register';
    });
  }
  // Infobox close
  const closeInfobox = document.getElementById('closeInfobox');
  if (closeInfobox) {
    closeInfobox.addEventListener('click', function() {
      const infobox = document.getElementById('infobox');
      if (infobox) {
        infobox.style.opacity = 0;
        setTimeout(() => { infobox.style.display = 'none'; }, 300);
      }
    });
  }
  // Infobox: mostrar mensagem pendente com delay
  checkInfoboxOnLoad();

  // Exibir nome do usuário logado na navbar e menu de conta
  const user = getUserSession();
  if (user && user.username && profileMenu && profileBtn && profileDropdown) {
    // Exibir nome ao lado do ícone
    let nameSpan = document.querySelector('.profile-username');
    if (!nameSpan) {
      nameSpan = document.createElement('span');
      nameSpan.className = 'profile-username';
      nameSpan.style.color = '#7b8cfd';
      nameSpan.style.fontWeight = '700';
      nameSpan.style.marginLeft = '0.5rem';
      nameSpan.style.fontSize = '1.08rem';
      profileBtn.parentNode.insertBefore(nameSpan, profileBtn.nextSibling);
    }
    nameSpan.textContent = user.username;
    // Substituir opções do menu
    profileDropdown.innerHTML = '<a href="dashboard.html" class="dashboard-link">Minha Conta</a><a href="#" class="logout-link">Logout</a>';
    // Logout
    const logoutLink = document.querySelector('.logout-link');
    if (logoutLink) {
      logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        clearUserSession();
        triggerInfoboxNextPage('Você saiu da sua conta.');
        window.location.reload();
      });
    }
  }
});

// Bolinha que segue o mouse
const mouseBall = document.getElementById('mouse-ball');
document.addEventListener('mousemove', (e) => {
  if (mouseBall) {
    mouseBall.style.transform = `translate(${e.clientX - 16}px, ${e.clientY - 16}px)`;
  }
});

// Reforçar efeito de escrita (caso precise reiniciar animação)
function restartTypewriter(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }
}

// Exemplo de uso: restartTypewriter('.typewriter');

// Login persistente e infobox de boas-vindas
function setUserSession(user) {
  localStorage.setItem('kort_user', JSON.stringify(user));
}
function getUserSession() {
  try {
    let user = null;
    // Buscar nas duas chaves, priorizando a mais completa
    const userKortex = JSON.parse(localStorage.getItem('kortex_user'));
    const userKort = JSON.parse(localStorage.getItem('kort_user'));
    // Preferir o que tiver mais dados (email, role, username)
    if (userKortex && (userKortex.email || userKortex.role)) {
      user = userKortex;
    } else if (userKort) {
      user = userKort;
    }
    return user;
  } catch { return null; }
}
function clearUserSession() {
  localStorage.removeItem('kort_user');
}

function triggerInfoboxNextPage(msg) {
  localStorage.setItem('kort_infobox_msg', msg);
}
function checkInfoboxOnLoad() {
  const msg = localStorage.getItem('kort_infobox_msg');
  if (msg) {
    setTimeout(() => {
      showInfobox(msg);
      localStorage.removeItem('kort_infobox_msg');
    }, 2000);
  }
}

// Ao logar com sucesso (exemplo, adapte para seu backend real)
if (window.location.pathname.includes('login.html')) {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('loginUsername').value;
      // Simulação de resposta real do backend:
      // Aqui você faria a requisição real ao backend...
      // Supondo sucesso, resposta:
      // Exemplo de resposta do backend:
      const respostaBackend = {
        username: username,
        email: username + '@exemplo.com', // Simule ou use resposta real
        cargo: username === 'admin' ? 'Administrador' : 'CEO'
      };
      // Salvar usuário completo, compatível com cargo/role
      const userToSave = {
        username: respostaBackend.username,
        email: respostaBackend.email,
        role: respostaBackend.role || respostaBackend.cargo || '-'
      };
      localStorage.setItem('kortex_user', JSON.stringify(userToSave));
      triggerInfoboxNextPage('Bem-vindo, ' + userToSave.username + '!');
      setTimeout(() => { window.location.href = 'index.html'; }, 200);
    });
  }
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('registerUsername').value;
      setUserSession({username});
      triggerInfoboxNextPage('Conta criada com sucesso! Bem-vindo, ' + username + '!');
      setTimeout(() => { window.location.href = 'index.html'; }, 200);
    });
  }
  const recoverFormPanel = document.getElementById('recoverFormPanel');
  if (recoverFormPanel) {
    recoverFormPanel.addEventListener('submit', function(e) {
      e.preventDefault();
      triggerInfoboxNextPage('Se os dados estiverem corretos, você receberá instruções para recuperar sua conta.');
      setTimeout(() => { window.location.href = 'login.html'; }, 200);
    });
  }
}

// Ao carregar qualquer página, mostrar infobox se estiver logado
const user = getUserSession();
if (user && user.username) {
  if (window.location.pathname.includes('index.html') || window.location.pathname.includes('loja.html')) {
    showInfobox('Bem-vindo de volta, ' + user.username + '!');
  }
}

// Alternar entre login e registro na página de login
if (window.location.pathname.includes('login.html')) {
  const showLogin = document.getElementById('showLogin');
  const showRegister = document.getElementById('showRegister');
  const showRecover = document.getElementById('showRecover');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const recoverFormPanel = document.getElementById('recoverFormPanel');
  const loginTitle = document.getElementById('loginTitle');
  // Alternância de painéis
  function switchPanel(panel) {
    loginForm.style.display = (panel === 'login') ? 'flex' : 'none';
    registerForm.style.display = (panel === 'register') ? 'flex' : 'none';
    recoverFormPanel.style.display = (panel === 'recover') ? 'flex' : 'none';
    showLogin.style.display = (panel === 'login') ? 'none' : 'inline-block';
    showRegister.style.display = (panel === 'register') ? 'none' : 'inline-block';
    showRecover.style.display = (panel === 'recover') ? 'none' : 'inline-block';
    if (panel === 'login') loginTitle.textContent = 'Entrar na sua conta';
    if (panel === 'register') loginTitle.textContent = 'Criar nova conta';
    if (panel === 'recover') loginTitle.textContent = 'Recuperar conta';
  }
  if (showLogin) showLogin.addEventListener('click', () => switchPanel('login'));
  if (showRegister) showRegister.addEventListener('click', () => switchPanel('register'));
  if (showRecover) showRecover.addEventListener('click', () => switchPanel('recover'));
  // Hash para abrir direto registro
  if (window.location.hash === '#register') {
    switchPanel('register');
  } else {
    switchPanel('login');
  }
}

if (window.location.pathname.includes('dashboard.html')) {
  const user = getUserSession();
  if (!user || !user.username) {
    triggerInfoboxNextPage('Faça login para acessar sua conta.');
    window.location.href = 'login.html';
  } else {
    // Preencher dados
    const username = user.username;
    const email = user.email || '-';
    const dashboardUsername = document.getElementById('dashboardUsername');
    const dashboardUserValue = document.getElementById('dashboardUserValue');
    const dashboardEmailValue = document.getElementById('dashboardEmailValue');
    const dashboardAvatarText = document.getElementById('dashboardAvatarText');
    if (dashboardUsername) dashboardUsername.textContent = username;
    if (dashboardUserValue) dashboardUserValue.textContent = username;
    if (dashboardEmailValue) dashboardEmailValue.textContent = email;
    if (dashboardAvatarText && username) dashboardAvatarText.textContent = username[0].toUpperCase();
    // Logout
    const dashboardLogout = document.querySelector('.dashboard-logout');
    if (dashboardLogout) {
      dashboardLogout.addEventListener('click', function() {
        clearUserSession();
        triggerInfoboxNextPage('Você saiu da sua conta.');
        window.location.href = 'login.html';
      });
    }
    // Abas do dashboard
    const tabs = document.querySelectorAll('.dashboard-tab');
    const tabContents = document.querySelectorAll('.dashboard-tab-content');
    tabs.forEach(tab => {
      tab.addEventListener('click', function() {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.style.display = 'none');
        tab.classList.add('active');
        const tabId = 'tab-' + tab.getAttribute('data-tab');
        const content = document.getElementById(tabId);
        if (content) content.style.display = 'block';
      });
    });
  }
}

// DASHBOARD PREMIUM TABS
const premiumTabs = document.querySelectorAll('.dashboard-premium-tab');
const premiumPanels = document.querySelectorAll('.dashboard-premium-panel');
if (premiumTabs.length) {
  premiumTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      premiumTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.getAttribute('data-tab');
      premiumPanels.forEach(panel => {
        if (panel.id === 'tab-' + tabName) {
          panel.style.display = '';
        } else {
          panel.style.display = 'none';
        }
      });
    });
  });
}
// Avatar e nome do usuário dinâmico
function setDashboardUser(user) {
  if (!user) return;
  const username = user.username || user.email || 'Usuário';
  const avatarText = username[0] ? username[0].toUpperCase() : 'U';
  const avatarEl = document.getElementById('dashboardAvatarText');
  const nameEl = document.getElementById('dashboardUsername');
  const userVal = document.getElementById('dashboardUserValue');
  const emailVal = document.getElementById('dashboardEmailValue');
  const roleVal = document.getElementById('dashboardRoleValue');
  const sidebarRole = document.getElementById('dashboardRole');
  if (avatarEl) avatarEl.textContent = avatarText;
  if (nameEl) nameEl.textContent = username;
  if (userVal) userVal.textContent = username;
  if (emailVal) emailVal.textContent = user.email || '-';
  const cargo = user.role || user.cargo || '-';
  if (roleVal) roleVal.textContent = cargo;
  if (sidebarRole) sidebarRole.textContent = cargo;
}
// Exemplo: pegar usuário do localStorage
try {
  const user = JSON.parse(localStorage.getItem('kortex_user'));
  setDashboardUser(user);
} catch(e) {}

// DASHBOARD SIDEBAR TABS
const sidebarTabs = document.querySelectorAll('.sidebar-menu-item');
const dashboardPanels = document.querySelectorAll('.dashboard-panel');
if (sidebarTabs.length) {
  sidebarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      sidebarTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.getAttribute('data-tab');
      dashboardPanels.forEach(panel => {
        if (panel.id === 'tab-' + tabName) {
          panel.style.display = '';
        } else {
          panel.style.display = 'none';
        }
      });
      // Logout
      if (tabName === 'logout') {
        localStorage.removeItem('kortex_user');
        window.location.href = 'login.html';
      }
    });
  });
}
// Avatar e nome do usuário dinâmico na sidebar
function setDashboardUser(user) {
  if (!user) return;
  const username = user.username || user.email || 'Usuário';
  const avatarText = username[0] ? username[0].toUpperCase() : 'U';
  const avatarEl = document.getElementById('dashboardAvatarText');
  const nameEl = document.getElementById('dashboardUsername');
  const userVal = document.getElementById('dashboardUserValue');
  const emailVal = document.getElementById('dashboardEmailValue');
  const roleVal = document.getElementById('dashboardRoleValue');
  const sidebarRole = document.getElementById('dashboardRole');
  if (avatarEl) avatarEl.textContent = avatarText;
  if (nameEl) nameEl.textContent = username;
  if (userVal) userVal.textContent = username;
  if (emailVal) emailVal.textContent = user.email || '-';
  const cargo = user.role || user.cargo || '-';
  if (roleVal) roleVal.textContent = cargo;
  if (sidebarRole) sidebarRole.textContent = cargo;
}
// Ao carregar dashboard, garantir exibição correta
if (window.location.pathname.includes('dashboard.html')) {
  const user = getUserSession();
  setDashboardUser(user);
} 