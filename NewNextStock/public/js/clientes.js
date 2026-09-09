async function addCliente(cliente) {
  if (cliente.cpf && cliente.cpf.trim() !== "") {
    const cpfLimpo = cliente.cpf.replace(/\D/g, '');
    const cpfExistente = clientesData.find(c => {
      const cCpfLimpo = (c.cpf || "").replace(/\D/g, '');
      return cCpfLimpo === cpfLimpo && c.id !== editingClienteId;
    });
    
    if (cpfExistente) {
      showToast(`ERRO: CPF já cadastrado para o cliente "${cpfExistente.nome}"!`, 'error');
      return;
    }
  }

  let itemToSync = null;

  if (editingClienteId) {
    const index = clientesData.findIndex(c => c.id === editingClienteId);
    if (index !== -1) {
      clientesData[index].nome = cliente.nome;
      clientesData[index].telefone = cliente.telefone;
      clientesData[index].cpf = cliente.cpf;
      clientesData[index].endereco = cliente.endereco;
      itemToSync = clientesData[index];
    }
  } else {
    const newCliente = {
      id: Date.now(),
      nome: cliente.nome,
      telefone: cliente.telefone,
      cpf: cliente.cpf || '',
      endereco: cliente.endereco || '',
      dataCadastro: new Date().toISOString()
    };
    clientesData.push(newCliente);
    itemToSync = newCliente;
  }
  
  saveData();
  if (itemToSync) await syncItemToFirebase('clientes', itemToSync);
  editingClienteId = null;
  renderApp();
}

