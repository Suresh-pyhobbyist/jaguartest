# Jaguartest

![jaguar cover](assets/j_cover.png)

Welcome to **Jaguartest** – your blazing-fast, ultra-creative, and versatile JavaScript testing framework.

---

## Features

- **Concurrency**: Test up to 50 tasks at once for ultra-fast feedback.  
- **Hooks**: Control test flow with `beforeAll`, `beforeEach`, `afterEach`, and `afterAll`.  
- **Reporters**: Choose detailed **Verbose** or sleek **Minimal** outputs.  
- **Snapshots**: Auto-generate and compare for UI consistency.  
- **CLI & Watch**: Filter tests with `--grep`, set timeouts, or enable watch mode.  
- **Custom Assertions**: Create your own matchers for tailored testing.


## Quick Start

### 1. Installation

```bash
npm install -g jaguartest
```

### 2. Create Your First Test File

Sure! Here's a simpler way to explain:

1. Create a file (e.g., `test.js`).
2. Copy the example code below into the file to start writing tests with Jaguartest.

```javascript
/* test.js - A sample test file using Jaguartest */

const {
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  each,
  expect,
  runTests,
  setConfig,
  extendExpect,
  onTestEvent
} = require('jaguartest');

// Optional: Customize your configuration
setConfig({
  concurrency: 10,          // Use 10 concurrent runners for blazing speed!
  snapshotDir: './__snapshots__',
  reporter: 'verbose'
});

// Extend custom matchers with your own special sauce
extendExpect({
  toBeEven(received) {
    if (received % 2 !== 0) {
      throw new Error(`Expected ${received} to be even`);
    }
  }
});

// Plugin example: Log when tests pass or fail with style!
onTestEvent('testPass', (test) => {
  console.log(`🌟 Awesome! "${test.title}" passed!`);
});
onTestEvent('testFail', (test, duration, error) => {
  console.log(`💥 Oops! "${test.title}" failed in ${duration}ms. ${error.message}`);
});

// Define a vibrant test suite
describe("Mathematical Operations Suite", () => {
  beforeAll(() => {
    console.log("→ Setting up the test environment...");
  });

  beforeEach(() => {
    console.log("→ Starting a test...");
  });

  afterEach(() => {
    console.log("→ Cleaning up after test...");
  });

  afterAll(() => {
    console.log("→ All tests in the suite are complete!");
  });

  it("should correctly compute addition", () => {
    expect(2 + 2).toBe(4);
  });

  it("should correctly compute subtraction", () => {
    expect(5 - 3).toEqual(2);
  });

  // Data-driven test: Verify that each number is greater than zero.
  each([2, 3, 4])("should verify that %d is greater than zero", (num) => {
    expect(num).toBeGreaterThan(0);
  });
});

describe("String Operations Suite", () => {
  it("should match a substring using regex", () => {
    const greeting = "Hello, Jaguartest.js!";
    expect(greeting).toMatch(/Jaguartest\.js/);
  });

  it("should store and compare a snapshot of a dynamic string", () => {
    const dynamicContent = "Snapshot Content " + new Date().toString();
    // On the first run, this will create the snapshot. Subsequent runs compare against it.
    expect(dynamicContent).toMatchSnapshot();
  });
});

// Run tests if this file is executed directly with Node.js
if (require.main === module) {
  runTests().catch(err => {
    console.error("Error executing tests:", err);
    process.exit(1);
  });
}
```

### 3. Run Your Tests

Now, you can run your tests using Node.js:

```bash
node test.js
```

Or, if you prefer real-time feedback, activate watch mode to re-run tests on every file change:

```bash
node test.js --watch
```

---

## API Overview

| **Category**            | **API**                             | **Description**                                                                                                                             | **Modifiers**                     |
|-------------------------|-------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------|
| **Suite & Test Declarations** | `describe(title, fn)`            | Group related tests together into a suite.                                                                                                | `describe.only`, `describe.skip`  |
|                         | `it(title, fn)` / `test(title, fn)` | Define individual test cases.                                                                                                             | `it.only`, `it.skip`              |
|                         | `each(array)(description, fn)`      | Create parameterized tests that automatically iterate over an array of values.                                                            | N/A                               |
| **Lifecycle Hooks**     | `beforeAll(fn)` / `afterAll(fn)`    | Run once before or after all tests in a suite.                                                                                            | N/A                               |
|                         | `beforeEach(fn)` / `afterEach(fn)`  | Run before or after every single test.                                                                                                    | N/A                               |
| **Assertions & Matchers** | `expect(value)`                   | Fundamental assertion with built-in matchers like `.toBe(expected)`, `.toEqual(expected)`, `.toMatch(regexp)`, `.toMatchSnapshot()`, and more. | N/A                               |
|                         | `extendExpect(newMatchers)`         | Add your own custom matchers to tailor the framework to your needs.                                                                       | N/A                               |
| **Plugins & Events**    | `onTestEvent(event, listener)`      | Hook into events like `testPass` and `testFail` for custom logging, reporting, and more.                                                  | N/A                               |

---

### **Configuration**

| **Setting**          | **Purpose** |
|----------------------|------------|
| `globalTimeout`      | Limits how long all tests can run. `null` means no limit. |
| `randomizeTests`     | Runs tests in **random order** when `true`, else runs them **in order** when `false`. |
| `concurrency`        | Number of tests running **at the same time** (default is `50` for speed). |
| `snapshotDir`        | Where **snapshot files** are saved. Default location: `__snapshots__` folder. |
| `performanceMode`    | `false` → Shows **detailed test results**. `true` → Shows **minimal output** for speed. |
| `disableSnapshots`   | If `true`, **snapshot tests are turned off**. Default is `false` (snapshots enabled). |
| `reporter`           | Defines how test results are displayed → `'verbose'` (detailed) or `'minimal'`. |
| `grep`              | **Filters tests by keyword**. Example: `grep: "math"` runs only math-related tests. |
| `watch`             | If `true`, **tests automatically rerun** when files change. Default is `false`. |

```
Example:

const defaultConfig = {
  globalTimeout: null,       
  randomizeTests: false,    
  concurrency: 50,           
  snapshotDir: path.join(process.cwd(), '__snapshots__'), 
  performanceMode: false,    
  disableSnapshots: false,   
  reporter: 'verbose',       
  grep: null,                
  watch: false               
};
```
---

## License

**MIT License**. 


## Copyright

© Jaguartest. All rights reserved.

💖 Thanks for checking out **Jaguartest**!
