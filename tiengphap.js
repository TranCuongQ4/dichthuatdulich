// tiengphap.js - Xử lý dịch thuật tiếng Pháp
// ========== TÍCH HỢP SẴN HÀM GỌI API ==========
const MODEL_NAME_FR = "llama3-70b-8192";

async function callApi_FR(prompt) {
    try {
        const response = await fetch("/api/groq-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL_NAME_FR,
                messages: [
                    { role: "system", content: `Bạn là công cụ dịch thuật. CHỈ trả về câu đã dịch, KHÔNG giải thích.` },
                    { role: "user", content: prompt }
                ],
                temperature: 0,
                max_tokens: 300
            })
        });
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
        return "[Lỗi kết nối]";
    }
}

// ========== PHẦN CODE GỐC ==========
let recognitionPhapViet = null;
let recognitionVietPhap = null;
let isListeningPhap = false;
let isListeningVietPhap = false;
let phapVietCallback = null;
let vietPhapCallback = null;

async function translateFrench(text, sourceLang, targetLang) {
    let prompt = "";
    if (sourceLang === "French" && targetLang === "Vietnamese") {
        prompt = `Dịch từ Pháp sang Việt:\n\nPháp: ${text}\n\nTiếng Việt:`;
    } else {
        prompt = `Dịch từ Việt sang Pháp:\n\nTiếng Việt: ${text}\n\nPháp:`;
    }
    return await callApi_FR(prompt);
}

function getFrenchVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find(voice => 
        voice.lang === 'fr-FR' || voice.lang.startsWith('fr-') ||
        voice.name.toLowerCase().includes('french') || voice.name.toLowerCase().includes('français')
    );
}

function speakFrench(text, showToastCallback) {
    if (!text || text.trim() === '') { if (showToastCallback) showToastCallback('⚠️ Không có nội dung để phát'); return; }
    if (!window.speechSynthesis) { if (showToastCallback) showToastCallback('⚠️ Trình duyệt không hỗ trợ phát âm thanh'); return; }
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const frenchVoice = getFrenchVoice();
        if (frenchVoice) { utterance.voice = frenchVoice; utterance.lang = frenchVoice.lang; } 
        else { utterance.lang = 'fr-FR'; }
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.onerror = () => { if (showToastCallback) showToastCallback('⚠️ Không thể phát âm thanh'); };
        setTimeout(() => window.speechSynthesis.speak(utterance), 50);
    } catch(e) { console.error(e); }
}

function createRecognitionFrench(langCode, onResult, onEnd) {
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

window.stopPhapVietListening = () => {
    if (recognitionPhapViet) { try { recognitionPhapViet.stop(); } catch(e) {} recognitionPhapViet = null; }
    isListeningPhap = false;
};

window.stopVietPhapListening = () => {
    if (recognitionVietPhap) { try { recognitionVietPhap.stop(); } catch(e) {} recognitionVietPhap = null; }
    isListeningVietPhap = false;
};

window.startListeningPhapViet = async (callback) => {
    if (isListeningPhap) return;
    if (recognitionPhapViet) { try { recognitionPhapViet.stop(); } catch(e) {} recognitionPhapViet = null; }
    phapVietCallback = callback;
    const onResultHandler = async (spokenFrench) => {
        const vietText = await translateFrench(spokenFrench, "French", "Vietnamese");
        if (phapVietCallback) phapVietCallback(spokenFrench, vietText);
    };
    const onEndHandler = () => {
        if (isListeningPhap) setTimeout(() => window.startListeningPhapViet(phapVietCallback), 500);
    };
    recognitionPhapViet = createRecognitionFrench("fr-FR", onResultHandler, onEndHandler);
    if (recognitionPhapViet) { recognitionPhapViet.start(); isListeningPhap = true; }
};

window.startListeningVietPhap = async (callback) => {
    if (isListeningVietPhap) return;
    if (recognitionVietPhap) { try { recognitionVietPhap.stop(); } catch(e) {} recognitionVietPhap = null; }
    vietPhapCallback = callback;
    const onResultHandler = async (spokenViet) => {
        const frenchText = await translateFrench(spokenViet, "Vietnamese", "French");
        if (vietPhapCallback) vietPhapCallback(spokenViet, frenchText);
    };
    const onEndHandler = () => {
        if (isListeningVietPhap) setTimeout(() => window.startListeningVietPhap(vietPhapCallback), 500);
    };
    recognitionVietPhap = createRecognitionFrench("vi-VN", onResultHandler, onEndHandler);
    if (recognitionVietPhap) { recognitionVietPhap.start(); isListeningVietPhap = true; }
};

window.speakFrench = speakFrench;
console.log("tiengphap.js đã sẵn sàng");