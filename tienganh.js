// tienganh.js - Xử lý Web Audio (Microphone), Groq API dịch thuật

const MODEL_NAME = "qwen/qwen3-32b";

let recognitionAnhViet = null;
let recognitionVietAnh = null;
let isListeningAnh = false;
let isListeningViet = false;

let anhVietCallback = null;
let vietAnhCallback = null;

// Hàm gọi Groq dịch - CẤM TUYỆT ĐỐI SUY NGHĨ
async function translateText(text, sourceLang, targetLang) {
    let prompt = "";
    if (sourceLang === "English" && targetLang === "Vietnamese") {
        prompt = `Dịch câu sau từ tiếng Anh sang tiếng Việt. CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG VIỆT, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Anh: ${text}\n\nTiếng Việt:`;
    } else {
        prompt = `Dịch câu sau từ tiếng Việt sang tiếng Anh. CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG ANH, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Việt: ${text}\n\nTiếng Anh:`;
    }
    
    try {
        const response = await fetch("https://dichthuatdulich.cuongprovuidulieu.workers.dev", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    { 
                        role: "system", 
                        content: `Bạn là công cụ dịch thuật. QUY TẮC NGHIÊM NGẶT:
1. KHÔNG được thêm bất kỳ thẻ <think> hay </think>
2. KHÔNG được giải thích, KHÔNG được chú thích
3. KHÔNG được thêm từ "Dịch:", "Answer:", "Result:"
4. CHỈ trả về duy nhất câu đã dịch
5. Nếu câu gốc là "tôi muốn đi du lịch ở hongkong" thì chỉ trả về "I want to travel to Hong Kong"
6. TUYỆT ĐỐI KHÔNG SUY NGHĨ, CHỈ DỊCH THUẦN TÚY`
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
        
        console.log("API Response:", data);
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            let translated = data.choices[0].message.content.trim();
            
            // Loại bỏ thẻ <think> nếu vẫn còn
            translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '');
            // Loại bỏ các từ thừa
            translated = translated.replace(/^(dịch|translation|translate|kết quả|result|answer):\s*/i, '');
            // Loại bỏ dấu ngoặc
            translated = translated.replace(/^["']|["']$/g, '');
            
            // Nếu kết quả vẫn còn rác, thử lấy câu cuối cùng
            if (translated.includes('\n')) {
                const lines = translated.split('\n');
                translated = lines[lines.length - 1].trim();
            }
            
            return translated || (sourceLang === "English" ? "[Lỗi]" : "[Error]");
        } else {
            console.error("Lỗi Groq:", data);
            return sourceLang === "English" ? "[Lỗi dịch]" : "[Translation error]";
        }
    } catch (err) {
        console.error("API error:", err);
        return sourceLang === "English" ? "[Lỗi kết nối]" : "[Connection error]";
    }
}

// Tổng hợp giọng nói
window.speakText = function(text, lang = 'vi-VN') {
    if (!window.speechSynthesis) {
        console.warn("Trình duyệt không hỗ trợ speechSynthesis");
        return;
    }
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 100);
};

// Hàm khởi tạo nhận diện giọng nói
function createRecognition(langCode, onResult, onEnd) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Trình duyệt không hỗ trợ nhận diện giọng nói. Vui lòng dùng Chrome/Edge/Safari.");
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
            console.log(`Nhận dạng: ${finalTranscript}`);
            await onResult(finalTranscript);
        }
    };
    
    recognition.onerror = (event) => {
        console.error("Recognition error:", event.error);
        if (event.error === 'not-allowed') {
            alert("Vui lòng cho phép truy cập microphone để sử dụng tính năng dịch thuật.");
        }
        if (onEnd) onEnd();
    };
    
    recognition.onend = () => {
        console.log(`Kết thúc nghe ${langCode}`);
        if (onEnd) onEnd();
    };
    
    return recognition;
}

// Dừng lắng nghe
window.stopAnhVietListening = () => {
    if (recognitionAnhViet) {
        try { recognitionAnhViet.stop(); } catch(e) {}
        recognitionAnhViet = null;
    }
    isListeningAnh = false;
    console.log("Đã dừng nghe Anh-Việt");
};

window.stopVietAnhListening = () => {
    if (recognitionVietAnh) {
        try { recognitionVietAnh.stop(); } catch(e) {}
        recognitionVietAnh = null;
    }
    isListeningViet = false;
    console.log("Đã dừng nghe Việt-Anh");
};

// Bắt đầu nghe Anh -> Việt
window.startListeningAnhViet = async (callback) => {
    if (isListeningAnh) {
        console.log("Đang nghe Anh-Việt rồi");
        return;
    }
    
    if (recognitionAnhViet) {
        try { recognitionAnhViet.stop(); } catch(e) {}
        recognitionAnhViet = null;
    }
    
    anhVietCallback = callback;
    
    const onResultHandler = async (spokenEnglish) => {
        console.log(`Tiếng Anh nhận: "${spokenEnglish}"`);
        const vietText = await translateText(spokenEnglish, "English", "Vietnamese");
        console.log(`Dịch sang Việt: "${vietText}"`);
        if (anhVietCallback) {
            anhVietCallback(spokenEnglish, vietText);
        }
    };
    
    const onEndHandler = () => {
        if (isListeningAnh) {
            setTimeout(() => {
                if (isListeningAnh && window.startListeningAnhViet) {
                    window.startListeningAnhViet(anhVietCallback);
                }
            }, 500);
        }
    };
    
    recognitionAnhViet = createRecognition("en-US", onResultHandler, onEndHandler);
    if (recognitionAnhViet) {
        try {
            recognitionAnhViet.start();
            isListeningAnh = true;
            console.log("Đã bắt đầu nghe Anh-Việt");
        } catch(e) {
            console.error("Lỗi start recognition:", e);
        }
    }
};

// Bắt đầu nghe Việt -> Anh
window.startListeningVietAnh = async (callback) => {
    if (isListeningViet) {
        console.log("Đang nghe Việt-Anh rồi");
        return;
    }
    
    if (recognitionVietAnh) {
        try { recognitionVietAnh.stop(); } catch(e) {}
        recognitionVietAnh = null;
    }
    
    vietAnhCallback = callback;
    
    const onResultHandler = async (spokenViet) => {
        console.log(`Tiếng Việt nhận: "${spokenViet}"`);
        const englishText = await translateText(spokenViet, "Vietnamese", "English");
        console.log(`Dịch sang Anh: "${englishText}"`);
        if (vietAnhCallback) {
            vietAnhCallback(spokenViet, englishText);
        }
    };
    
    const onEndHandler = () => {
        if (isListeningViet) {
            setTimeout(() => {
                if (isListeningViet && window.startListeningVietAnh) {
                    window.startListeningVietAnh(vietAnhCallback);
                }
            }, 500);
        }
    };
    
    recognitionVietAnh = createRecognition("vi-VN", onResultHandler, onEndHandler);
    if (recognitionVietAnh) {
        try {
            recognitionVietAnh.start();
            isListeningViet = true;
            console.log("Đã bắt đầu nghe Việt-Anh");
        } catch(e) {
            console.error("Lỗi start recognition:", e);
        }
    }
};

console.log("tienganh.js đã sẵn sàng - Đã cấm thẻ <think>");