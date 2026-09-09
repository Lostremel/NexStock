let historicoFiltroMesPedido = new Date().getMonth();
let historicoFiltroStatusPedido = 'todos';
async function addPedido(pedidoData) {
  if (pedidoData.produtoId) {
    const pIndex = produtosData.findIndex(p => p.id === pedidoData.produtoId);
    if (pIndex !== -1) {
      if ((produtosData[pIndex].estoque || 0) <= 0) {
        showToast("ERRO: Produto fora de estoque!", "error");
        return;
      }
      produtosData[pIndex].estoque -= 1;
      await syncItemToFirebase('produtos', produtosData[pIndex]);
    }
  }

  const produto = produtosData.find(p => p.id === pedidoData.produtoId);
  const valorTotal = produto ? produto.preco : 0;
  const parcelas = pedidoData.parcelas || 1;

  const novoPedido = {
    id: Date.now(),
    clienteId: pedidoData.clienteId,
    produtoId: pedidoData.produtoId,
    dataHora: new Date().toISOString(),
    valorTotal: valorTotal,
    statusPagamento: pedidoData.statusPagamento || 'devendo',
    parcelas: parcelas,
    valorParcela: valorTotal / parcelas,
    valorRestante: pedidoData.statusPagamento === 'pago' ? 0 : valorTotal,
    pagamentosHistorico: []
  };
  if (pedidoData.statusPagamento === 'pago') {
    novoPedido.pagamentosHistorico.push({
      data: novoPedido.dataHora,
      valor: valorTotal
    });
    novoPedido.valorRestante = 0;
  }

  pedidosData.push(novoPedido);
  saveData();
  await syncItemToFirebase('pedidos', novoPedido);
  renderApp();
  showToast('Pedido registrado com sucesso!');
}
async function registrarPagamentoPedido(pedidoId) {
  const pedido = pedidosData.find(p => p.id === pedidoId);
  if (!pedido) return;

  const cliente = clientesData.find(c => c.id === pedido.clienteId);
  const { valorRestante } = calcularTotaisPedido(pedido);

  openInputModal({
    title: 'Baixar Pagamento',
    label: `Valor a pagar para pedido de "${cliente ? cliente.nome : 'Cliente'}" (Restante: R$ ${valorRestante.toFixed(2)})`,
    prefix: 'R$',
    type: 'number',
    placeholder: (pedido.valorParcela || 0).toFixed(2),
    onConfirm: async (value) => {
      const valorPago = parseFloat(value);
      if (isNaN(valorPago) || valorPago <= 0) return;

      pedido.pagamentosHistorico = pedido.pagamentosHistorico || [];
      pedido.pagamentosHistorico.push({
        data: new Date().toISOString(),
        valor: valorPago
      });

      const totais = calcularTotaisPedido(pedido);
      pedido.valorRestante = totais.valorRestante;
      if (totais.valorRestante <= 0) {
        pedido.statusPagamento = 'pago';
      }

      saveData();
      await syncItemToFirebase('pedidos', pedido);
      renderApp();
      showToast('Pagamento registrado!');
    }
  });
}
function verDetalhesPedido(pedidoId) {
  const pedido = pedidosData.find(p => p.id === pedidoId);
  if (!pedido) return;

  const cliente = clientesData.find(c => c.id === pedido.clienteId);
  const produto = produtosData.find(p => p.id === pedido.produtoId);
  const { totalPago, valorTotal, valorRestante } = calcularTotaisPedido(pedido);

  let html = `
    <div class="p-3 mb-3 rounded border" style="background-color: ${valorRestante > 0 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(40, 167, 69, 0.1)'}; border-color: ${valorRestante > 0 ? '#ffc107' : '#28a745'} !important;">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-0 text-muted small">Cliente</h6>
          <div class="fw-bold fs-6">${cliente ? cliente.nome : 'N/A'}</div>
          <h6 class="mb-0 text-muted small mt-2">Produto</h6>
          <div class="fw-bold fs-6 text-primary">${produto ? produto.nome : 'Excluído'}</div>
        </div>
        <div class="text-end">
          <h6 class="mb-0 text-muted small">Valor Total</h6>
          <div class="fw-bold fs-5 text-primary">R$ ${valorTotal.toFixed(2)}</div>
          <h6 class="mb-0 text-muted small mt-2">Restante</h6>
          <div class="fw-bold fs-5 ${valorRestante > 0 ? 'text-warning' : 'text-success'}">R$ ${valorRestante.toFixed(2)}</div>
          <div class="small fw-bold mt-1">${valorRestante > 0 ? '⚠️ PENDENTE' : '✅ PAGO'}</div>
        </div>
      </div>
    </div>

    <div class="row g-2 mb-3">
      <div class="col-6">
        <div class="small text-muted">Data do Pedido</div>
        <div class="fw-bold">${formatarDataBR(pedido.dataHora, true)}</div>
      </div>
      <div class="col-3">
        <div class="small text-muted">Parcelas</div>
        <div class="fw-bold">${pedido.parcelas}x</div>
      </div>
      <div class="col-3">
        <div class="small text-muted">Valor Parcela</div>
        <div class="fw-bold">R$ ${(pedido.valorParcela || 0).toFixed(2)}</div>
      </div>
    </div>

    <div class="mb-2 fw-bold small text-muted text-uppercase">Histórico de Pagamentos</div>
    <div class="table-responsive" style="max-height: 200px; border-radius: 8px; border: 1px solid #eee;">
      <table class="table table-sm table-hover mb-0">
        <thead class="table-light sticky-top">
          <tr class="small text-muted">
            <th>Data/Hora</th>
            <th>Valor Pago</th>
          </tr>
        </thead>
        <tbody>
          ${(pedido.pagamentosHistorico || []).map(pag => `
            <tr>
              <td class="small text-muted">${formatarDataBR(pag.data, true)}</td>
              <td class="text-success fw-bold">R$ ${parseFloat(pag.valor).toFixed(2)}</td>
            </tr>
          `).join('') || '<tr><td colspan="2" class="text-center py-3 text-muted">Nenhum pagamento registrado.</td></tr>'}
        </tbody>
      </table>
    </div>

    ${valorRestante > 0 ? `
      <div class="mt-3 d-grid">
        <button class="btn btn-success" onclick="registrarPagamentoPedido(${pedido.id})">
          <i class="fas fa-dollar-sign me-1"></i> Baixar Pagamento
        </button>
      </div>
    ` : ''}
  `;

  const modalEl = document.getElementById('ver-produtos-fornecedor-modal');
  document.getElementById('ver-produtos-titulo').textContent = `Pedido #${pedido.id}`;
  document.getElementById('ver-produtos-corpo').innerHTML = html;

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}
function verPedidosCliente(clienteId) {
  const cliente = clientesData.find(c => c.id === clienteId);
  if (!cliente) return;

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const pedidosCliente = getPedidosDoCliente(clienteId);
  const totalGasto = getTotalGastoCliente(clienteId);
  const saldoDevedor = getSaldoDevedorCliente(clienteId);

  const ranking = [...clientesData].map(c => ({
    id: c.id,
    total: getTotalGastoCliente(c.id)
  })).sort((a, b) => b.total - a.total);
  const posicaoRank = ranking.findIndex(r => r.id === cliente.id) + 1;

  const pedidosFiltrados = pedidosCliente.filter(pedido => {
    const d = new Date(pedido.dataHora);
    const matchMes = d.getMonth() === historicoFiltroMesPedido;
    const { valorRestante } = calcularTotaisPedido(pedido);
    const isPago = valorRestante <= 0;
    const matchStatus = historicoFiltroStatusPedido === 'todos' ||
                       (historicoFiltroStatusPedido === 'pago' && isPago) ||
                       (historicoFiltroStatusPedido === 'pendente' && !isPago);
    return matchMes && matchStatus;
  });

  let html = `
    <div class="p-3 mb-3 rounded border" style="background-color: ${saldoDevedor > 0 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(40, 167, 69, 0.1)'}; border-color: ${saldoDevedor > 0 ? '#ffc107' : '#28a745'} !important;">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-0 text-muted small">Total Comprado</h6>
          <div class="fw-bold fs-5 text-primary">R$ ${totalGasto.toFixed(2)}</div>
          <div class="badge bg-info mt-1"><i class="fas fa-trophy me-1"></i> #${posicaoRank} no Ranking</div>
        </div>
        <div class="text-end">
          <h6 class="mb-0 text-muted small">Saldo Devedor</h6>
          <div class="fw-bold fs-5 ${saldoDevedor > 0 ? 'text-warning' : 'text-success'}">R$ ${saldoDevedor.toFixed(2)}</div>
          <div class="small fw-bold mt-1">${saldoDevedor > 0 ? '⚠️ PENDENTE' : '✅ EM DIA'}</div>
        </div>
      </div>
    </div>

    <div class="row g-2 mb-3">
      <div class="col-6">
        <label class="small text-muted mb-1">Mês:</label>
        <select class="form-select form-select-sm" onchange="window.setHistoricoFiltroMesPedido(${clienteId}, this.value)">
          ${meses.map((m, i) => `<option value="${i}" ${i === historicoFiltroMesPedido ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
      </div>
      <div class="col-6">
        <label class="small text-muted mb-1">Status:</label>
        <select class="form-select form-select-sm" onchange="window.setHistoricoFiltroStatusPedido(${clienteId}, this.value)">
          <option value="todos" ${historicoFiltroStatusPedido === 'todos' ? 'selected' : ''}>Todos</option>
          <option value="pago" ${historicoFiltroStatusPedido === 'pago' ? 'selected' : ''}>Pagos</option>
          <option value="pendente" ${historicoFiltroStatusPedido === 'pendente' ? 'selected' : ''}>Pendentes</option>
        </select>
      </div>
    </div>

    <div class="mb-2 fw-bold small text-muted text-uppercase">Pedidos</div>
    <div class="table-responsive mb-4" style="max-height: 250px; border-radius: 8px; border: 1px solid #eee;">
      <table class="table table-sm table-hover mb-0">
        <thead class="table-light sticky-top">
          <tr class="small text-muted">
            <th>Data/Hora</th>
            <th>Produto</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${pedidosFiltrados.map(pedido => {
            const p = produtosData.find(prod => prod.id === pedido.produtoId);
            const { valorRestante } = calcularTotaisPedido(pedido);
            return `
              <tr>
                <td class="small text-muted">${formatarDataBR(pedido.dataHora, true)}</td>
                <td class="fw-bold">${p ? p.nome : 'Excluído'}</td>
                <td class="text-primary fw-bold">R$ ${parseFloat(pedido.valorTotal).toFixed(2)}</td>
                <td><span class="badge ${valorRestante <= 0 ? 'bg-success' : 'bg-warning'}">${valorRestante <= 0 ? 'PAGO' : 'PENDENTE'}</span></td>
                <td>
                  <button class="btn btn-xs btn-outline-primary" onclick="verDetalhesPedido(${pedido.id})" title="Detalhes">
                    <i class="fas fa-eye"></i>
                  </button>
                  ${valorRestante > 0 ? `
                    <button class="btn btn-xs btn-outline-success" onclick="registrarPagamentoPedido(${pedido.id})" title="Pagar">
                      <i class="fas fa-dollar-sign"></i>
                    </button>
                  ` : ''}
                </td>
              </tr>
            `;
          }).join('') || '<tr><td colspan="5" class="text-center py-3 text-muted">Nenhum pedido encontrado.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="mt-3 d-grid">
      <button class="btn btn-primary" onclick="abrirNovoPedidoParaCliente(${clienteId})">
        <i class="fas fa-cart-plus me-1"></i> Novo Pedido
      </button>
    </div>
  `;

  const modalEl = document.getElementById('ver-produtos-fornecedor-modal');
  document.getElementById('ver-produtos-titulo').textContent = `Pedidos: ${cliente.nome}`;
  document.getElementById('ver-produtos-corpo').innerHTML = html;

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function setHistoricoFiltroMesPedido(clienteId, mes) {
  historicoFiltroMesPedido = parseInt(mes);
  verPedidosCliente(clienteId);
}

function setHistoricoFiltroStatusPedido(clienteId, status) {
  historicoFiltroStatusPedido = status;
  verPedidosCliente(clienteId);
}
function abrirNovoPedidoParaCliente(clienteId) {
  const histModal = document.getElementById('ver-produtos-fornecedor-modal');
  const histInstance = bootstrap.Modal.getInstance(histModal);
  if (histInstance) histInstance.hide();

  setTimeout(() => {
    showPedidoModal();
    setTimeout(() => {
      const cliente = clientesData.find(c => c.id === clienteId);
      if (cliente) {
        document.getElementById('pedido-cliente-id').value = clienteId;
        document.getElementById('pedido-cliente-search').value = cliente.nome;
        const container = document.getElementById('selected-cliente-container');
        if (container) {
          container.innerHTML = `
            <div class="selected-produto p-2 border rounded d-flex justify-content-between align-items-center bg-light">
              <div>
                <div class="fw-bold">${cliente.nome}</div>
                <div class="small text-muted">${cliente.telefone}</div>
              </div>
              <div class="ms-2 text-danger" style="cursor:pointer" onclick="removerClienteSelecionado()"><i class="fas fa-times"></i></div>
            </div>
          `;
          container.style.display = 'block';
        }
      }
    }, 200);
  }, 400);
}
function renderPedidos() {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const diasNoMes = new Date(globalFilterYear, globalFilterMonth + 1, 0).getDate();

  const pedidosFiltrados = pedidosData.filter(p => {
    const d = new Date(p.dataHora);
    const matchMes = d.getMonth() === globalFilterMonth;
    const matchAno = d.getFullYear() === globalFilterYear;
    const matchDia = globalFilterDay === 'todos' || d.getDate() === globalFilterDay;
    const matchStatus = pedidoFilterStatus === 'todos' || p.statusPagamento === pedidoFilterStatus;
    const searchTerm = window.pedidoSearchTerm || "";
    const cliente = clientesData.find(c => c.id === p.clienteId);
    const produto = produtosData.find(prod => prod.id === p.produtoId);
    const matchSearch = !searchTerm ||
      (cliente && cliente.nome.toLowerCase().includes(searchTerm)) ||
      (produto && produto.nome.toLowerCase().includes(searchTerm));
    return matchMes && matchAno && matchDia && matchStatus && matchSearch;
  }).sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

  return `
    <div class="page-header d-flex justify-content-between align-items-center flex-wrap">
      <h2>Pedidos</h2>
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
        <button class="btn ${pedidoFilterStatus === 'todos' ? 'btn-primary' : 'btn-outline-primary'}" onclick="setPedidoFilter('todos')">Todos</button>
        <button class="btn ${pedidoFilterStatus === 'pago' ? 'btn-success' : 'btn-outline-success'}" onclick="setPedidoFilter('pago')">Pagos</button>
        <button class="btn ${pedidoFilterStatus === 'devendo' ? 'btn-warning' : 'btn-outline-warning'}" onclick="setPedidoFilter('devendo')">Pendentes</button>
      </div>
    </div>

    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input type="text" id="pedido-search" placeholder="Buscar por cliente ou produto..." value="${window.pedidoSearchTerm || ''}">
    </div>

    <div class="card">
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Cliente</th>
              <th>Produto</th>
              <th>Valor</th>
              <th>Parcelas</th>
              <th>Restante</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="pedidos-table-body">
            ${pedidosFiltrados.map(pedido => {
              const cliente = clientesData.find(c => c.id === pedido.clienteId);
              const produto = produtosData.find(p => p.id === pedido.produtoId);
              const { valorRestante } = calcularTotaisPedido(pedido);
              return `
              <tr>
                <td class="small">${formatarDataBR(pedido.dataHora, true)}</td>
                <td class="fw-bold">${cliente ? cliente.nome : 'N/A'}</td>
                <td>${produto ? produto.nome : 'Excluído'}</td>
                <td>R$ ${parseFloat(pedido.valorTotal).toFixed(2)}</td>
                <td>${pedido.parcelas}x de R$ ${(pedido.valorParcela || 0).toFixed(2)}</td>
                <td class="${valorRestante > 0 ? 'text-danger fw-bold' : 'text-success'}">R$ ${valorRestante.toFixed(2)}</td>
                <td>
                  <span class="badge ${valorRestante <= 0 ? 'bg-success' : 'bg-warning text-dark'}">
                    ${valorRestante <= 0 ? 'PAGO' : 'PENDENTE'}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick="verDetalhesPedido(${pedido.id})" title="Detalhes">
                      <i class="fas fa-eye"></i>
                    </button>
                    ${valorRestante > 0 ? `
                      <button class="btn-action btn-map" onclick="registrarPagamentoPedido(${pedido.id})" title="Baixar Pagamento">
                        <i class="fas fa-dollar-sign"></i>
                      </button>
                    ` : ''}
                    <button class="btn-action btn-delete" onclick="deletePedido(${pedido.id})" title="Excluir">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
            ${pedidosFiltrados.length === 0 ? '<tr><td colspan="8" class="text-center py-4 text-muted">Nenhum pedido encontrado.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>

    <div class="add-button" onclick="showPedidoModal()" title="Novo Pedido">
      <i class="fas fa-plus"></i>
    </div>
    <div class="modal fade" id="pedido-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Novo Pedido</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="pedido-form">
              <h6 class="mb-3"><i class="fas fa-user me-2"></i>Selecionar Cliente</h6>
              <div class="mb-3">
                <div class="produto-selector">
                  <input type="text" id="pedido-cliente-search" class="form-control" placeholder="Buscar cliente por nome, telefone ou CPF..." onfocus="showClienteDropdown()" oninput="filterClientesDropdown(this.value)">
                  <div id="pedido-cliente-dropdown" class="produto-dropdown"></div>
                </div>
                <input type="hidden" id="pedido-cliente-id">
                <div id="selected-cliente-container" class="mt-2" style="display: none;"></div>
              </div>

              <hr>
              <h6 class="mb-3"><i class="fas fa-shopping-cart me-2"></i>Selecionar Produto</h6>
              <div class="mb-3">
                <div class="produto-selector">
                  <input type="text" id="pedido-produto-search" class="form-control" placeholder="Buscar produto por nome ou código..." onfocus="showProdutoDropdownPedido()" oninput="filterProdutosPedido(this.value)">
                  <div id="pedido-produto-dropdown" class="produto-dropdown"></div>
                </div>
                <input type="hidden" id="pedido-produto-id">
                <div id="selected-produto-pedido-container" class="mt-2" style="display: none;"></div>
              </div>

              <hr>
              <h6 class="mb-3"><i class="fas fa-credit-card me-2"></i>Pagamento</h6>
              <div class="row">
                <div class="col-md-4 mb-3">
                  <label class="form-label">Status</label>
                  <select id="pedido-status" class="form-select" onchange="togglePedidoParcelas()">
                    <option value="devendo">Pendente (Devendo)</option>
                    <option value="pago">Pago Total</option>
                  </select>
                </div>
                <div class="col-md-4 mb-3" id="pedido-parcelas-group">
                  <label class="form-label">Parcelamento</label>
                  <select id="pedido-parcelas" class="form-select" onchange="calcularParcelaPedidoPreview()">
                    <option value="1">À Vista</option>
                    <option value="2">2x</option>
                    <option value="3">3x</option>
                    <option value="4">4x</option>
                    <option value="5">5x</option>
                    <option value="6">6x</option>
                  </select>
                </div>
                <div class="col-md-4 mb-3" id="pedido-valor-parcela-group">
                  <label class="form-label">Valor da Parcela</label>
                  <input type="text" id="pedido-parcela-preview" class="form-control" readonly value="R$ 0,00">
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="submitPedidoForm()" style="background-color: var(--rosa-medio); border-color: var(--rosa-medio);">Finalizar Pedido</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
function showPedidoModal() {
  const modalElement = document.getElementById('pedido-modal');
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    const form = document.getElementById('pedido-form');
    if (form) form.reset();
    const clienteContainer = document.getElementById('selected-cliente-container');
    if (clienteContainer) { clienteContainer.style.display = 'none'; clienteContainer.innerHTML = ''; }
    const produtoContainer = document.getElementById('selected-produto-pedido-container');
    if (produtoContainer) { produtoContainer.style.display = 'none'; produtoContainer.innerHTML = ''; }
    document.getElementById('pedido-cliente-id').value = '';
    document.getElementById('pedido-produto-id').value = '';
    const preview = document.getElementById('pedido-parcela-preview');
    if (preview) preview.value = 'R$ 0,00';
    togglePedidoParcelas();
  }
}

function hidePedidoModal() {
  forceHideModal('pedido-modal');
}
function showClienteDropdown() {
  const dropdown = document.getElementById('pedido-cliente-dropdown');
  filterClientesDropdown('');
  dropdown.classList.add('show');
}

function filterClientesDropdown(term) {
  const dropdown = document.getElementById('pedido-cliente-dropdown');
  const termLower = term.toLowerCase();
  const filtered = clientesData.filter(c =>
    c.nome.toLowerCase().includes(termLower) ||
    c.telefone.includes(term) ||
    (c.cpf && c.cpf.includes(term))
  );
  dropdown.innerHTML = filtered.map(c => `
    <div class="produto-item" onclick="selecionarClientePedido(${c.id})">
      <div class="produto-nome">${c.nome}</div>
      <div class="produto-codigo">${c.telefone}${c.cpf ? ' | ' + c.cpf : ''}</div>
    </div>
  `).join('') || '<div class="p-3 text-muted text-center">Nenhum cliente encontrado</div>';
}

function selecionarClientePedido(id) {
  const cliente = clientesData.find(c => c.id === id);
  if (cliente) {
    document.getElementById('pedido-cliente-id').value = cliente.id;
    document.getElementById('pedido-cliente-search').value = cliente.nome;
    document.getElementById('pedido-cliente-dropdown').classList.remove('show');
    const container = document.getElementById('selected-cliente-container');
    container.innerHTML = `
      <div class="selected-produto p-2 border rounded d-flex justify-content-between align-items-center bg-light">
        <div>
          <div class="fw-bold">${cliente.nome}</div>
          <div class="small text-muted">${cliente.telefone}${cliente.cpf ? ' | CPF: ' + cliente.cpf : ''}</div>
        </div>
        <div class="ms-2 text-danger" style="cursor:pointer" onclick="removerClienteSelecionado()"><i class="fas fa-times"></i></div>
      </div>
    `;
    container.style.display = 'block';
  }
}

function removerClienteSelecionado() {
  document.getElementById('pedido-cliente-id').value = '';
  document.getElementById('pedido-cliente-search').value = '';
  const container = document.getElementById('selected-cliente-container');
  if (container) { container.style.display = 'none'; container.innerHTML = ''; }
}
function showProdutoDropdownPedido() {
  const dropdown = document.getElementById('pedido-produto-dropdown');
  filterProdutosPedido('');
  dropdown.classList.add('show');
}

function filterProdutosPedido(term) {
  const dropdown = document.getElementById('pedido-produto-dropdown');
  const termLower = term.toLowerCase();
  const filtered = produtosData.filter(p =>
    p.nome.toLowerCase().includes(termLower) ||
    p.codigo.toLowerCase().includes(termLower)
  );
  dropdown.innerHTML = filtered.map(p => {
    const foraDeEstoque = (p.estoque || 0) <= 0;
    return `
      <div class="produto-item ${foraDeEstoque ? 'text-danger' : ''}" onclick="${foraDeEstoque ? '' : `selecionarProdutoPedido(${p.id})`}">
        <span class="produto-preco">R$ ${parseFloat(p.preco).toFixed(2)}</span>
        <div class="produto-nome">${p.nome} ${foraDeEstoque ? ' (SEM ESTOQUE)' : ''}</div>
        <div class="produto-codigo">${p.codigo} | Est: ${p.estoque || 0}</div>
      </div>
    `;
  }).join('') || '<div class="p-3 text-muted text-center">Nenhum produto encontrado</div>';
}

function selecionarProdutoPedido(id) {
  const produto = produtosData.find(p => p.id === id);
  if (produto) {
    document.getElementById('pedido-produto-id').value = produto.id;
    document.getElementById('pedido-produto-search').value = produto.nome;
    document.getElementById('pedido-produto-dropdown').classList.remove('show');
    const container = document.getElementById('selected-produto-pedido-container');
    container.innerHTML = `
      <div class="selected-produto p-2 border rounded d-flex justify-content-between align-items-center bg-light">
        <div>
          <div class="fw-bold">${produto.nome}</div>
          <div class="small text-muted">${produto.codigo}</div>
        </div>
        <div class="fw-bold text-primary">R$ ${parseFloat(produto.preco).toFixed(2)}</div>
        <div class="ms-2 text-danger" style="cursor:pointer" onclick="removerProdutoPedidoSelecionado()"><i class="fas fa-times"></i></div>
      </div>
    `;
    container.style.display = 'block';
    calcularParcelaPedidoPreview();
  }
}

function removerProdutoPedidoSelecionado() {
  document.getElementById('pedido-produto-id').value = '';
  document.getElementById('pedido-produto-search').value = '';
  const container = document.getElementById('selected-produto-pedido-container');
  if (container) { container.style.display = 'none'; container.innerHTML = ''; }
  const preview = document.getElementById('pedido-parcela-preview');
  if (preview) preview.value = 'R$ 0,00';
}

function togglePedidoParcelas() {
  const status = document.getElementById('pedido-status');
  const parcelasGroup = document.getElementById('pedido-parcelas-group');
  const valorGroup = document.getElementById('pedido-valor-parcela-group');
  if (status && parcelasGroup && valorGroup) {
    const isPago = status.value === 'pago';
    parcelasGroup.style.display = isPago ? 'none' : 'block';
    valorGroup.style.display = isPago ? 'none' : 'block';
  }
}

function calcularParcelaPedidoPreview() {
  const pId = document.getElementById('pedido-produto-id').value;
  const parcelas = parseInt(document.getElementById('pedido-parcelas').value) || 1;
  const produto = produtosData.find(p => p.id == pId);
  if (produto) {
    const valor = produto.preco / parcelas;
    const preview = document.getElementById('pedido-parcela-preview');
    if (preview) preview.value = `R$ ${valor.toFixed(2)}`;
  }
}

function submitPedidoForm() {
  const clienteId = document.getElementById('pedido-cliente-id').value;
  const produtoId = document.getElementById('pedido-produto-id').value;
  const statusPagamento = document.getElementById('pedido-status').value;
  const parcelas = parseInt(document.getElementById('pedido-parcelas').value) || 1;

  if (!clienteId) {
    showToast('Selecione um cliente.', 'error');
    return;
  }
  if (!produtoId) {
    showToast('Selecione um produto.', 'error');
    return;
  }

  addPedido({
    clienteId: parseInt(clienteId),
    produtoId: parseInt(produtoId),
    statusPagamento,
    parcelas: statusPagamento === 'pago' ? 1 : parcelas
  });

  hidePedidoModal();
}

async function deletePedido(id) {
  openInputModal({
    title: 'Excluir Pedido',
    label: 'Tem certeza que deseja excluir este pedido?',
    type: 'hidden',
    prefix: 'CONFIRMAR EXCLUSÃO',
    onConfirm: async () => {
      pedidosData = pedidosData.filter(p => p.id !== id);
      saveData();
      await deleteItemFromFirebase('pedidos', id);
      renderApp();
      showToast('Pedido excluído!');
    }
  });
}

function setPedidoFilter(status) {
  pedidoFilterStatus = status;
  renderApp();
}
function renderPedidosList(tableBody) {
  const searchTerm = window.pedidoSearchTerm || "";
  const pedidosFiltrados = pedidosData.filter(p => {
    const d = new Date(p.dataHora);
    const matchMes = d.getMonth() === globalFilterMonth;
    const matchAno = d.getFullYear() === globalFilterYear;
    const matchDia = globalFilterDay === 'todos' || d.getDate() === globalFilterDay;
    const matchStatus = pedidoFilterStatus === 'todos' || p.statusPagamento === pedidoFilterStatus;
    const cliente = clientesData.find(c => c.id === p.clienteId);
    const produto = produtosData.find(prod => prod.id === p.produtoId);
    const matchSearch = !searchTerm ||
      (cliente && cliente.nome.toLowerCase().includes(searchTerm)) ||
      (produto && produto.nome.toLowerCase().includes(searchTerm));
    return matchMes && matchAno && matchDia && matchStatus && matchSearch;
  }).sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

  tableBody.innerHTML = pedidosFiltrados.map(pedido => {
    const cliente = clientesData.find(c => c.id === pedido.clienteId);
    const produto = produtosData.find(p => p.id === pedido.produtoId);
    const { valorRestante } = calcularTotaisPedido(pedido);
    return `
      <tr>
        <td class="small">${formatarDataBR(pedido.dataHora, true)}</td>
        <td class="fw-bold">${cliente ? cliente.nome : 'N/A'}</td>
        <td>${produto ? produto.nome : 'Excluído'}</td>
        <td>R$ ${parseFloat(pedido.valorTotal).toFixed(2)}</td>
        <td>${pedido.parcelas}x de R$ ${(pedido.valorParcela || 0).toFixed(2)}</td>
        <td class="${valorRestante > 0 ? 'text-danger fw-bold' : 'text-success'}">R$ ${valorRestante.toFixed(2)}</td>
        <td>
          <span class="badge ${valorRestante <= 0 ? 'bg-success' : 'bg-warning text-dark'}">
            ${valorRestante <= 0 ? 'PAGO' : 'PENDENTE'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-edit" onclick="verDetalhesPedido(${pedido.id})" title="Detalhes">
              <i class="fas fa-eye"></i>
            </button>
            ${valorRestante > 0 ? `
              <button class="btn-action btn-map" onclick="registrarPagamentoPedido(${pedido.id})" title="Baixar Pagamento">
                <i class="fas fa-dollar-sign"></i>
              </button>
            ` : ''}
            <button class="btn-action btn-delete" onclick="deletePedido(${pedido.id})" title="Excluir">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('') || '<tr><td colspan="8" class="text-center py-4 text-muted">Nenhum pedido encontrado.</td></tr>';
}
window.addPedido = addPedido;
window.registrarPagamentoPedido = registrarPagamentoPedido;
window.verDetalhesPedido = verDetalhesPedido;
window.verPedidosCliente = verPedidosCliente;
window.setHistoricoFiltroMesPedido = setHistoricoFiltroMesPedido;
window.setHistoricoFiltroStatusPedido = setHistoricoFiltroStatusPedido;
window.abrirNovoPedidoParaCliente = abrirNovoPedidoParaCliente;
window.showPedidoModal = showPedidoModal;
window.hidePedidoModal = hidePedidoModal;
window.showClienteDropdown = showClienteDropdown;
window.filterClientesDropdown = filterClientesDropdown;
window.selecionarClientePedido = selecionarClientePedido;
window.removerClienteSelecionado = removerClienteSelecionado;
window.showProdutoDropdownPedido = showProdutoDropdownPedido;
window.filterProdutosPedido = filterProdutosPedido;
window.selecionarProdutoPedido = selecionarProdutoPedido;
window.removerProdutoPedidoSelecionado = removerProdutoPedidoSelecionado;
window.togglePedidoParcelas = togglePedidoParcelas;
window.calcularParcelaPedidoPreview = calcularParcelaPedidoPreview;
window.submitPedidoForm = submitPedidoForm;
window.deletePedido = deletePedido;
window.setPedidoFilter = setPedidoFilter;
window.renderPedidos = renderPedidos;
window.renderPedidosList = renderPedidosList;
