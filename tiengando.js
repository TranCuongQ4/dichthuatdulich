// tiengando.js - Xử lý dịch thuật tiếng Ấn Độ (Hindi) - Ấn-Việt, Việt-Ấn

const MODEL_NAME_HI = "qwen/qwen3-32b";

let recognitionAnDoViet = null;
let recognitionVietAnDo = null;
let isListeningAnDo = false;
let isListeningVietAnDo = false;

let anDoVietCallback = null;
let vietAnDoCallback = null;

// Hàm dịch tiếng Ấn Độ (Hindi) - CẤM TUYỆT ĐỐI SUY NGHĨ
async function translateHindi(text, sourceLang, targetLang) {
    let prompt = "";
    if (sourceLang === "Hindi" && targetLang === "Vietnamese") {
        prompt = `Dịch câu sau từ tiếng Hindi (Ấn Độ) sang tiếng Việt. CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG VIỆT, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Hindi: ${text}\n\nTiếng Việt:`;
    } else {
        prompt = `Dịch câu sau từ tiếng Việt sang tiếng Hindi (Ấn Độ). CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG HINDI, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Việt: ${text}\n\nTiếng Hindi:`;
    }
    
    try {
        const response = await fetch("https://dichthuatdulich.cuongprovuidulieu.workers.dev", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
                model: MODEL_NAME_HI,
                messages: [
                    { 
                        role: "system", 
                        content: `Bạn là công cụ dịch thuật. QUY TẮC NGHIÊM NGẶT:
1. KHÔNG được thêm bất kỳ thẻ <think> hay </think>
2. KHÔNG được giải thích, KHÔNG được chú thích
3. KHÔNG được thêm từ "Dịch:", "Answer:", "Result:", "Double-checking"
4. CHỈ trả về duy nhất câu đã dịch
5. TUYỆT ĐỐI KHÔNG SUY NGHĨ, CHỈ DỊCH THUẦN TÚY`
                    },
                    { 
                        role: "user", 
                        content: prompt 
                    }
                ],
                temperature: 0,
                max_tokens: 200
            })
        });
        const data = await response.json();
        
        console.log("API Response Hindi:", data);
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            let translated = data.choices[0].message.content.trim();
            
            // Loại bỏ thẻ <think> nếu vẫn còn
            translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '');
            // Loại bỏ các từ thừa như "Double-checking:", "Dịch:", v.v
            translated = translated.replace(/^(dịch|translation|translate|kết quả|result|answer|double-checking|Double-checking):\s*/i, '');
            // Loại bỏ dấu ngoặc
            translated = translated.replace(/^["']|["']$/g, '');
            
            // Nếu kết quả vẫn còn rác, thử lấy câu cuối cùng
            if (translated.includes('\n')) {
                const lines = translated.split('\n');
                translated = lines[lines.length - 1].trim();
            }
            
            return translated || (sourceLang === "Hindi" ? "[Lỗi]" : "[Error]");
        } else {
            console.error("Lỗi Groq Hindi:", data);
            return sourceLang === "Hindi" ? "[Lỗi dịch]" : "[Translation error]";
        }
    } catch (err) {
        console.error("API Hindi error:", err);
        return sourceLang === "Hindi" ? "[Lỗi kết nối]" : "[Connection error]";
    }
}

// Tổng hợp giọng nói (dùng chung từ window.speakText)
// window.speakText đã được định nghĩa trong tienganh.js

// Hàm khởi tạo nhận diện giọng nói tiếng Hindi
function createRecognitionHindi(langCode, onResult, onEnd) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Trình duyệt không hỗ trợ nhận diện giọng nói!");
        return null;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = langCode;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        console.log(`Bắt đầu nghe ${langCode}`);
    };

    recognition.onresult = async (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }
        
        if (finalTranscript && onResult) {
            console.log(`Nhận dạng Hindi: ${finalTranscript}`);
            await onResult(finalTranscript);
        }
    };
    
    recognition.onerror = (event) => {
        console.error("Recognition Hindi error:", event.error);
        if (event.error === 'not-allowed') {
            alert("Vui lòng cho phép microphone để dịch tiếng Hindi!");
        }
        if (onEnd) onEnd();
    };
    
    recognition.onend = () => {
        console.log(`Kết thúc nghe ${langCode}`);
        if (onEnd) onEnd();
    };
    
    return recognition;
}

