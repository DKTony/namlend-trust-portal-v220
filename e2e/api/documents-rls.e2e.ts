/**
 * E2E RLS Tests for Documents Storage Bucket (Using Fixtures)
 * 
 * Verifies Row-Level Security policies for document uploads:
 * - Clients can only read/write their own documents
 * - Admins and loan officers can read all documents
 * - Proper isolation between users
 * 
 * This version uses test fixtures for better auth session isolation
 */

import { test, expect } from '../fixtures';

test.describe('Documents Storage RLS', () => {
  test('Client can upload document to their own folder', async ({ client1Supabase }) => {
    const { data: { user } } = await client1Supabase.auth.getUser();
    expect(user).toBeTruthy();

    // Create a test file
    const testFile = new Blob(['Test document content'], { type: 'text/plain' });
    const fileName = `test-doc-${Date.now()}.txt`;
    const filePath = `${user!.id}/${fileName}`;

    // Upload to documents bucket
    const { data, error } = await client1Supabase.storage
      .from('documents')
      .upload(filePath, testFile);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.path).toBe(filePath);

    // Cleanup
    await client1Supabase.storage.from('documents').remove([filePath]);
  });

  test('Client cannot upload to another user folder', async ({ client1Supabase, client2Supabase }) => {
    const { data: { user: client2User } } = await client2Supabase.auth.getUser();
    expect(client2User).toBeTruthy();

    // Try to upload to client2's folder using client1's credentials
    const testFile = new Blob(['Unauthorized content'], { type: 'text/plain' });
    const fileName = `unauthorized-${Date.now()}.txt`;
    const filePath = `${client2User!.id}/${fileName}`;

    const { data, error } = await client1Supabase.storage
      .from('documents')
      .upload(filePath, testFile);

    // Should fail due to RLS policy
    expect(error).toBeTruthy();
  });

  test('Client can read their own documents', async ({ client1Supabase }) => {
    const { data: { user } } = await client1Supabase.auth.getUser();
    expect(user).toBeTruthy();

    // Upload a test file first
    const testFile = new Blob(['Client 1 document'], { type: 'text/plain' });
    const fileName = `read-test-${Date.now()}.txt`;
    const filePath = `${user!.id}/${fileName}`;

    await client1Supabase.storage.from('documents').upload(filePath, testFile);

    // Try to read it back
    const { data, error } = await client1Supabase.storage
      .from('documents')
      .download(filePath);

    expect(error).toBeNull();
    expect(data).toBeTruthy();

    // Cleanup
    await client1Supabase.storage.from('documents').remove([filePath]);
  });

  test('Client cannot read another user documents', async ({ client1Supabase, client2Supabase }) => {
    const { data: { user: client2User } } = await client2Supabase.auth.getUser();
    expect(client2User).toBeTruthy();

    // Client 2 uploads a document
    const testFile = new Blob(['Client 2 private document'], { type: 'text/plain' });
    const fileName = `private-${Date.now()}.txt`;
    const filePath = `${client2User!.id}/${fileName}`;

    await client2Supabase.storage.from('documents').upload(filePath, testFile);

    // Client 1 tries to read Client 2's document
    const { data, error } = await client1Supabase.storage
      .from('documents')
      .download(filePath);

    // Should fail due to RLS policy
    expect(error).toBeTruthy();
    expect(data).toBeNull();

    // Cleanup
    await client2Supabase.storage.from('documents').remove([filePath]);
  });

  test('Admin can read all user documents', async ({ client1Supabase, adminSupabase }) => {
    const { data: { user: client1User } } = await client1Supabase.auth.getUser();
    expect(client1User).toBeTruthy();

    // Client 1 uploads a document
    const testFile = new Blob(['Client document for admin'], { type: 'text/plain' });
    const fileName = `admin-read-test-${Date.now()}.txt`;
    const filePath = `${client1User!.id}/${fileName}`;

    await client1Supabase.storage.from('documents').upload(filePath, testFile);

    // Admin tries to read client's document
    const { data, error } = await adminSupabase.storage
      .from('documents')
      .download(filePath);

    expect(error).toBeNull();
    expect(data).toBeTruthy();

    // Cleanup
    await client1Supabase.storage.from('documents').remove([filePath]);
  });

  test('Client can list only their own documents', async ({ client1Supabase }) => {
    const { data: { user } } = await client1Supabase.auth.getUser();
    expect(user).toBeTruthy();

    // Upload a few test files
    const file1 = new Blob(['Doc 1'], { type: 'text/plain' });
    const file2 = new Blob(['Doc 2'], { type: 'text/plain' });
    const path1 = `${user!.id}/list-test-1-${Date.now()}.txt`;
    const path2 = `${user!.id}/list-test-2-${Date.now()}.txt`;

    await client1Supabase.storage.from('documents').upload(path1, file1);
    await client1Supabase.storage.from('documents').upload(path2, file2);

    // List documents in user's folder
    const { data, error } = await client1Supabase.storage
      .from('documents')
      .list(user!.id);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThanOrEqual(2);

    // Cleanup
    await client1Supabase.storage.from('documents').remove([path1, path2]);
  });

  test('Client cannot list another user documents', async ({ client1Supabase, client2Supabase }) => {
    const { data: { user: client2User } } = await client2Supabase.auth.getUser();
    expect(client2User).toBeTruthy();

    // Try to list client2's folder using client1's credentials
    const { data, error } = await client1Supabase.storage
      .from('documents')
      .list(client2User!.id);

    // Should return empty due to RLS (no error, just filtered results)
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('Client can delete their own documents', async ({ client1Supabase }) => {
    const { data: { user } } = await client1Supabase.auth.getUser();
    expect(user).toBeTruthy();

    // Upload a test file
    const testFile = new Blob(['To be deleted'], { type: 'text/plain' });
    const fileName = `delete-test-${Date.now()}.txt`;
    const filePath = `${user!.id}/${fileName}`;

    await client1Supabase.storage.from('documents').upload(filePath, testFile);

    // Delete it
    const { data, error } = await client1Supabase.storage
      .from('documents')
      .remove([filePath]);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  test('Client cannot delete another user documents', async ({ client1Supabase, client2Supabase }) => {
    const { data: { user: client2User } } = await client2Supabase.auth.getUser();
    expect(client2User).toBeTruthy();

    // Client 2 uploads a document
    const testFile = new Blob(['Protected document'], { type: 'text/plain' });
    const fileName = `protected-${Date.now()}.txt`;
    const filePath = `${client2User!.id}/${fileName}`;

    await client2Supabase.storage.from('documents').upload(filePath, testFile);

    // Client 1 tries to delete Client 2's document
    const { data, error } = await client1Supabase.storage
      .from('documents')
      .remove([filePath]);

    // Should fail or return empty due to RLS
    if (!error) {
      expect(data).toEqual([]);
    }

    // Cleanup by client 2
    await client2Supabase.storage.from('documents').remove([filePath]);
  });

  test('Documents table RLS - Client can only see their own records', async ({ client1Supabase }) => {
    const { data: { user } } = await client1Supabase.auth.getUser();
    expect(user).toBeTruthy();

    // Query documents table
    const { data, error } = await client1Supabase
      .from('documents')
      .select('*');

    expect(error).toBeNull();
    
    // All returned documents should belong to the current user
    if (data && data.length > 0) {
      data.forEach((doc: any) => {
        expect(doc.user_id).toBe(user!.id);
      });
    }
  });

  test('Documents table RLS - Admin can see all documents', async ({ adminSupabase }) => {
    const { data: { user: adminUser } } = await adminSupabase.auth.getUser();
    expect(adminUser).toBeTruthy();

    // Query documents table as admin
    const { data, error } = await adminSupabase
      .from('documents')
      .select('*')
      .limit(10);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });
});

test.describe('Documents RLS - Unauthenticated Access', () => {
  test('Unauthenticated user cannot upload documents', async ({ anonSupabase }) => {
    const testFile = new Blob(['Unauthorized'], { type: 'text/plain' });
    const filePath = `anon/test-${Date.now()}.txt`;

    const { data, error } = await anonSupabase.storage
      .from('documents')
      .upload(filePath, testFile);

    expect(error).toBeTruthy();
  });

  test('Unauthenticated user cannot read documents', async ({ anonSupabase }) => {
    const { data, error } = await anonSupabase.storage
      .from('documents')
      .download('any-user-id/any-file.txt');

    expect(error).toBeTruthy();
  });

  test('Unauthenticated user cannot query documents table', async ({ anonSupabase }) => {
    const { data, error } = await anonSupabase
      .from('documents')
      .select('*');

    // Should return empty or error
    if (!error) {
      expect(data).toEqual([]);
    }
  });
});
