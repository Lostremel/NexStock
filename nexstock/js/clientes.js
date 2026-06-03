async function syncItemToFirebase(collectionName, item) {
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (user && window.db) {
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    await setDoc(doc(window.db, `users/${user.uid}/${collectionName}`, item.id.toString()), item);
  }
}


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

  if (!editingClienteId && cliente.produtoId) {
    const pIndex = produtosData.findIndex(p => p.id === cliente.produtoId);
    if (pIndex !== -1) {
      if ((produtosData[pIndex].estoque || 0) <= 0) {
        alert("ERRO: Produto fora de estoque!");
        return;
      }
      produtosData[pIndex].estoque -= 1;

      const user = window.getCurrentUser ? window.getCurrentUser() : null;
      if (user && window.db) {
        const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        await setDoc(doc(window.db, `users/${user.uid}/produtos`, cliente.produtoId.toString()), produtosData[pIndex]);
      }
    }
  }

  let itemToSync = null;
  if (editingClienteId) {
    const index = clientesData.findIndex(c => c.id === editingClienteId);
    if (index !== -1) {
      const p = produtosData.find(prod => prod.id === cliente.produtoId);
      
      if (document.getElementById('cliente-modal').querySelector('.modal-title').textContent === 'Adicionar Nova Compra') {
        clientesData[index].comprasHistorico = clientesData[index].comprasHistorico || [];
        clientesData[index].comprasHistorico.push({
          produtoId: cliente.produtoId,
          data: new Date().toISOString(),
          valor: p ? p.preco : 0
        });
     
        clientesData[index].produtoId = cliente.produtoId;
        clientesData[index].statusPagamento = cliente.statusPagamento;
        clientesData[index].parcelas = cliente.parcelas;
        clientesData[index].valorParcela = cliente.valorParcela;
      } else {
        // Edição normal de dados
        clientesData[index] = { ...clientesData[index], ...cliente };
      }
      
      itemToSync = clientesData[index];
      editingClienteId = null;
    }
  } else {
    const newCliente = {
      ...cliente, 
      id: Date.now(),
      dataCadastro: new Date().toISOString(),
      pagamentosHistorico: [], 
      comprasHistorico: [{
        produtoId: cliente.produtoId,
        data: new Date().toISOString(),
        valor: produtosData.find(p => p.id === cliente.produtoId)?.preco || 0
      }]
    };
    clientesData.push(newCliente);
    itemToSync = newCliente;
  }
  saveData();
  if (itemToSync) await syncItemToFirebase('clientes', itemToSync);
  editingClienteId = null;
  renderApp();
}

// Função para registrar pagamento parcial/parcela
async function registrarPagamento(clienteId) {
  const cliente = clientesData.find(c => c.id === clienteId);
  if (!cliente) return;

  openInputModal({
    title: 'Baixar Pagamento',
    label: `Qual o valor pago por "${cliente.nome}"?`,
    prefix: 'R$',
    type: 'number',
    placeholder: (cliente.valorParcela || 0).toFixed(2),
    onConfirm: async (value) => {
      const valorPago = parseFloat(value);
      
      const novoPagamento = {
        data: new Date().toISOString(),
        valor: valorPago
      };

      cliente.pagamentosHistorico = cliente.pagamentosHistorico || [];
      cliente.pagamentosHistorico.push(novoPagamento);

      const totalPago = cliente.pagamentosHistorico.reduce((sum, p) => sum + p.valor, 0);
      const produto = produtosData.find(p => p.id === cliente.produtoId);
      const precoTotal = produto ? produto.preco : 0;

      if (totalPago >= precoTotal) {
        cliente.statusPagamento = 'pago';
      }

      saveData();
      await syncItemToFirebase('clientes', cliente);
      renderApp();
      showToast('Pagamento registrado com sucesso!');
    }
  });
}

