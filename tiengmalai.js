// tiengmalai.js - Xử lý dịch thuật tiếng Malaysia (Bahasa) - Malai-Việt, Việt-Malai
// MODEL_NAME và callGroqAPI được định nghĩa trong config.js

let recognitionMalaiViet = null;
let recognitionVietMalai = null;
let isListeningMalai = false;
let isListeningVietMalai = false;

let malaiVietCallback = null;
let vietMalaiCallback = null;

// Hàm dịch - dùng callGroqAPI từ config.js
async function translateMalay(text, sourceLang, targetLang) {
    let prompt = "";
    if (sourceLang === "Malay" && targetLang === "Vietnamese") {
        prompt = `Dịch câu sau từ tiếng Malaysia (Bahasa Melayu) sang tiếng Việt. CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG VIỆT, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Malaysia: ${text}\n\nTiếng Việt:`;
    } else {
        prompt = `Dịch câu sau từ tiếng Việt sang tiếng Malaysia (Bahasa Melayu). CHỈ TRẢ VỀ ĐÚNG CÂU TIẾNG MALAYSIA, KHÔNG THÊM GÌ KHÁC.\n\nTiếng Việt: ${text}\n\nTiếng Malaysia:`;
    }
    
    // Sử dụng hàm từ config.js
    return await callApi(prompt, 0, 300);
}

// Hàm kiểm tra và lấy giọng đọc tiếng Malaysia
function getMalayVoice() {
    if (!window.speechSynthesis) return null;
    
    const voices = window.speechSynthesis.getVoices();
    console.log("Các giọng đọc có sẵn:", voices.map(v => `${v.lang} - ${v.name}`));
    
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

console.log("tiengmalai.js đã sẵn sàng - Dùng config.js để cấu hình");