
let manutencaoFilterStatus = 'todos';

function renderManutencao() {
  const searchTerm = window.manutencaoSearchTerm || "";
  const hoje = new Date();

  const itens = manutencaoData.filter(m => {
    if (manutencaoFilterStatus === 'pendente' && m.status === 'devolvido') return false;
    if (manutencaoFilterStatus === 'expirado') {
      if (m.status === 'devolvido') return false;
      const prazo = new Date(m.prazoGarantia);
      if (prazo >= hoje) return false;
    }
    if (manutencaoFilterStatus === 'devolvido' && m.status !== 'devolvido') return false;
    const cliente = clientesData.find(c => c.id === m.clienteId);
    const produto = produtosData.find(p => p.id === m.produtoId);
    const matchSearch = !searchTerm ||
      (cliente && cliente.nome.toLowerCase().includes(searchTerm)) ||
      (produto && produto.nome.toLowerCase().includes(searchTerm));
    return matchSearch;
  }).sort((a, b) => new Date(a.prazoGarantia) - new Date(b.prazoGarantia));

  return `
    <div class="page-header d-flex justify-content-between align-items-center flex-wrap">
      <h2><i class="fas fa-tools me-2"></i>Manutenção / Garantia</h2>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="btn-group btn-group-sm">
        <button class="btn ${manutencaoFilterStatus === 'todos' ? 'btn-primary' : 'btn-outline-primary'}" onclick="setManutencaoFilter('todos')">Todos</button>
        <button class="btn ${manutencaoFilterStatus === 'pendente' ? 'btn-warning' : 'btn-outline-warning'}" onclick="setManutencaoFilter('pendente')">Pendentes</button>
        <button class="btn ${manutencaoFilterStatus === 'expirado' ? 'btn-danger' : 'btn-outline-danger'}" onclick="setManutencaoFilter('expirado')">Expirados</button>
        <button class="btn ${manutencaoFilterStatus === 'devolvido' ? 'btn-success' : 'btn-outline-success'}" onclick="setManutencaoFilter('devolvido')">Devolvidos</button>
      </div>
    </div>

    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input type="text" id="manutencao-search" placeholder="Buscar por cliente ou produto..." value="${window.manutencaoSearchTerm || ''}">
    </div>

    <div class="add-button" onclick="showManutencaoModal()" title="Registrar Manutenção">
      <i class="fas fa-plus"></i>
    </div>

    <div class="manutencao-list">
      ${itens.map(item => {
        const cliente = clientesData.find(c => c.id === item.clienteId);
        const produto = produtosData.find(p => p.id === item.produtoId);
        const prazo = new Date(item.prazoGarantia);
        const diffMs = prazo - hoje;
        const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const expirado = diffDias < 0 && item.status !== 'devolvido';
        const devolvido = item.status === 'devolvido';

        let statusBadge, statusText;
        if (devolvido) {
          statusBadge = 'bg-success';
          statusText = 'DEVOLVIDO';
        } else if (expirado) {
          statusBadge = 'bg-danger';
          statusText = `EXPIRADO (${Math.abs(diffDias)} dia(s))`;
        } else {
          statusBadge = 'bg-warning text-dark';
          statusText = `${diffDias} dia(s) restante(s)`;
        }

        return `
          <div class="card mb-3 p-3 shadow-sm border-0 ${expirado ? 'border-start border-danger border-4' : ''}">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div style="flex-grow:1;">
                <h5 class="mb-1 fw-bold">${produto ? produto.nome : 'Produto Excluído'}</h5>
                <div class="small text-muted mb-1"><i class="fas fa-user me-1"></i> ${cliente ? cliente.nome : 'Cliente N/A'}</div>
                <div class="small text-muted mb-1"><i class="fas fa-calendar me-1"></i> Registrado: ${formatarDataBR(item.dataRegistro)}</div>
                <div class="small text-muted mb-1"><i class="fas fa-clock me-1"></i> Prazo: ${formatarDataBR(item.prazoGarantia)}</div>
                ${item.descricaoProblema ? `<div class="small text-muted mb-1"><i class="fas fa-comment me-1"></i> ${item.descricaoProblema}</div>` : ''}
              </div>
              <div class="text-end">
                <span class="badge ${statusBadge}" style="font-size: 0.75rem; padding: 6px 12px;">
                  ${statusText}
                </span>
                ${item.fotoUrl ? `
                  <div class="mt-2">
                    <img src="${item.fotoUrl}" alt="Foto do produto" style="max-width: 80px; max-height: 80px; border-radius: 8px; cursor: pointer; object-fit: cover;" onclick="ampliarFotoManutencao('${item.fotoUrl}')">
                  </div>
                ` : ''}
              </div>
            </div>
            <hr class="my-2 opacity-10">
            <div class="d-flex gap-2">
              ${!devolvido ? `
                <button class="btn btn-sm btn-success" onclick="marcarDevolvido(${item.id})" title="Marcar como devolvido">
                  <i class="fas fa-check me-1"></i> Devolvido
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="estenderGarantia(${item.id})" title="Estender prazo">
                  <i class="fas fa-calendar-plus me-1"></i> Estender Prazo
                </button>
              ` : ''}
              <button class="btn btn-sm btn-outline-danger" onclick="deleteManutencao(${item.id})" title="Excluir">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      }).join('') || '<div class="text-center py-4 text-muted">Nenhum registro de manutenção encontrado.</div>'}
    </div>
    <div class="modal fade" id="manutencao-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header" style="background: linear-gradient(135deg, var(--rosa-escuro), var(--roxo-escuro)); color: white;">
            <h5 class="modal-title"><i class="fas fa-tools me-2"></i>Registrar Manutenção</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="manutencao-form">
              <input type="hidden" id="manutencao-cliente-id">
              <input type="hidden" id="manutencao-produto-id">

              <h6 class="mb-3"><i class="fas fa-user me-2"></i>Cliente</h6>
              <div class="mb-3">
                <div class="produto-selector">
                  <input type="text" id="manutencao-cliente-search" class="form-control" placeholder="Buscar cliente..." onfocus="showManutencaoClienteDropdown()" oninput="filterManutencaoClientes(this.value)">
                  <div class="produto-dropdown" id="manutencao-cliente-dropdown"></div>
                </div>
                <div id="selected-manutencao-cliente" style="display:none;" class="mt-2"></div>
              </div>

              <h6 class="mb-3"><i class="fas fa-gem me-2"></i>Produto Quebrado</h6>
              <div class="mb-3">
                <div class="produto-selector">
                  <input type="text" id="manutencao-produto-search" class="form-control" placeholder="Buscar produto..." onfocus="showManutencaoProdutoDropdown()" oninput="filterManutencaoProdutos(this.value)">
                  <div class="produto-dropdown" id="manutencao-produto-dropdown"></div>
                </div>
                <div id="selected-manutencao-produto" style="display:none;" class="mt-2"></div>
              </div>

              <h6 class="mb-3"><i class="fas fa-comment me-2"></i>Descrição do Problema</h6>
              <div class="mb-3">
                <textarea id="manutencao-descricao" class="form-control" rows="3" placeholder="Descreva o problema do produto..."></textarea>
              </div>

              <h6 class="mb-3"><i class="fas fa-calendar me-2"></i>Prazo de Garantia (dias)</h6>
              <div class="mb-3">
                <input type="number" id="manutencao-prazo-dias" class="form-control" value="30" min="1" max="365" placeholder="Dias para devolver o produto">
                <small class="text-muted">O prazo começa a contar a partir de hoje.</small>
              </div>

              <h6 class="mb-3"><i class="fas fa-camera me-2"></i>Foto do Produto</h6>
              <div class="mb-3">
                <input type="file" id="manutencao-foto" class="form-control" accept="image/*" capture="environment" onchange="previewFotoManutencao(this)">
                <div id="manutencao-foto-preview" class="mt-2" style="display:none;">
                  <img id="manutencao-foto-img" src="" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 8px; object-fit: cover;">
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="submitManutencaoForm()" style="background-color: var(--rosa-medio); border-color: var(--rosa-medio);">
              <i class="fas fa-save me-1"></i> Registrar
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal fade" id="foto-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content bg-dark">
          <div class="modal-header border-0">
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center p-0">
            <img id="foto-modal-img" src="" alt="Foto" style="max-width: 100%; max-height: 70vh; object-fit: contain;">
          </div>
        </div>
      </div>
    </div>
  `;
}
function showManutencaoModal() {
  const modalElement = document.getElementById('manutencao-modal');
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    const form = document.getElementById('manutencao-form');
    if (form) form.reset();
    document.getElementById('manutencao-cliente-id').value = '';
    document.getElementById('manutencao-produto-id').value = '';
    const clienteContainer = document.getElementById('selected-manutencao-cliente');
    if (clienteContainer) { clienteContainer.style.display = 'none'; clienteContainer.innerHTML = ''; }
    const produtoContainer = document.getElementById('selected-manutencao-produto');
    if (produtoContainer) { produtoContainer.style.display = 'none'; produtoContainer.innerHTML = ''; }
    const preview = document.getElementById('manutencao-foto-preview');
    if (preview) preview.style.display = 'none';
  }
}
function showManutencaoClienteDropdown() {
  const dropdown = document.getElementById('manutencao-cliente-dropdown');
  filterManutencaoClientes('');
  dropdown.classList.add('show');
}

function filterManutencaoClientes(term) {
  const dropdown = document.getElementById('manutencao-cliente-dropdown');
  const termLower = term.toLowerCase();
  const filtered = clientesData.filter(c =>
    c.nome.toLowerCase().includes(termLower) ||
    c.telefone.includes(term) ||
    (c.cpf && c.cpf.includes(term))
  );
  dropdown.innerHTML = filtered.map(c => `
    <div class="produto-item" onclick="selecionarManutencaoCliente(${c.id})">
      <div class="produto-nome">${c.nome}</div>
      <div class="produto-codigo">${c.telefone}</div>
    </div>
  `).join('') || '<div class="p-3 text-muted text-center">Nenhum cliente encontrado</div>';
}

function selecionarManutencaoCliente(id) {
  const cliente = clientesData.find(c => c.id === id);
  if (cliente) {
    document.getElementById('manutencao-cliente-id').value = cliente.id;
    document.getElementById('manutencao-cliente-search').value = cliente.nome;
    document.getElementById('manutencao-cliente-dropdown').classList.remove('show');
    const container = document.getElementById('selected-manutencao-cliente');
    container.innerHTML = `
      <div class="selected-produto p-2 border rounded d-flex justify-content-between align-items-center bg-light">
        <div>
          <div class="fw-bold">${cliente.nome}</div>
          <div class="small text-muted">${cliente.telefone}</div>
        </div>
        <div class="ms-2 text-danger" style="cursor:pointer" onclick="removerManutencaoCliente()"><i class="fas fa-times"></i></div>
      </div>
    `;
    container.style.display = 'block';
  }
}

function removerManutencaoCliente() {
  document.getElementById('manutencao-cliente-id').value = '';
  document.getElementById('manutencao-cliente-search').value = '';
  const container = document.getElementById('selected-manutencao-cliente');
  if (container) { container.style.display = 'none'; container.innerHTML = ''; }
}
function showManutencaoProdutoDropdown() {
  const dropdown = document.getElementById('manutencao-produto-dropdown');
  filterManutencaoProdutos('');
  dropdown.classList.add('show');
}

function filterManutencaoProdutos(term) {
  const dropdown = document.getElementById('manutencao-produto-dropdown');
  const termLower = term.toLowerCase();
  const filtered = produtosData.filter(p =>
    p.nome.toLowerCase().includes(termLower) ||
    p.codigo.toLowerCase().includes(termLower)
  );
  dropdown.innerHTML = filtered.map(p => `
    <div class="produto-item" onclick="selecionarManutencaoProduto(${p.id})">
      <div class="produto-nome">${p.nome}</div>
      <div class="produto-codigo">${p.codigo}</div>
    </div>
  `).join('') || '<div class="p-3 text-muted text-center">Nenhum produto encontrado</div>';
}

function selecionarManutencaoProduto(id) {
  const produto = produtosData.find(p => p.id === id);
  if (produto) {
    document.getElementById('manutencao-produto-id').value = produto.id;
    document.getElementById('manutencao-produto-search').value = produto.nome;
    document.getElementById('manutencao-produto-dropdown').classList.remove('show');
    const container = document.getElementById('selected-manutencao-produto');
    container.innerHTML = `
      <div class="selected-produto p-2 border rounded d-flex justify-content-between align-items-center bg-light">
        <div>
          <div class="fw-bold">${produto.nome}</div>
          <div class="small text-muted">${produto.codigo}</div>
        </div>
        <div class="ms-2 text-danger" style="cursor:pointer" onclick="removerManutencaoProduto()"><i class="fas fa-times"></i></div>
      </div>
    `;
    container.style.display = 'block';
  }
}

function removerManutencaoProduto() {
  document.getElementById('manutencao-produto-id').value = '';
  document.getElementById('manutencao-produto-search').value = '';
  const container = document.getElementById('selected-manutencao-produto');
  if (container) { container.style.display = 'none'; container.innerHTML = ''; }
}
function previewFotoManutencao(input) {
  const preview = document.getElementById('manutencao-foto-preview');
  const img = document.getElementById('manutencao-foto-img');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      img.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    preview.style.display = 'none';
  }
}

function ampliarFotoManutencao(url) {
  const modalElement = document.getElementById('foto-modal');
  if (modalElement) {
    document.getElementById('foto-modal-img').src = url;
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }
}
async function submitManutencaoForm() {
  const clienteId = document.getElementById('manutencao-cliente-id').value;
  const produtoId = document.getElementById('manutencao-produto-id').value;
  const descricao = document.getElementById('manutencao-descricao').value;
  const prazoDias = parseInt(document.getElementById('manutencao-prazo-dias').value) || 30;
  const fotoInput = document.getElementById('manutencao-foto');

  if (!clienteId) {
    showToast('Selecione um cliente.', 'error');
    return;
  }
  if (!produtoId) {
    showToast('Selecione um produto.', 'error');
    return;
  }

  let fotoUrl = '';
  if (fotoInput.files && fotoInput.files[0]) {
    fotoUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(fotoInput.files[0]);
    });
  }

  const prazoDate = new Date();
  prazoDate.setDate(prazoDate.getDate() + prazoDias);

  const novaManutencao = {
    id: Date.now(),
    clienteId: parseInt(clienteId),
    produtoId: parseInt(produtoId),
    descricaoProblema: descricao,
    dataRegistro: new Date().toISOString(),
    prazoGarantia: prazoDate.toISOString(),
    fotoUrl: fotoUrl,
    status: 'pendente'
  };

  manutencaoData.push(novaManutencao);
  saveData();
  await syncItemToFirebase('manutencao', novaManutencao);
  
  forceHideModal('manutencao-modal');
  renderApp();
  showToast('Manutenção registrada com sucesso!');
}
async function marcarDevolvido(id) {
  const item = manutencaoData.find(m => m.id === id);
  if (item) {
    item.status = 'devolvido';
    item.dataDevolvido = new Date().toISOString();
    saveData();
    await syncItemToFirebase('manutencao', item);
    renderApp();
    showToast('Produto marcado como devolvido!');
  }
}
function estenderGarantia(id) {
  openInputModal({
    title: 'Estender Prazo de Garantia',
    label: 'Quantos dias adicionais de garantia?',
    type: 'number',
    placeholder: '15',
    onConfirm: async (value) => {
      const dias = parseInt(value);
      if (isNaN(dias) || dias <= 0) return;
      const item = manutencaoData.find(m => m.id === id);
      if (item) {
        const prazoAtual = new Date(item.prazoGarantia);
        prazoAtual.setDate(prazoAtual.getDate() + dias);
        item.prazoGarantia = prazoAtual.toISOString();
        saveData();
        await syncItemToFirebase('manutencao', item);
        renderApp();
        showToast(`Prazo estendido em ${dias} dias!`);
      }
    }
  });
}
async function deleteManutencao(id) {
  openInputModal({
    title: 'Excluir Manutenção',
    label: 'Tem certeza que deseja excluir este registro de manutenção?',
    type: 'hidden',
    prefix: 'CONFIRMAR EXCLUSÃO',
    onConfirm: async () => {
      manutencaoData = manutencaoData.filter(m => m.id !== id);
      saveData();
      await deleteItemFromFirebase('manutencao', id);
      renderApp();
      showToast('Registro de manutenção excluído!');
    }
  });
}

function setManutencaoFilter(status) {
  manutencaoFilterStatus = status;
  renderApp();
}
function getManutencaoAlertas() {
  const hoje = new Date();
  const pendentes = manutencaoData.filter(m => m.status !== 'devolvido');
  const expirados = pendentes.filter(m => new Date(m.prazoGarantia) < hoje);
  const proximos = pendentes.filter(m => {
    const prazo = new Date(m.prazoGarantia);
    const diffDias = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));
    return diffDias >= 0 && diffDias <= 3;
  });
  return { pendentes, expirados, proximos };
}
function renderManutencaoList(container) {
  const searchTerm = window.manutencaoSearchTerm || "";
  const hoje = new Date();

  const itens = manutencaoData.filter(m => {
    if (manutencaoFilterStatus === 'pendente' && m.status === 'devolvido') return false;
    if (manutencaoFilterStatus === 'expirado') {
      if (m.status === 'devolvido') return false;
      const prazo = new Date(m.prazoGarantia);
      if (prazo >= hoje) return false;
    }
    if (manutencaoFilterStatus === 'devolvido' && m.status !== 'devolvido') return false;
    const cliente = clientesData.find(c => c.id === m.clienteId);
    const produto = produtosData.find(p => p.id === m.produtoId);
    const matchSearch = !searchTerm ||
      (cliente && cliente.nome.toLowerCase().includes(searchTerm)) ||
      (produto && produto.nome.toLowerCase().includes(searchTerm));
    return matchSearch;
  }).sort((a, b) => new Date(a.prazoGarantia) - new Date(b.prazoGarantia));

  container.innerHTML = itens.map(item => {
    const cliente = clientesData.find(c => c.id === item.clienteId);
    const produto = produtosData.find(p => p.id === item.produtoId);
    const prazo = new Date(item.prazoGarantia);
    const diffMs = prazo - hoje;
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const expirado = diffDias < 0 && item.status !== 'devolvido';
    const devolvido = item.status === 'devolvido';

    let statusBadge, statusText;
    if (devolvido) {
      statusBadge = 'bg-success';
      statusText = 'DEVOLVIDO';
    } else if (expirado) {
      statusBadge = 'bg-danger';
      statusText = `EXPIRADO (${Math.abs(diffDias)} dia(s))`;
    } else {
      statusBadge = 'bg-warning text-dark';
      statusText = `${diffDias} dia(s) restante(s)`;
    }

    return `
      <div class="card mb-3 p-3 shadow-sm border-0 ${expirado ? 'border-start border-danger border-4' : ''}">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div style="flex-grow:1;">
            <h5 class="mb-1 fw-bold">${produto ? produto.nome : 'Produto Excluído'}</h5>
            <div class="small text-muted mb-1"><i class="fas fa-user me-1"></i> ${cliente ? cliente.nome : 'Cliente N/A'}</div>
            <div class="small text-muted mb-1"><i class="fas fa-calendar me-1"></i> Registrado: ${formatarDataBR(item.dataRegistro)}</div>
            <div class="small text-muted mb-1"><i class="fas fa-clock me-1"></i> Prazo: ${formatarDataBR(item.prazoGarantia)}</div>
            ${item.descricaoProblema ? `<div class="small text-muted mb-1"><i class="fas fa-comment me-1"></i> ${item.descricaoProblema}</div>` : ''}
          </div>
          <div class="text-end">
            <span class="badge ${statusBadge}" style="font-size: 0.75rem; padding: 6px 12px;">
              ${statusText}
            </span>
            ${item.fotoUrl ? `
              <div class="mt-2">
                <img src="${item.fotoUrl}" alt="Foto do produto" style="max-width: 80px; max-height: 80px; border-radius: 8px; cursor: pointer; object-fit: cover;" onclick="ampliarFotoManutencao('${item.fotoUrl}')">
              </div>
            ` : ''}
          </div>
        </div>
        <hr class="my-2 opacity-10">
        <div class="d-flex gap-2">
          ${!devolvido ? `
            <button class="btn btn-sm btn-success" onclick="marcarDevolvido(${item.id})" title="Marcar como devolvido">
              <i class="fas fa-check me-1"></i> Devolvido
            </button>
            <button class="btn btn-sm btn-outline-warning" onclick="estenderGarantia(${item.id})" title="Estender prazo">
              <i class="fas fa-calendar-plus me-1"></i> Estender Prazo
            </button>
          ` : ''}
          <button class="btn btn-sm btn-outline-danger" onclick="deleteManutencao(${item.id})" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('') || '<div class="text-center py-4 text-muted">Nenhum registro de manutenção encontrado.</div>';
}
window.renderManutencao = renderManutencao;
window.renderManutencaoList = renderManutencaoList;
window.showManutencaoModal = showManutencaoModal;
window.showManutencaoClienteDropdown = showManutencaoClienteDropdown;
window.filterManutencaoClientes = filterManutencaoClientes;
window.selecionarManutencaoCliente = selecionarManutencaoCliente;
window.removerManutencaoCliente = removerManutencaoCliente;
window.showManutencaoProdutoDropdown = showManutencaoProdutoDropdown;
window.filterManutencaoProdutos = filterManutencaoProdutos;
window.selecionarManutencaoProduto = selecionarManutencaoProduto;
window.removerManutencaoProduto = removerManutencaoProduto;
window.previewFotoManutencao = previewFotoManutencao;
window.ampliarFotoManutencao = ampliarFotoManutencao;
window.submitManutencaoForm = submitManutencaoForm;
window.marcarDevolvido = marcarDevolvido;
window.estenderGarantia = estenderGarantia;
window.deleteManutencao = deleteManutencao;
window.setManutencaoFilter = setManutencaoFilter;
window.getManutencaoAlertas = getManutencaoAlertas;
