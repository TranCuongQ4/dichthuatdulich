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

window.stopPhapVietListening = window.stopAllListeningGlobal;
window.stopVietPhapListening = window.stopAllListeningGlobal;

var isListeningPhap = false;
var isListeningVietPhap = false;
var phapVietCallback = null;
var vietPhapCallback = null;

window.speakVietForFrench = function(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    window.speechSynthesis.speak(u);
};

window.speakFrench = function(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    window.speechSynthesis.speak(u);
};

window.startListeningPhapViet = (cb) => {
    window.stopAllListeningGlobal();
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    phapVietCallback = cb;
    
    const rec = window.sharedCreateGenericRecognition("fr-FR", async (t) => {
        const v = await callApi_FR(`Dịch câu sau đây từ Pháp sang Việt (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (phapVietCallback) phapVietCallback(t, v);
        window.speakVietForFrench(v);
        window.stopAllListeningGlobal();
    }, () => { 
        isListeningPhap = false;
        if (window.globalCurrentRecognition === rec) window.globalCurrentRecognition = null;
    });
    
    if (rec) {
        window.globalCurrentRecognition = rec;
        try {
            rec.start();
            isListeningPhap = true;
        } catch(e) { console.error(e); }
    }
};

window.startListeningVietPhap = (cb) => {
    window.stopAllListeningGlobal();
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    vietPhapCallback = cb;
    
    const rec = window.sharedCreateGenericRecognition("vi-VN", async (t) => {
        const f = await callApi_FR(`Dịch câu sau đây từ Việt sang Pháp (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (vietPhapCallback) vietPhapCallback(t, f);
        window.speakFrench(f);
        window.stopAllListeningGlobal();
    }, () => { 
        isListeningVietPhap = false;
        if (window.globalCurrentRecognition === rec) window.globalCurrentRecognition = null;
    });
    
    if (rec) {
        window.globalCurrentRecognition = rec;
        try {
            rec.start();
            isListeningVietPhap = true;
        } catch(e) { console.error(e); }
    }
};

console.log("tiengphap.js đã sẵn sàng");