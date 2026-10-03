import { api } from './api.js';
import { showAlert, clearAlert, escapeHtml } from './main.js';

let activeTripId = null;

document.addEventListener('DOMContentLoaded', () => {
  initBusesPage();
});

async function initBusesPage() {
  try {
    const tripsRes = await api.get('/trips');
    if (tripsRes.data && tripsRes.data.length > 0) {
      activeTripId = tripsRes.data[0]._id;
    }

    await loadBuses();
    setupAddBusModal();
  } catch (err) {
    showAlert('bus-alert-box', `Failed to load bus management: ${err.message}`, 'danger');
  }
}

async function loadBuses() {
  const container = document.getElementById('buses-grid-container');
  if (!container) return;

  try {
    const response = await api.get(`/buses${activeTripId ? `?tripId=${activeTripId}` : ''}`);
    const buses = response.data || [];

    if (buses.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No buses found in fleet.</p>';
      return;
    }

    container.innerHTML = buses.map((bus) => {
      const percentage = Math.min(100, Math.round((bus.occupiedSeats / bus.capacity) * 100));
      const isFull = bus.isFull;

      return `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-top: 4px solid ${isFull ? 'var(--danger)' : 'var(--success)'};">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <div>
                <h3 style="font-size: 1.35rem; font-weight: 800; color: var(--primary-dark);">${escapeHtml(bus.busNumber)}</h3>
                <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">${escapeHtml(bus.busType)}</span>
              </div>
              <span class="badge ${isFull ? 'badge-full' : 'badge-available'}">
                STATUS: ${isFull ? 'FULL' : 'AVAILABLE'}
              </span>
            </div>

            <div style="background-color: #f8fafc; border-radius: var(--radius-md); padding: 0.85rem; margin: 1rem 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
                <span style="color: var(--text-muted);">Occupancy</span>
                <strong>${bus.occupiedSeats} / ${bus.capacity} seats</strong>
              </div>

              <div class="progress-track">
                <div class="progress-fill ${isFull ? 'full' : ''}" style="width: ${percentage}%;"></div>
              </div>

              <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.85rem;">
                <span style="color: var(--text-muted);">Remaining</span>
                <span style="font-weight: 700; color: ${isFull ? 'var(--danger)' : 'var(--success)'};">
                  ${bus.remainingSeats} seats available
                </span>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-light);">
            <button 
              class="btn btn-outline btn-sm view-passengers-btn"
              data-bus-id="${bus._id}"
              data-bus-num="${escapeHtml(bus.busNumber)}"
              data-bus-cap="${bus.capacity}"
            >
              👥 View Passengers (${bus.occupiedSeats})
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach passenger modal buttons
    document.querySelectorAll('.view-passengers-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        openPassengersModal(btn.dataset.busId, btn.dataset.busNum, btn.dataset.busCap);
      });
    });
  } catch (err) {
    showAlert('bus-alert-box', `Failed to load buses: ${err.message}`, 'danger');
  }
}

async function openPassengersModal(busId, busNum, capacity) {
  const modal = document.getElementById('passengers-modal');
  const title = document.getElementById('passengers-modal-title');
  const listContainer = document.getElementById('passengers-list');

  title.textContent = `Passengers for ${busNum} (Capacity: ${capacity})`;
  listContainer.innerHTML = '<p style="color: var(--text-muted);">Loading passenger manifest...</p>';
  modal.classList.add('active');

  try {
    const res = await api.get(`/buses/${busId}${activeTripId ? `?tripId=${activeTripId}` : ''}`);
    const assignedStudents = res.data.assignedStudents || [];

    if (assignedStudents.length === 0) {
      listContainer.innerHTML = '<p style="color: var(--text-muted); padding: 1.5rem 0; text-align: center;">No students currently assigned to this bus.</p>';
      return;
    }

    listContainer.innerHTML = `
      <table class="data-table" style="font-size: 0.85rem;">
        <thead>
          <tr>
            <th>#</th>
            <th>Student Name</th>
            <th>Matric / ID</th>
            <th>Email</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          ${assignedStudents.map((item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${escapeHtml(item.student?.name || 'N/A')}</strong></td>
              <td>${escapeHtml(item.student?.studentId || 'N/A')}</td>
              <td>${escapeHtml(item.student?.email || 'N/A')}</td>
              <td>${escapeHtml(item.student?.phone || 'N/A')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    listContainer.innerHTML = `<p style="color: var(--danger);">Failed to load passengers: ${err.message}</p>`;
  }
}

function setupAddBusModal() {
  const addModal = document.getElementById('add-bus-modal');
  const openBtn = document.getElementById('open-add-bus-modal-btn');
  const closeBtn = document.getElementById('close-add-bus-modal-btn');
  const form = document.getElementById('add-bus-form');
  const passengerModal = document.getElementById('passengers-modal');
  const passengerClose = document.getElementById('close-passengers-modal-btn');

  if (openBtn && addModal) {
    openBtn.addEventListener('click', () => addModal.classList.add('active'));
  }
  if (closeBtn && addModal) {
    closeBtn.addEventListener('click', () => addModal.classList.remove('active'));
  }
  if (passengerClose && passengerModal) {
    passengerClose.addEventListener('click', () => passengerModal.classList.remove('active'));
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert('add-bus-alert-box');

      const busNumber = document.getElementById('new-bus-number').value.trim();
      const busType = document.getElementById('new-bus-type').value.trim();
      const capacity = document.getElementById('new-bus-capacity').value;

      try {
        await api.post('/buses', { busNumber, busType, capacity });
        addModal.classList.remove('active');
        form.reset();
        showAlert('bus-alert-box', `Bus ${busNumber} added successfully!`, 'success');
        await loadBuses();
      } catch (err) {
        showAlert('add-bus-alert-box', err.message || 'Failed to add bus', 'danger');
      }
    });
  }
}
