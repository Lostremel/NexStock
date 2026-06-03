
let clientesData = JSON.parse(localStorage.getItem('isabela-clientes')) || [];
let produtosData = JSON.parse(localStorage.getItem('isabela-produtos')) || [];
let fornecedoresData = JSON.parse(localStorage.getItem('isabela-fornecedores')) || [];
let receitaHistorico = JSON.parse(localStorage.getItem('isabela-receita-historico')) || [];

let editingClienteId = null;
let editingProdutoId = null;
let editingFornecedorId = null;
let scanner = null;
let activeAnalyticsTab = 'overview';
let activePage = localStorage.getItem('isabela-active-page') || 'home';

let analyticsSelectedMonth = new Date().getMonth(); 
let analyticsSelectedYear = new Date().getFullYear();
let clienteFilterStatus = 'todos'; 
let globalFilterMonth = new Date().getMonth();
let globalFilterYear = new Date().getFullYear();
let globalFilterDay = 'todos'; 

function saveData() {
  localStorage.setItem('isabela-clientes', JSON.stringify(clientesData));
  localStorage.setItem('isabela-produtos', JSON.stringify(produtosData));
  localStorage.setItem('isabela-fornecedores', JSON.stringify(fornecedoresData));
 
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
