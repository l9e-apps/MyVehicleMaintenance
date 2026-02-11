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
const CATEGORIES = {
    "🚀 Engine System": {
        "🔹 Core Engine Components": ["Engine block", "Cylinder head", "Combustion chamber", "Pistons", "Piston rings", "Connecting rods", "Crankshaft", "Camshaft(s)", "Timing chain / timing belt", "Timing sprockets / gears", "Flywheel / Flexplate", "Engine bearings (main, rod)", "Oil pan", "Engine mountings"],
        "🔹 Valve Train": ["Intake valves", "Exhaust valves", "Valve springs", "Valve retainers", "Rocker arms", "Lifters / tappets", "Push rods (if OHV engine)", "Variable Valve Timing (VVT) actuator"],
        "🔹 Fuel System (Gasoline)": ["Fuel tank", "Fuel pump (in-tank)", "Fuel filter", "Fuel lines", "Fuel rail", "Fuel pressure regulator", "Fuel injectors", "Throttle body", "Accelerator pedal (electronic module)"],
        "🔹 Ignition System": ["Spark plugs", "Ignition coils", "Distributor (older vehicles)", "Crankshaft position sensor", "Camshaft position sensor"],
        "🔹 Air Intake System": ["Air filter", "Air filter housing", "Mass Air Flow (MAF) sensor", "Manifold Absolute Pressure (MAP) sensor", "Intake manifold", "Throttle position sensor (TPS)", "Idle air control valve (older vehicles)"],
        "🔹 Exhaust System": ["Exhaust manifold", "Catalytic converter", "Oxygen sensor (O2 sensor)", "Exhaust pipe", "Resonator", "Muffler", "Tailpipe"]
    },
    "❄️ Cooling System": ["Radiator", "Radiator cap", "Coolant reservoir tank", "Water pump", "Thermostat", "Cooling fan", "Fan motor", "Fan clutch", "Radiator hoses", "Heater core", "Temperature sensor", "Fan belt"],
    "🛢️ Lubrication System": ["Engine oil", "Oil pump", "Oil filter", "Oil pressure sensor", "Oil cooler", "PCV valve", "Timing oil seal"],
    "⚙️ Transmission System": {
        "🔹 Automatic Transmission": ["Torque converter", "Valve body", "Transmission control module (TCM)", "Transmission fluid pump", "Clutch packs", "Planetary gear set", "Transmission filter"],
        "🔹 Manual Transmission": ["Clutch disc", "Pressure plate", "Release bearing", "Master cylinder (clutch)", "Slave cylinder", "Gear shifter linkage"],
        "🔹 Drivetrain": ["Drive shaft", "CV joints", "Axles", "Differential", "Transfer case (AWD/4WD)", "Transmission fluid"]
    },
    "⛓️ Suspension System": {
        "🔹 Front Suspension": ["Absorber Front", "Coil Spring Front", "Control arms (upper/lower)", "Ball joints", "Stabilizer bar (anti-roll bar)", "Stabilizer links", "Bushings", "Knuckle", "Absorber Bush Front", "Strut Damper Front", "Bearing Mounting Front"],
        "🔹 Rear Suspension": ["Absorber Rear", "Coil Spring Rear / leaf springs", "Trailing arms", "Control arms", "Rear axle beam (if applicable)", "Absorber Bush Rear", "Strut Damper Rear", "Bearing Mounting Rear"]
    },
    "🎡 Steering System": ["Steering wheel", "Steering column", "Steering rack", "Tie rods (inner & outer)", "Power steering pump (hydraulic)", "Electric power steering motor (EPS)", "Steering angle sensor"],
    "🛑 Brake System": {
        "🔹 Hydraulic Components": ["Brake master cylinder", "Brake booster", "Brake fluid reservoir", "Brake lines", "ABS module", "Brake calipers", "Wheel cylinders", "Brake fluid"],
        "🔹 Friction Components": ["Brake Pad Front", "Brake Pad Rear", "Brake shoes", "Brake discs (rotors)", "Brake drums"],
        "🔹 Parking Brake": ["Handbrake lever", "Parking brake cable", "Electronic parking brake motor"]
    },
    "⚡ Electrical System": {
        "🔹 Power Supply": ["Battery", "Alternator", "Starter motor", "Fuse box", "Relays", "Wiring harness"],
        "🔹 Sensors & Modules": ["ECU (Engine Control Unit)", "BCM (Body Control Module)", "TCM", "ABS module", "Airbag control module", "Various sensors (speed, temperature, pressure, knock, etc.)"]
    },
    "🌬️ AC & HVAC": ["Compressor", "Condenser", "Evaporator", "Expansion valve", "Receiver dryer", "Blower motor", "Cabin air filter", "HVAC control panel", "AC pressure sensor", "AC clutch"],
    "🚙 Body & Exterior": ["Hood", "Doors", "Door hinges", "Door locks", "Side mirrors", "Windshield", "Windows", "Wiper motor", "Wiper blades", "Washer pump", "Headlights", "Taillights", "Fog lights", "Bumpers", "Grille", "Roof rails"],
    "💺 Interior": ["Dashboard", "Instrument cluster", "Seats", "Seat belts", "Airbags", "Center console", "Infotainment system", "Speakers", "Power window motor", "Window regulator", "Interior lighting"],
    "🛞 Wheels & Tires": ["Tires", "Rims", "Wheel hub", "Wheel bearings", "Lug nuts", "Tire pressure sensor (TPMS)"],
    "🛡️ Safety Systems": ["ABS", "Traction control", "Stability control", "Airbags", "ADAS sensors (camera, radar)", "Reverse camera", "Parking sensors"],
    "☁️ Emission Control": ["EGR valve", "EVAP canister", "Purge valve", "PCV valve", "Catalytic converter", "O2 sensors"],
    "🎨 Tint": ["Tint Windscreen", "Tint Right Front Window", "Tint Left Front Window", "Tint Right Rear Window", "Tint Left Rear Window", "Tint Rear Windscreen"],
    "✍️ Custom": ["Others (Describe in Remarks)"]
};