async function deleteCliente(id) {
  const cliente = clientesData.find(c => c.id === id);
  if (!cliente) return;

  openInputModal({
    title: 'Excluir Cliente',
    label: `Tem certeza que deseja excluir o cliente "${cliente.nome}"? Esta ação não pode ser desfeita.`,
    prefix: 'CONFIRMAR',
    type: 'hidden',
    onConfirm: async () => {
      clientesData = clientesData.filter(cliente => cliente.id !== id);
      saveData();
      const user = window.getCurrentUser ? window.getCurrentUser() : null;
      if (user && window.db) {
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        await deleteDoc(doc(window.db, `users/${user.uid}/clientes`, id.toString()));
      }
      renderApp();
      showToast('Cliente excluído com sucesso!');
    }
  });
}

function abrirMapa(endereco) {
  if (endereco) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
  }
}

function renderClientes() {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const diasNoMes = new Date(globalFilterYear, globalFilterMonth + 1, 0).getDate();

  const clientesFiltrados = clientesData.filter(c => {
    const matchStatus = clienteFilterStatus === 'todos' || c.statusPagamento === clienteFilterStatus;

    const d = new Date(c.dataCadastro);
    const matchMes = d.getMonth() === globalFilterMonth;
    const matchAno = d.getFullYear() === globalFilterYear;
    const matchDia = globalFilterDay === 'todos' || d.getDate() === globalFilterDay;
    

    const searchTerm = window.clienteSearchTerm || "";
    const matchSearch = c.nome.toLowerCase().includes(searchTerm) || 
                       c.telefone.includes(searchTerm) ||
                       (c.cpf && c.cpf.includes(searchTerm));
    
    return matchStatus && matchMes && matchAno && matchDia && matchSearch;
  }).sort((a, b) => new Date(b.dataCadastro) - new Date(a.dataCadastro));

  return `
    <div class="page-header d-flex justify-content-between align-items-center flex-wrap">
      <h2>Clientes</h2>
      <div class="d-flex gap-2 filter-controls">
        <select class="form-select form-select-sm" onchange="setGlobalFilterDay(this.value)">
          <option value="todos" ${globalFilterDay === 'todos' ? 'selected' : ''}>Todos os Dias</option>
          ${Array.from({length: diasNoMes}, (_, i) => i + 1).map(d => `<option value="${d}" ${d === globalFilterDay ? 'selected' : ''}>Dia ${d}</option>`).join('')}
        </select>
        <select class="form-select form-select-sm" onchange="setGlobalFilterMonth(this.value)">
          ${meses.map((m, i) => `<option value="${i}" ${i === globalFilterMonth ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <select class="form-select form-select-sm" onchange="setGlobalFilterYear(this.value)">
          ${[2024, 2025, 2026, 2027].map(y => `<option value="${y}" ${y === globalFilterYear ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="btn-group btn-group-sm">
        <button class="btn ${clienteFilterStatus === 'todos' ? 'btn-primary' : 'btn-outline-primary'}" onclick="setClienteFilter('todos')">Todos</button>
        <button class="btn ${clienteFilterStatus === 'pago' ? 'btn-success' : 'btn-outline-success'}" onclick="setClienteFilter('pago')">Pagos</button>
        <button class="btn ${clienteFilterStatus === 'devendo' ? 'btn-warning' : 'btn-outline-warning'}" onclick="setClienteFilter('devendo')">Devendo</button>
      </div>
    </div>
    
    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input type="text" id="cliente-search" placeholder="Buscar por nome, telefone ou CPF..." value="${window.clienteSearchTerm || ''}">
    </div>
    
    <div class="clientes-list">
      ${clientesFiltrados.length === 0 ? '<div class="card text-center py-4 text-muted">Nenhum cliente encontrado.</div>' : ''}
      
      ${clientesFiltrados.map((cliente, index) => {
        const dataAtual = formatarDataBR(cliente.dataCadastro);
        const dataAnterior = index > 0 ? formatarDataBR(clientesFiltrados[index-1].dataCadastro) : null;
        const mostrarData = dataAtual !== dataAnterior;
        
        const produto = cliente.produtoId ? produtosData.find(p => p.id === cliente.produtoId) : null;
        const totalPago = (cliente.pagamentosHistorico || []).reduce((sum, p) => sum + p.valor, 0);
        const precoTotal = produto ? produto.preco : 0;
        const saldoDevedor = Math.max(0, precoTotal - totalPago);

        return `
          ${mostrarData ? `<div class="date-divider mt-4 mb-2 fw-bold text-muted small">${dataAtual}</div>` : ''}
          <div class="card mb-2 p-3">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h5 class="mb-1">${cliente.nome}</h5>
                <div class="small text-muted mb-1">
                  <a href="tel:${cliente.telefone.replace(/\D/g, '')}" class="text-decoration-none text-muted">
                    <i class="fas fa-phone me-1 text-primary"></i> ${cliente.telefone}
                  </a>
                </div>
                ${cliente.cpf ? `<div class="small text-muted mb-2"><i class="fas fa-id-card me-1"></i> ${cliente.cpf}</div>` : ''}
                <div class="badge ${cliente.statusPagamento === 'pago' ? 'bg-success' : 'bg-warning text-dark'} mb-2">
                  ${cliente.statusPagamento === 'pago' ? 'PAGO' : 'DEVENDO'}
                </div>
              </div>
	              <div class="text-end">
	                <div class="fw-bold text-primary">${produto ? produto.nome : 'Sem produto'}</div>
	                <div class="small">Total: R$ ${precoTotal.toFixed(2)}</div>
	                ${cliente.parcelas > 1 ? `<div class="extra-small text-muted">${cliente.parcelas}x de R$ ${cliente.valorParcela.toFixed(2)}</div>` : ''}
	                <div class="small text-danger fw-bold">Falta: R$ ${saldoDevedor.toFixed(2)}</div>
                  <div class="mt-1">
                    <button class="btn btn-xs btn-outline-secondary" style="font-size: 0.65rem;" onclick="verHistoricoCliente(${cliente.id})">
                      <i class="fas fa-history"></i> Histórico
                    </button>
                  </div>
	              </div>
            </div>
            
            <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
              <div class="action-buttons">
                ${cliente.endereco ? `
                  <button class="btn-action btn-map" onclick="abrirMapa('${cliente.endereco.replace(/'/g, "\\'")}')" title="Google Maps">
                    <i class="fas fa-map-marker-alt"></i>
                  </button>
                ` : ''}
	                <button class="btn-action btn-map" style="background-color: #28a745;" onclick="novaCompraCliente(${cliente.id})" title="Nova Compra (Carrinho)">
	                  <i class="fas fa-cart-plus"></i>
	                </button>
                  <button class="btn-action btn-edit" onclick="editCliente(${cliente.id})" title="Editar">
	                  <i class="fas fa-edit"></i>
	                </button>
                <button class="btn-action btn-delete" onclick="deleteCliente(${cliente.id})" title="Excluir">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
              ${cliente.statusPagamento !== 'pago' ? `
                <button class="btn btn-sm btn-success" onclick="registrarPagamento(${cliente.id})">
                  <i class="fas fa-dollar-sign me-1"></i> Baixar Pagto
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
    
    <div class="add-button" onclick="showClienteModal()" title="Adicionar Cliente">
      <i class="fas fa-plus"></i>
    </div>
    
    <!-- Modal Cliente -->
    <div class="modal fade" id="cliente-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Novo Pedido / Cliente</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="cliente-form">
              <div class="mb-3">
                <label class="form-label">Nome do Cliente</label>
                <input type="text" id="cliente-nome" class="form-control" required>
              </div>
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Telefone</label>
                  <input type="tel" id="cliente-telefone" class="form-control" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">CPF (Opcional)</label>
                  <input type="text" id="cliente-cpf" class="form-control">
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Endereço (Opcional)</label>
                <input type="text" id="cliente-endereco" class="form-control">
              </div>
              <div class="mb-3">
                <label class="form-label">Selecionar Produto</label>
                <div class="produto-selector">
                  <input type="text" id="produto-search" class="produto-search-input" placeholder="Buscar produto..." onfocus="showProdutoDropdown()" oninput="filterProdutos(this.value)">
                  <input type="hidden" id="selected-produto-id">
                  <div id="produto-dropdown" class="produto-dropdown"></div>
                </div>
                <div id="selected-produto-container" style="display: none;"></div>
              </div>
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Parcelas</label>
                  <select id="cliente-parcelas" class="form-select" onchange="calcularParcelaPreview()">
                    ${[1,2,3,4,5,6,7,8,9,10,11,12].map(n => `<option value="${n}">${n}x</option>`).join('')}
                  </select>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Valor Parcela</label>
                  <input type="text" id="parcela-preview" class="form-control" readonly value="R$ 0,00">
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Status Inicial</label>
                <select id="cliente-status" class="form-select">
                  <option value="devendo">Devendo</option>
                  <option value="pago">Pago à Vista</option>
                </select>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="submitClienteForm()" style="background-color: var(--rosa-medio); border-color: var(--rosa-medio);">Salvar Pedido</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function verHistoricoCliente(id) {
  const cliente = clientesData.find(c => c.id === id);
  if (!cliente) return;

  const totalGasto = (cliente.comprasHistorico || []).reduce((s, c) => s + c.valor, 0);
  const totalPago = (cliente.pagamentosHistorico || []).reduce((s, p) => s + p.valor, 0);
  const saldoDevedorTotal = Math.max(0, totalGasto - totalPago);
  
  const ranking = [...clientesData].map(c => ({
    id: c.id,
    totalGasto: (c.comprasHistorico || []).reduce((s, comp) => s + comp.valor, 0)
  })).sort((a, b) => b.totalGasto - a.totalGasto);
  
  const posicaoRank = ranking.findIndex(r => r.id === cliente.id) + 1;

  let html = `
    <div class="mb-4 p-3 rounded d-flex justify-content-between align-items-center" style="background-color: ${saldoDevedorTotal > 0 ? 'rgba(255, 193, 7, 0.15)' : 'rgba(40, 167, 69, 0.15)'}; border: 1px solid ${saldoDevedorTotal > 0 ? '#ffc107' : '#28a745'};">
      <div>
        <div class="small text-muted">Total Gasto</div>
        <div class="fw-bold text-primary fs-5">R$ ${totalGasto.toFixed(2)}</div>
        <div class="badge bg-info mt-1"><i class="fas fa-trophy me-1"></i> #${posicaoRank} no Ranking</div>
      </div>
      <div class="text-end">
        <div class="small text-muted">Saldo Devedor Atual</div>
        <div class="fw-bold ${saldoDevedorTotal > 0 ? 'text-warning' : 'text-success'} fs-5">R$ ${saldoDevedorTotal.toFixed(2)}</div>
        <div class="small mt-1 fw-bold">${saldoDevedorTotal > 0 ? '⚠️ PENDENTE' : '✅ EM DIA'}</div>
      </div>
    </div>
    
    <h6>Produtos Comprados</h6>
    <div class="table-responsive mb-4">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Data</th>
            <th>Produto</th>
            <th>Valor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${(cliente.comprasHistorico || []).map(compra => {
            const p = produtosData.find(prod => prod.id === compra.produtoId);
            // Simplificação: se o saldo total for 0, tudo está pago. Se não, marcamos como pendente a última compra se for o caso
            // Para ser exato, precisaríamos de status por compra, mas vamos usar a lógica visual solicitada
            const isPago = saldoDevedorTotal <= 0; 
            return `
              <tr style="background-color: ${isPago ? 'rgba(40, 167, 69, 0.05)' : 'rgba(255, 193, 7, 0.05)'}">
                <td>${formatarDataBR(compra.data)}</td>
                <td class="fw-bold">${p ? p.nome : 'Excluído'}</td>
                <td>R$ ${compra.valor.toFixed(2)}</td>
                <td><span class="badge ${isPago ? 'bg-success' : 'bg-warning text-dark'}">${isPago ? 'PAGO' : 'PENDENTE'}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <h6>Histórico de Pagamentos Realizados</h6>
    <div class="table-responsive">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Data</th>
            <th>Valor Pago</th>
          </tr>
        </thead>
        <tbody>
          ${(cliente.pagamentosHistorico || []).map(pag => `
            <tr>
              <td>${formatarDataBR(pag.data, true)}</td>
              <td class="text-success fw-bold">+ R$ ${pag.valor.toFixed(2)}</td>
            </tr>
          `).join('') || '<tr><td colspan="2" class="text-center py-2">Nenhum pagamento registrado.</td></tr>'}
        </tbody>
      </table>
    </div>
    
    <div class="mt-3 text-center">
       <button class="btn btn-primary" onclick="novaCompraCliente(${cliente.id})">
         <i class="fas fa-cart-plus me-1"></i> Nova Compra (Carrinho)
       </button>
    </div>
  `;

  const modalEl = document.getElementById('ver-produtos-fornecedor-modal');
  document.getElementById('ver-produtos-titulo').textContent = `Ficha do Cliente: ${cliente.nome}`;
  document.getElementById('ver-produtos-corpo').innerHTML = html;
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

async function novaCompraCliente(id) {
  const cliente = clientesData.find(c => c.id === id);
  if (!cliente) return;
  
  const histModal = document.getElementById('ver-produtos-fornecedor-modal');
  const histInstance = bootstrap.Modal.getInstance(histModal);
  if (histInstance) histInstance.hide();
  
  editingClienteId = id;
  const modalElement = document.getElementById('cliente-modal');
  
  setTimeout(() => {
    document.getElementById('cliente-nome').value = cliente.nome || '';
    document.getElementById('cliente-telefone').value = cliente.telefone || '';
    document.getElementById('cliente-cpf').value = cliente.cpf || '';
    document.getElementById('cliente-endereco').value = cliente.endereco || '';
    document.getElementById('cliente-parcelas').value = 1;
    document.getElementById('cliente-status').value = 'devendo';
    

    removerProdutoSelecionado();
    
    modalElement.querySelector('.modal-title').textContent = 'Adicionar Nova Compra';
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }, 300);
}

window.verHistoricoCliente = verHistoricoCliente;
window.novaCompraCliente = novaCompraCliente;

function setClienteFilter(status) {
  clienteFilterStatus = status;
  renderApp();
}

function calcularParcelaPreview() {
  const pId = document.getElementById('selected-produto-id').value;
  const parcelas = parseInt(document.getElementById('cliente-parcelas').value);
  const produto = produtosData.find(p => p.id == pId);
  if (produto) {
    const valor = produto.preco / parcelas;
    document.getElementById('parcela-preview').value = `R$ ${valor.toFixed(2)}`;
  }
}

function showProdutoDropdown() {
  const dropdown = document.getElementById('produto-dropdown');
  filterProdutos('');
  dropdown.classList.add('show');
}

function filterProdutos(term) {
  const dropdown = document.getElementById('produto-dropdown');
  const filtered = produtosData.filter(p => 
    p.nome.toLowerCase().includes(term.toLowerCase()) || 
    p.codigo.toLowerCase().includes(term.toLowerCase())
  );
  
  dropdown.innerHTML = filtered.map(p => {
    const foraDeEstoque = (p.estoque || 0) <= 0;
    return `
      <div class="produto-item ${foraDeEstoque ? 'text-danger' : ''}" onclick="${foraDeEstoque ? '' : `selecionarProduto(${p.id})`}">
        <span class="produto-preco">R$ ${parseFloat(p.preco).toFixed(2)}</span>
        <div class="produto-nome">${p.nome} ${foraDeEstoque ? ' (SEM ESTOQUE)' : ''}</div>
        <div class="produto-codigo">${p.codigo} | Estoque: ${p.estoque || 0}</div>
      </div>
    `;
  }).join('');
}

function selecionarProduto(id) {
  const produto = produtosData.find(p => p.id === id);
  if (produto) {
    document.getElementById('selected-produto-id').value = produto.id;
    document.getElementById('produto-search').value = produto.nome;
    document.getElementById('produto-dropdown').classList.remove('show');
    
    const container = document.getElementById('selected-produto-container');
    container.innerHTML = `
      <div class="selected-produto">
        <div>
          <div class="produto-nome">${produto.nome}</div>
          <div class="produto-codigo">${produto.codigo}</div>
        </div>
        <div class="produto-preco">R$ ${parseFloat(produto.preco).toFixed(2)}</div>
        <div class="remove-produto" onclick="removerProdutoSelecionado()">
          <i class="fas fa-times"></i>
        </div>
      </div>
    `;
    container.style.display = 'block';
    calcularParcelaPreview();
  }
}

function removerProdutoSelecionado() {
  document.getElementById('selected-produto-id').value = '';
  document.getElementById('produto-search').value = '';
  document.getElementById('selected-produto-container').style.display = 'none';
  document.getElementById('parcela-preview').value = 'R$ 0,00';
}

function editCliente(id) {
  const cliente = clientesData.find(c => c.id === id);
  if (cliente) {
    editingClienteId = id;
    
    const modalElement = document.getElementById('cliente-modal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
      
      document.getElementById('cliente-nome').value = cliente.nome || '';
      document.getElementById('cliente-telefone').value = cliente.telefone || '';
      document.getElementById('cliente-cpf').value = cliente.cpf || '';
      document.getElementById('cliente-endereco').value = cliente.endereco || '';
      document.getElementById('cliente-parcelas').value = cliente.parcelas || 1;
      document.getElementById('cliente-status').value = cliente.statusPagamento || 'devendo';
      
      if (cliente.produtoId) {
        selecionarProduto(cliente.produtoId);
      } else {
        removerProdutoSelecionado();
      }
      
      modalElement.querySelector('.modal-title').textContent = 'Editar Cliente';
    }
  }
}

function submitClienteForm() {
  const nome = document.getElementById('cliente-nome').value;
  const telefone = document.getElementById('cliente-telefone').value;
  const cpf = document.getElementById('cliente-cpf').value;
  const endereco = document.getElementById('cliente-endereco').value;
  const produtoId = document.getElementById('selected-produto-id').value;
  const parcelas = parseInt(document.getElementById('cliente-parcelas').value);
  const statusPagamento = document.getElementById('cliente-status').value;
  
  const produto = produtosData.find(p => p.id == produtoId);

  if (nome && telefone && produtoId) {
    addCliente({
      nome,
      telefone,
      cpf,
      endereco,
      produtoId: parseInt(produtoId),
      parcelas,
      valorParcela: produto.preco / parcelas,
      statusPagamento
    });
    hideClienteModal();
    showToast(editingClienteId ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
  } else {
    showToast('Por favor, preencha nome, telefone e selecione um produto.', 'error');
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;
  
  const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-times-circle' : 'fa-exclamation-circle');
  
  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <div class="toast-content">${message}</div>
    <div class="toast-progress"></div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

window.setClienteFilter = setClienteFilter;
window.registrarPagamento = registrarPagamento;
window.calcularParcelaPreview = calcularParcelaPreview;
window.editCliente = editCliente;
window.showToast = showToast;
