/* Generates international-standard programming-language textbook content.
   Each title ships: paged chapters, learning objectives, margin notes,
   runnable code samples with output, chapter exercises + final assessment,
   a multilingual glossary (EN / AR / FR / HI) and translated title/preface.
   Output: frontend/public/books/<slug>/{content,sample,toc}.json */

const path = require('path');
const fs = require('fs');

const OUT_ROOT = path.join(__dirname, '..', '..', 'frontend', 'public', 'books');

const TITLE_TRANSLATIONS = {
  python: { en: 'Python', ar: 'بايثون', fr: 'Python', hi: 'पाइथन' },
  javascript: { en: 'JavaScript', ar: 'جافا سكريبت', fr: 'JavaScript', hi: 'जावास्क्रिप्ट' },
  'javascript-deep-dive': { en: 'JavaScript Deep Dive', ar: 'غوص عميق في جافا سكريبت', fr: 'JavaScript : plongée en profondeur', hi: 'जावास्क्रिप्ट गहन अध्ययन' },
  ruby: { en: 'Ruby', ar: 'روبي', fr: 'Ruby', hi: 'रूबी' },
  cpp: { en: 'C++', ar: 'سي بلس بلس', fr: 'C++', hi: 'सी++' },
  swift: { en: 'Swift', ar: 'سويفت', fr: 'Swift', hi: 'स्विफ्ट' },
  kotlin: { en: 'Kotlin', ar: 'كوتلن', fr: 'Kotlin', hi: 'कोटलिन' },
  php: { en: 'PHP', ar: 'بي إتش بي', fr: 'PHP', hi: 'पीएचपी' },
  java: { en: 'Java', ar: 'جافا', fr: 'Java', hi: 'जावा' },
  go: { en: 'Go', ar: 'غو', fr: 'Go', hi: 'गो' },
  rust: { en: 'Rust', ar: 'راست', fr: 'Rust', hi: 'रस्ट' },
  typescript: { en: 'TypeScript', ar: 'تايب سكريبت', fr: 'TypeScript', hi: 'टाइपस्क्रिप्ट' },
  csharp: { en: 'C#', ar: 'سي شارب', fr: 'C#', hi: 'सी शार्प' },
  dart: { en: 'Dart', ar: 'دارت', fr: 'Dart', hi: 'डार्ट' },
  shell: { en: 'Shell Scripting', ar: 'البرمجة النصية للقشرة', fr: 'Scripts shell', hi: 'शेल स्क्रिप्टिंग' }
};

const LEVELS = {
  python: 'BEGINNER', javascript: 'BEGINNER', 'javascript-deep-dive': 'ADVANCED',
  ruby: 'INTERMEDIATE', cpp: 'INTERMEDIATE', swift: 'INTERMEDIATE', kotlin: 'INTERMEDIATE',
  php: 'INTERMEDIATE', java: 'INTERMEDIATE', go: 'INTERMEDIATE', rust: 'ADVANCED',
  typescript: 'INTERMEDIATE', csharp: 'INTERMEDIATE', dart: 'INTERMEDIATE', shell: 'BEGINNER'
};

const PREREQS = {
  python: 'No prior programming experience.', javascript: 'No prior programming experience.',
  'javascript-deep-dive': 'A working knowledge of JavaScript.', ruby: 'Basic programming familiarity.',
  cpp: 'Basic programming familiarity.', swift: 'Basic programming familiarity.',
  kotlin: 'Basic programming familiarity.', php: 'Basic web knowledge (HTML).',
  java: 'Basic programming familiarity.', go: 'Basic programming familiarity.',
  rust: 'Comfort with C or C++ memory concepts.', typescript: 'Working JavaScript knowledge.',
  csharp: 'Basic programming familiarity (any language).', dart: 'Familiarity with an OOP language.',
  shell: 'Comfort in a Unix-style terminal.'
};

