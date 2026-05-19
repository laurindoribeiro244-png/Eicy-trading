/**
 * script.js — Eicy Trading
 * Frontend completo: navegação, auth, agendamento, contacto
 * Backend: Supabase (configurar URL e ANON_KEY abaixo)
 */

// ============================================================
// ⚙️  CONFIGURAÇÃO — substitua com as suas credenciais Supabase
// ============================================================
const SUPABASE_URL = "https://qnpljsolypvrmiroauvh.supabase.co";  // ← substituir
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxqc29seXB2cm1pcm9hdXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDk3NTgsImV4cCI6MjA5NDI4NTc1OH0.-GHZVTCQH3xAje3aN1_cv2SDvGpYV9h53kdHidZGtkA";
const API = `${SUPABASE_URL}/rest/v1`;

// Headers padrão para Supabase REST API
function getHeaders(token = null, returnMin = false) {
  const h = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Prefer": returnMin ? "return=minimal" : "return=representation",
    "Accept": "application/json"
  };
  return h;
}

// ============================================================
// 🔐  ESTADO DA SESSÃO (armazenado em memória + localStorage)
// ============================================================
let sessaoAtual = null; // { user, token }

function salvarSessao(dados) {
  sessaoAtual = dados;
  localStorage.setItem("eicy_sessao", JSON.stringify(dados));
}
function carregarSessaoLocal() {
  try {
    const s = localStorage.getItem("eicy_sessao");
    if (s) sessaoAtual = JSON.parse(s);
  } catch(e) { sessaoAtual = null; }
}
function limparSessao() {
  sessaoAtual = null;
  localStorage.removeItem("eicy_sessao");
}

// ============================================================
// 🧭  NAVEGAÇÃO E HEADER
// ============================================================
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const header = document.getElementById("header");

mobileMenuBtn.addEventListener("click", () => {
  mobileMenu.classList.toggle("active");
});

document.querySelectorAll(".mobile-menu .nav-link").forEach(link => {
  link.addEventListener("click", () => mobileMenu.classList.remove("active"));
});

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 50);
});

const allNavLinks = document.querySelectorAll(".nav-link");
allNavLinks.forEach(link => {
  link.addEventListener("click", e => {
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("#")) return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      window.scrollTo({ top: target.offsetTop - header.offsetHeight, behavior: "smooth" });
      allNavLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");
    }
  });
});

// Intersection Observer para highlight do menu
const sections = document.querySelectorAll("section[id]");
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute("id");
      allNavLinks.forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
      });
    }
  });
}, { rootMargin: "-100px 0px -80% 0px" });
sections.forEach(s => sectionObserver.observe(s));

// Animação nos cards de serviço — gerida pelo IntersectionObserver do animation.css abaixo

// Hero buttons smooth scroll
document.querySelectorAll(".hero-buttons .btn").forEach(btn => {
  btn.addEventListener("click", e => {
    const href = btn.getAttribute("href");
    if (!href?.startsWith("#")) return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) window.scrollTo({ top: target.offsetTop - header.offsetHeight, behavior: "smooth" });
  });
});

// WhatsApp float visibility
const whatsappFloat = document.querySelector(".whatsapp-float");
window.addEventListener("scroll", () => {
  whatsappFloat.style.opacity = window.pageYOffset > 300 ? "1" : "0.8";
});

