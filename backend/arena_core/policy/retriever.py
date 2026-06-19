"""Query time: embed question, fetch top-k passages, return raw text.

Claude (the MCP client) turns the passages into the final answer; no LLM
runs in this pipeline.
"""
from __future__ import annotations

from functools import lru_cache

from .. import config


@lru_cache(maxsize=1)
def _index():
    from llama_index.core import VectorStoreIndex
    from llama_index.embeddings.openai import OpenAIEmbedding
    from llama_index.vector_stores.pinecone import PineconeVectorStore
    from pinecone import Pinecone

    pc = Pinecone(api_key=config.PINECONE_API_KEY)
    index_handle = pc.Index(config.PINECONE_INDEX)

    embed = OpenAIEmbedding(
        api_key=config.OPENAI_API_KEY,
        model=config.EMBEDDING_MODEL,
        dimensions=config.EMBEDDING_DIM,
    )
    vector_store = PineconeVectorStore(pinecone_index=index_handle)
    return VectorStoreIndex.from_vector_store(vector_store, embed_model=embed)


def query(question: str, top_k: int = 4) -> str:
    nodes = _index().as_retriever(similarity_top_k=top_k).retrieve(question)
    if not nodes:
        return "(No matching policy passages found.)"
    return "\n\n---\n\n".join(n.get_content() for n in nodes)