/* Shared programming glossary with real EN/AR/FR/HI translations. */
const DICTIONARY = [
  { term: 'variable', meaning: 'A named container that stores a value in memory.', translations: { ar: 'متغير', fr: 'variable', hi: 'चर' } },
  { term: 'function', meaning: 'A reusable block of code that performs a task.', translations: { ar: 'دالة', fr: 'fonction', hi: 'फ़ंक्शन' } },
  { term: 'class', meaning: 'A blueprint that defines the structure and behaviour of objects.', translations: { ar: 'صنف', fr: 'classe', hi: 'क्लास' } },
  { term: 'object', meaning: 'An instance of a class holding its own state and behaviour.', translations: { ar: 'كائن', fr: 'objet', hi: 'ऑब्जेक्ट' } },
  { term: 'array', meaning: 'An ordered collection of elements stored under one name.', translations: { ar: 'مصفوفة', fr: 'tableau', hi: 'ऐरे' } },
  { term: 'loop', meaning: 'A construct that repeats a block of code while a condition holds.', translations: { ar: 'حَلقة', fr: 'boucle', hi: 'लूप' } },
  { term: 'string', meaning: 'A sequence of characters representing text.', translations: { ar: 'نص', fr: 'chaîne de caractères', hi: 'स्ट्रिंग' } },
  { term: 'compile', meaning: 'To translate source code into machine-executable form.', translations: { ar: 'ترجمة برمجية', fr: 'compiler', hi: 'कंपाइल करना' } },
  { term: 'runtime', meaning: 'The environment in which a program executes.', translations: { ar: 'زمن التشغيل', fr: 'exécution', hi: 'रनटाइम' } },
  { term: 'recursion', meaning: 'A function calling itself to solve smaller sub-problems.', translations: { ar: 'عودة النّداء', fr: 'récursivité', hi: 'पुनरावर्तन' } },
  { term: 'interface', meaning: 'A contract describing the operations a type must expose.', translations: { ar: 'واجهة', fr: 'interface', hi: 'इंटरफ़ेस' } },
  { term: 'closure', meaning: 'A function that remembers the scope where it was created.', translations: { ar: 'إغلاق', fr: 'fermeture', hi: 'क्लोज़र' } },
  { term: 'null', meaning: 'A special value representing the absence of data.', translations: { ar: 'قيمة فارغة', fr: 'valeur nulle', hi: 'नल' } },
  { term: 'memory', meaning: 'The storage space allocated to running programs.', translations: { ar: 'الذاكرة', fr: 'mémoire', hi: 'मेमोरी' } },
  { term: 'thread', meaning: 'The smallest unit of execution within a process.', translations: { ar: 'خيط التنفيذ', fr: 'fil d\'exécution', hi: 'थ्रेड' } },
  { term: 'exception', meaning: 'An error event that interrupts normal program flow.', translations: { ar: 'استثناء', fr: 'exception', hi: 'अपवाद' } },
  { term: 'package', meaning: 'A distributable unit of reusable code.', translations: { ar: 'حزمة', fr: 'paquet', hi: 'पैकेज' } },
  { term: 'composition', meaning: 'Building complex types by combining simpler ones.', translations: { ar: 'تكوين', fr: 'composition', hi: 'संरचना' } },
  { term: 'syntax', meaning: 'The set of rules that defines valid statements in a language.', translations: { ar: 'قواعد الكتابة', fr: 'syntaxe', hi: 'वाक्यविन्यास' } },
  { term: 'type', meaning: 'The category of a value that determines its behaviour.', translations: { ar: 'نوع', fr: 'type', hi: 'प्रकार' } },
  { term: 'scope', meaning: 'The region of code where a name is visible and valid.', translations: { ar: 'نطاق الأسماء', fr: 'portée', hi: 'स्कोप' } },
  { term: 'module', meaning: 'A file or unit that groups related code for reuse.', translations: { ar: 'وحدة', fr: 'module', hi: 'मॉड्यूल' } },
  { term: 'idiom', meaning: 'A commonly used, idiomatic pattern in a language.', translations: { ar: 'أسلوب متعارف', fr: 'idiome', hi: 'मुहावरा' } },
  { term: 'garbage collector', meaning: 'A runtime component that reclaims unused memory automatically.', translations: { ar: 'جامع البيانات', fr: 'ramasse-miettes', hi: 'गार्बेज कलेक्टर' } }
];

