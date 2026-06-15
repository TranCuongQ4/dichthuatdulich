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

window.stopAnDoVietListening = window.stopAllListeningGlobal;
window.stopVietAnDoListening = window.stopAllListeningGlobal;

var isListeningAnDo = false;
var isListeningVietAnDo = false;
var anDoVietCallback = null;
var vietAnDoCallback = null;

window.speakVietForHindi = function(text) {
    if (!window.speechSynthesis) return;
    try { window.speechSynthesis.cancel(); } catch(e){}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    window.speechSynthesis.speak(u);
};

window.speakHindi = function(text) {
    if (!window.speechSynthesis) return;
    try { window.speechSynthesis.cancel(); } catch(e){}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'hi-IN';
    window.speechSynthesis.speak(u);
};

window.startListeningAnDoViet = (cb) => {
    window.stopAllListeningGlobal();
    
    anDoVietCallback = cb;
    const rec = window.sharedCreateGenericRecognition("hi-IN", async (t) => {
        if (window.globalCurrentRecognition !== rec) return;
        
        const v = await callApi_HI(`Dịch câu sau đây từ Hindi sang Việt (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (anDoVietCallback) anDoVietCallback(t, v);
        window.speakVietForHindi(v);
        
        if (window.globalCurrentRecognition === rec && !rec._ended) {
            window.stopAllListeningGlobal();
        }
    }, () => { 
        isListeningAnDo = false;
        if (window.globalCurrentRecognition === rec) window.globalCurrentRecognition = null;
    });
    
    if (rec) {
        window.globalCurrentRecognition = rec;
        try {
            rec.start();
            isListeningAnDo = true;
        } catch(e) { console.error(e); }
    }
};

window.startListeningVietAnDo = (cb) => {
    window.stopAllListeningGlobal();
    
    vietAnDoCallback = cb;
    const rec = window.sharedCreateGenericRecognition("vi-VN", async (t) => {
        if (window.globalCurrentRecognition !== rec) return;
        
        const h = await callApi_HI(`Dịch câu sau đây từ Việt sang Hindi (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (vietAnDoCallback) vietAnDoCallback(t, h);
        window.speakHindi(h);
        
        if (window.globalCurrentRecognition === rec && !rec._ended) {
            window.stopAllListeningGlobal();
        }
    }, () => { 
        isListeningVietAnDo = false;
        if (window.globalCurrentRecognition === rec) window.globalCurrentRecognition = null;
    });
    
    if (rec) {
        window.globalCurrentRecognition = rec;
        try {
            rec.start();
            isListeningVietAnDo = true;
        } catch(e) { console.error(e); }
    }
};

console.log("tiengando.js đã sẵn sàng");