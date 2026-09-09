import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence,
  inMemoryPersistence,
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: 'select_account'
});

let currentUser = null;
let redirectUser = null;
let unsubscribers = [];

function isMobileOriOS() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobilePattern = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  return isIOSDevice || isMobilePattern;
}

let persistenceMode = 'local';

async function configurarPersistencia() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (localError) {
    console.warn("Persistência local indisponível; tentando sessão do navegador.", localError);

    try {
      await setPersistence(auth, browserSessionPersistence);
      persistenceMode = 'session';
    } catch (sessionError) {
      console.error("Persistência do navegador indisponível; usando memória.", sessionError);
      await setPersistence(auth, inMemoryPersistence);
      persistenceMode = 'memory';
    }
  }
}
const authInitialization = (async () => {
  await configurarPersistencia();

  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      redirectUser = result.user;
    }
  } catch (error) {
    console.error("Erro ao capturar retorno do redirecionamento:", error);
  }
})();

async function loginComGoogle() {
  try {
    await authInitialization;
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    await migrarDadosIniciais();
    if (typeof renderApp === 'function') renderApp();
  } catch (error) {
    console.error("Erro no popup:", error);
    if (error.code === 'auth/popup-blocked' && !isMobileOriOS() && persistenceMode !== 'memory') {
      await signInWithRedirect(auth, provider);
    } else if (error.code !== 'auth/popup-closed-by-user') {
      alert("Não foi possível entrar com o Google. Permita pop-ups para este site e tente novamente.");
    }
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
onAuthStateChanged(auth, async (user) => {
  await authInitialization;
  const authenticatedUser = user || redirectUser;
  redirectUser = null;
  currentUser = authenticatedUser;
  if (authenticatedUser) {
    console.log("Sessão ativa detectada:", authenticatedUser.email);
    await migrarDadosIniciais();
    iniciarSincronizacaoTempoReal();
  } else {
    console.log("Nenhum usuário logado.");
  }
  if (typeof renderApp === 'function') renderApp();
});

function iniciarSincronizacaoTempoReal() {
  if (!currentUser) return;
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];

  const unsubClientes = onSnapshot(collection(db, `users/${currentUser.uid}/clientes`), (snapshot) => {
    const novosDados = snapshot.docs.map(d => d.data());
    if (window.clientesData) {
      window.clientesData.splice(0, window.clientesData.length, ...novosDados);
    }
    if (typeof renderApp === 'function') renderApp();
  }, (error) => { console.error("Erro ao sincronizar clientes:", error); });
  unsubscribers.push(unsubClientes);

  const unsubProdutos = onSnapshot(collection(db, `users/${currentUser.uid}/produtos`), (snapshot) => {
    const novosDados = snapshot.docs.map(d => d.data());
    if (window.produtosData) {
      window.produtosData.splice(0, window.produtosData.length, ...novosDados);
    }
    if (typeof renderApp === 'function') renderApp();
  }, (error) => { console.error("Erro ao sincronizar produtos:", error); });
  unsubscribers.push(unsubProdutos);

  const unsubFornecedores = onSnapshot(collection(db, `users/${currentUser.uid}/fornecedores`), (snapshot) => {
    const novosDados = snapshot.docs.map(d => d.data());
    if (window.fornecedoresData) {
      window.fornecedoresData.splice(0, window.fornecedoresData.length, ...novosDados);
    }
    if (typeof renderApp === 'function') renderApp();
  }, (error) => { console.error("Erro ao sincronizar fornecedores:", error); });
  unsubscribers.push(unsubFornecedores);
}

async function migrarDadosIniciais() {
  if (!currentUser) return;
  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      await setDoc(userDocRef, { 
        name: currentUser.displayName || 'Usuário', 
        email: currentUser.email, 
        lastSync: new Date().toISOString() 
      });

      if (Array.isArray(window.clientesData)) {
        for (const item of window.clientesData) {
          if (item && item.id) await setDoc(doc(db, `users/${currentUser.uid}/clientes`, item.id.toString()), item);
        }
      }
      if (Array.isArray(window.produtosData)) {
        for (const item of window.produtosData) {
          if (item && item.id) await setDoc(doc(db, `users/${currentUser.uid}/produtos`, item.id.toString()), item);
        }
      }
      if (Array.isArray(window.fornecedoresData)) {
        for (const item of window.fornecedoresData) {
          if (item && item.id) await setDoc(doc(db, `users/${currentUser.uid}/fornecedores`, item.id.toString()), item);
        }
      }
    }
  } catch (err) {
    console.error("Erro na migração de dados:", err);
  }
}

window.loginComGoogle = loginComGoogle;
window.logout = logout;
window.getCurrentUser = () => currentUser;
window.db = db;