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

function renderBookCatalogue(bookList = []) {
  const catalogueContainer = document.querySelector('#catalogue-list');

  if (!catalogueContainer) return;
  catalogueContainer.innerHTML = '';

  if (!Array.isArray(bookList) || bookList.length === 0) {
    catalogueContainer.innerHTML = '<p>No books found matching criteria.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  bookList.forEach(book => {
    const { title, author, isbn, availableCopies, totalCopies } = book;
    const card = document.createElement('div');
    card.className = 'book-card';
    card.setAttribute('data-isbn', isbn);
    card.innerHTML = `
        <h3>${formatBookLabel({ title, author })}</h3>
        <p><strong>ISBN:</strong> ${isbn}</p>
        <p><strong>Copies:</strong> ${availableCopies !== undefined ? availableCopies : 1} / ${totalCopies !== undefined ? totalCopies : 1}</p>
        <p><strong>Status:</strong> ${(availableCopies === undefined || availableCopies > 0) ? 'Available' : 'Out of Stock'}</p>
        <button type="button" class="btn-quick-borrow" data-isbn="${isbn}">Quick Reserve / Details</button>
      `;
    fragment.appendChild(card);
  });

  catalogueContainer.appendChild(fragment);
}

function handleSearch(event) {
  const searchTerm = event && event.target ? event.target.value.toLowerCase().trim() : '';
  if (!searchTerm) {
    renderBookCatalogue(loadCatalogue());
    return;
  }

  const filtered = loadCatalogue().filter(({ title, author, isbn }) =>
    (title && title.toLowerCase().includes(searchTerm)) ||
    (author && author.toLowerCase().includes(searchTerm)) ||
    (isbn && isbn.toLowerCase().includes(searchTerm))
  );
  renderBookCatalogue(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
  // DOM Target Cache
  const catalogueContainer = document.querySelector('#catalogue-list');
  const searchInput = document.getElementById('search');
  const filterDropdown = document.querySelector('#filter-category');

  const tabs = document.querySelectorAll('nav button');
  const sections = document.querySelectorAll('main section');

  const borrowForm = document.getElementById('borrow-form');
  const takeDateInput = document.getElementById('borrow-take-date');
  const dueDateInput = document.getElementById('borrow-due-date');

  const returnForm = document.getElementById('return-form');
  const addBookForm = document.getElementById('add-book-form');
  const addMemberForm = document.getElementById('add-member-form');
  const memberListEl = document.getElementById('member-list');
  const detailedStatsGrid = document.getElementById('detailed-stats-grid');
  const detailsContainer = document.getElementById('book-details');

  // Typewriter Animation State
  let typewriterTextEl = document.getElementById('typewriter-text');
  let currentBookIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  // Initialization & Event Setup
  function initializeUI() {
    loadFromLocalStorage();
    setupEventListeners();
    setDefaultBorrowDates();
    renderBookCatalogue(loadCatalogue());
    renderMemberList();
    updateStatisticsDisplay();
    startBookOfTheDayAnimation();

    const defaultTab = document.getElementById('dashboard-tab');
    if (defaultTab) switchTab(defaultTab);
  }

  function setupEventListeners() {
    // Tab Navigation
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

    // Live Search & Category Filtering
    if (searchInput) searchInput.addEventListener('input', debounce(handleSearch, 300));
    if (filterDropdown) filterDropdown.addEventListener('change', handleFilterChange);

    if (catalogueContainer) {
      catalogueContainer.addEventListener('click', handleBookClick);
    }

    // Forms Submissions
    if (borrowForm) borrowForm.addEventListener('submit', handleBorrowSubmit);
    if (returnForm) returnForm.addEventListener('submit', handleReturnSubmit);
    if (addBookForm) addBookForm.addEventListener('submit', handleAddBookSubmit);
    if (addMemberForm) addMemberForm.addEventListener('submit', handleAddMemberSubmit);

    // Console Wireup
    setupDashboardAdvancedConsole();
  }

  // Rendering & DOM Methods


  function displayBookDetails(isbn) {
    const book = findBookByISBN(isbn);
    if (!book) return;

    if (detailsContainer) {
      detailsContainer.innerHTML = `
        <div class="book-details-card">
          <h2>${book.title}</h2>
          <p><strong>Author:</strong> ${book.author}</p>
          <p><strong>ISBN:</strong> ${book.isbn}</p>
          <p><strong>Category:</strong> ${book.category || 'General'}</p>
          <p><strong>Year:</strong> ${book.publicationYear || book.year || 'N/A'}</p>
          <p><strong>Available Copies:</strong> ${book.availableCopies} / ${book.totalCopies}</p>
        </div>
      `;
    } else {
      alert(`Title: ${book.title}\nAuthor: ${book.author}\nISBN: ${book.isbn}\nAvailable Copies: ${book.availableCopies}/${book.totalCopies}`);
    }
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
          const statusClass = isOverdue ? 'overdue-loan' : daysLeft <= 3 ? 'warning-loan' : 'good-loan';
          const statusText = isOverdue
            ? `OVERDUE by ${Math.abs(daysLeft)} day(s)`
            : `${daysLeft} day(s) remaining`;

          return `
            <div class="member-loan-item ${statusClass}">
              <p class="member-loan-title">📖 ${title}</p>
              <p class="member-loan-dates">Taken: ${takeDate.toLocaleDateString()} | Due: ${dueDate.toLocaleDateString()}</p>
              <p class="member-loan-status">${statusText}</p>
            </div>
          `;
        }).join('');
      } else {
        loansHtml = `<p class="no-loans-text">No active loans.</p>`;
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

  // Event Handlers
  function handleBookClick(event) {
    const actionBtn = event.target.closest('.btn-quick-borrow');
    const card = event.target.closest('.book-card');

    const isbn = actionBtn ? actionBtn.dataset.isbn : card ? card.dataset.isbn : null;

    if (isbn) {
      displayBookDetails(isbn);
    }
  }


  function handleFilterChange() {
    if (!filterDropdown) return;
    const selectedCategory = filterDropdown.value;

    if (selectedCategory === 'all' || selectedCategory === '') {
      renderBookCatalogue(loadCatalogue());
    } else {
      const filtered = searchBooksByCategory(selectedCategory);
      renderBookCatalogue(filtered);
    }
  }

  function handleBorrowSubmit(event) {
    event.preventDefault();

    const memberIdInput = document.getElementById('borrow-member-id') || document.getElementById('member-id');
    const isbnInput = document.getElementById('borrow-isbn') || document.getElementById('isbn');

    const memberId = memberIdInput ? memberIdInput.value.trim() : '';
    const isbn = isbnInput ? isbnInput.value.trim() : '';
    const takeDate = takeDateInput ? takeDateInput.value : undefined;
    const dueDate = dueDateInput ? dueDateInput.value : undefined;

    if (!memberId || !isbn) {
      alert('Please fill in both Member ID and ISBN.');
      return;
    }

    if (takeDate && dueDate && new Date(dueDate) <= new Date(takeDate)) {
      alert('Expected return date must be after the take date.');
      return;
    }

    const success = borrowBook(memberId, isbn, takeDate, dueDate);

    if (success) {
      alert('Book borrowed successfully!');
      if (borrowForm) borrowForm.reset();
      setDefaultBorrowDates();
      updateStatisticsDisplay();
      renderBookCatalogue(loadCatalogue());
      renderMemberList();
      saveToLocalStorage();
    } else {
      alert('Failed to borrow book. Please check Member ID, stock availability, or borrowing limits.');
    }
  }

  function handleReturnSubmit(e) {
    e.preventDefault();
    const memberId = document.getElementById('return-member-id')?.value.trim();
    const isbn = document.getElementById('return-isbn')?.value.trim();
    const messageEl = document.getElementById('return-message');

    if (!memberId || !isbn) {
      alert('Please provide both Member ID and ISBN to process return.');
      return;
    }

    const result = returnBook(memberId, isbn);

    if (messageEl) {
      if (result && result.success) {
        const takeDateFormatted = new Date(result.borrowDate).toLocaleDateString();
        const returnDateFormatted = new Date(result.returnDate).toLocaleDateString();

        messageEl.innerHTML = `
          <div class="return-success-box">
            <p class="return-success-title">Book returned successfully!</p>
            <p class="return-detail-p"><strong>Take Date:</strong> ${takeDateFormatted}</p>
            <p class="return-detail-p"><strong>Return Date:</strong> ${returnDateFormatted}</p>
            <p class="return-detail-p"><strong>Total Duration:</strong> ${result.durationDays} day(s)</p>
          </div>
        `;
        if (returnForm) returnForm.reset();
        updateStatisticsDisplay();
        renderBookCatalogue(loadCatalogue());
        renderMemberList();
        saveToLocalStorage();
      } else {
        messageEl.innerHTML = `<p class="error-text">Failed to process return. Check member ID and ISBN.</p>`;
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
        if (addBookForm) addBookForm.reset();
        if (copiesInput) copiesInput.value = 1;

        renderBookCatalogue(loadCatalogue());
        updateStatisticsDisplay();
        saveToLocalStorage();
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
        if (addMemberForm) addMemberForm.reset();
        renderMemberList();
        updateStatisticsDisplay();
        saveToLocalStorage();
      } else {
        alert('Could not register member. That ID might already exist.');
      }
    }
  }

  // Data Persistence (JSON & LocalStorage)
  function exportLibraryData() {
    try {
      const data = {
        books,
        members,
        loans,
        exportedAt: new Date().toISOString()
      };
      return JSON.stringify(data, null, 2);
    } catch (err) {
      console.error('Failed to export library data:', err);
      return null;
    }
  }

  function importLibraryData(jsonString) {
    try {
      if (!jsonString) return false;
      const data = JSON.parse(jsonString);

      if (Array.isArray(data.books)) {
        books.length = 0;
        books.push(...data.books);
      }
      if (Array.isArray(data.members)) {
        members.length = 0;
        members.push(...data.members);
      }
      if (Array.isArray(data.loans)) {
        loans.length = 0;
        loans.push(...data.loans);
      }

      renderBookCatalogue(loadCatalogue());
      renderMemberList();
      updateStatisticsDisplay();
      return true;
    } catch (err) {
      console.error('Invalid JSON string passed to importLibraryData:', err);
      return false;
    }
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem('libraryBooks', JSON.stringify(books));
      localStorage.setItem('libraryMembers', JSON.stringify(members));
      localStorage.setItem('libraryLoans', JSON.stringify(loans));
    } catch (err) {
      console.error('Failed to save state to LocalStorage:', err);
    }
  }

  function loadFromLocalStorage() {
    try {
      const booksData = localStorage.getItem('libraryBooks');
      const membersData = localStorage.getItem('libraryMembers');
      const loansData = localStorage.getItem('libraryLoans');

      if (booksData) {
        const parsed = JSON.parse(booksData);
        books.length = 0;
        books.push(...parsed);
      }
      if (membersData) {
        const parsed = JSON.parse(membersData);
        members.length = 0;
        members.push(...parsed);
      }
      if (loansData) {
        const parsed = JSON.parse(loansData);
        loans.length = 0;
        loans.push(...parsed);
      }

      renderBookCatalogue(loadCatalogue());
      renderMemberList();
      updateStatisticsDisplay();
    } catch (err) {
      console.error('Failed to load state from LocalStorage:', err);
    }
  }

  // Utility & Helper Functions
  function setDefaultBorrowDates() {
    const today = new Date();
    const fourteenDays = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (takeDateInput) takeDateInput.value = today.toISOString().split('T')[0];
    if (dueDateInput) dueDateInput.value = fourteenDays.toISOString().split('T')[0];
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

  function createMemberForm() {
    const formContainer = document.getElementById('member-form-container');
    if (!formContainer) return;

    formContainer.innerHTML = `
      <form id="add-member-form">
        <label for="member-id">Member ID:</label>
        <input type="text" id="member-id" placeholder="e.g. M003" required />

        <label for="member-name">Full Name:</label>
        <input type="text" id="member-name" placeholder="e.g. Jane Doe" required />

        <label for="member-email">Email:</label>
        <input type="email" id="member-email" placeholder="jane@example.com" required />

        <button type="submit">Register Member</button>
      </form>
    `;
  }

  function setupDashboardAdvancedConsole() {
    const advSearchBtn = document.getElementById('btn-adv-search');
    if (advSearchBtn) {
      advSearchBtn.addEventListener('click', (e) => {
        e.preventDefault();
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

        renderBookCatalogue(results);
        const catalogueTab = document.getElementById('catalogue-tab');
        if (catalogueTab) switchTab(catalogueTab);
      });
    }

    const calcFinesBtn = document.getElementById('btn-calc-fines');
    if (calcFinesBtn) {
      calcFinesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const memberId = document.getElementById('calc-member-id')?.value.trim();
        const outputEl = document.getElementById('fine-report-output');

        if (!memberId || !outputEl) return;

        const member = findMemberById(memberId);
        if (!member) {
          outputEl.innerHTML = `<p class="error-text">Member ID "${memberId}" not found.</p>`;
          return;
        }

        const memberLoans = loans.filter(l => l.memberId === memberId);
        let totalFine = 0;
        let reportHtml = `<div class="fine-report-card"><p><strong>Audit for Member:</strong> ${member.name} (${member.id})</p>`;

        memberLoans.forEach(loan => {
          const book = findBookByISBN(loan.isbn);
          const dueDate = loan.dueDate ? new Date(loan.dueDate) : new Date(new Date(loan.borrowDate).getTime() + 14 * 86400000);
          const now = new Date();

          const diffInMs = now.getTime() - dueDate.getTime();
          const daysOverdue = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

          if (daysOverdue > 0) {
            const fine = calculateRecursiveFine(daysOverdue);
            totalFine += fine;
            reportHtml += `<p class="fine-report-item">⚠️ "${book ? book.title : loan.isbn}" — ${daysOverdue} days overdue. Fine: R${fine.toFixed(2)}</p>`;
          }
        });

        reportHtml += `<p class="fine-report-total">Total Pending Overdue Fines: R${totalFine.toFixed(2)}</p></div>`;
        outputEl.innerHTML = reportHtml;
      });
    }

    const batchDemoBtn = document.getElementById('btn-batch-demo');
    if (batchDemoBtn) {
      batchDemoBtn.addEventListener('click', (e) => {
        e.preventDefault();
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

        alert(`Successfully imported ${addedCount} title(s) into catalogue!`);
        renderBookCatalogue(loadCatalogue());
        updateStatisticsDisplay();
        saveToLocalStorage();
      });
    }
  }

  function startBookOfTheDayAnimation() {
    if (!typewriterTextEl) return;

    const availableBooks = books.length > 0
      ? books.map(b => `"${b.title}" — by ${b.author}`)
      : ['"The Great Gatsby" — by F. Scott Fitzgerald', '"1984" — by George Orwell'];

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

  function debounce(func, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  }

  // Launch Application
  initializeUI();
});

export {
  renderBookCatalogue,
  handleSearch
};