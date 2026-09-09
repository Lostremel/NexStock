let clientesData = JSON.parse(localStorage.getItem('nextsock-clientes')) || [];
let produtosData = JSON.parse(localStorage.getItem('nextsock-produtos')) || [];
let fornecedoresData = JSON.parse(localStorage.getItem('nextsock-fornecedores')) || [];
let pedidosData = JSON.parse(localStorage.getItem('nextsock-pedidos')) || [];
let manutencaoData = JSON.parse(localStorage.getItem('nextsock-manutencao')) || [];
window.clientesData = clientesData;
window.produtosData = produtosData;
window.fornecedoresData = fornecedoresData;
window.pedidosData = pedidosData;
window.manutencaoData = manutencaoData;

let editingClienteId = null;
let editingProdutoId = null;
let editingFornecedorId = null;
let scanner = null;
let activeAnalyticsTab = 'overview';
let activePage = localStorage.getItem('nextsock-active-page') || 'home';
let analyticsSelectedMonth = new Date().getMonth(); // 0-11
let analyticsSelectedYear = new Date().getFullYear();
let clienteFilterStatus = 'todos'; // 'todos', 'pago', 'devendo'
let pedidoFilterStatus = 'todos'; // 'todos', 'pago', 'devendo'
let globalFilterMonth = new Date().getMonth();
let globalFilterYear = new Date().getFullYear();
let globalFilterDay = 'todos'; // 'todos' ou 1-31
function saveData() {
  localStorage.setItem('nextsock-clientes', JSON.stringify(clientesData));
  localStorage.setItem('nextsock-produtos', JSON.stringify(produtosData));
  localStorage.setItem('nextsock-fornecedores', JSON.stringify(fornecedoresData));
  localStorage.setItem('nextsock-pedidos', JSON.stringify(pedidosData));
  localStorage.setItem('nextsock-manutencao', JSON.stringify(manutencaoData));
}
function formatarDataBR(dataISO, incluirHorario = false) {
  if (!dataISO) return '-';
  const data = new Date(dataISO);
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const dataFormatada = `${data.getDate().toString().padStart(2, '0')}/${meses[data.getMonth()]}/${data.getFullYear()}`;
  
  if (incluirHorario) {
    const horas = data.getHours().toString().padStart(2, '0');
    const minutos = data.getMinutes().toString().padStart(2, '0');
    return `${dataFormatada} às ${horas}:${minutos}`;
  }
  
  return dataFormatada;
}
async function syncItemToFirebase(collectionName, item) {
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (user && window.db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(window.db, `users/${user.uid}/${collectionName}`, item.id.toString()), item);
      console.log(`Item sincronizado com sucesso em ${collectionName}`);
    } catch (error) {
      console.error(`Erro ao sincronizar item em ${collectionName}:`, error);
    }
  }
}
async function deleteItemFromFirebase(collectionName, id) {
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (user && window.db) {
    try {
      const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await deleteDoc(doc(window.db, `users/${user.uid}/${collectionName}`, id.toString()));
      console.log(`Item deletado com sucesso de ${collectionName}`);
    } catch (error) {
      console.error(`Erro ao deletar item de ${collectionName}:`, error);
    }
  }
}
function calcularTotaisPedido(pedido) {
  const totalPago = (pedido.pagamentosHistorico || []).reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
  const valorTotal = parseFloat(pedido.valorTotal) || 0;
  const valorRestante = Math.max(0, valorTotal - totalPago);
  return { totalPago, valorTotal, valorRestante };
}
function getPedidosDoCliente(clienteId) {
  return pedidosData.filter(p => p.clienteId === clienteId);
}
function getSaldoDevedorCliente(clienteId) {
  const pedidos = getPedidosDoCliente(clienteId);
  return pedidos.reduce((total, pedido) => {
    const { valorRestante } = calcularTotaisPedido(pedido);
    return total + valorRestante;
  }, 0);
}
function getTotalGastoCliente(clienteId) {
  const pedidos = getPedidosDoCliente(clienteId);
  return pedidos.reduce((total, pedido) => total + (parseFloat(pedido.valorTotal) || 0), 0);
}
function migrarDadosAntigosParaPedidos() {
  const jaMigrou = localStorage.getItem('nextsock-migracao-pedidos-v1');
  if (jaMigrou) return;

  let migrados = 0;
  clientesData.forEach(cliente => {
    if (cliente.comprasHistorico && cliente.comprasHistorico.length > 0) {
      cliente.comprasHistorico.forEach(compra => {
        const pedidoExistente = pedidosData.find(p =>
          p.clienteId === cliente.id &&
          p.produtoId === compra.produtoId &&
          p.dataHora === compra.data
        );
        if (!pedidoExistente) {
          const novoPedido = {
            id: Date.now() + (++migrados),
            clienteId: cliente.id,
            produtoId: compra.produtoId,
            dataHora: compra.data,
            valorTotal: compra.valor,
            statusPagamento: cliente.statusPagamento || 'devendo',
            parcelas: cliente.parcelas || 1,
            valorParcela: compra.valor / (cliente.parcelas || 1),
            valorRestante: 0,
            pagamentosHistorico: []
          };
          pedidosData.push(novoPedido);
        }
      });
    } else if (cliente.produtoId) {
      const produto = produtosData.find(p => p.id === cliente.produtoId);
      const pedidoExistente = pedidosData.find(p =>
        p.clienteId === cliente.id &&
        p.produtoId === cliente.produtoId
      );
      if (!pedidoExistente) {
        const novoPedido = {
          id: Date.now() + (++migrados),
          clienteId: cliente.id,
          produtoId: cliente.produtoId,
          dataHora: cliente.dataCadastro || new Date().toISOString(),
          valorTotal: produto ? produto.preco : 0,
          statusPagamento: cliente.statusPagamento || 'devendo',
          parcelas: cliente.parcelas || 1,
          valorParcela: (produto ? produto.preco : 0) / (cliente.parcelas || 1),
          valorRestante: 0,
          pagamentosHistorico: []
        };
        pedidosData.push(novoPedido);
      }
    }
    if (cliente.pagamentosHistorico && cliente.pagamentosHistorico.length > 0) {
      const pedidosCliente = pedidosData.filter(p => p.clienteId === cliente.id);
      if (pedidosCliente.length > 0) {
        const ultimoPedido = pedidosCliente[pedidosCliente.length - 1];
        cliente.pagamentosHistorico.forEach(pag => {
          const pagExistente = (ultimoPedido.pagamentosHistorico || []).find(p => p.data === pag.data && p.valor === pag.valor);
          if (!pagExistente) {
            ultimoPedido.pagamentosHistorico = ultimoPedido.pagamentosHistorico || [];
            ultimoPedido.pagamentosHistorico.push(pag);
          }
        });
      }
    }
  });
  pedidosData.forEach(pedido => {
    const { valorRestante } = calcularTotaisPedido(pedido);
    pedido.valorRestante = valorRestante;
    if (valorRestante <= 0) {
      pedido.statusPagamento = 'pago';
    }
  });

  if (migrados > 0) {
    saveData();
    console.log(`Migração concluída: ${migrados} pedidos criados a partir de dados antigos.`);
  }

  localStorage.setItem('nextsock-migracao-pedidos-v1', 'true');
}

window.syncItemToFirebase = syncItemToFirebase;
window.deleteItemFromFirebase = deleteItemFromFirebase;
window.calcularTotaisPedido = calcularTotaisPedido;
window.getPedidosDoCliente = getPedidosDoCliente;
window.getSaldoDevedorCliente = getSaldoDevedorCliente;
window.getTotalGastoCliente = getTotalGastoCliente;
window.migrarDadosAntigosParaPedidos = migrarDadosAntigosParaPedidos;
