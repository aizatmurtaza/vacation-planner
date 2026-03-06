// ===== State =====
let state = {
  tripName: '',
  startDate: '',
  endDate: '',
  totalBudget: 0,
  days: [],       // { id, date, location, activities, notes }
  expenses: [],   // { id, date, desc, category, amount }
  compare: {
    florida: {
      name: 'Florida',
      rows: [
        { id: uid(), label: 'Flights', amount: '' },
        { id: uid(), label: 'Hotel', amount: '' },
        { id: uid(), label: 'Car Rental', amount: '' },
        { id: uid(), label: 'Park / Activities', amount: '' },
        { id: uid(), label: 'Food', amount: '' },
      ],
      notes: '',
    },
    hawaii: {
      name: 'Hawaii',
      rows: [
        { id: uid(), label: 'Flights', amount: '' },
        { id: uid(), label: 'Hotel', amount: '' },
        { id: uid(), label: 'Car Rental', amount: '' },
        { id: uid(), label: 'Activities', amount: '' },
        { id: uid(), label: 'Food', amount: '' },
      ],
      notes: '',
    },
  },
};

let editingDayId = null;
let editingExpenseId = null;

const CATEGORY_COLORS = {
  Transport:     '#3b82f6',
  Accommodation: '#8b5cf6',
  Food:          '#22c55e',
  Activities:    '#eab308',
  Shopping:      '#ec4899',
  Other:         '#94a3b8',
};

// ===== Persistence =====
function save() {
  localStorage.setItem('vacationPlanner', JSON.stringify(state));
}
function load() {
  const raw = localStorage.getItem('vacationPlanner');
  if (raw) {
    try { state = JSON.parse(raw); } catch {}
  }
}

// ===== Init =====
load();
renderAll();
bindEvents();

function renderAll() {
  document.getElementById('tripName').value = state.tripName;
  document.getElementById('startDate').value = state.startDate;
  document.getElementById('endDate').value = state.endDate;
  document.getElementById('totalBudget').value = state.totalBudget || '';
  if (!state.compare) {
    state.compare = {
      florida: { name: 'Florida', rows: [], notes: '' },
      hawaii:  { name: 'Hawaii',  rows: [], notes: '' },
    };
  }
  renderDays();
  renderExpenses();
  updateBudgetSummary();
  renderCompare();
}

// ===== Tabs =====
function bindEvents() {
  // Tabs
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      target.classList.add('active');
      target.style.display = 'block';
    });
  });

  // Trip meta
  document.getElementById('tripName').addEventListener('input', e => { state.tripName = e.target.value; save(); });
  document.getElementById('startDate').addEventListener('change', e => { state.startDate = e.target.value; save(); });
  document.getElementById('endDate').addEventListener('change', e => { state.endDate = e.target.value; save(); });

  // Budget
  document.getElementById('totalBudget').addEventListener('input', e => {
    state.totalBudget = parseFloat(e.target.value) || 0;
    updateBudgetSummary();
    save();
  });

  // Category filter
  document.getElementById('categoryFilter').addEventListener('change', renderExpenses);

  // Add Day
  document.getElementById('addDayBtn').addEventListener('click', () => openDayModal());
  document.getElementById('saveDayBtn').addEventListener('click', saveDay);
  document.getElementById('cancelDayBtn').addEventListener('click', closeModals);

  // Add Expense
  document.getElementById('addExpenseBtn').addEventListener('click', () => openExpenseModal());
  document.getElementById('saveExpenseBtn').addEventListener('click', saveExpense);
  document.getElementById('cancelExpenseBtn').addEventListener('click', closeModals);

  // Compare names
  document.getElementById('cmp-name-florida').addEventListener('input', e => {
    state.compare.florida.name = e.target.value; renderCompareVerdict(); save();
  });
  document.getElementById('cmp-name-hawaii').addEventListener('input', e => {
    state.compare.hawaii.name = e.target.value; renderCompareVerdict(); save();
  });

  // Compare notes
  document.getElementById('notes-florida').addEventListener('input', e => {
    state.compare.florida.notes = e.target.value; save();
  });
  document.getElementById('notes-hawaii').addEventListener('input', e => {
    state.compare.hawaii.notes = e.target.value; save();
  });

  // Overlay
  document.getElementById('overlay').addEventListener('click', closeModals);
}

