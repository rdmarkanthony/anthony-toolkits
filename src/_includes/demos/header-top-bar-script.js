// a bar above closes, nothing to tell _header, it measures where it sits
document.querySelector('.js-top-bar-close').addEventListener('click', (e) => e.currentTarget.closest('.js-top-bar').setAttribute('data-closed', ''));
