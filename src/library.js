// Local state stores for the application
let books = [];
let members = [];
let loans = [];

const LATE_FEE_PER_DAY = 0.50;
const MAX_BOOKS_PER_MEMBER = 5;

// Base Book Class representing library inventory
class Book {
    constructor(isbn, title, author, category, availableCopies = 1, totalCopies = 1) {
        if (!isbn || typeof isbn !== 'string') throw new TypeError('Valid ISBN string is required.');
        this.isbn = isbn;
        this.title = title || 'Untitled';
        this.author = author || 'Unknown Author';
        this.category = category || 'General';
        this.totalCopies = Math.max(1, totalCopies);
        this.availableCopies = Math.min(availableCopies, this.totalCopies);
    }

    get available() {
        return this.availableCopies > 0;
    }
}

// Subclass for digital inventory with unlimited availability
class DigitalBook extends Book {
    constructor(isbn, title, author, category, downloadUrl, fileSizeMB) {
        super(isbn, title, author, category, Infinity, Infinity);
        this.downloadUrl = downloadUrl || '';
        this.fileSizeMB = fileSizeMB || 0;
    }
}

// Member profile tracking borrowed items and borrowing eligibility
class Member {
    constructor(id, name, email, joinDate = new Date().toISOString()) {
        if (!id || typeof id !== 'string') throw new TypeError('Valid Member ID required.');
        this.id = id;
        this.name = name || 'Anonymous';
        this.email = email || '';
        this.joinDate = joinDate;
        this.borrowedBooks = [];
    }

    canBorrow() {
        return this.borrowedBooks.length < MAX_BOOKS_PER_MEMBER;
    }

    getMembershipDurationDays() {
        const start = new Date(this.joinDate).getTime();
        const now = new Date().getTime();
        return Math.floor((now - start) / (1000 * 60 * 60 * 24));
    }
}

// Subclass for members with higher borrowing limits
class PremiumMember extends Member {
    constructor(id, name, email, joinDate, maxLimit = 10) {
        super(id, name, email, joinDate);
        this.maxLimit = maxLimit;
    }

    canBorrow() {
        return this.borrowedBooks.length < this.maxLimit;
    }
}

// Statistical aggregates for reporting
const LibraryStats = {
    getTotalBooksCount(bookList = []) {
        return bookList.reduce((acc, book) => acc + (book.totalCopies || 1), 0);
    },
    getActiveLoansCount(loanList = []) {
        return loanList.length;
    },
    getMemberBorrowingRate(memberList = []) {
        if (!memberList.length) return '0.00';
        const totalBorrowed = memberList.reduce((acc, m) => acc + (m.borrowedBooks ? m.borrowedBooks.length : 0), 0);
        return (totalBorrowed / memberList.length).toFixed(2);
    }
};

// Recursive fee calculation for overdue returns
function calculateRecursiveFine(daysOverdue, rate = LATE_FEE_PER_DAY) {
    if (typeof daysOverdue !== 'number' || daysOverdue <= 0) return 0;
    return rate + calculateRecursiveFine(daysOverdue - 1, rate);
}

// Deep search across nested category trees
function findCategoryDeep(categoryTree, targetCategory) {
    if (!categoryTree || typeof categoryTree !== 'object') return null;
    if (categoryTree.name === targetCategory) return categoryTree;

    if (Array.isArray(categoryTree.subcategories)) {
        for (const sub of categoryTree.subcategories) {
            const found = findCategoryDeep(sub, targetCategory);
            if (found) return found;
        }
    }
    return null;
}

const createFilter = (predicate) => (items) => items.filter(predicate);
const formatBookLabel = ({ title, author }) => `${title.trim()} by ${author.trim()}`;
const isBookAvailable = (book) => Boolean(book && book.availableCopies > 0);
const computeLateFee = (daysLate, feePerDay = LATE_FEE_PER_DAY) => Math.max(0, daysLate * feePerDay);

// Converts millisecond differences into standard day counts
function calculateLoanDurationDays(borrowDate, returnDate = new Date()) {
    const start = new Date(borrowDate).getTime();
    const end = new Date(returnDate).getTime();
    const diffInMs = Math.max(0, end - start);
    return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
}

// Persist operational state to browser LocalStorage
function saveToLocalStorage() {
    try {
        localStorage.setItem('libraryBooks', JSON.stringify(books));
        localStorage.setItem('libraryMembers', JSON.stringify(members));
        localStorage.setItem('libraryLoans', JSON.stringify(loans));
    } catch (err) {
        console.error('Error saving to LocalStorage:', err);
    }
}

// Re-hydrate stored JSON objects back into active Class instances
function loadFromLocalStorage() {
    try {
        const savedBooks = localStorage.getItem('libraryBooks');
        const savedMembers = localStorage.getItem('libraryMembers');
        const savedLoans = localStorage.getItem('libraryLoans');

        if (savedBooks !== null) {
            const rawBooks = JSON.parse(savedBooks);
            books = rawBooks.map(b => new Book(b.isbn, b.title, b.author, b.category, b.availableCopies, b.totalCopies));
        }
        if (savedMembers !== null) {
            const rawMembers = JSON.parse(savedMembers);
            members = rawMembers.map(m => {
                const member = new Member(m.id, m.name, m.email, m.joinDate);
                member.borrowedBooks = m.borrowedBooks || [];
                return member;
            });
        }
        if (savedLoans !== null) loans = JSON.parse(savedLoans);
    } catch (err) {
        console.error('Error loading from LocalStorage:', err);
    }
}

