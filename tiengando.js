if (!window.WORKER_URL) {
    window.WORKER_URL = "https://dichthuatdulich.cuongprovuidulieu.workers.dev";
}
var MODEL_NAME_HI = "llama-3.3-70b-versatile";

async function callApi_HI(prompt) {
    try {
        const response = await fetch(window.WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL_NAME_HI,
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

let recognitionAnDoViet = null, recognitionVietAnDo = null, isListeningAnDo = false, isListeningVietAnDo = false, anDoVietCallback = null, vietAnDoCallback = null;

function createRecognitionHindi(langCode, onResult, onEnd) {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = langCode;
    recognition.onresult = async (e) => { let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript; if (t && onResult) await onResult(t); };
    recognition.onerror = (e) => { if (onEnd) onEnd(); };
    recognition.onend = () => { if (onEnd) onEnd(); };
    return recognition;
}

// Bổ sung hàm đọc Tiếng Ấn Độ (Hindi) bản xứ
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

window.stopAnDoVietListening = () => { if (recognitionAnDoViet) { try { recognitionAnDoViet.stop(); } catch(e) {} recognitionAnDoViet = null; } isListeningAnDo = false; };
window.stopVietAnDoListening = () => { if (recognitionVietAnDo) { try { recognitionVietAnDo.stop(); } catch(e) {} recognitionVietAnDo = null; } isListeningVietAnDo = false; };

window.startListeningAnDoViet = async (cb) => {
    if (isListeningAnDo) return;
    recognitionAnDoViet?.stop();
    anDoVietCallback = cb;
    recognitionAnDoViet = createRecognitionHindi("hi-IN", async (t) => {
        const v = await callApi_HI(`Dịch Hindi sang Việt:\n${t}\nTiếng Việt:`);
        if (anDoVietCallback) anDoVietCallback(t, v);
        window.speakVietForHindi(v);
    }, () => { if (isListeningAnDo) setTimeout(() => window.startListeningAnDoViet(anDoVietCallback), 500); });
    recognitionAnDoViet?.start();
    isListeningAnDo = true;
};

window.startListeningVietAnDo = async (cb) => {
    if (isListeningVietAnDo) return;
    recognitionVietAnDo?.stop();
    vietAnDoCallback = cb;
    recognitionVietAnDo = createRecognitionHindi("vi-VN", async (t) => {
        const h = await callApi_HI(`Dịch Việt sang Hindi:\n${t}\nहिन्दी:`);
        if (vietAnDoCallback) vietAnDoCallback(t, h);
        window.speakHindi(h); // Gọi phát âm tiếng Ấn Độ bản xứ
    }, () => { if (isListeningVietAnDo) setTimeout(() => window.startListeningVietAnDo(vietAnDoCallback), 500); });
    recognitionVietAnDo?.start();
    isListeningVietAnDo = true;
};
console.log("tiengando.js đã sẵn sàng");