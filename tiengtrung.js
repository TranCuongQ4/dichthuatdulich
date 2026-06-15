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

window.stopTrungVietListening = window.stopAllListeningGlobal;
window.stopVietTrungListening = window.stopAllListeningGlobal;

var isListeningTrung = false;
var isListeningVietTrung = false;
var trungVietCallback = null;
var vietTrungCallback = null;

window.speakVietForChinese = function(text) {
    if (!window.speechSynthesis) return;
    try { window.speechSynthesis.cancel(); } catch(e){}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    window.speechSynthesis.speak(u);
};

window.speakChinese = function(text) {
    if (!window.speechSynthesis) return;
    try { window.speechSynthesis.cancel(); } catch(e){}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    window.speechSynthesis.speak(u);
};

window.startListeningTrungViet = (cb) => {
    window.stopAllListeningGlobal();
    
    trungVietCallback = cb;
    const rec = window.sharedCreateGenericRecognition("zh-CN", async (t) => {
        const v = await callApi_CN(`Dịch câu sau đây từ Trung sang Việt (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (trungVietCallback) trungVietCallback(t, v);
        window.speakVietForChinese(v);
        window.stopAllListeningGlobal();
    }, () => { 
        isListeningTrung = false;
        if (window.globalCurrentRecognition === rec) window.globalCurrentRecognition = null;
    });
    
    if (rec) {
        window.globalCurrentRecognition = rec;
        try {
            rec.start();
            isListeningTrung = true;
        } catch(e) { console.error(e); }
    }
};

window.startListeningVietTrung = (cb) => {
    window.stopAllListeningGlobal();
    
    vietTrungCallback = cb;
    const rec = window.sharedCreateGenericRecognition("vi-VN", async (t) => {
        const c = await callApi_CN(`Dịch câu sau đây từ Việt sang Trung (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (vietTrungCallback) vietTrungCallback(t, c);
        window.speakChinese(c);
        window.stopAllListeningGlobal();
    }, () => { 
        isListeningVietTrung = false;
        if (window.globalCurrentRecognition === rec) window.globalCurrentRecognition = null;
    });
    
    if (rec) {
        window.globalCurrentRecognition = rec;
        try {
            rec.start();
            isListeningVietTrung = true;
        } catch(e) { console.error(e); }
    }
};

console.log("tiengtrung.js đã sẵn sàng");