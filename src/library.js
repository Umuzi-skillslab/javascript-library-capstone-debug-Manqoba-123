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
        return this.isAvailable();
    }

    isAvailable() {
        return this.availableCopies > 0;
    }

    getInfo() {
        return `${this.title} by ${this.author} (ISBN: ${this.isbn}) - [${this.availableCopies}/${this.totalCopies} available]`;
    }

    checkOut() {
        if (this.isAvailable()) {
            this.availableCopies -= 1;
            return true;
        }
        return false;
    }

    returnCopy() {
        if (this.availableCopies < this.totalCopies) {
            this.availableCopies += 1;
            return true;
        }
        return false;
    }
}

// Subclass for digital inventory with unlimited availability
class DigitalBook extends Book {
    constructor(isbn, title, author, category, downloadUrl = '', fileSizeMB = 0) {
        super(isbn, title, author, category, Infinity, Infinity);
        this.downloadUrl = downloadUrl;
        this.fileSizeMB = fileSizeMB;
    }

    download() {
        if (!this.downloadUrl) {
            return { success: false, message: 'Download URL not available.' };
        }
        return {
            success: true,
            message: `Downloading "${this.title}" (${this.fileSizeMB} MB)...`,
            url: this.downloadUrl
        };
    }

    getInfo() {
        return `${super.getInfo()} [Digital eBook - ${this.fileSizeMB}MB]`;
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

    getMembershipDuration() {
        const start = new Date(this.joinDate).getTime();
        const now = new Date().getTime();
        return Math.floor((now - start) / (1000 * 60 * 60 * 24));
    }

    getMemberInfo() {
        // Object destructuring on instance properties
        const { id, name, email, joinDate, borrowedBooks } = this;
        return {
            id,
            name,
            email,
            joinDate,
            activeLoanCount: borrowedBooks.length,
            membershipDays: this.getMembershipDuration()
        };
    }
}

// Subclass for members with higher borrowing limits and benefits
class PremiumMember extends Member {
    constructor(id, name, email, joinDate, maxLimit = 10, fineDiscountRate = 0.20) {
        super(id, name, email, joinDate);
        this.maxLimit = maxLimit;
        this.fineDiscountRate = fineDiscountRate;
    }

    canBorrow() {
        return this.borrowedBooks.length < this.maxLimit;
    }

    calculateDiscountedFine(rawFine) {
        const discount = rawFine * this.fineDiscountRate;
        return Math.max(0, rawFine - discount);
    }

    getMemberInfo() {
        const baseInfo = super.getMemberInfo();
        // Object spread operator for combining profile attributes
        return {
            ...baseInfo,
            tier: 'Premium',
            maxBorrowLimit: this.maxLimit,
            discountPercentage: `${Math.round(this.fineDiscountRate * 100)}%`
        };
    }
}

// Statistical aggregates for reporting using modern object techniques
const LibraryStats = {
    getTotalBooksCount(bookList = []) {
        return bookList.reduce((acc, { totalCopies = 1 }) => acc + totalCopies, 0);
    },

    getActiveLoansCount(loanList = []) {
        return loanList.length;
    },

    getMemberBorrowingRate(memberList = []) {
        if (!memberList.length) return '0.00';
        const totalBorrowed = memberList.reduce((acc, { borrowedBooks = [] }) => acc + borrowedBooks.length, 0);
        const average = totalBorrowed / memberList.length;
        return Math.round(average * 100) / 100;
    },

    // Method utilizing destructuring inside for-of loop iteration
    calculateCategoryDistribution(bookList = []) {
        const distribution = {};
        for (const { category = 'Uncategorized', totalCopies = 1 } of bookList) {
            distribution[category] = (distribution[category] || 0) + totalCopies;
        }
        return distribution;
    },

    getSystemOverview(bookList = [], memberList = [], loanList = []) {
        const totalPhysicalCopies = this.getTotalBooksCount(bookList);
        const totalMembers = memberList.length;
        const totalLoans = this.getActiveLoansCount(loanList);
        const avgRate = this.getMemberBorrowingRate(memberList);

        return {
            totalPhysicalCopies,
            totalMembers,
            totalLoans,
            avgRate,
            activeRatio: totalPhysicalCopies > 0 ? Math.round((totalLoans / totalPhysicalCopies) * 100) : 0
        };
    }
};

// Spread / Rest helper functions
function combineBookCollections(...collections) {
    return collections.reduce((acc, currentCollection) => [...acc, ...currentCollection], []);
}

function addMultipleBooks(...newBooks) {
    let successCount = 0;
    for (const book of newBooks) {
        if (addNewBook(book)) successCount++;
    }
    return successCount;
}

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
            if (found !== null) return found;
        }
    }
    return null;
}

