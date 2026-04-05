// tests/users.test.ts
// Simple HTTP test script using the built-in fetch API (Node 18+)
// Run with: npm run test

const BASE_URL = 'http://localhost:4000';

declare const process: {
  exit(code?: number): never;
};

interface TestResult {
  name: string;
  passed: boolean;
  status?: number;
  body?: unknown;
  error?: string;
}

const results: TestResult[] = [];
let createdUserId: number | null = null;

async function request(
  method: string,
  path: string,
  body?: object
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function runTest(
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✅ ${name}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error: message });
    console.log(`  ❌ ${name}: ${message}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log('\n🧪 Running API Tests...\n');

  // Test 1: Create a user
  await runTest('POST /users - Create user', async () => {
    const { status, body } = await request('POST', '/users', {
      title: 'Mr',
      firstName: 'Jane',
      lastName: 'Smith',
      email: `jane_${Date.now()}@example.com`,
      password: 'secret123',
      confirmPassword: 'secret123',
      role: 'User',
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert((body as any).message === 'User created', 'Expected "User created" message');
  });

  // Test 2: Get all users
  await runTest('GET /users - Get all users', async () => {
    const { status, body } = await request('GET', '/users');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body), 'Expected an array');
    assert((body as any[]).length > 0, 'Expected at least one user');
    assert(
      !(body as any[])[0].passwordHash,
      'passwordHash should be excluded by default'
    );
    createdUserId = (body as any[])[0].id;
  });

  // Test 3: Get user by ID
  await runTest('GET /users/:id - Get user by ID', async () => {
    assert(createdUserId !== null, 'No user ID from previous test');
    const { status, body } = await request('GET', `/users/${createdUserId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert((body as any).id === createdUserId, 'User ID should match');
  });

  // Test 4: Get non-existent user (404)
  await runTest('GET /users/999 - 404 Not Found', async () => {
    const { status, body } = await request('GET', '/users/999');
    assert(status === 404, `Expected 404, got ${status}`);
    assert((body as any).message === 'User not found', 'Expected "User not found"');
  });

  // Test 5: Update user
  await runTest('PUT /users/:id - Update user', async () => {
    assert(createdUserId !== null, 'No user ID from previous test');
    const { status, body } = await request('PUT', `/users/${createdUserId}`, {
      firstName: 'Janet',
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert((body as any).message === 'User updated', 'Expected "User updated" message');
  });

  // Test 6: Validation error (missing required fields)
  await runTest('POST /users - Validation error (400)', async () => {
    const { status, body } = await request('POST', '/users', {
      firstName: 'Bob',
      // Missing email, password, etc.
    });
    assert(status === 400, `Expected 400, got ${status}`);
    assert(
      (body as any).message.includes('Validation error'),
      'Expected validation error message'
    );
  });

  // Test 7: Delete user
  await runTest('DELETE /users/:id - Delete user', async () => {
    assert(createdUserId !== null, 'No user ID from previous test');
    const { status, body } = await request('DELETE', `/users/${createdUserId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert((body as any).message === 'User deleted', 'Expected "User deleted" message');
  });

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});