// tiengphap.js - Xử lý dịch thuật tiếng Pháp - Pháp-Việt, Việt-Pháp
// MODEL_NAME và callGroqAPI được định nghĩa trong config.js

let recognitionPhapViet = null;
let recognitionVietPhap = null;
let isListeningPhap = false;
let isListeningVietPhap = false;

let phapVietCallback = null;
let vietPhapCallback = null;

// Hàm dịch - dùng callGroqAPI từ config.js
async function translateFrench(text, sourceLang, targetLang) {
    let prompt = "";
    if (sourceLang === "French" && targetLang === "Vietnamese") {
        prompt = `Dịch câu sau từ tiếng Pháp sang tiếng Việt. CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG VIỆT, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Pháp: ${text}\n\nTiếng Việt:`;
    } else {
        prompt = `Dịch câu sau từ tiếng Việt sang tiếng Pháp. CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG PHÁP, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Việt: ${text}\n\nTiếng Pháp:`;
    }
    
    // Sử dụng hàm từ config.js
    return await callApi(prompt, 0, 300);
}

// Hàm kiểm tra và lấy giọng đọc tiếng Pháp
function getFrenchVoice() {
    if (!window.speechSynthesis) return null;
    
    const voices = window.speechSynthesis.getVoices();
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

console.log("tiengphap.js đã sẵn sàng - Dùng config.js để cấu hình");