/**
 * @file ui.js
 * User interface controller, event handlers, DOM rendering, and interactive features.
 */

import {
  books,
  members,
  loans,
  LibraryStats,
  addNewBook,
  addMultipleBooks,
  combineBookCollections,
  addNewMember,
  borrowBook,
  returnBook,
  loadCatalogue,
  findBookByISBN,
  findMemberById,
  searchBooksByCategory,
  searchBooksAdvanced,
  calculateRecursiveFine,
  findCategoryDeep,
  updateStatistics,
  formatBookLabel
} from './library.js';

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // DOM Target Cache
  // ==========================================
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

  // Typewriter Animation State
  let typewriterTextEl = document.getElementById('typewriter-text');
  let currentBookIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  // ==========================================
  // Date and UI Helpers
  // ==========================================
  function setDefaultBorrowDates() {
    const today = new Date();
    const fourteenDays = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (takeDateInput) takeDateInput.value = today.toISOString().split('T')[0];
    if (dueDateInput) dueDateInput.value = fourteenDays.toISOString().split('T')[0];
  }

  function startBookOfTheDayAnimation() {
    if (!typewriterTextEl) return;

    const availableBooks = books.length > 0
      ? books.map(b => `"${b.title}" — by ${b.author}`)
      : ['"The Great Gatsby" — by F. Scott Fitzgerald', '"1984" — by George Orwell', '"To Kill a Mockingbird" — by Harper Lee'];

    const currentText = availableBooks[currentBookIndex % availableBooks.length];

    if (!isDeleting) {
      typewriterTextEl.textContent = currentText.substring(0, charIndex + 1);
      charIndex++;

      if (charIndex === currentText.length) {
        isDeleting = true;
        setTimeout(startBookOfTheDayAnimation, 2500);
        return;
      }
    } else {
      typewriterTextEl.textContent = currentText.substring(0, charIndex - 1);
      charIndex--;

      if (charIndex === 0) {
        isDeleting = false;
        currentBookIndex = (currentBookIndex + 1) % availableBooks.length;
        setTimeout(startBookOfTheDayAnimation, 500);
        return;
      }
    }

    const speed = isDeleting ? 40 : 90;
    setTimeout(startBookOfTheDayAnimation, speed);
  }

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

  // ==========================================
  // Event Listeners & Delegation
  // ==========================================
  function setupEventListeners() {
    // Tab Navigation Clicks
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(tab);
      });
    });

    // Keyboard Accessibility Delegation
    const mainNav = document.querySelector('nav');
    if (mainNav) {
      mainNav.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'BUTTON') switchTab(e.target);
      });
    }

    // Catalogue Action Delegation & ISBN Lookup
    if (catalogueList) {
      catalogueList.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('.btn-quick-borrow');
        if (actionBtn && actionBtn.dataset.isbn) {
          const matchedBook = findBookByISBN(actionBtn.dataset.isbn);
          if (matchedBook) {
            alert(`Quick reserve requested for: "${matchedBook.title}" (ISBN: ${matchedBook.isbn})`);
          }
        }
      });
    }

    // Live Search & Category Filtering
    if (searchInput) searchInput.addEventListener('input', debounce(handleSearch, 300));
    if (filterDropdown) filterDropdown.addEventListener('change', handleFilterChange);

    // Form Submissions
    if (borrowForm) borrowForm.addEventListener('submit', handleBorrowSubmit);
    if (returnForm) returnForm.addEventListener('submit', handleReturnSubmit);
    if (addBookForm) addBookForm.addEventListener('submit', handleAddBookSubmit);
    if (addMemberForm) addMemberForm.addEventListener('submit', handleAddMemberSubmit);

    // Wire up static HTML Dashboard Advanced Console controls
    setupDashboardAdvancedConsole();
  }

  // ==========================================
  // Dashboard Advanced Management Console Wire-up
  // ==========================================
  function setupDashboardAdvancedConsole() {
    // Feature 1: Multi-Predicate Advanced Search
    const advSearchBtn = document.getElementById('btn-adv-search');
    if (advSearchBtn) {
      advSearchBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevents page reload if wrapped in a form

        const authorVal = document.getElementById('adv-author-input')?.value.trim();
        const catVal = document.getElementById('adv-category-input')?.value;

        const predicates = [];
        if (authorVal) {
          predicates.push(book => book.author.toLowerCase().includes(authorVal.toLowerCase()));
        }
        if (catVal) {
          predicates.push(book => book.category === catVal);
        }

        let results = [];
        if (predicates.length > 0) {
          results = searchBooksAdvanced(...predicates);
        } else if (catVal) {
          results = searchBooksByCategory(catVal);
        } else {
          results = loadCatalogue();
        }

        // Render results to the catalogue
        renderBookCatalogue(results);

        // Switch focus automatically to the Catalogue tab to display results
        const catalogueTab = document.getElementById('catalogue-tab');
        if (catalogueTab) switchTab(catalogueTab);
      });
    }

    // Feature 2: Fine Calculator with South African Rand (R)
    const calcFinesBtn = document.getElementById('btn-calc-fines');
    if (calcFinesBtn) {
      calcFinesBtn.addEventListener('click', () => {
        const memberId = document.getElementById('calc-member-id')?.value.trim();
        const outputEl = document.getElementById('fine-report-output');

        if (!memberId || !outputEl) return;

        const member = findMemberById(memberId);
        if (!member) {
          outputEl.innerHTML = `<p style="color: #f87171; margin-top: 5px;">Member ID "${memberId}" not found.</p>`;
          return;
        }

        const memberLoans = loans.filter(l => l.memberId === memberId);
        let totalFine = 0;
        let reportHtml = `<div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;"><p><strong>Audit for Member:</strong> ${member.name} (${member.id})</p>`;

        memberLoans.forEach(loan => {
          const book = findBookByISBN(loan.isbn);
          const dueDate = loan.dueDate ? new Date(loan.dueDate) : new Date(new Date(loan.borrowDate).getTime() + 14 * 86400000);
          const now = new Date();

          const diffInMs = now.getTime() - dueDate.getTime();
          const daysOverdue = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

          if (daysOverdue > 0) {
            const fine = calculateRecursiveFine(daysOverdue);
            totalFine += fine;
            reportHtml += `<p style="color: #f87171; margin: 3px 0;">⚠️ "${book ? book.title : loan.isbn}" — ${daysOverdue} days overdue. Calculated Fine: R${fine.toFixed(2)}</p>`;
          }
        });

        reportHtml += `<p style="margin-top: 5px; font-weight: bold;">Total Pending Overdue Fines: R${totalFine.toFixed(2)}</p></div>`;
        outputEl.innerHTML = reportHtml;
      });
    }

    // Feature 3: Batch Collection Importer
    const batchDemoBtn = document.getElementById('btn-batch-demo');
    if (batchDemoBtn) {
      batchDemoBtn.addEventListener('click', () => {
        const sampleBatchA = [
          { isbn: '978-0143127741', title: 'How to Read a Book', author: 'Mortimer J. Adler', category: 'Education', totalCopies: 2 },
          { isbn: '978-0131103627', title: 'The C Programming Language', author: 'Brian Kernighan', category: 'Technology', totalCopies: 3 }
        ];

        const sampleBatchB = [
          { isbn: '978-0201633610', title: 'Design Patterns', author: 'Erich Gamma', category: 'Technology', totalCopies: 1 }
        ];

        const combinedPayload = combineBookCollections(sampleBatchA, sampleBatchB);
        const addedCount = addMultipleBooks(...combinedPayload);

        const demoTree = {
          name: 'Root',
          subcategories: [
            { name: 'Technology', subcategories: [{ name: 'Software Engineering' }] }
          ]
        };
        findCategoryDeep(demoTree, 'Software Engineering');

        alert(`Successfully imported ${addedCount} title(s) into the catalogue!`);
        renderBookCatalogue(loadCatalogue());
        updateStatisticsDisplay();
      });
    }
  }

  // ==========================================
  // Form Handlers
  // ==========================================
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
    const filtered = category === 'all' ? loadCatalogue() : searchBooksByCategory(category);
    renderBookCatalogue(filtered);
  }

  // ==========================================
  // Rendering Methods
  // ==========================================
  function renderBookCatalogue(bookList = []) {
    if (!catalogueList) return;
    catalogueList.innerHTML = '';

    if (bookList.length === 0) {
      catalogueList.innerHTML = '<p>No books found matching criteria.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();

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
      fragment.appendChild(card);
    }

    catalogueList.appendChild(fragment);
  }

  function renderMemberList() {
    if (!memberListEl) return;
    memberListEl.innerHTML = '';

    if (members.length === 0) {
      memberListEl.innerHTML = '<p>No registered members.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();

    members.forEach(({ id, name, email, borrowedBooks }) => {
      const card = document.createElement('div');
      card.className = 'member-card';

      const memberLoans = loans.filter(l => l.memberId === id);

      let loansHtml = '';
      if (memberLoans.length > 0) {
        loansHtml = memberLoans.map(loan => {
          const book = findBookByISBN(loan.isbn);
          const title = book ? book.title : loan.isbn;

          const takeDate = new Date(loan.borrowDate);
          const dueDate = loan.dueDate
            ? new Date(loan.dueDate)
            : new Date(takeDate.getTime() + 14 * 24 * 60 * 60 * 1000);

          const now = new Date();
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

      fragment.appendChild(card);
    });

    memberListEl.appendChild(fragment);
  }

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

  function debounce(func, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  }

  // Initializing UI State
  setupEventListeners();
  setDefaultBorrowDates();

  const defaultTab = document.getElementById('dashboard-tab');
  if (defaultTab) switchTab(defaultTab);

  renderBookCatalogue(loadCatalogue());
  renderMemberList();
  updateStatisticsDisplay();
  startBookOfTheDayAnimation();
});