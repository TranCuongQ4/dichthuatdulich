// tiengmalai.js - Xử lý dịch thuật tiếng Malaysia (Bahasa) - Malai-Việt, Việt-Malai

const MODEL_NAME_MS = "qwen/qwen3-32b";

let recognitionMalaiViet = null;
let recognitionVietMalai = null;
let isListeningMalai = false;
let isListeningVietMalai = false;

let malaiVietCallback = null;
let vietMalaiCallback = null;

// Hàm dịch tiếng Malaysia
async function translateMalay(text, sourceLang, targetLang) {
    let prompt = "";
    if (sourceLang === "Malay" && targetLang === "Vietnamese") {
        prompt = `Dịch câu sau từ tiếng Malaysia (Bahasa Melayu) sang tiếng Việt. CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG VIỆT, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Malaysia: ${text}\n\nTiếng Việt:`;
    } else {
        prompt = `Dịch câu sau từ tiếng Việt sang tiếng Malaysia (Bahasa Melayu). CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG MALAYSIA, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Việt: ${text}\n\nTiếng Malaysia:`;
    }
    
    try {
        const response = await fetch("https://dichthuatdulich.cuongprovuidulieu.workers.dev", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
                model: MODEL_NAME_MS,
                messages: [
                    { 
                        role: "system", 
                        content: `Bạn là công cụ dịch thuật tiếng Malaysia - Việt. QUY TẮC NGHIÊM NGẶT:
1. KHÔNG được thêm bất kỳ thẻ <think> hay </think>
2. KHÔNG được giải thích, KHÔNG được chú thích
3. KHÔNG được thêm từ "Dịch:", "Answer:", "Result:", "Double-checking"
4. CHỈ trả về duy nhất câu đã dịch
5. Dịch MALAY -> VIỆT hoặc VIỆT -> MALAY chính xác, tự nhiên
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
        
        console.log("API Response Malay:", data);
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            let translated = data.choices[0].message.content.trim();
            translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '');
            translated = translated.replace(/^(dịch|translation|translate|kết quả|result|answer|double-checking|Double-checking):\s*/i, '');
            translated = translated.replace(/^["']|["']$/g, '');
            
            if (translated.includes('\n')) {
                const lines = translated.split('\n');
                translated = lines[lines.length - 1].trim();
            }
            
            return translated || (sourceLang === "Malay" ? "[Lỗi dịch]" : "[Ralat terjemahan]");
        } else {
            console.error("Lỗi Groq Malay:", data);
            return sourceLang === "Malay" ? "[Lỗi dịch]" : "[Ralat terjemahan]";
        }
    } catch (err) {
        console.error("API Malay error:", err);
        return sourceLang === "Malay" ? "[Lỗi kết nối]" : "[Ralat sambungan]";
    }
}

// Hàm kiểm tra và lấy giọng đọc tiếng Malaysia
function getMalayVoice() {
    if (!window.speechSynthesis) return null;
    
    const voices = window.speechSynthesis.getVoices();
    console.log("Các giọng đọc có sẵn:", voices.map(v => `${v.lang} - ${v.name}`));
    
    // Thử tìm giọng Malaysia
    let malayVoice = voices.find(voice => 
        voice.lang === 'ms-MY' || 
        voice.lang === 'ms' || 
        voice.lang.startsWith('ms-') ||
        voice.name.toLowerCase().includes('malay') ||
        voice.name.toLowerCase().includes('malaysia') ||
        voice.name.toLowerCase().includes('bahasa')
    );
    
    if (malayVoice) {
        console.log("Tìm thấy giọng Malaysia:", malayVoice.lang, malayVoice.name);
    } else {
        console.warn("Không tìm thấy giọng Malaysia! Sẽ dùng giọng mặc định.");
    }
    
    return malayVoice;
}

// Hàm phát âm thanh tiếng Malaysia
function speakMalay(text, showToastCallback) {
    if (!text || text.trim() === '') {
        if (showToastCallback) showToastCallback('⚠️ Không có nội dung để phát');
        return;
    }
    
    if (!window.speechSynthesis) {
        if (showToastCallback) showToastCallback('⚠️ Trình duyệt không hỗ trợ phát âm thanh');
        return;
    }
    
    try {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Thử lấy giọng Malaysia
        const malayVoice = getMalayVoice();
        if (malayVoice) {
            utterance.voice = malayVoice;
            utterance.lang = malayVoice.lang;
        } else {
            utterance.lang = 'ms-MY';
        }
        
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        console.log(`Phát âm Malaysia: "${text}" | Lang: ${utterance.lang}`);
        
        utterance.onerror = (event) => {
            console.error('Phát âm Malaysia lỗi:', event);
            if (showToastCallback) showToastCallback('⚠️ Không thể phát âm thanh tiếng Malaysia');
        };
        
        utterance.onend = () => {
            console.log('Phát âm Malaysia hoàn tất');
        };
        
        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 50);
    } catch(e) {
        console.error('Lỗi phát âm Malaysia:', e);
        if (showToastCallback) showToastCallback('⚠️ Lỗi phát âm thanh');
    }
}

// Dừng lắng nghe Malai-Việt
window.stopMalaiVietListening = () => {
    if (recognitionMalaiViet) {
        try { recognitionMalaiViet.stop(); } catch(e) {}
        recognitionMalaiViet = null;
    }
    isListeningMalai = false;
    console.log("Đã dừng nghe Malai-Việt");
};

// Dừng lắng nghe Việt-Malai
window.stopVietMalaiListening = () => {
    if (recognitionVietMalai) {
        try { recognitionVietMalai.stop(); } catch(e) {}
        recognitionVietMalai = null;
    }
    isListeningVietMalai = false;
    console.log("Đã dừng nghe Việt-Malai");
};

// Bắt đầu nghe Malai -> Việt
window.startListeningMalaiViet = async (callback) => {
    if (isListeningMalai) {
        console.log("Đang nghe Malai-Việt rồi");
        return;
    }
    
    if (recognitionMalaiViet) {
        try { recognitionMalaiViet.stop(); } catch(e) {}
        recognitionMalaiViet = null;
    }
    
    malaiVietCallback = callback;
    
    const onResultHandler = async (spokenMalay) => {
        console.log(`Tiếng Malaysia nhận: "${spokenMalay}"`);
        const vietText = await translateMalay(spokenMalay, "Malay", "Vietnamese");
        console.log(`Dịch sang Việt: "${vietText}"`);
        if (malaiVietCallback) {
            malaiVietCallback(spokenMalay, vietText);
        }
    };
    
    const onEndHandler = () => {
        if (isListeningMalai) {
            setTimeout(() => {
                if (isListeningMalai && window.startListeningMalaiViet) {
                    window.startListeningMalaiViet(malaiVietCallback);
                }
            }, 500);
        }
    };
    
    recognitionMalaiViet = createRecognitionMalay("ms-MY", onResultHandler, onEndHandler);
    if (recognitionMalaiViet) {
        try {
            recognitionMalaiViet.start();
            isListeningMalai = true;
            console.log("Đã bắt đầu nghe Malai-Việt");
        } catch(e) {
            console.error("Lỗi start recognition Malay:", e);
        }
    }
};

// Bắt đầu nghe Việt -> Malai
window.startListeningVietMalai = async (callback) => {
    if (isListeningVietMalai) {
        console.log("Đang nghe Việt-Malai rồi");
        return;
    }
    
    if (recognitionVietMalai) {
        try { recognitionVietMalai.stop(); } catch(e) {}
        recognitionVietMalai = null;
    }
    
    vietMalaiCallback = callback;
    
    const onResultHandler = async (spokenViet) => {
        console.log(`Tiếng Việt nhận: "${spokenViet}"`);
        const malayText = await translateMalay(spokenViet, "Vietnamese", "Malay");
        console.log(`Dịch sang Malaysia: "${malayText}"`);
        if (vietMalaiCallback) {
            vietMalaiCallback(spokenViet, malayText);
        }
    };
    
    const onEndHandler = () => {
        if (isListeningVietMalai) {
            setTimeout(() => {
                if (isListeningVietMalai && window.startListeningVietMalai) {
                    window.startListeningVietMalai(vietMalaiCallback);
                }
            }, 500);
        }
    };
    
    recognitionVietMalai = createRecognitionMalay("vi-VN", onResultHandler, onEndHandler);
    if (recognitionVietMalai) {
        try {
            recognitionVietMalai.start();
            isListeningVietMalai = true;
            console.log("Đã bắt đầu nghe Việt-Malai");
        } catch(e) {
            console.error("Lỗi start recognition Việt-Malai:", e);
        }
    }
};

// Hàm khởi tạo nhận diện giọng nói tiếng Malaysia
function createRecognitionMalay(langCode, onResult, onEnd) {
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
            console.log(`Nhận dạng Malay: ${finalTranscript}`);
            await onResult(finalTranscript);
        }
    };
    
    recognition.onerror = (event) => {
        console.error("Recognition Malay error:", event.error);
        if (event.error === 'not-allowed') {
            alert("Vui lòng cho phép microphone để dịch tiếng Malaysia!");
        }
        if (onEnd) onEnd();
    };
    
    recognition.onend = () => {
        console.log(`Kết thúc nghe ${langCode}`);
        if (onEnd) onEnd();
    };
    
    return recognition;
}

// Export hàm speakMalay để script.js có thể gọi
window.speakMalay = speakMalay;

console.log("tiengmalai.js đã sẵn sàng - Hỗ trợ dịch Malai-Việt, Việt-Malai (Bahasa Malaysia)");