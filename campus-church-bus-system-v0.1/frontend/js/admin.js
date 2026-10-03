import { api } from './api.js';
import { showAlert, clearAlert, escapeHtml } from './main.js';

let currentTripId = null;
let currentBuses = [];
let allRegistrations = [];

document.addEventListener('DOMContentLoaded', () => {
  const isDashboard = !!document.getElementById('admin-dashboard-view');
  const isStudentsPage = !!document.getElementById('admin-students-view');

  if (isDashboard || isStudentsPage) {
    initAdmin();
  }
});

/**
 * Initialize Admin Views
 */
async function initAdmin() {
  try {
    // 1. Fetch trips to get the active trip ID
    const tripsRes = await api.get('/trips');
    const trips = tripsRes.data || [];

    if (trips.length > 0) {
      currentTripId = trips[0]._id;
      
      const tripSelector = document.getElementById('trip-select');
      if (tripSelector) {
        tripSelector.innerHTML = trips.map((t) => `
          <option value="${t._id}">⛪ ${escapeHtml(t.destination)} (${t.date})</option>
        `).join('');

        tripSelector.addEventListener('change', (e) => {
          currentTripId = e.target.value;
          refreshAllAdminData();
        });
      }
    }

    // 2. Setup Auto-Allocate Button
    const autoAllocateBtn = document.getElementById('auto-allocate-btn');
    if (autoAllocateBtn) {
      autoAllocateBtn.addEventListener('click', handleAutoAllocate);
    }

    // 3. Setup Filter Dropdown and Search
    const busFilter = document.getElementById('bus-filter');
    if (busFilter) {
      busFilter.addEventListener('change', () => filterAndRenderStudents());
    }

    const studentSearch = document.getElementById('student-search');
    if (studentSearch) {
      studentSearch.addEventListener('input', () => filterAndRenderStudents());
    }

    // 4. Modal events
    setupAllocationModal();

    // 5. Load data
    await refreshAllAdminData();
  } catch (err) {
    console.error('Admin initialization failed:', err);
    showAlert('admin-alert-box', `Failed to initialize admin dashboard: ${err.message}`, 'danger');
  }
}

/**
 * Refresh all dashboard components dynamically
 */
export async function refreshAllAdminData() {
  if (!currentTripId) return;

  try {
    // Fetch stats and buses in parallel
    const [statsRes, busesRes, regsRes] = await Promise.all([
      api.get(`/allocation/stats?tripId=${currentTripId}`),
      api.get(`/buses?tripId=${currentTripId}`),
      api.get(`/registrations?tripId=${currentTripId}`)
    ]);

    currentBuses = busesRes.data || [];
    allRegistrations = regsRes.data || [];

    // Render components
    renderStats(statsRes.data);
    renderFleetOverview(currentBuses);
    populateBusFilterDropdown(currentBuses);
    filterAndRenderStudents();
  } catch (err) {
    console.error('Error refreshing admin data:', err);
    showAlert('admin-alert-box', `Error updating dashboard data: ${err.message}`, 'danger');
  }
}

/**
 * Render dynamic metrics cards
 */
function renderStats(stats) {
  const container = document.getElementById('stats-grid-container');
  if (!container || !stats) return;

  container.innerHTML = `
    <div class="stat-card stat-primary">
      <span class="stat-label">Total Registered Students</span>
      <span class="stat-value" id="stat-total-students">${stats.totalStudents}</span>
      <span class="stat-meta">${stats.unassignedStudents} awaiting allocation</span>
    </div>

    <div class="stat-card">
      <span class="stat-label">Total Bus Capacity</span>
      <span class="stat-value" id="stat-total-capacity">${stats.totalCapacity}</span>
      <span class="stat-meta">Across 9 university buses</span>
    </div>

    <div class="stat-card stat-accent">
      <span class="stat-label">Occupied Seats</span>
      <span class="stat-value" id="stat-occupied-seats">${stats.occupiedSeats}</span>
      <span class="stat-meta">${stats.totalCapacity ? Math.round((stats.occupiedSeats / stats.totalCapacity) * 100) : 0}% fleet load</span>
    </div>

    <div class="stat-card stat-success">
      <span class="stat-label">Available Seats</span>
      <span class="stat-value" id="stat-available-seats">${stats.availableSeats}</span>
      <span class="stat-meta">Remaining unbooked / empty</span>
    </div>

    <div class="stat-card stat-danger">
      <span class="stat-label">Full Buses</span>
      <span class="stat-value" id="stat-full-buses">${stats.fullBuses}</span>
      <span class="stat-meta">Capacity reached (100%)</span>
    </div>

    <div class="stat-card stat-success">
      <span class="stat-label">Available Buses</span>
      <span class="stat-value" id="stat-available-buses">${stats.availableBuses}</span>
      <span class="stat-meta">Ready to take passengers</span>
    </div>
  `;
}

