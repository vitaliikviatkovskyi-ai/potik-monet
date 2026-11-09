// The form is a local validation demo; no request is sent to a server.
const form = document.getElementById('feedbackForm');
const modal = document.getElementById('successModal');
const closeButton = document.getElementById('closeModalBtn');
const fields = ['username', 'email', 'phone', 'message', 'agreement'];
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phonePattern = /^\+380\d{9}$/;
let returnFocus = null;

function showError(id, message) {
  const input = document.getElementById(id);
  input.classList.remove('border-green-500');
  input.classList.add('border-red-500');
  input.setAttribute('aria-invalid', 'true');
  document.getElementById(`${id}Error`).textContent = message;
  return false;
}
function showSuccess(id) {
  const input = document.getElementById(id);
  input.classList.remove('border-red-500');
  input.classList.add('border-green-500');
  input.setAttribute('aria-invalid', 'false');
  document.getElementById(`${id}Error`).textContent = '';
  return true;
}
function clearState(id) {
  const input = document.getElementById(id);
  input.classList.remove('border-red-500', 'border-green-500');
  input.setAttribute('aria-invalid', 'false');
  document.getElementById(`${id}Error`).textContent = '';
}
function validateName() {
  return document.getElementById('username').value.trim().length >= 2
    ? showSuccess('username') : showError('username', 'Введіть ім’я щонайменше з 2 символів.');
}
function validateEmail() {
  return emailPattern.test(document.getElementById('email').value.trim())
    ? showSuccess('email') : showError('email', 'Введіть коректну електронну адресу.');
}
function validatePhone() {
  return phonePattern.test(document.getElementById('phone').value.trim())
    ? showSuccess('phone') : showError('phone', 'Використайте формат +380XXXXXXXXX без пробілів.');
}
function validateMessage() {
  return document.getElementById('message').value.trim().length >= 10
    ? showSuccess('message') : showError('message', 'Напишіть щонайменше 10 символів.');
}
function validateAgreement() {
  return document.getElementById('agreement').checked
    ? showSuccess('agreement') : showError('agreement', 'Підтвердьте згоду з умовами конфіденційності.');
}
const validators = {username:validateName,email:validateEmail,phone:validatePhone,message:validateMessage,agreement:validateAgreement};
for (const id of fields) {
  const input = document.getElementById(id);
  let touched = false;
  input.addEventListener('blur', () => { touched = true; validators[id](); });
  input.addEventListener(id === 'agreement' ? 'change' : 'input', () => {
    if (touched || input.getAttribute('aria-invalid') === 'true') validators[id]();
  });
}
form.addEventListener('submit', event => {
  event.preventDefault();
  const results = fields.map(id => validators[id]());
  if (results.includes(false)) {
    document.getElementById(fields[results.indexOf(false)]).focus();
    return;
  }
  returnFocus = document.activeElement;
  form.reset();
  fields.forEach(clearState);
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  closeButton.focus();
});
function closeModal() {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  returnFocus?.focus();
}
closeButton.addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', event => {
  if (modal.classList.contains('hidden')) return;
  if (event.key === 'Escape') closeModal();
  if (event.key === 'Tab') { event.preventDefault(); closeButton.focus(); }
});
