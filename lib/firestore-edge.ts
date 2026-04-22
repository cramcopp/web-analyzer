
/**
 * Lightweight Firestore REST client for Edge runtime.
 * Avoids the heavy overhead of the standard Firebase SDK.
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const API_KEY = process.env.FIREBASE_API_KEY;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

export interface FirestoreFilter {
  field: string;
  op: 'EQUAL' | 'GREATER_THAN' | 'LESS_THAN' | 'ARRAY_CONTAINS' | 'IN';
  value: any;
}

function valueToFirestore(value: any): any {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: value.toString() };
    return { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(valueToFirestore) } };
  if (typeof value === 'object') {
    const fields: any = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = valueToFirestore(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function valueFromFirestore(value: any): any {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(valueFromFirestore);
  if ('mapValue' in value) {
    const obj: any = {};
    const fields = value.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = valueFromFirestore(v);
    }
    return obj;
  }
  return null;
}

export async function getDocument(collection: string, id: string, token?: string) {
  const url = `${BASE_URL}/${collection}/${id}?key=${API_KEY}`;
  const headers: any = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Firestore Error ${res.status}`);
  }
  const data = await res.json();
  const fields = data.fields || {};
  const result: any = {};
  for (const [k, v] of Object.entries(fields)) {
    result[k] = valueFromFirestore(v);
  }
  return { id, ...result };
}

export async function setDocument(collection: string, id: string, data: any, token?: string) {
  const url = `${BASE_URL}/${collection}/${id}?key=${API_KEY}`;
  const fields: any = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = valueToFirestore(v);
  }
  
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Firestore Error ${res.status}`);
  }
  return await res.json();
}

export async function addDocument(collection: string, data: any, token?: string) {
  const url = `${BASE_URL}/${collection}?key=${API_KEY}`;
  const fields: any = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = valueToFirestore(v);
  }

  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Firestore Error ${res.status}`);
  }
  const result = await res.json();
  const nameParts = result.name.split('/');
  return { id: nameParts[nameParts.length - 1], ...data };
}

export async function queryDocuments(
  collection: string, 
  filters: FirestoreFilter[], 
  compositeOp: 'AND' | 'OR' = 'AND',
  token?: string
) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
  
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

  const query: any = {
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

  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(query)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Firestore Error ${res.status}`);
  }

  const results = await res.json();
  return (results || [])
    .filter((r: any) => r.document)
    .map((r: any) => {
      const doc = r.document;
      const fields = doc.fields || {};
      const data: any = {};
      for (const [k, v] of Object.entries(fields)) {
        data[k] = valueFromFirestore(v);
      }
      const nameParts = doc.name.split('/');
      return { id: nameParts[nameParts.length - 1], ...data };
    });
}

export async function updateDocument(collection: string, id: string, data: any, token?: string) {
  const fields: any = {};
  const fieldPaths: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    fields[k] = valueToFirestore(v);
    fieldPaths.push(k);
  }

  const mask = fieldPaths.map(p => `updateMask.fieldPaths=${p}`).join('&');
  const url = `${BASE_URL}/${collection}/${id}?${mask}&key=${API_KEY}`;

  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Firestore Error ${res.status}`);
  }
  return await res.json();
}

export async function deleteDocument(collection: string, id: string, token?: string) {
  const url = `${BASE_URL}/${collection}/${id}?key=${API_KEY}`;
  const headers: any = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Firestore Error ${res.status}`);
  }
  return true;
}

export async function updateStripeSubscription(uid: string, data: any) {
  // Webhooks use internal secret bypass or admin access if possible
  // For now, we'll assume the webhook has a way or we use a service account later
  return updateDocument('users', uid, data);
}
