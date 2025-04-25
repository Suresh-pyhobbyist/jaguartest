const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// ================================
// Global Configuration & CLI Options
// ================================
const defaultConfig = {
  globalTimeout: null,
  randomizeTests: false,
  concurrency: 50,
  snapshotDir: path.join(process.cwd(), '__snapshots__'),
  performanceMode: false, // false = verbose reporter, true = minimal
  disableSnapshots: false,
  reporter: 'verbose',
  grep: null,
  watch: false
};

let globalConfigObj = Object.assign({}, defaultConfig);

// Process CLI arguments (e.g., --grep=pattern, --watch)
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith('--grep=')) {
    globalConfigObj.grep = arg.split('=')[1];
  }
  if (arg === '--watch') {
    globalConfigObj.watch = true;
  }
});

// Expose a function to allow runtime configuration overrides.
function setConfig(newConfig) {
  Object.assign(globalConfigObj, newConfig);
}

// Global runner hooks (for pre/post-run operations)
let globalBefore = [];
let globalAfter = [];
function setGlobalBefore(fn) { globalBefore.push(fn); }
function setGlobalAfter(fn) { globalAfter.push(fn); }

// ================================
// Reporting & Event System
// ================================
const testEmitter = new EventEmitter(); // Events: suiteStart, suiteEnd, testStart, testPass, testFail, runEnd

class Reporter {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.tests = [];
  }
  onTestPass(test, duration) {
    this.passed++;
    this.tests.push({ title: test.title, duration, status: 'pass' });
  }
  onTestFail(test, duration, error) {
    this.failed++;
    this.tests.push({ title: test.title, duration, status: 'fail', error: error.message });
  }
  onTestSkip(test) {
    this.skipped++;
    this.tests.push({ title: test.title, status: 'skip' });
  }
  report(totalDuration) {
    // Implemented in subclass.
  }
}

class MinimalReporter extends Reporter {
  report(totalDuration) {
    console.log(`Total Duration: ${totalDuration}ms | Passed: ${this.passed} | Failed: ${this.failed} | Skipped: ${this.skipped}`);
  }
}

class VerboseReporter extends Reporter {
  report(totalDuration) {
    console.log(`\n----- Test Results -----`);
    this.tests.forEach(t => {
      if (t.status === 'pass') {
        console.log(`✅ ${t.title} (${t.duration}ms)`);
      } else if (t.status === 'fail') {
        console.log(`❌ ${t.title} (${t.duration}ms) => ${t.error}`);
      } else if (t.status === 'skip') {
        console.log(`⏭ ${t.title}`);
      }
    });
    console.log(`\nTotal: ${totalDuration}ms | Passed: ${this.passed} | Failed: ${this.failed} | Skipped: ${this.skipped}`);
  }
}

const reporter = (globalConfigObj.reporter === 'minimal') ?
  new MinimalReporter() : new VerboseReporter();

testEmitter.on('testPass', (test, duration) => reporter.onTestPass(test, duration));
testEmitter.on('testFail', (test, duration, error) => reporter.onTestFail(test, duration, error));
testEmitter.on('testSkip', (test) => reporter.onTestSkip(test));

