/**
 * WP Plugin Downloader Client
 * Handles UI interactions, API fetching, and DOM manipulation.
 */

const form = document.getElementById('downloadForm');
const pluginUrlInput = document.getElementById('pluginUrl');
const noticeContainer = document.getElementById('noticeContainer');
const submitBtn = document.getElementById('submitBtn');
const loadingIcon = document.getElementById('loadingIcon');
const btnText = submitBtn.querySelector('span');

/**
 * Toggles the loading state of the submit button and icon.
 */
const setLoading = (isLoading) => {
  if (isLoading) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
    loadingIcon.classList.remove('hidden');
    btnText.textContent = 'Processing...';
  } else {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    loadingIcon.classList.add('hidden');
    btnText.textContent = 'Fetch & Download';
  }
};

/**
 * Renders a dismissible notification in the UI.
 */
const showNotice = (type, message) => {
  // Clear previous notices for a clean state
  noticeContainer.innerHTML = '';

  const wrapper = document.createElement('div');

  const baseClasses =
    'relative fade-in p-4 pr-10 rounded-lg border flex items-start gap-3';

  // Dynamic theme classes based on type
  const themeClasses =
    type === 'error'
      ? 'bg-red-50 border-red-100 text-red-800'
      : 'bg-emerald-50 border-emerald-100 text-emerald-800';

  wrapper.className = `${baseClasses} ${themeClasses}`;

  const errorIcon = `<svg class="w-5 h-5 mt-0.5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  const successIcon = `<svg class="w-5 h-5 mt-0.5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;

  wrapper.innerHTML = `
    ${type === 'error' ? errorIcon : successIcon}
    <div>
      <h3 class="font-semibold text-sm">
        ${type === 'error' ? 'Error Occurred' : 'Success'}
      </h3>
      <p class="text-sm opacity-90">${message}</p>
    </div>
    <button 
      type="button"
      onclick="this.parentElement.remove()"
      class="absolute top-4 right-4 text-current opacity-40 hover:opacity-100 transition-opacity p-1"
      aria-label="Close"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
  `;

  noticeContainer.appendChild(wrapper);
};

/**
 * Handles the browser file download process using a temporary blob URL.
 */
const triggerBrowserDownload = (blob, filename) => {
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
};

/**
 * Form submission handler.
 * Fetches the file stream from the backend and triggers download.
 */
const handleFormSubmit = async (e) => {
  e.preventDefault();

  const url = pluginUrlInput.value;

  pluginUrlInput.value = '';

  noticeContainer.innerHTML = '';
  setLoading(true);

  try {
    const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to download plugin');
    }

    // Process Blob
    const blob = await response.blob();

    // Extract filename from headers or default to plugin.zip
    const disposition = response.headers.get('Content-Disposition');
    let filename = 'plugin.zip';
    if (disposition && disposition.indexOf('filename=') !== -1) {
      filename = disposition.split('filename=')[1].replace(/['"]/g, '');
    }

    triggerBrowserDownload(blob, filename);
    showNotice('success', `Downloading <strong>${filename}</strong>...`);
  } catch (error) {
    showNotice('error', error.message);
  } finally {
    setLoading(false);
  }
};

form.addEventListener('submit', handleFormSubmit);
