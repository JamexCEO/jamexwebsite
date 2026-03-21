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
    // Three states: 'auto' | 'light' | 'dark'
    // Cycle always moves away from the current *appearance* first:
    //   System dark:  auto(dark) → light → dark → auto
    //   System light: auto(light) → dark → light → auto
    const themeToggle = document.getElementById('theme-toggle');
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

    const ICONS = { auto: '🌓', light: '☀️', dark: '🌙' };
    const LABELS = { auto: 'Auto (system)', light: 'Light mode', dark: 'Dark mode' };

    const applyTheme = (mode) => {
        const isDark = mode === 'dark' || (mode === 'auto' && systemDark && systemDark.matches);
        document.body.classList.toggle('dark', isDark);
        if (themeToggle) {
            themeToggle.textContent = ICONS[mode];
            themeToggle.setAttribute('aria-label', LABELS[mode]);
            themeToggle.dataset.mode = mode;
        }
    };

    const setMode = (mode) => {
        localStorage.setItem('theme-mode', mode);
        applyTheme(mode);
    };

    const getMode = () => localStorage.getItem('theme-mode') || 'auto';

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = getMode();
            const systemIsDark = systemDark && systemDark.matches;
            let next;
            if (current === 'auto') {
                // First click always switches away from what you're currently seeing
                next = systemIsDark ? 'light' : 'dark';
            } else if (current === 'light') {
                next = systemIsDark ? 'dark' : 'auto';
            } else {
                // current === 'dark'
                next = systemIsDark ? 'auto' : 'light';
            }
            setMode(next);
        });
    }

    // Initialize theme on page load
    applyTheme(getMode());

    // When in 'auto' mode, react to system theme changes live
    if (systemDark) {
        systemDark.addEventListener('change', () => {
            if (getMode() === 'auto') {
                applyTheme('auto');
            }
        });
    }

    // simple search helper with highlighting – pages call this if they need it
    function initSearch(inputId, itemSelector) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const items = document.querySelectorAll(itemSelector);
        
        // Create a "no results" message element
        const noResultsMsg = document.createElement('div');
        noResultsMsg.className = 'no-results';
        noResultsMsg.textContent = 'No results found';
        noResultsMsg.style.display = 'none';
        input.parentNode.insertAdjacentElement('afterend', noResultsMsg);
        
        // Store original HTML for all items so we can restore and re-highlight
        const originals = new Map();
        items.forEach(el => {
            originals.set(el, el.innerHTML);
        });
        
        input.addEventListener('input', () => {
            const q = input.value.trim();
            const qLower = q.toLowerCase();
            let visibleCount = 0;
            
            items.forEach(el => {
                // Restore original HTML first
                el.innerHTML = originals.get(el);
                
                // Show/hide based on match
                const matches = el.textContent.toLowerCase().includes(qLower);
                el.style.display = matches ? '' : 'none';
                if (matches) visibleCount++;
                
                // Highlight matches if query is not empty and entry is visible
                if (q && matches) {
                    highlightInNode(el, q);
                }
            });
            
            // Show "no results" message if search is active but nothing matches
            noResultsMsg.style.display = (q && visibleCount === 0) ? '' : 'none';
        });
    }
    
    // helper: highlight all occurrences of query text in a DOM node
    function highlightInNode(node, query) {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        
        const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const nodesToProcess = [];
        let textNode;
        while (textNode = walker.nextNode()) {
            if (textNode.nodeValue.toLowerCase().includes(query.toLowerCase())) {
                nodesToProcess.push(textNode);
            }
        }
        
        // Process in reverse to maintain node references
        nodesToProcess.reverse().forEach(textNode => {
            const span = document.createElement('span');
            span.innerHTML = textNode.nodeValue.replace(regex, '<mark>$1</mark>');
            textNode.parentNode.replaceChild(span, textNode);
        });
    }
    
    window.initSearch = initSearch;
})();