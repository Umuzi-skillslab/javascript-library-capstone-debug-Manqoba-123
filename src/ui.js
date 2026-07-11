// ui.js - Handles all UI interactions, tab switching, and DOM updates

document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    const tabs = document.querySelectorAll('nav button');
    const sections = document.querySelectorAll('main section');

    const searchInput = document.getElementById('search');
    const filterDropdown = document.getElementById('filter-category');
    const catalogueList = document.getElementById('catalogue-list');
    const bookDetails = document.getElementById('book-details');

    const borrowForm = document.getElementById('borrow-form');
    const returnForm = document.getElementById('return-form');
    const addBookForm = document.getElementById('add-book-form');

    // ====================== TAB SWITCHING ======================
    function switchTab(selectedTab) {
        tabs.forEach(tab => tab.setAttribute('aria-selected', 'false'));
        selectedTab.setAttribute('aria-selected', 'true');

        sections.forEach(section => section.hidden = true);

        const targetId = selectedTab.getAttribute('aria-controls');
        const targetSection = document.getElementById(targetId);
        if (targetSection) targetSection.hidden = false;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab));
    });

    // Set default tab
    const defaultTab = document.getElementById('dashboard-tab');
    if (defaultTab) switchTab(defaultTab);

    // ====================== EVENT LISTENERS ======================
    function setupEventListeners() {
        // Search
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, 300));
        }

        // Filter
        if (filterDropdown) {
            filterDropdown.addEventListener('change', handleFilterChange);
        }

        // Borrow Form
        if (borrowForm) {
            borrowForm.addEventListener('submit', handleBorrowSubmit);
        }

        // Return Form
        if (returnForm) {
            returnForm.addEventListener('submit', handleReturnSubmit);
        }

        // Add Book Form
        if (addBookForm) {
            addBookForm.addEventListener('submit', handleAddBookSubmit);
        }
    }

    // ====================== FORM HANDLERS ======================
    function handleBorrowSubmit(e) {
        e.preventDefault();
        const memberId = document.getElementById('borrow-member-id').value.trim();
        const isbn = document.getElementById('borrow-isbn').value.trim();

        if (!memberId || !isbn) {
            alert("Please fill in all fields.");
            return;
        }

        const success = borrowBook(memberId, isbn); // This function should be in library.js
        if (success) {
            alert("Book borrowed successfully!");
            borrowForm.reset();
            updateStatisticsDisplay();
        } else {
            alert("Failed to borrow book. Check details.");
        }
    }

    function handleReturnSubmit(e) {
        e.preventDefault();
        const memberId = document.getElementById('return-member-id').value.trim();
        const isbn = document.getElementById('return-isbn').value.trim();

        if (!memberId || !isbn) return;

        const success = returnBook(memberId, isbn);
        const messageEl = document.getElementById('return-message');

        if (success) {
            messageEl.innerHTML = `<p style="color: #4ade80;">Book returned successfully!</p>`;
            returnForm.reset();
            updateStatisticsDisplay();
        } else {
            messageEl.innerHTML = `<p style="color: #f87171;">Failed to process return.</p>`;
        }
    }

    function handleAddBookSubmit(e) {
        e.preventDefault();
        const title = document.getElementById('title').value.trim();
        const author = document.getElementById('author').value.trim();
        const isbn = document.getElementById('isbn').value.trim();
        const category = document.getElementById('category').value;

        if (title && author && isbn) {
            const success = addNewBook({ title, author, isbn, category, available: true });
            if (success) {
                alert("Book added successfully!");
                addBookForm.reset();
                loadCatalogue(); // Refresh catalogue
            }
        }
    }

    // ====================== SEARCH & FILTER ======================
    function handleSearch() {
        const term = searchInput.value.toLowerCase().trim();
        const filtered = books.filter(book => 
            book.title.toLowerCase().includes(term) || 
            book.author.toLowerCase().includes(term)
        );
        renderBookCatalogue(filtered);
    }

    function handleFilterChange() {
        const category = filterDropdown.value;
        let filtered = books;

        if (category !== 'all') {
            filtered = books.filter(book => book.category === category);
        }
        renderBookCatalogue(filtered);
    }

    // ====================== RENDERING ======================
    function renderBookCatalogue(bookList) {
        catalogueList.innerHTML = '';

        if (bookList.length === 0) {
            catalogueList.innerHTML = '<p>No books found.</p>';
            return;
        }

        bookList.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.innerHTML = `
                <h3>${book.title}</h3>
                <p><strong>Author:</strong> ${book.author}</p>
                <p><strong>ISBN:</strong> ${book.isbn}</p>
                <p><strong>Status:</strong> ${book.available ? 'Available' : 'Borrowed'}</p>
            `;
            catalogueList.appendChild(card);
        });
    }

    function updateStatisticsDisplay() {
        document.querySelector('.total-books').textContent = books.length || 0;
        // Add more stats as needed
    }

    // Utility: Debounce for search
    function debounce(func, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    }

    // Initialize everything
    setupEventListeners();
    loadCatalogue();           //It is defined in library.js
    updateStatisticsDisplay();
});