// Increases copy count if ISBN exists, otherwise creates a new entry
function addNewBook(bookData = {}) {
    try {
        const { isbn, title, author, category, totalCopies = 1 } = bookData;

        if (!isbn || typeof isbn !== 'string') return false;

        const existingIndex = books.findIndex(b => b.isbn === isbn);
        if (existingIndex !== -1) {
            books[existingIndex].totalCopies += totalCopies;
            books[existingIndex].availableCopies += totalCopies;
        } else {
            const newBook = new Book(isbn, title, author, category, totalCopies, totalCopies);
            books = [...books, newBook];
        }

        saveToLocalStorage();
        return true;
    } catch (error) {
        console.error('Failed to add new book:', error);
        return false;
    }
}

// Registers a new user if the member ID is unique
function addNewMember(memberData = {}) {
    try {
        const { id, name, email } = memberData;
        if (!id || typeof id !== 'string') return false;

        if (members.some(m => m.id === id)) return false;

        const newMember = new Member(id, name, email);
        members.push(newMember);

        saveToLocalStorage();
        return true;
    } catch (error) {
        console.error('Failed to add new member:', error);
        return false;
    }
}

// Accepts user-specified take date and expected due date for loan record creation
function borrowBook(memberId, isbn, borrowDate = new Date().toISOString(), dueDate = null) {
    if (typeof memberId !== 'string' || typeof isbn !== 'string') return false;

    const member = members.find(m => m.id === memberId);
    const book = books.find(b => b.isbn === isbn);

    if (!member || !book) return false;
    if (!isBookAvailable(book) || !member.canBorrow()) return false;

    book.availableCopies -= 1;
    member.borrowedBooks.push(isbn);

    // Default due date to 14 days after borrow date if not provided
    const parsedBorrowDate = new Date(borrowDate);
    const parsedDueDate = dueDate
        ? new Date(dueDate).toISOString()
        : new Date(parsedBorrowDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    loans.push({
        memberId,
        isbn,
        borrowDate: parsedBorrowDate.toISOString(),
        dueDate: parsedDueDate
    });

    saveToLocalStorage();
    return true;
}

// Restores book copy, removes active loan record, and returns loan summary metrics
function returnBook(memberId, isbn, returnDate = new Date().toISOString()) {
    if (typeof memberId !== 'string' || typeof isbn !== 'string') return null;

    const member = members.find(m => m.id === memberId);
    const book = books.find(b => b.isbn === isbn);
    const loanIndex = loans.findIndex(l => l.memberId === memberId && l.isbn === isbn);

    if (!member || !book || loanIndex === -1) return null;

    const loan = loans[loanIndex];
    const durationDays = calculateLoanDurationDays(loan.borrowDate, returnDate);

    book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);

    member.borrowedBooks = member.borrowedBooks.filter(bIsbn => bIsbn !== isbn);
    loans.splice(loanIndex, 1);

    saveToLocalStorage();

    return {
        success: true,
        borrowDate: loan.borrowDate,
        returnDate,
        durationDays
    };
}

function loadCatalogue() {
    return [...books];
}

function findBookByISBN(isbn) {
    if (typeof isbn !== 'string') return undefined;
    return books.find(b => b.isbn === isbn);
}

function findMemberById(id) {
    if (typeof id !== 'string') return undefined;
    return members.find(m => m.id === id);
}

function searchBooksAdvanced(...criteriaPredicates) {
    return books.filter(book => criteriaPredicates.every(predicate => predicate(book)));
}

// Evaluates overall collection metrics and checks for overdue items against loan due dates
function updateStatistics() {
    const totalBooks = LibraryStats.getTotalBooksCount(books);
    const totalMembers = members.length;
    const borrowedBooksCount = books.reduce((acc, b) => acc + (b.totalCopies - b.availableCopies), 0);
    const hasOverdueLoans = loans.some(l => {
        const dueDate = l.dueDate ? new Date(l.dueDate) : new Date(new Date(l.borrowDate).getTime() + 14 * 86400000);
        return new Date() > dueDate;
    });

    return {
        totalBooks,
        totalMembers,
        borrowedBooks: borrowedBooksCount,
        hasOverdueLoans
    };
}

// Initial state recovery on script load
loadFromLocalStorage();

export {
    books,
    members,
    loans,
    Book,
    DigitalBook,
    Member,
    PremiumMember,
    LibraryStats,
    calculateRecursiveFine,
    findCategoryDeep,
    calculateLoanDurationDays,
    addNewBook,
    addNewMember,
    borrowBook,
    returnBook,
    loadCatalogue,
    findBookByISBN,
    findMemberById,
    searchBooksAdvanced,
    updateStatistics,
    formatBookLabel
};