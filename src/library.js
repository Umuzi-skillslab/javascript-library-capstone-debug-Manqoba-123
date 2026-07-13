//Global State & Constants
let books = [];
let members = [];
let loans = [];

const LATE_FEE_PER_DAY = 0.50;
const MAX_BOOKS_PER_MEMBER = 5;

// Map for fast O(1) ISBN lookups
const isbnMap = new Map();

function syncIsbnMap() {
  isbnMap.clear();
  books.forEach(b => isbnMap.set(b.isbn, b));
}
syncIsbnMap();

/** Book Class */
class Book {
  constructor(isbn, title, author, year, copies = 1, category = 'General') {
    this.isbn = isbn;
    this.title = title;
    this.author = author;
    this.year = year;
    this.publicationYear = year;
    this.category = category;
    this.totalCopies = Number(copies) || 1;
    this.availableCopies = Number(copies) || 1;
    this.checkedOut = [];
  }

  isAvailable() {
    return this.availableCopies > 0;
  }

  checkOut(memberId) {
    if (this.isAvailable()) {
      this.availableCopies -= 1;
      if (memberId) this.checkedOut.push(memberId);
      return true;
    }
    return false;
  }

  returnCopy(memberId) {
    if (this.availableCopies < this.totalCopies) {
      this.availableCopies += 1;
      if (memberId) {
        const idx = this.checkedOut.indexOf(memberId);
        if (idx !== -1) this.checkedOut.splice(idx, 1);
      }
      return true;
    }
    return false;
  }

  getSummary() {
    return `"${this.title}" by ${this.author} (${this.publicationYear || this.year})`;
  }

  toString() {
    return `${this.getSummary()} - ISBN: ${this.isbn} [${this.availableCopies}/${this.totalCopies} available]`;
  }
}

/** Digital Book Class (Inherits from Book) */
class DigitalBook extends Book {
  constructor(isbn, title, author, year, fileSize = '0MB', format = 'PDF', category = 'Technology') {
    super(isbn, title, author, year, Infinity, category);
    this.fileSize = fileSize;
    this.format = format;
    this.downloads = 0;
  }

  download(memberId) {
    this.downloads += 1;
    if (memberId) this.checkedOut.push(memberId);
    return true;
  }

  checkOut(memberId) {
    return this.download(memberId);
  }
}

/** Member Class */
class Member {
  constructor(id, name, email, membershipType = 'standard', joinDate = new Date().toISOString().split('T')[0]) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.membershipType = membershipType;
    this.borrowedBooks = [];
    this.joinDate = joinDate;
  }

  canBorrow() {
    return this.borrowedBooks.length < MAX_BOOKS_PER_MEMBER;
  }

  getMembershipDuration() {
    const start = new Date(this.joinDate);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}

/** Premium Member Class (Inherits from Member) */
class PremiumMember extends Member {
  constructor(id, name, email, joinDate) {
    super(id, name, email, 'premium', joinDate);
    this.maxBooksAllowed = 10;
    this.perks = ['No late fee penalties', 'Priority book reservations'];
  }

  canBorrow() {
    return this.borrowedBooks.length < this.maxBooksAllowed;
  }
}

function findOverdueBooks(daysOverdue = 0) {
  if (typeof daysOverdue !== 'number' || daysOverdue < 0) return [];
  const now = new Date();

  return loans.filter(loan => {
    const dueDate = loan.dueDate 
      ? new Date(loan.dueDate) 
      : new Date(new Date(loan.borrowDate).getTime() + 14 * 86400000);
    const diffDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= daysOverdue;
  });
}

function processReturnQueue(queue = []) {
  if (!Array.isArray(queue)) return [];
  const processed = [];
  let index = 0;

  while (index < queue.length) {
    const item = queue[index];
    if (item && item.memberId && item.isbn) {
      returnBook(item.memberId, item.isbn);
      processed.push(item);
    }
    index++; // Safe increment to prevent infinite loops
  }

  return processed;
}

function searchBooksByCategory(categoryOrList, category, index = 0) {
  // Support both recursive signature and direct category string signature
  if (Array.isArray(categoryOrList)) {
    const list = categoryOrList;
    if (!category || index >= list.length) return [];
    
    const matches = list[index] && list[index].category === category ? [list[index]] : [];
    return matches.concat(searchBooksByCategory(list, category, index + 1));
  }

  const categoryStr = typeof categoryOrList === 'string' ? categoryOrList : category;
  if (!categoryStr) return [];
  return books.filter(b => b.category && b.category.toLowerCase() === categoryStr.toLowerCase());
}

