import pytest
from typing import List, Optional
from pydantic import BaseModel

# ==============================================================================
# 1. 定义具备溯源能力的输出结构
# ==============================================================================

class Citation(BaseModel):
    source_id: str
    quote: str        # 引用原文的具体片段
    start_idx: int    # 在原文中的起始位置
    end_idx: int      # 在原文中的结束位置

class GroundedResponse(BaseModel):
    answer: str
    citations: List[Citation]

# ==============================================================================
# 2. 模拟 RAG 智能体 (Retrieval-Augmented Generation)
# ==============================================================================

class MedicalRAGAgent:
    def __init__(self):
        # 模拟知识库内容
        self.knowledge_base = {
            "doc_001": "Paracetamol is indicated for the relief of mild to moderate pain."
        }

    def answer_question(self, question: str) -> GroundedResponse:
        # 实际开发中，这里会调用 LLM + 检索工具（如 LlamaIndex 或 Instructor）
        if "paracetamol" in question.lower():
            return GroundedResponse(
                answer="Paracetamol is used for treating moderate pain [1].",
                citations=[
                    Citation(
                        source_id="doc_001",
                        quote="relief of mild to moderate pain",
                        start_idx=35,
                        end_idx=64
                    )
                ]
            )
        return GroundedResponse(answer="I don't know.", citations=[])

# ==============================================================================
# 3. 自动化测试套件
# ==============================================================================

@pytest.fixture
def rag_agent():
    return MedicalRAGAgent()

def test_answer_includes_verifiable_citations(rag_agent):
    """
    核心断言：AI 的回答必须包含至少一个可解析到具体片段（Span）的引用。
    """
    # 1. 执行
    question = "What is paracetamol used for?"
    response = rag_agent.answer_question(question)
    
    # 2. 断言 1: 引用列表不为空
    assert len(response.citations) > 0, "AI output must include at least one citation."
    
    # 3. 断言 2: 验证引用片段（Span）的真实性
    # 检查 AI 提取的 quote 是否真的存在于它声称的数据源中
    for citation in response.citations:
        source_content = rag_agent.knowledge_base.get(citation.source_id)
        assert source_content is not None, f"Source {citation.source_id} not found."
        
        # 核心：Span 验证 (Verifiable Grounding)
        assert citation.quote in source_content, \
            f"Hallucination Detected: Quote '{citation.quote}' does not exist in source."
        
        # 验证索引是否准确
        extracted_text = source_content[citation.start_idx : citation.end_idx]
        assert extracted_text == citation.quote, "Span indices do not match the quote text."

    print(f"\nVerified Grounding: {len(response.citations)} valid citations found.")