function renderClientes() {
  const searchTerm = window.clienteSearchTerm || "";
  const clientesFiltrados = clientesData.filter(c => {
    if (clienteFilterStatus !== 'todos') {
      const saldo = getSaldoDevedorCliente(c.id);
      if (clienteFilterStatus === 'devendo' && saldo <= 0) return false;
      if (clienteFilterStatus === 'pago' && saldo > 0) return false;
    }
    const matchSearch = c.nome.toLowerCase().includes(searchTerm) || 
                       c.telefone.includes(searchTerm) ||
                       (c.cpf && c.cpf.includes(searchTerm));
    return matchSearch;
  }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  return `
    <div class="page-header d-flex justify-content-between align-items-center flex-wrap">
      <h2>Clientes</h2>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="btn-group btn-group-sm">
        <button class="btn ${clienteFilterStatus === 'todos' ? 'btn-primary' : 'btn-outline-primary'}" onclick="setClienteFilter('todos')">Todos</button>
        <button class="btn ${clienteFilterStatus === 'pago' ? 'btn-success' : 'btn-outline-success'}" onclick="setClienteFilter('pago')">Em Dia</button>
        <button class="btn ${clienteFilterStatus === 'devendo' ? 'btn-warning' : 'btn-outline-warning'}" onclick="setClienteFilter('devendo')">Devendo</button>
      </div>
    </div>
    
    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input type="text" id="cliente-search" placeholder="Buscar por nome, telefone ou CPF..." value="${window.clienteSearchTerm || ''}">
    </div>
    
    <div class="add-button" onclick="showClienteModal()" title="Adicionar Cliente">
      <i class="fas fa-plus"></i>
    </div>

    <div class="clientes-list">
      ${clientesFiltrados.map(cliente => {
        const totalGasto = getTotalGastoCliente(cliente.id);
        const saldo = getSaldoDevedorCliente(cliente.id);
        const numPedidos = getPedidosDoCliente(cliente.id).length;

        return `
          <div class="card mb-3 p-3 shadow-sm border-0">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div style="flex-grow:1;">
                <h4 class="mb-1 fw-bold">${cliente.nome}</h4>
                <div class="small text-muted mb-1"><i class="fas fa-phone me-1 text-primary"></i> ${cliente.telefone}</div>
                ${cliente.cpf ? `<div class="small text-muted mb-1"><i class="fas fa-id-card me-1"></i> ${cliente.cpf}</div>` : ''}
                ${cliente.endereco ? `<div class="small text-muted mb-1"><i class="fas fa-map-marker-alt me-1"></i> ${cliente.endereco}</div>` : ''}
                <div class="mt-2">
                  <span class="badge ${saldo > 0 ? 'bg-warning text-dark' : 'bg-success'} text-uppercase" style="font-size: 0.7rem; padding: 5px 10px;">
                    ${saldo > 0 ? 'DEVENDO' : 'EM DIA'}
                  </span>
                  <span class="badge bg-info ms-1" style="font-size: 0.7rem; padding: 5px 10px;">
                    ${numPedidos} pedido(s)
                  </span>
                </div>
              </div>
              <div class="text-end">
                <div class="small text-muted">Total Comprado</div>
                <div class="fw-bold text-primary" style="font-size: 1.1rem;">R$ ${totalGasto.toFixed(2)}</div>
                ${saldo > 0 ? `<div class="fw-bold text-danger" style="font-size: 0.9rem;">Falta: R$ ${saldo.toFixed(2)}</div>` : ''}
              </div>
            </div>
            
            <hr class="my-2 opacity-10">
            
            <div class="d-flex justify-content-between align-items-center">
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-success p-2" style="width: 35px; height: 35px; background-color: #28a745;" onclick="abrirNovoPedidoParaCliente(${cliente.id})" title="Novo Pedido">
                  <i class="fas fa-shopping-cart"></i>
                </button>
                <button class="btn btn-sm btn-outline-dark p-2" style="width: 35px; height: 35px;" onclick="editCliente(${cliente.id})" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger p-2" style="width: 35px; height: 35px;" onclick="deleteCliente(${cliente.id})" title="Excluir">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
              <button class="btn btn-outline-primary px-3 fw-bold" onclick="verPedidosCliente(${cliente.id})" style="border-radius: 8px;">
                <i class="fas fa-history me-1"></i> Ver Pedidos
              </button>
            </div>
          </div>
        `;
      }).join('') || '<div class="text-center py-4 text-muted">Nenhum cliente encontrado.</div>'}
    </div>
    <div class="modal fade" id="cliente-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${editingClienteId ? 'Editar Cliente' : 'Novo Cliente'}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="cliente-form">
              <div class="mb-3">
                <label class="form-label">Nome do Cliente</label>
                <input type="text" id="cliente-nome" class="form-control" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Telefone</label>
                <input type="text" id="cliente-telefone" class="form-control" required>
              </div>
              <div class="mb-3">
                <label class="form-label">CPF/CNPJ (Opcional)</label>
                <input type="text" id="cliente-cpf" class="form-control">
              </div>
              <div class="mb-3">
                <label class="form-label">Endereço</label>
                <input type="text" id="cliente-endereco" class="form-control">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="submitClienteForm()" style="background-color: var(--rosa-medio); border-color: var(--rosa-medio);">Salvar Cliente</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function showClienteModal() {
  editingClienteId = null;
  const modalElement = document.getElementById('cliente-modal');
  if (modalElement) {
    const form = document.getElementById('cliente-form');
    if (form) form.reset();
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }
}

function editCliente(id) {
  const cliente = clientesData.find(c => c.id === id);
  if (cliente) {
    editingClienteId = id;
    const modalElement = document.getElementById('cliente-modal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    setTimeout(() => {
      document.getElementById('cliente-nome').value = cliente.nome || '';
      document.getElementById('cliente-telefone').value = cliente.telefone || '';
      document.getElementById('cliente-cpf').value = cliente.cpf || '';
      document.getElementById('cliente-endereco').value = cliente.endereco || '';
    }, 200);
  }
}

function submitClienteForm() {
  const nome = document.getElementById('cliente-nome').value;
  const telefone = document.getElementById('cliente-telefone').value;
  const cpf = document.getElementById('cliente-cpf').value;
  const endereco = document.getElementById('cliente-endereco').value;

  if (nome && telefone) {
    addCliente({ nome, telefone, cpf, endereco });
    const modal = bootstrap.Modal.getInstance(document.getElementById('cliente-modal'));
    if (modal) modal.hide();
    showToast(editingClienteId ? 'Cliente atualizado!' : 'Cliente cadastrado!');
  } else {
    showToast('Preencha os campos obrigatórios (Nome e Telefone).', 'error');
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;
  const icon = type === 'success' ? 'fa-check-circle' : 'fa-times-circle';
  toast.innerHTML = `<i class="fas ${icon}"></i><div class="toast-content">${message}</div><div class="toast-progress"></div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function setClienteFilter(status) {
  clienteFilterStatus = status;
  renderApp();
}

async function deleteCliente(id) {
  openInputModal({
    title: 'Excluir Cliente',
    label: 'Tem certeza que deseja excluir este cliente?',
    type: 'hidden',
    onConfirm: async () => {
      clientesData = clientesData.filter(c => c.id !== id);
      saveData();
      await deleteItemFromFirebase('clientes', id);
      renderApp();
      showToast('Cliente excluído!');
    }
  });
}
function renderClientesList(container) {
  const searchTerm = window.clienteSearchTerm || "";
  const clientesFiltrados = clientesData.filter(c => {
    if (clienteFilterStatus !== 'todos') {
      const saldo = getSaldoDevedorCliente(c.id);
      if (clienteFilterStatus === 'devendo' && saldo <= 0) return false;
      if (clienteFilterStatus === 'pago' && saldo > 0) return false;
    }
    const matchSearch = c.nome.toLowerCase().includes(searchTerm) || 
                       c.telefone.includes(searchTerm) ||
                       (c.cpf && c.cpf.includes(searchTerm));
    return matchSearch;
  }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  container.innerHTML = clientesFiltrados.map(cliente => {
    const totalGasto = getTotalGastoCliente(cliente.id);
    const saldo = getSaldoDevedorCliente(cliente.id);
    const numPedidos = getPedidosDoCliente(cliente.id).length;
    return `
      <div class="card mb-3 p-3 shadow-sm border-0">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div style="flex-grow:1;">
            <h4 class="mb-1 fw-bold">${cliente.nome}</h4>
            <div class="small text-muted mb-1"><i class="fas fa-phone me-1 text-primary"></i> ${cliente.telefone}</div>
            ${cliente.cpf ? `<div class="small text-muted mb-1"><i class="fas fa-id-card me-1"></i> ${cliente.cpf}</div>` : ''}
            ${cliente.endereco ? `<div class="small text-muted mb-1"><i class="fas fa-map-marker-alt me-1"></i> ${cliente.endereco}</div>` : ''}
            <div class="mt-2">
              <span class="badge ${saldo > 0 ? 'bg-warning text-dark' : 'bg-success'} text-uppercase" style="font-size: 0.7rem; padding: 5px 10px;">
                ${saldo > 0 ? 'DEVENDO' : 'EM DIA'}
              </span>
              <span class="badge bg-info ms-1" style="font-size: 0.7rem; padding: 5px 10px;">
                ${numPedidos} pedido(s)
              </span>
            </div>
          </div>
          <div class="text-end">
            <div class="small text-muted">Total Comprado</div>
            <div class="fw-bold text-primary" style="font-size: 1.1rem;">R$ ${totalGasto.toFixed(2)}</div>
            ${saldo > 0 ? `<div class="fw-bold text-danger" style="font-size: 0.9rem;">Falta: R$ ${saldo.toFixed(2)}</div>` : ''}
          </div>
        </div>
        <hr class="my-2 opacity-10">
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-success p-2" style="width: 35px; height: 35px; background-color: #28a745;" onclick="abrirNovoPedidoParaCliente(${cliente.id})" title="Novo Pedido">
              <i class="fas fa-shopping-cart"></i>
            </button>
            <button class="btn btn-sm btn-outline-dark p-2" style="width: 35px; height: 35px;" onclick="editCliente(${cliente.id})" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger p-2" style="width: 35px; height: 35px;" onclick="deleteCliente(${cliente.id})" title="Excluir">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <button class="btn btn-outline-primary px-3 fw-bold" onclick="verPedidosCliente(${cliente.id})" style="border-radius: 8px;">
            <i class="fas fa-history me-1"></i> Ver Pedidos
          </button>
        </div>
      </div>
    `;
  }).join('') || '<div class="text-center py-4 text-muted">Nenhum cliente encontrado.</div>';
}
window.showClienteModal = showClienteModal;
window.setClienteFilter = setClienteFilter;
window.editCliente = editCliente;
window.submitClienteForm = submitClienteForm;
window.showToast = showToast;
window.deleteCliente = deleteCliente;
window.renderClientesList = renderClientesList;