// ================================
// Assertion API & Extendable Matchers
// ================================
const customMatchers = {
  toBe(received, expected) {
    if (received !== expected) {
      throw new Error(`Expected ${received} to be ${expected}`);
    }
  },
  toEqual(received, expected) {
    if (JSON.stringify(received) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(received)} to equal ${JSON.stringify(expected)}`);
    }
  },
  toBeGreaterThan(received, expected) {
    if (received <= expected) {
      throw new Error(`Expected ${received} to be greater than ${expected}`);
    }
  },
  toMatch(received, regexp) {
    if (!regexp.test(received)) {
      throw new Error(`Expected "${received}" to match ${regexp}`);
    }
  },
  toMatchSnapshot(received) {
    if (globalConfigObj.disableSnapshots) return;
    const snapshotDir = globalConfigObj.snapshotDir;
    if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir);
    const snapshotFile = path.join(snapshotDir, currentTestTitle.replace(/\s+/g, '_') + '.snap');
    const recStr = String(received);
    if (fs.existsSync(snapshotFile)) {
      const snap = fs.readFileSync(snapshotFile, 'utf8');
      if (snap !== recStr) {
        throw new Error(`Snapshot mismatch.\nExpected:\n${snap}\n\nReceived:\n${recStr}`);
      }
    } else {
      fs.writeFileSync(snapshotFile, recStr, 'utf8');
    }
  }
};

function expect(received) {
  const api = {};
  for (let matcher in customMatchers) {
    api[matcher] = function (...args) {
      customMatchers[matcher](received, ...args);
    };
  }
  return api;
}

function extendExpect(newMatchers) {
  Object.assign(customMatchers, newMatchers);
}

// ================================
// Test Suite & Test Classes
// ================================
class Suite {
  constructor(title) {
    this.title = title;
    this.tests = [];
    this.suites = [];
    this.hooks = { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] };
    this.context = {};
    this._only = false;
    this._skip = false;
    // Cache for merged hooks
    this.mergedBeforeEach = null;
    this.mergedAfterEach = null;
  }
}

class Test {
  constructor(title, testFn, options = {}) {
    this.title = title;
    this.testFn = testFn;
    this.options = Object.assign({ timeout: null, retry: 0, tags: [] }, options);
    this._only = !!options.only;
    this._skip = !!options.skip;
  }
}

const rootSuite = new Suite('Root');
let currentSuite = rootSuite;

// ================================
// API Functions: describe, it/test, hooks, each(), etc.
// ================================
function describe(title, fn) {
  const suite = new Suite(title);
  if (fn.only) suite._only = true;
  if (fn.skip) suite._skip = true;
  const prevSuite = currentSuite;
  currentSuite = suite;
  fn();
  currentSuite = prevSuite;
  currentSuite.suites.push(suite);
}
describe.only = function(title, fn) {
  fn.only = true;
  return describe(title, fn);
};
describe.skip = function(title, fn) {
  fn.skip = true;
  return describe(title, fn);
};

function it(title, optionsOrFn, maybeFn) {
  let testFn, options;
  if (typeof optionsOrFn === 'function') {
    testFn = optionsOrFn;
    options = {};
  } else {
    options = optionsOrFn || {};
    testFn = maybeFn;
  }
  const testObj = new Test(title, testFn, options);
  currentSuite.tests.push(testObj);
}
it.only = function(title, optionsOrFn, maybeFn) {
  let testFn, options;
  if (typeof optionsOrFn === 'function') {
    testFn = optionsOrFn;
    options = { only: true };
  } else {
    options = Object.assign({}, optionsOrFn, { only: true });
    testFn = maybeFn;
  }
  it(title, options, testFn);
};
it.skip = function(title, optionsOrFn, maybeFn) {
  // Do not register skipped tests.
};
const testAlias = it; // Alias "test" to "it"

function beforeAll(fn) {
  currentSuite.hooks.beforeAll.push(fn);
}
function afterAll(fn) {
  currentSuite.hooks.afterAll.push(fn);
}
function beforeEach(fn) {
  currentSuite.hooks.beforeEach.push(fn);
}
function afterEach(fn) {
  currentSuite.hooks.afterEach.push(fn);
}
function each(arr) {
  return function (description, fn) {
    arr.forEach((item, index) => {
      it(`${description} [case ${index}]`, function() {
        return fn(item);
      });
    });
  };
}

// Plugin system: allow external plugins to listen to test events.
function onTestEvent(event, listener) {
  testEmitter.on(event, listener);
}

// ================================
// Test Runner & Parallel Execution with Hook Caching
// ================================
async function runConcurrent(tasks, concurrency) {
  const results = new Array(tasks.length);
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      try {
        results[current] = await tasks[current]();
      } catch (e) {
        results[current] = { error: e };
      }
    }
  }
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

function computeMergedHooks(suite, parentBefore = [], parentAfter = []) {
  if (!suite.mergedBeforeEach) {
    suite.mergedBeforeEach = parentBefore.concat(suite.hooks.beforeEach);
    suite.mergedAfterEach = suite.hooks.afterEach.concat(parentAfter);
  }
  return { before: suite.mergedBeforeEach, after: suite.mergedAfterEach };
}

async function runSuite(suite, parentContext = {}, parentBefore = [], parentAfter = []) {
  if (suite._skip) return;
  suite.context = Object.assign({}, parentContext, suite.context);
  for (const hook of suite.hooks.beforeAll) {
    await hook.call(suite.context);
  }
  const { before, after } = computeMergedHooks(suite, parentBefore, parentAfter);
  const testsToRun = suite.tests.filter(test => {
    if (suite.tests.some(t => t._only)) {
      return test._only;
    }
    if (globalConfigObj.grep) {
      const re = new RegExp(globalConfigObj.grep);
      return re.test(test.title);
    }
    return true;
  });
  const testTasks = testsToRun.map(test => async () => {
    for (const hook of before) {
      await hook.call(suite.context);
    }
    testEmitter.emit('testStart', test.title);
    currentTestTitle = test.title;
    const tStart = Date.now();
    let error = null, attempts = 0;
    const retryLimit = test.options.retry || 0;
    do {
      try {
        if (test.options.timeout) {
          await Promise.race([
            Promise.resolve(test.testFn.call(suite.context)),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Test timed out")), test.options.timeout)
            )
          ]);
        } else {
          await test.testFn.call(suite.context);
        }
        error = null;
        break;
      } catch (err) {
        error = err;
        attempts++;
      }
    } while (attempts <= retryLimit);
    const tDuration = Date.now() - tStart;
    for (const hook of after) {
      await hook.call(suite.context);
    }
    if (error) {
      testEmitter.emit('testFail', test, tDuration, error);
    } else {
      testEmitter.emit('testPass', test, tDuration);
    }
  });
  await runConcurrent(testTasks, globalConfigObj.concurrency);
  for (const child of suite.suites) {
    await runSuite(child, suite.context, before, after);
  }
  for (const hook of suite.hooks.afterAll) {
    await hook.call(suite.context);
  }
}

async function runTests() {
  for (const fn of globalBefore) {
    await fn();
  }
  testEmitter.emit('suiteStart', rootSuite.title);
  const start = Date.now();
  await runSuite(rootSuite);
  const total = Date.now() - start;
  testEmitter.emit('runEnd', { totalDuration: total });
  reporter.report(total);
  for (const fn of globalAfter) {
    await fn();
  }
}

// ================================
// Watch Mode: Persistent Test Runner
// ================================
function watchMode() {
  console.log("Watch mode activated. Waiting for file changes...");
  const watcher = fs.watch(process.cwd(), { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.js')) {
      console.clear();
      console.log(`File change detected: ${filename}. Re-running tests...`);
      watcher.close();
      // Reset global suite and currentSuite for a clean re-run.
      rootSuite.tests = [];
      rootSuite.suites = [];
      currentSuite = rootSuite;
      try {
        delete require.cache[require.resolve('./test.js')];
        require('./test.js');
      } catch (e) {
        console.error("Error reloading test.js:", e);
      }
      runTests().then(() => {
        watchMode();
      });
    }
  });
}

// ================================
// Exported API
// ================================
module.exports = {
  describe,
  it: testAlias,
  test: testAlias,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  each,
  extendExpect,
  expect,
  runTests,
  setConfig,
  setGlobalBefore,
  setGlobalAfter,
  onTestEvent
};

// ================================
// Execute tests if run directly from the CLI
// ================================
if (require.main === module) {
  runTests()
    .then(() => {
      if (globalConfigObj.watch) {
        watchMode();
      }
    })
    .catch(err => {
      console.error("Error during test run:", err);
      process.exit(1);
    });
}
