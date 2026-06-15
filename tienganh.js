if (!window.WORKER_URL) {
    window.WORKER_URL = "https://dichthuatdulich.cuongprovuidulieu.workers.dev";
}
var MODEL_NAME = "openai/gpt-oss-20b";

async function callApi(prompt) {
    try {
        const response = await fetch(window.WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL_NAME,
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

let recognitionAnhViet = null, recognitionVietAnh = null;
let isListeningAnh = false, isListeningViet = false;
let anhVietCallback = null, vietAnhCallback = null;

function createGenericRecognition(langCode, onResult, onEnd) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.error("Trình duyệt không hỗ trợ Web Speech API");
        return null;
    }
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

window.speakEnglish = function(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    setTimeout(() => window.speechSynthesis.speak(u), 50);
};

window.speakVietForEnglish = function(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    u.rate = 0.9;
    setTimeout(() => window.speechSynthesis.speak(u), 50);
};

window.stopAnhVietListening = () => { 
    if (recognitionAnhViet) { 
        try { recognitionAnhViet.abort(); } catch(e) {} 
        recognitionAnhViet = null; 
    } 
    isListeningAnh = false; 
};

window.stopVietAnhListening = () => { 
    if (recognitionVietAnh) { 
        try { recognitionVietAnh.abort(); } catch(e) {} 
        recognitionVietAnh = null; 
    } 
    isListeningViet = false; 
};

window.startListeningAnhViet = (cb) => {
    window.stopAnhVietListening();
    window.stopVietAnhListening();
    
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance('')); 
    anhVietCallback = cb;
    
    recognitionAnhViet = createGenericRecognition("en-US", async (t) => {
        const v = await callApi(`Dịch câu sau đây từ Anh sang Việt (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (anhVietCallback) anhVietCallback(t, v);
        window.speakVietForEnglish(v);
        window.stopAnhVietListening();
    }, () => { 
        isListeningAnh = false;
        recognitionAnhViet = null;
    });
    
    if (recognitionAnhViet) {
        try {
            recognitionAnhViet.start();
            isListeningAnh = true;
        } catch(e) { console.error(e); }
    }
};

window.startListeningVietAnh = (cb) => {
    window.stopAnhVietListening();
    window.stopVietAnhListening();
    
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    vietAnhCallback = cb;
    
    recognitionVietAnh = createGenericRecognition("vi-VN", async (t) => {
        const e = await callApi(`Dịch câu sau đây từ Việt sang Anh (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (vietAnhCallback) vietAnhCallback(t, e);
        window.speakEnglish(e);
        window.stopVietAnhListening();
    }, () => { 
        isListeningViet = false;
        recognitionVietAnh = null;
    });
    
    if (recognitionVietAnh) {
        try {
            recognitionVietAnh.start();
            isListeningViet = true;
        } catch(e) { console.error(e); }
    }
};

console.log("tienganh.js đã sẵn sàng");