// tiengtrung.js - Xử lý dịch thuật tiếng Trung (Trung-Việt, Việt-Trung)

const MODEL_NAME_CN = "qwen/qwen3-32b";

let recognitionTrungViet = null;
let recognitionVietTrung = null;
let isListeningTrung = false;
let isListeningVietTrung = false;

let trungVietCallback = null;
let vietTrungCallback = null;

// Hàm dịch tiếng Trung
async function translateChinese(text, sourceLang, targetLang) {
    let prompt = "";
    if (sourceLang === "Chinese" && targetLang === "Vietnamese") {
        prompt = `Dịch câu sau từ tiếng Trung sang tiếng Việt. CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG VIỆT, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Trung: ${text}\n\nTiếng Việt:`;
    } else {
        prompt = `Dịch câu sau từ tiếng Việt sang tiếng Trung. CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG TRUNG, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Việt: ${text}\n\nTiếng Trung:`;
    }
    
    try {
        const response = await fetch("https://dichthuatdulich.cuongprovuidulieu.workers.dev", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
                model: MODEL_NAME_CN,
                messages: [
                    { 
                        role: "system", 
                        content: `Bạn là công cụ dịch thuật tiếng Trung - Việt. QUY TẮC NGHIÊM NGẶT:
1. KHÔNG được thêm bất kỳ thẻ <think> hay </think>
2. KHÔNG được giải thích, KHÔNG được chú thích
3. KHÔNG được thêm từ "Dịch:", "Answer:", "Result:"
4. CHỈ trả về duy nhất câu đã dịch
5. Dịch TRUNG -> VIỆT hoặc VIỆT -> TRUNG chính xác, tự nhiên
6. TUYỆT ĐỐI KHÔNG SUY NGHĨ, CHỈ DỊCH THUẦN TÚY`
                    },
                    { 
                        role: "user", 
                        content: prompt 
                    }
                ],
                temperature: 0,
                max_tokens: 300
            })
        });
        const data = await response.json();
        
        console.log("API Response CN:", data);
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            let translated = data.choices[0].message.content.trim();
            translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '');
            translated = translated.replace(/^(dịch|translation|translate|kết quả|result|answer):\s*/i, '');
            translated = translated.replace(/^["']|["']$/g, '');
            
            if (translated.includes('\n')) {
                const lines = translated.split('\n');
                translated = lines[lines.length - 1].trim();
            }
            
            return translated || (sourceLang === "Chinese" ? "[Lỗi dịch]" : "[翻译错误]");
        } else {
            console.error("Lỗi Groq CN:", data);
            return sourceLang === "Chinese" ? "[Lỗi dịch]" : "[翻译错误]";
        }
    } catch (err) {
        console.error("API CN error:", err);
        return sourceLang === "Chinese" ? "[Lỗi kết nối]" : "[连接错误]";
    }
}

// Hàm khởi tạo nhận diện giọng nói tiếng Trung
function createRecognitionChinese(langCode, onResult, onEnd) {
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
            console.log(`Nhận dạng Trung: ${finalTranscript}`);
            await onResult(finalTranscript);
        }
    };
    
    recognition.onerror = (event) => {
        console.error("Recognition Trung error:", event.error);
        if (event.error === 'not-allowed') {
            alert("Vui lòng cho phép microphone để dịch tiếng Trung!");
        }
        if (onEnd) onEnd();
    };
    
    recognition.onend = () => {
        console.log(`Kết thúc nghe ${langCode}`);
        if (onEnd) onEnd();
    };
    
    return recognition;
}

// Dừng lắng nghe Trung-Việt
window.stopTrungVietListening = () => {
    if (recognitionTrungViet) {
        try { recognitionTrungViet.stop(); } catch(e) {}
        recognitionTrungViet = null;
    }
    isListeningTrung = false;
    console.log("Đã dừng nghe Trung-Việt");
};

// Dừng lắng nghe Việt-Trung
window.stopVietTrungListening = () => {
    if (recognitionVietTrung) {
        try { recognitionVietTrung.stop(); } catch(e) {}
        recognitionVietTrung = null;
    }
    isListeningVietTrung = false;
    console.log("Đã dừng nghe Việt-Trung");
};

// Bắt đầu nghe Trung -> Việt
window.startListeningTrungViet = async (callback) => {
    if (isListeningTrung) {
        console.log("Đang nghe Trung-Việt rồi");
        return;
    }
    
    if (recognitionTrungViet) {
        try { recognitionTrungViet.stop(); } catch(e) {}
        recognitionTrungViet = null;
    }
    
    trungVietCallback = callback;
    
    const onResultHandler = async (spokenChinese) => {
        console.log(`Tiếng Trung nhận: "${spokenChinese}"`);
        const vietText = await translateChinese(spokenChinese, "Chinese", "Vietnamese");
        console.log(`Dịch sang Việt: "${vietText}"`);
        if (trungVietCallback) {
            trungVietCallback(spokenChinese, vietText);
        }
    };
    
    const onEndHandler = () => {
        if (isListeningTrung) {
            setTimeout(() => {
                if (isListeningTrung && window.startListeningTrungViet) {
                    window.startListeningTrungViet(trungVietCallback);
                }
            }, 500);
        }
    };
    
    recognitionTrungViet = createRecognitionChinese("zh-CN", onResultHandler, onEndHandler);
    if (recognitionTrungViet) {
        try {
            recognitionTrungViet.start();
            isListeningTrung = true;
            console.log("Đã bắt đầu nghe Trung-Việt");
        } catch(e) {
            console.error("Lỗi start recognition Trung:", e);
        }
    }
};

// Bắt đầu nghe Việt -> Trung
window.startListeningVietTrung = async (callback) => {
    if (isListeningVietTrung) {
        console.log("Đang nghe Việt-Trung rồi");
        return;
    }
    
    if (recognitionVietTrung) {
        try { recognitionVietTrung.stop(); } catch(e) {}
        recognitionVietTrung = null;
    }
    
    vietTrungCallback = callback;
    
    const onResultHandler = async (spokenViet) => {
        console.log(`Tiếng Việt nhận: "${spokenViet}"`);
        const chineseText = await translateChinese(spokenViet, "Vietnamese", "Chinese");
        console.log(`Dịch sang Trung: "${chineseText}"`);
        if (vietTrungCallback) {
            vietTrungCallback(spokenViet, chineseText);
        }
    };
    
    const onEndHandler = () => {
        if (isListeningVietTrung) {
            setTimeout(() => {
                if (isListeningVietTrung && window.startListeningVietTrung) {
                    window.startListeningVietTrung(vietTrungCallback);
                }
            }, 500);
        }
    };
    
    recognitionVietTrung = createRecognitionChinese("vi-VN", onResultHandler, onEndHandler);
    if (recognitionVietTrung) {
        try {
            recognitionVietTrung.start();
            isListeningVietTrung = true;
            console.log("Đã bắt đầu nghe Việt-Trung");
        } catch(e) {
            console.error("Lỗi start recognition Việt-Trung:", e);
        }
    }
};

console.log("tiengtrung.js đã sẵn sàng - Hỗ trợ dịch Trung-Việt, Việt-Trung");