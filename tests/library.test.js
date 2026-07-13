/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

import { renderBookCatalogue, handleSearch } from '../src/ui.js';

import {
    books,
    members,
    loans,
    Book,
    DigitalBook,
    Member,
    PremiumMember,
    searchBooksByCategory,
    getBooksByAuthor,
    calculateTotalLateFees,
    combineBookCollections,
    addMultipleBooks,
    updateMemberInfo,
    borrowBook,
    returnBook,
    findBookByISBN,
    formatBookInfo,
    calculateFineAmount,
    calculateRecursiveFine,
    findCategoryDeep,
    formatBookLabel
} from '../src/library';

describe('Book Class', () => {
    test('should create a book instance', () => {
        const book = new Book('978-0-123', 'Test Book', 'Author Name', 2020, 5);

        expect(book.isbn).toBe('978-0-123');
        expect(book.title).toBe('Test Book');
        expect(book.author).toBe('Author Name');
        expect(book.publicationYear).toBe(2020);
        expect(book.totalCopies).toBe(5);
        expect(book.availableCopies).toBe(5);
    });

    test('should handle checking out copies correctly', () => {
        const book = new Book('978-0-123', 'Test Book', 'Author Name', 2020, 2);

        // First check out
        const result1 = book.checkOut();
        expect(result1).toBe(true);
        expect(book.availableCopies).toBe(1);

        // Second check out
        const result2 = book.checkOut();
        expect(result2).toBe(true);
        expect(book.availableCopies).toBe(0);

        // Attempt check out when no copies remain
        const result3 = book.checkOut();
        expect(result3).toBe(false);
        expect(book.availableCopies).toBe(0);
    });

    test('should correctly check availability', () => {
        const book = new Book('978-0-123', 'Test Book', 'Author Name', 2020, 1);

        expect(book.isAvailable()).toBe(true);

        book.checkOut();
        expect(book.isAvailable()).toBe(false);
    });

    test('should return formatted string via template literal methods', () => {
        const book = new Book('978-0143127741', 'How to Read a Book', 'Mortimer J. Adler', 2020, 2);

        if (typeof book.getSummary === 'function') {
            expect(book.getSummary()).toBe('"How to Read a Book" by Mortimer J. Adler (2020)');
        }

        if (typeof book.toString === 'function') {
            expect(book.toString()).toContain('How to Read a Book');
        }
    });
});

describe('DigitalBook Class', () => {
    test('should properly inherit from Book class', () => {
        const digitalBook = new DigitalBook('978-0-999', 'JS Guide', 'Coder Bob', 2022, '5MB', 'PDF');

        expect(digitalBook).toBeInstanceOf(Book);
        expect(digitalBook).toBeInstanceOf(DigitalBook);
    });

    test('should call super() correctly and set both parent and subclass properties', () => {
        const digitalBook = new DigitalBook('978-0-999', 'JS Guide', 'Coder Bob', 2022, '10MB', 'EPUB');

        expect(digitalBook.isbn).toBe('978-0-999');
        expect(digitalBook.title).toBe('JS Guide');
        expect(digitalBook.author).toBe('Coder Bob');
        expect(digitalBook.year).toBe(2022);
        expect(digitalBook.availableCopies).toBe(Infinity);

        expect(digitalBook.fileSize).toBe('10MB');
        expect(digitalBook.format).toBe('EPUB');
        expect(digitalBook.downloads).toBe(0);
    });

    test('should handle download method correctly', () => {
        const digitalBook = new DigitalBook('978-0-999', 'JS Guide', 'Coder Bob', 2022, '5MB', 'PDF');

        const result1 = digitalBook.download('M001');
        expect(result1).toBe(true);
        expect(digitalBook.downloads).toBe(1);
        expect(digitalBook.checkedOut).toContain('M001');

        const result2 = digitalBook.download('M002');
        expect(result2).toBe(true);
        expect(digitalBook.downloads).toBe(2);
        expect(digitalBook.checkedOut).toContain('M002');
    });

    test('should allow unlimited downloads via overridden checkOut method', () => {
        const digitalBook = new DigitalBook('978-0-999', 'JS Guide', 'Coder Bob', 2022, '5MB', 'PDF');

        expect(digitalBook.checkOut('M001')).toBe(true);
        expect(digitalBook.downloads).toBe(1);
        expect(digitalBook.isAvailable()).toBe(true); // Digital books never run out of copies
    });
});

