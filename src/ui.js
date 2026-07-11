import {
  books,
  members,
  addNewBook,
  borrowBook,
  returnBook,
  loadCatalogue,
  updateStatistics,
  formatBookLabel
} from './library.js';

document.addEventListener('DOMContentLoaded', () => {
  // Safe Cache DOM elements with null checks
  const tabs = document.querySelectorAll('nav button');
  const sections = document.querySelectorAll('main section');

  const searchInput = document.getElementById('search');
  const filterDropdown = document.getElementById('filter-category');
  const catalogueList = document.getElementById('catalogue-list');

  const borrowForm = document.getElementById('borrow-form');
  const returnForm = document.getElementById('return-form');
  const addBookForm = document.getElementById('add-book-form');
  const memberListEl = document.getElementById('member-list');

  // ====================== TAB SWITCHING ======================
  function switchTab(selectedTab) {
    if (!selectedTab) return;

    tabs.forEach(tab => {
      tab.setAttribute('aria-selected', 'false');
    });

    selectedTab.setAttribute('aria-selected', 'true');
    
    sections.forEach(section => {
      if (section) section.hidden = true;
    });
    
    const targetId = selectedTab.getAttribute('aria-controls');
    if (targetId) {
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.hidden = false;
      } else {
        console.warn(`No section found matching ID: "${targetId}"`);
      }
    }
  }

  // ====================== EVENT DELEGATION & LISTENERS ======================
  function setupEventListeners() {
    
    tabs.forEach(tab => {
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        switchTab(tab);
      });
    });

    
    if (catalogueList !== null) {
      catalogueList.addEventListener('click', (event) => {
        const actionBtn = event.target.closest('.btn-quick-borrow');
        if (actionBtn) {
          const isbn = actionBtn.dataset.isbn;
          if (isbn) {
            alert(`Quick borrow requested for ISBN: ${isbn}`);
          }
        }
      });
    }

    const mainNav = document.querySelector('nav');
    if (mainNav !== null) {
      mainNav.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target.tagName === 'BUTTON') {
          switchTab(event.target);
        }
      });
    }

    if (searchInput !== null) {
      searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    if (filterDropdown !== null) {
      filterDropdown.addEventListener('change', handleFilterChange);
    }

    // Forms
    if (borrowForm !== null) {
      borrowForm.addEventListener('submit', handleBorrowSubmit);
    }

    if (returnForm !== null) {
      returnForm.addEventListener('submit', handleReturnSubmit);
    }

    if (addBookForm !== null) {
      addBookForm.addEventListener('submit', handleAddBookSubmit);
    }
  }

  // ====================== FORM HANDLERS ======================
  function handleBorrowSubmit(e) {
    e.preventDefault();
    const memberIdEl = document.getElementById('borrow-member-id');
    const isbnEl = document.getElementById('borrow-isbn');

    if (!memberIdEl || !isbnEl) return;

    const memberId = memberIdEl.value.trim();
    const isbn = isbnEl.value.trim();

    if (!memberId || !isbn) {
      alert('Please fill in all fields.');
      return;
    }

    const success = borrowBook(memberId, isbn);
    if (success) {
      alert('Book borrowed successfully!');
      borrowForm.reset();
      updateStatisticsDisplay();
      renderBookCatalogue(loadCatalogue());
    } else {
      alert('Failed to borrow book. Check member ID, book availability, or limits.');
    }
  }

  function handleReturnSubmit(e) {
    e.preventDefault();
    const memberIdEl = document.getElementById('return-member-id');
    const isbnEl = document.getElementById('return-isbn');
    const messageEl = document.getElementById('return-message');

    if (!memberIdEl || !isbnEl) return;

    const memberId = memberIdEl.value.trim();
    const isbn = isbnEl.value.trim();

    if (!memberId || !isbn) return;

    const success = returnBook(memberId, isbn);

    if (messageEl !== null) {
      if (success) {
        messageEl.innerHTML = `<p style="color: #4ade80;">Book returned successfully!</p>`;
        returnForm.reset();
        updateStatisticsDisplay();
        renderBookCatalogue(loadCatalogue());
      } else {
        messageEl.innerHTML = `<p style="color: #f87171;">Failed to process return.</p>`;
      }
    }
  }

  function handleAddBookSubmit(e) {
    e.preventDefault();
    const titleEl = document.getElementById('title');
    const authorEl = document.getElementById('author');
    const isbnEl = document.getElementById('isbn');
    const categoryEl = document.getElementById('category');

    if (!titleEl || !authorEl || !isbnEl || !categoryEl) return;

    const bookPayload = {
      title: titleEl.value.trim(),
      author: authorEl.value.trim(),
      isbn: isbnEl.value.trim(),
      category: categoryEl.value,
      totalCopies: 1
    };

    if (bookPayload.title && bookPayload.author && bookPayload.isbn) {
      const success = addNewBook(bookPayload);
      if (success) {
        alert('Book added successfully!');
        addBookForm.reset();
        renderBookCatalogue(loadCatalogue());
        updateStatisticsDisplay();
      }
    }
  }

  // ====================== SEARCH & FILTER ======================
  function handleSearch() {
    if (!searchInput) return;
    const term = searchInput.value.toLowerCase().trim();
    const catalogue = loadCatalogue();

    const filtered = catalogue.filter(({ title, author, isbn }) =>
      title.toLowerCase().includes(term) ||
      author.toLowerCase().includes(term) ||
      isbn.toLowerCase().includes(term)
    );

    renderBookCatalogue(filtered);
  }

  function handleFilterChange() {
    if (!filterDropdown) return;
    const category = filterDropdown.value;
    const catalogue = loadCatalogue();

    const filtered = category === 'all'
      ? catalogue
      : catalogue.filter(book => book.category === category);

    renderBookCatalogue(filtered);
  }

  // ====================== RENDERING ======================
  function renderBookCatalogue(bookList = []) {
    if (catalogueList === null) return;

    catalogueList.innerHTML = '';

    if (bookList.length === 0) {
      catalogueList.innerHTML = '<p>No books found.</p>';
      return;
    }

    for (const book of bookList) {
      const { title, author, isbn, availableCopies, totalCopies } = book;
      const card = document.createElement('div');
      card.className = 'book-card';

      card.innerHTML = `
        <h3>${formatBookLabel({ title, author })}</h3>
        <p><strong>ISBN:</strong> ${isbn}</p>
        <p><strong>Copies:</strong> ${availableCopies} / ${totalCopies}</p>
        <p><strong>Status:</strong> ${availableCopies > 0 ? 'Available' : 'Out of Stock'}</p>
        <button class="btn-quick-borrow" data-isbn="${isbn}">Quick Reserve</button>
      `;
      catalogueList.appendChild(card);
    }
  }

  function renderMemberList() {
    if (memberListEl === null) return;
    memberListEl.innerHTML = '';

    if (members.length === 0) {
      memberListEl.innerHTML = '<p>No registered members.</p>';
      return;
    }

    members.forEach(({ id, name, email, borrowedBooks }) => {
      const card = document.createElement('div');
      card.className = 'member-card';
      card.innerHTML = `
        <h3>${name} (${id})</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Borrowed Books:</strong> ${borrowedBooks.length}</p>
      `;
      memberListEl.appendChild(card);
    });
  }

  function updateStatisticsDisplay() {
    const stats = updateStatistics();
    const totalEl = document.querySelector('.total-books');
    const membersEl = document.querySelector('.total-members');
    const borrowedEl = document.querySelector('.borrowed-books');
    const overdueEl = document.querySelector('.overdue-count');

    if (totalEl !== null) totalEl.textContent = `${stats.totalBooks}`;
    if (membersEl !== null) membersEl.textContent = `${stats.totalMembers}`;
    if (borrowedEl !== null) borrowedEl.textContent = `${stats.borrowedBooks}`;
    if (overdueEl !== null) overdueEl.textContent = `${stats.hasOverdueLoans ? 'Yes' : 'None'}`;
  }

  function debounce(func, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  }

  // ====================== BOOT SEQUENCE ======================
  setupEventListeners();

  // Set default tab on load
  const defaultTab = document.getElementById('dashboard-tab');
  if (defaultTab) {
    switchTab(defaultTab);
  }

  renderBookCatalogue(loadCatalogue());
  renderMemberList();
  updateStatisticsDisplay();
});