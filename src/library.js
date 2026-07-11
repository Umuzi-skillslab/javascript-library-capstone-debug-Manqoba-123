// library.js - Core Data Logic with localStorage

let books = [];
let members = [];
let loans = []; // Track who borrowed what

const LATE_FEE_PER_DAY = 0.50;
const MAX_BOOKS_PER_MEMBER = 5;

// Book Class
class Book {
    constructor(isbn, title, author, category, available = true) {
        this.isbn = isbn;
        this.title = title;
        this.author = author;
        this.category = category;
        this.available = available;
    }
}

// Member Class
class Member {
    constructor(id, name, email) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.borrowedBooks = []; // array of ISBNs
    }

    canBorrow() {
        return this.borrowedBooks.length < MAX_BOOKS_PER_MEMBER;
    }
}

// ====================== LOCALSTORAGE ======================
function saveToLocalStorage() {
    localStorage.setItem('libraryBooks', JSON.stringify(books));
    localStorage.setItem('libraryMembers', JSON.stringify(members));
    localStorage.setItem('libraryLoans', JSON.stringify(loans));
}

function loadFromLocalStorage() {
    const savedBooks = localStorage.getItem('libraryBooks');
    const savedMembers = localStorage.getItem('libraryMembers');
    const savedLoans = localStorage.getItem('libraryLoans');

    if (savedBooks) books = JSON.parse(savedBooks);
    if (savedMembers) members = JSON.parse(savedMembers);
    if (savedLoans) loans = JSON.parse(savedLoans);
}

// ====================== CORE FUNCTIONS ======================
function addNewBook(bookData) {
    const newBook = new Book(
        bookData.isbn,
        bookData.title,
        bookData.author,
        bookData.category
    );
    books.push(newBook);
    saveToLocalStorage();
    return true;
}

function borrowBook(memberId, isbn) {
    const member = members.find(m => m.id === memberId);
    const book = books.find(b => b.isbn === isbn);

    if (!member || !book || !book.available || !member.canBorrow()) {
        return false;
    }

    // Process borrow
    book.available = false;
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
    const member = members.find(m => m.id === memberId);
    const book = books.find(b => b.isbn === isbn);

    if (!member || !book) return false;

    // Update book availability
    book.available = true;

    // Remove from member's borrowed list
    member.borrowedBooks = member.borrowedBooks.filter(b => b !== isbn);

    // Remove from loans
    loans = loans.filter(l => !(l.memberId === memberId && l.isbn === isbn));

    saveToLocalStorage();
    return true;
}

function loadCatalogue() {
    return books;
}

function findBookByISBN(isbn) {
    return books.find(b => b.isbn === isbn);
}

function findMemberById(id) {
    return members.find(m => m.id === id);
}

function updateStatistics() {
    const totalBooks = books.length;
    const totalMembers = members.length;
    const borrowedBooks = books.filter(b => !b.available).length;

    return { totalBooks, totalMembers, borrowedBooks };
}

// Initialize with sample data (optional)
function initializeSampleData() {
    if (books.length === 0) {
        books = [
            new Book("978-0061120084", "To Kill a Mockingbird", "Harper Lee", "fiction"),
            new Book("978-0140328721", "1984", "George Orwell", "fiction"),
            new Book("978-0307474278", "The Great Gatsby", "F. Scott Fitzgerald", "fiction")
        ];

        members = [
            new Member("M001", "John Doe", "john@example.com"),
            new Member("M002", "Jane Smith", "jane@example.com")
        ];

        saveToLocalStorage();
    }
}

// Load data when script runs
loadFromLocalStorage();
initializeSampleData();

export {
    books,
    members,
    loans,
    addNewBook,
    borrowBook,
    returnBook,
    loadCatalogue,
    findBookByISBN,
    findMemberById,
    updateStatistics
};