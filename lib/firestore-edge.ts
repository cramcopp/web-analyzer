export const runtime = 'edge';

async function fetchWithRetry(url: string, options: any, retries = 3, backoff = 500): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`Status ${res.status}`);
      }
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
    }
  }
  throw new Error('Fetch failed after retries');
}

type FirestoreValue = 
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { mapValue: { fields: Record<string, FirestoreValue> } }
  | { arrayValue: { values: FirestoreValue[] } }
  | { timestampValue: string }
  | { nullValue: null };

function valueToFirestore(value: any): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: value.toString() };
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(valueToFirestore) } };
  }
  if (typeof value === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = valueToFirestore(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function documentFromFirestore(doc: any): any {
  if (!doc.fields) return doc;
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    result[k] = valueFromFirestore(v as FirestoreValue);
  }
  return result;
}

function valueFromFirestore(v: FirestoreValue): any {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) {
    const res: Record<string, any> = {};
    for (const [mk, mv] of Object.entries(v.mapValue.fields)) {
      res[mk] = valueFromFirestore(mv);
    }
    return res;
  }
  if ('arrayValue' in v) {
    return v.arrayValue.values?.map(valueFromFirestore) || [];
  }
  return v;
}

function getFirestoreConfig(env?: any) {
  const projectId = env?.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const apiKey = env?.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const databaseId = env?.FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || '(default)';

  if (!projectId || !apiKey) {
    throw new Error('Firebase configuration missing (PROJECT_ID or API_KEY)');
  }

  return {
    projectId,
    apiKey,
    databaseId,
    baseUrl: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`
  };
}

/**
 * setDocument with support for selective updates via updateMask.
 * If updateMask is provided, only those fields will be patched.
 * If not provided, it performs a full document replacement (with create if not exists).
 */
export async function setDocument(
  collection: string, 
  id: string, 
  data: Record<string, any>, 
  updateMask?: string[] | null, 
  env?: any
): Promise<any> {
  const { baseUrl, apiKey } = getFirestoreConfig(env);
  const fields: Record<string, FirestoreValue> = {};
  
  for (const [k, v] of Object.entries(data)) {
    fields[k] = valueToFirestore(v);
  }

  let url = `${baseUrl}/${collection}/${id}?key=${apiKey}`;
  
  // If we have an updateMask, we only update specific fields
  if (updateMask && updateMask.length > 0) {
    const maskParams = updateMask.map(p => `updateMask.fieldPaths=${p}`).join('&');
    url += `&${maskParams}`;
  }

  const token = env?.token || (typeof window !== 'undefined' ? null : null); // Token handling is usually external
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // Try to use Authorization header if a token is passed via env or dedicated param
  const authToken = env?.INTERNAL_SECRET || process.env.INTERNAL_SECRET;
  if (authToken) {
    // Note: This is a hack because we are using REST API with API Key, 
    // but sometimes we need Admin privileges. Firestore REST doesn't support Admin SDK tokens easily.
    // We rely on Firestore Rules with adminSecret check.
  }

  const res = await fetchWithRetry(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Firestore Error] ${res.status}: ${errText}`);
    throw new Error(`Firestore Error ${res.status}: ${errText}`);
  }

  return documentFromFirestore(await res.json());
}

export async function getDocument<T = Record<string, any>>(
  collection: string, 
  id: string, 
  token?: string | null, 
  env?: any
): Promise<T | null> {
  try {
    const { baseUrl, apiKey } = getFirestoreConfig(env);
    const url = `${baseUrl}/${collection}/${id}?key=${apiKey}`;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetchWithRetry(url, { headers });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Firestore Error ${res.status}`);

    return documentFromFirestore(await res.json()) as T;
  } catch (e) {
    console.error(`Error getting document ${collection}/${id}:`, e);
    return null;
  }
}

export async function queryDocuments<T = Record<string, any>>(
  collection: string, 
  filters: any[], 
  compositeOp: 'AND' | 'OR' = 'AND',
  token?: string,
  env?: any
): Promise<T[]> {
  const { projectId, databaseId, apiKey } = getFirestoreConfig(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;
  
  const query = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        compositeFilter: {
          op: compositeOp,
          filters: filters.map(f => ({
            fieldFilter: {
              field: { fieldPath: f.field },
              op: f.op,
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

  if (!res.ok) throw new Error(`Firestore Query Error ${res.status}`);

  const results = await res.json();
  return results
    .filter((r: any) => r.document)
    .map((r: any) => ({
      id: r.document.name.split('/').pop(),
      ...documentFromFirestore(r.document)
    }));
}