const BOOKS = [
  {
    slug: 'python', title: 'TypeScript-like intro to Python for Data', desc: 'The complete Python guide — syntax, data structures, OOP and real-world projects.',
    chapters: [
      { title: 'Getting Started with Python', concepts: ['interpreter', 'REPL', 'print', 'comments'],
        example: { title: 'Hello, world', code: 'name = input("What is your name? ")\nprint(f"Hello, {name}!")', output: 'What is your name? Alio\nHello, Alio!' } },
      { title: 'Variables & Types', concepts: ['int', 'float', 'str', 'bool', 'type()'],
        example: { title: 'Types at a glance', code: 'price = 29.99\nqty = 3\nprint(type(price), type(qty))\nprint(price * qty)', output: "<class 'float'> <class 'int'>\n89.97000000000001" } },
      { title: 'Control Flow', concepts: ['if/elif/else', 'while', 'for', 'range'],
        example: { title: 'A discount ladder', code: 'total = 120\nif total >= 100:\n    total *= 0.9\nprint(total)', output: '108.0' } },
      { title: 'Functions', concepts: ['def', 'parameters', 'return', 'default args'],
        example: { title: 'Pure helper', code: 'def tax(amount, rate=0.05):\n    return amount * rate\nprint(tax(200))', output: '10.0' } },
      { title: 'Data Structures', concepts: ['list', 'tuple', 'dict', 'set', 'comprehensions'],
        example: { title: 'Dictionary + list comprehension', code: 'scores = {"Ali": 92, "Lina": 88}\nprint([s for s in scores.values() if s > 90])', output: '[92]' } },
      { title: 'OOP in Practice', concepts: ['class', '__init__', 'methods', 'inheritance'],
        example: { title: 'A tiny Book class', code: 'class Book:\n    def __init__(self, title):\n        self.title = title\nb = Book("Python")\nprint(b.title)', output: 'Python' } },
      { title: 'Real-World Projects', concepts: ['files', 'modules', 'exceptions', 'pip'],
        example: { title: 'Reading a file safely', code: 'try:\n    with open("notes.txt") as f:\n        print(f.read())\nexcept FileNotFoundError:\n    print("Missing file")', output: 'Missing file' } }
    ]
  },
  {
    slug: 'javascript', title: 'JavaScript', desc: 'Modern JavaScript from the basics to async patterns and the browser DOM.',
    chapters: [
      { title: 'The Language of the Web', concepts: ['engine', 'script tag', 'console', 'semicolons'],
        example: { title: 'First script', code: 'console.log("Hello from JavaScript");', output: 'Hello from JavaScript' } },
      { title: 'Variables, Scopes & Hoisting', concepts: ['let', 'const', 'var', 'scoping'],
        example: { title: 'let vs const', code: 'const vat = 0.05;\nlet subtotal = 80;\nsubtotal += 20;\nconsole.log(subtotal * (1 + vat));', output: '105' } },
      { title: 'Functions & Closures', concepts: ['arrow functions', 'closures', 'defaults', 'rest'],
        example: { title: 'Arrow + closure', code: 'const add = (a, b) => a + b;\nconst makeCounter = () => { let n = 0; return () => ++n; };\nconst c = makeCounter();\nc();\nconsole.log(c(), add(2, 3));', output: '2 5' } },
      { title: 'Objects & Prototypes', concepts: ['object literals', 'this', 'class', 'spread'],
        example: { title: 'Spread a cart', code: 'const item = { id: 1, qty: 2 };\nconst next = { ...item, qty: item.qty + 1 };\nconsole.log(next.qty);', output: '3' } },
      { title: 'The DOM in Depth', concepts: ['querySelector', 'events', 'createElement', 'innerHTML'],
        example: { title: 'Render a list', code: 'const ul = document.querySelector("ul");\n[1,2,3].forEach(n => {\n  const li = document.createElement("li");\n  li.textContent = n;\n  ul.appendChild(li);\n});', output: '<li>1</li><li>2</li><li>3</li>' } },
      { title: 'Async: Promises & Fetch', concepts: ['promise', 'async/await', 'fetch', 'error handling'],
        example: { title: 'Fetch with await', code: 'async function load() {\n  const res = await fetch("/api/books");\n  return res.json();\n}\nload().then(console.log).catch(console.error);', output: 'Promise resolved with book list JSON' } },
      { title: 'Modern Tooling', concepts: ['npm', 'modules', 'vite', 'bundlers'],
        example: { title: 'ES module', code: 'import { formatAED } from "./format.js";\nconsole.log(formatAED(9.5));', output: 'AED 9.50' } }
    ]
  },
  {
    slug: 'javascript-deep-dive', title: 'JavaScript Deep Dive', desc: 'Closures, the event loop, promises, engines and performance.',
    chapters: [
      { title: 'The Event Loop Unpacked', concepts: ['call stack', 'task queue', 'microtasks', 'rendering'],
        example: { title: 'Order of logs', code: 'console.log("a");\nPromise.resolve().then(() => console.log("b"));\nsetTimeout(() => console.log("c"), 0);\nconsole.log("d");', output: 'a\nd\nb\nc' } },
      { title: 'Closures & the Execution Stack', concepts: ['execution context', 'scope chain', "closure", "memory"],
        example: { title: 'Classic closure', code: 'for (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}', output: '0\n1\n2' } },
      { title: 'Prototypal Inheritance', concepts: ['__proto__', 'Object.create', 'own vs inherited', 'symbols'],
        example: { title: 'Prototype chain', code: 'const proto = { hello() { return "hi"; } };\nconst o = Object.create(proto);\nconsole.log(o.hello(), Object.hasOwn(o, "hello"));', output: 'hi false' } },
      { title: 'Async Patterns & Microtasks', concepts: ['promise chaining', 'allSettled', 'queueMicrotask', 'async iterators'],
        example: { title: 'Await in parallel', code: 'const [a, b] = await Promise.all([f(1), f(2)]);', output: 'Both promises resolve concurrently' } },
      { title: 'Memory & Performance', concepts: ['references', 'GC roots', 'leaks', 'devtools'],
        example: { title: 'Detached listener', code: 'window.addEventListener("resize", onResize);\n// removeEventListener is required to free it', output: 'Listener retained until removed' } },
      { title: 'Engines: V8, JSC & SpiderMonkey', concepts: ['just-in-time', 'inline caches', 'hidden classes', 'parser'],
        example: { title: 'Monomorphic call', code: 'function area(r) { return r * r * Math.PI; }', output: 'JIT shape optimisation applies here' } },
      { title: 'Practical Debugging', concepts: ['breakpoints', 'step', 'watch', 'console.trace'],
        example: { title: 'Trace a path', code: 'function outer() { inner(); }\nfunction inner() { console.trace("who called me?"); }\nouter();', output: 'console.trace output shows outer → inner' } }
    ]
  },
  {
    slug: 'ruby', title: 'Ruby', desc: 'A beautiful, human-friendly language for building elegant products.',
    chapters: [
      { title: 'A Language for Humans', concepts: ['irb', 'puts', 'blocks', 'everything is an object'],
        example: { title: 'First steps', code: 'puts "Hello, #{ARGV[0] || "world"}"', output: 'Hello, world' } },
      { title: 'Objects Everywhere', concepts: ['methods', 'symbols', 'nil', 'truthiness'],
        example: { title: 'nil is falsy', code: 'value = nil\nputs value.nil? ? "missing" : value', output: 'missing' } },
      { title: 'Control Structures', concepts: ['unless', 'case', 'each', 'while'],
        example: { title: 'unless reads naturally', code: 'stock = 0\nputs "reorder" unless stock > 5', output: 'reorder' } },
      { title: 'Blocks, Procs & Lambdas', concepts: ['yield', 'Proc', 'lambda', 'map'],
        example: { title: 'Block to with_index', code: '["a", "b"].each_with_index { |c, i| puts "#{i}:#{c}" }', output: '0:a\n1:b' } },
      { title: 'Classes & Modules', concepts: ['initialize', 'attr_reader', 'include', 'extend'],
        example: { title: 'Simple class', code: 'class Book\n  attr_reader :title\n  def initialize(t); @title = t; end\nend\nputs Book.new("Ruby").title', output: 'Ruby' } },
      { title: 'Metaprogramming Basics', concepts: ['define_method', 'send', 'method_missing', 'DSLs'],
        example: { title: 'define_method', code: '[:read, :write].each do |m|\n  define_method(m) { |x| puts "#{m} #{x}" }\nend\nread("notes.txt")', output: 'read notes.txt' } },
      { title: 'Testing with RSpec', concepts: ['describe', 'it', 'expect', 'matchers'],
        example: { title: 'A first spec', code: 'describe "Tax" do\n  it "applies 5%" do\n    expect(tax(100)).to eq(5)\n  end\nend', output: '1 example, 0 failures' } }
    ]
  },
  {
    slug: 'cpp', title: 'C++', desc: 'C++ fundamentals — memory, classes, templates and the standard library.',
    chapters: [
      { title: 'Compilation & the Toolchain', concepts: ['g++', 'preprocessor', 'linking', 'build systems'],
        example: { title: 'Compile & run', code: 'g++ -std=c++20 main.cpp -o app && ./app', output: 'Hello, C++20' } },
      { title: 'Types & Memory', concepts: ['int', 'double', 'size_t', 'stack vs heap'],
        example: { title: 'sizeof a type', code: '#include <iostream>\nint main(){ std::cout << sizeof(long); }', output: '8' } },
      { title: 'Pointers & References', concepts: ['&', '*', 'const', 'nullptr'],
        example: { title: 'Reference swap', code: 'void swap(int &a, int &b){ int t = a; a = b; b = t; }', output: 'Values are swapped in place' } },
      { title: 'Classes & RAII', concepts: ['constructor', 'destructor', 'this', 'rule of three'],
        example: { title: 'RAII guard', code: 'struct Guard { ~Guard(){ std::cout << "cleaned"; } };', output: '"cleaned" printed on scope exit' } },
      { title: 'Templates & STL', concepts: ['template', 'vector', 'algorithm', 'lambda'],
        example: { title: 'Sort a vector', code: 'std::vector<int> v{3,1,2};\nstd::sort(v.begin(), v.end());', output: '1 2 3' } },
      { title: 'Move Semantics', concepts: ['std::move', 'rvalue', 'forward', 'emplace_back'],
        example: { title: 'Move a string', code: 'std::string s = std::string("buy") + " me";', output: 'Move avoids a second allocation' } },
      { title: 'Modern C++ Best Practices', concepts: ['auto', 'smart pointers', 'constexpr', 'concepts'],
        example: { title: 'unique_ptr', code: 'auto p = std::make_unique<int>(42);\nstd::cout << *p;', output: '42' } }
    ]
  },
  {
    slug: 'swift', title: 'Swift', desc: 'Build for Apple platforms with Swift — types, concurrency and SwiftUI basics.',
    chapters: [
      { title: 'Swift & the Apple Ecosystem', concepts: ['Playgrounds', 'Xcode', 'build', 'modules'],
        example: { title: 'Print', code: 'print("Hello, Swift")', output: 'Hello, Swift' } },
      { title: 'Values, Types & Optionals', concepts: ['let', 'var', 'optionals', 'guard'],
        example: { title: 'Unwrap safely', code: 'let qty: Int? = 3\nprint(qty.map { $0 * 2 } ?? 0)', output: 'Optional(6) becomes 6 via ?? → 6' } },
      { title: 'Functions & Closures', concepts: ['func', 'generics', 'trailing closures', 'map'],
        example: { title: 'Trailing closure', code: 'let prices = [10, 20]\nprint(prices.map { $0 * 1.05 })', output: '[10.5, 21.0]' } },
      { title: 'Protocols & Generics', concepts: ['protocol', 'extension', 'associatedtype', 'where'],
        example: { title: 'Protocol + extension', code: 'protocol Discountable { func discounted() -> Double }\nextension Double: Discountable { func discounted() -> Double { self * 0.9 } }', output: 'Any Double now has .discounted()' } },
      { title: 'Concurrency with Async/Await', concepts: ['async', 'await', 'Task', 'actors'],
        example: { title: 'Await a fetch', code: 'let books = try await client.listBooks()', output: 'Result available after suspension' } },
      { title: 'SwiftUI Essentials', concepts: ['View', 'body', 'State', 'some View'],
        example: { title: 'A SwiftUI row', code: 'struct Row: View {\n  var body: some View { Text("Swift").padding() }\n}', output: 'A text row rendered inside a view hierarchy' } }
    ]
  },
  {
    slug: 'kotlin', title: 'Kotlin', desc: 'Expressive JVM & Android development with Kotlin idioms and coroutines.',
    chapters: [
      { title: 'Kotlin on the JVM', concepts: ['JVM', 'val/var', 'REPL', 'interop'],
        example: { title: 'Classic start', code: 'fun main() { println("Hello from Kotlin") }', output: 'Hello from Kotlin' } },
      { title: 'Null Safety', concepts: ['?', '!!', 'safe call', 'Elvis'],
        example: { title: 'Elvis operator', code: 'val s: String? = null\nprintln(s ?: "fallback")', output: 'fallback' } },
      { title: 'Functions & Lambdas', concepts: ['fun', 'default args', 'lambdas', 'scope functions'],
        example: { title: 'let + default', code: 'fun greet(name: String = "World") = "Hello $name"\n"Alio".let { println(greet(it)) }', output: 'Hello Alio' } },
      { title: 'Classes, Data & Sealed Types', concepts: ['data class', 'sealed', 'when', 'copy'],
        example: { title: 'Data class copy', code: 'data class Cart(val items: Int, val total: Double)\nval c = Cart(2, 40.0).copy(total = 45.0)\nprintln(c)', output: 'Cart(items=2, total=45.0)' } },
      { title: 'Coroutines', concepts: ['suspend', 'launch', 'async', 'Dispatchers'],
        example: { title: 'async/await pair', code: 'val a = async { load(1) }\nval b = async { load(2) }\nprintln(a.await() + b.await())', output: 'Both loads run concurrently' } },
      { title: 'Android in Practice', concepts: ['Activity', 'Compose', 'ViewModel', 'Flow'],
        example: { title: 'Compose text', code: '@Composable fun Greeting() { Text("Kotlin") }', output: 'A composable renders "Kotlin"' } }
    ]
  },
  {
    slug: 'php', title: 'PHP', desc: 'Server-side scripting with PHP — forms, sessions, PDO and modern practices.',
    chapters: [
      { title: 'PHP on the Server', concepts: ['PHP-FPM', 'echo', 'variables', 'interpolation'],
        example: { title: 'First script', code: '<?php echo "Hello, {$name}"; ?>', output: 'Hello, Alio' } },
      { title: 'Syntax & Types', concepts: ['strict_types', 'bool', 'int', 'arrays', 'match'],
        example: { title: 'Strict types', code: 'declare(strict_types=1);\nfunction add(int $a, int $b): int { return $a + $b; }', output: 'Type errors surface before runtime' } },
      { title: 'Functions & Arrays', concepts: ['arrow fn', 'array_map', 'splat', 'spread'],
        example: { title: 'Arrow + map', code: '$prices = [10, 20];\nprint(array_map(fn($p) => $p * 1.05, $prices));', output: '[10.5, 21]' } },
      { title: 'Forms & Sessions', concepts: ['$_POST', 'filter_input', 'htmlspecialchars', 'session'],
        example: { title: 'Safe echo', code: 'echo htmlspecialchars($_POST["name"], ENT_QUOTES);', output: 'User input rendered safely' } },
      { title: 'PDO & Databases', concepts: ['PDO', 'prepared statements', 'bindValue', 'fetch'],
        example: { title: 'Prepared insert', code: '$st = $pdo->prepare("INSERT INTO books(title) VALUES(?)");\n$st->execute([$title]);', output: 'Row inserted with binding safety' } },
      { title: 'Modern PHP & Composer', concepts: ['composer', 'namespaces', 'PSR-4', 'env'],
        example: { title: 'Namespace import', code: 'use AlioStore\\Cart\\Calculator;', output: 'Autoloaded class becomes available' } }
    ]
  },
  {
    slug: 'java', title: 'Java', desc: 'Professional Java — OOP, collections, streams and building robust apps.',
    chapters: [
      { title: 'The JVM & Tooling', concepts: ['javac', 'JDK', 'Maven', 'JIT'],
        example: { title: 'Compile & run', code: 'javac Hello.java && java Hello', output: 'Hello, Java' } },
      { title: 'OOP Fundamentals', concepts: ['class', 'record', 'encapsulation', 'inheritance'],
        example: { title: 'A record', code: 'record Book(String title, double price) {}', output: 'Immutable value type with accessors' } },
      { title: 'Collections Framework', concepts: ['List', 'Map', 'Set', 'Stream pipelines'],
        example: { title: 'Group by rating', code: 'books.stream().collect(Collectors.groupingBy(Book::rating));', output: 'Map<Integer, List<Book>>' } },
      { title: 'Streams & Lambda', concepts: ['filter', 'map', 'reduce', 'method reference'],
        example: { title: 'Map + reduce', code: 'var total = prices.stream().map(p -> p * 1.0).reduce(0.0, Double::sum);', output: 'Sum of all prices after conversion' } },
      { title: 'Exceptions & Logging', concepts: ['try-with-resources', 'finally', 'SLF4J', 'unchecked'],
        example: { title: 'Try with resources', code: 'try (var in = new FileInputStream("f")) { /* safe */ }', output: 'Stream closed automatically' } },
      { title: 'Concurrency', concepts: ['ExecutorService', 'virtual threads', 'locks', 'volatile'],
        example: { title: 'Virtual threads', code: 'try (var ex = Executors.newVirtualThreadPerTaskExecutor()) { ex.submit(task); }', output: 'Task runs on a virtual thread' } },
      { title: 'Enterprise Patterns', concepts: ['Spring', 'DI', 'repositories', 'REST'],
        example: { title: 'A REST controller', code: '@RestController class BooksController { ... }', output: 'Maps HTTP routes to handlers' } }
    ]
  },
  {
    slug: 'go', title: 'Go', desc: 'Concurrency-first Go — goroutines, channels, packaging and the ecosystem.',
    chapters: [
      { title: 'Why Go', concepts: ['gofmt', 'single binary', 'simplicity', 'tooling'],
        example: { title: 'go run', code: 'package main\nimport "fmt"\nfunc main() { fmt.Println("Hello, Go") }', output: 'Hello, Go' } },
      { title: 'Packages & Modules', concepts: ['go.mod', 'import', 'export', 'go get'],
        example: { title: 'Module init', code: 'go mod init alistore/checkout', output: 'go.mod created with module path' } },
      { title: 'Types & Structs', concepts: ['struct', 'methods', 'pointers', 'composite literals'],
        example: { title: 'Struct with method', code: 'type Cart struct { Total float64 }\nfunc (c Cart) WithTax() float64 { return c.Total * 1.05 }', output: 'Returns total plus 5% tax' } },
      { title: 'Interfaces', concepts: ['interface{}', 'type assertions', 'satisfaction', 'errors'],
        example: { title: 'Error interface', code: 'var err error = fmt.Errorf("stock too low")', output: 'Any value with Error() string satisfies error' } },
      { title: 'Goroutines & Channels', concepts: ['go func', 'chan', 'select', 'sync.WaitGroup'],
        example: { title: 'Fan-in via channel', code: 'ch := make(chan int)\ngo producer(ch)\ngo consumer(ch)', output: 'Values flow between goroutines' } },
      { title: 'The Standard Library', concepts: ['net/http', 'encoding/json', 'io', 'context'],
        example: { title: 'HTTP server', code: 'http.HandleFunc("/", handler); http.ListenAndServe(":8080", nil)', output: 'Serves requests on :8080' } },
      { title: 'Building Services', concepts: ['middleware', 'logging', 'graceful shutdown', 'deploy'],
        example: { title: 'Graceful stop', code: 'srv.Shutdown(ctx)', output: 'In-flight requests drain before exit' } }
    ]
  },
  {
    slug: 'rust', title: 'Rust', desc: 'Memory-safe systems programming that runs at blazing speed.',
    chapters: [
      { title: 'Ownership', concepts: ['move', 'copy', 'borrow', 'drop'],
        example: { title: 'Move semantics', code: 'let s1 = String::from("hi");\nlet s2 = s1;\n// s1 is no longer usable', output: 'Compiler rejects use of moved s1' } },
      { title: 'Borrowing & Lifetimes', concepts: ['&', '&mut', 'lifetime elision', 'borrow checker'],
        example: { title: 'Immutable borrow', code: 'fn len(s: &String) -> usize { s.len() }', output: 'Borrows without taking ownership' } },
      { title: 'Patterns & Enums', concepts: ['enum', 'match', 'Option', 'destructuring'],
        example: { title: 'Option match', code: 'match opt {\n  Some(v) => v,\n  None => 0,\n}', output: 'Unwraps safely with no panic' } },
      { title: 'Traits & Generics', concepts: ['trait', 'impl', 'derive', 'generic bounds'],
        example: { title: 'A printable trait', code: 'trait Render { fn html(&self) -> String; }', output: 'Types implementing Render gain .html()' } },
      { title: 'Error Handling', concepts: ['Result', '? operator', 'unwrap', 'custom errors'],
        example: { title: 'Propagate with ?', code: 'fn read() -> Result<String, io::Error> {\n  fs::read_to_string("f.txt")\n}', output: 'Error propagates to caller' } },
      { title: 'Concurrency Without Fear', concepts: ['Send', 'Sync', 'Arc/Mutex', 'channels', 'rayon'],
        example: { title: 'Arc + Mutex', code: 'let c = Arc::new(Mutex::new(0));', output: 'Shared counter across threads, data-race free' } }
    ]
  },
  {
    slug: 'typescript', title: 'TypeScript', desc: 'Type-safe JavaScript — types, generics, classes and modern tooling.',
    chapters: [
      { title: 'Types on Top of JavaScript', concepts: ['tsc', 'annotations', 'inference', 'tsconfig'],
        example: { title: 'First annotation', code: 'const status: string = "PAID";', output: 'Compiles; typos fail at build time' } },
      { title: 'Interfaces & Type Aliases', concepts: ['interface', 'type', 'union', 'discriminated'],
        example: { title: 'Union + narrow', code: 'type Result = { ok: true; data: string } | { ok: false };\nif (r.ok) r.data.toUpperCase();', output: 'data is only accessible when ok === true' } },
      { title: 'Primitives & Utilities', concepts: ['tuple', 'enum', 'keyof', 'Partial', 'Pick'],
        example: { title: 'Pick a subset', code: 'type CartSummary = Pick<Cart, "count" | "total">;', output: 'New type with only those two fields' } },
      { title: 'Classes & Decorators', concepts: ['public/private', 'abstract', 'implements', 'decorators'],
        example: { title: 'Implements a contract', code: 'class Invoice implements Billable { total() { return 0; } }', output: 'Compiler enforces total() exists' } },
      { title: 'Generics', concepts: ['T', 'constraints', 'defaults', 'infer'],
        example: { title: 'Generic identity', code: 'function wrap<T>(v: T): T[] { return [v]; }', output: 'wrap(3) → number[]' } },
      { title: 'Modules & Namespaces', concepts: ['import type', 'barrel', 'declaration', 'paths'],
        example: { title: 'import type', code: 'import type { Book } from "@/lib/types";', output: 'Type-only import erased at runtime' } },
      { title: 'Tooling, Tests & Builds', concepts: ['vite', 'vitest', 'eslint', 'tsserver'],
        example: { title: 'A typed test', code: 'it("prices", () => { expect(add(1, 2)).toBe(3); });', output: 'Test passes with full type inference' } }
    ]
  },
  {
    slug: 'csharp', title: 'C#', desc: 'Modern .NET development — OOP, LINQ, async and the standard library.',
    chapters: [
      { title: 'The .NET Runtime & Tools', concepts: ['dotnet CLI', 'CLR', 'Roslyn', 'sln'],
        example: { title: 'dotnet new', code: 'dotnet new console -o Hello && dotnet run', output: 'Hello, World!' } },
      { title: 'Types, Value & Reference', concepts: ['int', 'string', 'struct', 'record'],
        example: { title: 'A record type', code: 'record Book(string Title, decimal Price);', output: 'Immutable with value equality' } },
      { title: 'Classes & Interfaces', concepts: ['class', 'abstract', 'interface', 'sealed'],
        example: { title: 'Interface contract', code: 'interface IPayable { decimal Total(); }', output: 'Implementers must supply Total()' } },
      { title: 'Properties & Linq', concepts: ['property', 'Linq', 'Where', 'Select'],
        example: { title: 'LINQ query', code: 'var expensive = books.Where(b => b.Price > 30).Select(b => b.Title);', output: 'Deferred, lazy sequence' } },
      { title: 'Async & Tasks', concepts: ['async', 'await', 'Task', 'ConfigureAwait'],
        example: { title: 'Await a service', code: 'var cart = await _cartService.LoadAsync(id);', output: 'Suspends without blocking a thread' } },
      { title: 'Collections & Generics', concepts: ['List<T>', 'Dictionary', 'nullable refs', 'patterns'],
        example: { title: 'Pattern matching', code: 'return total switch { > 100 => 0.9m * total, _ => total };', output: 'Switch expression applies 10% off' } },
      { title: 'ASP.NET & EF Core', concepts: ['Minimal APIs', 'DI', 'Entity Framework', 'records'],
        example: { title: 'Minimal API', code: 'app.MapGet("/books", () => db.Books.ToList());', output: 'HTTP GET returns the book list' } }
    ]
  },
  {
    slug: 'dart', title: 'Dart', desc: 'Build cross-platform apps with Flutter — Dart types, OOP and async.',
    chapters: [
      { title: 'Dart & the VM', concepts: ['flutter', 'dart run', 'JIT/AOT', 'pub'],
        example: { title: 'First Dart', code: 'void main() { print("Hello, Dart"); }', output: 'Hello, Dart' } },
      { title: 'Types & Variables', concepts: ['var', 'final', 'const', 'nullable', 'sound types'],
        example: { title: 'Nullable with ?.', code: 'int? qty;\nprint(qty?.isEven ?? true);', output: 'true' } },
      { title: 'Functions & Closures', concepts: ['=>', 'optional params', 'tear-offs', 'callbacks'],
        example: { title: 'Tear-off', code: 'json.map(_jsonToCart).toList();', output: 'Each map entry mapped by the function' } },
      { title: 'OOP & Mixins', concepts: ['class', 'extends', 'with', 'implements', 'abstract'],
        example: { title: 'Mix in behaviour', code: 'class Checkout extends Base with Discounts {}', output: 'Checkout gains Discounts behaviour' } },
      { title: 'Collections & Immutability', concepts: ['List', 'Set', 'Map', 'unmodifiable'],
        example: { title: 'Unmodifiable list', code: 'final taxes = List.unmodifiable([5]);', output: 'Adding to taxes throws' } },
      { title: 'Async & Futures', concepts: ['async', 'await', 'Stream', 'Future'],
        example: { title: 'Await with timeout', code: 'final list = await api.fetch().timeout(Duration(seconds: 5));', output: 'Resolves or throws after 5s' } },
      { title: 'Flutter Fundamentals', concepts: ['Widget', 'State', 'build', 'MaterialApp'],
        example: { title: 'A Flutter widget', code: 'class Price extends StatelessWidget {\n  Widget build(c) => Text("AED 40");\n}', output: 'Elapsed widget renders the price' } }
    ]
  },
  {
    slug: 'shell', title: 'Shell Scripting', desc: 'Automate everything — Bash, pipes, control flow, functions and cron.',
    chapters: [
      { title: 'The Command Line', concepts: ['terminal', 'pwd', 'ls', 'man'],
        example: { title: 'Where am I?', code: 'pwd && ls -la', output: 'Prints working directory then long listing' } },
      { title: 'Variables & Expansion', concepts: ['export', '$,', 'quotes', 'env'],
        example: { title: 'Variable interpolation', code: 'tax=5\necho "Tax is $tax%"', output: 'Tax is 5%' } },
      { title: 'Pipes & Redirection', concepts: ['|', '>', '>>', '<<<', 'xargs'],
        example: { title: 'Count words', code: 'cat notes.txt | tr -s " " "\\n" | wc -l', output: 'Number of words in notes.txt' } },
      { title: 'Control Flow', concepts: ['if', 'case', 'for', 'while', '[ ]'],
        example: { title: 'Loop over files', code: 'for f in *.log; do echo "$f $(wc -l < "$f")"; done', output: 'Each log plus its line count' } },
      { title: 'Functions & Subshells', concepts: ['function', 'local', '()', 'set -e'],
        example: { title: 'A helper function', code: 'g() { local tim=$(date +%Y); echo "$tim"; }', output: 'Prints the current year' } },
      { title: 'Monitoring & Cron', concepts: ['cron', 'at', 'watch', 'kill', 'nohup'],
        example: { title: 'Scheduled backup', code: '0 2 * * * tar -czf /backup/site.tgz /srv/www', output: 'Runs the archive nightly at 02:00' } },
      { title: 'Idiomatic Bash', concepts: ['[[ ]]', 'arrays', 'parameter expansion', 'set -u'],
        example: { title: 'Default value', code: 'name=${USER:-guest}\necho "Hello, $name"', output: 'Hello, <current user or guest>' } }
    ]
  }
];

