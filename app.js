/**
 * SheBuilds Rwanda — Interactive Registration Experience
 * Codveda Level 1, Task 2: Interactive Form
 * 
 * Features:
 * - Real-time and on-blur validation
 * - Dynamic password checklist & strength meter
 * - Password show/hide toggles
 * - Accessible error messaging & screen reader announcements
 * - Focus management (first invalid field on submit)
 * - Simulated front-end registration success state with membership card
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // 1. DOM Elements
  // --------------------------------------------------------------------------
  const form = document.getElementById('shebuilds-form');
  const formCardContainer = document.getElementById('form-card-container');
  const formInteractiveView = document.getElementById('form-interactive-view');
  const successView = document.getElementById('success-view');
  const submitBtn = document.getElementById('submit-btn');
  const resetFormBtn = document.getElementById('reset-form-btn');
  const announcer = document.getElementById('form-status-announcer');

  // Fields
  const fields = {
    fullname: {
      input: document.getElementById('fullname'),
      group: document.getElementById('group-fullname'),
      feedback: document.getElementById('fullname-feedback'),
      statusIcon: document.querySelector('#group-fullname .input-status-indicator'),
      touched: false
    },
    email: {
      input: document.getElementById('email'),
      group: document.getElementById('group-email'),
      feedback: document.getElementById('email-feedback'),
      statusIcon: document.querySelector('#group-email .input-status-indicator'),
      touched: false
    },
    phone: {
      input: document.getElementById('phone'),
      group: document.getElementById('group-phone'),
      feedback: document.getElementById('phone-feedback'),
      statusIcon: document.querySelector('#group-phone .input-status-indicator'),
      touched: false
    },
    password: {
      input: document.getElementById('password'),
      group: document.getElementById('group-password'),
      feedback: document.getElementById('password-feedback'),
      statusIcon: null, // Custom toggler instead
      touched: false
    },
    confirmPassword: {
      input: document.getElementById('confirm-password'),
      group: document.getElementById('group-confirm-password'),
      feedback: document.getElementById('confirm-password-feedback'),
      statusIcon: null, // Custom toggler instead
      touched: false
    }
  };

  // Password Specific Elements
  const strengthMeterBox = document.getElementById('password-meter-desc');
  const strengthLabel = document.getElementById('strength-label');
  const ruleLength = document.getElementById('rule-length');
  const ruleNumber = document.getElementById('rule-number');
  const ruleUppercase = document.getElementById('rule-uppercase');

  // Password Visibility Toggles
  const togglePasswordBtn = document.getElementById('toggle-password');
  const toggleConfirmPasswordBtn = document.getElementById('toggle-confirm-password');

  // Success Card Elements
  const successMemberName = document.getElementById('success-member-name');
  const successMemberEmail = document.getElementById('success-member-email');
  const successMemberId = document.getElementById('success-member-id');

  // Toast Elements
  const signInBtn = document.getElementById('sign-in-btn');
  const signInToast = document.getElementById('signin-modal-toast');
  const closeToastBtn = document.getElementById('close-toast-btn');
  let toastTimer = null;

  // --------------------------------------------------------------------------
  // 2. Validation Helper Functions & RegEx
  // --------------------------------------------------------------------------
  
  // Email regex RFC 5322 pragmatic match
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

  /**
   * Phone number validator:
   * Accepts:
   * - Rwanda mobile formats: '0781234567', '078 123 4567', '078-123-4567'
   * - International with +250: '+250 788 123 456', '+250788123456'
   * - General international formats with 9 to 15 digits
   */
  function isValidPhoneNumber(val) {
    const clean = val.trim();
    if (!clean) return false;
    
    // Remove allowed formatting chars (spaces, hyphens, parentheses)
    const digitsOnly = clean.replace(/[\s\-\(\)\.]/g, '');
    
    // Check if starts with +
    if (clean.startsWith('+')) {
      // Must have between 9 and 15 digits after '+'
      const numPart = digitsOnly.substring(1);
      return /^\d{9,15}$/.test(numPart);
    }

    // Rwandan local standard: 10 digits starting with 07
    if (/^07[2389]\d{7}$/.test(digitsOnly)) {
      return true;
    }

    // Generic standard phone (9 to 14 digits)
    return /^\d{9,14}$/.test(digitsOnly);
  }

  /**
   * Check individual password requirements
   */
  function checkPasswordRules(pwd) {
    return {
      hasLength: pwd.length >= 8,
      hasNumber: /\d/.test(pwd),
      hasUppercase: /[A-Z]/.test(pwd),
      hasLowercase: /[a-z]/.test(pwd),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_=+]/.test(pwd)
    };
  }

  /**
   * Calculate password strength score (0 to 4)
   */
  function calculatePasswordStrength(pwd) {
    if (!pwd) return { score: 0, text: 'Enter a password', class: '' };

    const rules = checkPasswordRules(pwd);
    let points = 0;

    if (rules.hasLength) points += 1;
    if (rules.hasNumber) points += 1;
    if (rules.hasUppercase) points += 1;
    if (pwd.length >= 10 && rules.hasLowercase && (rules.hasSpecial || pwd.length >= 12)) {
      points += 1;
    }

    if (pwd.length < 8) {
      return { score: 1, text: 'Weak', class: 'strength-weak' };
    }

    switch (points) {
      case 1:
        return { score: 1, text: 'Weak', class: 'strength-weak' };
      case 2:
        return { score: 2, text: 'Fair', class: 'strength-fair' };
      case 3:
        return { score: 3, text: 'Good', class: 'strength-good' };
      case 4:
      default:
        return { score: 4, text: 'Strong', class: 'strength-strong' };
    }
  }

  // --------------------------------------------------------------------------
  // 3. UI Feedback Helpers (Not relying solely on color)
  // --------------------------------------------------------------------------

  function setFieldState(fieldObj, isValid, message) {
    const { group, feedback, input, statusIcon } = fieldObj;

    if (isValid === null) {
      // Neutral state
      group.classList.remove('is-valid', 'is-invalid');
      feedback.textContent = '';
      feedback.className = 'field-feedback';
      input.removeAttribute('aria-invalid');
      if (statusIcon) statusIcon.textContent = '';
      return;
    }

    if (isValid) {
      group.classList.remove('is-invalid');
      group.classList.add('is-valid');
      feedback.textContent = message;
      feedback.className = 'field-feedback success';
      input.setAttribute('aria-invalid', 'false');
      if (statusIcon) statusIcon.textContent = '✓';
    } else {
      group.classList.remove('is-valid');
      group.classList.add('is-invalid');
      feedback.textContent = message;
      feedback.className = 'field-feedback error';
      input.setAttribute('aria-invalid', 'true');
      if (statusIcon) statusIcon.textContent = '⚠️';
    }
  }

  // --------------------------------------------------------------------------
  // 4. Individual Field Validators
  // --------------------------------------------------------------------------

  function validateFullName(showError = false) {
    const field = fields.fullname;
    const val = field.input.value.trim();

    if (!val) {
      if (showError || field.touched) {
        setFieldState(field, false, '⚠️ Please enter your full name.');
        return false;
      }
      setFieldState(field, null);
      return false;
    }

    if (val.length < 2) {
      if (showError || field.touched) {
        setFieldState(field, false, '⚠️ Name must be at least 2 characters long.');
        return false;
      }
      return false;
    }

    // Name is valid
    setFieldState(field, true, '✓ Looks good!');
    return true;
  }

  function validateEmail(showError = false) {
    const field = fields.email;
    const val = field.input.value.trim();

    if (!val) {
      if (showError || field.touched) {
        setFieldState(field, false, '⚠️ Please enter your email address.');
        return false;
      }
      setFieldState(field, null);
      return false;
    }

    if (!emailRegex.test(val)) {
      if (showError || field.touched) {
        setFieldState(field, false, '⚠️ Please enter a valid email address.');
        return false;
      }
      return false;
    }

    setFieldState(field, true, '✓ Email looks good!');
    return true;
  }

  function validatePhone(showError = false) {
    const field = fields.phone;
    const val = field.input.value.trim();

    if (!val) {
      if (showError || field.touched) {
        setFieldState(field, false, '⚠️ Please enter your phone number.');
        return false;
      }
      setFieldState(field, null);
      return false;
    }

    if (!isValidPhoneNumber(val)) {
      if (showError || field.touched) {
        setFieldState(field, false, '⚠️ Please enter a valid phone number.');
        return false;
      }
      return false;
    }

    setFieldState(field, true, '✓ Phone number looks good!');
    return true;
  }

  function updatePasswordRequirementsUI(pwd) {
    const rules = checkPasswordRules(pwd);

    // Rule 1: Length >= 8
    if (rules.hasLength) {
      ruleLength.classList.add('is-satisfied');
      ruleLength.querySelector('.check-icon').textContent = '✓';
    } else {
      ruleLength.classList.remove('is-satisfied');
      ruleLength.querySelector('.check-icon').textContent = '○';
    }

    // Rule 2: Contains Number
    if (rules.hasNumber) {
      ruleNumber.classList.add('is-satisfied');
      ruleNumber.querySelector('.check-icon').textContent = '✓';
    } else {
      ruleNumber.classList.remove('is-satisfied');
      ruleNumber.querySelector('.check-icon').textContent = '○';
    }

    // Rule 3: Contains Uppercase
    if (rules.hasUppercase) {
      ruleUppercase.classList.add('is-satisfied');
      ruleUppercase.querySelector('.check-icon').textContent = '✓';
    } else {
      ruleUppercase.classList.remove('is-satisfied');
      ruleUppercase.querySelector('.check-icon').textContent = '○';
    }

    // Strength Meter UI update
    const strength = calculatePasswordStrength(pwd);
    strengthMeterBox.className = 'password-meter-box ' + strength.class;
    strengthLabel.textContent = strength.text;

    return rules.hasLength && rules.hasNumber && rules.hasUppercase;
  }

  function validatePassword(showError = false) {
    const field = fields.password;
    const pwd = field.input.value;
    const allRulesMet = updatePasswordRequirementsUI(pwd);

    if (!pwd) {
      if (showError || field.touched) {
        setFieldState(field, false, '⚠️ Please create a password.');
        return false;
      }
      setFieldState(field, null);
      return false;
    }

    if (!allRulesMet) {
      if (showError || field.touched) {
        setFieldState(field, false, '⚠️ Password must meet all 3 requirements above.');
        return false;
      }
      return false;
    }

    setFieldState(field, true, '✓ Password meets all requirements!');
    return true;
  }

  function validateConfirmPassword(showError = false) {
    const field = fields.confirmPassword;
    const pwd = fields.password.input.value;
    const confirmPwd = field.input.value;

    if (!confirmPwd) {
      if (showError || field.touched) {
        setFieldState(field, false, '⚠️ Please confirm your password.');
        return false;
      }
      setFieldState(field, null);
      return false;
    }

    if (pwd !== confirmPwd) {
      if (showError || field.touched) {
        setFieldState(field, false, "⚠️ Passwords don't match.");
        return false;
      }
      return false;
    }

    setFieldState(field, true, '✓ Passwords match!');
    return true;
  }

  // --------------------------------------------------------------------------
  // 5. Event Listeners: Focus, Blur, Input
  // --------------------------------------------------------------------------

  // Full Name Listeners
  fields.fullname.input.addEventListener('focus', () => {
    // Supportive focus: don't show error while user is just entering
  });

  fields.fullname.input.addEventListener('blur', () => {
    fields.fullname.touched = true;
    validateFullName(true);
  });

  fields.fullname.input.addEventListener('input', () => {
    // If touched, provide immediate progressive feedback
    if (fields.fullname.touched) {
      validateFullName(true);
    }
  });

  // Email Listeners
  fields.email.input.addEventListener('blur', () => {
    fields.email.touched = true;
    validateEmail(true);
  });

  fields.email.input.addEventListener('input', () => {
    if (fields.email.touched) {
      validateEmail(true);
    }
  });

  // Phone Listeners
  fields.phone.input.addEventListener('blur', () => {
    fields.phone.touched = true;
    validatePhone(true);
  });

  fields.phone.input.addEventListener('input', () => {
    if (fields.phone.touched) {
      validatePhone(true);
    }
  });

  // Password Listeners
  fields.password.input.addEventListener('blur', () => {
    fields.password.touched = true;
    validatePassword(true);
  });

  fields.password.input.addEventListener('input', () => {
    // Always update dynamic checklist & strength meter on input
    updatePasswordRequirementsUI(fields.password.input.value);

    // If previously marked or touched, re-validate
    if (fields.password.touched) {
      validatePassword(true);
    }

    // Also re-validate confirm password if it has content
    if (fields.confirmPassword.input.value) {
      validateConfirmPassword(fields.confirmPassword.touched);
    }
  });

  // Confirm Password Listeners
  fields.confirmPassword.input.addEventListener('blur', () => {
    fields.confirmPassword.touched = true;
    validateConfirmPassword(true);
  });

  fields.confirmPassword.input.addEventListener('input', () => {
    if (fields.confirmPassword.touched || fields.confirmPassword.input.value.length >= fields.password.input.value.length) {
      validateConfirmPassword(true);
    }
  });

  // --------------------------------------------------------------------------
  // 6. Password Visibility Toggles
  // --------------------------------------------------------------------------
  function setupPasswordToggle(button, input) {
    if (!button || !input) return;

    button.addEventListener('click', () => {
      const isPassword = input.getAttribute('type') === 'password';
      const newType = isPassword ? 'text' : 'password';
      input.setAttribute('type', newType);

      // Accessible aria-label update
      const fieldName = input.id === 'password' ? 'password' : 'confirm password';
      button.setAttribute('aria-label', isPassword ? `Hide ${fieldName}` : `Show ${fieldName} as plain text`);

      // Toggle SVG Icon (Eye vs Eye Off)
      if (isPassword) {
        button.innerHTML = `
          <svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
      } else {
        button.innerHTML = `
          <svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
      }
    });
  }

  setupPasswordToggle(togglePasswordBtn, fields.password.input);
  setupPasswordToggle(toggleConfirmPasswordBtn, fields.confirmPassword.input);

  // --------------------------------------------------------------------------
  // 7. Form Submission & Validation Engine
  // --------------------------------------------------------------------------
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Mark all fields as touched for submission validation
    Object.keys(fields).forEach(key => {
      fields[key].touched = true;
    });

    const isFullNameValid = validateFullName(true);
    const isEmailValid = validateEmail(true);
    const isPhoneValid = validatePhone(true);
    const isPasswordValid = validatePassword(true);
    const isConfirmPasswordValid = validateConfirmPassword(true);

    const isFormValid = isFullNameValid && isEmailValid && isPhoneValid && isPasswordValid && isConfirmPasswordValid;

    if (!isFormValid) {
      // Find first invalid field to guide focus
      const validationOrder = [
        { valid: isFullNameValid, field: fields.fullname },
        { valid: isEmailValid, field: fields.email },
        { valid: isPhoneValid, field: fields.phone },
        { valid: isPasswordValid, field: fields.password },
        { valid: isConfirmPasswordValid, field: fields.confirmPassword }
      ];

      const firstInvalid = validationOrder.find(item => !item.valid);
      if (firstInvalid && firstInvalid.field.input) {
        firstInvalid.field.input.focus();
        
        // Announce error count for screen readers
        if (announcer) {
          const invalidCount = validationOrder.filter(i => !i.valid).length;
          announcer.textContent = `Please correct the ${invalidCount} highlighted field${invalidCount > 1 ? 's' : ''} to complete your registration.`;
        }
      }
      return;
    }

    // All fields are valid! Simulate submission with loading feedback
    submitBtn.classList.add('is-loading');
    submitBtn.setAttribute('disabled', 'true');

    if (announcer) {
      announcer.textContent = 'Submitting registration...';
    }

    // Smooth simulated processing delay (600ms)
    setTimeout(() => {
      submitBtn.classList.remove('is-loading');
      submitBtn.removeAttribute('disabled');

      // Populate Success State Details if elements exist
      if (successMemberName && fields.fullname.input) {
        successMemberName.textContent = fields.fullname.input.value.trim();
      }
      if (successMemberEmail && fields.email.input) {
        successMemberEmail.textContent = fields.email.input.value.trim();
      }

      // Transition to Success State
      formInteractiveView.hidden = true;
      successView.hidden = false;

      // Announce and move focus to success view
      if (announcer) {
        announcer.textContent = 'Registration successful! Welcome to SheBuilds Rwanda.';
      }
      successView.setAttribute('tabindex', '-1');
      successView.focus();

      // Scroll smoothly to top of form card if scrolled down
      formCardContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 600);
  });

  // --------------------------------------------------------------------------
  // 8. Reset & Register Another Member
  // --------------------------------------------------------------------------
  resetFormBtn.addEventListener('click', () => {
    // Reset form inputs
    form.reset();

    // Reset touched state and UI styles for all fields
    Object.keys(fields).forEach(key => {
      const f = fields[key];
      f.touched = false;
      setFieldState(f, null);
    });

    // Reset password meter & checklist
    strengthMeterBox.className = 'password-meter-box';
    strengthLabel.textContent = 'Enter a password';
    ruleLength.classList.remove('is-satisfied');
    ruleLength.querySelector('.check-icon').textContent = '○';
    ruleNumber.classList.remove('is-satisfied');
    ruleNumber.querySelector('.check-icon').textContent = '○';
    ruleUppercase.classList.remove('is-satisfied');
    ruleUppercase.querySelector('.check-icon').textContent = '○';

    // Show form, hide success
    successView.hidden = true;
    formInteractiveView.hidden = false;

    // Focus back to first input
    fields.fullname.input.focus();
  });

  // --------------------------------------------------------------------------
  // 9. Sign In Hint Toast Interaction
  // --------------------------------------------------------------------------
  function showSignInToast() {
    if (signInToast) {
      signInToast.classList.add('is-visible');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        signInToast.classList.remove('is-visible');
      }, 5000);
    }
  }

  if (signInBtn) {
    signInBtn.addEventListener('click', showSignInToast);
  }

  if (closeToastBtn) {
    closeToastBtn.addEventListener('click', () => {
      signInToast.classList.remove('is-visible');
      if (toastTimer) clearTimeout(toastTimer);
    });
  }
});
