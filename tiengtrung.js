// tiengtrung.js - Xử lý dịch thuật tiếng Trung (Trung-Việt, Việt-Trung)
// ========== CẤU HÌNH CLOUDFLARE WORKER ==========
const MODEL_NAME_CN = "llama3-70b-8192";
const WORKER_URL = "https://dichthuatdulich.cuongprovuidulieu.workers.dev";

async function callApi_CN(prompt) {
    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL_NAME_CN,
                messages: [
                    {
                        role: "system",
                        content: `Bạn là công cụ dịch thuật. CHỈ trả về câu đã dịch, KHÔNG giải thích.`
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
            translated = translated.replace(/^(dịch|translation|translate|kết quả|result|answer|double-checking):\s*/i, '');
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
let recognitionTrungViet = null;
let recognitionVietTrung = null;
let isListeningTrung = false;
let isListeningVietTrung = false;

let trungVietCallback = null;
let vietTrungCallback = null;

async function translateChinese(text, sourceLang, targetLang) {
    let prompt = "";
    if (sourceLang === "Chinese" && targetLang === "Vietnamese") {
        prompt = `Dịch câu sau từ tiếng Trung sang tiếng Việt. CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG VIỆT:\n\nTiếng Trung: ${text}\n\nTiếng Việt:`;
    } else {
        prompt = `Dịch câu sau từ tiếng Việt sang tiếng Trung. CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG TRUNG:\n\nTiếng Việt: ${text}\n\nTiếng Trung:`;
    }
    return await callApi_CN(prompt);
}

function createRecognitionChinese(langCode, onResult, onEnd) {
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

    recognition.onstart = () => {
        console.log(`Bắt đầu nghe ${langCode}`);
    };

    recognition.onresult = async (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }
        
        if (finalTranscript && onResult) {
            console.log(`Nhận dạng Trung: ${finalTranscript}`);
            await onResult(finalTranscript);
        }
    };
    
    recognition.onerror = (event) => {
        console.error("Recognition Trung error:", event.error);
        if (event.error === 'not-allowed') {
            alert("Vui lòng cho phép microphone để dịch tiếng Trung!");
        }
        if (onEnd) onEnd();
    };
    
    recognition.onend = () => {
        console.log(`Kết thúc nghe ${langCode}`);
        if (onEnd) onEnd();
    };
    
    return recognition;
}

window.stopTrungVietListening = () => {
    if (recognitionTrungViet) {
        try { recognitionTrungViet.stop(); } catch(e) {}
        recognitionTrungViet = null;
    }
    isListeningTrung = false;
};

window.stopVietTrungListening = () => {
    if (recognitionVietTrung) {
        try { recognitionVietTrung.stop(); } catch(e) {}
        recognitionVietTrung = null;
    }
    isListeningVietTrung = false;
};

window.startListeningTrungViet = async (callback) => {
    if (isListeningTrung) return;
    if (recognitionTrungViet) { try { recognitionTrungViet.stop(); } catch(e) {} recognitionTrungViet = null; }
    trungVietCallback = callback;
    const onResultHandler = async (spokenChinese) => {
        const vietText = await translateChinese(spokenChinese, "Chinese", "Vietnamese");
        if (trungVietCallback) trungVietCallback(spokenChinese, vietText);
    };
    const onEndHandler = () => {
        if (isListeningTrung) setTimeout(() => window.startListeningTrungViet(trungVietCallback), 500);
    };
    recognitionTrungViet = createRecognitionChinese("zh-CN", onResultHandler, onEndHandler);
    if (recognitionTrungViet) { recognitionTrungViet.start(); isListeningTrung = true; }
};

window.startListeningVietTrung = async (callback) => {
    if (isListeningVietTrung) return;
    if (recognitionVietTrung) { try { recognitionVietTrung.stop(); } catch(e) {} recognitionVietTrung = null; }
    vietTrungCallback = callback;
    const onResultHandler = async (spokenViet) => {
        const chineseText = await translateChinese(spokenViet, "Vietnamese", "Chinese");
        if (vietTrungCallback) vietTrungCallback(spokenViet, chineseText);
    };
    const onEndHandler = () => {
        if (isListeningVietTrung) setTimeout(() => window.startListeningVietTrung(vietTrungCallback), 500);
    };
    recognitionVietTrung = createRecognitionChinese("vi-VN", onResultHandler, onEndHandler);
    if (recognitionVietTrung) { recognitionVietTrung.start(); isListeningVietTrung = true; }
};

console.log("tiengtrung.js đã sẵn sàng");