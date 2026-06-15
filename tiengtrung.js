if (!window.WORKER_URL) {
    window.WORKER_URL = "https://dichthuatdulich.cuongprovuidulieu.workers.dev";
}
var MODEL_NAME_CN = "llama-3.3-70b-versatile";

async function callApi_CN(prompt) {
    try {
        const response = await fetch(window.WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL_NAME_CN,
                messages: [{ role: "system", content: "Bạn là công cụ dịch thuật. CHỈ trả về câu đã dịch." }, { role: "user", content: prompt }],
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

let recognitionTrungViet = null, recognitionVietTrung = null, isListeningTrung = false, isListeningVietTrung = false, trungVietCallback = null, vietTrungCallback = null;

function createRecognitionChinese(langCode, onResult, onEnd) {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = langCode;
    recognition.onresult = async (e) => { let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript; if (t && onResult) await onResult(t); };
    recognition.onerror = (e) => { if (onEnd) onEnd(); };
    recognition.onend = () => { if (onEnd) onEnd(); };
    return recognition;
}

// Bổ sung hàm đọc Tiếng Trung chuẩn bản xứ
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

window.stopTrungVietListening = () => { if (recognitionTrungViet) { try { recognitionTrungViet.stop(); } catch(e) {} recognitionTrungViet = null; } isListeningTrung = false; };
window.stopVietTrungListening = () => { if (recognitionVietTrung) { try { recognitionVietTrung.stop(); } catch(e) {} recognitionVietTrung = null; } isListeningVietTrung = false; };

window.startListeningTrungViet = async (cb) => {
    if (isListeningTrung) return;
    recognitionTrungViet?.stop();
    trungVietCallback = cb;
    recognitionTrungViet = createRecognitionChinese("zh-CN", async (t) => {
        const v = await callApi_CN(`Dịch Trung sang Việt:\n${t}\nTiếng Việt:`);
        if (trungVietCallback) trungVietCallback(t, v);
        window.speakVietForChinese(v);
    }, () => { if (isListeningTrung) setTimeout(() => window.startListeningTrungViet(trungVietCallback), 500); });
    recognitionTrungViet?.start();
    isListeningTrung = true;
};

window.startListeningVietTrung = async (cb) => {
    if (isListeningVietTrung) return;
    recognitionVietTrung?.stop();
    vietTrungCallback = cb;
    recognitionVietTrung = createRecognitionChinese("vi-VN", async (t) => {
        const c = await callApi_CN(`Dịch Việt sang Trung:\n${t}\nTiếng Trung:`);
        if (vietTrungCallback) vietTrungCallback(t, c);
        window.speakChinese(c); // Gọi phát âm tiếng Trung bản xứ
    }, () => { if (isListeningVietTrung) setTimeout(() => window.startListeningVietTrung(vietTrungCallback), 500); });
    recognitionVietTrung?.start();
    isListeningVietTrung = true;
};
console.log("tiengtrung.js đã sẵn sàng");