const PAGES_PER_CHAPTER = 7;

function buildBook(b) {
  const chapters = [];
  let page = 12; /* front matter (ii–xi) then chapter 1 begins on page 12 */
  const weight = 100 / b.chapters.length;
  for (let i = 0; i < b.chapters.length; i++) {
    const ch = b.chapters[i];
    const start = page;
    page += PAGES_PER_CHAPTER;
    const objectives = [
      `Explain the core ideas behind ${ch.concepts[0]} and ${ch.concepts[1]}.`,
      `Write and run working ${b.title} code that uses ${ch.concepts.slice(0, 3).join(', ')}.`,
      `Recognise and avoid the common pitfalls associated with ${ch.concepts[ch.concepts.length - 1]}.`
    ];
    const notes = [
      `Note — ${ch.title}: ${ch.concepts.join(' / ')} are the heart of this chapter. Read the sample, then type it yourself.`,
      `Good practice: keep every example short and runnable; add a comment that records the expected output exactly.`,
      `International standard: every topic points to its section in the appendix and lists revisable key terms at the end.`
    ];
    const exercises = [
      { question: `What is the purpose of ${ch.concepts[0]} in ${b.title}?`, answer: `${ch.concepts[0]} lets you ${String(ch.concepts[ch.concepts.length - 1]).toLowerCase()} — see chapter section ${i + 1}.${2}.` },
      { question: `Modify the example to keep three decimal places instead of two.`, answer: 'Format the printed value with the language\'s precision formatter (e.g. printf/round), then re-run and compare.' },
      { question: `When would you avoid ${ch.concepts[ch.concepts.length - 1]}?`, answer: `Avoid it when the task is better served by a simpler, linear approach — momentum matters more than cleverness.` }
    ];
    chapters.push({
      index: i + 1,
      chapter: i + 1,
      title: ch.title,
      page: start,
      pageTo: start + PAGES_PER_CHAPTER - 1,
      objectives,
      notes,
      keyTerms: ch.concepts,
      samples: [{ title: 'Worked sample', language: b.title, code: ch.example.code, output: ch.example.output }],
      exercises
    });
  }

  const guide = weight.toFixed(1);
  const glossaryIndexes = b.slug.length % 2 === 0 ? [[0, 1, 5, 8, 12, 18], [3, 6, 9, 14, 20, 22]] : [[0, 2, 4, 7, 10, 15], [1, 5, 9, 13, 17, 21]];
  const idx = (b.slug.length + chapters.length) % 2;
  const terms = glossaryIndexes[idx].map((i) => DICTIONARY[i]);

  return {
    slug: b.slug,
    title: b.title,
    titleTranslated: TITLE_TRANSLATIONS[b.slug] || { en: b.title, ar: b.title, fr: b.title, hi: b.title },
    description: b.desc,
    level: LEVELS[b.slug],
    prerequisites: PREREQS[b.slug],
    languages: ['en', 'ar', 'fr', 'hi'],
    pageCount: page - 1,
    chapters,
    exercisesTotal: chapters.reduce((s, c) => s + c.exercises.length, 0),
    tests: {
      instructions: 'One assessment per chapter grouping plus a final exam. Every question maps to the section shown in brackets so you can revise precisely.',
      chapters: chapters.map((c) => ({
        chapter: c.chapter,
        title: c.title,
        page: c.page,
        questions: [
          { q: `Which concept makes ${c.keyTerms[0]} behave that way? (${b.title} ch.${c.chapter})`, options: ['memory layout', 'language design', 'the toolchain'], answer: 'language design' },
          { q: `The worked sample prints "${c.samples[0].output.replace(/"/g, '')}". Which statement caused it? (ch.${c.chapter})`, options: ['the input line', 'the print/echo statement', 'the import'], answer: 'the print/echo statement' }
        ]
      })),
      assessment: [
        { q: `Write ${b.title} code that reads a value, transforms it and prints the result. (final)`, options: ['compile only', 'read → transform → print', 'print only'], answer: 'read → transform → print' },
        { q: `What does the score of ${guide} marks per chapter tell you about this exam's structure? (final)`, options: ['chapters weigh equally', 'the last chapter is heaviest', 'random weighting'], answer: 'chapters weigh equally' }
      ]
    },
    glossary: terms.map((t) => ({ ...t })),
    appendix: { furtherReading: [`The ${b.title} language reference`, 'Official language tour', `Problem sets in the ${b.title} book club section`] }
  };
}

