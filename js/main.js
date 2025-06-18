// Infobox premium
function showInfobox(msg, timeout = 4000, type = 'info') {
  function _show() {
    const infobox = document.getElementById('infobox');
    const infoboxMsg = document.getElementById('infoboxMsg');
    if (infobox && infoboxMsg) {
      // Definir classe baseada no tipo
      infobox.className = 'infobox';
      if (type === 'error') {
        infobox.classList.add('error');
      } else if (type === 'success') {
        infobox.classList.add('success');
      } else {
        infobox.classList.add('info');
      }
      
      infoboxMsg.textContent = msg;
      infobox.style.display = 'flex';
      setTimeout(() => {
        infobox.style.opacity = 1;
        infobox.style.transform = 'translateX(-50%) translateY(0)';
      }, 10);
      if (timeout > 0) {
        setTimeout(() => {
          infobox.style.opacity = 0;
          infobox.style.transform = 'translateX(-50%) translateY(-10px)';
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

// Sistema de produtos do GitHub
const GitHubProductManager = {
  // Configurações
  config: {
    owner: 'KORTcrtl', // Nome do usuário ou organização no GitHub
    repo: 'KORTEX5', // Nome do repositório
    path: 'SITE_BACKEND/produtos.json', // Caminho para o arquivo de produtos
    branch: 'main', // Branch principal
    refreshInterval: 1000, // Intervalo de verificação em milissegundos (1 segundo)
    token: '', // Token de acesso pessoal do GitHub (removido por segurança)
    lastEtag: null, // Usado para verificar se o arquivo foi modificado
    fallbackProducts: null // Produtos de fallback caso o GitHub esteja indisponível
  },
  
  // Inicializar o gerenciador de produtos
  init: function(options = {}) {
    // Mesclar opções fornecidas com as configurações padrão
    this.config = {...this.config, ...options};
    
    // Carregar produtos do localStorage como fallback
    const cachedProducts = localStorage.getItem('kort_github_products');
    if (cachedProducts) {
      try {
        this.config.fallbackProducts = JSON.parse(cachedProducts);
        console.log('Produtos em cache carregados como fallback');
      } catch (e) {
        console.error('Erro ao carregar produtos em cache:', e);
      }
    }
    
    // Carregar produtos imediatamente
    this.fetchProducts()
      .then(products => {
        // Adicionar screenshots e vídeos de demonstração a todos os produtos
        products = addDemoContentToAllProducts(products);
        
        // Disparar evento de produtos carregados
        this.triggerProductsLoaded(products);
        
        // Iniciar verificação periódica de atualizações
        this.startPeriodicCheck();
      })
      .catch(error => {
        console.error('Erro ao carregar produtos do GitHub:', error);
        
        // Se houver produtos de fallback, usá-los
        if (this.config.fallbackProducts) {
          console.log('Usando produtos de fallback');
          // Adicionar screenshots e vídeos de demonstração aos produtos de fallback
          const productsWithDemo = addDemoContentToAllProducts(this.config.fallbackProducts);
          this.triggerProductsLoaded(productsWithDemo);
        }
      });
  },
  
  // Buscar produtos do GitHub
  fetchProducts: function() {
    return new Promise((resolve, reject) => {
      const apiUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.path}?ref=${this.config.branch}`;
      
      // Configurar headers para a requisição
      const headers = new Headers();
      headers.append('Accept', 'application/vnd.github.v3.raw');
      
      // Adicionar token de autenticação se disponível
      if (this.config.token) {
        headers.append('Authorization', `token ${this.config.token}`);
      }
      
      // Se tivermos um ETag, adicionar para verificar se o arquivo foi modificado
      if (this.config.lastEtag) {
        headers.append('If-None-Match', this.config.lastEtag);
      }
      
      // Fazer a requisição
      fetch(apiUrl, { headers })
        .then(response => {
          // Salvar o ETag para verificações futuras
          const etag = response.headers.get('ETag');
          if (etag) {
            this.config.lastEtag = etag;
          }
          
          // Se o status for 304 (Not Modified), usar os produtos em cache
          if (response.status === 304) {
            console.log('Produtos não modificados desde a última verificação');
            return this.config.fallbackProducts;
          }
          
          // Se o status não for 200 (OK), lançar erro
          if (!response.ok) {
            throw new Error(`GitHub API respondeu com status ${response.status}`);
          }
          
          // Processar a resposta como JSON
          return response.json();
        })
        .then(data => {
          // Salvar os produtos em cache
          localStorage.setItem('kort_github_products', JSON.stringify(data));
          this.config.fallbackProducts = data;
          
          // Resolver a promessa com os produtos
          resolve(data);
        })
        .catch(error => {
          console.error('Erro ao buscar produtos do GitHub:', error);
          reject(error);
        });
    });
  },
  
  // Iniciar verificação periódica de atualizações
  startPeriodicCheck: function() {
    // Limpar intervalo existente, se houver
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Configurar novo intervalo
    this.checkInterval = setInterval(() => {
      console.log('Verificando atualizações de produtos no GitHub...');
      this.fetchProducts()
        .then(products => {
          // Se os produtos forem diferentes dos atuais, disparar evento
          const currentProducts = JSON.stringify(this.config.fallbackProducts);
          const newProducts = JSON.stringify(products);
          
          if (currentProducts !== newProducts) {
            console.log('Produtos atualizados no GitHub, atualizando site...');
            // Adicionar screenshots e vídeos de demonstração aos produtos atualizados
            const productsWithDemo = addDemoContentToAllProducts(products);
            this.triggerProductsLoaded(productsWithDemo);
          } else {
            console.log('Nenhuma atualização de produtos encontrada');
          }
        })
        .catch(error => {
          console.error('Erro ao verificar atualizações de produtos:', error);
        });
    }, this.config.refreshInterval);
    
    console.log(`Verificação periódica de produtos configurada a cada ${this.config.refreshInterval / 1000} segundos`);
  },
  
  // Parar verificação periódica
  stopPeriodicCheck: function() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Verificação periódica de produtos interrompida');
    }
  },
  
  // Disparar evento de produtos carregados
  triggerProductsLoaded: function(products) {
    // Criar e disparar evento personalizado
    const event = new CustomEvent('kort_products_loaded', {
      detail: { products: products }
    });
    window.dispatchEvent(event);
  },
  
  // Obter produtos atuais
  getProducts: function() {
    return this.config.fallbackProducts || [];
  }
};

// Sistema de Carrinho de Compras
const Cart = function() {
  this.items = JSON.parse(localStorage.getItem('kort_cart')) || [];
  
  this.getItems = function() {
    return this.items;
  };
  
  this.save = function() {
    localStorage.setItem('kort_cart', JSON.stringify(this.items));
  };
  
  this.addItem = function(id, name, price, image, quantity = 1, type = 'compra', period = null) {
    // Verificar se o usuário está logado
    const user = getUserSession();
    if (!user) {
      showInfobox('Você precisa fazer login para adicionar produtos ao carrinho!', 5000);
      
      // Exibir modal de login
      setTimeout(() => {
        const loginModal = document.createElement('div');
        loginModal.className = 'login-modal';
        loginModal.innerHTML = `
          <div class="login-modal-content glass-effect">
            <div class="login-modal-header">
              <h2>Login Necessário</h2>
              <button class="close-modal-btn">&times;</button>
            </div>
            <div class="login-modal-body">
              <p>Para adicionar produtos ao carrinho, você precisa fazer login ou criar uma conta.</p>
              <div class="login-modal-buttons">
                <a href="login.html" class="login-btn">Fazer Login</a>
                <a href="login.html?register=true" class="register-btn">Criar Conta</a>
              </div>
            </div>
          </div>
        `;
        
        // Adicionar modal ao DOM
        document.body.appendChild(loginModal);
        
        // Adicionar overlay
        const overlay = document.createElement('div');
        overlay.className = 'cart-overlay';
        document.body.appendChild(overlay);
        
        // Exibir modal
        setTimeout(() => {
          overlay.classList.add('open');
          loginModal.classList.add('open');
        }, 10);
        
        // Fechar modal
        const closeBtn = loginModal.querySelector('.close-modal-btn');
        closeBtn.addEventListener('click', () => {
          loginModal.classList.remove('open');
          overlay.classList.remove('open');
          
          setTimeout(() => {
            loginModal.remove();
            overlay.remove();
          }, 300);
        });
        
        // Fechar ao clicar no overlay
        overlay.addEventListener('click', () => {
          loginModal.classList.remove('open');
          overlay.classList.remove('open');
          
          setTimeout(() => {
            loginModal.remove();
            overlay.remove();
          }, 300);
        });
      }, 1000);
      
      return false;
    }
    
    const existingItem = this.items.find(item => item.id === id);
    
    if (existingItem) {
      // Se for uma assinatura, atualizamos o período e o preço
      if (type === 'assinatura' && period) {
        existingItem.period = period;
        existingItem.price = price;
      }
      existingItem.quantity += quantity;
    } else {
      // Adicionar item com tipo e período (se aplicável)
      const newItem = { 
        id, 
        name, 
        price, 
        image, 
        quantity,
        type
      };
      
      // Adicionar período se for uma assinatura
      if (type === 'assinatura' && period) {
        newItem.period = period;
      }
      
      this.items.push(newItem);
    }
    
    this.save();
    this.updateCartIcon();
    
    // Não abre mais o carrinho automaticamente
    
    // Disparar evento de atualização do carrinho para outras páginas
    window.dispatchEvent(new CustomEvent('kort_cart_updated', {
      detail: { items: this.items }
    }));
    
    // Atualizar o botão flutuante de checkout
    this.updateFloatingCheckoutButton();
    
    showInfobox(`${name} adicionado ao carrinho!`, 3000, 'success');
    return true;
  };
  
  this.removeItem = function(id) {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      const removedItem = this.items[index];
      this.items.splice(index, 1);
      this.save();
      this.updateCartIcon();
      
      // Atualizar a exibição do carrinho sem reabri-lo
      const cartSidebar = document.querySelector('.cart-sidebar');
      if (cartSidebar && cartSidebar.classList.contains('open')) {
        this.updateCartDisplay();
      }
      
      // Atualizar o botão flutuante de checkout
      this.updateFloatingCheckoutButton();
      
      return removedItem;
    }
    return null;
  };
  
  this.updateQuantity = function(id, quantity) {
    const item = this.items.find(item => item.id === id);
    if (item) {
      if (quantity > 0) {
        item.quantity = quantity;
      } else {
        return this.removeItem(id);
      }
      this.save();
      this.updateCartIcon();
      
      // Atualizar a exibição do carrinho sem reabri-lo
      const cartSidebar = document.querySelector('.cart-sidebar');
      if (cartSidebar && cartSidebar.classList.contains('open')) {
        this.updateCartDisplay();
      }
      
      // Atualizar o botão flutuante de checkout
      this.updateFloatingCheckoutButton();
    }
  };
  
  this.clear = function() {
    this.items = [];
    this.save();
    this.updateCartIcon();
    
    // Atualizar a exibição do carrinho sem reabri-lo
    const cartSidebar = document.querySelector('.cart-sidebar');
    if (cartSidebar && cartSidebar.classList.contains('open')) {
      this.updateCartDisplay();
    }
    
    // Atualizar o botão flutuante de checkout
    this.updateFloatingCheckoutButton();
  };
  
  this.getTotal = function() {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  this.updateCartIcon = function() {
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
      const itemCount = this.items.reduce((count, item) => count + item.quantity, 0);
      
      // Remover contador existente
      const existingCounter = cartBtn.querySelector('.cart-counter');
      if (existingCounter) {
        existingCounter.remove();
      }
      
      // Adicionar contador se houver itens
      if (itemCount > 0) {
        const counter = document.createElement('span');
        counter.className = 'cart-counter';
        counter.textContent = itemCount;
        cartBtn.appendChild(counter);
      }
    }
    
    // Atualizar o botão flutuante de checkout
    this.updateFloatingCheckoutButton();
  };
  
  // Função para atualizar o botão flutuante de checkout
  this.updateFloatingCheckoutButton = function() {
    const floatingBtn = document.querySelector('.floating-checkout-btn');
    const floatingCartBtn = document.querySelector('.floating-cart-btn');
    
    if (!floatingBtn || !floatingCartBtn) return;
    
    // Se não houver itens no carrinho, ocultar o botão
    if (this.items.length === 0) {
      floatingBtn.style.display = 'none';
      floatingCartBtn.style.display = 'none';
      return;
    }
    
    // Calcular total de itens e valor
    const itemCount = this.items.reduce((count, item) => count + item.quantity, 0);
    const total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Separar itens por tipo
    const compraItems = this.items.filter(item => item.type !== 'assinatura');
    const assinaturaItems = this.items.filter(item => item.type === 'assinatura');
    
    // Atualizar contador e valor total
    const counter = floatingBtn.querySelector('.floating-cart-counter') || document.createElement('span');
    counter.className = 'floating-cart-counter';
    counter.textContent = itemCount;
    
    if (!floatingBtn.querySelector('.floating-cart-counter')) {
      floatingBtn.appendChild(counter);
    }
    
    // Atualizar texto do botão com o valor total
    const btnText = floatingBtn.querySelector('span') || document.createElement('span');
    
    // Texto diferente se houver assinaturas
    if (assinaturaItems.length > 0 && compraItems.length > 0) {
      btnText.textContent = `Finalizar Compra (R$ ${total.toFixed(2).replace('.', ',')})`;
    } else if (assinaturaItems.length > 0) {
      btnText.textContent = `Assinar Agora (R$ ${total.toFixed(2).replace('.', ',')})`;
    } else {
      btnText.textContent = `Finalizar Compra (R$ ${total.toFixed(2).replace('.', ',')})`;
    }
    
    // Exibir os botões
    floatingBtn.style.display = 'flex';
    floatingCartBtn.style.display = 'flex';
  };
  
  this.renderCart = function() {
    // Garantir que temos os itens mais recentes do carrinho
    this.items = JSON.parse(localStorage.getItem('kort_cart')) || [];
    
    // Remover carrinho existente se houver
    const existingCart = document.querySelector('.cart-sidebar');
    if (existingCart) {
      existingCart.remove();
    }
    
    // Remover overlay existente se houver
    const existingOverlay = document.querySelector('.cart-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const cartSidebar = document.createElement('div');
    cartSidebar.className = 'cart-sidebar glass-effect';
    
    // Criar o cabeçalho do carrinho
    const cartHeader = document.createElement('div');
    cartHeader.className = 'cart-header';
    cartHeader.innerHTML = `
      <h2>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
        Seu Carrinho
      </h2>
      <button class="close-cart-btn">×</button>
    `;
    
    // Criar o conteúdo do carrinho
    const cartContent = document.createElement('div');
    cartContent.className = 'cart-content';
    
    // Adicionar elementos ao carrinho
    cartSidebar.appendChild(cartHeader);
    cartSidebar.appendChild(cartContent);
    
    // Criar overlay
    const overlay = document.createElement('div');
    overlay.className = 'cart-overlay';
    
    // Adicionar ao DOM
    document.body.appendChild(overlay);
    document.body.appendChild(cartSidebar);
    
    console.log('Renderizando carrinho com', this.items.length, 'itens:', this.items);
    
    // Mostrar o carrinho (antes de preencher o conteúdo para evitar atrasos visuais)
    setTimeout(() => {
      overlay.classList.add('open');
      cartSidebar.classList.add('open');
      
      // Preencher o conteúdo do carrinho após iniciar a animação
    this.updateCartDisplay();
    }, 10);
    
    // Adicionar event listener para fechar o carrinho
    cartHeader.querySelector('.close-cart-btn').addEventListener('click', () => {
      cartSidebar.classList.add('closing');
      overlay.classList.add('closing');
      
      setTimeout(() => {
        cartSidebar.remove();
        overlay.remove();
      }, 300);
    });
    
    overlay.addEventListener('click', () => {
      cartSidebar.classList.add('closing');
      overlay.classList.add('closing');
      
      setTimeout(() => {
        cartSidebar.remove();
        overlay.remove();
      }, 300);
    });
  };
  
  this.updateCartDisplay = function() {
    // Garantir que estamos usando os itens mais recentes
    this.items = JSON.parse(localStorage.getItem('kort_cart')) || [];
    const cartItems = this.items;
    
    const cartSidebar = document.querySelector('.cart-sidebar');
    
    if (!cartSidebar) return;
    
    const cartContent = cartSidebar.querySelector('.cart-content');
    if (!cartContent) return;
    
    // Limpar o conteúdo atual
    cartContent.innerHTML = '';
    
    console.log('Atualizando exibição do carrinho com', cartItems.length, 'itens');
    
    // Se o carrinho estiver vazio
    if (cartItems.length === 0) {
      const emptyCart = document.createElement('div');
      emptyCart.className = 'empty-cart';
      emptyCart.innerHTML = `
        <p>Seu carrinho está vazio</p>
        <a href="loja.html" class="shop-now-btn">Comprar agora</a>
      `;
      cartContent.appendChild(emptyCart);
      return;
    }
    
    // Criar elementos para os itens do carrinho
    const cartItemsContainer = document.createElement('div');
    cartItemsContainer.className = 'cart-items';
    
    // Adicionar cada item ao carrinho
    cartItems.forEach(item => {
      const cartItem = document.createElement('div');
      cartItem.className = 'cart-item';
      
      // Verificar se é uma assinatura
      const isSubscription = item.type === 'assinatura';
      
      // Preparar informações adicionais para assinaturas
      let subscriptionInfo = '';
      if (isSubscription && item.period) {
        subscriptionInfo = `<div class="cart-item-subscription">
          <span class="subscription-badge">${item.period === 'anual' ? 'Assinatura Anual' : 'Assinatura Mensal'}</span>
        </div>`;
      }
      
      cartItem.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-details">
          <h3>${item.name}</h3>
          ${subscriptionInfo}
          <div class="cart-item-price">R$ ${item.price.toFixed(2)}${isSubscription ? (item.period === 'anual' ? '/ano' : '/mês') : ''}</div>
          <div class="cart-item-quantity">
            ${!isSubscription ? `
            <button class="quantity-btn minus" data-id="${item.id}">-</button>
            <span class="quantity-value">${item.quantity}</span>
            <button class="quantity-btn plus" data-id="${item.id}">+</button>
            ` : `<span class="subscription-quantity">Qtd: ${item.quantity}</span>`}
          </div>
        </div>
        <button class="remove-item-btn" data-id="${item.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      `;
      cartItemsContainer.appendChild(cartItem);
    });
    
    // Separar itens por tipo (compra e assinatura)
    const compraItems = cartItems.filter(item => item.type !== 'assinatura');
    const assinaturaItems = cartItems.filter(item => item.type === 'assinatura');
    
    // Calcular o total
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Criar o resumo do carrinho
    const cartSummary = document.createElement('div');
    cartSummary.className = 'cart-summary';
    
    // Se houver assinaturas, mostrar um aviso
    if (assinaturaItems.length > 0) {
      const subscriptionNotice = document.createElement('div');
      subscriptionNotice.className = 'subscription-notice';
      subscriptionNotice.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Assinaturas serão cobradas ${assinaturaItems.some(item => item.period === 'mensal') ? 'mensalmente' : ''}
        ${assinaturaItems.some(item => item.period === 'mensal') && assinaturaItems.some(item => item.period === 'anual') ? ' e ' : ''}
        ${assinaturaItems.some(item => item.period === 'anual') ? 'anualmente' : ''}</span>
      `;
      cartSummary.appendChild(subscriptionNotice);
    }
    
    const cartTotal = document.createElement('div');
    cartTotal.className = 'cart-total';
    cartTotal.innerHTML = `
      <span>Total</span>
      <span>R$ ${total.toFixed(2)}</span>
    `;
    
    // Botões de ação
    const cartActions = document.createElement('div');
    cartActions.className = 'cart-actions';
    
    const clearButton = document.createElement('button');
    clearButton.className = 'clear-cart-btn';
    clearButton.textContent = 'Limpar Carrinho';
    clearButton.addEventListener('click', () => {
      this.clear();
      showInfobox('Carrinho esvaziado.');
    });
    
    const checkoutButton = document.createElement('a');
    checkoutButton.href = 'checkout.html';
    checkoutButton.className = 'checkout-btn';
    checkoutButton.textContent = 'Finalizar Compra';
    
    cartActions.appendChild(clearButton);
    cartActions.appendChild(checkoutButton);
    
    cartSummary.appendChild(cartTotal);
    cartSummary.appendChild(cartActions);
    
    // Adicionar elementos ao carrinho
    cartContent.appendChild(cartItemsContainer);
    cartContent.appendChild(cartSummary);
    
    // Adicionar event listeners para os botões de quantidade e remover
    const self = this;
    
    cartContent.querySelectorAll('.quantity-btn.minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = cartItems.find(item => item.id === id);
        if (item) {
          self.updateQuantity(id, item.quantity - 1);
        }
      });
    });
    
    cartContent.querySelectorAll('.quantity-btn.plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = cartItems.find(item => item.id === id);
        if (item) {
          self.updateQuantity(id, item.quantity + 1);
        }
      });
    });
    
    cartContent.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        self.removeItem(id);
        showInfobox('Item removido do carrinho.');
      });
    });
    
    // Garantir que o carrinho esteja visível
    if (cartSidebar && !cartSidebar.classList.contains('open')) {
      cartSidebar.classList.add('open');
    }
  };
};

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
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
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
  // Determinar se estamos na raiz do site ou em um subdiretório
  const pathname = window.location.pathname;
  let basePath = '../html/';
  
  // Verificar se estamos na raiz ou em um caminho que não inclui /html/
  if (pathname === '/' || pathname === '/index.html' || !pathname.includes('/html/')) {
    console.log('Caminho detectado como raiz ou fora da pasta html');
    basePath = 'html/';
  }
  
  console.log('Caminho base para navegação:', basePath);

  // Redirecionar para login/registro ao clicar nos links do menu de perfil
  const profileLoginLink = document.querySelector('.profile-dropdown .login-link');
  const profileRegisterLink = document.querySelector('.profile-dropdown .register-link');
  if (profileLoginLink) {
    profileLoginLink.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Redirecionando para login:', 'login.html');
      window.location.href = 'login.html';
    });
  }


  if (profileRegisterLink) {
    profileRegisterLink.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Redirecionando para registro:', 'login.html#register');
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
    profileDropdown.innerHTML = '<a href="' + 'dashboard.html" class="dashboard-link">Minha Conta</a><a href="#" class="logout-link">Logout</a>';
    // Logout
    const logoutLink = document.querySelector('.logout-link');
    if (logoutLink) {
      logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('kortex_user');
        localStorage.removeItem('kortex_token');
        clearUserSession();
        triggerInfoboxNextPage('Você saiu da sua conta.');
        window.location.reload();
      });
    }
  }

  // Inicializar o carrinho
  const cart = new Cart();
  
  // Atualizar o ícone do carrinho na inicialização
  cart.updateCartIcon();
  
  // Monitorar alterações no localStorage para manter o carrinho sincronizado
  window.addEventListener('storage', function(event) {
    if (event.key === 'kort_cart') {
      console.log('Alteração detectada no localStorage do carrinho');
      cart.items = JSON.parse(localStorage.getItem('kort_cart')) || [];
      cart.updateCartIcon();
      
      // Atualizar o carrinho se estiver aberto
      const cartSidebar = document.querySelector('.cart-sidebar');
      if (cartSidebar && cartSidebar.classList.contains('open')) {
        cart.updateCartDisplay();
      }
    }
  });
  
  // Evento para abrir o carrinho
  const cartBtn = document.querySelector('.cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', function() {
      cart.renderCart();
    });
  }
  
  // Adicionar eventos para os botões "Adicionar ao Carrinho"
  const addCartBtns = document.querySelectorAll('.add-cart');
  if (addCartBtns.length > 0) {
    addCartBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const productCard = this.closest('.product-card') || this.closest('.store-highlight-card') || this.closest('.bundle-card');
        if (productCard) {
          const name = productCard.querySelector('h3')?.textContent || productCard.querySelector('h1')?.textContent;
          const priceEl = productCard.querySelector('.promo-price') || productCard.querySelector('.bundle-current-price');
          const price = priceEl ? parseFloat(priceEl.textContent.replace('R$', '').trim()) : 59.90;
          const image = productCard.querySelector('img')?.src || '../assets/imgs/LOGO_LOJA.png';
          const id = name.toLowerCase().replace(/\s+/g, '-');
          
          const success = cart.addItem(id, name, price, image);
          
          // Se o produto foi adicionado com sucesso, abrir o carrinho após um pequeno delay
          if (success) {
            setTimeout(() => {
              cart.renderCart();
            }, 300); // Delay para dar tempo do infobox aparecer primeiro
          }
        }
      });
    });
  }

  // Funcionalidade para a página de checkout
  if (window.location.pathname.includes('checkout.html')) {
    console.log('Página de checkout detectada');
    
    // Desabilitar todas as animações na página
    document.querySelectorAll('.checkout-page *').forEach(el => {
      if (el.style) {
        el.style.animation = 'none';
        el.style.transition = 'none';
        el.style.opacity = '1';
        el.style.visibility = 'visible';
      }
    });
    
    // Carregar itens do checkout com prioridade
    setTimeout(() => {
      loadCheckoutItems();
      setupPaymentMethods();
      setupCheckoutForm();
    }, 0);
    
    // Verificar visibilidade dos elementos após o carregamento
    setTimeout(() => {
      console.log('Verificando visibilidade dos elementos do checkout...');
      const container = document.getElementById('checkout-items-container');
      const items = document.querySelectorAll('.checkout-item');
      
      console.log('Container de itens:', container);
      console.log('Número de itens encontrados:', items.length);
      
      if (container && items.length > 0) {
        items.forEach((item, index) => {
          // Forçar visibilidade
          item.style.display = 'flex';
          item.style.visibility = 'visible';
          item.style.opacity = '1';
          item.style.animation = 'none';
          item.style.transition = 'none';
          item.style.transform = 'none';
          
          // Verificar elementos filhos
          const img = item.querySelector('.checkout-item-img');
          const details = item.querySelector('.checkout-item-details');
          const total = item.querySelector('.checkout-item-total');
          
          if (img) {
            img.style.display = 'block';
            img.style.visibility = 'visible';
            img.style.opacity = '1';
          }
          if (details) {
            details.style.display = 'block';
            details.style.visibility = 'visible';
            details.style.opacity = '1';
          }
          if (total) {
            total.style.display = 'block';
            total.style.visibility = 'visible';
            total.style.opacity = '1';
          }
        });
      } else if (container) {
        // Se não encontrou itens, tentar recarregar
        loadCheckoutItems();
      }
    }, 100);
    
    // Adicionar evento para o botão de finalizar compra
    const completeBtn = document.getElementById('complete-purchase');
    if (completeBtn) {
      completeBtn.addEventListener('click', function() {
        const selectedPayment = document.querySelector('input[name="payment"]:checked');
        if (!selectedPayment) {
          showInfobox('Selecione um método de pagamento');
          return;
        }
        
        // Simular processamento
        completeBtn.disabled = true;
        completeBtn.textContent = 'Processando...';
        
        setTimeout(() => {
          // Limpar carrinho
          localStorage.removeItem('kort_cart');
          
          // Redirecionar para confirmação
          window.location.href = 'dashboard.html?order=success';
        }, 2000);
      });
    }
    
    // Adicionar listener para atualização do carrinho
    window.addEventListener('kort_cart_updated', function(event) {
      console.log('Evento de atualização do carrinho detectado na página de checkout');
      loadCheckoutItems();
    });
  }

  // Funcionalidade para a seção "Meus Produtos" na dashboard
  if (window.location.pathname.includes('dashboard.html')) {
    setupMyProducts();
  }

  // Inicializar o carrossel de depoimentos
  initTestimonialCarousel();
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
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const username = document.getElementById('loginUsername').value;
      const password = document.getElementById('loginPassword').value;
      const loginMsg = document.getElementById('loginMsg');
      loginMsg.textContent = 'Entrando...';
      loginMsg.style.color = '#7b8cfd';
      
      try {
        // Usar URL relativa em vez de localhost
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          localStorage.setItem('kortex_user', JSON.stringify(data.user));
          localStorage.setItem('kortex_token', data.token);
          triggerInfoboxNextPage('Bem-vindo, ' + data.user.username + '!');
          setTimeout(() => { window.location.href = 'index.html'; }, 200);
        } else {
          loginMsg.textContent = data.error || 'Usuário ou senha inválidos.';
          loginMsg.style.color = '#ff7b7b';
        }
      } catch (err) {
        loginMsg.textContent = 'Erro ao conectar ao servidor.';
        loginMsg.style.color = '#ff7b7b';
        console.error('Erro de conexão:', err);
      }
    });
  }
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const username = document.getElementById('registerUsername').value;
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      const loginMsg = document.getElementById('loginMsg');
      loginMsg.textContent = 'Criando conta...';
      loginMsg.style.color = '#7b8cfd';
      try {
        // Usar URL relativa em vez de localhost
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
          triggerInfoboxNextPage('Conta criada com sucesso! Faça login.');
          setTimeout(() => { window.location.href = 'login.html'; }, 400);
        } else {
          loginMsg.textContent = data.error || 'Erro ao criar conta.';
          loginMsg.style.color = '#ff7b7b';
        }
      } catch (err) {
        loginMsg.textContent = 'Erro ao conectar ao servidor.';
        loginMsg.style.color = '#ff7b7b';
        console.error('Erro de conexão:', err);
      }
    });
  }
  const recoverFormPanel = document.getElementById('recoverFormPanel');
  if (recoverFormPanel) {
    recoverFormPanel.addEventListener('submit', function(e) {
      e.preventDefault();
      triggerInfoboxNextPage('Se os dados estiverem corretos, você receberá instruções para recuperar sua conta.');
      
      // Determinar caminho base para redirecionamento
      const isRootPath = window.location.pathname === '/' || window.location.pathname === '/index.html';
      const basePath = isRootPath ? 'html/' : '../html/';
      
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
    
    // Determinar caminho base para redirecionamento
    const isRootPath = window.location.pathname === '/' || window.location.pathname === '/index.html';
    const basePath = isRootPath ? 'html/' : '../html/';
    
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
        
        // Determinar caminho base para redirecionamento
        const isRootPath = window.location.pathname === '/' || window.location.pathname === 'index.html';
        const basePath = isRootPath ? 'html/' : '';
        
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
        
        // Determinar caminho base para redirecionamento
        const isRootPath = window.location.pathname === '/' || window.location.pathname === '/index.html';
        const basePath = isRootPath ? 'html/' : '../html/';
        
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

// Funções para o Checkout
function loadCheckoutItems() {
  const checkoutItemsContainer = document.querySelector('.checkout-items');
  if (!checkoutItemsContainer) return;
  
  // Obter itens do carrinho
  const cart = new Cart();
  const cartItems = cart.items;
  
  // Se não houver itens, redirecionar para a loja
  if (cartItems.length === 0) {
    window.location.href = 'loja.html';
    return;
  }
  
  // Limpar o container
  checkoutItemsContainer.innerHTML = '';
  
  // Separar itens por tipo
  const compraItems = cartItems.filter(item => item.type !== 'assinatura');
  const assinaturaItems = cartItems.filter(item => item.type === 'assinatura');
  
  // Verificar se há assinaturas
  const hasSubscriptions = assinaturaItems.length > 0;
  
  // Adicionar título para produtos de compra se houver ambos tipos
  if (compraItems.length > 0 && hasSubscriptions) {
    const compraTitle = document.createElement('h3');
    compraTitle.className = 'checkout-section-title';
    compraTitle.textContent = 'Produtos';
    checkoutItemsContainer.appendChild(compraTitle);
  }
  
  // Adicionar produtos de compra
  compraItems.forEach(item => {
    const checkoutItem = document.createElement('div');
    checkoutItem.className = 'checkout-item';
    checkoutItem.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="checkout-item-img">
      <div class="checkout-item-details">
        <h3>${item.name}</h3>
        <div class="checkout-item-price">R$ ${item.price.toFixed(2).replace('.', ',')}</div>
        <div class="checkout-item-quantity">
        <button class="quantity-btn minus" data-id="${item.id}">-</button>
          <span class="quantity-value">${item.quantity}</span>
        <button class="quantity-btn plus" data-id="${item.id}">+</button>
      </div>
      </div>
      <button class="remove-item-btn" data-id="${item.id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    `;
    checkoutItemsContainer.appendChild(checkoutItem);
  });
  
  // Adicionar título para assinaturas se houver
  if (hasSubscriptions) {
    const subscriptionTitle = document.createElement('h3');
    subscriptionTitle.className = 'checkout-section-title';
    subscriptionTitle.textContent = 'Assinaturas';
    
    // Adicionar um aviso sobre assinaturas
    const subscriptionNotice = document.createElement('div');
    subscriptionNotice.className = 'subscription-notice checkout-subscription-notice';
    subscriptionNotice.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>Assinaturas serão cobradas ${assinaturaItems.some(item => item.period === 'mensal') ? 'mensalmente' : ''}
      ${assinaturaItems.some(item => item.period === 'mensal') && assinaturaItems.some(item => item.period === 'anual') ? ' e ' : ''}
      ${assinaturaItems.some(item => item.period === 'anual') ? 'anualmente' : ''} após a confirmação do pagamento.</span>
    `;
    
    checkoutItemsContainer.appendChild(subscriptionTitle);
    checkoutItemsContainer.appendChild(subscriptionNotice);
  }
  
  // Adicionar assinaturas
  assinaturaItems.forEach(item => {
    const checkoutItem = document.createElement('div');
    checkoutItem.className = 'checkout-item subscription-item';
    
    // Preparar informações adicionais para assinaturas
    const subscriptionInfo = `<div class="checkout-item-subscription">
      <span class="subscription-badge">${item.period === 'anual' ? 'Assinatura Anual' : 'Assinatura Mensal'}</span>
    </div>`;
    
    checkoutItem.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="checkout-item-img">
      <div class="checkout-item-details">
        <h3>${item.name}</h3>
        ${subscriptionInfo}
        <div class="checkout-item-price">R$ ${item.price.toFixed(2).replace('.', ',')}${item.period === 'anual' ? '/ano' : '/mês'}</div>
        <div class="checkout-item-quantity">
          <span class="subscription-quantity">Qtd: ${item.quantity}</span>
        </div>
      </div>
      <button class="remove-item-btn" data-id="${item.id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    `;
    checkoutItemsContainer.appendChild(checkoutItem);
  });
  
  // Adicionar eventos aos botões de quantidade
  const minusBtns = document.querySelectorAll('.checkout-items .quantity-btn.minus');
  const plusBtns = document.querySelectorAll('.checkout-items .quantity-btn.plus');
  const removeBtns = document.querySelectorAll('.checkout-items .remove-item-btn');
  
  minusBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      updateCartItemQuantity(this.dataset.id, -1);
    });
  });
  
  plusBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      updateCartItemQuantity(this.dataset.id, 1);
    });
  });
  
  removeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      removeCartItem(this.dataset.id);
    });
  });
  
  // Atualizar o resumo do pedido
  updateOrderSummary();
}

