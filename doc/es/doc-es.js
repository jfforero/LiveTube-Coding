(function () {
    if (window.location.search.indexOf('embed=1') !== -1) {
        document.body.classList.add('embedded-help');
    }

    var searchInput = document.getElementById('doc-search');
    var countEl = document.getElementById('doc-search-count');
    if (!searchInput) return;

    var sections = Array.prototype.slice.call(
        document.querySelectorAll('[data-doc-entry]')
    );
    var navLinks = Array.prototype.slice.call(
        document.querySelectorAll('nav a[href^="#"]')
    );

    function normalize(text) {
        return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function filterDocs() {
        var q = normalize(searchInput.value.trim());
        var visible = 0;

        sections.forEach(function (section) {
            var haystack = normalize(section.getAttribute('data-doc-entry') + ' ' + section.textContent);
            var match = !q || haystack.indexOf(q) !== -1;
            section.classList.toggle('doc-section-hidden', !match);
            if (match) visible++;
        });

        navLinks.forEach(function (link) {
            var id = (link.getAttribute('href') || '').replace('#', '');
            var target = document.getElementById(id);
            var match = target && !target.classList.contains('doc-section-hidden');
            link.parentElement.style.display = match ? '' : 'none';
        });

        countEl.textContent = q
            ? visible + ' sección(es) coinciden con «' + searchInput.value.trim() + '»'
            : sections.length + ' funciones documentadas';
    }

    searchInput.addEventListener('input', filterDocs);
    filterDocs();
})();
