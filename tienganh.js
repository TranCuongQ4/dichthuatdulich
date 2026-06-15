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

// Quản lý phiên recognition toàn cục
window.globalCurrentRecognition = null;

// Hàm khởi tạo đối tượng Micro chuẩn hóa, không gọi lệnh điều khiển âm thanh ở đây
window.sharedCreateGenericRecognition = function(langCode, onResult, onEnd) {
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
};

// Hàm tắt mic an toàn tuyệt đối
window.stopAllListeningGlobal = () => {
    if (window.globalCurrentRecognition) {
        try {
            window.globalCurrentRecognition.onend = null; // Gỡ bỏ sự kiện end để tránh lặp luồng
            window.globalCurrentRecognition.abort();
        } catch(e) {
            console.log("Không thể giải phóng mic cũ:", e);
        }
        window.globalCurrentRecognition = null;
    }
};

window.stopAnhVietListening = window.stopAllListeningGlobal;
window.stopVietAnhListening = window.stopAllListeningGlobal;

var isListeningAnh = false;
var isListeningViet = false;
var anhVietCallback = null;
var vietAnhCallback = null;

window.speakVietForEnglish = function(text) {
    if (!window.speechSynthesis) return;
    try { window.speechSynthesis.cancel(); } catch(e){}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    window.speechSynthesis.speak(u);
};

window.speakEnglish = function(text) {
    if (!window.speechSynthesis) return;
    try { window.speechSynthesis.cancel(); } catch(e){}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
};

window.startListeningAnhViet = (cb) => {
    // Tắt mic cũ trước
    window.stopAllListeningGlobal();
    
    anhVietCallback = cb;
    const rec = window.sharedCreateGenericRecognition("en-US", async (t) => {
        const v = await callApi(`Dịch câu sau đây từ Anh sang Việt (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (anhVietCallback) anhVietCallback(t, v);
        window.speakVietForEnglish(v);
        window.stopAllListeningGlobal();
    }, () => { 
        isListeningAnh = false;
        if (window.globalCurrentRecognition === rec) window.globalCurrentRecognition = null;
    });
    
    if (rec) {
        window.globalCurrentRecognition = rec;
        try {
            // Thực hiện start trực tiếp không bọc qua setTimeout hay speechSynthesis mồi
            rec.start();
            isListeningAnh = true;
        } catch(e) { console.error("Lỗi kích hoạt mic:", e); }
    }
};

window.startListeningVietAnh = (cb) => {
    window.stopAllListeningGlobal();
    
    vietAnhCallback = cb;
    const rec = window.sharedCreateGenericRecognition("vi-VN", async (t) => {
        const e = await callApi(`Dịch câu sau đây từ Việt sang Anh (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`);
        if (vietAnhCallback) vietAnhCallback(t, e);
        window.speakEnglish(e);
        window.stopAllListeningGlobal();
    }, () => { 
        isListeningViet = false;
        if (window.globalCurrentRecognition === rec) window.globalCurrentRecognition = null;
    });
    
    if (rec) {
        window.globalCurrentRecognition = rec;
        try {
            rec.start();
            isListeningViet = true;
        } catch(e) { console.error("Lỗi kích hoạt mic:", e); }
    }
};

console.log("tienganh.js đã đồng bộ hóa hệ thống");