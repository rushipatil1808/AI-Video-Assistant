from langchain_mistralai import ChatMistralAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

import os 

def get_llm():
    return ChatMistralAI(model = "mistral-small-latest", mistral_api_key = os.getenv("MISTRAL_API_KEY"),temperature=0.3)


def summarize(transcript : str) -> str:
    llm = get_llm()

    # Limit transcript size for maximum speed and token efficiency
    truncated_transcript = transcript[:15000]

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are an expert meeting summarizer. Provide a concise, highly detailed, and professional summary of the provided transcript.\n\n"
            "Format the output strictly using Markdown bullet points. Categorize points logically (e.g., Main Topics, Key Takeaways)."
        ),
        ("human", "{text}"),
    ])

    chain = prompt | llm | StrOutputParser()
    return chain.invoke({"text": truncated_transcript})

def generate_title(transcript : str) -> str:
    llm = get_llm()

    

    title_chain = (
        RunnablePassthrough() | RunnableLambda(lambda x:{"text":x}) | 
        ChatPromptTemplate.from_messages([
             (
                "system",
                "Based on the meeting transcript, generate a short professional meeting title "
                "(max 8 words). Only return the title, nothing else.",
            ),
            ("human", "{text}"),
        ])
        | llm
        |StrOutputParser()
    )

    return title_chain.invoke(transcript[:2000])