// ============================================================
// 🔔  TOAST DE NOTIFICAÇÃO
// ============================================================
function mostrarToast(msg, tipo = "") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast ${tipo}`;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3500);
}

// ============================================================
// 🔐  MODAIS DE AUTENTICAÇÃO
// ============================================================
function abrirModalAuth() {
  if (sessaoAtual) {
    abrirPainelUtilizador();
    return;
  }
  document.getElementById("authModal").classList.add("open");
}
function fecharModalAuth() {
  document.getElementById("authModal").classList.remove("open");
}
function fecharModalSeClicouFora(e) {
  if (e.target === document.getElementById("authModal")) fecharModalAuth();
}
function trocarTab(tab) {
  const isLogin = tab === "login";
  document.getElementById("formLogin").style.display = isLogin ? "block" : "none";
  document.getElementById("formRegister").style.display = isLogin ? "none" : "block";
  document.getElementById("tabLogin").classList.toggle("active", isLogin);
  document.getElementById("tabRegister").classList.toggle("active", !isLogin);
}

// ============================================================
// 👤  CADASTRO DE UTILIZADOR (via Supabase Auth)
// ============================================================
async function fazerCadastro() {
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const password = document.getElementById("regPassword").value;
  const errEl = document.getElementById("registerError");
  errEl.style.display = "none";

  if (!name || !email || !password) {
    errEl.textContent = "Preencha todos os campos obrigatórios.";
    errEl.style.display = "block";
    return;
  }
  if (password.length < 6) {
    errEl.textContent = "A senha deve ter pelo menos 6 caracteres.";
    errEl.style.display = "block";
    return;
  }

  try {
    // 1. Criar conta no Supabase Auth
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password, data: { name, phone } })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || data.msg);

    const token = data.access_token;
    // Supabase retorna user dentro de data.user ou data.session.user
    const userId = data.user?.id || data.session?.user?.id;

    // Se não há token, significa que o Supabase pediu confirmação de email
    if (!token || !userId) {
      fecharModalAuth();
      mostrarToast("✉️ Verifique o seu email para confirmar a conta!", "success");
      return;
    }

    // 2. Guardar perfil adicional na tabela 'profiles'
    const profPost = await fetch(`${API}/profiles`, {
      method: "POST",
      headers: getHeaders(token, true),
      body: JSON.stringify({ id: userId, name, email, phone })
    });
    if (!profPost.ok) {
      const profErr = await profPost.json().catch(() => ({}));
      if (profErr.code !== "23505") {
        console.warn("Aviso ao criar perfil:", profErr.message || profErr);
      }
    }

    salvarSessao({ user: { id: userId, name, email, phone }, token });
    fecharModalAuth();
    atualizarUILogado();
    mostrarToast(`Bem-vindo, ${name}! `, "success");
  } catch (err) {
    errEl.textContent = err.message || "Erro ao criar conta. Tente novamente.";
    errEl.style.display = "block";
  }
}

// ============================================================
// 🔑  LOGIN
// ============================================================
async function fazerLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginError");
  errEl.style.display = "none";

  if (!email || !password) {
    errEl.textContent = "Preencha email e senha.";
    errEl.style.display = "block";
    return;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.error || !data.access_token) throw new Error(data.error_description || "Credenciais inválidas.");

    const token = data.access_token;
    // Supabase pode retornar user em data.user ou data.session.user
    const userId = data.user?.id || data.session?.user?.id;

    if (!token || !userId) throw new Error("Resposta inválida do servidor. Tente novamente.");

    // Buscar perfil
    const profRes = await fetch(`${API}/profiles?id=eq.${userId}`, {
      headers: getHeaders(token)
    });
    const profiles = await profRes.json().catch(() => []);
    const profile = Array.isArray(profiles) && profiles[0]
      ? profiles[0]
      : { name: email.split("@")[0], email, phone: "" };

    salvarSessao({ user: { id: userId, ...profile }, token });
    fecharModalAuth();
    atualizarUILogado();
    mostrarToast(`Bem-vindo de volta, ${profile.name}! 👋`, "success");
    carregarAgendamentosDoUtilizador();
  } catch (err) {
    errEl.textContent = err.message || "Erro ao entrar. Verifique as credenciais.";
    errEl.style.display = "block";
  }
}

// ============================================================
// 🚪  LOGOUT
// ============================================================
function fazerLogout() {
  limparSessao();
  fecharPainelUtilizador();
  atualizarUIDeslogado();
  mostrarToast("Sessão encerrada com sucesso.");
}

// ============================================================
// 🖥️  ATUALIZAR UI COM BASE NO ESTADO DE LOGIN
// ============================================================
function atualizarUILogado() {
  const { user } = sessaoAtual;
  document.getElementById("accountLabel").textContent = user.name.split(" ")[0];
  document.getElementById("bookingLoginPrompt").style.display = "none";
  document.getElementById("bookingForm").style.display = "block";
  document.getElementById("myBookings").style.display = "block";
  carregarAgendamentosDoUtilizador();
}
function atualizarUIDeslogado() {
  document.getElementById("accountLabel").textContent = "Minha Conta";
  document.getElementById("bookingLoginPrompt").style.display = "block";
  document.getElementById("bookingForm").style.display = "none";
  document.getElementById("myBookings").style.display = "none";
}

// ============================================================
// 📅  SISTEMA DE AGENDAMENTO
// ============================================================
const servicosPorCategoria = {
  Software: ["Instalação Windows 10", "Instalação Windows 11", "Atualização de drivers", "Divulgação de Músicas no Blogue"],
  Montagem: ["Antenas Parabólicas DStv", "Antenas Parabólicas Zap", "Instalação TV Plasma 32\"", "Instalação TV Plasma 45\"+", "Alinhamento de sinal"],
  Reprografia: ["Cópia", "Scan", "Emplastificação", "Impressão simples", "Encadernação","Impressao de topper", "Digitação", "Edição de trabalhos"],
  Design: ["Criação de Cartazes", "Criação de Topper", "Criação de Banners", "Cartões de Visita", "Posts para Mídia Social"]
};

// Definir data mínima (amanhã)
const dateInput = document.getElementById("bookingDate");
if (dateInput) {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  dateInput.min = amanha.toISOString().split("T")[0];
}

function atualizarServicos() {
  const cat = document.getElementById("bookingCategory").value;
  const sel = document.getElementById("bookingService");
  sel.innerHTML = "";
  if (!cat) {
    sel.innerHTML = `<option value="">Selecione o serviço...</option>`;
    return;
  }
  (servicosPorCategoria[cat] || []).forEach(s => {
    sel.innerHTML += `<option value="${s}">${s}</option>`;
  });
}

async function submeterAgendamento() {
  if (!sessaoAtual) { abrirModalAuth(); return; }

  const category = document.getElementById("bookingCategory").value;
  const service = document.getElementById("bookingService").value;
  const date = document.getElementById("bookingDate").value;
  const time = document.getElementById("bookingTime").value;
  const address = document.getElementById("bookingAddress").value.trim();
  const notes = document.getElementById("bookingNotes").value.trim();

  if (!category || !service || !date || !address) {
    mostrarToast("Preencha todos os campos obrigatórios.", "error");
    return;
  }

  const agendamento = {
    user_id: sessaoAtual.user.id,
    user_name: sessaoAtual.user.name,
    user_email: sessaoAtual.user.email,
    user_phone: sessaoAtual.user.phone || "",
    category,
    service,
    date,
    time,
    address,
    notes,
    status: "pendente"
  };

  try {
    const res = await fetch(`${API}/bookings`, {
      method: "POST",
      headers: getHeaders(sessaoAtual.token, true),
      body: JSON.stringify(agendamento)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Erro ${res.status} ao criar agendamento.`);
    }

    mostrarToast("Agendamento enviado com sucesso! ", "success");
    document.getElementById("bookingCategory").value = "";
    document.getElementById("bookingService").innerHTML = `<option>Selecione...</option>`;
    document.getElementById("bookingDate").value = "";
    document.getElementById("bookingAddress").value = "";
    document.getElementById("bookingNotes").value = "";
    carregarAgendamentosDoUtilizador();
  } catch (err) {
    mostrarToast(err.message || "Erro ao agendar.", "error");
  }
}