describe('Member Class', () => {

    test('should create a member instance with correct properties', () => {
        const member = new Member('M001', 'John Doe', 'john@example.com', 'standard', '2023-01-01');

        expect(member.id).toBe('M001');
        expect(member.name).toBe('John Doe');
        expect(member.email).toBe('john@example.com');
        expect(member.membershipType).toBe('standard');
        expect(member.borrowedBooks).toEqual([]);
        expect(member.joinDate).toBe('2023-01-01');
    });

    test('canBorrow returns boolean', () => {
        const member = new Member('M001', 'John Doe', 'john@example.com', 'standard');

        expect(member.canBorrow()).toBe(true);

        member.borrowedBooks = ['ISBN1', 'ISBN2', 'ISBN3', 'ISBN4', 'ISBN5'];
        expect(member.canBorrow()).toBe(false);
    });

    test('should calculate membership duration correctly', () => {
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
        const joinDateStr = tenDaysAgo.toISOString().split('T')[0];

        const member = new Member('M001', 'John Doe', 'john@example.com', 'standard', joinDateStr);

        expect(typeof member.getMembershipDuration).toBe('function');
        expect(member.getMembershipDuration()).toBe(10);
    });
});

describe('PremiumMember Class', () => {
    test('should properly inherit from Member class', () => {
        const premiumMember = new PremiumMember('P001', 'Alice Smith', 'alice@example.com', '2023-01-01');

        expect(premiumMember).toBeInstanceOf(Member);
        expect(premiumMember).toBeInstanceOf(PremiumMember);
    });

    test('should set default premium properties correctly via super()', () => {
        const premiumMember = new PremiumMember('P001', 'Alice Smith', 'alice@example.com', '2023-01-01');

        expect(premiumMember.id).toBe('P001');
        expect(premiumMember.name).toBe('Alice Smith');
        expect(premiumMember.email).toBe('alice@example.com');
        expect(premiumMember.membershipType).toBe('premium');
        expect(premiumMember.joinDate).toBe('2023-01-01');
        expect(premiumMember.maxBooksAllowed).toBe(10);
        expect(Array.isArray(premiumMember.perks)).toBe(true);
    });

    test('should override canBorrow to allow more books than standard member', () => {
        const premiumMember = new PremiumMember('P001', 'Alice Smith', 'alice@example.com');

        premiumMember.borrowedBooks = ['B1', 'B2', 'B3', 'B4', 'B5'];

        expect(premiumMember.canBorrow()).toBe(true);

        premiumMember.borrowedBooks = [
            'B1', 'B2', 'B3', 'B4', 'B5',
            'B6', 'B7', 'B8', 'B9', 'B10'
        ];

        expect(premiumMember.canBorrow()).toBe(false);
    });
});

describe('Library Functions', () => {
    beforeEach(() => {
        books.length = 0;
        members.length = 0;

        books.push(
            new Book('978-0-123', 'JS Fundamentals', 'John Doe', 2021, 3, 'Technology'),
            new Book('978-0-456', 'Advanced JS', 'John Doe', 2023, 2, 'Technology'),
            new Book('978-0-789', 'Cooking Basics', 'Jane Smith', 2020, 1, 'Culinary')
        );

        members.push(
            new Member('M001', 'Alice Green', 'alice@example.com', 'standard')
        );
    });

    test('findBookByISBN returns book', () => {
        const book = findBookByISBN('978-0-123');
        expect(book).toBeDefined();
        expect(book).not.toBeNull();
        expect(book.title).toBe('JS Fundamentals');

        const notFound = findBookByISBN('978-0-000');
        expect(notFound).toBeNull();
    });

    test('getBooksByAuthor filters books by author name', () => {
        const johnBooks = getBooksByAuthor('John Doe');
        expect(johnBooks.length).toBe(2);
        expect(johnBooks[0].title).toBe('JS Fundamentals');
        expect(johnBooks[1].title).toBe('Advanced JS');

        const janeBooks = getBooksByAuthor('Jane Smith');
        expect(janeBooks.length).toBe(1);
        expect(janeBooks[0].title).toBe('Cooking Basics');

        const unknownAuthor = getBooksByAuthor('Non Existent Author');
        expect(unknownAuthor).toEqual([]);
    });

    test('should handle search with empty arrays safely', () => {
        books.length = 0;

        expect(findBookByISBN('978-0-123')).toBeNull();
        expect(getBooksByAuthor('John Doe')).toEqual([]);
    });

    test('should handle null, undefined, and invalid inputs gracefully', () => {
        expect(findBookByISBN(null)).toBeNull();
        expect(findBookByISBN(undefined)).toBeNull();
        expect(findBookByISBN('')).toBeNull();

        expect(getBooksByAuthor(null)).toEqual([]);
        expect(getBooksByAuthor(undefined)).toEqual([]);
        expect(getBooksByAuthor(12345)).toEqual([]);
    });
});

