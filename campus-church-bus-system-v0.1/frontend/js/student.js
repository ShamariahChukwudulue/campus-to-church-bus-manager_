import { api, authStorage } from './api.js';
import { showAlert, clearAlert, escapeHtml } from './main.js';

document.addEventListener('DOMContentLoaded', () => {
  const isDashboard = !!document.getElementById('student-dashboard-content');
  const isRegistration = !!document.getElementById('trip-registration-content');

  if (isDashboard) {
    loadStudentDashboard();
  }

  if (isRegistration) {
    loadTripRegistrationPage();
  }
});

/**
 * Render the trip card + bus card for ONE registration
 */
function renderRegistrationBlock(reg, user) {
  const trip = reg.trip;
  const bus = reg.assignedBus;
  const changed = reg.busChangedNotice;

  let busCardHtml = '';

  if (bus) {
    const percentage = Math.min(100, Math.round((bus.occupancy / bus.capacity) * 100));
    const isFull = bus.isFull;

    busCardHtml = `
      <div class="bus-card">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <span class="badge badge-confirmed">Bus Assigned</span>
            <span class="badge ${isFull ? 'badge-full' : 'badge-available'}">
              ${isFull ? 'BUS FULL' : 'SEATS AVAILABLE'}
            </span>
          </div>

          <div class="bus-id-badge">
            🚌 ${escapeHtml(bus.busNumber)}
          </div>

          <div class="bus-spec-grid">
            <div class="bus-spec-item">
              <span class="bus-spec-label">Bus Model / Type</span>
              <span class="bus-spec-value">${escapeHtml(bus.busType)}</span>
            </div>
            <div class="bus-spec-item">
              <span class="bus-spec-label">Total Capacity</span>
              <span class="bus-spec-value">${bus.capacity} Seats</span>
            </div>
          </div>

          <div class="progress-bar-container">
            <div class="progress-header">
              <span>Current Bus Occupancy</span>
              <span><strong>${escapeHtml(bus.displayOccupancy)}</strong> (${percentage}%)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${isFull ? 'full' : ''}" style="width: ${percentage}%;"></div>
            </div>
          </div>
        </div>

        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-light); font-size: 0.85rem; color: var(--text-muted);">
          ℹ️ Please report to the Bus Departure Station 15 minutes before the departure time. Show your Student ID (${escapeHtml(user?.studentId || 'ID')}) upon boarding.
        </div>
      </div>
    `;
  } else {
    // Registration is confirmed, but bus not yet allocated
    busCardHtml = `
      <div class="card unassigned-state">
        <div class="unassigned-icon">⏳</div>
        <h3 class="unassigned-title">Bus Allocation Pending</h3>
        <p class="unassigned-desc">
          Your church shuttle registration is <strong>CONFIRMED</strong>. The transport administrator will assign your bus shortly or automatic allocation will distribute seats.
        </p>
        <div style="margin-top: 1.5rem;">
          <button class="btn btn-outline btn-sm refresh-status-btn">🔄 Refresh Status</button>
        </div>
      </div>
    `;
  }

  let changedBannerHtml = '';
  if (changed && changed.hasChanged) {
    changedBannerHtml = `
      <div class="bus-changed-banner">
        <div class="bus-changed-title">
          ⚠️ Notice: Your bus assignment has been changed
        </div>
        <div class="bus-changed-body">
          The transport administrator has moved your church trip seat to a different bus:
          <div class="change-comparison">
            <span>Previous Bus: <span class="change-bus-tag">${escapeHtml(changed.previousBusNumber)} (${escapeHtml(changed.previousBusType)})</span></span>
            <span>➔</span>
            <span>New Bus: <span class="change-bus-tag" style="background-color: #bbf7d0; color: #166534;">${escapeHtml(changed.newBusNumber)} (${escapeHtml(changed.newBusType)})</span></span>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="booking-group">
      ${changedBannerHtml}

      <div class="dashboard-grid">
        <!-- Trip Information Card -->
        <div class="trip-hero-card">
          <div class="trip-tag">Registration: ${escapeHtml(reg.status.toUpperCase())}</div>
          <h2 class="trip-title">${escapeHtml(trip?.destination || 'Church Trip')}</h2>

          <div class="trip-meta">
            <div class="trip-meta-item">
              <span>📅</span>
              <span><strong>Date:</strong> ${escapeHtml(trip?.date || 'Sunday')}</span>
            </div>
            <div class="trip-meta-item">
              <span>⏰</span>
              <span><strong>Departure Time:</strong> ${escapeHtml(trip?.departureTime || '07:30 AM')}</span>
            </div>
            <div class="trip-meta-item">
              <span>👤</span>
              <span><strong>Student:</strong> ${escapeHtml(user?.name || '')} (${escapeHtml(user?.studentId || '')})</span>
            </div>
            ${user?.university ? `
            <div class="trip-meta-item">
              <span>🏫</span>
              <span><strong>University:</strong> ${escapeHtml(user.university)}</span>
            </div>` : ''}
            <div class="trip-meta-item">
              <span>📝</span>
              <span><strong>Registration Date:</strong> ${new Date(reg.registrationDate).toLocaleDateString()}</span>
            </div>
          </div>

          <div style="margin-top: 1.5rem; font-size: 0.9rem; opacity: 0.9; line-height: 1.4;">
            ${escapeHtml(trip?.description || 'University Church Bus Shuttle')}
          </div>
        </div>

        <!-- Bus Assignment Details -->
        ${busCardHtml}
      </div>
    </div>
  `;
}

/**
 * Load ALL of the student's registrations and their assigned buses
 */
async function loadStudentDashboard() {
  const container = document.getElementById('student-dashboard-content');
  if (!container) return;

  try {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏳</div>
        <p style="color: var(--text-muted);">Loading your church trip registration details...</p>
      </div>
    `;

    const response = await api.get('/registrations/my?all=true');
    const registrations = response.data || [];
    const user = authStorage.getUser();

    if (registrations.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3.5rem 1.5rem;">
          <div style="font-size: 3.5rem; margin-bottom: 1rem;">⛪</div>
          <h2 style="margin-bottom: 0.5rem;">No Active Church Trip Registration</h2>
          <p style="color: var(--text-muted); max-width: 500px; margin: 0 auto 1.5rem auto;">
            Hello ${escapeHtml(user?.name || 'Student')}, you have not yet registered for any church bus service.
          </p>
          <a href="/student/registration.html" class="btn btn-primary btn-lg">
            Register for Church Bus Shuttle
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = registrations.map((reg) => renderRegistrationBlock(reg, user)).join('');

    container.querySelectorAll('.refresh-status-btn').forEach((btn) => {
      btn.addEventListener('click', () => loadStudentDashboard());
    });
  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-danger">
        Failed to load dashboard: ${escapeHtml(err.message)}
      </div>
    `;
  }
}

/**
 *  card for a trip booking
 */
function renderBookableTrip(trip) {
  const isClosed = trip.registrationStatus === 'closed';
  const isFull = trip.remainingSeats <= 0;
  const canRegister = !isClosed && !isFull;

  return `
    <div class="card trip-option">
      <div class="card-header">
        <span class="badge ${isClosed ? 'badge-closed' : isFull ? 'badge-full' : 'badge-open'}">
          ${isClosed ? 'CLOSED' : isFull ? 'FLEET FULL' : 'OPEN'}
        </span>
        <span style="font-size: 0.85rem; font-weight: 700; color: ${isFull ? 'var(--danger)' : 'var(--success-dark)'};">
          ${trip.remainingSeats} seats left
        </span>
      </div>

      <div>
        <h3 class="trip-option-title">${escapeHtml(trip.destination)}</h3>
        <p class="trip-option-desc">${escapeHtml(trip.description || 'Weekly University Church Shuttle')}</p>
      </div>

      <div class="trip-facts">
        <div>
          <span class="trip-fact-label">Date</span>
          <span class="trip-fact-value">📅 ${escapeHtml(trip.date)}</span>
        </div>
        <div>
          <span class="trip-fact-label">Departure</span>
          <span class="trip-fact-value">⏰ ${escapeHtml(trip.departureTime)}</span>
        </div>
        <div>
          <span class="trip-fact-label">Fleet Seats</span>
          <span class="trip-fact-value">🚌 ${trip.totalCapacity}</span>
        </div>
        <div>
          <span class="trip-fact-label">Booked</span>
          <span class="trip-fact-value">👥 ${trip.registeredStudents}</span>
        </div>
      </div>

      <div class="trip-option-actions">
        <button
          type="button"
          class="btn btn-primary book-trip-btn"
          data-trip-id="${trip._id}"
          ${!canRegister ? 'disabled' : ''}
        >
          ${!canRegister ? (isClosed ? 'Registration Closed' : 'Registration Full') : 'Book This Trip'}
        </button>
      </div>
    </div>
  `;
}

/**
 * card for a trip that has already booked
 */
function renderBookedTrip(reg) {
  const trip = reg.trip;
  const bus = reg.assignedBus;

  return `
    <div class="card trip-option">
      <div class="card-header">
        <span class="badge badge-confirmed">✓ Booked</span>
        <span class="badge ${bus ? 'badge-open' : 'badge-unassigned'}">
          ${bus ? escapeHtml(bus.busNumber) : 'Bus pending'}
        </span>
      </div>

      <div>
        <h3 class="trip-option-title">${escapeHtml(trip.destination)}</h3>
        <p class="trip-option-desc">${escapeHtml(trip.description || 'Weekly University Church Shuttle')}</p>
      </div>

      <div class="trip-facts">
        <div>
          <span class="trip-fact-label">Date</span>
          <span class="trip-fact-value">📅 ${escapeHtml(trip.date)}</span>
        </div>
        <div>
          <span class="trip-fact-label">Departure</span>
          <span class="trip-fact-value">⏰ ${escapeHtml(trip.departureTime)}</span>
        </div>
      </div>

      <div class="trip-option-actions">
        <a href="/student/dashboard.html" class="btn btn-outline">View Bus Details</a>
        <button
          type="button"
          class="btn btn-outline cancel-booking-btn"
          data-registration-id="${reg.registrationId}"
          style="color: var(--danger-dark);"
        >
          Cancel Booking
        </button>
      </div>
    </div>
  `;
}

/* Load Trip Booking Page for Student.*/
async function loadTripRegistrationPage(flash) {
  const container = document.getElementById('trip-registration-content');
  if (!container) return;

  try {
    if (!flash) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <p style="color: var(--text-muted);">Fetching church shuttle trips...</p>
        </div>
      `;
    }

    // Fetch the student's bookings and all trips together
    const [myRegRes, tripsRes] = await Promise.all([
      api.get('/registrations/my?all=true'),
      api.get('/trips')
    ]);

    const myRegistrations = myRegRes.data || [];
    const trips = (tripsRes.data || [])
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (trips.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
          <h2 style="margin-bottom: 0.5rem;">No Church Trips Scheduled</h2>
          <p style="color: var(--text-muted);">There are no church trips open for registration at this time. Please check back later.</p>
        </div>
      `;
      return;
    }

    const bookedTripIds = new Set(myRegistrations.map((r) => String(r.trip._id)));
    const availableTrips = trips.filter((t) => !bookedTripIds.has(String(t._id)));

    const availableHtml = availableTrips.length
      ? `<div class="trip-list">${availableTrips.map(renderBookableTrip).join('')}</div>`
      : `
        <div class="card" style="text-align: center; padding: 2.25rem 1.5rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
          <h3 style="margin-bottom: 0.4rem;">You're booked on every available trip</h3>
          <p style="color: var(--text-muted);">New trips will appear here when the administrator schedules them.</p>
        </div>
      `;

    const bookedHtml = myRegistrations.length
      ? `
        <div class="section-heading">
          <span>✅ Your Bookings</span>
          <span class="section-count">${myRegistrations.length}</span>
        </div>
        <div class="trip-list">${myRegistrations.map(renderBookedTrip).join('')}</div>
      `
      : '';

    container.innerHTML = `
      <div id="reg-alert-box"></div>

      <div class="section-heading">
        <span>🎫 Available to Book</span>
        <span class="section-count">${availableTrips.length}</span>
      </div>
      ${availableHtml}

      ${bookedHtml}
    `;

    if (flash) {
      showAlert('reg-alert-box', flash.message, flash.type);
    }

    // Book a trip
    container.querySelectorAll('.book-trip-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        clearAlert('reg-alert-box');
        const tripId = btn.dataset.tripId;

        try {
          // Disable book button so a double-click won<t send two requests
          container.querySelectorAll('.book-trip-btn').forEach((b) => (b.disabled = true));
          btn.textContent = 'Booking...';

          await api.post('/registrations', { tripId });

          await loadTripRegistrationPage({
            type: 'success',
            message: 'Booking confirmed! You can book another trip below or <a href="/student/dashboard.html"><strong>view your bus details</strong></a>.'
          });
        } catch (err) {
          // Reload so the list shows updated data (e.g. already booked / now full)
          await loadTripRegistrationPage({
            type: 'danger',
            message: escapeHtml(err.message || 'Registration failed.')
          });
        }
      });
    });

    // Cancel a booking
    container.querySelectorAll('.cancel-booking-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Cancel this booking? Your seat will be released.')) return;

        try {
          btn.disabled = true;
          await api.delete(`/registrations/${btn.dataset.registrationId}`);
          await loadTripRegistrationPage({
            type: 'success',
            message: 'Booking cancelled. The trip is available to book again.'
          });
        } catch (err) {
          await loadTripRegistrationPage({
            type: 'danger',
            message: escapeHtml(err.message || 'Could not cancel booking.')
          });
        }
      });
    });
  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-danger">
        Failed to load trip information: ${escapeHtml(err.message)}
      </div>
    `;
  }
}
