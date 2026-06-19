"""One-shot ingest: parse PDF(s) -> chunk -> embed (Nebius) -> upsert to Pinecone.

Usage:

    # Default: ingest every PDF in backend/policies/
    python -m arena_core.policy.ingest

    # Or pass a specific file or directory
    python -m arena_core.policy.ingest path/to/file.pdf
    python -m arena_core.policy.ingest path/to/dir/
"""
from __future__ import annotations

import sys
from pathlib import Path

from .. import config

# Default location: backend/policies/
_DEFAULT_DIR = Path(__file__).resolve().parents[2] / "policies"


def _get_pinecone_index():
    from pinecone import Pinecone, ServerlessSpec

    pc = Pinecone(api_key=config.PINECONE_API_KEY)
    existing = {i["name"] for i in pc.list_indexes()}
    if config.PINECONE_INDEX not in existing:
        pc.create_index(
            name=config.PINECONE_INDEX,
            dimension=config.EMBEDDING_DIM,
            metric="cosine",
            spec=ServerlessSpec(
                cloud=config.PINECONE_CLOUD,
                region=config.PINECONE_REGION,
            ),
        )
    return pc.Index(config.PINECONE_INDEX)


def _embed_model():
    from llama_index.embeddings.openai import OpenAIEmbedding

    return OpenAIEmbedding(
        api_key=config.OPENAI_API_KEY,
        model=config.EMBEDDING_MODEL,
        dimensions=config.EMBEDDING_DIM,
    )


def _resolve_pdfs(target: Path) -> list[Path]:
    if target.is_dir():
        pdfs = sorted(p for p in target.iterdir() if p.suffix.lower() == ".pdf")
        if not pdfs:
            raise FileNotFoundError(f"No PDFs found in directory: {target}")
        return pdfs
    if target.is_file():
        return [target]
    raise FileNotFoundError(f"Policy path not found: {target}")


def ingest(pdf_path: str | Path | None = None) -> None:
    from llama_index.core import SimpleDirectoryReader, StorageContext, VectorStoreIndex
    from llama_index.core.node_parser import SentenceSplitter
    from llama_index.vector_stores.pinecone import PineconeVectorStore

    target = Path(pdf_path) if pdf_path else _DEFAULT_DIR
    pdfs = _resolve_pdfs(target)

    print(f"[ingest] loading {len(pdfs)} file(s):")
    for p in pdfs:
        print(f"          - {p}")
    docs = SimpleDirectoryReader(input_files=[str(p) for p in pdfs]).load_data()

    print(f"[ingest] connecting to Pinecone index '{config.PINECONE_INDEX}'")
    index_handle = _get_pinecone_index()

    # Clear so re-runs are idempotent.
    try:
        index_handle.delete(delete_all=True)
        print("[ingest] cleared existing vectors")
    except Exception as e:
        print(f"[ingest] could not clear index (ok on first run): {e}")

    vector_store = PineconeVectorStore(pinecone_index=index_handle)
    storage = StorageContext.from_defaults(vector_store=vector_store)
    splitter = SentenceSplitter(chunk_size=512, chunk_overlap=64)

    print("[ingest] embedding + upserting...")
    VectorStoreIndex.from_documents(
        docs,
        transformations=[splitter],
        embed_model=_embed_model(),
        storage_context=storage,
    )
    print("[ingest] done")


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    ingest(arg)
