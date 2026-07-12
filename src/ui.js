import {
  books,
  members,
  loans,
  LibraryStats,
  addNewBook,
  addNewMember,
  borrowBook,
  returnBook,
  loadCatalogue,
  updateStatistics,
  formatBookLabel
} from './library.js';

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('nav button');
  const sections = document.querySelectorAll('main section');

  const searchInput = document.getElementById('search');
  const filterDropdown = document.getElementById('filter-category');
  const catalogueList = document.getElementById('catalogue-list');

  const borrowForm = document.getElementById('borrow-form');
  const returnForm = document.getElementById('return-form');
  const addBookForm = document.getElementById('add-book-form');
  const addMemberForm = document.getElementById('add-member-form');
  const memberListEl = document.getElementById('member-list');
  const detailedStatsGrid = document.getElementById('detailed-stats-grid');

  function switchTab(selectedTab) {
    if (!selectedTab) return;

    tabs.forEach(tab => tab.setAttribute('aria-selected', 'false'));
    selectedTab.setAttribute('aria-selected', 'true');

    sections.forEach(section => {
      if (section) section.setAttribute('hidden', '');
    });

    const targetId = selectedTab.getAttribute('aria-controls');
    if (targetId) {
      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.removeAttribute('hidden');
    }

    // Refresh display when switching tabs
    updateStatisticsDisplay();
  }

  function setupEventListeners() {
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(tab);
      });
    });

    const mainNav = document.querySelector('nav');
    if (mainNav) {
      mainNav.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'BUTTON') switchTab(e.target);
      });
    }

    if (catalogueList) {
      catalogueList.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('.btn-quick-borrow');
        if (actionBtn && actionBtn.dataset.isbn) {
          alert(`Quick borrow requested for ISBN: ${actionBtn.dataset.isbn}`);
        }
      });
    }

    if (searchInput) searchInput.addEventListener('input', debounce(handleSearch, 300));
    if (filterDropdown) filterDropdown.addEventListener('change', handleFilterChange);

    if (borrowForm) borrowForm.addEventListener('submit', handleBorrowSubmit);
    if (returnForm) returnForm.addEventListener('submit', handleReturnSubmit);
    if (addBookForm) addBookForm.addEventListener('submit', handleAddBookSubmit);
    if (addMemberForm) addMemberForm.addEventListener('submit', handleAddMemberSubmit);
  }

  function handleBorrowSubmit(e) {
    e.preventDefault();
    const memberId = document.getElementById('borrow-member-id')?.value.trim();
    const isbn = document.getElementById('borrow-isbn')?.value.trim();

    if (!memberId || !isbn) return;

    if (borrowBook(memberId, isbn)) {
      alert('Book borrowed successfully!');
      borrowForm.reset();
      updateStatisticsDisplay();
      renderBookCatalogue(loadCatalogue());
      renderMemberList();
    } else {
      alert('Failed to borrow. Double-check member ID, book availability, or borrowing limits.');
    }
  }

  function handleReturnSubmit(e) {
    e.preventDefault();
    const memberId = document.getElementById('return-member-id')?.value.trim();
    const isbn = document.getElementById('return-isbn')?.value.trim();
    const messageEl = document.getElementById('return-message');

    if (!memberId || !isbn) return;

    const success = returnBook(memberId, isbn);
    if (messageEl) {
      messageEl.innerHTML = success
        ? `<p style="color: #4ade80;">Book returned successfully!</p>`
        : `<p style="color: #f87171;">Failed to process return. Check member ID and ISBN.</p>`;
    }

    if (success) {
      returnForm.reset();
      updateStatisticsDisplay();
      renderBookCatalogue(loadCatalogue());
      renderMemberList();
    }
  }

  function handleAddBookSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('title')?.value.trim();
    const author = document.getElementById('author')?.value.trim();
    const isbn = document.getElementById('isbn')?.value.trim();
    const category = document.getElementById('category')?.value;
    const copiesInput = document.getElementById('copies');
    const totalCopies = parseInt(copiesInput?.value, 10) || 1;

    if (title && author && isbn) {
      if (addNewBook({ title, author, isbn, category, totalCopies })) {
        alert(`Successfully added ${totalCopies} copies of "${title}"!`);
        addBookForm.reset();
        if (copiesInput) copiesInput.value = 1;

        renderBookCatalogue(loadCatalogue());
        updateStatisticsDisplay();
      }
    }
  }

  function handleAddMemberSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('member-id')?.value.trim();
    const name = document.getElementById('member-name')?.value.trim();
    const email = document.getElementById('member-email')?.value.trim();

    if (id && name) {
      if (addNewMember({ id, name, email })) {
        alert(`Member "${name}" registered successfully!`);
        addMemberForm.reset();
        renderMemberList();
        updateStatisticsDisplay();
      } else {
        alert('Could not register member. That ID might already exist.');
      }
    }
  }

  function handleSearch() {
    if (!searchInput) return;
    const term = searchInput.value.toLowerCase().trim();
    const filtered = loadCatalogue().filter(({ title, author, isbn }) =>
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
    renderBookCatalogue(category === 'all' ? catalogue : catalogue.filter(b => b.category === category));
  }

  function renderBookCatalogue(bookList = []) {
    if (!catalogueList) return;
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
    if (!memberListEl) return;
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
        <p><strong>Borrowed Books:</strong> ${borrowedBooks ? borrowedBooks.length : 0}</p>
      `;
      memberListEl.appendChild(card);
    });
  }

  function updateStatisticsDisplay() {
    const stats = updateStatistics();

    // 1. Update Dashboard quick-stat counters
    const totalEl = document.querySelector('.total-books');
    const membersEl = document.querySelector('.total-members');
    const borrowedEl = document.querySelector('.borrowed-books');
    const overdueEl = document.querySelector('.overdue-count');

    if (totalEl) totalEl.textContent = `${stats.totalBooks}`;
    if (membersEl) membersEl.textContent = `${stats.totalMembers}`;
    if (borrowedEl) borrowedEl.textContent = `${stats.borrowedBooks}`;
    if (overdueEl) overdueEl.textContent = `${stats.hasOverdueLoans ? 'Yes' : 'None'}`;

    // 2. Render content into the Statistics Tab grid
    if (detailedStatsGrid) {
      const borrowingRate = LibraryStats.getMemberBorrowingRate(members, books);
      const activeLoans = LibraryStats.getActiveLoansCount(loans);

      detailedStatsGrid.innerHTML = `
        <div class="stat-card">
          <h3>Total Titles</h3>
          <p>${books.length}</p>
        </div>
        <div class="stat-card">
          <h3>Total Physical Copies</h3>
          <p>${stats.totalBooks}</p>
        </div>
        <div class="stat-card">
          <h3>Total Registered Members</h3>
          <p>${stats.totalMembers}</p>
        </div>
        <div class="stat-card">
          <h3>Active Borrowed Copies</h3>
          <p>${stats.borrowedBooks}</p>
        </div>
        <div class="stat-card">
          <h3>Active Loans</h3>
          <p>${activeLoans}</p>
        </div>
        <div class="stat-card">
          <h3>Avg Borrowed / Member</h3>
          <p>${borrowingRate}</p>
        </div>
      `;
    }
  }

  function debounce(func, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  }

  setupEventListeners();

  const defaultTab = document.getElementById('dashboard-tab');
  if (defaultTab) switchTab(defaultTab);

  renderBookCatalogue(loadCatalogue());
  renderMemberList();
  updateStatisticsDisplay();
});