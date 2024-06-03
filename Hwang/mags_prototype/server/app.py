from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, BartForConditionalGeneration
import torch

app = Flask(__name__)
CORS(app)  # CORS 설정 추가

# 모델과 토크나이저 경로 설정
model_path = "..\..\Similar_bart_prototype_model"
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 모델과 토크나이저 불러오기
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = BartForConditionalGeneration.from_pretrained(model_path).to(device)

BOS = tokenizer.bos_token
EOS = tokenizer.eos_token
PAD = tokenizer.pad_token
replacements = {BOS: "", EOS: "", PAD: ""}

def generate_sequence(context, model, tokenizer, device, num_sequences=5):
    try:
        print("Tokenizing input...")
        input_ids = tokenizer.encode(BOS + context + EOS, return_tensors="pt").to(device)
        print("Generating output sequences...")
        output_sequences = model.generate(
            input_ids=input_ids,
            max_length=1024,
            temperature=0.7,
            top_k=5,
            top_p=0.9,
            repetition_penalty=2.0,
            do_sample=True,
            num_return_sequences=num_sequences
        )
        print("Decoding output sequences...")
        generated_sequences = []
        for generated_sequence in output_sequences:
            decoded_text = tokenizer.decode(generated_sequence, skip_special_tokens=True)
            generated_sequences.append(decoded_text)
        return generated_sequences
    except Exception as e:
        print("Error during sequence generation:", str(e))
        return []

def multiple_replace(text, replacements):
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text

@app.route('/transform', methods=['POST'])
def transform_text():
    try:
        data = request.json
        context = data.get('text', '')
        print("Received context:", context)  # 디버깅을 위한 출력
        generated_sentences = generate_sequence(context, model, tokenizer, device, num_sequences=3)
        if not generated_sentences:
            raise Exception("No generated sentences returned.")
        cleaned_sentences = [multiple_replace(sentence, replacements) for sentence in generated_sentences]
        print("Generated sentences:", cleaned_sentences)  # 디버깅을 위한 출력
        return jsonify({'generated_texts': cleaned_sentences})
    except Exception as e:
        print("Error:", str(e))  # 디버깅을 위한 출력
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)
