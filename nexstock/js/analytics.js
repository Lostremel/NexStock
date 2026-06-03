function renderAnalytics() {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const clientesMes = clientesData.filter(c => {
    const d = new Date(c.dataCadastro);
    return d.getMonth() === analyticsSelectedMonth && d.getFullYear() === analyticsSelectedYear;
  });

  const totalVendidoMes = clientesMes.reduce((sum, c) => {
    const p = produtosData.find(prod => prod.id === c.produtoId);
    return sum + (p ? p.preco : 0);
  }, 0);

  let totalRecebidoReal = 0;
  clientesData.forEach(c => {
    (c.pagamentosHistorico || []).forEach(p => {
      const d = new Date(p.data);
      if (d.getMonth() === analyticsSelectedMonth && d.getFullYear() === analyticsSelectedYear) {
        totalRecebidoReal += p.valor;
      }
    });
  });

  const devedoresAtuais = clientesData.filter(c => {
    const totalGasto = (c.comprasHistorico || []).reduce((s, comp) => s + comp.valor, 0);
    const totalPago = (c.pagamentosHistorico || []).reduce((s, p) => s + p.valor, 0);
    return totalGasto > totalPago;
  });

  return `
    <div class="page-header d-flex justify-content-between align-items-center">
      <h2>Analytics & Fechamento</h2>
      <div class="d-flex gap-2">
        <select class="form-select form-select-sm" onchange="setAnalyticsMonth(this.value)">
          ${meses.map((m, i) => `<option value="${i}" ${i === analyticsSelectedMonth ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <select class="form-select form-select-sm" onchange="setAnalyticsYear(this.value)">
          ${[2024, 2025, 2026, 2027].map(y => `<option value="${y}" ${y === analyticsSelectedYear ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="stats-container">
      <div class="stat-card" style="background: linear-gradient(135deg, #28a745, #20c997);">
        <h3>Vendas Realizadas</h3>
        <div class="value">R$ ${totalVendidoMes.toFixed(2)}</div>
        <small>${clientesMes.length} novos pedidos em ${meses[analyticsSelectedMonth]}</small>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #ffc107, #fd7e14);">
        <h3>Dinheiro em Caixa</h3>
        <div class="value">R$ ${totalRecebidoReal.toFixed(2)}</div>
        <small>Total recebido neste mês</small>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #dc3545, #c82333);">
        <h3>Total Pendente</h3>
        <div class="value">${devedoresAtuais.length}</div>
        <small>Clientes com saldo devedor</small>
      </div>
    </div>

    <div class="row mt-4">
      <div class="col-md-8">
        <div class="card h-100">
          <h5><i class="fas fa-calendar-alt text-primary me-2"></i> Calendário de Vendas (${meses[analyticsSelectedMonth]})</h5>
          <div class="d-flex flex-wrap gap-1 mt-3">
            ${renderCalendarHeatmap()}
          </div>
          <div class="mt-3 small text-muted d-flex gap-3">
            <span><i class="fas fa-square text-success"></i> Venda Paga</span>
            <span><i class="fas fa-square text-warning"></i> Venda Pendente</span>
            <span><i class="fas fa-square" style="color:#eee"></i> Sem Venda</span>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100">
          <h5><i class="fas fa-gem text-info me-2"></i> Resumo de Estoque</h5>
          <div class="mt-3">
            ${renderEstoqueSummary()}
          </div>
        </div>
      </div>
    </div>

    <div class="row mt-4">
      <div class="col-md-6">
        <div class="card h-100">
          <h5><i class="fas fa-trophy text-warning me-2"></i> Ranking: Melhores Clientes</h5>
          <p class="small text-muted">Quem mais comprou na história do site</p>
          <div class="table-responsive">
            <table class="table table-sm table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Total Gasto</th>
                </tr>
              </thead>
              <tbody>
                ${renderTopClientes()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card h-100">
          <h5><i class="fas fa-exclamation-triangle text-danger me-2"></i> Ranking: Maiores Devedores</h5>
          <p class="small text-muted">Quem possui o maior saldo devedor acumulado</p>
          <div class="table-responsive">
            <table class="table table-sm table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Saldo Devedor</th>
                </tr>
              </thead>
              <tbody>
                ${renderTopDevedores()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="analytics-tabs mt-4">
      <div class="analytics-tab ${activeAnalyticsTab === 'overview' ? 'active' : ''}" onclick="setAnalyticsTab('overview')">Devedores Detalhados</div>
      <div class="analytics-tab ${activeAnalyticsTab === 'compradores' ? 'active' : ''}" onclick="setAnalyticsTab('compradores')">Vendas do Mês</div>
    </div>

    <div class="card border-top-0 rounded-top-0">
      ${activeAnalyticsTab === 'overview' ? renderDevedoresList() : renderCompradoresList(clientesMes)}
    </div>
  `;
}

function renderTopClientes() {
  const rank = clientesData.map(c => {
    const total = (c.comprasHistorico || []).reduce((s, comp) => s + comp.valor, 0);
    return { nome: c.nome, total };
  }).sort((a, b) => b.total - a.total).slice(0, 5);

  return rank.map((c, i) => `
    <tr>
      <td><span class="badge ${i === 0 ? 'bg-warning' : 'bg-light text-dark'}">${i + 1}º</span></td>
      <td class="fw-bold">${c.nome}</td>
      <td class="text-success">R$ ${c.total.toFixed(2)}</td>
    </tr>
  `).join('') || '<tr><td colspan="3" class="text-center">Sem dados</td></tr>';
}

function renderTopDevedores() {
  const rank = clientesData.map(c => {
    const totalGasto = (c.comprasHistorico || []).reduce((s, comp) => s + comp.valor, 0);
    const totalPago = (c.pagamentosHistorico || []).reduce((s, p) => s + p.valor, 0);
    const saldo = Math.max(0, totalGasto - totalPago);
    return { nome: c.nome, saldo };
  }).filter(c => c.saldo > 0).sort((a, b) => b.saldo - a.saldo).slice(0, 5);

  return rank.map((c, i) => `
    <tr>
      <td><span class="badge bg-danger">${i + 1}º</span></td>
      <td class="fw-bold">${c.nome}</td>
      <td class="text-danger">R$ ${c.saldo.toFixed(2)}</td>
    </tr>
  `).join('') || '<tr><td colspan="3" class="text-center">Nenhum devedor! 👏</td></tr>';
}

function renderDevedoresList() {
  const devedores = clientesData.filter(c => {
    const totalGasto = (c.comprasHistorico || []).reduce((s, comp) => s + comp.valor, 0);
    const totalPago = (c.pagamentosHistorico || []).reduce((s, p) => s + p.valor, 0);
    return totalGasto > totalPago;
  });

  return `
    <div class="table-responsive">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Último Produto</th>
            <th>Saldo Devedor Total</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          ${devedores.map(c => {
            const p = produtosData.find(prod => prod.id === c.produtoId);
            const totalGasto = (c.comprasHistorico || []).reduce((s, comp) => s + comp.valor, 0);
            const totalPago = (c.pagamentosHistorico || []).reduce((s, p) => s + p.valor, 0);
            const falta = totalGasto - totalPago;
            return `
              <tr>
                <td>${c.nome}</td>
                <td>${p ? p.nome : '-'}</td>
                <td class="text-danger fw-bold">R$ ${falta.toFixed(2)}</td>
                <td><button class="btn btn-xs btn-outline-primary" onclick="setActivePage('clientes'); setTimeout(() => verHistoricoCliente(${c.id}), 100)">Ficha</button></td>
              </tr>
            `;
          }).join('')}
          ${devedores.length === 0 ? '<tr><td colspan="4" class="text-center py-3">Nenhum devedor! 👏</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  `;
}

function renderCompradoresList(clientesMes) {
  return `
    <div class="table-responsive">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Produto</th>
            <th>Data</th>
            <th>Valor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${clientesMes.map(c => {
            const p = produtosData.find(prod => prod.id === c.produtoId);
            return `
              <tr>
                <td>${c.nome}</td>
                <td>${p ? p.nome : '-'}</td>
                <td>${formatarDataBR(c.dataCadastro)}</td>
                <td class="fw-bold">R$ ${(p ? p.preco : 0).toFixed(2)}</td>
                <td><span class="badge ${c.statusPagamento === 'pago' ? 'bg-success' : 'bg-warning'}">${c.statusPagamento.toUpperCase()}</span></td>
              </tr>
            `;
          }).join('')}
          ${clientesMes.length === 0 ? '<tr><td colspan="5" class="text-center py-3">Nenhuma venda este mês.</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  `;
}

function renderCalendarHeatmap() {
  const daysInMonth = new Date(analyticsSelectedYear, analyticsSelectedMonth + 1, 0).getDate();
  let html = '';
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dObj = new Date(analyticsSelectedYear, analyticsSelectedMonth, i);
    const dataStr = dObj.toLocaleDateString();
    const vendasDia = clientesData.filter(c => new Date(c.dataCadastro).toLocaleDateString() === dataStr);
    
    let color = '#eee';
    let title = `Dia ${i}: Sem vendas`;
    
    if (vendasDia.length > 0) {
      const temPendente = vendasDia.some(v => v.statusPagamento === 'devendo');
      color = temPendente ? '#ffc107' : '#28a745';
      title = `Dia ${i}: ${vendasDia.length} venda(s)`;
    }

    html += `<div style="width:32px; height:32px; background-color:${color}; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:11px; cursor:help; color:${color === '#eee' ? '#999' : 'white'}; font-weight:bold;" title="${title}">${i}</div>`;
  }
  return html;
}

function renderEstoqueSummary() {
  const totalProdutos = produtosData.reduce((sum, p) => sum + (p.estoque || 0), 0);
  const foraDeEstoque = produtosData.filter(p => (p.estoque || 0) <= 0).length;
  
  return `
    <div class="d-flex justify-content-between mb-2">
      <span>Total em Itens:</span>
      <span class="fw-bold">${totalProdutos}</span>
    </div>
    <div class="d-flex justify-content-between mb-2">
      <span>Produtos Esgotados:</span>
      <span class="text-danger fw-bold">${foraDeEstoque}</span>
    </div>
    <div class="progress mt-3" style="height: 10px;">
      <div class="progress-bar bg-success" style="width: ${Math.max(10, 100 - (foraDeEstoque/Math.max(1, produtosData.length)*100))}%"></div>
    </div>
    <div class="mt-4">
      <h6 class="small fw-bold">Mais Vendidos (Mês):</h6>
      <ul class="list-unstyled small">
        ${getMaisVendidos()}
      </ul>
    </div>
  `;
}

function getMaisVendidos() {
  const counts = {};
  clientesData.forEach(c => {
    const d = new Date(c.dataCadastro);
    if (d.getMonth() === analyticsSelectedMonth && d.getFullYear() === analyticsSelectedYear) {
      counts[c.produtoId] = (counts[c.produtoId] || 0) + 1;
    }
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return sorted.map(([id, count]) => {
    const p = produtosData.find(prod => prod.id == id);
    return `<li class="mb-1"><i class="fas fa-medal text-warning me-1"></i> ${p ? p.nome : 'Excluído'}: <b>${count} v.</b></li>`;
  }).join('') || 'Nenhuma venda';
}

function setAnalyticsMonth(m) {
  analyticsSelectedMonth = parseInt(m);
  renderApp();
}

function setAnalyticsYear(y) {
  analyticsSelectedYear = parseInt(y);
  renderApp();
}

function setAnalyticsTab(tab) {
  activeAnalyticsTab = tab;
  renderApp();
}

window.setAnalyticsMonth = setAnalyticsMonth;
window.setAnalyticsYear = setAnalyticsYear;
window.setAnalyticsTab = setAnalyticsTab;
