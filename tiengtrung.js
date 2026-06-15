if (!window.WORKER_URL) {
    window.WORKER_URL = "https://dichthuatdulich.cuongprovuidulieu.workers.dev";
}
var MODEL_NAME_CN = "openai/gpt-oss-20b";

async function callApi_CN(prompt) {
    try {
        const response = await fetch(window.WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL_NAME_CN,
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

let recognitionTrungViet = null, recognitionVietTrung = null;
let isListeningTrung = false, isListeningVietTrung = false;
let trungVietCallback = null, vietTrungCallback = null;

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

window.speakChinese = function(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN'; 
    u.rate = 0.9;
    setTimeout(() => window.speechSynthesis.speak(u), 50);
};

window.speakVietForChinese = function(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    u.rate = 0.9;
    setTimeout(() => window.speechSynthesis.speak(u), 50);
};

window.stopTrungVietListening = () => { 
    if (recognitionTrungViet) { 
        try { recognitionTrungViet.abort(); } catch(e) {} 
        recognitionTrungViet = null; 
    } 
    isListeningTrung = false; 
};

window.stopVietTrungListening = () => { 
    if (recognitionVietTrung) { 
        try { recognitionVietTrung.abort(); } catch(e) {} 
        recognitionVietTrung = null; 
    } 
    isListeningVietTrung = false; 
};

window.startListeningTrungViet = (cb) => {
    window.stopTrungVietListening();
    window.stopVietTrungListening();
    
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    trungVietCallback = cb;
    
    recognitionTrungViet = createGenericRecognition("zh-CN", async (t) => {
        const v = await callApi_CN(`Dịch câu sau đây từ Trung sang Việt (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (trungVietCallback) trungVietCallback(t, v);
        window.speakVietForChinese(v);
        window.stopTrungVietListening();
    }, () => { 
        isListeningTrung = false;
        recognitionTrungViet = null;
    });
    
    if (recognitionTrungViet) {
        try {
            recognitionTrungViet.start();
            isListeningTrung = true;
        } catch(e) { console.error(e); }
    }
};

window.startListeningVietTrung = (cb) => {
    window.stopTrungVietListening();
    window.stopVietTrungListening();
    
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    vietTrungCallback = cb;
    
    recognitionVietTrung = createGenericRecognition("vi-VN", async (t) => {
        const c = await callApi_CN(`Dịch câu sau đây từ Việt sang Trung (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (vietTrungCallback) vietTrungCallback(t, c);
        window.speakChinese(c);
        window.stopVietTrungListening();
    }, () => { 
        isListeningVietTrung = false;
        recognitionVietTrung = null;
    });
    
    if (recognitionVietTrung) {
        try {
            recognitionVietTrung.start();
            isListeningVietTrung = true;
        } catch(e) { console.error(e); }
    }
};

console.log("tiengtrung.js đã sẵn sàng");