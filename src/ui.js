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
  // Cache key interactive DOM targets
  const tabs = document.querySelectorAll('nav button');
  const sections = document.querySelectorAll('main section');

  const searchInput = document.getElementById('search');
  const filterDropdown = document.getElementById('filter-category');
  const catalogueList = document.getElementById('catalogue-list');

  const borrowForm = document.getElementById('borrow-form');
  const takeDateInput = document.getElementById('borrow-take-date');
  const dueDateInput = document.getElementById('borrow-due-date');

  const returnForm = document.getElementById('return-form');
  const addBookForm = document.getElementById('add-book-form');
  const addMemberForm = document.getElementById('add-member-form');
  const memberListEl = document.getElementById('member-list');
  const detailedStatsGrid = document.getElementById('detailed-stats-grid');

  // Pre-fill borrow date fields with defaults (Today and Today + 14 Days)
  function setDefaultBorrowDates() {
    const today = new Date();
    const fourteenDays = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (takeDateInput) takeDateInput.value = today.toISOString().split('T')[0];
    if (dueDateInput) dueDateInput.value = fourteenDays.toISOString().split('T')[0];
  }

  // Handles accessible tab switching and triggers UI metric updates
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

    updateStatisticsDisplay();
  }

  // Bind click, submit, and keyboard handlers
  function setupEventListeners() {
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(tab);
      });
    });

    // Support keyboard navigation across tabs
    const mainNav = document.querySelector('nav');
    if (mainNav) {
      mainNav.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'BUTTON') switchTab(e.target);
      });
    }

    // Event delegation for catalogue interaction
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

  // Process loan submission with user-selected dates
  function handleBorrowSubmit(e) {
    e.preventDefault();
    const memberId = document.getElementById('borrow-member-id')?.value.trim();
    const isbn = document.getElementById('borrow-isbn')?.value.trim();
    const takeDate = takeDateInput?.value;
    const dueDate = dueDateInput?.value;

    if (!memberId || !isbn || !takeDate || !dueDate) return;

    if (new Date(dueDate) <= new Date(takeDate)) {
      alert('Expected return date must be after the take date.');
      return;
    }

    if (borrowBook(memberId, isbn, takeDate, dueDate)) {
      alert('Book borrowed successfully!');
      borrowForm.reset();
      setDefaultBorrowDates();
      updateStatisticsDisplay();
      renderBookCatalogue(loadCatalogue());
      renderMemberList();
    } else {
      alert('Failed to borrow. Double-check member ID, book availability, or borrowing limits.');
    }
  }

  // Process item return and output time duration summary
  function handleReturnSubmit(e) {
    e.preventDefault();
    const memberId = document.getElementById('return-member-id')?.value.trim();
    const isbn = document.getElementById('return-isbn')?.value.trim();
    const messageEl = document.getElementById('return-message');

    if (!memberId || !isbn) return;

    const result = returnBook(memberId, isbn);

    if (messageEl) {
      if (result && result.success) {
        const takeDateFormatted = new Date(result.borrowDate).toLocaleDateString();
        const returnDateFormatted = new Date(result.returnDate).toLocaleDateString();

        messageEl.innerHTML = `
          <div style="margin-top: 15px; padding: 12px; background: rgba(74, 222, 128, 0.1); border: 1px solid #4ade80; border-radius: 8px;">
            <p style="color: #4ade80; font-weight: bold; margin-bottom: 5px;">Book returned successfully!</p>
            <p style="margin: 2px 0;"><strong>Take Date:</strong> ${takeDateFormatted}</p>
            <p style="margin: 2px 0;"><strong>Return Date:</strong> ${returnDateFormatted}</p>
            <p style="margin: 2px 0;"><strong>Total Duration:</strong> ${result.durationDays} day(s)</p>
          </div>
        `;
        returnForm.reset();
        updateStatisticsDisplay();
        renderBookCatalogue(loadCatalogue());
        renderMemberList();
      } else {
        messageEl.innerHTML = `<p style="color: #f87171; margin-top: 10px;">Failed to process return. Check member ID and ISBN.</p>`;
      }
    }
  }

  // Add inventory with explicit copy quantities
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

  // Register new library user profile
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

  // Live client-side search across book attributes
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

  // Filter book display by selected category
  function handleFilterChange() {
    if (!filterDropdown) return;
    const category = filterDropdown.value;
    const catalogue = loadCatalogue();
    renderBookCatalogue(category === 'all' ? catalogue : catalogue.filter(b => b.category === category));
  }

  // Render book grid cards in Catalogue tab
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

  // Render members and calculate live countdown timers based on custom loan dates
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

      const memberLoans = loans.filter(l => l.memberId === id);

      // Construct inline active loan status badges with custom date calculations
      let loansHtml = '';
      if (memberLoans.length > 0) {
        loansHtml = memberLoans.map(loan => {
          const book = books.find(b => b.isbn === loan.isbn);
          const title = book ? book.title : loan.isbn;

          const takeDate = new Date(loan.borrowDate);
          const dueDate = loan.dueDate
            ? new Date(loan.dueDate)
            : new Date(takeDate.getTime() + 14 * 24 * 60 * 60 * 1000);

          const now = new Date();

          // Calculate remaining time against expected due date
          const diffInMs = dueDate.getTime() - now.getTime();
          const daysLeft = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

          const isOverdue = daysLeft < 0;
          const statusColor = isOverdue ? '#f87171' : daysLeft <= 3 ? '#fbbf24' : '#4ade80';
          const statusText = isOverdue
            ? `OVERDUE by ${Math.abs(daysLeft)} day(s)`
            : `${daysLeft} day(s) remaining`;

          return `
            <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; margin-top: 8px; border-left: 4px solid ${statusColor};">
              <p style="margin: 0; font-weight: bold;">📖 ${title}</p>
              <p style="margin: 2px 0; font-size: 0.85rem; color: #a1a1aa;">Taken: ${takeDate.toLocaleDateString()} | Due: ${dueDate.toLocaleDateString()}</p>
              <p style="margin: 2px 0; font-size: 0.9rem; font-weight: 600; color: ${statusColor};">${statusText}</p>
            </div>
          `;
        }).join('');
      } else {
        loansHtml = `<p style="font-size: 0.9rem; color: #a1a1aa; margin-top: 5px;">No active loans.</p>`;
      }

      card.innerHTML = `
        <h3>${name} (${id})</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Borrowed Books (${borrowedBooks ? borrowedBooks.length : 0}):</strong></p>
        <div class="member-loans-list">
          ${loansHtml}
        </div>
      `;

      memberListEl.appendChild(card);
    });
  }

  // Refresh status widgets on Dashboard and build dynamic cards in Statistics Tab
  function updateStatisticsDisplay() {
    const stats = updateStatistics();

    const totalEl = document.querySelector('.total-books');
    const membersEl = document.querySelector('.total-members');
    const borrowedEl = document.querySelector('.borrowed-books');
    const overdueEl = document.querySelector('.overdue-count');

    if (totalEl) totalEl.textContent = `${stats.totalBooks}`;
    if (membersEl) membersEl.textContent = `${stats.totalMembers}`;
    if (borrowedEl) borrowedEl.textContent = `${stats.borrowedBooks}`;
    if (overdueEl) overdueEl.textContent = `${stats.hasOverdueLoans ? 'Yes' : 'None'}`;

    if (detailedStatsGrid) {
      const borrowingRate = LibraryStats.getMemberBorrowingRate(members);
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

  // Throttle search input execution for performance
  function debounce(func, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  }

  // Application boot sequence
  setupEventListeners();
  setDefaultBorrowDates();

  const defaultTab = document.getElementById('dashboard-tab');
  if (defaultTab) switchTab(defaultTab);

  renderBookCatalogue(loadCatalogue());
  renderMemberList();
  updateStatisticsDisplay();
});