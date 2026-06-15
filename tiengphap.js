if (!window.WORKER_URL) {
    window.WORKER_URL = "https://dichthuatdulich.cuongprovuidulieu.workers.dev";
}
var MODEL_NAME_FR = "openai/gpt-oss-20b";

async function callApi_FR(prompt) {
    try {
        const response = await fetch(window.WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL_NAME_FR,
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

let recognitionPhapViet = null, recognitionVietPhap = null;
let isListeningPhap = false, isListeningVietPhap = false;
let phapVietCallback = null, vietPhapCallback = null;

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

window.speakFrench = function(text) { 
    if (!text || !window.speechSynthesis) return; 
    window.speechSynthesis.cancel(); 
    const u = new SpeechSynthesisUtterance(text); 
    u.lang = 'fr-FR';
    u.rate = 0.9; 
    setTimeout(() => window.speechSynthesis.speak(u), 50); 
};

window.speakVietForFrench = function(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    u.rate = 0.9;
    setTimeout(() => window.speechSynthesis.speak(u), 50);
};

window.stopPhapVietListening = () => { 
    if (recognitionPhapViet) { 
        try { recognitionPhapViet.abort(); } catch(e) {} 
        recognitionPhapViet = null; 
    } 
    isListeningPhap = false; 
};

window.stopVietPhapListening = () => { 
    if (recognitionVietPhap) { 
        try { recognitionVietPhap.abort(); } catch(e) {} 
        recognitionVietPhap = null; 
    } 
    isListeningVietPhap = false; 
};

window.startListeningPhapViet = (cb) => {
    window.stopPhapVietListening();
    window.stopVietPhapListening();
    
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    phapVietCallback = cb;
    
    recognitionPhapViet = createGenericRecognition("fr-FR", async (t) => {
        const v = await callApi_FR(`Dịch câu sau đây từ Pháp sang Việt (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (phapVietCallback) phapVietCallback(t, v);
        window.speakVietForFrench(v);
        window.stopPhapVietListening();
    }, () => { 
        isListeningPhap = false;
        recognitionPhapViet = null;
    });
    
    if (recognitionPhapViet) {
        try {
            recognitionPhapViet.start();
            isListeningPhap = true;
        } catch(e) { console.error(e); }
    }
};

window.startListeningVietPhap = (cb) => {
    window.stopPhapVietListening();
    window.stopVietPhapListening();
    
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    vietPhapCallback = cb;
    
    recognitionVietPhap = createGenericRecognition("vi-VN", async (t) => {
        const f = await callApi_FR(`Dịch câu sau đây từ Việt sang Pháp (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (vietPhapCallback) vietPhapCallback(t, f);
        window.speakFrench(f);
        window.stopVietPhapListening();
    }, () => { 
        isListeningVietPhap = false;
        recognitionVietPhap = null;
    });
    
    if (recognitionVietPhap) {
        try {
            recognitionVietPhap.start();
            isListeningVietPhap = true;
        } catch(e) { console.error(e); }
    }
};

console.log("tiengphap.js đã sẵn sàng");