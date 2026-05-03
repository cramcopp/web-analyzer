import {
  addDocument,
  addDocumentAdmin,
  createDocumentWithId,
  createDocumentWithIdAdmin,
  getDocument,
  getDocumentAdmin,
  hasFirestoreAdminCredentials,
  queryDocuments,
  queryDocumentsAdmin,
  setDocument,
  setDocumentAdmin,
  updateDocument,
  updateDocumentAdmin,
} from './firestore-edge';

export function canUseFirestoreAdmin(env?: any) {
  return hasFirestoreAdminCredentials(env);
}

export async function createServerDocumentWithId(
  collection: string,
  id: string,
  data: Record<string, any>,
  userToken?: string | null,
  env?: any
) {
  if (canUseFirestoreAdmin(env)) {
    return createDocumentWithIdAdmin(collection, id, data, env);
  }

  return createDocumentWithId(collection, id, data, userToken, env);
}

export async function addServerDocument<T = Record<string, any>>(
  collection: string,
  data: Record<string, any>,
  userToken?: string | null,
  env?: any
) {
  if (canUseFirestoreAdmin(env)) {
    return addDocumentAdmin<T>(collection, data, env);
  }

  return addDocument<T>(collection, data, userToken, env);
}

export async function getServerDocument<T = Record<string, any>>(
  collection: string,
  id: string,
  userToken?: string | null,
  env?: any
) {
  if (canUseFirestoreAdmin(env)) {
    return getDocumentAdmin<T>(collection, id, env);
  }

  return getDocument<T>(collection, id, userToken, env);
}

export async function setServerDocument(
  collection: string,
  id: string,
  data: Record<string, any>,
  updateMask?: string[] | null,
  userToken?: string | null,
  env?: any
) {
  if (canUseFirestoreAdmin(env)) {
    return setDocumentAdmin(collection, id, data, updateMask, env);
  }

  return setDocument(collection, id, data, updateMask, userToken, env);
}

export async function updateServerDocument(
  collection: string,
  id: string,
  data: Record<string, any>,
  userToken?: string | null,
  env?: any
) {
  if (canUseFirestoreAdmin(env)) {
    return updateDocumentAdmin(collection, id, data, env);
  }

  return updateDocument(collection, id, data, userToken, env);
}

export async function queryServerDocuments<T = Record<string, any>>(
  collection: string,
  filters: any[],
  compositeOp: 'AND' | 'OR' = 'AND',
  userToken?: string | null,
  env?: any
) {
  if (canUseFirestoreAdmin(env)) {
    return queryDocumentsAdmin<T>(collection, filters, compositeOp, env);
  }

  return queryDocuments<T>(collection, filters, compositeOp, userToken, env);
}