// Função para atualizar a quantidade de um item no carrinho
function updateCartItemQuantity(itemId, change) {
  const items = JSON.parse(localStorage.getItem('kort_cart') || '[]');
  const itemIndex = items.findIndex(item => item.id === itemId);
  
  if (itemIndex !== -1) {
    items[itemIndex].quantity += change;
    
    // Remover o item se a quantidade for menor ou igual a zero
    if (items[itemIndex].quantity <= 0) {
      items.splice(itemIndex, 1);
    }
    
    localStorage.setItem('kort_cart', JSON.stringify(items));
    loadCheckoutItems();
  }
}

// Função para remover um item do carrinho
function removeCartItem(itemId) {
  const items = JSON.parse(localStorage.getItem('kort_cart') || '[]');
  const itemIndex = items.findIndex(item => item.id === itemId);
  
  if (itemIndex !== -1) {
    items.splice(itemIndex, 1);
    localStorage.setItem('kort_cart', JSON.stringify(items));
    loadCheckoutItems();
  }
}

function setupPaymentMethods() {
  const paymentMethods = document.querySelectorAll('input[name="payment"]');
  const paymentForms = document.querySelectorAll('.payment-form');
  
  if (!paymentMethods.length || !paymentForms.length) {
    console.log('Elementos de métodos de pagamento não encontrados');
    return;
  }
  
  console.log('Configurando métodos de pagamento:', paymentMethods.length, 'métodos encontrados');
  
  paymentMethods.forEach(method => {
    method.addEventListener('change', function() {
      console.log('Método de pagamento alterado para:', this.id);
      paymentForms.forEach(form => form.style.display = 'none');
      document.getElementById(`${this.id}-form`).style.display = 'block';
    });
  });
  
  // Copiar código PIX
  const copyBtn = document.querySelector('.copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      const pixCode = this.previousElementSibling.textContent;
      navigator.clipboard.writeText(pixCode).then(() => {
        showInfobox('Código PIX copiado para a área de transferência');
      });
    });
  }
  
  // Gerar boleto
  const boletoBtn = document.querySelector('.generate-boleto-btn');
  if (boletoBtn) {
    boletoBtn.addEventListener('click', function() {
      showInfobox('Boleto gerado! Verifique seu email.');
      this.textContent = 'Boleto Enviado';
      this.disabled = true;
    });
  }
}

