
/**
 * Lightweight Firestore REST client for Edge runtime.
 * Avoids the heavy overhead of the standard Firebase SDK.
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const DATABASE_ID = process.env.FIREBASE_DATABASE_ID || '(default)';
const API_KEY = process.env.FIREBASE_API_KEY;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

/**
 * Helper for fetch with exponential backoff retry.
 * Handles transient network issues and Google API rate limits.
 */
export async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoff = 500): Promise<Response> {
  try {
    const res = await fetch(url, options);
    
    // Retry on 429 (Too Many Requests), 503 (Service Unavailable), or 502 (Bad Gateway)
    if (retries > 0 && [429, 502, 503].includes(res.status)) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    
    return res;
  } catch (error) {
    // Retry on network errors (DNS, Timeout)
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}


type FirestoreValue = 
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export interface FirestoreFilter {
  field: string;
  op: 'EQUAL' | 'GREATER_THAN' | 'LESS_THAN' | 'ARRAY_CONTAINS' | 'IN';
  value: unknown;
}

function valueToFirestore(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: value.toString() };
    return { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(valueToFirestore) } };
  if (typeof value === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = valueToFirestore(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function valueFromFirestore(value: FirestoreValue): any {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(valueFromFirestore);
  if ('mapValue' in value) {
    const obj: Record<string, any> = {};
    const fields = value.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = valueFromFirestore(v);
    }
    return obj;
  }
  return null;
}

export async function getDocument<T = Record<string, any>>(collection: string, id: string, token?: string): Promise<T | null> {
  const url = `${BASE_URL}/${collection}/${id}?key=${API_KEY}`;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithRetry(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } };
    throw new Error(err.error?.message || `Firestore Error ${res.status}`);
  }
  const data = await res.json() as { fields?: Record<string, FirestoreValue> };
  const fields = data.fields || {};
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    result[k] = valueFromFirestore(v);
  }
  return { id, ...result } as T;
}

export async function setDocument(collection: string, id: string, data: Record<string, any>, token?: string): Promise<any> {
  const url = `${BASE_URL}/${collection}/${id}?key=${API_KEY}`;
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = valueToFirestore(v);
  }
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithRetry(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } };
    throw new Error(err.error?.message || `Firestore Error ${res.status}`);
  }
  return await res.json();
}

export async function addDocument<T = Record<string, any>>(collection: string, data: Record<string, any>, token?: string): Promise<T & { id: string }> {
  const url = `${BASE_URL}/${collection}?key=${API_KEY}`;
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = valueToFirestore(v);
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } };
    throw new Error(err.error?.message || `Firestore Error ${res.status}`);
  }
  const result = await res.json() as { name: string };
  const nameParts = result.name.split('/');
  return { id: nameParts[nameParts.length - 1], ...data } as T & { id: string };
}

export async function queryDocuments<T = Record<string, any>>(
  collection: string, 
  filters: FirestoreFilter[], 
  compositeOp: 'AND' | 'OR' = 'AND',
  token?: string
): Promise<T[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:runQuery?key=${API_KEY}`;
  
  const mapOp = (op: string) => {
    switch (op) {
      case 'EQUAL': return 'EQUAL';
      case 'GREATER_THAN': return 'GREATER_THAN';
      case 'LESS_THAN': return 'LESS_THAN';
      case 'ARRAY_CONTAINS': return 'ARRAY_CONTAINS';
      case 'IN': return 'IN';
      default: return 'EQUAL';
    }
  };

  const query = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        compositeFilter: {
          op: compositeOp,
          filters: filters.map(f => ({
            fieldFilter: {
              field: { fieldPath: f.field },
              op: mapOp(f.op),
              value: valueToFirestore(f.value)
            }
          }))
        }
      }
    }
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(query)
  });

  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } };
    throw new Error(err.error?.message || `Firestore Error ${res.status}`);
  }

  interface QueryResult {
    document?: {
      name: string;
      fields?: Record<string, FirestoreValue>;
    };
  }

  const results = await res.json() as QueryResult[];
  return (results || [])
    .filter((r) => r.document)
    .map((r) => {
      const doc = r.document!;
      const fields = doc.fields || {};
      const data: Record<string, any> = {};
      for (const [k, v] of Object.entries(fields)) {
        data[k] = valueFromFirestore(v);
      }
      const nameParts = doc.name.split('/');
      return { id: nameParts[nameParts.length - 1], ...data } as T;
    });
}

export async function updateDocument(collection: string, id: string, data: Record<string, any>, token?: string): Promise<any> {
  const fields: Record<string, FirestoreValue> = {};
  const fieldPaths: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    fields[k] = valueToFirestore(v);
    fieldPaths.push(k);
  }

  const mask = fieldPaths.map(p => `updateMask.fieldPaths=${p}`).join('&');
  const url = `${BASE_URL}/${collection}/${id}?${mask}&key=${API_KEY}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithRetry(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } };
    throw new Error(err.error?.message || `Firestore Error ${res.status}`);
  }
  return await res.json();
}

export async function deleteDocument(collection: string, id: string, token?: string): Promise<boolean> {
  const url = `${BASE_URL}/${collection}/${id}?key=${API_KEY}`;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithRetry(url, {
    method: 'DELETE',
    headers
  });

  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } };
    throw new Error(err.error?.message || `Firestore Error ${res.status}`);
  }
  return true;
}

export async function updateStripeSubscription(uid: string, data: Record<string, any>): Promise<any> {
  // Webhooks use internal secret bypass to allow updating sensitive plan fields
  return updateDocument('users', uid, { 
    ...data, 
    adminSecret: process.env.INTERNAL_SECRET 
  });
}

/**
 * BIZ-02: Atomic increment to prevent race conditions.
 */
export async function incrementField(collection: string, id: string, field: string, amount: number, token?: string): Promise<any> {
  // We use the commit endpoint for transformations
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:commit?key=${API_KEY}`;
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const body = {
    writes: [
      {
        transform: {
          document: `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${id}`,
          fieldTransforms: [
            {
              fieldPath: field,
              increment: valueToFirestore(amount)
            }
          ]
        }
      }
    ]
  };

  const res = await fetchWithRetry(commitUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } };
    throw new Error(err.error?.message || `Firestore Error ${res.status}`);
  }
  return await res.json();
}