function getBooksByAuthor(authorName) {
  if (!authorName || typeof authorName !== 'string') return [];
  return books.filter(b => b.author && b.author.toLowerCase() === authorName.trim().toLowerCase());
}

function calculateTotalLateFees(memberRecord) {
  if (!memberRecord || !Array.isArray(memberRecord.overdueBooks)) return 0;

  return memberRecord.overdueBooks.reduce((totalFee, book) => {
    const daysLate = typeof book.daysLate === 'number' ? book.daysLate : 0;
    return totalFee + (daysLate * LATE_FEE_PER_DAY);
  }, 0);
}

function combineBookCollections(...collections) {
  const combined = [];
  for (const collection of collections) {
    if (Array.isArray(collection)) {
      combined.push(...collection);
    }
  }
  return combined;
}

function addMultipleBooks(...newBooks) {
  let count = 0;
  for (const book of newBooks) {
    if (book) {
      if (addNewBook(book)) count++;
    }
  }
  return count;
}

function updateMemberInfo(member, updates = {}) {
  if (!member || typeof member !== 'object') return null;
  const { name, email, membershipType } = updates;

  if (name) member.name = name;
  if (email) member.email = email;
  if (membershipType) member.membershipType = membershipType;

  return member;
}

function borrowBook(memberId, isbn, takeDate, dueDate) {
  try {
    if (!memberId || !isbn) return false;

    const member = findMemberById(memberId);
    const book = findBookByISBN(isbn);

    if (!member || !book) return false;

    // Check member limits
    const maxAllowed = member.membershipType === 'premium' ? 10 : MAX_BOOKS_PER_MEMBER;
    if (member.borrowedBooks.length >= maxAllowed) return false;

    // Check availability
    if (book.availableCopies <= 0) return false;

    // Execute borrow
    book.availableCopies -= 1;
    if (!book.checkedOut) book.checkedOut = [];
    book.checkedOut.push(memberId);

    member.borrowedBooks.push(isbn);

    const bDate = takeDate || new Date().toISOString().split('T')[0];
    const dDate = dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    loans.push({
      memberId,
      isbn,
      borrowDate: bDate,
      dueDate: dDate
    });

    return true;
  } catch (err) {
    console.error('Error borrowing book:', err);
    return false;
  }
}

function returnBook(memberId, isbn) {
  try {
    if (!memberId || !isbn) return { success: false };

    const member = findMemberById(memberId);
    const book = findBookByISBN(isbn);

    const loanIndex = loans.findIndex(l => l.memberId === memberId && l.isbn === isbn);
    if (loanIndex === -1) return { success: false };

    const [removedLoan] = loans.splice(loanIndex, 1);

    if (member) {
      const idx = member.borrowedBooks.indexOf(isbn);
      if (idx !== -1) member.borrowedBooks.splice(idx, 1);
    }

    if (book) {
      book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
      if (book.checkedOut) {
        const idx = book.checkedOut.indexOf(memberId);
        if (idx !== -1) book.checkedOut.splice(idx, 1);
      }
    }

    const borrowDate = new Date(removedLoan.borrowDate);
    const returnDate = new Date();
    const durationDays = calculateLoanDurationDays(borrowDate, returnDate);

    return {
      success: true,
      memberId,
      isbn,
      borrowDate: removedLoan.borrowDate,
      returnDate: returnDate.toISOString().split('T')[0],
      durationDays
    };
  } catch (err) {
    console.error('Error returning book:', err);
    return { success: false };
  }
}

function findMemberById(id) {
  if (!id) return undefined;
  return members.find(m => m.id === id);
}

function findBookByISBN(isbn) {
  if (!isbn) return null;
  if (isbnMap.has(isbn)) return isbnMap.get(isbn);
  return books.find(b => b.isbn === isbn) || null;
}

function formatBookInfo(book) {
  if (!book) return '';
  const title = book.title ? String(book.title).trim().toUpperCase() : 'UNKNOWN TITLE';
  const author = book.author ? String(book.author).trim() : 'Unknown Author';
  const year = book.publicationYear || book.year || 'N/A';

  return `TITLE: ${title}\nAUTHOR: ${author}\nYEAR: ${year}`;
}