function setupCheckoutForm() {
  // Formatar número do cartão
  const cardNumber = document.getElementById('card-number');
  if (cardNumber) {
    cardNumber.addEventListener('input', function() {
      let value = this.value.replace(/\D/g, '');
      if (value.length > 16) value = value.slice(0, 16);
      
      // Formatar com espaços a cada 4 dígitos
      let formattedValue = '';
      for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) formattedValue += ' ';
        formattedValue += value[i];
      }
      
      this.value = formattedValue;
    });
  }
  
  // Formatar data de validade
  const cardExpiry = document.getElementById('card-expiry');
  if (cardExpiry) {
    cardExpiry.addEventListener('input', function() {
      let value = this.value.replace(/\D/g, '');
      if (value.length > 4) value = value.slice(0, 4);
      
      if (value.length > 2) {
        this.value = value.slice(0, 2) + '/' + value.slice(2);
      } else {
        this.value = value;
      }
    });
  }
  
  // Formatar CVV
  const cardCvv = document.getElementById('card-cvv');
  if (cardCvv) {
    cardCvv.addEventListener('input', function() {
      let value = this.value.replace(/\D/g, '');
      if (value.length > 3) value = value.slice(0, 3);
      this.value = value;
    });
  }
}

// Funções para a seção "Meus Produtos" na dashboard
function setupMyProducts() {
  // Verificar se estamos na seção de produtos
  const myProductsSection = document.querySelector('.my-products-section');
  if (!myProductsSection) {
    // Criar a seção de "Meus Produtos" se não existir
    createMyProductsSection();
  }
  
  // Verificar se há uma mensagem de sucesso de pedido
  if (window.location.search.includes('order=success')) {
    showInfobox('Compra realizada com sucesso! Seus produtos estão disponíveis em "Meus Produtos".');
    
    // Adicionar os produtos comprados à lista de produtos do usuário
    const boughtItems = [
      { id: 'kortex-5', name: 'Kortex 5', image: '../assets/imgs/kortex5_icone.png', key: generateLicenseKey() },
      { id: 'app-booster', name: 'App Booster', image: '../assets/imgs/print_app.png', key: generateLicenseKey() }
    ];
    
    // Salvar produtos na localStorage (em uma aplicação real, isso seria no servidor)
    localStorage.setItem('kort_user_products', JSON.stringify(boughtItems));
    
    // Limpar parâmetro da URL
    window.history.replaceState({}, document.title, 'dashboard.html');
    
    // Atualizar a seção de produtos
    updateMyProductsSection();
  } else {
    // Apenas atualizar a seção de produtos
    updateMyProductsSection();
  }
}