// ===== Days =====
function renderDays() {
  const container = document.getElementById('daysContainer');
  const sorted = [...state.days].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="font-size:2.5rem">&#128506;</div>
        <p>No days added yet. Click <strong>+ Add Day</strong> to start planning!</p>
      </div>`;
    return;
  }
  container.innerHTML = sorted.map((day, i) => {
    const label = day.date ? formatDate(day.date) : `Day ${i + 1}`;
    return `
      <div class="day-card">
        <div class="day-card-header">
          <div class="day-info">
            <span class="day-date">${label}</span>
            <span class="day-location">${esc(day.location) || 'No location set'}</span>
          </div>
          <div class="day-actions">
            <button class="btn-icon" onclick="openDayModal('${day.id}')" title="Edit">&#9998;</button>
            <button class="btn-icon danger" onclick="deleteDay('${day.id}')" title="Delete">&#128465;</button>
          </div>
        </div>
        <div class="day-card-body">
          <div class="day-section">
            <label>Activities</label>
            <p>${esc(day.activities) || '<span style="color:#94a3b8">None listed</span>'}</p>
          </div>
          <div class="day-section">
            <label>Notes</label>
            <p>${esc(day.notes) || '<span style="color:#94a3b8">No notes</span>'}</p>
          </div>
        </div>
      </div>`;
  }).join('');
}

function openDayModal(id = null) {
  editingDayId = id;
  const modal = document.getElementById('dayModal');
  document.getElementById('dayModalTitle').textContent = id ? 'Edit Day' : 'Add Day';
  if (id) {
    const day = state.days.find(d => d.id === id);
    document.getElementById('dayDate').value = day.date;
    document.getElementById('dayLocation').value = day.location;
    document.getElementById('dayActivities').value = day.activities;
    document.getElementById('dayNotes').value = day.notes;
  } else {
    document.getElementById('dayDate').value = '';
    document.getElementById('dayLocation').value = '';
    document.getElementById('dayActivities').value = '';
    document.getElementById('dayNotes').value = '';
  }
  modal.classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}

function saveDay() {
  const date = document.getElementById('dayDate').value;
  const location = document.getElementById('dayLocation').value.trim();
  const activities = document.getElementById('dayActivities').value.trim();
  const notes = document.getElementById('dayNotes').value.trim();

  if (!location && !date) {
    alert('Please enter at least a date or location.');
    return;
  }

  if (editingDayId) {
    const idx = state.days.findIndex(d => d.id === editingDayId);
    state.days[idx] = { ...state.days[idx], date, location, activities, notes };
  } else {
    state.days.push({ id: uid(), date, location, activities, notes });
  }
  save();
  renderDays();
  closeModals();
}

function deleteDay(id) {
  if (!confirm('Delete this day?')) return;
  state.days = state.days.filter(d => d.id !== id);
  save();
  renderDays();
}

// ===== Expenses =====
function renderExpenses() {
  const filter = document.getElementById('categoryFilter').value;
  const filtered = filter ? state.expenses.filter(e => e.category === filter) : state.expenses;
  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  const tbody = document.getElementById('expenseList');

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="no-expenses">No expenses yet.</td></tr>`;
  } else {
    tbody.innerHTML = sorted.map(exp => `
      <tr>
        <td>${exp.date ? formatDate(exp.date) : '—'}</td>
        <td>${esc(exp.desc)}</td>
        <td><span class="badge badge-${exp.category}">${exp.category}</span></td>
        <td class="amount-cell">$${parseFloat(exp.amount).toFixed(2)}</td>
        <td>
          <button class="btn-icon" onclick="openExpenseModal('${exp.id}')" title="Edit">&#9998;</button>
          <button class="btn-icon danger" onclick="deleteExpense('${exp.id}')" title="Delete">&#128465;</button>
        </td>
      </tr>`).join('');
  }
  updateBudgetSummary();
  renderCategoryChart();
}

