// test.js
const {
    describe,
    it,
    each,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
    runTests
  } = require('./jaguartest.js'); // Notice the change here!
  
  console.log("🧪 Starting Jaguar.js dummy tests...");
  
  describe('Dummy Test Suite for Jaguar.js', () => {
    beforeAll(() => {
      console.log('🐾 [beforeAll] Setting up dummy tests...');
    });
  
    afterAll(() => {
      console.log('🐾 [afterAll] Cleaning up after tests...');
    });
  
    beforeEach(() => {
      console.log('➡️  [beforeEach] Starting a new test...');
    });
  
    afterEach(() => {
      console.log('⬅️  [afterEach] Test completed!');
    });
  
    // A simple synchronous test
    it('should pass a dummy synchronous test', () => {
      const a = 2;
      const b = 3;
      const sum = a + b;
      expect(sum).toEqual(5);
    });
  
    // An asynchronous test with a simulated delay
    it('should pass a dummy asynchronous test', async () => {
      const result = await new Promise(resolve =>
        setTimeout(() => resolve(10), 100)
      );
      expect(result).toEqual(10);
    });
  
    // Test using retry logic in case of transient issues
    let attempt = 0;
    it('should eventually pass after retrying', { retry: 1 }, () => {
      attempt++;
      if (attempt < 2) {
        // Simulate a failure on the first attempt
        throw new Error('Simulated failure, please retry!');
      }
      expect(attempt).toEqual(2);
    });
  
    // Snapshot testing to compare output consistency
    it('should match snapshot of generated output', () => {
      const output = {
        name: "Jaguar.js",
        version: "1.0.0",
        status: "awesome 😎"
      };
      // Convert the output to a string for snapshot comparisons
      expect(JSON.stringify(output, null, 2)).toMatchSnapshot();
    });
  
    // Parameterized tests to ensure reusability without repetition
    each([1, 2, 3])('should confirm %s is a positive number', (num) => {
      expect(num).toBeGreaterThan(0);
    });
  });
  
  // Additional sub-suite example
  describe('Sub-Suite Example', () => {
    it('should verify that a string contains a keyword', () => {
      const text = "Testing with Jaguar.js is fun!";
      expect(text).toMatch(/fun/);
    });
  });
  
  // Run the test runner
  runTests().catch(err => {
    console.error("Error during test run:", err);
    process.exit(1);
  });
  