/* State Management */
let state = {
    user: null,
    vehicles: [],
    expenses: [],
    activeVehicleId: null,
    currentView: 'dashboard',
    editingExpenseId: null,
    historySearch: '',
    insightsSearch: ''
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
            case 'add-expense': renderAddExpense(viewContainer, '', state.editingExpenseId); break;
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

    // Common categories for quick entry
    const quickCats = [
        { name: "Engine oil", emoji: "🛢️" },
        { name: "Oil filter", emoji: "🔍" },
        { name: "Brake pads", emoji: "🛑" },
        { name: "Tires", emoji: "🛞" },
        { name: "Battery", emoji: "⚡" },
        { name: "Air filter", emoji: "🌬️" },
        { name: "Coolant", emoji: "❄️" },
        { name: "Spark plugs", emoji: "🚀" }
    ];

    container.innerHTML = `
        <div class="dashboard-view">
            <div class="glass-card stat-card full-width">
                <span class="label">Total Maintenance Cost (${activeVehicle.name})</span>
                <h2 class="value">MYR ${total.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</h2>
            </div>
            <div class="section-title"><h3>Quick Entry</h3></div>
            <div class="category-grid">
                ${quickCats.map(cat => `
                    <button class="glass-card cat-btn" onclick="window.logCategory('${cat.name}')">
                        <span style="font-size: 1.5rem; margin-bottom: 5px;">${cat.emoji}</span>
                        <span class="btn-label">${cat.name}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function renderAddExpense(container, preCat = '', expenseId = null) {
    const expense = expenseId ? state.expenses.find(e => e.id === expenseId) : null;
    const isEdit = !!expense;
    let selectedCategory = expense?.category || preCat || '';

    const getAllCategories = () => {
        const flat = [];
        for (const [main, sub] of Object.entries(CATEGORIES)) {
            if (Array.isArray(sub)) {
                sub.forEach(item => flat.push({ main, sub: '', item }));
            } else {
                for (const [subCat, items] of Object.entries(sub)) {
                    items.forEach(item => flat.push({ main, sub: subCat, item }));
                }
            }
        }
        return flat;
    };

    container.innerHTML = `
        <div class="log-view">
            <h3>${isEdit ? 'Edit Service Record' : 'Record New Service'}</h3>
            <div class="glass-card">
                <input type="hidden" id="exp-id" value="${expenseId || ''}">
                <div class="form-group searchable-select-container">
                    <label>Category</label>
                    <div class="search-input-wrapper">
                        <input type="text" id="cat-search" placeholder="Search category..." value="${selectedCategory}">
                        <div id="cat-results" class="search-results hidden"></div>
                    </div>
                    <input type="hidden" id="exp-cat" value="${selectedCategory}">
                </div>
                <div class="form-group"><label>Amount (MYR)</label><input type="number" id="exp-amount" placeholder="0.00" value="${expense?.amount || ''}"></div>
                <div class="form-group"><label>Date</label><input type="date" id="exp-date" value="${expense?.date || new Date().toISOString().split('T')[0]}"></div>
                <div class="form-group">
                    <label>Odometer (km)</label>
                    <input type="number" id="exp-odo" placeholder="123456" value="${expense?.odometer || ''}">
                </div>
                <div class="form-group">
                    <label>Warranty</label>
                    <select id="exp-warranty">
                        <option value="" ${!expense?.warranty ? 'selected' : ''}>No Warranty</option>
                        <option value="3 Months" ${expense?.warranty === '3 Months' ? 'selected' : ''}>3 Months</option>
                        <option value="6 Months" ${expense?.warranty === '6 Months' ? 'selected' : ''}>6 Months</option>
                        <option value="12 Months" ${expense?.warranty === '12 Months' ? 'selected' : ''}>12 Months (1 Year)</option>
                        <option value="24 Months" ${expense?.warranty === '24 Months' ? 'selected' : ''}>24 Months (2 Years)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Remarks (Max 150 chars)</label>
                    <textarea id="exp-remarks" placeholder="Notes (brand, parts used, etc.)" maxlength="150" style="width:100%; min-height:80px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">${expense?.remarks || ''}</textarea>
                    <div style="font-size: 0.7rem; color: var(--text-dim); text-align: right; margin-top: 4px;" id="remarks-counter">0/150</div>
                </div>
                <div class="form-group"><label>Invoice Image</label><input type="file" id="exp-file" accept="image/*"></div>
                <button class="btn-primary" onclick="window.saveExpense()">${isEdit ? 'Update Record' : 'Save to Cloud'}</button>
                ${isEdit ? `<button class="btn-secondary" onclick="window.switchView('history')" style="width: 100%; margin-top: 10px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">Cancel</button>` : ''}
            </div>
        </div>
    `;

    const catSearch = document.getElementById('cat-search');
    const catResults = document.getElementById('cat-results');
    const expCatVal = document.getElementById('exp-cat');
    const allCats = getAllCategories();

    const updateResults = (query) => {
        const isSearch = query.length > 0;
        const filtered = isSearch
            ? allCats.filter(c =>
                c.item.toLowerCase().includes(query.toLowerCase()) ||
                c.main.toLowerCase().includes(query.toLowerCase()) ||
                c.sub.toLowerCase().includes(query.toLowerCase()))
            : allCats;

        if (filtered.length > 0) {
            let html = '';
            let currentMain = '';
            let currentSub = '';

            filtered.forEach(c => {
                if (c.main !== currentMain) {
                    html += `<div class="result-group-header">${c.main}</div>`;
                    currentMain = c.main;
                    currentSub = '';
                }
                if (c.sub && c.sub !== currentSub) {
                    html += `<div class="result-subgroup-header">${c.sub}</div>`;
                    currentSub = c.sub;
                }
                html += `
                    <div class="result-item" onclick="window.selectCategory('${c.item.replace(/'/g, "\\'")}')">
                        <div class="result-main">${c.item}</div>
                        ${isSearch ? `<div class="result-path">${c.main} ${c.sub ? '> ' + c.sub : ''}</div>` : ''}
                    </div>
                `;
            });
            catResults.innerHTML = html;
            catResults.classList.remove('hidden');
        } else {
            catResults.classList.add('hidden');
        }
    };

    window.selectCategory = (val) => {
        catSearch.value = val;
        expCatVal.value = val;
        catResults.classList.add('hidden');
    };

    catSearch.addEventListener('input', (e) => updateResults(e.target.value));
    catSearch.addEventListener('focus', (e) => updateResults(e.target.value));

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-wrapper')) {
            catResults.classList.add('hidden');
        }
    });

    // Add character counter behavior
    const remarks = document.getElementById('exp-remarks');
    const counter = document.getElementById('remarks-counter');
    if (remarks && counter) {
        counter.innerText = `${remarks.value.length}/150`;
        remarks.addEventListener('input', () => {
            counter.innerText = `${remarks.value.length}/150`;
        });
    }
}

