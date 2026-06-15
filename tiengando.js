if (!window.WORKER_URL) {
    window.WORKER_URL = "https://dichthuatdulich.cuongprovuidulieu.workers.dev";
}
var MODEL_NAME_HI = "openai/gpt-oss-20b";

async function callApi_HI(prompt) {
    try {
        const response = await fetch(window.WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL_NAME_HI,
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

let recognitionAnDoViet = null, recognitionVietAnDo = null;
let isListeningAnDo = false, isListeningVietAnDo = false;
let anDoVietCallback = null, vietAnDoCallback = null;

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

window.speakHindi = function(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'hi-IN'; 
    u.rate = 0.9;
    setTimeout(() => window.speechSynthesis.speak(u), 50);
};

window.speakVietForHindi = function(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    u.rate = 0.9;
    setTimeout(() => window.speechSynthesis.speak(u), 50);
};

window.stopAnDoVietListening = () => { 
    if (recognitionAnDoViet) { 
        try { recognitionAnDoViet.abort(); } catch(e) {} 
        recognitionAnDoViet = null; 
    } 
    isListeningAnDo = false; 
};

window.stopVietAnDoListening = () => { 
    if (recognitionVietAnDo) { 
        try { recognitionVietAnDo.abort(); } catch(e) {} 
        recognitionVietAnDo = null; 
    } 
    isListeningVietAnDo = false; 
};

window.startListeningAnDoViet = (cb) => {
    window.stopAnDoVietListening();
    window.stopVietAnDoListening();
    
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    anDoVietCallback = cb;
    
    recognitionAnDoViet = createGenericRecognition("hi-IN", async (t) => {
        const v = await callApi_HI(`Dịch câu sau đây từ Hindi sang Việt (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (anDoVietCallback) anDoVietCallback(t, v);
        window.speakVietForHindi(v);
        window.stopAnDoVietListening();
    }, () => { 
        isListeningAnDo = false;
        recognitionAnDoViet = null;
    });
    
    if (recognitionAnDoViet) {
        try {
            recognitionAnDoViet.start();
            isListeningAnDo = true;
        } catch(e) { console.error(e); }
    }
};

window.startListeningVietAnDo = (cb) => {
    window.stopAnDoVietListening();
    window.stopVietAnDoListening();
    
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    vietAnDoCallback = cb;
    
    recognitionVietAnDo = createGenericRecognition("vi-VN", async (t) => {
        const h = await callApi_HI(`Dịch câu sau đây từ Việt sang Hindi (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (vietAnDoCallback) vietAnDoCallback(t, h);
        window.speakHindi(h);
        window.stopVietAnDoListening();
    }, () => { 
        isListeningVietAnDo = false;
        recognitionVietAnDo = null;
    });
    
    if (recognitionVietAnDo) {
        try {
            recognitionVietAnDo.start();
            isListeningVietAnDo = true;
        } catch(e) { console.error(e); }
    }
};

console.log("tiengando.js đã sẵn sàng");