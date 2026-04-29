import { 
  FirestoreValue, 
  FirestoreFilter, 
  FirestoreConfig, 
  getFirestoreConfig,
  valueToFirestore,
  valueFromFirestore,
  documentFromFirestore,
  objectToFirestoreFields
} from './firestore-types';

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || res.status >= 500) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return fetch(url, options);
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
    throw new Error(errMessage);
  }
  
  return documentFromFirestore(await res.json()) as T;
}

export async function setDocument(collection: string, id: string, data: Record<string, any>, token?: string | null, env?: any): Promise<any> {
  const { baseUrl, apiKey } = getFirestoreConfig(env);
  const fields: Record<string, FirestoreValue> = {};
  const fieldPaths: string[] = [];
  
  for (const [k, v] of Object.entries(data)) {
    fields[k] = valueToFirestore(v);
    fieldPaths.push(k);
  }
  
  // CRITICAL: We MUST use updateMask, otherwise Firestore deletes all fields NOT in this request!
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
  
  const result = documentFromFirestore(await res.json());
  const id = (result as any).name?.split('/').pop() || '';
  return { id, ...result } as T & { id: string };
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
  return updateDocument('users', uid, { 
    ...data, 
    adminSecret: process.env.INTERNAL_SECRET 
  });
}

export async function incrementField(collection: string, id: string, field: string, amount: number, token?: string, env?: any): Promise<any> {
  const { projectId, databaseId, apiKey } = getFirestoreConfig(env);
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is not defined in environment variables.');
  }

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