function createMyProductsSection() {
  const dashboard = document.querySelector('.dashboard-content');
  if (!dashboard) return;
  
  const myProductsSection = document.createElement('section');
  myProductsSection.className = 'dashboard-section my-products-section';
  myProductsSection.innerHTML = `
    <div class="section-header">
      <h2>Meus Produtos</h2>
      <p>Gerencie seus produtos adquiridos</p>
    </div>
    <div class="my-products-container">
      <div class="my-products-grid" id="my-products-grid">
        <!-- Os produtos serão inseridos aqui dinamicamente -->
      </div>
    </div>
  `;
  
  dashboard.appendChild(myProductsSection);
}

function updateMyProductsSection() {
  const productsGrid = document.getElementById('my-products-grid');
  if (!productsGrid) return;
  
  productsGrid.innerHTML = '';
  
  const userProducts = JSON.parse(localStorage.getItem('kort_user_products') || '[]');
  
  if (userProducts.length === 0) {
    productsGrid.innerHTML = '<p class="no-products">Você ainda não possui produtos. <a href="loja.html">Visite nossa loja</a> para adquirir.</p>';
    return;
  }
  
  userProducts.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'my-product-card glass-effect';
    productCard.innerHTML = `
      <div class="product-header">
        <img src="${product.image}" alt="${product.name}" class="product-img">
        <h3>${product.name}</h3>
      </div>
      <div class="product-details">
        <div class="license-key">
          <span>Chave de Licença:</span>
          <div class="key-container">
            <span class="key-value">${product.key}</span>
            <button class="copy-key-btn" data-key="${product.key}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M8 4v12h12V4H8zm-2-2h16v16H6V2z M2 8h2v16h16v-2H4V8z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="product-actions">
          <button class="download-btn" data-product="${product.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 16l-6-6h4V4h4v6h4l-6 6zm-8 4v-2h16v2H4z" fill="currentColor"/>
            </svg>
            Download
          </button>
          <button class="support-btn" data-product="${product.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v8z" fill="currentColor"/>
            </svg>
            Suporte
          </button>
        </div>
      </div>
    `;
    
    productsGrid.appendChild(productCard);
  });
  
  // Adicionar eventos para os botões
  const copyKeyBtns = document.querySelectorAll('.copy-key-btn');
  copyKeyBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const key = this.dataset.key;
      navigator.clipboard.writeText(key).then(() => {
        showInfobox('Chave de licença copiada para a área de transferência');
      });
    });
  });
  
  const downloadBtns = document.querySelectorAll('.download-btn');
  downloadBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const productId = this.dataset.product;
      showInfobox(`Iniciando download de ${productId}...`);
      
      // Simular download (em uma aplicação real, isso seria um link de download real)
      setTimeout(() => {
        showInfobox(`Download de ${productId} concluído!`);
      }, 2000);
    });
  });
  
  const supportBtns = document.querySelectorAll('.support-btn');
  supportBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const productId = this.dataset.product;
      showInfobox(`Abrindo suporte para ${productId}...`);
      
      // Simular redirecionamento para página de suporte
      setTimeout(() => {
        window.location.href = '#suporte';
      }, 1000);
    });
  });
}

// Função auxiliar para gerar chave de licença
function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  
  // Formato: XXXX-XXXX-XXXX-XXXX
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) key += '-';
  }
  
  return key;
}

// Carrossel de depoimentos
function initTestimonialCarousel() {
  const groups = document.querySelectorAll('.testimonial-group');
  const dots = document.querySelectorAll('.testimonial-dots .dot');
  const prevBtn = document.querySelector('.testimonial-nav.prev');
  const nextBtn = document.querySelector('.testimonial-nav.next');
  
  if (!groups.length || !dots.length) return;
  
  let currentIndex = 0;
  let interval;
  
  // Função para mostrar um grupo específico
  function showGroup(index) {
    groups.forEach(group => group.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    groups[index].classList.add('active');
    dots[index].classList.add('active');
    currentIndex = index;
  }
  
  // Avançar para o próximo grupo
  function nextGroup() {
    const nextIndex = (currentIndex + 1) % groups.length;
    showGroup(nextIndex);
  }
  
  // Voltar para o grupo anterior
  function prevGroup() {
    const prevIndex = (currentIndex - 1 + groups.length) % groups.length;
    showGroup(prevIndex);
  }
  
  // Iniciar o autoplay
  function startAutoplay() {
    interval = setInterval(nextGroup, 5000);
  }
  
  // Parar o autoplay
  function stopAutoplay() {
    clearInterval(interval);
  }
  
  // Event listeners
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevGroup();
      stopAutoplay();
      startAutoplay();
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextGroup();
      stopAutoplay();
      startAutoplay();
    });
  }
  
  // Adicionar event listeners para os dots
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showGroup(index);
      stopAutoplay();
      startAutoplay();
    });
  });
  
  // Pausar o autoplay quando o mouse estiver sobre o carrossel
  const testimonialContainer = document.querySelector('.testimonials-container');
  if (testimonialContainer) {
    testimonialContainer.addEventListener('mouseenter', stopAutoplay);
    testimonialContainer.addEventListener('mouseleave', startAutoplay);
  }
  
  // Iniciar o carrossel
  startAutoplay();
}

// Animação de contagem para estatísticas
function initCountUpAnimation() {
  const countElements = document.querySelectorAll('.count-up');
  
  if (!countElements.length) return;
  
  const options = {
    root: null,
    rootMargin: '0px',
    threshold: 0.5
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const target = parseFloat(element.dataset.target);
        const isDecimal = element.dataset.decimal === 'true';
        const duration = 2000; // 2 segundos
        const frameDuration = 1000 / 60; // 60fps
        const totalFrames = Math.round(duration / frameDuration);
        let frame = 0;
        
        const countUp = () => {
          frame++;
          const progress = frame / totalFrames;
          const currentCount = isDecimal 
            ? (progress * target).toFixed(1) 
            : Math.floor(progress * target);
          
          element.textContent = currentCount;
          
          if (frame < totalFrames) {
            requestAnimationFrame(countUp);
          } else {
            element.textContent = isDecimal ? target.toFixed(1) : target;
            observer.unobserve(element);
          }
        };
        
        requestAnimationFrame(countUp);
      }
    });
  }, options);
  
  countElements.forEach(element => {
    observer.observe(element);
  });
}

// Função para inicializar o Mercado Pago
function initMercadoPago() {
  // Verificar se o script do Mercado Pago já foi carregado
  if (window.MercadoPago) {
    setupMercadoPago();
    return;
  }
  
  // Carregar o script do Mercado Pago
  const script = document.createElement('script');
  script.src = 'https://sdk.mercadopago.com/js/v2';
  script.onload = setupMercadoPago;
  document.body.appendChild(script);
}

// Configurar o Mercado Pago
function setupMercadoPago() {
  // Inicializar o SDK do Mercado Pago
  // Nota: Em produção, você deve substituir TEST-XXXX pelo seu PUBLIC KEY real
  const mp = new MercadoPago('TEST-a1234567-1234-1234-1234-123456789012', {
    locale: 'pt-BR'
  });
  
  // Criar o botão de pagamento
  const completeBtn = document.getElementById('complete-purchase');
  if (completeBtn) {
    completeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      const selectedPayment = document.querySelector('input[name="payment"]:checked');
      if (!selectedPayment) {
        showInfobox('Selecione um método de pagamento');
        return;
      }
      
      // Simular processamento
      completeBtn.disabled = true;
      completeBtn.textContent = 'Processando...';
      
      // Obter os itens do carrinho
      const items = JSON.parse(localStorage.getItem('kort_cart') || '[]');
      if (items.length === 0) {
        showInfobox('Seu carrinho está vazio');
        completeBtn.disabled = false;
        completeBtn.textContent = 'Finalizar Compra';
        return;
      }
      
      // Preparar os dados para o Mercado Pago
      const paymentData = {
        transaction_amount: items.reduce((total, item) => total + (item.price * item.quantity), 0) * 0.9, // Aplicar 10% de desconto
        description: `Compra na KORT STORE - ${items.length} item(s)`,
        payment_method_id: selectedPayment.id === 'credit-card' ? 'credit_card' : 
                          selectedPayment.id === 'pix' ? 'pix' : 'bolbradesco',
        payer: {
          email: 'cliente@exemplo.com', // Em produção, use o email do cliente logado
        }
      };
      
      // Se for cartão de crédito, adicionar os dados do cartão
      if (selectedPayment.id === 'credit-card') {
        const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
        const cardExpiry = document.getElementById('card-expiry').value.split('/');
        const cardCvv = document.getElementById('card-cvv').value;
        const cardName = document.getElementById('card-name').value;
        
        if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
          showInfobox('Preencha todos os dados do cartão');
          completeBtn.disabled = false;
          completeBtn.textContent = 'Finalizar Compra';
          return;
        }
        
        // Obter token do cartão
        mp.createCardToken({
          cardNumber,
          cardholderName: cardName,
          cardExpirationMonth: cardExpiry[0],
          cardExpirationYear: cardExpiry[1],
          securityCode: cardCvv
        }).then(token => {
          // Adicionar token ao paymentData
          paymentData.token = token.id;
          
          // Enviar para o backend processar o pagamento
          processPayment(paymentData);
        }).catch(error => {
          showInfobox('Erro ao processar o cartão: ' + error.message);
          completeBtn.disabled = false;
          completeBtn.textContent = 'Finalizar Compra';
        });
      } else {
        // Para PIX ou Boleto, enviar direto para o backend
        processPayment(paymentData);
      }
    });
  }
}

