// tiengmalai.js - Xử lý dịch thuật tiếng Malaysia
// ========== CẤU HÌNH CLOUDFLARE WORKER ==========
const MODEL_NAME_MS = "qwen/qwen3-32b";  // ✅ Giữ nguyên model cũ
const WORKER_URL = "https://dichthuatdulich.cuongprovuidulieu.workers.dev";

async function callApi_MS(prompt) {
    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL_NAME_MS,
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
            translated = translated.replace(/^(dịch|translation|translate|kết quả|answer):\s*/i, '');
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
let recognitionMalaiViet = null;
let recognitionVietMalai = null;
let isListeningMalai = false;
let isListeningVietMalai = false;
let malaiVietCallback = null;
let vietMalaiCallback = null;

async function translateMalay(text, sourceLang, targetLang) {
    let prompt = "";
    if (sourceLang === "Malay" && targetLang === "Vietnamese") {
        prompt = `Dịch từ Malaysia sang Việt:\n\nMalaysia: ${text}\n\nTiếng Việt:`;
    } else {
        prompt = `Dịch từ Việt sang Malaysia:\n\nTiếng Việt: ${text}\n\nMalaysia:`;
    }
    return await callApi_MS(prompt);
}

function getMalayVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find(voice => 
        voice.lang === 'ms-MY' || voice.lang === 'ms' || voice.lang.startsWith('ms-') ||
        voice.name.toLowerCase().includes('malay') || voice.name.toLowerCase().includes('malaysia')
    );
}

function speakMalay(text, showToastCallback) {
    if (!text || text.trim() === '') {
        if (showToastCallback) showToastCallback('⚠️ Không có nội dung để phát');
        return;
    }
    if (!window.speechSynthesis) {
        if (showToastCallback) showToastCallback('⚠️ Trình duyệt không hỗ trợ phát âm thanh');
        return;
    }
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const malayVoice = getMalayVoice();
        if (malayVoice) {
            utterance.voice = malayVoice;
            utterance.lang = malayVoice.lang;
        } else {
            utterance.lang = 'ms-MY';
        }
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.onerror = () => { if (showToastCallback) showToastCallback('⚠️ Không thể phát âm thanh'); };
        setTimeout(() => window.speechSynthesis.speak(utterance), 50);
    } catch(e) { console.error(e); }
}

function createRecognitionMalay(langCode, onResult, onEnd) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Trình duyệt không hỗ trợ nhận diện giọng nói!"); return null; }
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

window.stopMalaiVietListening = () => {
    if (recognitionMalaiViet) { try { recognitionMalaiViet.stop(); } catch(e) {} recognitionMalaiViet = null; }
    isListeningMalai = false;
};

window.stopVietMalaiListening = () => {
    if (recognitionVietMalai) { try { recognitionVietMalai.stop(); } catch(e) {} recognitionVietMalai = null; }
    isListeningVietMalai = false;
};

window.startListeningMalaiViet = async (callback) => {
    if (isListeningMalai) return;
    if (recognitionMalaiViet) { try { recognitionMalaiViet.stop(); } catch(e) {} recognitionMalaiViet = null; }
    malaiVietCallback = callback;
    const onResultHandler = async (spokenMalay) => {
        const vietText = await translateMalay(spokenMalay, "Malay", "Vietnamese");
        if (malaiVietCallback) malaiVietCallback(spokenMalay, vietText);
    };
    const onEndHandler = () => {
        if (isListeningMalai) setTimeout(() => window.startListeningMalaiViet(malaiVietCallback), 500);
    };
    recognitionMalaiViet = createRecognitionMalay("ms-MY", onResultHandler, onEndHandler);
    if (recognitionMalaiViet) { recognitionMalaiViet.start(); isListeningMalai = true; }
};

window.startListeningVietMalai = async (callback) => {
    if (isListeningVietMalai) return;
    if (recognitionVietMalai) { try { recognitionVietMalai.stop(); } catch(e) {} recognitionVietMalai = null; }
    vietMalaiCallback = callback;
    const onResultHandler = async (spokenViet) => {
        const malayText = await translateMalay(spokenViet, "Vietnamese", "Malay");
        if (vietMalaiCallback) vietMalaiCallback(spokenViet, malayText);
    };
    const onEndHandler = () => {
        if (isListeningVietMalai) setTimeout(() => window.startListeningVietMalai(vietMalaiCallback), 500);
    };
    recognitionVietMalai = createRecognitionMalay("vi-VN", onResultHandler, onEndHandler);
    if (recognitionVietMalai) { recognitionVietMalai.start(); isListeningVietMalai = true; }
};

window.speakMalay = speakMalay;
console.log("tiengmalai.js đã sẵn sàng");