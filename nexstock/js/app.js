function renderHome() {
  const totalClientes = clientesData.length;
  const totalProdutos = produtosData.length;
  const receitaTotal = calcularReceitaTotal();

  const devedoresCriticos = clientesData.filter(c => c.statusPagamento === 'devendo');
  
  return `
    <div class="page-header">
      <h2>Painel de Controle</h2>
    </div>
    
    <div class="welcome-animation" style="padding: 30px 0 10px 0;">
      Bem-vindo a NexStock!
    </div>

    ${devedoresCriticos.length > 0 ? `
      <div class="alert alert-warning border-0 shadow-sm mb-4">
        <div class="d-flex align-items-center">
          <i class="fas fa-exclamation-circle fs-4 me-3 text-warning"></i>
          <div>
            <h6 class="alert-heading mb-1 fw-bold">Atenção: ${devedoresCriticos.length} clientes com pagamentos pendentes!</h6>
            <p class="mb-0 small">Confira quem são na lista de Clientes ou no Analytics.</p>
          </div>
        </div>
      </div>
    ` : `
      <div class="alert alert-success border-0 shadow-sm mb-4">
        <i class="fas fa-check-circle me-2"></i> Todos os pagamentos estão em dia!
      </div>
    `}
    
    <div class="stats-container">
      <div class="stat-card">
        <h3>Total de Clientes</h3>
        <div class="value">${totalClientes}</div>
      </div>
      <div class="stat-card">
        <h3>Produtos em Estoque</h3>
        <div class="value">${produtosData.reduce((s,p) => s + (p.estoque || 0), 0)}</div>
      </div>
      <div class="stat-card">
        <h3>Receita Real (Caixa)</h3>
        <div class="value">R$ ${receitaTotal.toFixed(2)}</div>
      </div>
    </div>
    
    <div class="card mt-4">
      <h4 class="mb-4">Ações Rápidas</h4>
      <div class="row">
        <div class="col-md-4 mb-3">
          <button class="btn btn-outline-primary w-100 p-3" onclick="setActivePage('clientes'); setTimeout(showClienteModal, 100);">
            <i class="fas fa-user-plus mb-2 d-block" style="font-size: 1.5rem;"></i>
            Novo Pedido / Cliente
          </button>
        </div>
        <div class="col-md-4 mb-3">
          <button class="btn btn-outline-secondary w-100 p-3" onclick="editingProdutoId = null; setActivePage('produtos'); setTimeout(showProdutoModal, 100);">
            <i class="fas fa-gem mb-2 d-block" style="font-size: 1.5rem;"></i>
            Cadastrar Produto
          </button>
        </div>
        <div class="col-md-4 mb-3">
          <button class="btn btn-outline-info w-100 p-3" onclick="setActivePage('analytics')">
            <i class="fas fa-chart-line mb-2 d-block" style="font-size: 1.5rem;"></i>
            Ver Analytics
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderApp() {
  const root = document.getElementById('root');
  const currentTheme = document.documentElement.getAttribute('data-theme');
  
  root.innerHTML = `
    <div class="app-container">
      <div class="sidebar">
        <div class="sidebar-header">
          <h1>NexStock</h1>
          <div class="d-flex gap-2">
            <button class="theme-toggle" onclick="toggleTheme()" title="Alternar modo claro/escuro">
              <i id="theme-icon" class="fas ${currentTheme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>
            </button>
          </div>
        </div>
        
        <div class="user-profile-section p-3 border-bottom border-light border-opacity-10">
          ${window.getCurrentUser && window.getCurrentUser() ? `
            <div class="d-flex align-items-center gap-2 mb-2">
              <img src="${window.getCurrentUser().photoURL}" class="rounded-circle" width="32" height="32">
              <div class="overflow-hidden">
                <div class="text-truncate small fw-bold">${window.getCurrentUser().displayName}</div>
                <div class="text-truncate extra-small opacity-75" style="font-size: 0.7rem;">${window.getCurrentUser().email}</div>
              </div>
            </div>
            <button class="btn btn-sm btn-outline-light w-100" style="font-size: 0.7rem;" onclick="logout()">
              <i class="fas fa-sign-out-alt me-1"></i> Sair
            </button>
          ` : `
            <button class="btn btn-sm btn-light w-100 fw-bold" style="font-size: 0.8rem; color: var(--roxo-escuro);" onclick="loginComGoogle()">
              <i class="fab fa-google me-1"></i> Entrar com Google
            </button>
            <div class="extra-small text-center mt-2 opacity-75" style="font-size: 0.65rem;">Sincronize seus dados na nuvem</div>
          `}
        </div>
        <div class="sidebar-menu">
          <div class="menu-item ${activePage === 'home' ? 'active' : ''}" onclick="setActivePage('home')">
            <i class="fas fa-home"></i>
            <span>Home</span>
          </div>
          <div class="menu-item ${activePage === 'clientes' ? 'active' : ''}" onclick="setActivePage('clientes')">
            <i class="fas fa-users"></i>
            <span>Clientes</span>
          </div>
          <div class="menu-item ${activePage === 'produtos' ? 'active' : ''}" onclick="setActivePage('produtos')">
            <i class="fas fa-gem"></i>
            <span>Produtos</span>
          </div>
          <div class="menu-item ${activePage === 'fornecedores' ? 'active' : ''}" onclick="setActivePage('fornecedores')">
            <i class="fas fa-truck"></i>
            <span>Fornecedores</span>
          </div>
          <div class="menu-item ${activePage === 'analytics' ? 'active' : ''}" onclick="setActivePage('analytics')">
            <i class="fas fa-chart-pie"></i>
            <span>Analytics</span>
          </div>
        </div>
      </div>
      <div class="main-content">
        ${activePage === 'home' ? renderHome() : 
          activePage === 'clientes' ? renderClientes() : 
          activePage === 'produtos' ? renderProdutos() : 
          activePage === 'fornecedores' ? renderFornecedores() :
          renderAnalytics()}
      </div>
    </div>
  `;
  
  setupEventListeners();
}

function setActivePage(page) {
  activePage = page;
  localStorage.setItem('isabela-active-page', page);
  renderApp();
}

function setupEventListeners() {
  const fornecedorSearch = document.getElementById('fornecedor-search-input');
  if (fornecedorSearch) {
    fornecedorSearch.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase();
      const filtered = fornecedoresData.filter(f => 
        f.nome.toLowerCase().includes(searchTerm) || 
        (f.contato && f.contato.toLowerCase().includes(searchTerm))
      );
      
      const tableBody = document.getElementById('fornecedores-table-body');
      if (tableBody) {
        tableBody.innerHTML = filtered.map(f => {
          const count = produtosData.filter(p => p.fornecedorId === f.id).length;
          return `
            <tr>
              <td style="cursor:pointer; color:var(--rosa-medio); font-weight:600;" onclick="verProdutosFornecedor(${f.id})">${f.nome}</td>
              <td>${f.contato || '-'}</td>
              <td><span class="badge bg-secondary">${count} itens</span></td>
              <td>
                <div class="action-buttons">
                  <button class="btn-action btn-edit" onclick="editFornecedor(${f.id})">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn-action btn-delete" onclick="deleteFornecedor(${f.id})">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    });
  }

	  const clienteSearch = document.getElementById('cliente-search');
	  if (clienteSearch) {
	    clienteSearch.addEventListener('input', function(e) {
	      window.clienteSearchTerm = e.target.value.toLowerCase();
        renderApp();
	    });
      if (window.clienteSearchTerm) {
        clienteSearch.value = window.clienteSearchTerm;
        clienteSearch.focus();
      }
	  }
	 
	  const produtoSearch = document.getElementById('produto-search-list');
	  if (produtoSearch) {
	    produtoSearch.addEventListener('input', function(e) {
	      window.produtoSearchTerm = e.target.value.toLowerCase();
        renderApp();
	    });
      if (window.produtoSearchTerm) {
        produtoSearch.value = window.produtoSearchTerm;
        produtoSearch.focus();
      }
	  }
}

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('isabela-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  renderApp();
});
