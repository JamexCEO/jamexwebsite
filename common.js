(function() {
    // hover style handling for buttons with links
    document.querySelectorAll('.button').forEach(btn => {
        const a = btn.querySelector('a');
        if (!a) return;
        const href = a.getAttribute('href') || '';
        const isExternal = /^https?:\/\//i.test(href);
        const enter = () => btn.classList.add(isExternal ? 'hover-external' : 'hover-internal');
        const leave = () => { btn.classList.remove('hover-external'); btn.classList.remove('hover-internal'); };
        btn.addEventListener('mouseenter', enter);
        btn.addEventListener('mouseleave', leave);
        a.addEventListener('focus', enter);
        a.addEventListener('blur', leave);
    });

    // highlight current page in navbar
    const getPageFile = (path) => {
        const file = path.split('/').pop() || '';
        return file === '' ? 'index.html' : file;
    };
    const current = getPageFile(window.location.pathname);
    document.querySelectorAll('.navbar a').forEach(a => {
        const href = a.getAttribute('href') || '';
        const hrefFile = getPageFile(href);
        if (hrefFile === current) {
            a.classList.add('active');
        }
    });

    // --- theme toggle logic ---
    // Three states in localStorage:
    //   null = Auto (follows system), shown as 🌓
    //   '1'  = Dark (forced),         shown as 🌙 (click to go light)
    //   '0'  = Light (forced),        shown as ☀️  (click to go dark)
    //
    // Icon shows what you'll get on the NEXT click (standard toggle convention):
    //   In dark mode  → show 🌙 so you know clicking brings light
    //   In light mode → show ☀️ so you know clicking brings dark
    //   In auto mode  → show 🌓
    //
    // Cycle when system is dark:  Auto(🌓) → Light(☀️) → Dark(🌙) → Auto(🌓)
    // Cycle when system is light: Auto(🌓) → Dark(🌙) → Light(☀️) → Auto(🌓)
    // First click always produces a visible change from the current state.

    const themeToggle = document.getElementById('theme-toggle');
    const systemDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    const applyTheme = (dark) => {
        document.body.classList.toggle('dark', dark);
    };

    const updateToggleLabel = () => {
        if (!themeToggle) return;
        const stored = localStorage.getItem('dark-mode');
        if (stored === null) {
            themeToggle.textContent = '🌓'; // Auto
        } else if (stored === '1') {
            themeToggle.textContent = '🌙'; // Currently dark → click for light
        } else {
            themeToggle.textContent = '☀️';  // Currently light → click for dark
        }
    };

    // Click cycles: Auto → (opposite of current) → (back to current) → Auto
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const stored = localStorage.getItem('dark-mode');
            if (stored === null) {
                // Auto → flip to opposite of system
                const newDark = !systemDark();
                localStorage.setItem('dark-mode', newDark ? '1' : '0');
                applyTheme(newDark);
            } else if (stored === '1') {
                // Dark → Light
                localStorage.setItem('dark-mode', '0');
                applyTheme(false);
            } else {
                // Light → Auto
                localStorage.removeItem('dark-mode');
                applyTheme(systemDark());
            }
            updateToggleLabel();
        });
    }

    // Initialize
    const stored = localStorage.getItem('dark-mode');
    if (stored !== null) {
        applyTheme(stored === '1');
    } else {
        applyTheme(systemDark());
        // Stay in sync when in Auto mode and system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (localStorage.getItem('dark-mode') === null) {
                applyTheme(e.matches);
                updateToggleLabel();
            }
        });
    }
    updateToggleLabel();

    // --- search helper with highlighting ---
    function initSearch(inputId, itemSelector) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const items = document.querySelectorAll(itemSelector);

        const noResultsMsg = document.createElement('div');
        noResultsMsg.className = 'no-results';
        noResultsMsg.textContent = 'No results found';
        noResultsMsg.style.display = 'none';
        input.parentNode.insertAdjacentElement('afterend', noResultsMsg);

        input.addEventListener('input', () => {
            const q = input.value.trim();
            const qLower = q.toLowerCase();
            let visibleCount = 0;

            items.forEach(el => {
                // Remove previous highlights surgically — never touch innerHTML,
                // which would reset iframes/videos and cause flashing
                removeHighlights(el);

                const matches = el.textContent.toLowerCase().includes(qLower);
                el.style.display = matches ? '' : 'none';
                if (matches) visibleCount++;

                if (q && matches) highlightInNode(el, q);
            });

            noResultsMsg.style.display = (q && visibleCount === 0) ? '' : 'none';
        });
    }

    // Unwrap all <mark> elements, leaving everything else (iframes, videos) untouched
    function removeHighlights(node) {
        node.querySelectorAll('mark').forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
    }

    // Wrap query matches in <mark> tags, skipping inside media elements
    function highlightInNode(node, query) {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');

        const mediaFilter = {
            acceptNode(n) {
                let p = n.parentNode;
                while (p && p !== node) {
                    if (/^(IFRAME|VIDEO|AUDIO|IMG|SCRIPT|STYLE)$/.test(p.nodeName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    p = p.parentNode;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        };

        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, mediaFilter);
        const nodesToProcess = [];
        let textNode;
        while (textNode = walker.nextNode()) {
            if (textNode.nodeValue.toLowerCase().includes(query.toLowerCase())) {
                nodesToProcess.push(textNode);
            }
        }

        nodesToProcess.reverse().forEach(textNode => {
            const span = document.createElement('span');
            span.innerHTML = textNode.nodeValue.replace(regex, '<mark>$1</mark>');
            textNode.parentNode.replaceChild(span, textNode);
        });
    }

    window.initSearch = initSearch;
})();