// Dừng lắng nghe Ấn-Việt
window.stopAnDoVietListening = () => {
    if (recognitionAnDoViet) {
        try { recognitionAnDoViet.stop(); } catch(e) {}
        recognitionAnDoViet = null;
    }
    isListeningAnDo = false;
    console.log("Đã dừng nghe Ấn-Việt");
};

// Dừng lắng nghe Việt-Ấn
window.stopVietAnDoListening = () => {
    if (recognitionVietAnDo) {
        try { recognitionVietAnDo.stop(); } catch(e) {}
        recognitionVietAnDo = null;
    }
    isListeningVietAnDo = false;
    console.log("Đã dừng nghe Việt-Ấn");
};

// Bắt đầu nghe Ấn -> Việt (Hindi to Vietnamese)
window.startListeningAnDoViet = async (callback) => {
    if (isListeningAnDo) {
        console.log("Đang nghe Ấn-Việt rồi");
        return;
    }
    
    if (recognitionAnDoViet) {
        try { recognitionAnDoViet.stop(); } catch(e) {}
        recognitionAnDoViet = null;
    }
    
    anDoVietCallback = callback;
    
    const onResultHandler = async (spokenHindi) => {
        console.log(`Tiếng Hindi nhận: "${spokenHindi}"`);
        const vietText = await translateHindi(spokenHindi, "Hindi", "Vietnamese");
        console.log(`Dịch sang Việt: "${vietText}"`);
        if (anDoVietCallback) {
            anDoVietCallback(spokenHindi, vietText);
        }
    };
    
    const onEndHandler = () => {
        if (isListeningAnDo) {
            setTimeout(() => {
                if (isListeningAnDo && window.startListeningAnDoViet) {
                    window.startListeningAnDoViet(anDoVietCallback);
                }
            }, 500);
        }
    };
    
    recognitionAnDoViet = createRecognitionHindi("hi-IN", onResultHandler, onEndHandler);
    if (recognitionAnDoViet) {
        try {
            recognitionAnDoViet.start();
            isListeningAnDo = true;
            console.log("Đã bắt đầu nghe Ấn-Việt");
        } catch(e) {
            console.error("Lỗi start recognition Hindi:", e);
        }
    }
};

// Bắt đầu nghe Việt -> Ấn (Vietnamese to Hindi)
window.startListeningVietAnDo = async (callback) => {
    if (isListeningVietAnDo) {
        console.log("Đang nghe Việt-Ấn rồi");
        return;
    }
    
    if (recognitionVietAnDo) {
        try { recognitionVietAnDo.stop(); } catch(e) {}
        recognitionVietAnDo = null;
    }
    
    vietAnDoCallback = callback;
    
    const onResultHandler = async (spokenViet) => {
        console.log(`Tiếng Việt nhận: "${spokenViet}"`);
        const hindiText = await translateHindi(spokenViet, "Vietnamese", "Hindi");
        console.log(`Dịch sang Hindi: "${hindiText}"`);
        if (vietAnDoCallback) {
            vietAnDoCallback(spokenViet, hindiText);
        }
    };
    
    const onEndHandler = () => {
        if (isListeningVietAnDo) {
            setTimeout(() => {
                if (isListeningVietAnDo && window.startListeningVietAnDo) {
                    window.startListeningVietAnDo(vietAnDoCallback);
                }
            }, 500);
        }
    };
    
    recognitionVietAnDo = createRecognitionHindi("vi-VN", onResultHandler, onEndHandler);
    if (recognitionVietAnDo) {
        try {
            recognitionVietAnDo.start();
            isListeningVietAnDo = true;
            console.log("Đã bắt đầu nghe Việt-Ấn");
        } catch(e) {
            console.error("Lỗi start recognition Việt-Ấn:", e);
        }
    }
};

console.log("tiengando.js đã sẵn sàng - Hỗ trợ dịch Ấn-Việt, Việt-Ấn (Hindi) - Đã cấm suy nghĩ");