function openExpenseModal(id = null) {
  editingExpenseId = id;
  document.getElementById('expenseModalTitle').textContent = id ? 'Edit Expense' : 'Add Expense';
  if (id) {
    const exp = state.expenses.find(e => e.id === id);
    document.getElementById('expDate').value = exp.date;
    document.getElementById('expDesc').value = exp.desc;
    document.getElementById('expCategory').value = exp.category;
    document.getElementById('expAmount').value = exp.amount;
  } else {
    document.getElementById('expDate').value = '';
    document.getElementById('expDesc').value = '';
    document.getElementById('expCategory').value = 'Transport';
    document.getElementById('expAmount').value = '';
  }
  document.getElementById('expenseModal').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}

function saveExpense() {
  const date = document.getElementById('expDate').value;
  const desc = document.getElementById('expDesc').value.trim();
  const category = document.getElementById('expCategory').value;
  const amount = parseFloat(document.getElementById('expAmount').value);

  if (!desc || isNaN(amount) || amount < 0) {
    alert('Please enter a description and valid amount.');
    return;
  }

  if (editingExpenseId) {
    const idx = state.expenses.findIndex(e => e.id === editingExpenseId);
    state.expenses[idx] = { ...state.expenses[idx], date, desc, category, amount };
  } else {
    state.expenses.push({ id: uid(), date, desc, category, amount });
  }
  save();
  renderExpenses();
  closeModals();
}

function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  state.expenses = state.expenses.filter(e => e.id !== id);
  save();
  renderExpenses();
}

function updateBudgetSummary() {
  const total = state.totalBudget;
  const spent = state.expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const remaining = total - spent;
  const pct = total > 0 ? Math.min((spent / total) * 100, 100) : 0;

  document.getElementById('totalSpent').textContent = `$${spent.toFixed(2)}`;
  document.getElementById('remaining').textContent = `$${remaining.toFixed(2)}`;
  document.getElementById('remaining').style.color = remaining < 0 ? '#ef4444' : '#15803d';

  const bar = document.getElementById('budgetProgress');
  bar.style.width = pct + '%';
  bar.style.background = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e';
  document.getElementById('budgetPercent').textContent = Math.round(pct) + '%';
}

function renderCategoryChart() {
  const totals = {};
  for (const exp of state.expenses) {
    totals[exp.category] = (totals[exp.category] || 0) + parseFloat(exp.amount || 0);
  }
  const max = Math.max(...Object.values(totals), 1);
  const container = document.getElementById('categoryChart');
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;font-size:0.9rem">No expenses to display.</p>';
    return;
  }
  container.innerHTML = entries.map(([cat, amt]) => `
    <div class="cat-row">
      <span class="cat-label">${cat}</span>
      <div class="cat-bar-wrap">
        <div class="cat-bar" style="width:${(amt/max*100).toFixed(1)}%;background:${CATEGORY_COLORS[cat] || '#94a3b8'}"></div>
      </div>
      <span class="cat-amount">$${amt.toFixed(2)}</span>
    </div>`).join('');
}

// ===== Modals =====
function closeModals() {
  document.getElementById('dayModal').classList.add('hidden');
  document.getElementById('expenseModal').classList.add('hidden');
  document.getElementById('overlay').classList.add('hidden');
  editingDayId = null;
  editingExpenseId = null;
}

// ===== Compare =====
function renderCompare() {
  renderCompareCol('florida');
  renderCompareCol('hawaii');
  renderCompareVerdict();
  renderCompareChart();
  document.getElementById('notes-florida').value = state.compare.florida.notes || '';
  document.getElementById('notes-hawaii').value  = state.compare.hawaii.notes  || '';
}

function renderCompareCol(dest) {
  const col = state.compare[dest];
  document.getElementById(`cmp-name-${dest}`).value = col.name;
  const container = document.getElementById(`compare-rows-${dest}`);
  container.innerHTML = col.rows.map(row => `
    <div class="compare-row" data-id="${row.id}">
      <input type="text" value="${esc2(row.label)}" placeholder="Item"
        onchange="updateCompareRow('${dest}','${row.id}','label',this.value)" />
      <span class="amt-prefix">$</span>
      <input type="number" value="${row.amount}" placeholder="0" min="0" step="0.01"
        oninput="updateCompareRow('${dest}','${row.id}','amount',this.value)" />
      <button class="btn-icon danger" onclick="deleteCompareRow('${dest}','${row.id}')" title="Remove">&#215;</button>
    </div>`).join('');
  updateCompareTotal(dest);
}

