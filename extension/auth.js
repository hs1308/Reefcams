// auth.js — handles sign in / sign up

const btnGoogle  = document.getElementById('btn-google');
const btnSignIn  = document.getElementById('btn-signin');
const btnSignUp  = document.getElementById('btn-signup');
const emailInput = document.getElementById('input-email');
const passInput  = document.getElementById('input-password');
const errorMsg   = document.getElementById('auth-error');

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}

function clearError() {
  errorMsg.classList.add('hidden');
}

btnGoogle.addEventListener('click', async () => {
  clearError();
  try {
    await supabase.signInWithGoogle();
    window.location.href = 'newtab.html';
  } catch (err) {
    showError('Google sign-in failed. Make sure you are connected.');
    console.error(err);
  }
});

btnSignIn.addEventListener('click', async () => {
  clearError();
  const email = emailInput.value.trim();
  const pass  = passInput.value;
  if (!email || !pass) return showError('Please enter your email and password.');
  const data = await supabase.signInWithEmail(email, pass);
  if (data.access_token) {
    window.location.href = 'newtab.html';
  } else {
    showError(data.error_description || data.msg || 'Sign-in failed.');
  }
});

btnSignUp.addEventListener('click', async () => {
  clearError();
  const email = emailInput.value.trim();
  const pass  = passInput.value;
  if (!email || !pass) return showError('Please enter your email and password.');
  if (pass.length < 6) return showError('Password must be at least 6 characters.');
  const data = await supabase.signUpWithEmail(email, pass);
  if (data.id || data.access_token) {
    showError(''); 
    errorMsg.style.color = '#34d399';
    errorMsg.textContent = 'Account created! Check your email to confirm, then sign in.';
    errorMsg.classList.remove('hidden');
  } else {
    showError(data.error_description || data.msg || 'Sign-up failed.');
  }
});
