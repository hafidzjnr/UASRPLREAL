// script.js — Terhubung ke Backend (Express + MongoDB)

const API_URL = '/api';

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

        const contentType = response.headers.get('content-type') || '';
        let data;

        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // Not JSON — read as text to show helpful error (often an HTML error page)
            const text = await response.text();
            const preview = text ? text.slice(0, 1000) : '';
            throw new Error(`Expected JSON response but got ${response.status} ${response.statusText}: ${preview}`);
        }

        if (!response.ok) throw new Error(data.message || data || 'Terjadi kesalahan');
        return data;
    } catch (err) {
        alert(err.message);
        console.error('API request failed', endpoint, err);
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
        if (document.getElementById('monthlyIncome')) {
            loadHomeStats();
            // setup target controls if present
            setupTargetControls();
        }
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
        
        // Target & Limit — ambil dari backend per-user (jika tersedia), fallback 0
        let target = 0;
        let dailyLimit = 0;
        try {
            const userSettings = await apiRequest('/user');
            if (userSettings) {
                target = Number.isFinite(Number(userSettings.monthlyTarget)) ? Number(userSettings.monthlyTarget) : 0;
                dailyLimit = Number.isFinite(Number(userSettings.dailyLimit)) ? Number(userSettings.dailyLimit) : 0;
            }
        } catch (e) {
            // ignore — tetap fallback ke 0
            console.warn('Gagal ambil user settings, pakai default 0', e);
        }
        const currentSavings = income - expense; // allow negative balances to show correctly

        document.getElementById('monthlyTarget').textContent = formatRp(target);
        document.getElementById('dailyLimit').textContent = formatRp(dailyLimit);
        document.getElementById('currentSavings').textContent = formatRp(currentSavings);
        document.getElementById('targetAmount').textContent = formatRp(target);
        
        const pct = target > 0 ? Math.max(0, Math.min(100, Math.round((currentSavings / target) * 100))) : 0;
        document.querySelector('#savingsBar .progress-fill').style.width = pct + '%';
        // update percent label
        const pctLabel = document.getElementById('pctLabel');
        if (pctLabel) pctLabel.textContent = `${pct.toFixed(1)} %`;

        // days info
        const now = new Date();
        const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const remaining = totalDays - now.getDate() + 1;
        const daysInfo = document.getElementById('daysInfo');
        if (daysInfo) daysInfo.textContent = `Sisa Hari Bulan Ini: ${remaining}/${totalDays}`;

        // show message when reached
        const msg = document.getElementById('targetMessage');
        if (msg) {
            if (target > 0 && currentSavings >= target) msg.classList.remove('hidden'); else msg.classList.add('hidden');
        }
    } catch (err) { console.error(err); }
}

// Setup the target input controls on Beranda (if present)
async function setupTargetControls() {
    const input = document.getElementById('targetInput');
    const dailyInput = document.getElementById('dailyInput');
    const saveBtn = document.getElementById('saveTargetBtn');
    const resetBtn = document.getElementById('resetTargetBtn');
    if (!input || !saveBtn || !resetBtn) return;

    // Initialize input value from storage (fallback 0)
    // Initialize input values from backend (fallback 0)
    try {
        const userSettings = await apiRequest('/user');
        const stored = Number.isFinite(Number(userSettings?.monthlyTarget)) ? Number(userSettings.monthlyTarget) : 0;
        const storedDaily = Number.isFinite(Number(userSettings?.dailyLimit)) ? Number(userSettings.dailyLimit) : 0;
        input.value = stored;
        if (dailyInput) dailyInput.value = storedDaily;
    } catch (err) {
        input.value = 0;
        if (dailyInput) dailyInput.value = 0;
    }

    saveBtn.addEventListener('click', async () => {
        const v = Number(input.value) || 0;
        const dv = dailyInput ? (Number(dailyInput.value) || 0) : 0;
        try {
            await apiRequest('/user', 'PUT', { monthlyTarget: v, dailyLimit: dv });
            if (typeof loadHomeStats === 'function') loadHomeStats();
        } catch (err) { console.error('Gagal simpan target ke server', err); alert('Gagal menyimpan target'); }
    });

    resetBtn.addEventListener('click', async () => {
        try {
            await apiRequest('/user', 'PUT', { monthlyTarget: 0, dailyLimit: 0 });
            input.value = 0;
            if (dailyInput) dailyInput.value = 0;
            if (typeof loadHomeStats === 'function') loadHomeStats();
        } catch (err) { console.error('Gagal reset target', err); alert('Gagal reset target'); }
    });
}

// toggle edit controls when clicking pencil
document.addEventListener('click', (e) => {
    const el = e.target;
    if (el && el.id === 'editTargetBtn') {
        const controls = document.querySelector('.target-controls');
        if (!controls) return;
        if (controls.style.display === 'none' || getComputedStyle(controls).display === 'none') controls.style.display = 'flex'; else controls.style.display = 'none';
    }
});

// === HALAMAN TRANSAKSI ===
async function initTransaksi() {
    const list = document.getElementById('txnList');
    const form = document.getElementById('addTxnForm');

    // untuk kategori dinamis
    const categorySelect = document.getElementById('txnCategory');
    const radioButtons = form.querySelectorAll('input[name="type"]');

    const dataKategori = {
        income: ["Gaji", "Bonus", "Hasil Usaha", "Investasi", "Lainnya"],
        expense: ["Makan", "Transportasi", "Hiburan", "Tagihan & Listrik", "Belanja Bulanan", "Kesehatan", "Lainnya"]
    };

    function updateKategori (tipe){
        categorySelect.innerHTML = "";
        const daftar = dataKategori[tipe] || [];
        daftar.forEach(item =>{
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            categorySelect.appendChild(option);
        });
    }

    //event listener untuk radio button
    radioButtons.forEach(radio =>{
        radio.addEventListener('change', (e) =>{
            updateKategori(e.target.value);
        });
    });

    //set default saat halaman dimuat
    const currentType =form.querySelector('input[name="type"]:checked').value;
    updateKategori(currentType);

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
function formatRp(n) {
    const num = Number(n) || 0;
    const sign = num < 0 ? '-' : '';
    const abs = Math.abs(num);
    return (sign ? '-' : '') + 'Rp ' + abs.toLocaleString('id-ID');
}

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