describe('Array Operations', () => {
    let sampleBooks;

    beforeEach(() => {
        sampleBooks = [
            { isbn: '101', title: 'Tech Book A', category: 'Technology', availableCopies: 2 },
            { isbn: '102', title: 'Cooking 101', category: 'Culinary', availableCopies: 0 },
            { isbn: '103', title: 'Tech Book B', category: 'Technology', availableCopies: 5 },
        ];
    });

    test('should filter books by availability or category', () => {
        const available = sampleBooks.filter(b => b.availableCopies > 0);
        expect(available.length).toBe(2);

        const techBooks = sampleBooks.filter(b => b.category === 'Technology');
        expect(techBooks.length).toBe(2);
    });

    test('should map book arrays to titles or ISBN lists', () => {
        const titles = sampleBooks.map(b => b.title);
        expect(titles).toEqual(['Tech Book A', 'Cooking 101', 'Tech Book B']);

        const isbns = sampleBooks.map(b => b.isbn);
        expect(isbns).toEqual(['101', '102', '103']);
    });

    test('should use reduce via calculateTotalLateFees', () => {
        const memberRecord = {
            overdueBooks: [
                { isbn: '101', daysLate: 2 },
                { isbn: '102', daysLate: 4 }
            ]
        };

        const totalFees = calculateTotalLateFees(memberRecord);
        expect(totalFees).toBe(3.00);
    });

    test('should combine book collections using spread operator', () => {
        const fiction = [{ isbn: '1', title: 'Fiction Book' }];
        const nonFiction = [{ isbn: '2', title: 'Non-Fiction Book' }];
        const reference = [{ isbn: '3', title: 'Dictionary' }];

        const combined = combineBookCollections(fiction, nonFiction, reference);

        expect(combined.length).toBe(3);
        expect(combined).toEqual([...fiction, ...nonFiction, ...reference]);
    });

    test('should handle rest parameters via addMultipleBooks', () => {
        books.length = 0;

        const b1 = new Book('111', 'Book 1', 'Author A', 2020, 1);
        const b2 = new Book('222', 'Book 2', 'Author B', 2021, 1);
        const b3 = new Book('333', 'Book 3', 'Author C', 2022, 1);

        const addedCount = addMultipleBooks(b1, b2, b3);

        expect(addedCount).toBe(3);
        expect(books.length).toBe(3);
        expect(findBookByISBN('222')).toBeDefined();
    });
});

