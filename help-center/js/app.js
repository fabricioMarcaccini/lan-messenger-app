/**
 * LANLY HELP CENTER - APP LOGIC
 */

document.addEventListener('DOMContentLoaded', () => {

    // 1. Custom Cursor
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');

    // Smooth cursor follow
    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Dot follows instantly
        dot.style.left = mouseX + 'px';
        dot.style.top = mouseY + 'px';

        // Hover effect for links and buttons
        const target = e.target;
        const clickable = target.tagName.toLowerCase() === 'a' ||
            target.tagName.toLowerCase() === 'button' ||
            target.closest('.bento-card') ||
            target.closest('.trouble-header');

        if (clickable) {
            ring.style.width = '60px';
            ring.style.height = '60px';
            ring.style.borderColor = 'rgba(2, 252, 240, 0.8)';
            ring.style.backgroundColor = 'rgba(2, 252, 240, 0.05)';
        } else {
            ring.style.width = '34px';
            ring.style.height = '34px';
            ring.style.borderColor = 'rgba(2, 252, 240, 0.4)';
            ring.style.backgroundColor = 'transparent';
        }
    });

    // Request Animation Frame for smooth ring catching up
    function renderCursor() {
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;

        ring.style.left = ringX + 'px';
        ring.style.top = ringY + 'px';

        requestAnimationFrame(renderCursor);
    }
    renderCursor();


    // 2. SPA Navigation (Templating Engine)
    const contentContainer = document.getElementById('content-container');
    const navLinks = document.querySelectorAll('.nav-link');
    const tocContainer = document.getElementById('toc-container');

    function loadTemplate(targetId) {
        // Look for exact template, else fallback to 'coming-soon'
        let template = document.getElementById(`tpl-${targetId}`);
        if (!template) {
            template = document.getElementById('tpl-coming-soon');
        }

        // Clear and clone
        contentContainer.innerHTML = '';
        const clone = template.content.cloneNode(true);
        contentContainer.appendChild(clone);

        // Add fade-in animation to wrapper
        contentContainer.className = 'fade-in';
        setTimeout(() => contentContainer.classList.remove('fade-in'), 500);

        // Update active states in sidebar
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-target') === targetId) {
                link.classList.add('active');
            }
        });

        // Initialize specific components newly mounted
        initAccordions();
        generateTOC();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // 3. Navigation Click Handlers
    const sidebar = document.querySelector('.sidebar');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileOverlay = document.getElementById('mobile-overlay');

    function toggleMobileMenu() {
        if (sidebar && mobileOverlay) {
            sidebar.classList.toggle('open');
            mobileOverlay.classList.toggle('active');
        }
    }

    if (mobileMenuBtn && mobileOverlay) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        mobileOverlay.addEventListener('click', toggleMobileMenu);
    }

    document.addEventListener('click', (e) => {
        // Sidebar link clicks (or synthetic clicks from bento cards)
        if (e.target.matches('.nav-link') || e.target.closest('.nav-link')) {
            const link = e.target.matches('.nav-link') ? e.target : e.target.closest('.nav-link');
            e.preventDefault();
            const target = link.getAttribute('data-target');
            if (target) {
                window.location.hash = target;

                // Close mobile menu if it is natively open
                if (sidebar && sidebar.classList.contains('open')) {
                    toggleMobileMenu();
                }
            }
        }
    });

    // 4. Hash Router
    function router() {
        let hash = window.location.hash.substring(1);
        if (!hash) hash = 'welcome';
        loadTemplate(hash);
    }

    window.addEventListener('hashchange', router);
    router(); // Init on load


    // 5. Generate Table of Contents (TOC) for active page
    function generateTOC() {
        tocContainer.innerHTML = '';
        const headings = contentContainer.querySelectorAll('h2, h3:not(.bento-card h3):not(.trouble-header h3):not(.step-content h3)');

        if (headings.length === 0) {
            tocContainer.innerHTML = '<div class="text-muted" style="font-size:0.85rem">Nenhuma seção encontrada.</div>';
            return;
        }

        headings.forEach((heading, index) => {
            // Ensure ID exists
            if (!heading.id) {
                heading.id = `section-${index}`;
            }

            const a = document.createElement('a');
            a.href = `#${window.location.hash.substring(1)}#${heading.id}`;
            a.textContent = heading.textContent;

            // Indent h3
            if (heading.tagName.toLowerCase() === 'h3') {
                a.style.paddingLeft = '24px';
                a.style.fontSize = '0.85rem';
            }

            a.addEventListener('click', (e) => {
                e.preventDefault();
                heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });

            tocContainer.appendChild(a);
        });
    }

    // 6. Init Accordions (Troubleshooting)
    function initAccordions() {
        const headers = contentContainer.querySelectorAll('.trouble-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const parent = header.closest('.trouble-item');
                // Close others
                contentContainer.querySelectorAll('.trouble-item').forEach(item => {
                    if (item !== parent) item.classList.remove('active');
                });
                // Toggle current
                parent.classList.toggle('active');
            });
        });
    }

    // 7. Global Search (Fake interaction for demo)
    const searchInput = document.getElementById('global-search');
    const searchResults = document.getElementById('search-results');

    // Keyboard shortcut /
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
    });

    // Basic fake search
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        if (val.length > 2) {
            searchResults.style.display = 'block';
            searchResults.innerHTML = `
                <div style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor:pointer;">
                    <strong style="color:var(--primary-glow)">${val}</strong>: Tutorial completo na nuvem
                </div>
                <div style="padding: 12px 16px; cursor:pointer;" class="text-muted">
                    Como solucionar problemas com "${val}"
                </div>
            `;
        } else {
            searchResults.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.style.display = 'none';
        }
    });
});
