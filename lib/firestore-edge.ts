
/**
 * Lightweight Firestore REST client for Edge runtime.
 * Avoids the heavy overhead of the standard Firebase SDK.
 */

const DEFAULT_DATABASE_ID = '(default)';

function getFirestoreConfig(env?: any) {
  const projectId = env?.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const databaseId = env?.FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || DEFAULT_DATABASE_ID;
  const apiKey = env?.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  
  if (!projectId || !apiKey) {
    const missing = [];
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!apiKey) missing.push('FIREBASE_API_KEY');
    throw new Error(`Firestore configuration missing: ${missing.join(', ')}. Bitte prüfe die Environment-Variablen in Cloudflare.`);
  }

  return {
    projectId,
    databaseId,
    apiKey,
    baseUrl: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`
  };
}

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
      // eslint-disable-next-line security/detect-object-injection
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
      // eslint-disable-next-line security/detect-object-injection
      obj[k] = valueFromFirestore(v);
    }
    return obj;
  }
  return null;
}

export async function getDocument<T = Record<string, any>>(collection: string, id: string, token?: string, env?: any): Promise<T | null> {
  const { baseUrl, apiKey } = getFirestoreConfig(env);
  const url = `${baseUrl}/${collection}/${id}?key=${apiKey}`;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithRetry(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    let errMessage = `Firestore Error ${res.status}`;
    try {
      const err = await res.json() as { error?: { message?: string } };
      errMessage = err.error?.message || errMessage;
    } catch {}
    console.error(`[Firestore Error] Status: ${res.status}, Message: ${errMessage}`);
    throw new Error(errMessage);
  }
  const data = await res.json() as { fields?: Record<string, FirestoreValue> };
  const fields = data.fields || {};
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    // eslint-disable-next-line security/detect-object-injection
    result[k] = valueFromFirestore(v);
  }
  return { id, ...result } as T;
}

export async function setDocument(collection: string, id: string, data: Record<string, any>, token?: string | null, env?: any): Promise<any> {
  const { baseUrl, apiKey } = getFirestoreConfig(env);
  const url = `${baseUrl}/${collection}/${id}?key=${apiKey}`;
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) {
    // eslint-disable-next-line security/detect-object-injection
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
    let errMessage = `Firestore Error ${res.status}`;
    try {
      const err = await res.json() as { error?: { message?: string } };
      errMessage = err.error?.message || errMessage;
    } catch {}
    console.error(`[Firestore setDocument Error] Status: ${res.status}, ID: ${id}, Message: ${errMessage}`);
    throw new Error(errMessage);
  }
  return await res.json();
}

export async function addDocument<T = Record<string, any>>(collection: string, data: Record<string, any>, token?: string, env?: any): Promise<T & { id: string }> {
  const { baseUrl, apiKey } = getFirestoreConfig(env);
  const url = `${baseUrl}/${collection}?key=${apiKey}`;
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) {
    // eslint-disable-next-line security/detect-object-injection
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
    let errMessage = `Firestore Error ${res.status}`;
    try {
      const err = await res.json() as { error?: { message?: string } };
      errMessage = err.error?.message || errMessage;
    } catch {}
    throw new Error(errMessage);
  }
  const result = await res.json() as { name: string };
  const nameParts = result.name.split('/');
  return { id: nameParts[nameParts.length - 1], ...data } as T & { id: string };
}

export async function queryDocuments<T = Record<string, any>>(
  collection: string, 
  filters: FirestoreFilter[], 
  compositeOp: 'AND' | 'OR' = 'AND',
  token?: string,
  env?: any
): Promise<T[]> {
  const { projectId, databaseId, apiKey } = getFirestoreConfig(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;
  
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
    let errMessage = `Firestore Error ${res.status}`;
    try {
      const err = await res.json() as { error?: { message?: string } };
      errMessage = err.error?.message || errMessage;
    } catch {}
    throw new Error(errMessage);
  }

  interface QueryResult {
    document?: {
      name: string;
      fields?: Record<string, FirestoreValue>;
    };
  }

  const results = await res.json();
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .filter((r: QueryResult) => r.document)
    .map((r: QueryResult) => {
      const doc = r.document!;
      const fields = doc.fields || {};
      const data: Record<string, any> = {};
      for (const [k, v] of Object.entries(fields)) {
        // eslint-disable-next-line security/detect-object-injection
        data[k] = valueFromFirestore(v as FirestoreValue);
      }
      const nameParts = doc.name.split('/');
      return { id: nameParts[nameParts.length - 1], ...data } as T;
    });
}

export async function updateDocument(collection: string, id: string, data: Record<string, any>, token?: string, env?: any): Promise<any> {
  const { baseUrl, apiKey } = getFirestoreConfig(env);
  const fields: Record<string, FirestoreValue> = {};
  const fieldPaths: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    // eslint-disable-next-line security/detect-object-injection
    fields[k] = valueToFirestore(v);
    fieldPaths.push(k);
  }

  const mask = fieldPaths.map(p => `updateMask.fieldPaths=${p}`).join('&');
  const url = `${baseUrl}/${collection}/${id}?${mask}&key=${apiKey}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithRetry(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    let errMessage = `Firestore Error ${res.status}`;
    try {
      const err = await res.json() as { error?: { message?: string } };
      errMessage = err.error?.message || errMessage;
    } catch {}
    throw new Error(errMessage);
  }
  return await res.json();
}

export async function deleteDocument(collection: string, id: string, token?: string, env?: any): Promise<boolean> {
  const { baseUrl, apiKey } = getFirestoreConfig(env);
  const url = `${baseUrl}/${collection}/${id}?key=${apiKey}`;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithRetry(url, {
    method: 'DELETE',
    headers
  });

  if (!res.ok) {
    let errMessage = `Firestore Error ${res.status}`;
    try {
      const err = await res.json() as { error?: { message?: string } };
      errMessage = err.error?.message || errMessage;
    } catch {}
    throw new Error(errMessage);
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
export async function incrementField(collection: string, id: string, field: string, amount: number, token?: string, env?: any): Promise<any> {
  const { projectId, databaseId, apiKey } = getFirestoreConfig(env);
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is not defined in environment variables.');
  }

  // We use the commit endpoint for transformations
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:commit?key=${apiKey}`;
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const body = {
    writes: [
      {
        transform: {
          document: `projects/${projectId}/databases/${databaseId}/documents/${collection}/${id}`,
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
    let errMessage = `Firestore Error ${res.status}`;
    try {
      const err = await res.json() as { error?: { message?: string } };
      errMessage = err.error?.message || errMessage;
    } catch {}
    throw new Error(errMessage);
  }
  return await res.json();
}



