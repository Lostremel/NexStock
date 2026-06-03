
async function addProduto(produto) {

  const nomeNormalizado = produto.nome.trim().toLowerCase();
  const codigoNormalizado = produto.codigo.trim();

  const existeNome = produtosData.find(p => p.nome.trim().toLowerCase() === nomeNormalizado && p.id !== editingProdutoId);
  const existeCodigo = produtosData.find(p => p.codigo.trim() === codigoNormalizado && p.id !== editingProdutoId);
  
  if (existeNome) {
    showToast(`ERRO: Já existe um produto com o nome "${existeNome.nome}" (Código: ${existeNome.codigo})!`, 'error');
    return;
  }
  
  if (existeCodigo) {
    showToast(`ERRO: O código "${codigoNormalizado}" já está em uso pelo produto "${existeCodigo.nome}"!`, 'error');
    return;
  }

  let itemToSync = null;
  if (editingProdutoId) {
   
    const index = produtosData.findIndex(p => p.id === editingProdutoId);
    if (index !== -1) {
   
      const dataEntradaOriginal = produtosData[index].dataEntrada;
      produtosData[index] = { 
        ...produto, 
        id: editingProdutoId,
        dataEntrada: dataEntradaOriginal || new Date().toISOString() 
      };
      itemToSync = produtosData[index];
    }
  } else {
   
    const newProduto = {
      ...produto, 
      id: Date.now(),
      dataEntrada: new Date().toISOString()
    };
    produtosData.push(newProduto);
    itemToSync = newProduto;
  }
  saveData();
  
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (user && window.db && itemToSync) {
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    await setDoc(doc(window.db, `users/${user.uid}/produtos`, itemToSync.id.toString()), itemToSync);
  }
  
  renderApp();
  showToast(editingProdutoId ? 'Produto atualizado!' : 'Produto cadastrado!');
  editingProdutoId = null;
}

// Função para excluir produto
async function deleteProduto(id) {
  const produto = produtosData.find(p => p.id === id);
  if (!produto) return;

  const clientesComProduto = clientesData.filter(cliente => cliente.produtoId === id);
  if (clientesComProduto.length > 0) {
    showToast(`Não é possível excluir: usado por ${clientesComProduto.length} cliente(s).`, 'error');
    return;
  }
  
  openInputModal({
    title: 'Excluir Produto',
    label: `Tem certeza que deseja excluir o produto "${produto.nome}"?`,
    prefix: 'CONFIRMAR EXCLUSÃO',
    type: 'hidden',
    onConfirm: async () => {
      produtosData = produtosData.filter(produto => produto.id !== id);
      saveData();
      
      const user = window.getCurrentUser ? window.getCurrentUser() : null;
      if (user && window.db) {
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        await deleteDoc(doc(window.db, `users/${user.uid}/produtos`, id.toString()));
      }
      
      renderApp();
      showToast('Produto excluído com sucesso!');
    }
  });
}

// Função para editar produto
function editProduto(id) {
  const produto = produtosData.find(p => p.id === id);
  if (produto) {
    editingProdutoId = id;
    showProdutoModal();
    
    document.getElementById('produto-nome').value = produto.nome;
    document.getElementById('produto-codigo').value = produto.codigo;
    document.getElementById('produto-preco').value = produto.preco;
    document.getElementById('produto-estoque').value = produto.estoque || 0;
    if (document.getElementById('produto-fornecedor')) {
      document.getElementById('produto-fornecedor').value = produto.fornecedorId || "";
    }
  }
}

async function adicionarEstoqueRapido(id) {
  const produto = produtosData.find(p => p.id === id);
  if (!produto) return;

  openInputModal({
    title: 'Adicionar Estoque',
    label: `Quantas unidades de "${produto.nome}" chegaram?`,
    prefix: 'Qtd',
    type: 'number',
    placeholder: '0',
    onConfirm: async (value) => {
      const qtd = parseInt(value);
      const index = produtosData.findIndex(p => p.id === id);
      if (index !== -1) {
        produtosData[index].estoque = (produtosData[index].estoque || 0) + qtd;
        saveData();
        
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        if (user && window.db) {
          const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
          await setDoc(doc(window.db, `users/${user.uid}/produtos`, id.toString()), produtosData[index]);
        }
        renderApp();
        showToast(`Estoque de "${produto.nome}" atualizado! (+${qtd})`);
      }
    }
  });
}

