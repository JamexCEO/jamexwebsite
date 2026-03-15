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

    // --- dark mode toggle logic ---
    const themeToggle = document.getElementById('theme-toggle');
    const setTheme = (dark) => {
        document.body.classList.toggle('dark', dark);
        themeToggle.textContent = dark ? '☀️' : '🌙';
        localStorage.setItem('dark-mode', dark ? '1' : '0');
    };
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            setTheme(!document.body.classList.contains('dark'));
        });
    }
    // initialize theme from storage or system preference
    const stored = localStorage.getItem('dark-mode');
    if (stored !== null) {
        setTheme(stored === '1');
    } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark);
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
        // Insert after the tip (.small-text) if it follows the search container,
        // otherwise fall back to inserting directly after the search container
        const searchContainer = input.parentNode;
        const tip = searchContainer.nextElementSibling;
        const anchor = (tip && tip.classList.contains('small-text')) ? tip : searchContainer;
        anchor.insertAdjacentElement('afterend', noResultsMsg);

        input.addEventListener('input', () => {
            const q = input.value.trim();
            const qLower = q.toLowerCase();
            let visibleCount = 0;

            items.forEach(el => {
                // Remove any existing <mark> highlights without touching media elements
                removeHighlights(el);

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

    // Remove all <mark> elements by unwrapping them back to plain text,
    // leaving all other DOM nodes (including <video>, <img>) completely untouched.
    function removeHighlights(node) {
        const marks = node.querySelectorAll('mark');
        // Iterate in reverse so parent marks are unwrapped after their children
        Array.from(marks).reverse().forEach(mark => {
            const parent = mark.parentNode;
            if (!parent) return;
            // Replace <mark> with its text content as a plain text node
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            // Merge adjacent text nodes to keep the DOM tidy
            parent.normalize();
        });
    }

    // helper: highlight all occurrences of query text in a DOM node,
    // skipping any media elements so they are never modified
    function highlightInNode(node, query) {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');

        const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(textNode) {
                    // Skip text inside media or interactive elements
                    const skipTags = new Set(['VIDEO', 'AUDIO', 'SCRIPT', 'STYLE', 'IFRAME']);
                    let ancestor = textNode.parentNode;
                    while (ancestor && ancestor !== node) {
                        if (skipTags.has(ancestor.tagName)) return NodeFilter.FILTER_REJECT;
                        ancestor = ancestor.parentNode;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
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