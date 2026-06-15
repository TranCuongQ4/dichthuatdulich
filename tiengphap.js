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
                messages: [{ role: "system", content: "Bạn là công cụ dịch thuật. CHỈ trả về câu đã dịch, tuyệt đối KHÔNG giải thích, KHÔNG thêm từ, KHÔNG sáng tạo. Dịch chính xác câu người dùng cung cấp." }, { role: "user", content: prompt }],
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

let recognitionPhapViet = null, recognitionVietPhap = null, isListeningPhap = false, isListeningVietPhap = false, phapVietCallback = null, vietPhapCallback = null;

function createRecognitionFrench(langCode, onResult, onEnd) {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = langCode;
    recognition.onresult = async (e) => { let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript; if (t && onResult) await onResult(t); };
    recognition.onerror = (e) => { if (onEnd) onEnd(); };
    recognition.onend = () => { if (onEnd) onEnd(); };
    return recognition;
}

window.speakFrench = function(text) { 
    if (!text || !window.speechSynthesis) return; 
    window.speechSynthesis.cancel(); 
    const u = new SpeechSynthesisUtterance(text); 
    u.lang = 'fr-FR';
    u.rate = 0.9; 
    setTimeout(() => window.speechSynthesis.speak(u), 50); 
};

window.speakVietForFrench = function(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    u.rate = 0.9;
    setTimeout(() => window.speechSynthesis.speak(u), 50);
};

window.stopPhapVietListening = () => { if (recognitionPhapViet) { try { recognitionPhapViet.stop(); } catch(e) {} recognitionPhapViet = null; } isListeningPhap = false; };
window.stopVietPhapListening = () => { if (recognitionVietPhap) { try { recognitionVietPhap.stop(); } catch(e) {} recognitionVietPhap = null; } isListeningVietPhap = false; };

window.startListeningPhapViet = async (cb) => { 
    if (isListeningPhap) return; 
    recognitionPhapViet?.stop(); 
    phapVietCallback = cb; 
    recognitionPhapViet = createRecognitionFrench("fr-FR", async (t) => { 
        const v = await callApi_FR(`Dịch câu sau đây từ Pháp sang Việt (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`); 
        if (phapVietCallback) phapVietCallback(t, v); 
        window.speakVietForFrench(v);
    }, () => { if (isListeningPhap) setTimeout(() => window.startListeningPhapViet(phapVietCallback), 500); }); 
    recognitionPhapViet?.start(); 
    isListeningPhap = true; 
};

window.startListeningVietPhap = async (cb) => { 
    if (isListeningVietPhap) return; 
    recognitionVietPhap?.stop(); 
    vietPhapCallback = cb; 
    recognitionVietPhap = createRecognitionFrench("vi-VN", async (t) => { 
        const f = await callApi_FR(`Dịch câu sau đây từ Việt sang Pháp (CHỈ trả về bản dịch, không thêm gì khác):\n${t}`); 
        if (vietPhapCallback) vietPhapCallback(t, f); 
        window.speakFrench(f);
    }, () => { if (isListeningVietPhap) setTimeout(() => window.startListeningVietPhap(vietPhapCallback), 500); }); 
    recognitionVietPhap?.start(); 
    isListeningVietPhap = true; 
};
console.log("tiengphap.js đã sẵn sàng");