async function carregarAgendamentosDoUtilizador() {
  if (!sessaoAtual) return;
  try {
    const res = await fetch(`${API}/bookings?user_id=eq.${sessaoAtual.user.id}&order=created_at.desc`, {
      headers: getHeaders(sessaoAtual.token)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Erro ao buscar agendamentos:", errData.message || res.status);
      renderizarAgendamentos([], "bookingsList");
      renderizarAgendamentos([], "panelBookingsList");
      return;
    }
    const data = await res.json();
    const lista = Array.isArray(data) ? data : [];
    renderizarAgendamentos(lista, "bookingsList");
    renderizarAgendamentos(lista, "panelBookingsList");
  } catch (err) {
    console.error("Erro ao carregar agendamentos:", err);
    renderizarAgendamentos([], "bookingsList");
    renderizarAgendamentos([], "panelBookingsList");
  }
}

function renderizarAgendamentos(lista, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!lista || lista.length === 0) {
    el.innerHTML = `<p class="empty-state">Sem agendamentos ainda.</p>`;
    return;
  }
  el.innerHTML = lista.map(b => `
    <div class="booking-item status-${b.status}">
      <div class="b-service">${b.service}</div>
      <div class="b-meta">📅 ${formatarData(b.date)} às ${b.time} • 📍 ${b.address}</div>
      ${b.notes ? `<div class="b-meta">💬 ${b.notes}</div>` : ""}
      <span class="b-status ${b.status}">${b.status}</span>
    </div>
  `).join("");
}