/**
 * Render Bus Overview on Admin Dashboard
 */
function renderFleetOverview(buses) {
  const container = document.getElementById('bus-fleet-overview');
  if (!container) return;

  if (buses.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted);">No buses configured in fleet.</p>';
    return;
  }

  container.innerHTML = buses.map((bus) => {
    const percentage = Math.min(100, Math.round((bus.occupiedSeats / bus.capacity) * 100));
    const isFull = bus.isFull;

    return `
      <div class="fleet-bus-card ${isFull ? 'bus-is-full' : 'bus-is-available'}">
        <div class="fleet-bus-header">
          <div>
            <div class="fleet-bus-number">${escapeHtml(bus.busNumber)}</div>
            <div class="fleet-bus-type">${escapeHtml(bus.busType)} (${bus.capacity} seats)</div>
          </div>
          <span class="badge ${isFull ? 'badge-full' : 'badge-available'}">
            ${isFull ? 'STATUS: FULL' : 'STATUS: AVAILABLE'}
          </span>
        </div>

        <div class="fleet-bus-stats">
          <span>${bus.occupiedSeats} / ${bus.capacity} occupied</span>
          <span style="color: ${isFull ? 'var(--danger)' : 'var(--success)'};">
            ${bus.remainingSeats} seats available
          </span>
        </div>

        <div class="progress-track">
          <div class="progress-fill ${isFull ? 'full' : ''}" style="width: ${percentage}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Populate bus filter dropdown
 */
function populateBusFilterDropdown(buses) {
  const filter = document.getElementById('bus-filter');
  if (!filter) return;

  const currentVal = filter.value;
  let options = `
    <option value="ALL">All Registrations</option>
    <option value="UNASSIGNED">⚠️ Unassigned Students Only</option>
  `;

  buses.forEach((b) => {
    options += `<option value="${b._id}">🚌 ${escapeHtml(b.busNumber)} (${b.occupiedSeats}/${b.capacity})</option>`;
  });

  filter.innerHTML = options;
  if (currentVal) filter.value = currentVal;
}

/**
 * Filter and Render Registered Students Table
 */
function filterAndRenderStudents() {
  const tbody = document.getElementById('students-table-body');
  if (!tbody) return;

  const filterVal = document.getElementById('bus-filter')?.value || 'ALL';
  const searchTerm = (document.getElementById('student-search')?.value || '').toLowerCase().trim();

  let filtered = [...allRegistrations];

  if (filterVal === 'UNASSIGNED') {
    filtered = filtered.filter((r) => !r.bus);
  } else if (filterVal !== 'ALL') {
    filtered = filtered.filter((r) => r.bus && r.bus._id.toString() === filterVal);
  }

  if (searchTerm) {
    filtered = filtered.filter((r) => {
      const name = (r.student?.name || '').toLowerCase();
      const matric = (r.student?.studentId || '').toLowerCase();
      const email = (r.student?.email || '').toLowerCase();
      const uni = (r.student?.university || '').toLowerCase();
      const gender = (r.student?.gender || '').toLowerCase();
      const busNum = (r.bus?.busNumber || '').toLowerCase();
      return name.includes(searchTerm) || matric.includes(searchTerm) || email.includes(searchTerm) ||
        uni.includes(searchTerm) || gender.includes(searchTerm) || busNum.includes(searchTerm);
    });
  }

  const countBadge = document.getElementById('table-count-badge');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} Students`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          No registered students found matching the selected filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((r, idx) => {
    const student = r.student || {};
    const bus = r.bus;
    const isAssigned = !!bus;

    return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <div class="student-meta-cell">
            <span class="student-name-strong">${escapeHtml(student.name || 'Unknown')}</span>
            <span class="student-sub">ID: ${escapeHtml(student.studentId || 'N/A')}</span>
          </div>
        </td>
        <td>${escapeHtml(student.gender || 'N/A')}</td>
        <td>${escapeHtml(student.university || 'N/A')}</td>
        <td>${escapeHtml(student.email || 'N/A')}</td>
        <td>${escapeHtml(student.phone || 'N/A')}</td>
        <td>
          ${isAssigned 
            ? `<span class="badge badge-confirmed">🚌 ${escapeHtml(bus.busNumber)}</span> <span class="student-sub">(${escapeHtml(bus.busType)})</span>`
            : `<span class="badge badge-unassigned">⚠️ Unassigned</span>`
          }
        </td>
        <td>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button 
              class="btn btn-outline btn-sm assign-move-btn"
              data-reg-id="${r._id}"
              data-student-name="${escapeHtml(student.name)}"
              data-current-bus-id="${bus ? bus._id : ''}"
              data-current-bus-num="${bus ? bus.busNumber : 'None'}"
            >
              ${isAssigned ? 'Move Student' : 'Assign Bus'}
            </button>

            ${isAssigned ? `
              <button 
                class="btn btn-danger btn-sm remove-student-btn"
                data-reg-id="${r._id}"
                data-student-name="${escapeHtml(student.name)}"
                data-bus-num="${escapeHtml(bus.busNumber)}"
              >
                Remove
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach event listeners to buttons
  document.querySelectorAll('.assign-move-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      openAllocationModal(
        btn.dataset.regId,
        btn.dataset.studentName,
        btn.dataset.currentBusId,
        btn.dataset.currentBusNum
      );
    });
  });

  document.querySelectorAll('.remove-student-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleRemoveStudent(
        btn.dataset.regId,
        btn.dataset.studentName,
        btn.dataset.busNum
      );
    });
  });
}

/**
 * Setup Allocation Modal and form submit
 */
function setupAllocationModal() {
  const modal = document.getElementById('allocation-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const form = document.getElementById('modal-allocation-form');

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert('modal-alert-box');

      const regId = document.getElementById('modal-reg-id').value;
      const targetBusId = document.getElementById('modal-target-bus-select').value;
      const submitBtn = document.getElementById('modal-submit-btn');

      if (!targetBusId) {
        showAlert('modal-alert-box', 'Please select a destination bus.', 'danger');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving assignment...';

        await api.post('/allocation/move', {
          registrationId: regId,
          targetBusId: targetBusId
        });

        closeModal();
        showAlert('admin-alert-box', 'Student bus assignment updated successfully!', 'success');
        await refreshAllAdminData();
      } catch (err) {
        showAlert('modal-alert-box', err.message || 'Failed to assign bus.', 'danger');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Assignment';
      }
    });
  }
}

function openAllocationModal(regId, studentName, currentBusId, currentBusNum) {
  const modal = document.getElementById('allocation-modal');
  if (!modal) return;

  clearAlert('modal-alert-box');
  document.getElementById('modal-reg-id').value = regId;
  document.getElementById('modal-student-name').textContent = studentName;
  document.getElementById('modal-current-bus').textContent = currentBusNum;

  // Populate target bus dropdown with available capacities
  const select = document.getElementById('modal-target-bus-select');
  select.innerHTML = '<option value="">-- Choose a Bus with Available Seats --</option>';

  currentBuses.forEach((b) => {
    const isCurrent = currentBusId && b._id.toString() === currentBusId;
    const isFull = b.isFull;

    // RULE: Full buses are disabled/indicated; buses with capacity are selectable
    const disabledAttr = (isFull && !isCurrent) ? 'disabled' : '';
    const label = `${b.busNumber} (${b.busType}) - ${b.occupiedSeats}/${b.capacity} occupied ${isFull ? '[FULL]' : `(${b.remainingSeats} seats available)`} ${isCurrent ? '[CURRENT]' : ''}`;

    select.innerHTML += `
      <option value="${b._id}" ${disabledAttr} ${isCurrent ? 'selected' : ''}>
        ${label}
      </option>
    `;
  });

  modal.classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('allocation-modal');
  if (modal) modal.classList.remove('active');
}

/**
 * Handle removing a student from their bus
 */
async function handleRemoveStudent(regId, studentName, busNum) {
  if (!confirm(`Are you sure you want to remove ${studentName} from ${busNum}? This student will become unassigned.`)) {
    return;
  }

  try {
    await api.post('/allocation/remove', { registrationId: regId });
    showAlert('admin-alert-box', `${studentName} was removed from ${busNum}. Occupancy and available seats have updated.`, 'success');
    await refreshAllAdminData();
  } catch (err) {
    showAlert('admin-alert-box', err.message || 'Failed to remove student from bus.', 'danger');
  }
}

/**
 * Handle Automatic Allocation of students across available buses
 */
async function handleAutoAllocate() {
  if (!currentTripId) {
    showAlert('admin-alert-box', 'No active trip selected.', 'warning');
    return;
  }

  const btn = document.getElementById('auto-allocate-btn');
  const originalText = btn ? btn.textContent : '';

  if (!confirm('Run automatic allocation? This will assign all registered unassigned students across available buses without exceeding capacity.')) {
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Allocating...';
    }

    const response = await api.post('/allocation/auto', { tripId: currentTripId });

    showAlert('admin-alert-box', `✅ ${response.message}`, 'success');
    await refreshAllAdminData();
  } catch (err) {
    showAlert('admin-alert-box', `Auto-allocation error: ${err.message}`, 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}
