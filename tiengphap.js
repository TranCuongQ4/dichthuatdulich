// tiengphap.js - Xử lý dịch thuật tiếng Pháp - Pháp-Việt, Việt-Pháp

const MODEL_NAME_FR = "qwen/qwen3-32b";

let recognitionPhapViet = null;
let recognitionVietPhap = null;
let isListeningPhap = false;
let isListeningVietPhap = false;

let phapVietCallback = null;
let vietPhapCallback = null;

// Hàm dịch tiếng Pháp
async function translateFrench(text, sourceLang, targetLang) {
    let prompt = "";
    if (sourceLang === "French" && targetLang === "Vietnamese") {
        prompt = `Dịch câu sau từ tiếng Pháp sang tiếng Việt. CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG VIỆT, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Pháp: ${text}\n\nTiếng Việt:`;
    } else {
        prompt = `Dịch câu sau từ tiếng Việt sang tiếng Pháp. CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG PHÁP, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Việt: ${text}\n\nTiếng Pháp:`;
    }
    
    try {
        const response = await fetch("https://dichthuatdulich.cuongprovuidulieu.workers.dev", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
                model: MODEL_NAME_FR,
                messages: [
                    { 
                        role: "system", 
                        content: `Bạn là công cụ dịch thuật tiếng Pháp - Việt. QUY TẮC NGHIÊM NGẶT:
1. KHÔNG được thêm bất kỳ thẻ <think> hay </think>
2. KHÔNG được giải thích, KHÔNG được chú thích
3. KHÔNG được thêm từ "Dịch:", "Answer:", "Result:", "Double-checking"
4. CHỈ trả về duy nhất câu đã dịch
5. Dịch PHÁP -> VIỆT hoặc VIỆT -> PHÁP chính xác, tự nhiên
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
        
        console.log("API Response French:", data);
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            let translated = data.choices[0].message.content.trim();
            translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '');
            translated = translated.replace(/^(dịch|translation|translate|kết quả|result|answer|double-checking|Double-checking):\s*/i, '');
            translated = translated.replace(/^["']|["']$/g, '');
            
            if (translated.includes('\n')) {
                const lines = translated.split('\n');
                translated = lines[lines.length - 1].trim();
            }
            
            return translated || (sourceLang === "French" ? "[Lỗi dịch]" : "[Erreur de traduction]");
        } else {
            console.error("Lỗi Groq French:", data);
            return sourceLang === "French" ? "[Lỗi dịch]" : "[Erreur de traduction]";
        }
    } catch (err) {
        console.error("API French error:", err);
        return sourceLang === "French" ? "[Lỗi kết nối]" : "[Erreur de connexion]";
    }
}

// Hàm kiểm tra và lấy giọng đọc tiếng Pháp
function getFrenchVoice() {
    if (!window.speechSynthesis) return null;
    
    const voices = window.speechSynthesis.getVoices();
    // Tìm giọng Pháp chuẩn
    let frenchVoice = voices.find(voice => 
        voice.lang === 'fr-FR' || 
        voice.lang.startsWith('fr-') ||
        voice.name.toLowerCase().includes('french') ||
        voice.name.toLowerCase().includes('français')
    );
    
    if (frenchVoice) {
        console.log("Tìm thấy giọng Pháp:", frenchVoice.lang, frenchVoice.name);
    } else {
        console.warn("Không tìm thấy giọng Pháp! Sẽ dùng giọng mặc định fr-FR.");
    }
    
    return frenchVoice;
}

// Hàm phát âm thanh tiếng Pháp
function speakFrench(text, showToastCallback) {
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
        
        // Thử lấy giọng Pháp
        const frenchVoice = getFrenchVoice();
        if (frenchVoice) {
            utterance.voice = frenchVoice;
            utterance.lang = frenchVoice.lang;
        } else {
            utterance.lang = 'fr-FR';
        }
        
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        console.log(`Phát âm Pháp: "${text}" | Lang: ${utterance.lang}`);
        
        utterance.onerror = (event) => {
            console.error('Phát âm Pháp lỗi:', event);
            if (showToastCallback) showToastCallback('⚠️ Không thể phát âm thanh tiếng Pháp');
        };
        
        utterance.onend = () => {
            console.log('Phát âm Pháp hoàn tất');
        };
        
        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 50);
    } catch(e) {
        console.error('Lỗi phát âm Pháp:', e);
        if (showToastCallback) showToastCallback('⚠️ Lỗi phát âm thanh');
    }
}

// Hàm khởi tạo nhận diện giọng nói tiếng Pháp
function createRecognitionFrench(langCode, onResult, onEnd) {
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
            console.log(`Nhận dạng Pháp: ${finalTranscript}`);
            await onResult(finalTranscript);
        }
    };
    
    recognition.onerror = (event) => {
        console.error("Recognition Pháp error:", event.error);
        if (event.error === 'not-allowed') {
            alert("Vui lòng cho phép microphone để dịch tiếng Pháp!");
        }
        if (onEnd) onEnd();
    };
    
    recognition.onend = () => {
        console.log(`Kết thúc nghe ${langCode}`);
        if (onEnd) onEnd();
    };
    
    return recognition;
}

// Dừng lắng nghe Pháp-Việt
window.stopPhapVietListening = () => {
    if (recognitionPhapViet) {
        try { recognitionPhapViet.stop(); } catch(e) {}
        recognitionPhapViet = null;
    }
    isListeningPhap = false;
    console.log("Đã dừng nghe Pháp-Việt");
};

// Dừng lắng nghe Việt-Pháp
window.stopVietPhapListening = () => {
    if (recognitionVietPhap) {
        try { recognitionVietPhap.stop(); } catch(e) {}
        recognitionVietPhap = null;
    }
    isListeningVietPhap = false;
    console.log("Đã dừng nghe Việt-Pháp");
};

// Bắt đầu nghe Pháp -> Việt
window.startListeningPhapViet = async (callback) => {
    if (isListeningPhap) {
        console.log("Đang nghe Pháp-Việt rồi");
        return;
    }
    
    if (recognitionPhapViet) {
        try { recognitionPhapViet.stop(); } catch(e) {}
        recognitionPhapViet = null;
    }
    
    phapVietCallback = callback;
    
    const onResultHandler = async (spokenFrench) => {
        console.log(`Tiếng Pháp nhận: "${spokenFrench}"`);
        const vietText = await translateFrench(spokenFrench, "French", "Vietnamese");
        console.log(`Dịch sang Việt: "${vietText}"`);
        if (phapVietCallback) {
            phapVietCallback(spokenFrench, vietText);
        }
    };
    
    const onEndHandler = () => {
        if (isListeningPhap) {
            setTimeout(() => {
                if (isListeningPhap && window.startListeningPhapViet) {
                    window.startListeningPhapViet(phapVietCallback);
                }
            }, 500);
        }
    };
    
    recognitionPhapViet = createRecognitionFrench("fr-FR", onResultHandler, onEndHandler);
    if (recognitionPhapViet) {
        try {
            recognitionPhapViet.start();
            isListeningPhap = true;
            console.log("Đã bắt đầu nghe Pháp-Việt");
        } catch(e) {
            console.error("Lỗi start recognition Pháp:", e);
        }
    }
};

// Bắt đầu nghe Việt -> Pháp
window.startListeningVietPhap = async (callback) => {
    if (isListeningVietPhap) {
        console.log("Đang nghe Việt-Pháp rồi");
        return;
    }
    
    if (recognitionVietPhap) {
        try { recognitionVietPhap.stop(); } catch(e) {}
        recognitionVietPhap = null;
    }
    
    vietPhapCallback = callback;
    
    const onResultHandler = async (spokenViet) => {
        console.log(`Tiếng Việt nhận: "${spokenViet}"`);
        const frenchText = await translateFrench(spokenViet, "Vietnamese", "French");
        console.log(`Dịch sang Pháp: "${frenchText}"`);
        if (vietPhapCallback) {
            vietPhapCallback(spokenViet, frenchText);
        }
    };
    
    const onEndHandler = () => {
        if (isListeningVietPhap) {
            setTimeout(() => {
                if (isListeningVietPhap && window.startListeningVietPhap) {
                    window.startListeningVietPhap(vietPhapCallback);
                }
            }, 500);
        }
    };
    
    recognitionVietPhap = createRecognitionFrench("vi-VN", onResultHandler, onEndHandler);
    if (recognitionVietPhap) {
        try {
            recognitionVietPhap.start();
            isListeningVietPhap = true;
            console.log("Đã bắt đầu nghe Việt-Pháp");
        } catch(e) {
            console.error("Lỗi start recognition Việt-Pháp:", e);
        }
    }
};

// Export hàm speakFrench
window.speakFrench = speakFrench;

console.log("tiengphap.js đã sẵn sàng - Hỗ trợ dịch Pháp-Việt, Việt-Pháp");