function formatarData(dataStr) {
  if (!dataStr) return "";
  const [y, m, d] = dataStr.split("-");
  return `${d}/${m}/${y}`;
}

// ============================================================
// 👤  PAINEL DO UTILIZADOR
// ============================================================
function abrirPainelUtilizador() {
  if (!sessaoAtual) return;
  const { user } = sessaoAtual;
  document.getElementById("userPanelName").textContent = user.name;
  document.getElementById("userPanelEmail").textContent = user.email;
  document.getElementById("userAvatar").textContent = user.name.charAt(0).toUpperCase();
  carregarAgendamentosDoUtilizador();
  document.getElementById("userPanel").classList.add("open");
}
function fecharPainelUtilizador() {
  document.getElementById("userPanel").classList.remove("open");
}
function fecharPainelSeClicouFora(e) {
  if (e.target === document.getElementById("userPanel")) fecharPainelUtilizador();
}

// ============================================================
// 📨  FORMULÁRIO DE CONTACTO
// ============================================================
async function enviarContacto() {
  const name = document.getElementById("contactName").value.trim();
  const email = document.getElementById("contactEmail").value.trim();
  const subject = document.getElementById("contactSubject").value.trim();
  const message = document.getElementById("contactMessage").value.trim();

  if (!name || !email || !message) {
    mostrarToast("Preencha nome, email e mensagem.", "error");
    return;
  }

  try {
    const res = await fetch(`${API}/contacts`, {
      method: "POST",
      headers: getHeaders(null, true),
      body: JSON.stringify({ name, email, subject, message, status: "novo" })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Erro ${res.status} ao enviar mensagem.`);
    }
    mostrarToast("Mensagem enviada com sucesso! ✉️", "success");
    ["contactName","contactEmail","contactSubject","contactMessage"].forEach(id => {
      document.getElementById(id).value = "";
    });
  } catch (err) {
    mostrarToast(err.message || "Erro ao enviar mensagem.", "error");
  }
}

// ============================================================
// 🚀  INICIALIZAÇÃO
// ============================================================
function init() {
  carregarSessaoLocal();
  if (sessaoAtual) {
    atualizarUILogado();
  } else {
    atualizarUIDeslogado();
  }
}

init();

// ============================================================
// ✨  ANIMAÇÕES DE SCROLL — anim-fade-up / anim-fade-left etc.
// ============================================================
(function() {
  const animEls = document.querySelectorAll(
    '.anim-fade-up, .anim-fade-left, .anim-fade-right, .anim-zoom-in, .anim-fade-in, .highlight-item'
  );
  if (!animEls.length) return;

  const animObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('anim-visible');
        animObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  animEls.forEach(el => animObserver.observe(el));
})();

console.log("Eicy Trading — Script v2.0 carregado.");
console.log("Contacto: +258 86 703 4765");
