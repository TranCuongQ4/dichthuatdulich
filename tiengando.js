// tiengando.js - Xử lý dịch thuật tiếng Ấn Độ (Hindi)
// ========== CẤU HÌNH CLOUDFLARE WORKER ==========
const MODEL_NAME_HI = "llama3-70b-8192";
const WORKER_URL = "https://dichthuatdulich.cuongprovuidulieu.workers.dev";

async function callApi_HI(prompt) {
    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL_NAME_HI,
                messages: [
                    {
                        role: "system",
                        content: `Bạn là công cụ dịch thuật. KHÔNG giải thích, CHỈ trả về câu đã dịch.`
                    },
                    { role: "user", content: prompt }
                ],
                temperature: 0,
                max_tokens: 300
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Worker error:", errorData);
            return `[Lỗi ${response.status}]`;
        }
        
        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            let translated = data.choices[0].message.content.trim();
            translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '');
            translated = translated.replace(/^(dịch|translation|translate|kết quả|answer|double-checking):\s*/i, '');
            translated = translated.replace(/^["']|["']$/g, '');
            if (translated.includes('\n')) translated = translated.split('\n').pop().trim();
            return translated;
        }
        return "[Lỗi dịch]";
    } catch (err) {
        console.error("API error:", err);
        return "[Lỗi kết nối]";
    }
}

// ========== PHẦN CODE GỐC ==========
let recognitionAnDoViet = null;
let recognitionVietAnDo = null;
let isListeningAnDo = false;
let isListeningVietAnDo = false;
let anDoVietCallback = null;
let vietAnDoCallback = null;

async function translateHindi(text, sourceLang, targetLang) {
    let prompt = "";
    if (sourceLang === "Hindi" && targetLang === "Vietnamese") {
        prompt = `Dịch từ Hindi sang Việt. CHỈ TRẢ VỀ CÂU TIẾNG VIỆT:\n\nHindi: ${text}\n\nTiếng Việt:`;
    } else {
        prompt = `Dịch từ Việt sang Hindi. CHỈ TRẢ VỀ CÂU TIẾNG HINDI:\n\nTiếng Việt: ${text}\n\nHindi:`;
    }
    return await callApi_HI(prompt);
}

function createRecognitionHindi(langCode, onResult, onEnd) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Trình duyệt không hỗ trợ nhận diện giọng nói!");
        return null;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = langCode;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => console.log(`Bắt đầu nghe ${langCode}`);
    recognition.onresult = async (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript && onResult) await onResult(finalTranscript);
    };
    recognition.onerror = (event) => {
        if (event.error === 'not-allowed') alert("Vui lòng cho phép microphone!");
        if (onEnd) onEnd();
    };
    recognition.onend = () => { if (onEnd) onEnd(); };
    return recognition;
}

window.stopAnDoVietListening = () => {
    if (recognitionAnDoViet) { try { recognitionAnDoViet.stop(); } catch(e) {} recognitionAnDoViet = null; }
    isListeningAnDo = false;
};

window.stopVietAnDoListening = () => {
    if (recognitionVietAnDo) { try { recognitionVietAnDo.stop(); } catch(e) {} recognitionVietAnDo = null; }
    isListeningVietAnDo = false;
};

window.startListeningAnDoViet = async (callback) => {
    if (isListeningAnDo) return;
    if (recognitionAnDoViet) { try { recognitionAnDoViet.stop(); } catch(e) {} recognitionAnDoViet = null; }
    anDoVietCallback = callback;
    const onResultHandler = async (spokenHindi) => {
        const vietText = await translateHindi(spokenHindi, "Hindi", "Vietnamese");
        if (anDoVietCallback) anDoVietCallback(spokenHindi, vietText);
    };
    const onEndHandler = () => {
        if (isListeningAnDo) setTimeout(() => window.startListeningAnDoViet(anDoVietCallback), 500);
    };
    recognitionAnDoViet = createRecognitionHindi("hi-IN", onResultHandler, onEndHandler);
    if (recognitionAnDoViet) { recognitionAnDoViet.start(); isListeningAnDo = true; }
};

window.startListeningVietAnDo = async (callback) => {
    if (isListeningVietAnDo) return;
    if (recognitionVietAnDo) { try { recognitionVietAnDo.stop(); } catch(e) {} recognitionVietAnDo = null; }
    vietAnDoCallback = callback;
    const onResultHandler = async (spokenViet) => {
        const hindiText = await translateHindi(spokenViet, "Vietnamese", "Hindi");
        if (vietAnDoCallback) vietAnDoCallback(spokenViet, hindiText);
    };
    const onEndHandler = () => {
        if (isListeningVietAnDo) setTimeout(() => window.startListeningVietAnDo(vietAnDoCallback), 500);
    };
    recognitionVietAnDo = createRecognitionHindi("vi-VN", onResultHandler, onEndHandler);
    if (recognitionVietAnDo) { recognitionVietAnDo.start(); isListeningVietAnDo = true; }
};

console.log("tiengando.js đã sẵn sàng");