function updateCompareRow(dest, id, field, value) {
  const row = state.compare[dest].rows.find(r => r.id === id);
  if (row) row[field] = value;
  updateCompareTotal(dest);
  renderCompareVerdict();
  renderCompareChart();
  save();
}

function deleteCompareRow(dest, id) {
  state.compare[dest].rows = state.compare[dest].rows.filter(r => r.id !== id);
  renderCompareCol(dest);
  renderCompareVerdict();
  renderCompareChart();
  save();
}

function addCompareRow(dest) {
  state.compare[dest].rows.push({ id: uid(), label: '', amount: '' });
  renderCompareCol(dest);
  save();
}

function updateCompareTotal(dest) {
  const total = colTotal(dest);
  document.getElementById(`cmp-total-${dest}`).textContent = `$${total.toFixed(2)}`;
}

function colTotal(dest) {
  return state.compare[dest].rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
}

function renderCompareVerdict() {
  const fTotal = colTotal('florida');
  const hTotal = colTotal('hawaii');
  const el = document.getElementById('compare-verdict');
  if (fTotal === 0 && hTotal === 0) { el.className = 'compare-verdict hidden'; return; }
  el.className = 'compare-verdict verdict-cheaper';
  if (fTotal === hTotal) {
    el.className = 'compare-verdict verdict-tied';
    el.innerHTML = '&#9654; Both trips cost the same!';
  } else if (fTotal < hTotal) {
    const saved = (hTotal - fTotal).toFixed(2);
    el.innerHTML = `&#127796; <strong>${state.compare.florida.name}</strong> is cheaper by <strong>$${saved}</strong> ($${fTotal.toFixed(2)} vs $${hTotal.toFixed(2)})`;
  } else {
    const saved = (fTotal - hTotal).toFixed(2);
    el.innerHTML = `&#127796; <strong>${state.compare.hawaii.name}</strong> is cheaper by <strong>$${saved}</strong> ($${hTotal.toFixed(2)} vs $${fTotal.toFixed(2)})`;
  }
}

function renderCompareChart() {
  const fRows = state.compare.florida.rows;
  const hRows = state.compare.hawaii.rows;

  // Merge all unique labels
  const labels = [...new Set([...fRows.map(r => r.label), ...hRows.map(r => r.label)])].filter(Boolean);
  const fMap = Object.fromEntries(fRows.map(r => [r.label, parseFloat(r.amount) || 0]));
  const hMap = Object.fromEntries(hRows.map(r => [r.label, parseFloat(r.amount) || 0]));
  const max = Math.max(...labels.map(l => Math.max(fMap[l] || 0, hMap[l] || 0)), 1);

  const container = document.getElementById('compare-chart');
  if (labels.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;font-size:0.9rem">Enter costs above to see comparison.</p>';
    return;
  }
  container.innerHTML = labels.map(label => {
    const fAmt = fMap[label] || 0;
    const hAmt = hMap[label] || 0;
    return `
      <div class="cmp-chart-row">
        <span class="cmp-chart-label">${esc2(label)}</span>
        <div class="cmp-chart-bars">
          <div class="cmp-bar-wrap">
            <div class="cmp-bar-track"><div class="cmp-bar bar-florida" style="width:${(fAmt/max*100).toFixed(1)}%"></div></div>
            <span class="cmp-bar-val">$${fAmt.toFixed(2)}</span>
          </div>
          <div class="cmp-bar-wrap">
            <div class="cmp-bar-track"><div class="cmp-bar bar-hawaii" style="width:${(hAmt/max*100).toFixed(1)}%"></div></div>
            <span class="cmp-bar-val">$${hAmt.toFixed(2)}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function esc2(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ===== Helpers =====
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}
function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