// Função para processar o pagamento no backend
function processPayment(paymentData) {
  // Obter token de autenticação
  const token = localStorage.getItem('kortex_token');
  
  if (!token) {
    // Se o usuário não estiver logado, redirecionar para login
    showInfobox('Você precisa estar logado para finalizar a compra');
    setTimeout(() => {
      window.location.href = 'login.html?redirect=checkout';
    }, 2000);
    return;
  }
  
  // Obter os itens do carrinho
  const items = JSON.parse(localStorage.getItem('kort_cart') || '[]');
  
  // Preparar dados para enviar ao backend
  const requestData = {
    paymentMethod: paymentData.payment_method_id,
    items: items,
    total: paymentData.transaction_amount,
    token: paymentData.token // Para pagamentos com cartão
  };
  
  // Enviar para o backend
  fetch('/api/process-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(requestData)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Erro ao processar pagamento');
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      // Limpar carrinho
      localStorage.removeItem('kort_cart');
      
      // Redirecionar para confirmação
      window.location.href = 'dashboard.html?order=success';
    } else {
      throw new Error(data.error || 'Erro ao processar pagamento');
    }
  })
  .catch(error => {
    // Mostrar erro
    showInfobox('Erro ao processar o pagamento: ' + error.message);
    
    // Reativar botão
    const completeBtn = document.getElementById('complete-purchase');
    if (completeBtn) {
      completeBtn.disabled = false;
      completeBtn.textContent = 'Finalizar Compra';
    }
  });
}

// Inicializar funcionalidades quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar o carrossel de depoimentos
  initTestimonialCarousel();
  
  // Inicializar animação de contagem
  initCountUpAnimation();
  
  // ... existing code ...
});

// Navegação da dashboard
document.addEventListener('DOMContentLoaded', function() {
  // Verificar se estamos na página dashboard
  const sidebarItems = document.querySelectorAll('.sidebar-menu-item');
  if (sidebarItems.length > 0) {
    sidebarItems.forEach(item => {
      item.addEventListener('click', function() {
        // Remover classe ativa de todos os itens
        sidebarItems.forEach(i => i.classList.remove('active'));
        // Adicionar classe ativa ao item clicado
        this.classList.add('active');
        
        // Mostrar o painel correspondente
        const tabId = this.getAttribute('data-tab');
        
        // Se for logout, redirecionar para a página inicial
        if (tabId === 'logout') {
          localStorage.removeItem('userToken');
          window.location.href = 'index.html';
          return;
        }
        
        // Esconder todos os painéis
        document.querySelectorAll('.dashboard-panel').forEach(panel => {
          panel.style.display = 'none';
          panel.classList.remove('animate-in');
        });
        
        // Mostrar o painel correspondente com animação
        const targetPanel = document.getElementById('tab-' + tabId);
        if (targetPanel) {
          setTimeout(() => {
            targetPanel.style.display = 'block';
            setTimeout(() => {
              targetPanel.classList.add('animate-in');
            }, 50);
          }, 100);
        }
      });
    });
  }
  
  // Funcionalidade para copiar chaves de licença
  const copyButtons = document.querySelectorAll('.copy-key-btn');
  if (copyButtons.length > 0) {
    copyButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const key = this.getAttribute('data-key');
        navigator.clipboard.writeText(key).then(() => {
          // Mostrar mensagem de sucesso
          showInfobox('Chave copiada para a área de transferência!', 'success');
          
          // Efeito visual no botão
          this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>';
          this.style.color = '#7bffb8';
          
          setTimeout(() => {
            this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
            this.style.color = '';
          }, 2000);
        }).catch(err => {
          showInfobox('Erro ao copiar a chave: ' + err, 'error');
        });
      });
    });
  }
  
  // Botões de download
  const downloadButtons = document.querySelectorAll('.download-btn');
  if (downloadButtons.length > 0) {
    downloadButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const product = this.getAttribute('data-product');
        // Simular início de download
        this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 2.97-2.17 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93 0-4.42-3.58-8-8-8z"/></svg> Baixando...';
        this.disabled = true;
        
        // Simular download (em produção, aqui seria o link real)
        setTimeout(() => {
          this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> Baixado';
          showInfobox(`Download de ${product} iniciado!`, 'success');
          
          setTimeout(() => {
            this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h16v2H4z"/></svg> Download';
            this.disabled = false;
          }, 3000);
        }, 1500);
      });
    });
  }
  
  // Botões de suporte
  const supportButtons = document.querySelectorAll('.support-btn');
  if (supportButtons.length > 0) {
    supportButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const product = this.getAttribute('data-product');
        showInfobox(`Abrindo suporte para ${product}...`, 'info');
        // Aqui seria o redirecionamento para a página de suporte
      });
    });
  }
  
  // Carregar dados do usuário na dashboard
  if (document.getElementById('dashboardUsername')) {
    loadUserDashboard();
  }
});

