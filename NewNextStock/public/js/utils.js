function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('nextsock-theme', newTheme);
  
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) {
    themeIcon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
  }
}

function setGlobalFilterMonth(m) {
  globalFilterMonth = parseInt(m);
  renderApp();
}

function setGlobalFilterYear(y) {
  globalFilterYear = parseInt(y);
  renderApp();
}

function setGlobalFilterDay(d) {
  globalFilterDay = d === 'todos' ? 'todos' : parseInt(d);
  renderApp();
}

window.setGlobalFilterMonth = setGlobalFilterMonth;
window.setGlobalFilterYear = setGlobalFilterYear;
window.setGlobalFilterDay = setGlobalFilterDay;
function calcularReceitaTotal() {
  let total = 0;
  pedidosData.forEach(pedido => {
    (pedido.pagamentosHistorico || []).forEach(pag => {
      total += parseFloat(pag.valor) || 0;
    });
  });
  clientesData.forEach(cliente => {
    if (cliente.pagamentosHistorico && cliente.pagamentosHistorico.length > 0) {
      const temPedido = pedidosData.some(p => p.clienteId === cliente.id);
      if (!temPedido) {
        total += cliente.pagamentosHistorico.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
      }
    } else if (cliente.statusPagamento === 'pago' && !pedidosData.some(p => p.clienteId === cliente.id)) {
      const produto = produtosData.find(p => p.id === cliente.produtoId);
      if (produto) total += parseFloat(produto.preco) || 0;
    }
  });
  return total;
}
function forceHideModal(id) {
  const modalElement = document.getElementById(id);
  if (modalElement) {
    let modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(b => b.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

function showProdutoModal() {
  const modalElement = document.getElementById('produto-modal');
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    if (!editingProdutoId) {
      const form = document.getElementById('produto-form');
      if (form) form.reset();
    }
  }
}

function hideProdutoModal() {
  forceHideModal('produto-modal');
}

function showFornecedorModal() {
  editingFornecedorId = null;
  const modalElement = document.getElementById('fornecedor-modal');
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    const form = document.getElementById('fornecedor-form');
    if (form) form.reset();
  }
}

function hideFornecedorModal() {
  forceHideModal('fornecedor-modal');
}


function openInputModal(options) {
  const modalElement = document.getElementById('input-modal');
  if (!modalElement) return;

  const titleEl = document.getElementById('input-modal-title');
  const labelEl = document.getElementById('input-modal-label');
  const prefixEl = document.getElementById('input-modal-prefix');
  const fieldEl = document.getElementById('input-modal-field');
  const confirmBtn = document.getElementById('input-modal-confirm');
  const errorEl = document.getElementById('input-modal-error');

  titleEl.textContent = options.title || 'Entrada de Dados';
  labelEl.textContent = options.label || 'Digite o valor:';
  prefixEl.textContent = options.prefix || '';
  prefixEl.style.display = options.prefix ? 'flex' : 'none';
  fieldEl.type = options.type === 'hidden' ? 'text' : (options.type || 'number');
  if (options.type === 'hidden') {
    fieldEl.style.display = 'none';
    prefixEl.style.width = '100%';
    prefixEl.style.borderRadius = '8px';
    prefixEl.classList.add('justify-content-center', 'py-3', 'cursor-pointer');
  } else {
    fieldEl.style.display = 'block';
    prefixEl.style.width = '';
    prefixEl.style.borderRadius = '';
    prefixEl.classList.remove('justify-content-center', 'py-3', 'cursor-pointer');
  }
  fieldEl.placeholder = options.placeholder || '0.00';
  fieldEl.value = options.type === 'hidden' ? 'CONFIRMAR' : (options.defaultValue || options.placeholder || '');
  errorEl.style.display = 'none';

  const modal = new bootstrap.Modal(modalElement);
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.onclick = () => {
    const value = fieldEl.value;
    if (value === '' || (options.type === 'number' && parseFloat(value) <= 0)) {
      errorEl.style.display = 'block';
      return;
    }
    options.onConfirm(value);
    modal.hide();
  };

  modal.show();
  modalElement.addEventListener('shown.bs.modal', () => {
    fieldEl.focus();
  }, { once: true });
}

window.openInputModal = openInputModal;
