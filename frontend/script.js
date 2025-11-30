// script.js — Terhubung ke Backend (Express + MongoDB)

const API_URL = 'http://localhost:5000/api';

// === AUTH HELPER ===
function getToken() { return localStorage.getItem('auth_token'); }
function setAuth(data) {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user_name', data.name);
}
function clearAuth() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_name');
}
function isAuth() { return !!getToken(); }

function redirectTo(path) { window.location.href = path; }

// === API CALLS ===
async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['auth-token'] = token;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || data || 'Terjadi kesalahan');
        return data;
    } catch (err) {
        alert(err.message);
        throw err;
    }
}

// === MAIN LOGIC ===
document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const toSignup = document.getElementById('toSignup');
    const toLogin = document.getElementById('toLogin');
    const logoutBtn = document.getElementById('logoutBtn');

    // 1. Cek Halaman Login (index.html)
    if (location.pathname.endsWith('index.html') || location.pathname.endsWith('/')) {
        if (isAuth()) { redirectTo('beranda.html'); return; }

        // Toggle Form
        if(toSignup) toSignup.addEventListener('click', () => { signupForm.classList.remove('hidden'); loginForm.classList.add('hidden'); });
        if(toLogin) toLogin.addEventListener('click', () => { loginForm.classList.remove('hidden'); signupForm.classList.add('hidden'); });

        // Handle Login
        if (loginForm) loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            try {
                const data = await apiRequest('/auth/login', 'POST', { email, password });
                setAuth(data);
                redirectTo('beranda.html');
            } catch (err) { console.error(err); }
        });

        // Handle Register
        if (signupForm) signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            try {
                const data = await apiRequest('/auth/register', 'POST', { name, email, password });
                // Auto login setelah register (opsional, di sini kita minta login ulang atau langsung set auth)
                // Backend register kita mengembalikan user object, bukan token. Jadi suruh login dulu.
                alert('Registrasi berhasil! Silakan login.');
                window.location.reload();
            } catch (err) { console.error(err); }
        });
    } 
    // 2. Cek Halaman Terlindungi (Beranda, Transaksi, Laporan)
    else {
        if (!isAuth()) { redirectTo('index.html'); return; }

        // Tampilkan Nama User
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = localStorage.getItem('user_name') || 'User';

        // Logout
        if (logoutBtn) logoutBtn.addEventListener('click', () => {
            clearAuth();
            redirectTo('index.html');
        });

        // Load Data sesuai Halaman
        if (document.getElementById('monthlyIncome')) loadHomeStats();
        if (document.getElementById('addTxnForm')) initTransaksi();
        if (document.getElementById('pieChart')) renderLaporan();
    }
});

// === HALAMAN BERANDA ===
async function loadHomeStats() {
    try {
        const txns = await apiRequest('/transactions'); // Ambil dari API
        const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

        // Update UI
        document.getElementById('monthlyIncome').textContent = formatRp(income);
        
        // Target & Limit (Masih Hardcoded untuk demo)
        const target = 400000;
        const dailyLimit = 20000;
        const currentSavings = Math.max(0, income - expense);

        document.getElementById('monthlyTarget').textContent = formatRp(target);
        document.getElementById('dailyLimit').textContent = formatRp(dailyLimit);
        document.getElementById('currentSavings').textContent = formatRp(currentSavings);
        document.getElementById('targetAmount').textContent = formatRp(target);
        
        const pct = Math.min(100, Math.round((currentSavings / target) * 100));
        document.querySelector('#savingsBar .progress-fill').style.width = pct + '%';
    } catch (err) { console.error(err); }
}