for (const b of BOOKS) {
  const content = buildBook(b);
  const dir = path.join(OUT_ROOT, b.slug);
  fs.mkdirSync(dir, { recursive: true });

  const ch1 = content.chapters[0];
  const sample = {
    title: b.title,
    excerpt: `Free sample — ${b.title} ${(LEVELS[b.slug] || '').toLowerCase()} course. Chapter 1 begins: "${ch1.title}".`,
    chapter: 'Chapter 1 · Free Preview',
    page: ch1.page,
    objectives: ch1.objectives,
    notes: ch1.notes,
    keyTerms: ch1.keyTerms,
    samples: ch1.samples,
    translatedNote: 'هذا الفصل تمهيدي مجاني. تُفتح بقية الفصول فور شراء الكتاب. — Ce chapitre est un aperçu gratuit. — यह अध्याय निःशुल्क पूर्वावलोकन है।',
    paragraphs: [ch1.samples[0].code, ch1.samples[0].output]
  };

  fs.writeFileSync(path.join(dir, 'content.json'), JSON.stringify(content, null, 2));
  fs.writeFileSync(path.join(dir, 'sample.json'), JSON.stringify(sample, null, 2));
  fs.writeFileSync(
    path.join(dir, 'toc.json'),
    JSON.stringify(
      { title: b.title, pageCount: content.pageCount, chapters: content.chapters.map((c) => ({ title: c.title, page: c.page, pageTo: c.pageTo })) },
      null,
      2
    )
  );
  console.log('generated ' + b.slug + ' (' + b.chapters.length + ' chapters, ' + content.pageCount + ' pages, ' + content.glossary.length + ' glossary terms)');
}

console.log('Done: ' + BOOKS.length + ' standard programming-language textbooks.');