function calculateFineAmount(daysLate) {
  const days = Number(daysLate);
  if (isNaN(days) || days <= 0) return (0).toFixed(2);
  return (days * LATE_FEE_PER_DAY).toFixed(2);
}

// Advanced Features & Helper Methods

function calculateRecursiveFine(daysOverdue, rate = LATE_FEE_PER_DAY) {
  if (daysOverdue <= 0) return 0;
  return rate + calculateRecursiveFine(daysOverdue - 1, rate);
}

function findCategoryDeep(node, targetName) {
  if (!node) return null;
  if (node.name === targetName) return node;

  if (Array.isArray(node.subcategories)) {
    for (const child of node.subcategories) {
      const found = findCategoryDeep(child, targetName);
      if (found) return found;
    }
  }
  return null;
}

function searchBooksAdvanced(...predicates) {
  return books.filter(book => predicates.every(p => p(book)));
}

function calculateLoanDurationDays(startDate, endDate = new Date()) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffInMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffInMs / (1000 * 60 * 60 * 24)));
}

function addNewBook({ isbn, title, author, year, category = 'General', totalCopies = 1 }) {
  if (!isbn || !title || !author) return false;

  const existing = findBookByISBN(isbn);
  const parsedCopies = parseInt(totalCopies, 10) || 1;

  if (existing) {
    existing.totalCopies += parsedCopies;
    existing.availableCopies += parsedCopies;
  } else {
    const newBook = new Book(isbn, title, author, year || new Date().getFullYear(), parsedCopies, category);
    books.push(newBook);
  }
  syncIsbnMap();
  return true;
}

function addNewMember({ id, name, email, membershipType = 'standard' }) {
  if (!id || !name) return false;
  if (findMemberById(id)) return false;

  const member = membershipType === 'premium' 
    ? new PremiumMember(id, name, email) 
    : new Member(id, name, email, membershipType);

  members.push(member);
  return true;
}

function loadCatalogue() {
  return books;
}

function formatBookLabel(book) {
  const { title = 'Untitled', author = 'Unknown' } = book || {};
  return `${title} — by ${author}`;
}

function updateStatistics() {
  LibraryStats.updateStats();
  return {
    totalBooks: LibraryStats.totalBooks,
    totalMembers: LibraryStats.totalMembers,
    borrowedBooks: LibraryStats.totalBorrowings,
    hasOverdueLoans: findOverdueBooks(1).length > 0
  };
}

// Library Statistics Object
const LibraryStats = {
  totalBooks: 0,
  totalMembers: 0,
  totalBorrowings: 0,

  updateStats() {
    this.totalBooks = books.reduce((sum, b) => sum + (b.totalCopies || 1), 0);
    this.totalMembers = members.length;
    this.totalBorrowings = loans.length;
  },

  getMostPopularBook() {
    if (books.length === 0) return null;
    return books.reduce((mostPopular, current) => {
      const currentCheckouts = current.checkedOut ? current.checkedOut.length : 0;
      const maxCheckouts = mostPopular && mostPopular.checkedOut ? mostPopular.checkedOut.length : 0;
      return currentCheckouts > maxCheckouts ? current : mostPopular;
    }, books[0]);
  },

  getMemberBorrowingRate(memberList = members) {
    if (!memberList || memberList.length === 0) return '0.00';
    const totalBorrowed = memberList.reduce((acc, m) => acc + (m.borrowedBooks ? m.borrowedBooks.length : 0), 0);
    return (totalBorrowed / memberList.length).toFixed(2);
  },

  getActiveLoansCount(loanList = loans) {
    return loanList.length;
  }
};

export {
  books,
  members,
  loans,
  LATE_FEE_PER_DAY,
  MAX_BOOKS_PER_MEMBER,
  Book,
  DigitalBook,
  Member,
  PremiumMember,
  LibraryStats,
  findOverdueBooks,
  processReturnQueue,
  searchBooksByCategory,
  getBooksByAuthor,
  calculateTotalLateFees,
  combineBookCollections,
  addMultipleBooks,
  updateMemberInfo,
  borrowBook,
  returnBook,
  findMemberById,
  findBookByISBN,
  formatBookInfo,
  calculateFineAmount,
  calculateRecursiveFine,
  findCategoryDeep,
  calculateLoanDurationDays,
  addNewBook,
  addNewMember,
  loadCatalogue,
  searchBooksAdvanced,
  updateStatistics,
  formatBookLabel
};