// === HALAMAN TRANSAKSI ===
async function initTransaksi() {
    const list = document.getElementById('txnList');
    const form = document.getElementById('addTxnForm');

    async function renderList() {
        try {
            const txns = await apiRequest('/transactions');
            list.innerHTML = '';
            txns.forEach(t => {
                const div = document.createElement('div');
                div.className = 'txn-item ' + (t.type === 'income' ? 'income' : 'expense');
                div.innerHTML = `
                    <div>
                        <div class="cat">${t.category}</div>
                        <div class="note">${t.note || ''}</div>
                        <small class="muted">${new Date(t.date).toLocaleString()}</small>
                    </div>
                    <div class="amount">${t.type === 'expense' ? '-' : ''}${formatRp(t.amount)}</div>
                `;
                list.appendChild(div);
            });
        } catch(err) { console.error(err); }
    }
    
    // Load awal
    renderList();

    // Tambah Transaksi
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = form.querySelector('input[name="type"]:checked').value;
        const amount = Number(document.getElementById('txnAmount').value);
        const category = document.getElementById('txnCategory').value;
        const note = document.getElementById('txnNote').value;

        if (amount <= 0) { alert('Jumlah harus > 0'); return; }

        try {
            await apiRequest('/transactions', 'POST', { type, amount, category, note });
            form.reset();
            form.querySelector('input[name="type"][value="expense"]').checked = true;
            renderList(); // Refresh list
        } catch (err) { console.error(err); }
    });
}

// === HALAMAN LAPORAN ===
async function renderLaporan() {
    try {
        const txns = await apiRequest('/transactions');
        const expenses = txns.filter(t => t.type === 'expense');

        // Group by Category
        const map = {};
        expenses.forEach(t => map[t.category] = (map[t.category] || 0) + Number(t.amount));

        // Draw Charts (Logic sama seperti sebelumnya, cuma datanya dari API)
        drawPie(document.getElementById('pieChart'), map);
        
        // Update Legend
        const legend = document.getElementById('legendList');
        legend.innerHTML = '';
        const colors = ['#10b981', '#ff4d4f', '#f59e0b', '#06b6d4', '#8b5cf6'];
        Object.keys(map).forEach((k, i) => {
            const div = document.createElement('div'); div.className = 'legend-item';
            div.innerHTML = `<div class="swatch" style="background:${colors[i % 5]}"></div><div>${k}</div>`;
            legend.appendChild(div);
        });

        // Line Chart (Daily)
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daily = new Array(daysInMonth).fill(0);
        expenses.forEach(t => {
            const d = new Date(t.date);
            if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
                daily[d.getDate() - 1] += Number(t.amount);
            }
        });
        drawLine(document.getElementById('lineChart'), daily);

    } catch (err) { console.error(err); }
}

// Helper: Format Rupiah
function formatRp(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }

// Helper: Canvas Charts (Tetap sama, hanya dipisah agar rapi)
function drawPie(canvas, dataMap) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height; ctx.clearRect(0, 0, w, h);
    const entries = Object.entries(dataMap);
    if (entries.length === 0) {
        ctx.fillStyle = '#eee'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#666'; ctx.fillText('Tidak ada data', 20, 20); return;
    }
    const total = entries.reduce((s, [, v]) => s + v, 0);
    let start = -Math.PI / 2;
    const colors = ['#10b981', '#ff4d4f', '#f59e0b', '#06b6d4', '#8b5cf6'];
    entries.forEach(([, v], i) => {
        const slice = (v / total) * (Math.PI * 2);
        ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.fillStyle = colors[i % colors.length];
        ctx.arc(w / 2, h / 2, Math.min(w, h) / 2 - 10, start, start + slice);
        ctx.closePath(); ctx.fill(); start += slice;
    });
}

function drawLine(canvas, dailyTotals) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height; ctx.clearRect(0, 0, w, h);
    const days = dailyTotals.length; if (days === 0) return;
    const max = Math.max(...dailyTotals, 10);
    ctx.beginPath();
    dailyTotals.forEach((v, i) => {
        const x = 30 + (i * (w - 60) / (days - 1 || 1));
        const y = h - 20 - (v / max) * (h - 40);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(59,130,246,0.9)'; ctx.stroke();
}