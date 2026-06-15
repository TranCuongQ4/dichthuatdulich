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

window.stopMalaiVietListening = window.stopAllListeningGlobal;
window.stopVietMalaiListening = window.stopAllListeningGlobal;

var isListeningMalai = false;
var isListeningVietMalai = false;
var malaiVietCallback = null;
var vietMalaiCallback = null;

window.speakVietForMalay = function(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    window.speechSynthesis.speak(u);
};

window.speakMalay = function(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ms-MY';
    window.speechSynthesis.speak(u);
};

window.startListeningMalaiViet = (cb) => {
    window.stopAllListeningGlobal();
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    malaiVietCallback = cb;
    
    const rec = window.sharedCreateGenericRecognition("ms-MY", async (t) => {
        const v = await callApi_MS(`Dịch câu sau đây từ Malaysia sang Việt (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (malaiVietCallback) malaiVietCallback(t, v);
        window.speakVietForMalay(v);
        window.stopAllListeningGlobal();
    }, () => { 
        isListeningMalai = false;
        if (window.globalCurrentRecognition === rec) window.globalCurrentRecognition = null;
    });
    
    if (rec) {
        window.globalCurrentRecognition = rec;
        try {
            rec.start();
            isListeningMalai = true;
        } catch(e) { console.error(e); }
    }
};

window.startListeningVietMalai = (cb) => {
    window.stopAllListeningGlobal();
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    vietMalaiCallback = cb;
    
    const rec = window.sharedCreateGenericRecognition("vi-VN", async (t) => {
        const m = await callApi_MS(`Dịch câu sau đây từ Việt sang Malaysia (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (vietMalaiCallback) vietMalaiCallback(t, m);
        window.speakMalay(m);
        window.stopAllListeningGlobal();
    }, () => { 
        isListeningVietMalai = false;
        if (window.globalCurrentRecognition === rec) window.globalCurrentRecognition = null;
    });
    
    if (rec) {
        window.globalCurrentRecognition = rec;
        try {
            rec.start();
            isListeningVietMalai = true;
        } catch(e) { console.error(e); }
    }
};

console.log("tiengmalai.js đã sẵn sàng");