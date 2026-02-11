import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, where } from "firebase/firestore";

/* Firebase Configuration */
const firebaseConfig = {
    apiKey: "AIzaSyBYhqlPEiLS0TvBYYyvp3knVEfBBi5k2vQ",
    authDomain: "vehicle-maintenance-8ac79.firebaseapp.com",
    projectId: "vehicle-maintenance-8ac79",
    storageBucket: "vehicle-maintenance-8ac79.firebasestorage.app",
    messagingSenderId: "1077304317184",
    appId: "1:1077304317184:web:403c7751e3f0e9b64c4fe5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

/* Configuration & Constants */
const CATEGORIES = [
    "Compressor", "Condenser", "Receiver-Drier / Accumulator",
    "Expansion Valve / Orifice Tube", "Evaporator", "Air Filter",
    "Coolant", "Radiator Flush", "Fan Belt", "Blower Fan",
    "Battery", "Alternator", "Absorber Front", "Absorber Rear",
    "Lower Arm", "Strut Damper", "Absorber Mounting",
    "Bearing Mounting", "Absorber Bush", "ABS Link",
    "Tie Rod Ends", "Steering Rack", "Tire Replacement",
    "Spark Plug", "Oil Filter", "Timing Oil Seal",
    "Valve Cover Gasket", "Transmission Overhaul", "Transmission Fluid",
    "Brake Pad (Front)", "Brake Pad (Rear)", "Brake Fluid",
    "Engine Mounting", "Power Steering Fluid", "Drive Shaft (Right)", "Drive Shaft (Left)",
    "Tint: Windscreen", "Tint: Left Front", "Tint: Right Front", "Tint: Left Rear", "Tint: Rear Rear", "Tint: Back"
].sort();

/* State Management */
let state = {
    user: null,
    vehicles: [],
    expenses: [],
    activeVehicleId: null,
    currentView: 'dashboard'
};

/* Auth Handlers */
window.handleAuth = async (type) => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    if (!email || !pass) return errorEl.innerText = "Email and Password required";

    try {
        if (type === 'signup') {
            await createUserWithEmailAndPassword(auth, email, pass);
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (e) {
        errorEl.innerText = e.message;
    }
};

window.handleGoogleAuth = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (e) {
        document.getElementById('auth-error').innerText = e.message;
    }
};

window.handleLogout = () => signOut(auth);

/* Cloud Sync Logic */
function initDataSync(user) {
    const userRef = doc(db, "users", user.uid);

    // One-time check for migration from LocalStorage
    migrateLocalDataToCloud(user.uid);

    // Real-time synchronization
    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            state.vehicles = data.vehicles || [];
            state.expenses = data.expenses || [];
            if (!state.activeVehicleId) state.activeVehicleId = data.activeVehicleId || state.vehicles[0]?.id || null;
            render();
        } else {
            // New user, initialize cloud doc
            saveStateToCloud();
        }
    });
}

function migrateLocalDataToCloud(uid) {
    const localVehicles = JSON.parse(localStorage.getItem('myrovo_vehicles')) || [];
    const localExpenses = JSON.parse(localStorage.getItem('myrovo_expenses')) || [];

    if (localVehicles.length > 0 || localExpenses.length > 0) {
        if (confirm("Found existing local data. Do you want to move it to your Cloud account?")) {
            state.vehicles = localVehicles;
            state.expenses = localExpenses;
            saveStateToCloud();
            // Clear local storage after migration
            localStorage.removeItem('myrovo_vehicles');
            localStorage.removeItem('myrovo_expenses');
            localStorage.removeItem('myrovo_active_id');
        }
    }
}

async function saveStateToCloud() {
    if (!auth.currentUser) return;
    try {
        await setDoc(doc(db, "users", auth.currentUser.uid), {
            vehicles: state.vehicles,
            expenses: state.expenses,
            activeVehicleId: state.activeVehicleId
        });
    } catch (e) {
        console.error("Cloud save failed:", e);
    }
}

/* UI Logic */
function render() {
    const appEl = document.getElementById('app');
    const authEl = document.getElementById('auth-container');
    const viewContainer = document.getElementById('view-container');
    const vehicleSelector = document.getElementById('vehicle-selector-container');

    if (state.user) {
        appEl.classList.remove('hidden');
        authEl.classList.add('hidden');

        renderVehicleSelector(vehicleSelector);

        switch (state.currentView) {
            case 'dashboard': renderDashboard(viewContainer); break;
            case 'add-expense': renderAddExpense(viewContainer); break;
            case 'history': renderHistory(viewContainer); break;
            case 'insights': renderInsights(viewContainer); break;
            case 'vehicles': renderGarage(viewContainer); break;
            default: renderDashboard(viewContainer);
        }
    } else {
        appEl.classList.add('hidden');
        authEl.classList.remove('hidden');
    }

    // Update navigation active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === state.currentView);
    });
}