// Função para exibir mensagens informativas
function showInfobox(message, type = 'info') {
  const infobox = document.getElementById('infobox');
  const infoboxMsg = document.getElementById('infoboxMsg');
  
  if (infobox && infoboxMsg) {
    infoboxMsg.textContent = message;
    
    // Definir classe baseada no tipo
    infobox.className = 'infobox';
    if (type === 'error') {
      infobox.classList.add('error');
    } else if (type === 'success') {
      infobox.classList.add('success');
    } else {
      infobox.classList.add('info');
    }
    
    // Mostrar a mensagem
    infobox.style.display = 'flex';
    
    // Adicionar animação de entrada
    setTimeout(() => {
      infobox.style.opacity = 1;
      infobox.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    // Fechar automaticamente após 4 segundos
    setTimeout(() => {
      infobox.style.opacity = 0;
      infobox.style.transform = 'translateX(-50%) translateY(-10px)';
      setTimeout(() => {
        infobox.style.display = 'none';
      }, 300);
    }, 4000);
    
    // Botão de fechar
    const closeBtn = document.getElementById('closeInfobox');
    if (closeBtn) {
      closeBtn.onclick = function() {
        infobox.style.opacity = 0;
        infobox.style.transform = 'translateX(-50%) translateY(-10px)';
        setTimeout(() => {
          infobox.style.display = 'none';
        }, 300);
      };
    }
  }
}

// Função para carregar dados do usuário na dashboard
function loadUserDashboard() {
  const token = localStorage.getItem('userToken');
  
  if (token) {
    try {
      // Decodificar o token (em produção, verificar com o backend)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const userData = JSON.parse(atob(base64));
      
      // Preencher os dados do usuário
      document.getElementById('dashboardUsername').textContent = userData.username || 'Usuário';
      document.getElementById('dashboardRole').textContent = userData.cargo || 'Membro';
      
      // Avatar com inicial do nome
      const avatarText = document.getElementById('dashboardAvatarText');
      if (avatarText && userData.username) {
        avatarText.textContent = userData.username.charAt(0).toUpperCase();
      }
      
      // Preencher informações detalhadas
      document.getElementById('dashboardUserValue').textContent = userData.username || '-';
      document.getElementById('dashboardEmailValue').textContent = userData.email || '-';
      document.getElementById('dashboardRoleValue').textContent = userData.cargo || 'Membro';
      
      // Adicionar efeitos visuais após carregar
      addDashboardEffects();
      
    } catch (e) {
      console.error('Erro ao decodificar token:', e);
      // Redirecionar para login em caso de erro
      // window.location.href = 'login.html';
    }
  } else {
    // Token não encontrado, redirecionar para login
    // window.location.href = 'login.html';
  }
}

// Adicionar efeitos visuais à dashboard
function addDashboardEffects() {
  // Efeito de entrada para os cards
  const cards = document.querySelectorAll('.panel-card, .my-product-card');
  cards.forEach((card, index) => {
    card.style.animationDelay = `${0.1 + (index * 0.1)}s`;
  });
  
  // Efeito de hover nos botões
  const buttons = document.querySelectorAll('.dashboard-btn, .download-btn, .support-btn');
  buttons.forEach(btn => {
    btn.addEventListener('mouseover', function() {
      this.style.transform = 'translateY(-2px)';
    });
    
    btn.addEventListener('mouseout', function() {
      this.style.transform = '';
    });
  });
}

// Adicionar animações de keyframes CSS
if (!document.getElementById('dashboard-animations')) {
  const style = document.createElement('style');
  style.id = 'dashboard-animations';
  style.textContent = `
    @keyframes fadeOutUp {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-20px);
      }
    }
    
    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
} 

// Inicialização do sistema de produtos do GitHub
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar o gerenciador de produtos do GitHub
  GitHubProductManager.init({
    owner: 'KORTcrtl', // Nome do usuário/organização no GitHub
    repo: 'KORTEX5', // Nome do repositório
    path: 'SITE_BACKEND/produtos.json', // Caminho para o arquivo de produtos
    token: '', // Token de acesso pessoal do GitHub (removido por segurança)
    refreshInterval: 1000 // Verificar atualizações a cada 1 segundo
  });
  
  // Verificar se estamos na página da loja
  if (window.location.pathname.includes('loja.html')) {
    // Escutar o evento de produtos carregados
    window.addEventListener('kort_products_loaded', function(event) {
      const products = event.detail.products;
      console.log('Produtos carregados do GitHub:', products);
      
      // Adicionar versões de assinatura do Kortex 5 se não existirem
      addKortex5Subscriptions(products);
      
      renderStoreProducts(products);
    });
  }
  
  // Verificar se estamos na página de checkout
  if (window.location.pathname.includes('checkout.html')) {
    // Escutar o evento de produtos carregados para atualizar preços e informações
    window.addEventListener('kort_products_loaded', function(event) {
      const products = event.detail.products;
      console.log('Produtos carregados do GitHub para checkout:', products);
      updateCheckoutWithGitHubProducts(products);
    });
  }
});

// Função para renderizar produtos na loja
function renderStoreProducts(productsData) {
  // Verificar se os dados têm o formato esperado
  if (!productsData || !productsData.produtos || !Array.isArray(productsData.produtos)) {
    console.error('Formato de dados de produtos inválido:', productsData);
    return;
  }
  
  const products = productsData.produtos;
  
  // Renderizar o banner de lançamento se existir
  if (productsData.banner_lancamento) {
    renderLaunchBanner(productsData.banner_lancamento);
  }
  
  // Renderizar os produtos
  const productsContainer = document.querySelector('.products-grid');
  
  // Se não encontrar o container, sair da função
  if (!productsContainer) {
    console.error('Container de produtos não encontrado');
    return;
  }
  
  // Limpar o container
  productsContainer.innerHTML = '';
  
  // Criar um mapa de produtos para uso rápido
  const productsMap = {};
  products.forEach(product => {
    productsMap[product.id] = product;
  });
  
  // Renderizar pacotes se existirem
  if (productsData.pacotes && Array.isArray(productsData.pacotes) && productsData.pacotes.length > 0) {
    renderPackages(productsData.pacotes, productsMap);
  }
  
  // Renderizar cada produto
  products.forEach(product => {
    // Verificar se o produto deve ser destacado com base na lista de destaques
    if (productsData.produtos_destaque && Array.isArray(productsData.produtos_destaque)) {
      product.destaque = productsData.produtos_destaque.includes(product.id);
    }
    // Criar elemento do produto
    const productElement = document.createElement('div');
    productElement.className = 'product-card';
    
    // Verificar se é um produto em destaque
    if (product.destaque) {
      productElement.classList.add('featured');
    }
    
    // Verificar se é uma assinatura
    const isSubscription = product.tipo === 'assinatura';
    
    // Calcular desconto se houver preço original (para produtos de compra)
    let discountPercentage = 0;
    if (!isSubscription && product.preco_original && product.preco_original > product.preco) {
      discountPercentage = Math.round((1 - product.preco / product.preco_original) * 100);
    }
    
    // Montar HTML do produto
    productElement.innerHTML = `
      <div class="product-image">
        <img src="${product.icone}" alt="${product.titulo}">
        ${!isSubscription && discountPercentage > 0 ? `<span class="discount-badge">-${discountPercentage}%</span>` : ''}
        ${product.destaque ? '<span class="featured-badge">Destaque</span>' : ''}
        ${isSubscription ? '<span class="subscription-badge">Assinatura</span>' : ''}
      </div>
      <div class="product-info">
        <h3 class="product-title">${product.titulo}</h3>
        <p class="product-description">${product.descricao}</p>
        <div class="product-meta">
          ${!isSubscription ? `
          <span class="product-duration">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            ${product.tempo || 'Licença permanente'}
          </span>
          ` : `
          <span class="product-subscription-type">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            ${product.periodo === 'anual' ? 'Assinatura anual' : 
              product.periodo === 'mensal' ? 'Assinatura mensal' : 
              product.periodo === '7dias' ? 'Acesso por 7 dias' : 
              product.periodo === '15dias' ? 'Acesso por 15 dias' : 
              'Assinatura'}
          </span>
          `}
        </div>
        <div class="product-price">
          ${!isSubscription ? 
            // Preço para produtos de compra
            `${product.preco_original > product.preco ? 
              `<span class="original-price">R$ ${product.preco_original.toFixed(2).replace('.', ',')}</span>` : ''}
            <span class="current-price">R$ ${product.preco.toFixed(2).replace('.', ',')}</span>` 
            : 
            // Preço para assinaturas
            `<span class="subscription-price">
              <span class="price-monthly">R$ ${product.preco_mensal.toFixed(2).replace('.', ',')} ${product.periodo === '7dias' ? '/7 dias' : product.periodo === '15dias' ? '/15 dias' : '/mês'}</span>
              ${product.preco_anual ? `<span class="price-yearly">ou R$ ${product.preco_anual.toFixed(2).replace('.', ',')} /ano</span>` : ''}
            </span>`
          }
        </div>
      </div>
      <div class="product-actions">
        ${!isSubscription ? 
          // Botão para produtos de compra
          `<button class="add-to-cart-btn" data-id="${product.id}" data-name="${product.titulo}" data-price="${product.preco}" data-image="${product.icone}" data-type="compra">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Adicionar ao Carrinho
          </button>` 
          : 
          // Botão para assinaturas
          `<button class="subscribe-btn" data-id="${product.id}" data-name="${product.titulo}" data-price-monthly="${product.preco_mensal}" data-price-yearly="${product.preco_anual || 0}" data-image="${product.icone}" data-type="assinatura" data-period="${product.periodo || 'mensal'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            ${product.periodo === '7dias' || product.periodo === '15dias' ? 'Obter Acesso' : 'Assinar Agora'}
          </button>`
        }
        <button class="product-info-btn" data-id="${product.id}" data-name="${product.titulo}" data-description="${product.descricao_longa || product.descricao}" data-image="${product.imagem_grande || product.icone}" ${product.video_demo ? `data-video="${product.video_demo}"` : ''} ${product.screenshots ? `data-screenshots="${product.screenshots}"` : ''}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          Info
        </button>
      </div>
    `;
    
    // Adicionar evento de clique ao botão de adicionar ao carrinho
    const addToCartBtn = productElement.querySelector('.add-to-cart-btn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', function() {
        const cart = new Cart();
        const added = cart.addItem(
          this.dataset.id,
          this.dataset.name,
          parseFloat(this.dataset.price),
          this.dataset.image,
          1,
          this.dataset.type
        );
        
        if (added) {
          // Adicionar efeito visual ao botão
          this.classList.add('added');
          this.textContent = 'Adicionado ✓';
          
          setTimeout(() => {
            this.innerHTML = `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              Adicionar ao Carrinho
            `;
            this.classList.remove('added');
          }, 2000);
        }
      });
    }
    
    // Adicionar evento de clique ao botão de assinar
    const subscribeBtn = productElement.querySelector('.subscribe-btn');
    if (subscribeBtn) {
      subscribeBtn.addEventListener('click', function() {
        // Mostrar modal de seleção de plano
        showSubscriptionModal(
          this.dataset.id,
          this.dataset.name,
          parseFloat(this.dataset.priceMonthly),
          parseFloat(this.dataset.priceYearly),
          this.dataset.image,
          this.dataset.period
        );
      });
    }
    
    // Adicionar evento de clique ao botão de informações
    const infoBtn = productElement.querySelector('.product-info-btn');
    if (infoBtn) {
      infoBtn.addEventListener('click', function() {
        showProductInfoModal(
          this.dataset.id,
          this.dataset.name,
          this.dataset.description,
          this.dataset.image,
          this.dataset.video,
          this.dataset.screenshots
        );
      });
    }
    
    // Adicionar o produto ao container
    productsContainer.appendChild(productElement);
  });
  
  console.log(`${products.length} produtos renderizados na loja`);
}

// Função para exibir modal de vídeo
function showVideoModal(videoUrl, title) {
  // Remover modal existente, se houver
  const existingModal = document.querySelector('.video-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Criar modal
  const modal = document.createElement('div');
  modal.className = 'video-modal';
  
  // Extrair ID do vídeo do YouTube
  let videoId = '';
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    const urlParams = new URLSearchParams(new URL(videoUrl).search);
    videoId = urlParams.get('v');
    
    if (!videoId && videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
    }
  }
  
  // Montar HTML do modal
  modal.innerHTML = `
    <div class="video-modal-content">
      <div class="video-modal-header">
        <h3>${title}</h3>
        <button class="close-modal-btn">&times;</button>
      </div>
      <div class="video-modal-body">
        ${videoId ? 
          `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : 
          `<div class="video-error">Vídeo não disponível</div>`
        }
      </div>
    </div>
  `;
  
  // Adicionar overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  // Adicionar ao DOM
  document.body.appendChild(overlay);
  document.body.appendChild(modal);
  
  // Exibir modal com animação
  setTimeout(() => {
    modal.classList.add('open');
    overlay.classList.add('open');
  }, 10);
  
  // Adicionar evento de clique ao botão de fechar
  const closeBtn = modal.querySelector('.close-modal-btn');
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('open');
    overlay.classList.remove('open');
    
    setTimeout(() => {
      modal.remove();
      overlay.remove();
    }, 300);
  });
  
  // Fechar ao clicar no overlay
  overlay.addEventListener('click', () => {
    modal.classList.remove('open');
    overlay.classList.remove('open');
    
    setTimeout(() => {
      modal.remove();
      overlay.remove();
    }, 300);
  });
}

// Função para atualizar informações no checkout com base nos produtos do GitHub
function updateCheckoutWithGitHubProducts(productsData) {
  // Verificar se os dados têm o formato esperado
  if (!productsData || !productsData.produtos || !Array.isArray(productsData.produtos)) {
    console.error('Formato de dados de produtos inválido para checkout:', productsData);
    return;
  }
  
  const products = productsData.produtos;
  const cartItems = JSON.parse(localStorage.getItem('kort_cart') || '[]');
  
  // Se não houver itens no carrinho, não há o que atualizar
  if (cartItems.length === 0) {
    return;
  }
  
  // Mapear produtos do GitHub por ID para fácil acesso
  const productsMap = {};
  products.forEach(product => {
    productsMap[product.id] = product;
  });
  
  // Atualizar cada item do carrinho com informações do GitHub
  let updated = false;
  cartItems.forEach(item => {
    const githubProduct = productsMap[item.id];
    if (githubProduct) {
      // Atualizar preço se for diferente
      if (item.price !== githubProduct.preco) {
        console.log(`Atualizando preço do produto ${item.name} de ${item.price} para ${githubProduct.preco}`);
        item.price = githubProduct.preco;
        updated = true;
      }
      
      // Atualizar imagem se for diferente
      if (item.image !== githubProduct.icone) {
        console.log(`Atualizando imagem do produto ${item.name}`);
        item.image = githubProduct.icone;
        updated = true;
      }
      
      // Atualizar nome se for diferente
      if (item.name !== githubProduct.titulo) {
        console.log(`Atualizando nome do produto de ${item.name} para ${githubProduct.titulo}`);
        item.name = githubProduct.titulo;
        updated = true;
      }
    }
  });
  
  // Se houve atualizações, salvar no localStorage e renderizar novamente
  if (updated) {
    console.log('Carrinho atualizado com informações do GitHub');
    localStorage.setItem('kort_cart', JSON.stringify(cartItems));
    
    // Disparar evento de atualização do carrinho
    window.dispatchEvent(new CustomEvent('kort_cart_updated', {
      detail: { items: cartItems }
    }));
    
    // Se estamos na página de checkout e a função renderCheckoutItems existe, chamá-la
    if (window.renderCheckoutItems && typeof window.renderCheckoutItems === 'function') {
      window.renderCheckoutItems();
    }
  }
}

// Função para renderizar o banner de lançamento
function renderLaunchBanner(bannerData) {
  const bannerContainer = document.querySelector('.store-hero .container');
  if (!bannerContainer) {
    console.error('Container do banner não encontrado');
    return;
  }
  
  // Calcular desconto
  const discountPercentage = bannerData.desconto_percentual || 
    (bannerData.preco_original && bannerData.preco ? 
      Math.round((1 - bannerData.preco / bannerData.preco_original) * 100) : 0);
  
  // Criar HTML do banner
  const bannerHTML = `
    <div class="store-highlight-card">
      <div class="store-highlight-info">
        <span class="badge-destaque">LANÇAMENTO</span>
        <h1>${bannerData.titulo}</h1>
        <p>${bannerData.descricao}</p>
        <div class="store-prices">
          <span class="old-price">R$ ${bannerData.preco_original.toFixed(2).replace('.', ',')}</span>
          <span class="promo-price">R$ ${bannerData.preco.toFixed(2).replace('.', ',')}</span>
          <span class="promo-badge">-${discountPercentage}%</span>
        </div>
        <button class="cta-btn add-cart" data-id="${bannerData.id}" data-name="${bannerData.titulo}" data-price="${bannerData.preco}" data-image="${bannerData.icone}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 20a1 1 0 100 2 1 1 0 000-2zm9 0a1 1 0 100 2 1 1 0 000-2zM3 3h2l.4 2h16.6a1 1 0 01.98 1.2l-1.5 8a1 1 0 01-.98.8H7l.4 2h10.6v2H7a1 1 0 01-.98-1.2L4.62 5H3V3z" fill="#fff"/>
          </svg>
          Adicionar ao Carrinho
        </button>
      </div>
      <div class="store-highlight-img">
        <img src="${bannerData.imagem_grande || bannerData.icone}" alt="${bannerData.titulo}">
      </div>
    </div>
  `;
  
  // Atualizar o container
  bannerContainer.innerHTML = bannerHTML;
  
  // Adicionar evento ao botão
  const addToCartBtn = bannerContainer.querySelector('.add-cart');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function() {
      const cart = new Cart();
      const added = cart.addItem(
        this.dataset.id,
        this.dataset.name,
        parseFloat(this.dataset.price),
        this.dataset.image,
        1
      );
      
      if (added) {
        // Adicionar efeito visual ao botão
        this.classList.add('added');
        this.textContent = 'Adicionado ✓';
        
        setTimeout(() => {
          this.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 20a1 1 0 100 2 1 1 0 000-2zm9 0a1 1 0 100 2 1 1 0 000-2zM3 3h2l.4 2h16.6a1 1 0 01.98 1.2l-1.5 8a1 1 0 01-.98.8H7l.4 2h10.6v2H7a1 1 0 01-.98-1.2L4.62 5H3V3z" fill="#fff"/>
            </svg>
            Adicionar ao Carrinho
          `;
          this.classList.remove('added');
        }, 2000);
      }
    });
  }
  
  console.log('Banner de lançamento renderizado');
}

// Função para renderizar pacotes
function renderPackages(packages, productsMap) {
  const packagesSection = document.querySelector('.store-bundles .bundles-grid');
  if (!packagesSection) {
    console.log('Seção de pacotes não encontrada, criando uma nova');
    
    // Criar seção de pacotes
    const mainElement = document.querySelector('main');
    if (!mainElement) {
      console.error('Elemento main não encontrado');
      return;
    }
    
    const productsSection = document.querySelector('.store-products');
    if (!productsSection) {
      console.error('Seção de produtos não encontrada');
      return;
    }
    
    const packagesHTML = `
      <section class="store-bundles glass-effect">
        <div class="container">
          <h2>Pacotes Especiais</h2>
          <p class="section-description">Economize com nossos pacotes de aplicativos selecionados</p>
          <div class="bundles-grid"></div>
        </div>
      </section>
    `;
    
    // Inserir após a seção de produtos
    productsSection.insertAdjacentHTML('afterend', packagesHTML);
  }
  
  // Obter o container de pacotes (que pode ter sido recém-criado)
  const packagesContainer = document.querySelector('.store-bundles .bundles-grid');
  if (!packagesContainer) {
    console.error('Container de pacotes não encontrado mesmo após tentativa de criação');
    return;
  }
  
  // Limpar o container
  packagesContainer.innerHTML = '';
  
  // Renderizar cada pacote
  packages.forEach(pack => {
    // Verificar se todos os produtos do pacote existem
    const packageProducts = pack.produtos.map(id => productsMap[id]).filter(Boolean);
    if (packageProducts.length === 0) {
      console.warn(`Pacote ${pack.titulo} não tem produtos válidos`);
      return;
    }
    
    // Criar HTML do pacote
    const packageHTML = `
      <div class="bundle-card glass-effect">
        <div class="bundle-header">
          <h3>${pack.titulo}</h3>
          <span class="bundle-badge">Economize ${pack.economia_percentual}%</span>
        </div>
        <div class="bundle-content">
          <div class="bundle-apps">
            ${packageProducts.map(product => `
              <div class="bundle-app">
                <img src="${product.icone}" alt="${product.titulo}" class="bundle-app-img">
                <span>${product.titulo}</span>
              </div>
            `).join('')}
          </div>
          <div class="bundle-price">
            <span class="bundle-old-price">R$ ${pack.preco_original.toFixed(2).replace('.', ',')}</span>
            <span class="bundle-current-price">R$ ${pack.preco.toFixed(2).replace('.', ',')}</span>
          </div>
          <button class="cta-btn add-cart" data-id="${pack.id}" data-name="${pack.titulo}" data-price="${pack.preco}" data-image="${packageProducts[0].icone}">Adicionar ao Carrinho</button>
        </div>
      </div>
    `;
    
    // Adicionar ao container
    packagesContainer.insertAdjacentHTML('beforeend', packageHTML);
  });
  
  // Adicionar eventos aos botões
  packagesContainer.querySelectorAll('.add-cart').forEach(button => {
    button.addEventListener('click', function() {
      const cart = new Cart();
      const added = cart.addItem(
        this.dataset.id,
        this.dataset.name,
        parseFloat(this.dataset.price),
        this.dataset.image,
        1
      );
      
      if (added) {
        // Adicionar efeito visual ao botão
        this.classList.add('added');
        this.textContent = 'Adicionado ✓';
        
        setTimeout(() => {
          this.textContent = 'Adicionar ao Carrinho';
          this.classList.remove('added');
        }, 2000);
      }
    });
  });
  
  console.log(`${packages.length} pacotes renderizados`);
}

// Inicializar o carrinho quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar o carrinho
  const cart = new Cart();
  
  // Atualizar o ícone do carrinho e o botão flutuante
  cart.updateCartIcon();
  cart.updateFloatingCheckoutButton();
  
  // Adicionar event listener para o botão do carrinho
  const cartBtn = document.querySelector('.cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', function() {
      cart.renderCart();
    });
  }
  
  // Adicionar event listener para o botão flutuante de ver carrinho
  const floatingCartBtn = document.querySelector('.floating-cart-btn');
  if (floatingCartBtn) {
    floatingCartBtn.addEventListener('click', function() {
      cart.renderCart();
      setTimeout(() => {
        const cartSidebar = document.querySelector('.cart-sidebar');
        const cartOverlay = document.querySelector('.cart-overlay');
        if (cartSidebar && cartOverlay) {
          cartSidebar.classList.add('open');
          cartOverlay.classList.add('open');
        }
      }, 50);
    });
  }
  
  // Adicionar event listener para o botão flutuante de checkout
  const floatingBtn = document.querySelector('.floating-checkout-btn');
  if (floatingBtn) {
    floatingBtn.addEventListener('click', function(e) {
      if (cart.items.length === 0) {
        e.preventDefault();
        showInfobox('Seu carrinho está vazio!', 3000, 'warning');
      }
    });
  }
});

// Função para mostrar modal de seleção de plano de assinatura
function showSubscriptionModal(id, name, priceMonthly, priceYearly, image, defaultPeriod) {
  // Remover modal existente, se houver
  const existingModal = document.querySelector('.subscription-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Verificar se é um período especial (7 dias ou 15 dias)
  const isSpecialPeriod = defaultPeriod === '7dias' || defaultPeriod === '15dias';
  
  let modalContent = '';
  
  if (isSpecialPeriod) {
    // Modal simplificado para períodos especiais
    modalContent = `
      <div class="subscription-modal-content">
        <div class="subscription-modal-header">
          <h3>Confirmar acesso temporário</h3>
          <button class="close-modal-btn">&times;</button>
        </div>
        <div class="subscription-modal-body">
          <div class="subscription-product-info">
            <img src="${image}" alt="${name}" class="subscription-product-img">
            <h4>${name}</h4>
          </div>
          <div class="special-period-info">
            <div class="plan-header">
              <h5>${defaultPeriod === '7dias' ? 'Acesso por 7 dias' : 'Acesso por 15 dias'}</h5>
              <span class="plan-price">R$ ${priceMonthly.toFixed(2).replace('.', ',')}</span>
              <span class="plan-period">pagamento único</span>
            </div>
            <div class="plan-features">
              <ul>
                <li>Acesso a todas as funcionalidades</li>
                <li>Sem renovação automática</li>
                <li>Suporte durante o período</li>
                <li>Acesso imediato após pagamento</li>
              </ul>
            </div>
          </div>
          <button class="subscription-continue-btn">Continuar</button>
        </div>
      </div>
    `;
  } else {
    // Calcular economia anual (12 meses - preço anual)
    const yearlySavings = (priceMonthly * 12 - priceYearly).toFixed(2).replace('.', ',');
    const savingsPercentage = Math.round((1 - priceYearly / (priceMonthly * 12)) * 100);
    
    // Modal para assinaturas regulares (mensal/anual)
    modalContent = `
      <div class="subscription-modal-content">
        <div class="subscription-modal-header">
          <h3>Escolha seu plano de assinatura</h3>
          <button class="close-modal-btn">&times;</button>
        </div>
        <div class="subscription-modal-body">
          <div class="subscription-product-info">
            <img src="${image}" alt="${name}" class="subscription-product-img">
            <h4>${name}</h4>
          </div>
          <div class="subscription-plans">
            <div class="subscription-plan ${defaultPeriod === 'mensal' ? 'selected' : ''}" data-period="mensal">
              <div class="plan-header">
                <h5>Mensal</h5>
                <span class="plan-price">R$ ${priceMonthly.toFixed(2).replace('.', ',')}</span>
                <span class="plan-period">por mês</span>
              </div>
              <div class="plan-features">
                <ul>
                  <li>Acesso a todas as funcionalidades</li>
                  <li>Atualizações gratuitas</li>
                  <li>Suporte prioritário</li>
                  <li>Cancele a qualquer momento</li>
                </ul>
              </div>
            </div>
            <div class="subscription-plan ${defaultPeriod === 'anual' ? 'selected' : ''}" data-period="anual">
              <div class="plan-header">
                <h5>Anual</h5>
                <span class="plan-badge">Economize ${savingsPercentage}%</span>
                <span class="plan-price">R$ ${(priceYearly / 12).toFixed(2).replace('.', ',')}</span>
                <span class="plan-period">por mês</span>
                <span class="plan-total">R$ ${priceYearly.toFixed(2).replace('.', ',')} cobrados anualmente</span>
              </div>
              <div class="plan-features">
                <ul>
                  <li>Acesso a todas as funcionalidades</li>
                  <li>Atualizações gratuitas</li>
                  <li>Suporte prioritário</li>
                  <li>Economize R$ ${yearlySavings} por ano</li>
                  <li>Cancele a qualquer momento</li>
                </ul>
              </div>
            </div>
          </div>
          <button class="subscription-continue-btn">Continuar</button>
        </div>
      </div>
    `;
  }
  
  // Criar modal
  const modal = document.createElement('div');
  modal.className = 'subscription-modal';
  
  // Montar HTML do modal
  modal.innerHTML = modalContent;
  
  // Adicionar overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  // Adicionar ao DOM
  document.body.appendChild(overlay);
  document.body.appendChild(modal);
  
  // Exibir modal com animação
  setTimeout(() => {
    modal.classList.add('open');
    overlay.classList.add('open');
  }, 10);
  
  // Adicionar evento de clique aos planos
  const plans = modal.querySelectorAll('.subscription-plan');
  plans.forEach(plan => {
    plan.addEventListener('click', function() {
      // Remover seleção de todos os planos
      plans.forEach(p => p.classList.remove('selected'));
      // Adicionar seleção ao plano clicado
      this.classList.add('selected');
    });
  });
  
  // Adicionar evento de clique ao botão de continuar
  const continueBtn = modal.querySelector('.subscription-continue-btn');
  continueBtn.addEventListener('click', function() {
    // Verificar se é um período especial (7 dias ou 15 dias)
    const isSpecialPeriod = defaultPeriod === '7dias' || defaultPeriod === '15dias';
    
    let period, price;
    
    if (isSpecialPeriod) {
      // Para períodos especiais, usar diretamente o período e preço
      period = defaultPeriod;
      price = priceMonthly;
    } else {
      // Para assinaturas regulares, obter o plano selecionado
      const selectedPlan = modal.querySelector('.subscription-plan.selected');
      if (!selectedPlan) return;
      
      period = selectedPlan.dataset.period;
      price = period === 'anual' ? priceYearly : priceMonthly;
    }
    
    // Adicionar ao carrinho como assinatura
    const cart = new Cart();
    const added = cart.addItem(
      id,
      name,
      price,
      image,
      1,
      'assinatura',
      period
    );
    
    if (added) {
      // Fechar modal
      modal.classList.remove('open');
      overlay.classList.remove('open');
      setTimeout(() => {
        modal.remove();
        overlay.remove();
      }, 300);
      
      // Mensagem de sucesso com texto apropriado para o tipo de assinatura
      let successMessage;
      if (period === '7dias') {
        successMessage = `${name} (Acesso por 7 dias) adicionado ao carrinho!`;
      } else if (period === '15dias') {
        successMessage = `${name} (Acesso por 15 dias) adicionado ao carrinho!`;
      } else if (period === 'anual') {
        successMessage = `${name} (Assinatura Anual) adicionado ao carrinho!`;
      } else {
        successMessage = `${name} (Assinatura Mensal) adicionado ao carrinho!`;
      }
      
      showInfobox(successMessage, 3000, 'success');
    }
  });
  
  // Adicionar evento de clique ao botão de fechar
  const closeBtn = modal.querySelector('.close-modal-btn');
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('open');
    overlay.classList.remove('open');
    
    setTimeout(() => {
      modal.remove();
      overlay.remove();
    }, 300);
  });
  
  // Fechar ao clicar no overlay
  overlay.addEventListener('click', () => {
    modal.classList.remove('open');
    overlay.classList.remove('open');
    
    setTimeout(() => {
      modal.remove();
      overlay.remove();
    }, 300);
  });
}

// Função para atualizar o resumo do pedido no checkout
function updateOrderSummary() {
  const subtotalEl = document.querySelector('.checkout-subtotal');
  const discountEl = document.querySelector('.checkout-discount');
  const totalEl = document.querySelector('.checkout-total');
  
  if (!subtotalEl || !discountEl || !totalEl) return;
  
  // Obter itens do carrinho
  const cart = new Cart();
  const cartItems = cart.items;
  
  // Separar itens por tipo
  const compraItems = cartItems.filter(item => item.type !== 'assinatura');
  const assinaturaItems = cartItems.filter(item => item.type === 'assinatura');
  
  // Calcular subtotais separados
  const compraSubtotal = compraItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const assinaturaSubtotal = assinaturaItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Subtotal geral
  const subtotal = compraSubtotal + assinaturaSubtotal;
  
  // Aplicar desconto apenas nos produtos de compra (não em assinaturas)
  // Exemplo: 10% de desconto em compras acima de R$ 200
  let discount = 0;
  if (compraSubtotal >= 200) {
    discount = compraSubtotal * 0.1;
  }
  
  // Total final
  const total = subtotal - discount;
  
  // Atualizar elementos na página
  subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  
  // Mostrar ou ocultar seção de desconto
  const discountRow = document.querySelector('.checkout-discount-row');
  if (discountRow) {
    if (discount > 0) {
      discountRow.style.display = 'flex';
      discountEl.textContent = `- R$ ${discount.toFixed(2).replace('.', ',')}`;
    } else {
      discountRow.style.display = 'none';
    }
  }
  
  totalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
  
  // Se houver assinaturas, mostrar aviso sobre cobranças recorrentes
  const recurringNotice = document.querySelector('.recurring-charges-notice');
  if (recurringNotice) {
    if (assinaturaItems.length > 0) {
      recurringNotice.style.display = 'block';
      
      // Calcular total mensal e anual
      const monthlyTotal = assinaturaItems
        .filter(item => item.period === 'mensal')
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
      const yearlyTotal = assinaturaItems
        .filter(item => item.period === 'anual')
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Atualizar texto do aviso
      const monthlyText = monthlyTotal > 0 ? `R$ ${monthlyTotal.toFixed(2).replace('.', ',')} mensalmente` : '';
      const yearlyText = yearlyTotal > 0 ? `R$ ${yearlyTotal.toFixed(2).replace('.', ',')} anualmente` : '';
      const separator = monthlyText && yearlyText ? ' e ' : '';
      
      recurringNotice.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Após a confirmação, você será cobrado ${monthlyText}${separator}${yearlyText} até o cancelamento.</span>
      `;
    } else {
      recurringNotice.style.display = 'none';
    }
  }
}

// Função para mostrar modal de informações do produto
function showProductInfoModal(id, name, description, image, videoUrl, screenshots) {
  // Remover modal existente, se houver
  const existingModal = document.querySelector('.product-info-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Preparar screenshots se existirem
  let screenshotsHtml = '';
  if (screenshots) {
    const screenshotUrls = screenshots.split(',').map(url => url.trim());
    if (screenshotUrls.length > 0) {
      screenshotsHtml = `
        <div class="product-screenshots">
          <h4>Screenshots</h4>
          <div class="screenshots-grid">
            ${screenshotUrls.map(url => `
              <div class="screenshot-item">
                <img src="${url}" alt="${name}" class="screenshot-img">
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }
  
  // Preparar vídeo se existir
  let videoHtml = '';
  if (videoUrl) {
    // Extrair ID do vídeo do YouTube
    let videoId = '';
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const urlParams = new URLSearchParams(new URL(videoUrl).search);
      videoId = urlParams.get('v');
      
      if (!videoId && videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
      }
    }
    
    if (videoId) {
      videoHtml = `
        <div class="product-video">
          <h4>Vídeo Demonstrativo</h4>
          <div class="video-container">
            <iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
        </div>
      `;
    }
  }
  
  // Criar modal
  const modal = document.createElement('div');
  modal.className = 'product-info-modal';
  
  // Montar HTML do modal
  modal.innerHTML = `
    <div class="product-info-modal-content glass-effect">
      <div class="product-info-modal-header">
        <h3>${name}</h3>
        <button class="close-modal-btn">&times;</button>
      </div>
      <div class="product-info-modal-body">
        <div class="product-info-main">
          <img src="${image}" alt="${name}" class="product-info-img">
          <div class="product-info-description">
            ${description}
          </div>
        </div>
        ${videoHtml}
        ${screenshotsHtml}
      </div>
    </div>
  `;
  
  // Adicionar overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  // Adicionar ao DOM
  document.body.appendChild(overlay);
  document.body.appendChild(modal);
  
  // Exibir modal com animação
  setTimeout(() => {
    modal.classList.add('open');
    overlay.classList.add('open');
  }, 10);
  
  // Adicionar evento de clique ao botão de fechar
  const closeBtn = modal.querySelector('.close-modal-btn');
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('open');
    overlay.classList.remove('open');
    
    setTimeout(() => {
      modal.remove();
      overlay.remove();
    }, 300);
  });
  
  // Fechar ao clicar no overlay
  overlay.addEventListener('click', () => {
    modal.classList.remove('open');
    overlay.classList.remove('open');
    
    setTimeout(() => {
      modal.remove();
      overlay.remove();
    }, 300);
  });
}

// Função para adicionar versões de assinatura do Kortex 5
function addKortex5Subscriptions(productsData) {
  if (!productsData || !productsData.produtos || !Array.isArray(productsData.produtos)) {
    return;
  }
  
  // Verificar se já existe o Kortex 5 como produto
  const kortex5Product = productsData.produtos.find(product => 
    product.titulo === 'KORT Optimizer' || 
    product.titulo === 'Kortex 5' || 
    product.id === 1
  );
  
  if (!kortex5Product) {
    console.error('Produto Kortex 5 não encontrado para criar assinaturas');
    return;
  }
  
  // Verificar se já existem as assinaturas do Kortex 5
  const hasWeeklySubscription = productsData.produtos.some(product => 
    product.titulo === 'Kortex 5' && 
    product.tipo === 'assinatura' && 
    product.periodo === '7dias'
  );
  
  const hasBiweeklySubscription = productsData.produtos.some(product => 
    product.titulo === 'Kortex 5' && 
    product.tipo === 'assinatura' && 
    product.periodo === '15dias'
  );
  
  const hasMonthlySubscription = productsData.produtos.some(product => 
    product.titulo === 'Kortex 5' && 
    product.tipo === 'assinatura' && 
    product.periodo === 'mensal'
  );
  
  const hasYearlySubscription = productsData.produtos.some(product => 
    product.titulo === 'Kortex 5' && 
    product.tipo === 'assinatura' && 
    product.periodo === 'anual'
  );
  
  // Adicionar assinaturas se não existirem
  if (!hasWeeklySubscription) {
    productsData.produtos.push({
      id: 'kortex5-7dias',
      titulo: 'Kortex 5',
      descricao: 'Acesso por 7 dias ao otimizador completo',
      descricao_longa: kortex5Product.descricao_longa || 'O Kortex 5 é a solução definitiva para otimização de sistema, internet e desempenho. Com uma interface moderna e fácil de usar, oferece resultados comprovados para uma experiência de uso sem igual!',
      icone: kortex5Product.icone,
      imagem_grande: kortex5Product.imagem_grande || kortex5Product.icone,
      preco_mensal: 9.90,
      categoria: 'Otimização',
      tipo: 'assinatura',
      periodo: '7dias',
      destaque: false,
      video_demo: kortex5Product.video_demo,
      screenshots: 'https://i.imgur.com/print_app.png,https://i.imgur.com/print_app2.png,https://i.imgur.com/print_app3.png',
      recursos: [
        'Otimização de sistema',
        'Acelerador de internet',
        'Limpeza de arquivos',
        'Proteção em tempo real',
        'Acesso por 7 dias'
      ]
    });
  }
  
  if (!hasBiweeklySubscription) {
    productsData.produtos.push({
      id: 'kortex5-15dias',
      titulo: 'Kortex 5',
      descricao: 'Acesso por 15 dias ao otimizador completo',
      descricao_longa: kortex5Product.descricao_longa || 'O Kortex 5 é a solução definitiva para otimização de sistema, internet e desempenho. Com uma interface moderna e fácil de usar, oferece resultados comprovados para uma experiência de uso sem igual!',
      icone: kortex5Product.icone,
      imagem_grande: kortex5Product.imagem_grande || kortex5Product.icone,
      preco_mensal: 14.90,
      categoria: 'Otimização',
      tipo: 'assinatura',
      periodo: '15dias',
      destaque: false,
      video_demo: kortex5Product.video_demo,
      screenshots: 'https://i.imgur.com/print_app.png,https://i.imgur.com/print_app2.png,https://i.imgur.com/print_app3.png',
      recursos: [
        'Otimização de sistema',
        'Acelerador de internet',
        'Limpeza de arquivos',
        'Proteção em tempo real',
        'Acesso por 15 dias'
      ]
    });
  }
  
  if (!hasMonthlySubscription) {
    productsData.produtos.push({
      id: 'kortex5-mensal',
      titulo: 'Kortex 5',
      descricao: 'Assinatura mensal do otimizador completo',
      descricao_longa: kortex5Product.descricao_longa || 'O Kortex 5 é a solução definitiva para otimização de sistema, internet e desempenho. Com uma interface moderna e fácil de usar, oferece resultados comprovados para uma experiência de uso sem igual!',
      icone: kortex5Product.icone,
      imagem_grande: kortex5Product.imagem_grande || kortex5Product.icone,
      preco_mensal: 19.90,
      categoria: 'Otimização',
      tipo: 'assinatura',
      periodo: 'mensal',
      destaque: true,
      video_demo: kortex5Product.video_demo,
      screenshots: 'https://i.imgur.com/print_app.png,https://i.imgur.com/print_app2.png,https://i.imgur.com/print_app3.png',
      recursos: [
        'Otimização de sistema',
        'Acelerador de internet',
        'Limpeza de arquivos',
        'Proteção em tempo real',
        'Atualizações mensais'
      ]
    });
  }
  
  if (!hasYearlySubscription) {
    productsData.produtos.push({
      id: 'kortex5-anual',
      titulo: 'Kortex 5',
      descricao: 'Assinatura anual do otimizador completo',
      descricao_longa: kortex5Product.descricao_longa || 'O Kortex 5 é a solução definitiva para otimização de sistema, internet e desempenho. Com uma interface moderna e fácil de usar, oferece resultados comprovados para uma experiência de uso sem igual!',
      icone: kortex5Product.icone,
      imagem_grande: kortex5Product.imagem_grande || kortex5Product.icone,
      preco_mensal: 19.90,
      preco_anual: 179.90,
      categoria: 'Otimização',
      tipo: 'assinatura',
      periodo: 'anual',
      destaque: true,
      video_demo: kortex5Product.video_demo,
      screenshots: 'https://i.imgur.com/print_app.png,https://i.imgur.com/print_app2.png,https://i.imgur.com/print_app3.png',
      recursos: [
        'Otimização de sistema',
        'Acelerador de internet',
        'Limpeza de arquivos',
        'Proteção em tempo real',
        'Atualizações por um ano'
      ]
    });
  }
}

// Função para adicionar screenshots e vídeos de demonstração a todos os produtos
function addDemoContentToAllProducts(productsData) {
  if (!productsData || !productsData.produtos || !Array.isArray(productsData.produtos)) {
    console.error('Formato de dados de produtos inválido:', productsData);
    return productsData;
  }
  
  // Iterar sobre todos os produtos
  productsData.produtos = productsData.produtos.map(product => {
    // Se o produto não tiver screenshots, adicionar screenshots padrão
    if (!product.screenshots) {
      // Verificar a categoria do produto para fornecer screenshots relevantes
      if (product.categoria === 'Otimização' || product.titulo.includes('Kortex')) {
        product.screenshots = 'https://i.imgur.com/print_app.png,https://i.imgur.com/print_app2.png,https://i.imgur.com/print_app3.png';
      } else if (product.categoria === 'Segurança') {
        product.screenshots = 'https://i.imgur.com/security_app1.png,https://i.imgur.com/security_app2.png,https://i.imgur.com/security_app3.png';
      } else if (product.categoria === 'Produtividade') {
        product.screenshots = 'https://i.imgur.com/productivity_app1.png,https://i.imgur.com/productivity_app2.png,https://i.imgur.com/productivity_app3.png';
      } else {
        product.screenshots = 'https://i.imgur.com/default_app1.png,https://i.imgur.com/default_app2.png,https://i.imgur.com/default_app3.png';
      }
      console.log(`Screenshots adicionados ao produto: ${product.titulo}`);
    }
    
    // Se o produto não tiver vídeo de demonstração, adicionar um vídeo padrão
    if (!product.video_demo) {
      // Vídeo padrão baseado na categoria
      if (product.categoria === 'Otimização' || product.titulo.includes('Kortex')) {
        product.video_demo = 'https://www.youtube.com/watch?v=demo_optimization';
      } else if (product.categoria === 'Segurança') {
        product.video_demo = 'https://www.youtube.com/watch?v=demo_security';
      } else if (product.categoria === 'Produtividade') {
        product.video_demo = 'https://www.youtube.com/watch?v=demo_productivity';
      } else {
        product.video_demo = 'https://www.youtube.com/watch?v=default_demo';
      }
      console.log(`Vídeo de demonstração adicionado ao produto: ${product.titulo}`);
    }
    
    return product;
  });
  
  console.log('Conteúdo de demonstração adicionado a todos os produtos');
  return productsData;
} 