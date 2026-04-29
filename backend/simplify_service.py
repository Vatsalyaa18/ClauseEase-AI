from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

MODEL_NAME = "google/flan-t5-small"  # use small first for stability

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print("Loading FLAN-T5 model...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME).to(device)
print("Model loaded successfully.")

LEGAL_TERMS = {
    "indemnify": "To protect someone from financial loss or damage.",
    "breach": "Breaking a rule or condition of a contract.",
    "arbitration": "Resolving disputes outside court using a neutral person.",
    "liability": "Legal responsibility for something.",
    "notwithstanding": "Despite something mentioned earlier.",
    "herein": "In this document.",
    "whereas": "Considering that.",
    "terminate": "To officially end an agreement.",
    "confidential": "Information that must be kept secret.",
    "obligation": "A duty or responsibility."
}

def generate_text(prompt, max_tokens=220):
    
    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=1024
    ).to(device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            num_beams=2,
            no_repeat_ngram_size=3,
            repetition_penalty=1.2,
            length_penalty=1.1,
            early_stopping=True
    )

    return tokenizer.decode(outputs[0], skip_special_tokens=True)


def simplify_text(text, level="basic"):
    
    if level == "basic":

        instruction = """
Rewrite the legal text in simpler English while keeping the meaning the same.

Rules:
- Keep the meaning exactly the same
- Break long sentences into simpler ones
- Replace legal jargon with common words
- Keep the explanation concise
- Do NOT remove important information
- Write at least 4-6 clear sentences
"""

    elif level == "intermediate":

        instruction = """
Rewrite the legal text in very clear English.
Break complex sentences into shorter ones.
Make it easier for an average reader to understand.
Use easier sentences and simpler vocabulary.
Explain legal phrases if necessary.
Write at least 10-15 sentences to ensure clarity.
"""

    elif level == "advanced":

        instruction = """
Rewrite the legal text so that someone with no legal background can understand it.
Explain legal terms in plain English clearly.
Use very simple sentences.
Make the explanation detailed.
Provide a more detailed explanation of the clause.
"""

    prompt = f"""
You are a legal document simplifier.

{instruction}

Legal Text:
{text}

Simplified Version:
"""

    return generate_text(prompt, max_tokens=350)

def summarize_text(text):
    if not text:
        return ""

    prompt = f"Summarize the following document in 5 sentences:\n\n{text}"
    return generate_text(prompt, max_tokens=150)

def extract_legal_terms(text):
    found_terms = {}

    words = text.lower().split()

    for term, meaning in LEGAL_TERMS.items():
        if term in words:
            found_terms[term] = meaning

    return found_terms