describe('Recursive Functions', () => {

    let categoryTree;

    beforeEach(() => {
        categoryTree = {
            name: 'Library Root',
            subcategories: [
                {
                    name: 'Technology',
                    subcategories: [
                        { name: 'Computer Science', subcategories: [] },
                        { name: 'Software Engineering', subcategories: [] }
                    ]
                },
                {
                    name: 'Fiction',
                    subcategories: [
                        { name: 'Sci-Fi', subcategories: [] }
                    ]
                }
            ]
        };
    });

    test('searchBooksByCategory recursively matches categories across a list', () => {
        const bookList = [
            { title: 'Book 1', category: 'Technology' },
            { title: 'Book 2', category: 'Fiction' },
            { title: 'Book 3', category: 'Technology' },
        ];

        const techResults = searchBooksByCategory(bookList, 'Technology', 0);
        expect(techResults.length).toBe(2);
        expect(techResults[0].title).toBe('Book 1');
        expect(techResults[1].title).toBe('Book 3');
    });

    test('should properly hit base cases on out-of-bounds index or missing target', () => {
        const bookList = [
            { title: 'Book 1', category: 'Technology' }
        ];

        const outOfBounds = searchBooksByCategory(bookList, 'Technology', 5);
        expect(outOfBounds).toEqual([]);

        const notFound = searchBooksByCategory(bookList, 'NonExistent', 0);
        expect(notFound).toEqual([]);
    });

    test('findCategoryDeep searches nested tree objects recursively', () => {
        const foundNode = findCategoryDeep(categoryTree, 'Software Engineering');
        expect(foundNode).not.toBeNull();
        expect(foundNode.name).toBe('Software Engineering');

        const missingNode = findCategoryDeep(categoryTree, 'History');
        expect(missingNode).toBeNull();
    });

    test('prevents stack overflow by terminating correctly on empty or null inputs', () => {
        expect(() => searchBooksByCategory([], 'Technology', 0)).not.toThrow();
        expect(() => calculateRecursiveFine(0)).not.toThrow();
        expect(() => findCategoryDeep(null, 'Target')).not.toThrow();
    });
});

describe('Error Handling', () => {
    beforeEach(() => {
        // Reset state before each error test
        books.length = 0;
        members.length = 0;
        loans.length = 0;

        books.push(new Book('978-0131103627', 'Clean Code', 'Robert Martin', 2008, 2));
        members.push(new Member('M100', 'Grace Hopper', 'grace@example.com', 'standard'));
    });

    test('borrowBook safely handles undefined and null parameters without crashing', () => {
        expect(() => borrowBook(null, '978-0131103627')).not.toThrow();
        expect(borrowBook(null, '978-0131103627')).toBe(false);

        expect(() => borrowBook('M100', null)).not.toThrow();
        expect(borrowBook('M100', null)).toBe(false);

        expect(borrowBook(undefined, undefined)).toBe(false);
    });

    test('borrowBook handles non-existent members or books gracefully', () => {
        expect(borrowBook('NON_EXISTENT_MEMBER', '978-0131103627')).toBe(false);

        expect(borrowBook('M100', 'INVALID_ISBN')).toBe(false);
    });

    test('returnBook executes try-catch safety on bad inputs', () => {
        expect(() => returnBook(null, null)).not.toThrow();

        const failureResult = returnBook('NON_EXISTENT_MEMBER', 'INVALID_ISBN');
        expect(failureResult).toEqual({ success: false });
    });

    test('calculateFineAmount performs type checking and NaN handling', () => {
        expect(calculateFineAmount('invalid_number')).toBe('0.00');
        expect(calculateFineAmount(NaN)).toBe('0.00');
        expect(calculateFineAmount(null)).toBe('0.00');
        expect(calculateFineAmount(undefined)).toBe('0.00');
        expect(calculateFineAmount(-10)).toBe('0.00');

        expect(calculateFineAmount(4)).toBe('2.00');
    });

    test('updateMemberInfo validates input object types', () => {
        expect(updateMemberInfo(null, { name: 'New Name' })).toBeNull();
        expect(updateMemberInfo(undefined, {})).toBeNull();
        expect(updateMemberInfo('not_an_object', {})).toBeNull();
    });
});

