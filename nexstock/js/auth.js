import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let unsubscribers = []; 

async function loginComGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    await migrarDadosIniciais();
  } catch (error) {
    console.error("Erro no login:", error);
    alert("Erro ao logar com Google.");
  }
}

async function logout() {
  try {

    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
    
    await signOut(auth);
    currentUser = null;
    window.location.reload();
  } catch (error) {
    console.error("Erro no logout:", error);
  }
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    console.log("Sessão ativa:", user.email);
    iniciarSincronizacaoTempoReal();
  } else {
    console.log("Nenhum usuário logado.");
    renderApp();
  }
});

function iniciarSincronizacaoTempoReal() {
  if (!currentUser) return;


  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];


  const unsubClientes = onSnapshot(collection(db, `users/${currentUser.uid}/clientes`), (snapshot) => {
    clientesData = snapshot.docs.map(doc => doc.data());
    console.log("Clientes atualizados em tempo real");
    renderApp();
  });
  unsubscribers.push(unsubClientes);

  const unsubProdutos = onSnapshot(collection(db, `users/${currentUser.uid}/produtos`), (snapshot) => {
    produtosData = snapshot.docs.map(doc => doc.data());
    console.log("Produtos atualizados em tempo real");
    renderApp();
  });
  unsubscribers.push(unsubProdutos);

  const unsubFornecedores = onSnapshot(collection(db, `users/${currentUser.uid}/fornecedores`), (snapshot) => {
    fornecedoresData = snapshot.docs.map(doc => doc.data());
    console.log("Fornecedores atualizados em tempo real");
    renderApp();
  });
  unsubscribers.push(unsubFornecedores);
}

async function migrarDadosIniciais() {
  if (!currentUser) return;

  const userDocRef = doc(db, "users", currentUser.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    await setDoc(userDocRef, {
      name: currentUser.displayName,
      email: currentUser.email,
      lastSync: new Date().toISOString()
    });

    for (const item of clientesData) {
      await setDoc(doc(db, `users/${currentUser.uid}/clientes`, item.id.toString()), item);
    }
    for (const item of produtosData) {
      await setDoc(doc(db, `users/${currentUser.uid}/produtos`, item.id.toString()), item);
    }
    for (const item of fornecedoresData) {
      await setDoc(doc(db, `users/${currentUser.uid}/fornecedores`, item.id.toString()), item);
    }
  }
}

window.loginComGoogle = loginComGoogle;
window.logout = logout;
window.getCurrentUser = () => currentUser;
window.db = db;