function renderVehicleSelector(container) {
    if (state.vehicles.length === 0) {
        container.innerHTML = '';
        return;
    }
    const current = state.vehicles.find(v => v.id === state.activeVehicleId);
    container.innerHTML = `
        <select id="active-vehicle-select" class="glass-select" style="background: rgba(0,0,0,0.3); border: 1px solid var(--accent); color: white; padding: 4px 8px; border-radius: 8px;">
            ${state.vehicles.map(v => `<option value="${v.id}" ${v.id === state.activeVehicleId ? 'selected' : ''}>${v.name}</option>`).join('')}
        </select>
    `;
    document.getElementById('active-vehicle-select').addEventListener('change', (e) => {
        state.activeVehicleId = e.target.value;
        saveStateToCloud();
        render();
    });
}

function renderDashboard(container) {
    const activeVehicle = state.vehicles.find(v => v.id === state.activeVehicleId);
    if (!activeVehicle) {
        container.innerHTML = `
            <div class="empty-state" style="text-align:center; padding: 3rem;">
                <h2>Welcome to MyVehicle</h2>
                <p>Add your first vehicle in the Garage to start tracking.</p>
                <button class="btn-primary" onclick="window.switchView('vehicles')">Setup Garage</button>
            </div>
        `;
        return;
    }

    const records = state.expenses.filter(e => e.vehicleId === state.activeVehicleId);
    const total = records.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

    container.innerHTML = `
        <div class="dashboard-view">
            <div class="glass-card stat-card full-width">
                <span class="label">Total Maintenance Cost (${activeVehicle.name})</span>
                <h2 class="value">MYR ${total.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</h2>
            </div>
            <div class="section-title"><h3>Quick Entry</h3></div>
            <div class="category-grid">
                ${CATEGORIES.slice(0, 8).map(cat => `
                    <button class="glass-card cat-btn" onclick="window.logCategory('${cat}')">
                        <span class="btn-label">${cat}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function renderAddExpense(container, preCat = '') {
    container.innerHTML = `
        <div class="log-view">
            <h3>Record New Service</h3>
            <div class="glass-card">
                <div class="form-group">
                    <label>Category</label>
                    <select id="exp-cat">
                        ${CATEGORIES.map(c => `<option value="${c}" ${c === preCat ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Amount (MYR)</label><input type="number" id="exp-amount" placeholder="0.00"></div>
                <div class="form-group"><label>Date</label><input type="date" id="exp-date" value="${new Date().toISOString().split('T')[0]}"></div>
                <div class="form-group">
                    <label>Odometer (km)</label>
                    <input type="number" id="exp-odo" placeholder="123456">
                </div>
                <div class="form-group">
                    <label>Warranty</label>
                    <select id="exp-warranty">
                        <option value="">No Warranty</option>
                        <option value="3 Months">3 Months</option>
                        <option value="6 Months">6 Months</option>
                        <option value="12 Months">12 Months (1 Year)</option>
                        <option value="24 Months">24 Months (2 Years)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Remarks</label>
                    <textarea id="exp-remarks" placeholder="Notes (brand, parts used, etc.)" style="width:100%; min-height:80px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;"></textarea>
                </div>
                <div class="form-group"><label>Invoice Image</label><input type="file" id="exp-file" accept="image/*"></div>
                <button class="btn-primary" onclick="window.saveExpense()">Save to Cloud</button>
            </div>
        </div>
    `;
}

function renderHistory(container) {
    const records = state.expenses
        .filter(e => e.vehicleId === state.activeVehicleId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `
        <div class="history-view">
            <div class="section-header"><h3>Service History</h3></div>
            <div class="expense-list">
                ${records.length === 0 ? '<p style="text-align:center; padding: 2rem;">No records found.</p>' : records.map(e => `
                    <div class="glass-card expense-item">
                        <div class="expense-header"><span>${e.date}</span><span style="color: var(--accent); font-weight: 700;">MYR ${parseFloat(e.amount).toFixed(2)}</span></div>
                        <div class="expense-body" style="margin-top: 10px;">
                            <h4 style="margin:0;">${e.category}</h4>
                            <div style="font-size: 0.8rem; color: var(--text-dim); display: flex; gap: 15px; margin-top: 5px;">
                                <span>${e.odometer ? '🚗 ' + e.odometer + ' km' : ''}</span>
                                <span>${e.warranty ? '🛡️ ' + e.warranty : ''}</span>
                            </div>
                            ${e.remarks ? `<p style="font-size: 0.85rem; font-style: italic; color: #94a3b8; margin-top: 8px;">"${e.remarks}"</p>` : ''}
                        </div>
                        <div style="display: flex; gap: 10px; margin-top: 15px;">
                            ${e.file ? `<button class="btn-view" onclick="window.viewFile('${e.file}')" style="flex: 1;">Invoice</button>` : ''}
                            <button onclick="window.deleteExpense('${e.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 6px 12px; border-radius: 8px; cursor: pointer;">Delete</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderInsights(container) {
    const records = state.expenses.filter(e => e.vehicleId === state.activeVehicleId);
    const groups = records.reduce((acc, e) => {
        if (!acc[e.category]) acc[e.category] = [];
        acc[e.category].push(e);
        return acc;
    }, {});

    container.innerHTML = `
        <div class="insights-view">
            <div class="section-header"><h3>Service Insights</h3></div>
            <div class="insight-grid">
                ${Object.keys(groups).sort().map(cat => {
        const list = groups[cat].sort((a, b) => new Date(b.date) - new Date(a.date));
        return `
                        <div class="glass-card insight-card" style="margin-bottom: 15px;">
                            <h4 style="margin: 0 0 10px 0; color: var(--accent);">${cat}</h4>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                ${list.map(e => `
                                    <div style="font-size: 0.85rem; border-left: 2px solid rgba(255,255,255,0.1); padding-left: 10px;">
                                        <div style="display:flex; justify-content:space-between;">
                                            <span>${e.date}</span>
                                            <span>MYR ${parseFloat(e.amount).toFixed(2)}</span>
                                        </div>
                                        <div style="font-size: 0.75rem; color: var(--text-dim);">${e.odometer ? e.odometer + ' km' : ''} ${e.warranty ? ' | 🛡️ ' + e.warranty : ''}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
    }).join('')}
                ${Object.keys(groups).length === 0 ? '<p style="text-align:center;">No data to analyze yet.</p>' : ''}
            </div>
        </div>
    `;
}

function renderGarage(container) {
    container.innerHTML = `
        <div class="garage-view">
            <h3>My Vehicles</h3>
            ${state.vehicles.map(v => `
                <div class="glass-card" style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="margin:0;">${v.name}</h4>
                        <p style="margin:0; font-size: 0.8rem; color: var(--text-dim);">${v.plate}</p>
                    </div>
                    <button onclick="window.deleteVehicle('${v.id}')" style="background: #ef444422; color: #ef4444; border: 1px solid #ef444444; padding: 4px 8px; border-radius: 6px;">Remove</button>
                </div>
            `).join('')}
            
            <div class="glass-card" style="margin-top: 2rem;">
                <h4>Add New Vehicle</h4>
                <div class="form-group"><label>Name</label><input type="text" id="v-name" placeholder="E.g. Honda Civic"></div>
                <div class="form-group"><label>Plate Number</label><input type="text" id="v-plate" placeholder="ABC 1234"></div>
                <button class="btn-primary" onclick="window.addVehicle()" style="width:100%;">Add Vehicle</button>
            </div>
        </div>
    `;
}

/* Action Handlers */
window.switchView = (view) => { state.currentView = view; render(); };
window.logCategory = (cat) => { state.currentView = 'add-expense'; render(); renderAddExpense(document.getElementById('view-container'), cat); };

window.addVehicle = async () => {
    const name = document.getElementById('v-name')?.value;
    const plate = document.getElementById('v-plate')?.value;
    if (!name || !plate) return alert('Name and Plate required');

    const newV = { id: Date.now().toString(), name, plate };
    state.vehicles.push(newV);
    if (!state.activeVehicleId) state.activeVehicleId = newV.id;
    state.currentView = 'dashboard';
    await saveStateToCloud();
    render();
};

window.deleteVehicle = async (id) => {
    if (!confirm('Delete this vehicle and history?')) return;
    state.vehicles = state.vehicles.filter(v => v.id !== id);
    state.expenses = state.expenses.filter(e => e.vehicleId !== id);
    if (state.activeVehicleId === id) state.activeVehicleId = state.vehicles[0]?.id || null;
    await saveStateToCloud();
    render();
};

window.deleteExpense = async (id) => {
    if (!confirm('Delete record?')) return;
    state.expenses = state.expenses.filter(e => e.id !== id);
    await saveStateToCloud();
    render();
};

window.saveExpense = async () => {
    const amount = document.getElementById('exp-amount')?.value;
    const date = document.getElementById('exp-date')?.value;
    const category = document.getElementById('exp-cat')?.value;
    if (!amount || !date) return alert('Required fields missing');

    const fileEl = document.getElementById('exp-file');
    const file = (fileEl && fileEl.files[0]) ? await toBase64(fileEl.files[0]) : null;

    state.expenses.push({
        id: Date.now().toString(),
        vehicleId: state.activeVehicleId,
        category, amount, date,
        odometer: document.getElementById('exp-odo')?.value || '',
        warranty: document.getElementById('exp-warranty')?.value || '',
        remarks: document.getElementById('exp-remarks')?.value || '',
        file
    });

    state.currentView = 'dashboard';
    await saveStateToCloud();
    render();
};

window.viewFile = (data) => {
    const win = window.open();
    if (win) win.document.write('<iframe src="' + data + '" frameborder="0" style="width:100%; height:100%;"></iframe>');
};

const toBase64 = f => new Promise((s, r) => {
    const rdr = new FileReader(); rdr.onload = () => s(rdr.result); rdr.onerror = r; rdr.readAsDataURL(f);
});

/* Initialization */
onAuthStateChanged(auth, (user) => {
    state.user = user;
    if (user) {
        initDataSync(user);
    } else {
        render();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            state.currentView = btn.dataset.view;
            render();
        });
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('SW Registered'))
                .catch(err => console.log('SW Registration failed', err));
        });
    }
});
