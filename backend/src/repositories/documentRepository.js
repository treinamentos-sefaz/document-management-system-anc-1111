const documents = new Map();

function addDocument(document) {
  const storedDocument = Object.freeze({ ...document });
  documents.set(storedDocument.id, storedDocument);
  return { ...storedDocument };
}

function listByOwner(owner) {
  return [...documents.values()]
    .filter((document) => document.owner === owner)
    .sort((left, right) => (
      right.uploadedAt.localeCompare(left.uploadedAt)
      || left.id.localeCompare(right.id)
    ))
    .map((document) => ({ ...document }));
}

function findById(id) {
  const document = documents.get(id);
  return document ? { ...document } : null;
}

module.exports = { addDocument, listByOwner, findById };