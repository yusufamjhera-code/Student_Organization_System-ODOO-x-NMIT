/**
 * PassTrack Unified Toast Notification System
 * Pure Vanilla JavaScript - No dependencies
 * Follows Sonnet Clip Pill Floating Notification Architecture
 */
(function() {
    'use strict';

    let toastContainer = null;

    function getOrCreateContainer() {
        if (!toastContainer || !document.body.contains(toastContainer)) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'pt-toast-container';
            toastContainer.setAttribute('role', 'region');
            toastContainer.setAttribute('aria-live', 'polite');
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    const ToastEngine = {
        /**
         * Dispatch a floating toast notification
         * @param {string} message - Message text to display
         * @param {'info'|'success'|'error'|'warn'} type - Toast aesthetic type
         * @param {number} duration - Auto-dismiss timeout in ms
         */
        show: function(message, type = 'info', duration = 3800) {
            const container = getOrCreateContainer();
            const toast = document.createElement('div');
            toast.className = `pt-toast pt-toast--${type}`;
            toast.setAttribute('role', 'alert');

            const dot = document.createElement('span');
            dot.className = 'pt-toast-dot';

            const text = document.createElement('span');
            text.className = 'pt-toast-text';
            text.textContent = message;

            toast.appendChild(dot);
            toast.appendChild(text);

            let timerId = null;

            const dismiss = () => {
                if (timerId) clearTimeout(timerId);
                toast.classList.add('pt-toast--closing');
                toast.addEventListener('animationend', () => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, { once: true });
            };

            toast.addEventListener('click', dismiss);

            container.appendChild(toast);

            if (duration > 0) {
                timerId = setTimeout(dismiss, duration);
            }

            return { dismiss };
        },

        success: function(msg, duration) { return this.show(msg, 'success', duration); },
        error: function(msg, duration) { return this.show(msg, 'error', duration); },
        warn: function(msg, duration) { return this.show(msg, 'warn', duration); },
        info: function(msg, duration) { return this.show(msg, 'info', duration); }
    };

    window.PassTrackToast = ToastEngine;

    // Connect to PassTrack.UI contract if loaded
    if (window.PassTrack && window.PassTrack.UI) {
        window.PassTrack.UI.toast = ToastEngine.show.bind(ToastEngine);
    }
})();
