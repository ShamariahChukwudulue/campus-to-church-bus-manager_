import { api, authStorage } from './api.js';
import { showAlert, clearAlert } from './main.js';

document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initRegisterForm();
  initDemoCredentials();
});

/**
 * Handle Student & Admin Login
 */
function initLoginForm() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert('alert-box');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    if (!email || !password) {
      showAlert('alert-box', 'Please enter your email and password.', 'danger');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      const response = await api.post('/auth/login', { email, password });
      
      authStorage.setAuth(response.data.token, response.data.user);

      // Check URL redirect parameter if present
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get('redirect');

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else if (response.data.user.role === 'admin') {
        window.location.href = '/admin/dashboard.html';
      } else {
        window.location.href = '/student/dashboard.html';
      }
    } catch (err) {
      showAlert('alert-box', err.message || 'Login failed. Please check your credentials.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
}

/**
 * Handle Student Account Registration
 */
function initRegisterForm() {
  const registerForm = document.getElementById('register-form');
  if (!registerForm) return;

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert('alert-box');

    const name = document.getElementById('name').value.trim();
    const studentId = document.getElementById('studentId').value.trim();
    const gender = document.getElementById('gender').value;
    const university = document.getElementById('university').value;
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = registerForm.querySelector('button[type="submit"]');

    if (!gender) {
      showAlert('alert-box', 'Please select your gender.', 'danger');
      return;
    }

    if (!university) {
      showAlert('alert-box', 'Please select your university.', 'danger');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('alert-box', 'Passwords do not match.', 'danger');
      return;
    }

    if (password.length < 6) {
      showAlert('alert-box', 'Password must be at least 6 characters long.', 'danger');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      const response = await api.post('/auth/register', {
        name,
        studentId,
        gender,
        university,
        email,
        phone,
        password
      });

      authStorage.setAuth(response.data.token, response.data.user);
      window.location.href = '/student/registration.html';
    } catch (err) {
      showAlert('alert-box', err.message || 'Account registration failed.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });
}

/**
 * Quick autofill buttons for evaluation/demo convenience
 */
function initDemoCredentials() {
  const fillAdminBtn = document.getElementById('fill-admin-btn');
  const fillStudentBtn = document.getElementById('fill-student-btn');

  if (fillAdminBtn) {
    fillAdminBtn.addEventListener('click', () => {
      const emailField = document.getElementById('email');
      const passField = document.getElementById('password');
      if (emailField && passField) {
        emailField.value = 'admin@campusbus.edu';
        passField.value = 'AdminPass123!';
      }
    });
  }

  if (fillStudentBtn) {
    fillStudentBtn.addEventListener('click', () => {
      const emailField = document.getElementById('email');
      const passField = document.getElementById('password');
      if (emailField && passField) {
        emailField.value = 'john.doe@university.edu';
        passField.value = 'StudentPass123!';
      }
    });
  }
}
