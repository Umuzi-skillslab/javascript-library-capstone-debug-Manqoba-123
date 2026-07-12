// Core data stores
let books = [];
let members = [];
let loans = [];

const LATE_FEE_PER_DAY = 0.50;
const MAX_BOOKS_PER_MEMBER = 5;

// Base Book Class
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

// DigitalBook Subclass
class DigitalBook extends Book {
    constructor(isbn, title, author, category, downloadUrl, fileSizeMB) {
        super(isbn, title, author, category, Infinity, Infinity);
        this.downloadUrl = downloadUrl || '';
        this.fileSizeMB = fileSizeMB || 0;
    }
}

// Base Member Class
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

// PremiumMember Subclass
class PremiumMember extends Member {
    constructor(id, name, email, joinDate, maxLimit = 10) {
        super(id, name, email, joinDate);
        this.maxLimit = maxLimit;
    }

    canBorrow() {
        return this.borrowedBooks.length < this.maxLimit;
    }
}

const LibraryStats = {
    getTotalBooksCount(bookList = []) {
        return bookList.reduce((acc, book) => acc + (book.totalCopies || 1), 0);
    },
    getActiveLoansCount(loanList = []) {
        return loanList.length;
    },
    getMemberBorrowingRate(memberList = []) {
        if (!memberList.length) return 0;
        const totalBorrowed = memberList.reduce((acc, m) => acc + m.borrowedBooks.length, 0);
        return (totalBorrowed / memberList.length).toFixed(2);
    }
};

function calculateRecursiveFine(daysOverdue, rate = LATE_FEE_PER_DAY) {
    if (typeof daysOverdue !== 'number' || daysOverdue <= 0) return 0;
    return rate + calculateRecursiveFine(daysOverdue - 1, rate);
}

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

// Sync with browser storage so data persists across reloads
function saveToLocalStorage() {
    try {
        localStorage.setItem('libraryBooks', JSON.stringify(books));
        localStorage.setItem('libraryMembers', JSON.stringify(members));
        localStorage.setItem('libraryLoans', JSON.stringify(loans));
    } catch (err) {
        console.error('Error saving to LocalStorage:', err);
    }
}

function loadFromLocalStorage() {
    try {
        const savedBooks = localStorage.getItem('libraryBooks');
        const savedMembers = localStorage.getItem('libraryMembers');
        const savedLoans = localStorage.getItem('libraryLoans');

        // Reconstruct saved objects so instance methods like canBorrow() work properly
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

// Update existing stock if ISBN exists, otherwise register a new title
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

// Register a new library member
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

function borrowBook(memberId, isbn) {
    if (typeof memberId !== 'string' || typeof isbn !== 'string') return false;

    const member = members.find(m => m.id === memberId);
    const book = books.find(b => b.isbn === isbn);

    if (!member || !book) return false;
    if (!isBookAvailable(book) || !member.canBorrow()) return false;

    book.availableCopies -= 1;
    member.borrowedBooks.push(isbn);

    loans.push({
        memberId,
        isbn,
        borrowDate: new Date().toISOString()
    });

    saveToLocalStorage();
    return true;
}

function returnBook(memberId, isbn) {
    if (typeof memberId !== 'string' || typeof isbn !== 'string') return false;

    const member = members.find(m => m.id === memberId);
    const book = books.find(b => b.isbn === isbn);

    if (!member || !book) return false;

    book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);

    member.borrowedBooks = member.borrowedBooks.filter(bIsbn => bIsbn !== isbn);
    loans = loans.filter(l => !(l.memberId === memberId && l.isbn === isbn));

    saveToLocalStorage();
    return true;
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

function updateStatistics() {
    const totalBooks = LibraryStats.getTotalBooksCount(books);
    const totalMembers = members.length;
    const borrowedBooksCount = books.reduce((acc, b) => acc + (b.totalCopies - b.availableCopies), 0);
    const hasOverdueLoans = loans.some(l => (new Date() - new Date(l.borrowDate)) > 14 * 86400000);
    const allMembersActive = members.every(m => m.borrowedBooks.length >= 0);

    return {
        totalBooks,
        totalMembers,
        borrowedBooks: borrowedBooksCount,
        hasOverdueLoans,
        allMembersActive
    };
}

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