describe('String Operations', () => {
    test('formatBookInfo formats book details using template literals', () => {
        const sampleBook = {
            title: 'Clean Code',
            author: 'Robert C. Martin',
            publicationYear: 2008
        };

        const result = formatBookInfo(sampleBook);

        expect(result).toContain('TITLE: CLEAN CODE');
        expect(result).toContain('AUTHOR: Robert C. Martin');
        expect(result).toContain('YEAR: 2008');
    });

    test('formatBookInfo handles null, undefined, or missing properties safely', () => {
        expect(formatBookInfo(null)).toBe('');
        expect(formatBookInfo(undefined)).toBe('');

        const incompleteBook = {};
        const result = formatBookInfo(incompleteBook);

        expect(result).toContain('TITLE: UNKNOWN TITLE');
        expect(result).toContain('AUTHOR: Unknown Author');
    });

    test('formatBookLabel formats book title and author using destructuring and template literals', () => {
        const book = { title: 'The Pragmatic Programmer', author: 'Andy Hunt' };

        const label = formatBookLabel(book);
        expect(label).toBe('The Pragmatic Programmer — by Andy Hunt');
    });

    test('formatBookLabel returns fallback string on missing book properties', () => {
        expect(formatBookLabel(null)).toBe('Untitled — by Unknown');
        expect(formatBookLabel({})).toBe('Untitled — by Unknown');
    });
});

describe('Math Operations', () => {
    test('calculateFineAmount returns number', () => {
        const fine = calculateFineAmount(5);

        expect(typeof fine).toBe('string');
        expect(fine).toBe('2.50');
    });

    test('calculateFineAmount correctly applies toFixed currency formatting and rounding', () => {
        expect(calculateFineAmount(1)).toBe('0.50');

        expect(calculateFineAmount(10)).toBe('5.00');
    });

    test('calculateFineAmount returns 0.00 for zero or negative days late', () => {
        expect(calculateFineAmount(0)).toBe('0.00');
        expect(calculateFineAmount(-3)).toBe('0.00');
    });
});

describe('DOM Manipulation', () => {
    let catalogueContainer;
    let searchInput;


    beforeEach(() => {
        // Set up virtual HTML DOM structure before each test
        document.body.innerHTML = `
            <input type="text" id="search" />
            <select id="filter-category">
                <option value="all">All</option>
            </select>
            <div id="catalogue-list"></div>
        `;

        catalogueContainer = document.getElementById('catalogue-list');
        searchInput = document.getElementById('search');

        books.length = 0;
        books.push(
            { isbn: '111', title: 'JavaScript Essentials', author: 'John Doe', availableCopies: 2, totalCopies: 3, category: 'Technology' },
            { isbn: '222', title: 'Python Programming', author: 'Jane Smith', availableCopies: 0, totalCopies: 1, category: 'Technology' }
        );
    });

    test('renderBookCatalogue renders book cards into DOM correctly', () => {
        renderBookCatalogue(books);

        const cards = catalogueContainer.querySelectorAll('.book-card');
        expect(cards.length).toBe(2);

        expect(cards[0].innerHTML).toContain('JavaScript Essentials');
        expect(cards[0].innerHTML).toContain('111');
        expect(cards[1].innerHTML).toContain('Python Programming');
    });

    test('renderBookCatalogue handles empty list gracefully', () => {
        renderBookCatalogue([]);

        expect(catalogueContainer.innerHTML).toContain('No books found matching criteria.');
    });

    test('handleSearch filters catalogue on user input event', () => {
        renderBookCatalogue(books);

        searchInput.value = 'python';
        const event = { target: searchInput };

        handleSearch(event);

        const cards = catalogueContainer.querySelectorAll('.book-card');
        expect(cards.length).toBe(1);
        expect(cards[0].innerHTML).toContain('Python Programming');
    });

    test('handleSearch event listener triggers DOM update on input', () => {
        renderBookCatalogue(books);

        searchInput.addEventListener('input', handleSearch);

        searchInput.value = 'JavaScript';
        searchInput.dispatchEvent(new Event('input'));

        const cards = catalogueContainer.querySelectorAll('.book-card');
        expect(cards.length).toBe(1);
        expect(cards[0].innerHTML).toContain('JavaScript Essentials');
    });

    test('clicking quick-borrow button triggers borrowBook logic', () => {
        renderBookCatalogue(books);

        const borrowBtn = document.querySelector('.btn-quick-borrow');
        expect(borrowBtn).not.toBeNull();

        borrowBtn.click();

        const statusText = document.querySelector('.book-card').textContent;
        expect(statusText).toContain('Copies:');
    });
});

