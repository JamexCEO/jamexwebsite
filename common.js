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
    // filterSelectId (optional): ID of a <select> whose value is a tag string
    // (e.g. "#major" or "#minor") to AND with the text search.
    function initSearch(inputId, itemSelector, filterSelectId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const filterSelect = filterSelectId ? document.getElementById(filterSelectId) : null;
        const items = document.querySelectorAll(itemSelector);

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

        function runFilter() {
            const q = input.value.trim();
            const qLower = q.toLowerCase();
            const tag = filterSelect ? filterSelect.value.toLowerCase() : '';
            let visibleCount = 0;

            items.forEach(el => {
                // Remove previous highlights surgically
                removeHighlights(el);

                const text = el.textContent.toLowerCase();
                const textMatch = text.includes(qLower);
                const tagsDiv = el.querySelector('.tags');
                const tagText = tagsDiv ? tagsDiv.textContent.toLowerCase() : '';
                const tagMatch = !tag || tagText.includes(tag);
                const matches = textMatch && tagMatch;

                el.style.display = matches ? '' : 'none';
                if (matches) visibleCount++;

                if (q && matches) highlightInNode(el, q);
            });

            noResultsMsg.style.display = ((q || tag) && visibleCount === 0) ? '' : 'none';
        }

        input.addEventListener('input', runFilter);
        if (filterSelect) filterSelect.addEventListener('change', runFilter);
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
                    if (p.classList && (p.classList.contains('tag') || p.classList.contains('visible-tags'))) {
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

    // --- Latest News loader for homepage ---
    // Fetches news.html and injects the first .news-entry into #latest-news-container.
    // iframes are replaced with a "Watch on News page" link to keep the homepage light.
    function loadLatestNews() {
        const container = document.getElementById('latest-news-container');
        if (!container) return;

        fetch('news.html')
            .then(res => {
                if (!res.ok) throw new Error('Could not load news.html');
                return res.text();
            })
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const firstEntry = doc.querySelector('.news-entry');
                if (!firstEntry) {
                    container.innerHTML = '<p class="centered-text" style="color:#999;">No news articles found.</p>';
                    return;
                }

                // Clone so we can safely modify without affecting the parsed doc
                const clone = firstEntry.cloneNode(true);

                // Downgrade h2 → h3 so it doesn't clash with the "Latest News" h2
                clone.querySelectorAll('h2').forEach(h2 => {
                    const h3 = document.createElement('h3');
                    h3.innerHTML = h2.innerHTML;
                    h3.className = h2.className;
                    h2.replaceWith(h3);
                });

                // Replace any iframes with a friendly link
                clone.querySelectorAll('iframe').forEach(iframe => {
                    const link = document.createElement('p');
                    link.className = 'centered-text';
                    link.innerHTML = '<a href="news.html">▶ Watch on the News page</a>';
                    const vc = iframe.closest('.video-container');
                    (vc || iframe).replaceWith(link);
                });

                container.innerHTML = '';
                container.appendChild(clone);
            })
            .catch(() => {
                container.innerHTML = '<p class="centered-text" style="color:#999;">Could not load latest news.</p>';
            });
    }

    // Only run on the homepage
    if (document.getElementById('latest-news-container')) {
        loadLatestNews();
    }

    // --- Article anchor links ---
    // Auto-assigns IDs to articles and injects a "Copy link" button into each.
    // Supported selectors: .news-entry, .changelog-entry, .event, .hall-of-fame-entry
    // ID is derived from the article's h2 text, slugified.
    // If the page URL has a #hash on load, scrolls smoothly to that article.
    (function initArticleLinks() {
        const ARTICLE_SELECTORS = [
            '.news-entry',
            '.changelog-entry',
            '.event',
            '.hall-of-fame-entry',
        ];

        const articles = document.querySelectorAll(ARTICLE_SELECTORS.join(', '));
        if (!articles.length) return;

        // Turn a heading string into a URL-safe slug
        function slugify(text) {
            return text
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }

        // Assign IDs and inject buttons
        articles.forEach(article => {
            const h2 = article.querySelector('h2');
            if (!h2) return;

            // Build a slug from the heading; fall back to a random id if empty
            const slug = slugify(h2.textContent) || ('article-' + Math.random().toString(36).slice(2, 7));

            // Avoid duplicate IDs on the same page
            let id = slug;
            let suffix = 2;
            while (document.getElementById(id) && document.getElementById(id) !== article) {
                id = slug + '-' + suffix++;
            }
            article.id = id;

            // Build the copy-link button and insert it right after the h2
            const btn = document.createElement('button');
            btn.className = 'article-link-btn';
            btn.setAttribute('aria-label', 'Copy link to this article');
            btn.textContent = '🔗 Copy link';

            btn.addEventListener('click', () => {
                const url = window.location.origin + window.location.pathname + '#' + id;
                navigator.clipboard.writeText(url).then(() => {
                    btn.textContent = '✅ Copied!';
                    btn.classList.add('article-link-btn--copied');
                    setTimeout(() => {
                        btn.textContent = '🔗 Copy link';
                        btn.classList.remove('article-link-btn--copied');
                    }, 2000);
                }).catch(() => {
                    // Fallback for browsers without clipboard API
                    const ta = document.createElement('textarea');
                    ta.value = window.location.origin + window.location.pathname + '#' + id;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    btn.textContent = '✅ Copied!';
                    btn.classList.add('article-link-btn--copied');
                    setTimeout(() => {
                        btn.textContent = '🔗 Copy link';
                        btn.classList.remove('article-link-btn--copied');
                    }, 2000);
                });
            });

            h2.insertAdjacentElement('afterend', btn);
        });

        // Scroll to the article matching the URL hash (after a short delay so the
        // page has finished laying out, including any dynamically injected content)
        if (window.location.hash) {
            const target = document.getElementById(window.location.hash.slice(1));
            if (target) {
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 150);
            }
        }
    })();
})();