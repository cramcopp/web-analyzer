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

type FirestoreConfigOptions = {
  requireApiKey?: boolean;
};

type ServiceAccountJson = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

let serviceAccountTokenCache: { cacheKey: string; token: string; expiresAt: number } | null = null;

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

function getFirestoreConfig(env?: any, options: FirestoreConfigOptions = {}) {
  const requireApiKey = options.requireApiKey !== false;
  const projectId = env?.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const apiKey = env?.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const databaseId = env?.FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || '(default)';

  if (!projectId || (requireApiKey && !apiKey)) {
    throw new Error('Firebase configuration missing');
  }

  return {
    projectId,
    apiKey,
    databaseId,
    baseUrl: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`
  };
}

function parseServiceAccount(env?: any): ServiceAccountJson | null {
  const raw = env?.GOOGLE_SERVICE_ACCOUNT_JSON || env?.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || typeof raw !== 'string') return null;

  try {
    const parsed = JSON.parse(raw) as ServiceAccountJson;
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      ...parsed,
      private_key: parsed.private_key.replace(/\\n/g, '\n'),
      token_uri: parsed.token_uri || 'https://oauth2.googleapis.com/token',
    };
  } catch {
    return null;
  }
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function textToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64ToBytes(value: string) {
  const binary = atob(value.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importPrivateKey(privateKeyPem: string) {
  const cleaned = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  return crypto.subtle.importKey(
    'pkcs8',
    base64ToBytes(cleaned),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function getServiceAccountAccessToken(env?: any) {
  const serviceAccount = parseServiceAccount(env);
  if (!serviceAccount) throw new Error('Firestore admin service account missing');

  const now = Math.floor(Date.now() / 1000);
  const cacheKey = serviceAccount.client_email;
  if (serviceAccountTokenCache?.cacheKey === cacheKey && serviceAccountTokenCache.expiresAt - 60 > now) {
    return serviceAccountTokenCache.token;
  }

  const tokenUri = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token';
  const header = textToBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = textToBase64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  }));
  const unsignedJwt = `${header}.${claimSet}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(unsignedJwt)
  );
  const assertion = `${unsignedJwt}.${bytesToBase64Url(new Uint8Array(signature))}`;

  const response = await fetchWithRetry(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) throw new Error(`Service account token exchange failed ${response.status}: ${await response.text()}`);
  const data = await response.json();
  serviceAccountTokenCache = {
    cacheKey,
    token: data.access_token,
    expiresAt: now + Number(data.expires_in || 3600),
  };
  return data.access_token as string;
}

async function getAdminHeaders(env?: any) {
  const token = await getServiceAccountAccessToken(env);
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function hasFirestoreAdminCredentials(env?: any) {
  return Boolean(parseServiceAccount(env));
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

export async function getDocumentAdmin<T = Record<string, any>>(collection: string, id: string, env?: any): Promise<T | null> {
  const { baseUrl } = getFirestoreConfig(env, { requireApiKey: false });
  const res = await fetchWithRetry(`${baseUrl}/${collection}/${id}`, {
    headers: await getAdminHeaders(env)
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore Admin Error ${res.status}: ${await res.text()}`);
  return documentFromFirestore(await res.json()) as T;
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

export async function setDocumentAdmin(collection: string, id: string, data: Record<string, any>, updateMask?: string[] | null, env?: any): Promise<any> {
  const { baseUrl } = getFirestoreConfig(env, { requireApiKey: false });
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = valueToFirestore(v);

  let url = `${baseUrl}/${collection}/${id}`;
  if (updateMask && updateMask.length > 0) {
    url += `?${updateMask.map(p => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&')}`;
  }

  const res = await fetchWithRetry(url, {
    method: 'PATCH',
    headers: await getAdminHeaders(env),
    body: JSON.stringify({ fields })
  });

  if (!res.ok) throw new Error(`Firestore Admin Error ${res.status}: ${await res.text()}`);
  return documentFromFirestore(await res.json());
}

export async function createDocumentWithId<T = Record<string, any>>(collection: string, id: string, data: Record<string, any>, token?: string | null, env?: any): Promise<T> {
  const { baseUrl, apiKey } = getFirestoreConfig(env);
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = valueToFirestore(v);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithRetry(`${baseUrl}/${collection}?documentId=${encodeURIComponent(id)}&key=${apiKey}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!res.ok) throw new Error(`Firestore Error ${res.status}: ${await res.text()}`);
  return documentFromFirestore(await res.json()) as T;
}

export async function createDocumentWithIdAdmin<T = Record<string, any>>(collection: string, id: string, data: Record<string, any>, env?: any): Promise<T> {
  const { baseUrl } = getFirestoreConfig(env, { requireApiKey: false });
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = valueToFirestore(v);

  const res = await fetchWithRetry(`${baseUrl}/${collection}?documentId=${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: await getAdminHeaders(env),
    body: JSON.stringify({ fields })
  });

  if (!res.ok) throw new Error(`Firestore Admin Error ${res.status}: ${await res.text()}`);
  return documentFromFirestore(await res.json()) as T;
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

export async function addDocumentAdmin<T = Record<string, any>>(collection: string, data: Record<string, any>, env?: any): Promise<T & { id: string }> {
  const { baseUrl } = getFirestoreConfig(env, { requireApiKey: false });
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = valueToFirestore(v);

  const res = await fetchWithRetry(`${baseUrl}/${collection}`, {
    method: 'POST',
    headers: await getAdminHeaders(env),
    body: JSON.stringify({ fields })
  });

  if (!res.ok) throw new Error(`Firestore Admin Error ${res.status}: ${await res.text()}`);
  const result = await res.json();
  const id = result.name.split('/').pop();
  return { ...documentFromFirestore(result), id } as any;
}

export async function updateDocument(collection: string, id: string, data: Record<string, any>, token?: string | null, env?: any): Promise<any> {
  return setDocument(collection, id, data, Object.keys(data), token, env);
}

export async function updateDocumentAdmin(collection: string, id: string, data: Record<string, any>, env?: any): Promise<any> {
  return setDocumentAdmin(collection, id, data, Object.keys(data), env);
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

export async function queryDocumentsAdmin<T = Record<string, any>>(collection: string, filters: any[], compositeOp: 'AND' | 'OR' = 'AND', env?: any): Promise<T[]> {
  const { projectId, databaseId } = getFirestoreConfig(env, { requireApiKey: false });
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery`;

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

  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: await getAdminHeaders(env),
    body: JSON.stringify(query)
  });

  if (!res.ok) throw new Error(`Firestore Admin Query Error ${res.status}: ${await res.text()}`);
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
  const payload = {
    ...data,
    lastScanReset: new Date().toISOString()
  };

  if (hasFirestoreAdminCredentials(env)) {
    await updateDocumentAdmin('users', userId, payload, env);
    return;
  }

  await setDocument('users', userId, {
    ...payload,
    adminSecret: env?.INTERNAL_SECRET || process.env.INTERNAL_SECRET
  }, Object.keys(payload).concat(['adminSecret']), null, env);
}