describe('JSON Operations', () => {
    describe('JSON.stringify', () => {
        test('should convert a valid JavaScript object or array to a JSON string', () => {
            const book = { title: '1984', author: 'George Orwell', copies: 3 };
            const jsonString = JSON.stringify(book);

            expect(typeof jsonString).toBe('string');
            expect(jsonString).toBe('{"title":"1984","author":"George Orwell","copies":3}');
        });

        test('should handle arrays of objects correctly', () => {
            const bookList = [
                { id: 1, title: 'Dune' },
                { id: 2, title: 'Hobbit' }
            ];
            const jsonString = JSON.stringify(bookList);

            expect(jsonString).toBe('[{"id":1,"title":"Dune"},{"id":2,"title":"Hobbit"}]');
        });

        test('[Edge Case] should handle empty objects and arrays', () => {
            expect(JSON.stringify({})).toBe('{}');
            expect(JSON.stringify([])).toBe('[]');
        });
    });

    describe('JSON.parse', () => {
        test('should parse a valid JSON string into a JavaScript object', () => {
            const jsonString = '{"title":"Clean Code","author":"Robert C. Martin"}';
            const parsedData = JSON.parse(jsonString);

            expect(typeof parsedData).toBe('object');
            expect(parsedData.title).toBe('Clean Code');
            expect(parsedData.author).toBe('Robert C. Martin');
        });

        test('should parse a valid JSON array string into an Array', () => {
            const jsonString = '[{"id":101},{"id":102}]';
            const parsedArray = JSON.parse(jsonString);

            expect(Array.isArray(parsedArray)).toBe(true);
            expect(parsedArray.length).toBe(2);
            expect(parsedArray[0].id).toBe(101);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('[Failure Scenario] should throw a SyntaxError when parsing invalid JSON string', () => {
            const invalidJson = '{"title": "Unclosed string, author: "Test"}';

            expect(() => {
                JSON.parse(invalidJson);
            }).toThrow(SyntaxError);
        });

        test('[Failure Scenario] should throw a SyntaxError when parsing plain unquoted text', () => {
            expect(() => {
                JSON.parse('Invalid Plain Text');
            }).toThrow(SyntaxError);
        });

        test('[Edge Case] should handle primitive JSON values (numbers, booleans, null)', () => {
            expect(JSON.parse('123')).toBe(123);
            expect(JSON.parse('true')).toBe(true);
            expect(JSON.parse('null')).toBeNull();
        });

        test('[Edge Case] should omit undefined values and functions during stringification', () => {
            const objectWithUndefined = {
                title: 'Test',
                secret: undefined,
                getDetails: () => 'details'
            };
            const jsonString = JSON.stringify(objectWithUndefined);

            expect(jsonString).toBe('{"title":"Test"}');
        });
    });
});

describe('LocalStorage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('Save Functionality', () => {
        test('should save data into localStorage using setItem', () => {
            const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
            const sampleData = JSON.stringify([{ id: 1, title: 'Clean Code' }]);

            localStorage.setItem('library_books', sampleData);

            expect(setItemSpy).toHaveBeenCalledWith('library_books', sampleData);
            expect(localStorage.getItem('library_books')).toBe(sampleData);
        });

        test('should overwrite existing value when saving with an existing key', () => {
            localStorage.setItem('user_role', 'guest');
            localStorage.setItem('user_role', 'admin');

            expect(localStorage.getItem('user_role')).toBe('admin');
        });
    });

    describe('Load Functionality', () => {
        test('should retrieve stored data from localStorage using getItem', () => {
            const dataToStore = JSON.stringify({ theme: 'dark' });

            localStorage.setItem('settings', dataToStore);
            const retrievedData = localStorage.getItem('settings');

            expect(JSON.parse(retrievedData)).toEqual({ theme: 'dark' });
        });

        test('[Edge Case] should return null when attempting to load a non-existent key', () => {
            const result = localStorage.getItem('non_existent_key');
            expect(result).toBeNull();
        });
    });
    
    describe('Error Handling and Failure Scenarios', () => {
        test('[Failure Scenario] should catch QuotaExceededError when localStorage is full', () => {
            const originalSetItem = Storage.prototype.setItem;
            
            // Mock setItem directly
            Storage.prototype.setItem = () => {
                const error = new Error('QuotaExceededError');
                error.name = 'QuotaExceededError';
                throw error;
            };

            const saveToLocalStorage = (key, value) => {
                try {
                    localStorage.setItem(key, value);
                    return true;
                } catch (e) {
                    return false;
                }
            };

            const result = saveToLocalStorage('heavy_data', 'x'.repeat(1000));
            expect(result).toBe(false);

            // Restore original method
            Storage.prototype.setItem = originalSetItem;
        });

        test('[Failure Scenario] should handle errors when localStorage access is disabled/blocked', () => {
            const originalGetItem = Storage.prototype.getItem;

            Storage.prototype.getItem = () => {
                throw new Error('Access is denied for this document');
            };

            expect(() => {
                localStorage.getItem('any_key');
            }).toThrow('Access is denied for this document');

            // Restore original method
            Storage.prototype.getItem = originalGetItem;
        });
    });
});