function renderHistory(container) {
    const listHtml = (recs) => recs.length === 0 ? '<p style="text-align:center; padding: 2rem;">No records found.</p>' : recs.map(e => `
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
                <button class="btn-edit" onclick="window.editExpense('${e.id}')" style="flex: 1; background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); padding: 6px 12px; border-radius: 8px; cursor: pointer;">Edit</button>
                <button onclick="window.deleteExpense('${e.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 6px 12px; border-radius: 8px; cursor: pointer;">Delete</button>
            </div>
        </div>
    `).join('');

    const getFilteredRecords = () => state.expenses
        .filter(e => e.vehicleId === state.activeVehicleId)
        .filter(e => {
            const s = state.historySearch.toLowerCase();
            return e.category.toLowerCase().includes(s) || (e.remarks || '').toLowerCase().includes(s);
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // If already rendered, just update list
    if (document.getElementById('history-search')) {
        const listContainer = container.querySelector('.expense-list');
        if (listContainer) listContainer.innerHTML = listHtml(getFilteredRecords());
        return;
    }

    container.innerHTML = `
        <div class="history-view">
            <div class="section-header">
                <h3>Service History</h3>
                <div class="search-bar" style="margin-top: 10px;">
                    <input type="text" id="history-search" placeholder="Search history..." value="${state.historySearch}" style="padding: 8px 12px; font-size: 0.9rem;">
                </div>
            </div>
            <div class="expense-list">
                ${listHtml(getFilteredRecords())}
            </div>
        </div>
    `;

    document.getElementById('history-search').addEventListener('input', (e) => {
        state.historySearch = e.target.value;
        renderHistory(container);
    });
}

function renderInsights(container) {
    const listHtml = (groups) => Object.keys(groups).length === 0 ? '<p style="text-align:center;">No data found matching your search.</p>' : Object.keys(groups).sort().map(cat => {
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
                            ${e.remarks ? `<div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px; font-style: italic;">"${e.remarks}"</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');

    const getFilteredGroups = () => {
        const records = state.expenses
            .filter(e => e.vehicleId === state.activeVehicleId)
            .filter(e => {
                const s = state.insightsSearch.toLowerCase();
                return e.category.toLowerCase().includes(s) || (e.remarks || '').toLowerCase().includes(s);
            });

        return records.reduce((acc, e) => {
            if (!acc[e.category]) acc[e.category] = [];
            acc[e.category].push(e);
            return acc;
        }, {});
    };

    // If already rendered, just update list
    if (document.getElementById('insights-search')) {
        const listContainer = container.querySelector('.insight-grid');
        if (listContainer) listContainer.innerHTML = listHtml(getFilteredGroups());
        return;
    }

    container.innerHTML = `
        <div class="insights-view">
            <div class="section-header">
                <h3>Service Insights</h3>
                <div class="search-bar" style="margin-top: 10px;">
                    <input type="text" id="insights-search" placeholder="Search insights..." value="${state.insightsSearch}" style="padding: 8px 12px; font-size: 0.9rem;">
                </div>
            </div>
            <div class="insight-grid" style="margin-top: 15px;">
                ${listHtml(getFilteredGroups())}
            </div>
        </div>
    `;

    document.getElementById('insights-search').addEventListener('input', (e) => {
        state.insightsSearch = e.target.value;
        renderInsights(container);
    });
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
window.switchView = (view) => {
    state.editingExpenseId = null;
    state.currentView = view;
    render();
};

window.logCategory = (cat) => {
    state.editingExpenseId = null;
    state.currentView = 'add-expense';
    render();
    renderAddExpense(document.getElementById('view-container'), cat);
};

window.editExpense = (id) => {
    state.editingExpenseId = id;
    state.currentView = 'add-expense';
    render();
};

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
    const id = document.getElementById('exp-id')?.value;
    const amount = document.getElementById('exp-amount')?.value;
    const date = document.getElementById('exp-date')?.value;
    const category = document.getElementById('exp-cat')?.value;
    const remarks = document.getElementById('exp-remarks')?.value || '';

    if (!amount || !date) return alert('Required fields missing');
    if (remarks.length > 150) return alert('Remarks cannot exceed 150 characters');

    const fileEl = document.getElementById('exp-file');
    let file = (fileEl && fileEl.files[0]) ? await toBase64(fileEl.files[0]) : null;

    const expenseData = {
        id: id || Date.now().toString(),
        vehicleId: state.activeVehicleId,
        category, amount, date,
        odometer: document.getElementById('exp-odo')?.value || '',
        warranty: document.getElementById('exp-warranty')?.value || '',
        remarks,
        file: file || (id ? state.expenses.find(e => e.id === id)?.file : null)
    };

    if (id) {
        const index = state.expenses.findIndex(e => e.id === id);
        if (index !== -1) state.expenses[index] = expenseData;
    } else {
        state.expenses.push(expenseData);
    }

    state.editingExpenseId = null;
    state.currentView = 'history';
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
