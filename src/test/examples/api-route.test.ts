import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Example API route handler to test
async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Missing id parameter' },
      { status: 400 }
    );
  }

  // Simulate database lookup
  const data = {
    id,
    name: 'Test User',
    email: 'test@example.com',
  };

  return NextResponse.json(data, { status: 200 });
}

async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Simulate creating a record
    const newRecord = {
      id: 'new-id',
      ...body,
    };

    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    );
  }
}

describe('API Route: GET /api/example', () => {
  it('returns 400 when id parameter is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/example');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Missing id parameter' });
  });

  it('returns user data when id is provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/example?id=123');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
    });
  });
});

describe('API Route: POST /api/example', () => {
  it('returns 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/example', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Missing required fields' });
  });

  it('creates a new record with valid data', async () => {
    const requestBody = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const request = new NextRequest('http://localhost:3000/api/example', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toMatchObject({
      id: expect.any(String),
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('handles invalid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/example', {
      method: 'POST',
      body: 'invalid json',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid JSON' });
  });
});