describe('JavaScript Fundamentals & Modern Syntax', () => {


    // NESTED LOOPS
    // ============
    describe('Nested Loops', () => {
        test('should process 2D array data correctly using nested loops', () => {
            const matrix = [
                [1, 2],
                [3, 4]
            ];
            let sum = 0;

            for (let i = 0; i < matrix.length; i++) {
                for (let j = 0; j < matrix[i].length; j++) {
                    sum += matrix[i][j];
                }
            }

            expect(sum).toBe(10);
        });

        test('should match multi-category nested structures', () => {
            const libraryCategories = [
                { category: 'Fiction', books: ['Book A', 'Book B'] },
                { category: 'Tech', books: ['Book C'] }
            ];
            const allTitles = [];

            for (let i = 0; i < libraryCategories.length; i++) {
                for (let j = 0; j < libraryCategories[i].books.length; j++) {
                    allTitles.push(libraryCategories[i].books[j]);
                }
            }

            expect(allTitles).toEqual(['Book A', 'Book B', 'Book C']);
        });
    });

    // FOR-OF LOOPS
    describe('For-Of Loops', () => {
        test('should iterate over array elements sequentially', () => {
            const items = ['Clean Code', 'Design Patterns', 'Refactoring'];
            const collected = [];

            for (const item of items) {
                collected.push(item);
            }

            expect(collected).toEqual(items);
        });

        test('should iterate over string characters with for-of', () => {
            const isbn = '123';
            const digits = [];

            for (const char of isbn) {
                digits.push(Number(char));
            }

            expect(digits).toEqual([1, 2, 3]);
        });
    });

    //  DESTRUCTURING

    describe('Destructuring', () => {
        test('should extract properties from objects using object destructuring', () => {
            const book = { title: 'Dune', author: 'Frank Herbert', year: 1965 };
            const { title, author } = book;

            expect(title).toBe('Dune');
            expect(author).toBe('Frank Herbert');
        });

        test('should unpack values from arrays using array destructuring', () => {
            const scores = [95, 88, 72];
            const [first, second] = scores;

            expect(first).toBe(95);
            expect(second).toBe(88);
        });

        test('[Edge Case] should assign default values when properties are missing', () => {
            const book = { title: 'Unknown Book' };
            const { title, availableCopies = 1 } = book;

            expect(title).toBe('Unknown Book');
            expect(availableCopies).toBe(1);
        });
    });

    //  SCOPE TESTING (var, let, const)
    describe('Scope Testing (var, let, const)', () => {
        test('let and const should be block-scoped', () => {
            if (true) {
                let blockLet = 'inside block';
                const blockConst = 'inside block';
                expect(blockLet).toBe('inside block');
                expect(blockConst).toBe('inside block');
            }

            expect(() => blockLet).toThrow(ReferenceError);
            expect(() => blockConst).toThrow(ReferenceError);
        });

        test('var should be function-scoped rather than block-scoped', () => {
            function testVarScope() {
                if (true) {
                    var functionVar = 'accessible outside block';
                }
                return functionVar;
            }

            expect(testVarScope()).toBe('accessible outside block');
        });

        test('const should prevent reassignment', () => {
            const immutableRef = 42;
            
            expect(() => {
                immutableRef = 100;
            }).toThrow(TypeError);
        });
    });
});