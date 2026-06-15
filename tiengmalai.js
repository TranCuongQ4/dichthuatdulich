if (!window.WORKER_URL) {
    window.WORKER_URL = "https://dichthuatdulich.cuongprovuidulieu.workers.dev";
}
var MODEL_NAME_MS = "openai/gpt-oss-20b";

async function callApi_MS(prompt) {
    try {
        const response = await fetch(window.WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL_NAME_MS,
                messages: [
                    { role: "system", content: "Bạn là công cụ dịch thuật. CHỈ trả về câu đã dịch, tuyệt đối KHÔNG giải thích, KHÔNG thêm từ, KHÔNG sáng tạo. Dịch chính xác câu người dùng cung cấp." },
                    { role: "user", content: prompt }
                ],
                temperature: 0,
                max_tokens: 300
            })
        });
        if (!response.ok) return `[Lỗi HTTP ${response.status}]`;
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
            let translated = data.choices[0].message.content.trim();
            translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^(dịch|translation|translate|kết quả):\s*/i, '').replace(/^["']|["']$/g, '');
            if (translated.includes('\n')) translated = translated.split('\n').pop().trim();
            return translated;
        }
        return "[Lỗi dịch]";
    } catch (err) { return "[Lỗi kết nối]"; }
}

let recognitionMalaiViet = null, recognitionVietMalai = null;
let isListeningMalai = false, isListeningVietMalai = false;
let malaiVietCallback = null, vietMalaiCallback = null;

function createGenericRecognition(langCode, onResult, onEnd) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = langCode;
    
    recognition.onresult = async (e) => { 
        let t = ""; 
        for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) t += e.results[i][0].transcript; 
        }
        if (t && onResult) await onResult(t); 
    };
    
    recognition.onerror = (e) => { 
        console.error("Lỗi Speech (" + langCode + "):", e.error);
        if (onEnd) onEnd(); 
    };
    
    recognition.onend = () => { 
        if (onEnd) onEnd(); 
    };
    return recognition;
}

window.speakMalay = function(text) { 
    if (!text || !window.speechSynthesis) return; 
    try { 
        window.speechSynthesis.cancel(); 
        const u = new SpeechSynthesisUtterance(text); 
        const voices = window.speechSynthesis.getVoices();
        const malayVoice = voices.find(v => v.lang.startsWith('ms') || v.lang.startsWith('id'));
        if (malayVoice) {
            u.voice = malayVoice;
            u.lang = malayVoice.lang;
        } else {
            u.lang = 'ms-MY';
        }
        u.rate = 0.9; 
        setTimeout(() => window.speechSynthesis.speak(u), 50); 
    } catch(e) { console.error(e); } 
};

window.speakVietForMalay = function(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    u.rate = 0.9;
    setTimeout(() => window.speechSynthesis.speak(u), 50);
};

window.stopMalaiVietListening = () => { 
    if (recognitionMalaiViet) { 
        try { recognitionMalaiViet.abort(); } catch(e) {} 
        recognitionMalaiViet = null; 
    } 
    isListeningMalai = false; 
};

window.stopVietMalaiListening = () => { 
    if (recognitionVietMalai) { 
        try { recognitionVietMalai.abort(); } catch(e) {} 
        recognitionVietMalai = null; 
    } 
    isListeningVietMalai = false; 
};

window.startListeningMalaiViet = (cb) => {
    window.stopMalaiVietListening();
    window.stopVietMalaiListening();
    
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    malaiVietCallback = cb;
    
    recognitionMalaiViet = createGenericRecognition("ms-MY", async (t) => {
        const v = await callApi_MS(`Dịch câu sau đây từ Malaysia sang Việt (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (malaiVietCallback) malaiVietCallback(t, v);
        window.speakVietForMalay(v);
        window.stopMalaiVietListening();
    }, () => { 
        isListeningMalai = false;
        recognitionMalaiViet = null;
    });
    
    if (recognitionMalaiViet) {
        try {
            recognitionMalaiViet.start();
            isListeningMalai = true;
        } catch(e) { console.error(e); }
    }
};

window.startListeningVietMalai = (cb) => {
    window.stopMalaiVietListening();
    window.stopVietMalaiListening();
    
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    vietMalaiCallback = cb;
    
    recognitionVietMalai = createGenericRecognition("vi-VN", async (t) => {
        const m = await callApi_MS(`Dịch câu sau đây từ Việt sang Malaysia (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (vietMalaiCallback) vietMalaiCallback(t, m);
        window.speakMalay(m);
        window.stopVietMalaiListening();
    }, () => { 
        isListeningVietMalai = false;
        recognitionVietMalai = null;
    });
    
    if (recognitionVietMalai) {
        try {
            recognitionVietMalai.start();
            isListeningVietMalai = true;
        } catch(e) { console.error(e); }
    }
};

console.log("tiengmalai.js đã sẵn sàng");