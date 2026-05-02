export const runtime = 'nodejs';

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

function valueFromFirestore(v: any): any {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) {
    const res: Record<string, any> = {};
    const fields = v.mapValue.fields || {};
    for (const [mk, mv] of Object.entries(fields)) {
      res[mk] = valueFromFirestore(mv);
    }
    return res;
  }
  if ('arrayValue' in v) {
    const values = v.arrayValue.values || [];
    return values.map(valueFromFirestore);
  }
  return v;
}

function getFirestoreConfig(env?: any) {
  const projectId = env?.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const apiKey = env?.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const databaseId = env?.FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || '(default)';

  if (!projectId || !apiKey) {
    throw new Error('Firebase configuration missing');
  }

  return {
    projectId,
    apiKey,
    databaseId,
    baseUrl: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`
  };
}

// --- EXPORTED FUNCTIONS ---

export { fetchWithRetry };

export async function getDocument<T = Record<string, any>>(collection: string, id: string, token?: string | null, env?: any): Promise<T | null> {
  try {
    const { baseUrl, apiKey } = getFirestoreConfig(env);
    const url = `${baseUrl}/${collection}/${id}?key=${apiKey}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetchWithRetry(url, { headers });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Firestore Error ${res.status}`);
    return documentFromFirestore(await res.json()) as T;
  } catch { return null; }
}

export async function setDocument(collection: string, id: string, data: Record<string, any>, updateMask?: string[] | null, token?: string | null, env?: any): Promise<any> {
  const { baseUrl, apiKey } = getFirestoreConfig(env);
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = valueToFirestore(v);

  let url = `${baseUrl}/${collection}/${id}?key=${apiKey}`;
  if (updateMask && updateMask.length > 0) {
    url += `&${updateMask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithRetry(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!res.ok) throw new Error(`Firestore Error ${res.status}: ${await res.text()}`);
  return documentFromFirestore(await res.json());
}

export async function addDocument<T = Record<string, any>>(collection: string, data: Record<string, any>, token?: string | null, env?: any): Promise<T & { id: string }> {
  const { baseUrl, apiKey } = getFirestoreConfig(env);
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = valueToFirestore(v);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithRetry(`${baseUrl}/${collection}?key=${apiKey}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!res.ok) throw new Error(`Firestore Error ${res.status}`);
  const result = await res.json();
  const id = result.name.split('/').pop();
  return { ...documentFromFirestore(result), id } as any;
}

export async function updateDocument(collection: string, id: string, data: Record<string, any>, token?: string | null, env?: any): Promise<any> {
  return setDocument(collection, id, data, Object.keys(data), token, env);
}

export async function deleteDocument(collection: string, id: string, token?: string | null, env?: any): Promise<void> {
  const { baseUrl, apiKey } = getFirestoreConfig(env);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithRetry(`${baseUrl}/${collection}/${id}?key=${apiKey}`, { 
    method: 'DELETE',
    headers
  });
  if (!res.ok) throw new Error(`Firestore Error ${res.status}`);
}

export async function queryDocuments<T = Record<string, any>>(collection: string, filters: any[], compositeOp: 'AND' | 'OR' = 'AND', token?: string | null, env?: any): Promise<T[]> {
  const { projectId, databaseId, apiKey } = getFirestoreConfig(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;
  
  const mapOp = (op: string) => {
    switch (op) {
      case '==': case 'EQUAL': return 'EQUAL';
      case '>': case 'GREATER_THAN': return 'GREATER_THAN';
      case '<': case 'LESS_THAN': return 'LESS_THAN';
      case '>=': case 'GREATER_THAN_OR_EQUAL': return 'GREATER_THAN_OR_EQUAL';
      case '<=': case 'LESS_THAN_OR_EQUAL': return 'LESS_THAN_OR_EQUAL';
      case 'array-contains': case 'ARRAY_CONTAINS': return 'ARRAY_CONTAINS';
      case 'in': case 'IN': return 'IN';
      default: return op;
    }
  };

  const query = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        compositeFilter: {
          op: compositeOp,
          filters: filters.map(f => ({
            fieldFilter: { field: { fieldPath: f.field }, op: mapOp(f.op), value: valueToFirestore(f.value) }
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
  return results.filter((r: any) => r.document).map((r: any) => ({
    ...documentFromFirestore(r.document),
    id: r.document.name.split('/').pop()
  }));
}

export async function incrementField(collection: string, id: string, field: string, amount: number, token?: string | null, env?: any): Promise<void> {
  const doc = await getDocument(collection, id, token, env);
  const currentVal = (doc as any)?.[field] || 0;
  await setDocument(collection, id, { [field]: currentVal + amount }, [field], token, env);
}

export async function updateStripeSubscription(userId: string, data: Record<string, any>, env?: any): Promise<void> {
  await setDocument('users', userId, {
    ...data,
    lastScanReset: new Date().toISOString()
  }, Object.keys(data).concat(['lastScanReset']), null, env);
}
