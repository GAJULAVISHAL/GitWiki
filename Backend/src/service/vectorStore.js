import { createHash } from "node:crypto";
import { Pinecone } from "@pinecone-database/pinecone";

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const UPSERT_BATCH_SIZE = 96;
const DEFAULT_TOP_K = 5;

function repoToNamespace(repo) {
  return repo.replace("/", "-");
}

function getIndex(namespace) {
  const indexName = process.env.PINECONE_INDEX || "git-wiki";
  return pc.index({ name: indexName }).namespace(namespace);
}

function normalizeDocuments(documents) {
  return documents
    .map((doc) => ({
      pageContent: typeof doc.pageContent === "string" ? doc.pageContent : "",
      metadata: doc.metadata ?? {},
    }))
    .filter((doc) => doc.pageContent.trim().length > 0);
}

function buildRecordId(repo, metadata, content) {
  return createHash("sha256")
    .update(`${repo}:${metadata.path ?? ""}:${content}`)
    .digest("hex");
}

export async function saveChunks(repo, documents) {
  const chunks = normalizeDocuments(documents);

  if (!chunks.length) {
    return { saved: false, chunkCount: 0 };
  }

  const namespace = repoToNamespace(repo);
  const index = getIndex(namespace);
  const documentRecords = chunks.map((doc) => ({
    _id: buildRecordId(repo, doc.metadata, doc.pageContent),
    chunk_text: doc.pageContent,
    content: doc.pageContent,
    path: doc.metadata.path ?? "",
    repo: doc.metadata.repo ?? repo,
  }));

  for (let i = 0; i < documentRecords.length; i += UPSERT_BATCH_SIZE) {
    await index.documents.upsert({
      documents: documentRecords.slice(i, i + UPSERT_BATCH_SIZE),
    });
  }

  return { saved: true, chunkCount: chunks.length };
}

function toSearchDocument(match) {
  return {
    pageContent: match.content ?? "",
    metadata: {
      path: match.path,
      repo: match.repo,
    },
    score: match._score,
  };
}

export async function search(repo, question, topK = DEFAULT_TOP_K) {
  const namespace = repoToNamespace(repo);
  const index = getIndex(namespace);

  const response = await index.documents.search({
    scoreBy: [{ type: "embed", field: "chunk_text", query: question }],
    topK,
    includeFields: ["content", "path", "repo"],
  });

  if ((response.matches ?? []).some((match) => !match.content)) {
    throw new Error(
      "Pinecone returned matches without content. Re-index the repository so the stored content field is available for retrieval.",
    );
  }

  return (response.matches ?? [])
    .map(toSearchDocument)
    .filter((doc) => doc.pageContent.trim().length > 0);
}