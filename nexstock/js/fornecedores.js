
async function addFornecedor(fornecedor) {
  let itemToSync = null;
  if (editingFornecedorId) {
    const index = fornecedoresData.findIndex(f => f.id === editingFornecedorId);
    if (index !== -1) {
      fornecedoresData[index] = { ...fornecedor, id: editingFornecedorId };
      itemToSync = fornecedoresData[index];
      editingFornecedorId = null;
    }
  } else {
    const newFornecedor = {...fornecedor, id: Date.now()};
    fornecedoresData.push(newFornecedor);
    itemToSync = newFornecedor;
  }
  saveData();
  
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (user && window.db && itemToSync) {
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    await setDoc(doc(window.db, `users/${user.uid}/fornecedores`, itemToSync.id.toString()), itemToSync);
  }
  
  renderApp();
}

async function deleteFornecedor(id) {
  const produtosVinculados = produtosData.filter(p => p.fornecedorId === id);
  if (produtosVinculados.length > 0) {
    showToast(`Erro: ${produtosVinculados.length} produto(s) vinculado(s).`, 'error');
    return;
  }
  
  openInputModal({
    title: 'Excluir Fornecedor',
    label: `Tem certeza que deseja excluir o fornecedor "${fornecedoresData.find(f => f.id === id)?.nome}"?`,
    prefix: 'CONFIRMAR',
    type: 'hidden',
    onConfirm: async () => {
      fornecedoresData = fornecedoresData.filter(f => f.id !== id);
      saveData();
      
      const user = window.getCurrentUser ? window.getCurrentUser() : null;
      if (user && window.db) {
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        await deleteDoc(doc(window.db, `users/${user.uid}/fornecedores`, id.toString()));
      }
      
      renderApp();
      showToast('Fornecedor excluído!');
    }
  });
}
function editFornecedor(id) {
  const fornecedor = fornecedoresData.find(f => f.id === id);
  if (fornecedor) {
    editingFornecedorId = id;
    showFornecedorModal();
    document.getElementById('fornecedor-nome').value = fornecedor.nome;
    document.getElementById('fornecedor-contato').value = fornecedor.contato || '';
  }
}

function renderFornecedores() {
  return `
    <div class="page-header">
      <h2>Fornecedores</h2>
    </div>
    
    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input type="text" id="fornecedor-search-input" placeholder="Buscar fornecedor...">
    </div>
    
    <div class="card">
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Produtos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="fornecedores-table-body">
            ${fornecedoresData.map(f => {
              const count = produtosData.filter(p => p.fornecedorId === f.id).length;
              return `
                <tr>
                  <td style="cursor:pointer; color:var(--rosa-medio); font-weight:600;" onclick="verProdutosFornecedor(${f.id})">${f.nome}</td>
                  <td>
                    <a href="tel:${(f.contato || '').replace(/\D/g, '')}" class="text-decoration-none text-muted">
                      <i class="fas fa-phone me-1 text-primary"></i> ${f.contato || '-'}
                    </a>
                  </td>
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
            }).join('')}
            ${fornecedoresData.length === 0 ? '<tr><td colspan="4" class="text-center py-4 text-muted">Nenhum fornecedor cadastrado.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="add-button" onclick="showFornecedorModal()" title="Adicionar Fornecedor">
      <i class="fas fa-plus"></i>
    </div>
    
    <!-- Modal Fornecedor -->
    <div class="modal fade" id="fornecedor-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${editingFornecedorId ? 'Editar Fornecedor' : 'Adicionar Fornecedor'}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="fornecedor-form">
              <div class="mb-3">
                <label class="form-label">Nome do Fornecedor</label>
                <input type="text" id="fornecedor-nome" class="form-control" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Contato/Telefone</label>
                <input type="text" id="fornecedor-contato" class="form-control">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="submitFornecedorForm()" style="background-color: var(--rosa-medio); border-color: var(--rosa-medio);">Salvar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Ver Produtos do Fornecedor -->
    <div class="modal fade" id="ver-produtos-fornecedor-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="ver-produtos-titulo">Produtos do Fornecedor</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="ver-produtos-corpo">
            <!-- Conteúdo dinâmico -->
          </div>
        </div>
      </div>
    </div>
  `;
}

function submitFornecedorForm() {
  const nome = document.getElementById('fornecedor-nome').value;
  const contato = document.getElementById('fornecedor-contato').value;
  
  if (nome) {
    addFornecedor({ nome, contato });
    hideFornecedorModal();
  } else {
    alert('Por favor, preencha o nome do fornecedor.');
  }
}

function verProdutosFornecedor(id) {
  const fornecedor = fornecedoresData.find(f => f.id === id);
  const produtos = produtosData.filter(p => p.fornecedorId === id);
  
  document.getElementById('ver-produtos-titulo').textContent = `Produtos de: ${fornecedor.nome}`;
  
  let html = `
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Produto</th>
            <th>Preço</th>
          </tr>
        </thead>
        <tbody>
          ${produtos.map(p => `
            <tr>
              <td><code>${p.codigo}</code></td>
              <td>${p.nome}</td>
              <td>R$ ${parseFloat(p.preco).toFixed(2)}</td>
            </tr>
          `).join('')}
          ${produtos.length === 0 ? '<tr><td colspan="3" class="text-center py-3">Nenhum produto vinculado.</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  `;
  
  document.getElementById('ver-produtos-corpo').innerHTML = html;
  const modal = new bootstrap.Modal(document.getElementById('ver-produtos-fornecedor-modal'));
  modal.show();
}
