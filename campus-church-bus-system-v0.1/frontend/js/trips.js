import { api } from './api.js';
import { showAlert, clearAlert, escapeHtml } from './main.js';

document.addEventListener('DOMContentLoaded', () => {
  initTripsPage();
});

async function initTripsPage() {
  await loadTrips();
  setupCreateTripModal();
}

async function loadTrips() {
  const container = document.getElementById('trips-list-container');
  if (!container) return;

  try {
    const response = await api.get('/trips');
    const trips = response.data || [];

    if (trips.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No trips found.</p>';
      return;
    }

    container.innerHTML = trips.map((trip) => {
      const isOpen = trip.registrationStatus === 'open';

      return `
        <div class="card" style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
                <h3 style="font-size: 1.3rem; font-weight: 700; color: var(--primary-dark);">${escapeHtml(trip.destination)}</h3>
                <span class="badge ${isOpen ? 'badge-open' : 'badge-closed'}">
                  ${isOpen ? 'REGISTRATION OPEN' : 'REGISTRATION CLOSED'}
                </span>
              </div>
              <p style="color: var(--text-muted); font-size: 0.9rem;">${escapeHtml(trip.description || '')}</p>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button 
                class="btn ${isOpen ? 'btn-danger' : 'btn-success'} btn-sm toggle-status-btn"
                data-trip-id="${trip._id}"
                data-new-status="${isOpen ? 'closed' : 'open'}"
              >
                ${isOpen ? '🔒 Close Registration' : '🔓 Open Registration'}
              </button>

              <button 
                class="btn btn-outline btn-sm delete-trip-btn"
                data-trip-id="${trip._id}"
                data-dest="${escapeHtml(trip.destination)}"
              >
                🗑️ Delete
              </button>
            </div>
          </div>

          <div style="background-color: #f8fafc; border-radius: var(--radius-md); padding: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem;">
            <div>
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Trip Date</span>
              <p style="font-weight: 700;">📅 ${escapeHtml(trip.date)}</p>
            </div>
            <div>
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Departure</span>
              <p style="font-weight: 700;">⏰ ${escapeHtml(trip.departureTime)}</p>
            </div>
            <div>
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Registered</span>
              <p style="font-weight: 700; color: var(--primary);">${trip.registeredStudents} Students</p>
            </div>
            <div>
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Remaining Seats</span>
              <p style="font-weight: 700; color: ${trip.remainingSeats > 0 ? 'var(--success)' : 'var(--danger)'};">
                ${trip.remainingSeats} / ${trip.totalCapacity}
              </p>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach toggle status events
    document.querySelectorAll('.toggle-status-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tripId = btn.dataset.tripId;
        const newStatus = btn.dataset.newStatus;
        try {
          await api.put(`/trips/${tripId}/status`, { registrationStatus: newStatus });
          showAlert('trip-alert-box', `Trip registration status set to ${newStatus.toUpperCase()}`, 'success');
          await loadTrips();
        } catch (err) {
          showAlert('trip-alert-box', err.message || 'Failed to update status', 'danger');
        }
      });
    });

    // Attach delete events
    document.querySelectorAll('.delete-trip-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tripId = btn.dataset.tripId;
        const dest = btn.dataset.dest;
        if (!confirm(`Are you sure you want to delete trip "${dest}" and its registrations?`)) {
          return;
        }
        try {
          await api.delete(`/trips/${tripId}`);
          showAlert('trip-alert-box', 'Trip deleted successfully', 'success');
          await loadTrips();
        } catch (err) {
          showAlert('trip-alert-box', err.message || 'Failed to delete trip', 'danger');
        }
      });
    });
  } catch (err) {
    showAlert('trip-alert-box', `Failed to load trips: ${err.message}`, 'danger');
  }
}

function setupCreateTripModal() {
  const modal = document.getElementById('create-trip-modal');
  const openBtn = document.getElementById('open-create-trip-modal-btn');
  const closeBtn = document.getElementById('close-create-trip-modal-btn');
  const form = document.getElementById('create-trip-form');

  if (openBtn && modal) openBtn.addEventListener('click', () => modal.classList.add('active'));
  if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert('create-trip-alert-box');

      const destination = document.getElementById('new-destination').value.trim();
      const date = document.getElementById('new-date').value.trim();
      const departureTime = document.getElementById('new-departure-time').value.trim();
      const description = document.getElementById('new-description').value.trim();
      const registrationStatus = document.getElementById('new-status').value;

      try {
        await api.post('/trips', {
          destination,
          date,
          departureTime,
          description,
          registrationStatus
        });

        modal.classList.remove('active');
        form.reset();
        showAlert('trip-alert-box', 'New church trip created successfully!', 'success');
        await loadTrips();
      } catch (err) {
        showAlert('create-trip-alert-box', err.message || 'Failed to create trip', 'danger');
      }
    });
  }
}
