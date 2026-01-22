/**
 * Disables the submit button and shows a loading state
 * @param {HTMLButtonElement} button - The submit button element
 * @param {string} text - The text to display while loading (default: 'Processing...')
 */
function showLoading(button, text = 'Processing...') {
    if (!button) return;

    // Disable the button to prevent multiple submissions
    button.disabled = true;
    button.classList.add('opacity-75', 'cursor-not-allowed');

    // Save original text if needed for reversion (though usually we redirect)
    button.dataset.originalText = button.innerHTML;

    // Add spinner and text
    button.innerHTML = `
        <div class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>${text}</span>
        </div>
    `;
}

/**
 * Reverts the button to its original state
 * @param {HTMLButtonElement} button - The submit button element
 */
function hideLoading(button) {
    if (!button) return;

    button.disabled = false;
    button.classList.remove('opacity-75', 'cursor-not-allowed');

    if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
    }
}