const createFilter = (predicate) => (items) => items.filter(predicate);
const formatBookLabel = ({ title, author }) => `${title.trim()} by ${author.trim()}`;
const isBookAvailable = (book) => Boolean(book && book.availableCopies > 0);
const computeLateFee = (daysLate, feePerDay = LATE_FEE_PER_DAY) => Math.max(0, daysLate * feePerDay);

function calculateLoanDurationDays(borrowDate, returnDate = new Date()) {
    const start = new Date(borrowDate).getTime();
    const end = new Date(returnDate).getTime();
    const diffInMs = Math.max(0, end - start);
    return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
}

function searchBooksByCategory(categoryName) {
    if (!categoryName || typeof categoryName !== 'string') return [];

    const matchingBooks = [];
    for (const book of books) {
        if (book.category === categoryName) {
            matchingBooks.push(book);
        }
    }
    return matchingBooks;
}

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

// Function parameter destructuring
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
            // Array spread for immutable update
            books = [...books, newBook];
        }

        saveToLocalStorage();
        return true;
    } catch (error) {
        console.error('Failed to add new book:', error);
        return false;
    }
}

// Function parameter destructuring
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

function borrowBook(memberId, isbn, borrowDate = new Date().toISOString(), dueDate = null) {
    if (typeof memberId !== 'string' || typeof isbn !== 'string') return false;

    const member = members.find(m => m.id === memberId);
    const book = books.find(b => b.isbn === isbn);

    if (!member || !book) return false;
    if (!book.isAvailable() || !member.canBorrow()) return false;

    if (book.checkOut()) {
        member.borrowedBooks.push(isbn);

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

    return false;
}

function returnBook(memberId, isbn, returnDate = new Date().toISOString()) {
    if (typeof memberId !== 'string' || typeof isbn !== 'string') return null;

    const member = members.find(m => m.id === memberId);
    const book = books.find(b => b.isbn === isbn);
    const loanIndex = loans.findIndex(l => l.memberId === memberId && l.isbn === isbn);

    if (!member || !book || loanIndex === -1) return null;

    const loan = loans[loanIndex];
    const durationDays = calculateLoanDurationDays(loan.borrowDate, returnDate);

    book.returnCopy();

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
    // Array spread operator for Shallow Copy
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

// Rest parameter used for predicate composition
function searchBooksAdvanced(...criteriaPredicates) {
    return books.filter(book => criteriaPredicates.every(predicate => predicate(book)));
}

function updateStatistics() {
    const totalBooks = LibraryStats.getTotalBooksCount(books);
    const totalMembers = members.length;
    const borrowedBooksCount = books.reduce((acc, { totalCopies, availableCopies }) => acc + (totalCopies - availableCopies), 0);
    const hasOverdueLoans = loans.some(({ dueDate, borrowDate }) => {
        const parsedDueDate = dueDate ? new Date(dueDate) : new Date(new Date(borrowDate).getTime() + 14 * 86400000);
        return new Date() > parsedDueDate;
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
    combineBookCollections,
    addMultipleBooks,
    calculateRecursiveFine,
    findCategoryDeep,
    calculateLoanDurationDays,
    searchBooksByCategory,
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