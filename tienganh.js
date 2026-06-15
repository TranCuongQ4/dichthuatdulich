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

// Đối tượng lưu trữ phiên nhận diện giọng nói hiện tại đang chạy
let currentRecognition = null;

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

// Hàm tắt mic dùng chung cho toàn bộ ứng dụng nhằm giải phóng phần cứng di động
window.stopAllListening = () => {
    if (currentRecognition) {
        try { currentRecognition.abort(); } catch(e) {}
        currentRecognition = null;
    }
};

// Định nghĩa các hàm tắt mic cũ để không làm lỗi script.js liên kết bên ngoài
window.stopAnhVietListening = window.stopAllListening;
window.stopVietAnhListening = window.stopAllListening;
window.stopTrungVietListening = window.stopAllListening;
window.stopVietTrungListening = window.stopAllListening;
window.stopAnDoVietListening = window.stopAllListening;
window.stopVietAnDoListening = window.stopAllListening;
window.stopMalaiVietListening = window.stopAllListening;
window.stopVietMalaiListening = window.stopAllListening;
window.stopPhapVietListening = window.stopAllListening;
window.stopVietPhapListening = window.stopAllListening;

// Hàm lõi thực hiện khởi tạo và kích hoạt Micro theo từng cặp ngôn ngữ linh hoạt
function setupListeningMode(srcLangCode, srcName, targetName, cb) {
    window.stopAllListening();
    
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance('')); 
    
    currentRecognition = createGenericRecognition(srcLangCode, async (text) => {
        const translated = await callApi(`Dịch câu sau đây từ ${srcName} sang ${targetName} (CHỈ trả về bản dịch, không thêm gì khác):\n${text}`);
        if (cb) cb(text, translated);
        window.stopAllListening();
    }, () => { 
        currentRecognition = null;
    });
    
    if (currentRecognition) {
        try {
            currentRecognition.start();
        } catch(e) { console.error(e); }
    }
}

// ĐĂNG KÝ ĐẦY ĐỦ CÁC HÀM LÊN WINDOW ĐỂ SCRIPT.JS CÓ THỂ GỌI ĐƯỢC
window.startListeningAnhViet = (cb) => setupListeningMode("en-US", "Anh", "Việt", cb);
window.startListeningVietAnh = (cb) => setupListeningMode("vi-VN", "Việt", "Anh", cb);

window.startListeningTrungViet = (cb) => setupListeningMode("zh-CN", "Trung", "Việt", cb);
window.startListeningVietTrung = (cb) => setupListeningMode("vi-VN", "Việt", "Trung", cb);

window.startListeningAnDoViet = (cb) => setupListeningMode("hi-IN", "Ấn Độ", "Việt", cb);
window.startListeningVietAnDo = (cb) => setupListeningMode("vi-VN", "Việt", "Ấn Độ", cb);

window.startListeningMalaiViet = (cb) => setupListeningMode("ms-MY", "Malaysia", "Việt", cb);
window.startListeningVietMalai = (cb) => setupListeningMode("vi-VN", "Việt", "Malaysia", cb);

window.startListeningPhapViet  = (cb) => setupListeningMode("fr-FR", "Pháp", "Việt", cb);
window.startListeningVietPhap  = (cb) => setupListeningMode("vi-VN", "Việt", "Pháp", cb);

console.log("Hệ thống dịch thuật đa ngôn ngữ đã sẵn sàng kích hoạt");