function renderProdutos() {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const diasNoMes = new Date(globalFilterYear, globalFilterMonth + 1, 0).getDate();

  const produtosFiltrados = produtosData.filter(p => {
    const d = new Date(p.dataEntrada);
    const matchMes = d.getMonth() === globalFilterMonth;
    const matchAno = d.getFullYear() === globalFilterYear;
    const matchDia = globalFilterDay === 'todos' || d.getDate() === globalFilterDay;
    
    const searchTerm = window.produtoSearchTerm || "";
    const matchSearch = p.nome.toLowerCase().includes(searchTerm) || p.codigo.toLowerCase().includes(searchTerm);
    
    return matchMes && matchAno && matchDia && matchSearch;
  });

  return `
    <div class="page-header d-flex justify-content-between align-items-center flex-wrap">
      <h2>Produtos & Estoque</h2>
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
    
    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input type="text" id="produto-search-list" placeholder="Buscar por nome ou código..." value="${window.produtoSearchTerm || ''}">
    </div>
    
    <div class="card">
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Fornecedor</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="produtos-table-body">
            ${produtosFiltrados.map(produto => {
              const fornecedor = fornecedoresData.find(f => f.id === produto.fornecedorId);
              const foraDeEstoque = (produto.estoque || 0) <= 0;
              return `
              <tr class="${foraDeEstoque ? 'table-danger' : ''}">
                <td><code>${produto.codigo}</code></td>
                <td>
                  ${produto.nome}
                  <br><small class="text-muted">Entrada: ${formatarDataBR(produto.dataEntrada, true)}</small>
                </td>
                <td>${fornecedor ? fornecedor.nome : '<span class="text-muted">-</span>'}</td>
                <td>R$ ${parseFloat(produto.preco).toFixed(2)}</td>
                <td>
                  <span class="badge ${foraDeEstoque ? 'bg-danger' : 'bg-success'}">
                    ${produto.estoque || 0} unid.
                  </span>
                  ${foraDeEstoque ? '<br><small class="text-danger fw-bold">FORA DE ESTOQUE</small>' : ''}
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-action btn-map" onclick="adicionarEstoqueRapido(${produto.id})" title="Adicionar Estoque">
                      <i class="fas fa-plus-circle"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editProduto(${produto.id})" title="Editar">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteProduto(${produto.id})" title="Excluir">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
            ${produtosData.length === 0 ? '<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum produto cadastrado.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="add-button" onclick="showProdutoModal()" title="Adicionar Produto">
      <i class="fas fa-plus"></i>
    </div>
    
    <!-- Modal Produto -->
    <div class="modal fade" id="produto-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${editingProdutoId ? 'Editar Produto' : 'Novo Produto'}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="produto-form">
              <div class="mb-3">
                <label class="form-label">Nome do Produto</label>
                <input type="text" id="produto-nome" class="form-control" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Código/Referência</label>
                <div class="input-group">
                  <input type="text" id="produto-codigo" class="form-control" required>
                  <button class="btn btn-outline-secondary" type="button" onclick="startScanner()">
                    <i class="fas fa-barcode"></i>
                  </button>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Preço (R$)</label>
                  <input type="number" id="produto-preco" class="form-control" step="0.01" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Qtd. Inicial Estoque</label>
                  <input type="number" id="produto-estoque" class="form-control" required>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Fornecedor</label>
                <select id="produto-fornecedor" class="form-select">
                  <option value="">Selecione um fornecedor</option>
                  ${fornecedoresData.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')}
                </select>
              </div>
              
              <div id="scanner-container" style="display: none;">
                <div class="camera-container">
                  <div id="interactive" class="viewport">
                    <div class="scanner-overlay"></div>
                    <div class="scanner-laser"></div>
                    <div class="scanner-highlight"></div>
                    <div class="scanner-instructions">Aponte para o código de barras</div>
                  </div>
                  <div id="detected-code" class="detected-code"></div>
                  <button type="button" class="btn btn-danger w-100 mt-2" onclick="stopScanner()">Parar Scanner</button>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="submitProdutoForm()" style="background-color: var(--rosa-medio); border-color: var(--rosa-medio);">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function submitProdutoForm() {
  const nome = document.getElementById('produto-nome').value;
  const codigo = document.getElementById('produto-codigo').value;
  const preco = document.getElementById('produto-preco').value;
  const estoque = document.getElementById('produto-estoque').value;
  const fornecedorId = document.getElementById('produto-fornecedor').value;
  
  if (nome && codigo && preco && estoque !== "") {
    addProduto({
      nome,
      codigo,
      preco: parseFloat(preco),
      estoque: parseInt(estoque),
      fornecedorId: fornecedorId ? parseInt(fornecedorId) : null
    });
    hideProdutoModal();
  } else {
    showToast('Por favor, preencha todos os campos.', 'error');
  }
}

function startScanner() {
  document.getElementById('scanner-container').style.display = 'block';
  Quagga.init({
    inputStream: { name: "Live", type: "LiveStream", target: document.querySelector('#interactive'), constraints: { facingMode: "environment" } },
    decoder: { readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader", "upc_reader"] }
  }, function(err) {
    if (err) { alert("Erro ao iniciar a câmera: " + err); return; }
    Quagga.start();
  });
  Quagga.onDetected(function(result) {
    const code = result.codeResult.code;
    document.getElementById('produto-codigo').value = code;
    const detectedDiv = document.getElementById('detected-code');
    detectedDiv.textContent = "Código detectado: " + code;
    detectedDiv.style.display = 'block';
    setTimeout(stopScanner, 1000);
  });
}

function stopScanner() {
  Quagga.stop();
  document.getElementById('scanner-container').style.display = 'none';
}
