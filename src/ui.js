// Library UI - DOM Manipulation with Complex Errors

// Missing: proper initialization with DOMContentLoaded
var catalogueContainer;
var searchInput;
var filterDropdown;

function initializeUI() {
    // Wrong selector syntax
    catalogueContainer = document.querySelector("#catalogue-list");
    searchInput = document.getElementById("search");
    filterDropdown = document.querySelector("filter-category");  // Missing #
    
    // Missing: null checks
    
    setupEventListeners();
    loadCatalogue();
}

function setupEventListeners() {
    // Missing: search input event listener
    
    // Wrong event type
    filterDropdown.addEventListener("click", handleFilterChange);
    
    // Missing: form submission prevention
    var borrowForm = document.getElementById("borrow-form");
    borrowForm.addEventListener("submit", handleBorrowSubmit);
    
    // Missing: event delegation for dynamic elements
}

// Complex DOM rendering with errors
function renderBookCatalogue(bookList) {
    // Should clear container first
    
    // Inefficient - should use DocumentFragment or template literals
    for (var i = 0; i < bookList.length; i++) {
        var bookCard = document.createElement("div");
        bookCard.className = "book-card";
        
        // Should use template literals and data attributes
        bookCard.innerHTML = "<h3>" + bookList[i].title + "</h3>";
        bookCard.innerHTML = bookCard.innerHTML + "<p>Author: " + bookList[i].author + "</p>";
        bookCard.innerHTML = bookCard.innerHTML + "<p>Available: " + bookList[i].availableCopies + "</p>";
        
        // Missing: unique ID or data attribute for book
        // Missing: event listener for book selection
        
        catalogueContainer.appendChild(bookCard);
    }
}

// Function with event handling errors
function handleBorrowSubmit(event) {
    // Missing: event.preventDefault()
    
    var memberIdInput = document.getElementById("member-id");
    var isbnInput = document.getElementById("isbn");
    
    var memberId = memberIdInput.value;
    var isbn = isbnInput.value;
    
    // Missing: input validation
    // Missing: error handling
    
    var success = borrowBook(memberId, isbn);
    
    // Poor user feedback
    if (success) {
        alert("Book borrowed successfully");
    }
    
    // Missing: form reset
}

// Function missing event delegation
function handleBookClick(event) {
    // Should use event.target properly
    // Missing: closest() for event delegation
    
    var bookElement = event.target;
    var bookId = bookElement.id;
    
    displayBookDetails(bookId);
}

// Search function with errors
function handleSearch(event) {
    var searchTerm = event.target.value;
    
    // Case-sensitive search - should use toLowerCase()
    // Inefficient filtering
    var results = [];
    for (var i = 0; i < books.length; i++) {
        if (books[i].title.includes(searchTerm)) {
            results.push(books[i]);
        }
    }
    
    renderBookCatalogue(results);
}

// Function with filter errors
function handleFilterChange() {
    var selectedCategory = filterDropdown.value;
    
    // Missing: "all" option handling
    // Should use array filter method
    
    var filtered = [];
    for (var i = 0; i < books.length; i++) {
        if (books[i].category = selectedCategory) {  // Wrong operator
            filtered.push(books[i]);
        }
    }
    
    renderBookCatalogue(filtered);
}

// Function missing JSON operations
function exportLibraryData() {
    // Should convert to JSON
    // Missing: error handling
    
    var data = {
        books: books,
        members: members
    };
    
    // Missing: JSON.stringify
    return data;
}

// Function missing JSON parsing
function importLibraryData(jsonString) {
    // Missing: try-catch for JSON.parse
    // Missing: validation of parsed data
    
    var data = JSON.parse(jsonString);
    
    books = data.books;
    members = data.members;
}

// LocalStorage functions with errors
function saveToLocalStorage() {
    // Missing: error handling for localStorage
    // Missing: JSON.stringify
    
    localStorage.setItem("libraryBooks", books);
    localStorage.setItem("libraryMembers", members);
}

function loadFromLocalStorage() {
    // Missing: null check
    // Missing: JSON.parse
    // Missing: error handling
    
    var booksData = localStorage.getItem("libraryBooks");
    var membersData = localStorage.getItem("libraryMembers");
    
    books = booksData;
    members = membersData;
}

// Display function with template issues
function displayBookDetails(isbn) {
    var book = findBookByISBN(isbn);
    
    // Missing: null check
    
    var detailsContainer = document.getElementById("book-details");
    
    // Should use template literals
    var html = "<div class='book-details'>";
    html = html + "<h2>" + book.title + "</h2>";
    html = html + "<p><strong>Author:</strong> " + book.author + "</p>";
    html = html + "<p><strong>ISBN:</strong> " + book.isbn + "</p>";
    html = html + "<p><strong>Year:</strong> " + book.year + "</p>";
    html = html + "</div>";
    
    detailsContainer.innerHTML = html;
}

// Statistics display with errors
function updateStatisticsDisplay() {
    // Wrong selector methods
    var totalBooksEl = document.querySelector(".total-books");
    var totalMembersEl = document.querySelector(".total-members");
    
    // Missing: null checks
    // Should use textContent instead of innerHTML for text
    
    totalBooksEl.innerHTML = books.length;
    totalMembersEl.innerHTML = members.length;
    
    // Missing: update other statistics
}

// Dynamic form generation with errors
function createMemberForm() {
    var formContainer = document.getElementById("member-form");
    
    // Inefficient DOM manipulation
    var form = document.createElement("form");
    
    var nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = "name";
    // Missing: label, placeholder, required attribute
    
    var emailInput = document.createElement("input");
    emailInput.type = "text";  // Should be "email"
    emailInput.id = "email";
    
    // Missing: other form fields
    
    form.appendChild(nameInput);
    form.appendChild(emailInput);
    
    formContainer.appendChild(form);
}

// Initialize on wrong event
initializeUI();  // Wrong: should wait for DOMContentLoaded
