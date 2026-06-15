document.addEventListener('DOMContentLoaded', () => {
    const btnAnhViet = document.getElementById('btnAnhViet');
    const btnVietAnh = document.getElementById('btnVietAnh');
    const btnTrungViet = document.getElementById('btnTrungViet');
    const btnVietTrung = document.getElementById('btnVietTrung');
    const btnAnDoViet = document.getElementById('btnAnDoViet');
    const btnVietAnDo = document.getElementById('btnVietAnDo');
    const btnMalaiViet = document.getElementById('btnMalaiViet');
    const btnVietMalai = document.getElementById('btnVietMalai');
    const btnPhapViet = document.getElementById('btnPhapViet');
    const btnVietPhap = document.getElementById('btnVietPhap');
    const historyDiv = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const historyCountSpan = document.getElementById('historyCount');

    let modeAnhVietActive = false;
    let modeVietAnhActive = false;
    let modeTrungVietActive = false;
    let modeVietTrungActive = false;
    let modeAnDoVietActive = false;
    let modeVietAnDoActive = false;
    let modeMalaiVietActive = false;
    let modeVietMalaiActive = false;
    let modePhapVietActive = false;
    let modeVietPhapActive = false;
    
    const STORAGE_KEY = 'translation_history';
    const EXPIRY_DAYS = 10;

    let isOnline = navigator.onLine;
    
    window.addEventListener('online', () => {
        isOnline = true;
        showToast('🌐 Đã kết nối mạng. Có thể dịch mới.');
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        showToast('⚠️ Mất kết nối mạng. Chỉ có thể xem lại lịch sử.');
        disableAllModes();
    });
    
    function showToast(message) {
        let toast = document.getElementById('custom-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'custom-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 20px;
                right: 20px;
                background: #1e3a2f;
                color: #ffefc0;
                text-align: center;
                padding: 10px;
                border-radius: 30px;
                font-size: 12px;
                z-index: 1000;
                transition: opacity 0.3s;
                opacity: 0;
                pointer-events: none;
                border: 1px solid gold;
                font-weight: bold;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
        }, 2000);
    }

    // ========== QUẢN LÝ LƯU TRỮ LỊCH SỬ ==========
    function saveHistory(historyData) {
        const record = { data: historyData, timestamp: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
        updateHistoryCount(historyData.length);
    }
    
    function loadHistory() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        try {
            const record = JSON.parse(stored);
            const now = Date.now();
            const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
            if (now - record.timestamp > expiryMs) {
                localStorage.removeItem(STORAGE_KEY);
                return [];
            }
            return record.data || [];
        } catch(e) {
            return [];
        }
    }
    
    function clearAllHistory() {
        if (confirm('Bạn có chắc chắn muốn XÓA TOÀN BỘ lịch sử?')) {
            localStorage.removeItem(STORAGE_KEY);
            renderHistory();
            showToast('🗑️ Đã xóa toàn bộ lịch sử');
        }
    }
    
    function updateHistoryCount(count) {
        if (historyCountSpan) historyCountSpan.textContent = `${count} tin nhắn`;
    }
    
    function getSpeechLang(targetLang) {
        switch(targetLang.toUpperCase()) {
            case 'ANH': return 'en-US';
            case 'TRUNG': return 'zh-CN';
            case 'ẤN': return 'hi-IN';
            case 'MALAI': return 'ms-MY';
            case 'PHÁP': return 'fr-FR';
            case 'VIỆT': return 'vi-VN';
            default: return 'vi-VN';
        }
    }
    
    function speakWithLanguage(text, targetLang) {
        if (!text || text.trim() === '') {
            showToast('⚠️ Không có nội dung để phát');
            return;
        }
        
        if (targetLang.toUpperCase() === 'MALAI') {
            if (window.speakMalay) { window.speakMalay(text, showToast); } 
            else { showToast('⚠️ Chưa tải xong giọng đọc Malaysia'); }
            return;
        }
        
        if (targetLang.toUpperCase() === 'PHÁP') {
            if (window.speakFrench) { window.speakFrench(text, showToast); } 
            else { showToast('⚠️ Chưa tải xong giọng đọc Pháp'); }
            return;
        }
        
        if (!window.speechSynthesis) {
            showToast('⚠️ Trình duyệt không hỗ trợ phát âm thanh');
            return;
        }
        
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const langCode = getSpeechLang(targetLang);
            utterance.lang = langCode;
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            utterance.onerror = (event) => {
                console.error('Phát âm lỗi:', event);
                showToast(`⚠️ Không thể phát âm thanh cho ${targetLang}`);
            };
            
            setTimeout(() => { window.speechSynthesis.speak(utterance); }, 50);
        } catch(e) {
            console.error('Lỗi phát âm:', e);
            showToast('⚠️ Lỗi phát âm thanh');
        }
    }
    
    function renderHistory() {
        const history = loadHistory();
        historyDiv.innerHTML = '';
        
        if (history.length === 0) {
            historyDiv.innerHTML = '<div class="empty-history">📭 Chưa có dữ liệu. Nhấn nút bên trên để bắt đầu dịch.</div>';
            updateHistoryCount(0);
            return;
        }
        
        history.forEach((item) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'history-item';
            
            const sourceDiv = document.createElement('div');
            sourceDiv.className = 'source-text';
            sourceDiv.innerHTML = `🎤 ${item.sourceLang.toUpperCase()}: ${item.sourceText}`;
            
            const targetDiv = document.createElement('div');
            targetDiv.className = 'target-text';
            targetDiv.innerHTML = `🤖 ${item.targetLang.toUpperCase()}: ${item.translatedText}`;
            
            const actionDiv = document.createElement('div');
            actionDiv.className = 'action-buttons';
            
            const playBtn = document.createElement('button');
            playBtn.className = 'action-btn';
            playBtn.innerHTML = '🔊 Phát lại';
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                speakWithLanguage(item.translatedText, item.targetLang);
            });
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'action-btn';
            copyBtn.innerHTML = '📋 Copy';
            copyBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    await navigator.clipboard.writeText(item.translatedText);
                    copyBtn.innerHTML = '✅ Đã copy';
                    setTimeout(() => { copyBtn.innerHTML = '📋 Copy'; }, 1500);
                } catch (err) {
                    alert('Không thể copy');
                }
            });
            
            actionDiv.appendChild(playBtn);
            actionDiv.appendChild(copyBtn);
            itemDiv.appendChild(sourceDiv);
            itemDiv.appendChild(targetDiv);
            itemDiv.appendChild(actionDiv);
            historyDiv.appendChild(itemDiv);
        });
        
        updateHistoryCount(history.length);
        historyDiv.scrollTop = historyDiv.scrollHeight;
    }
    
    function addHistoryItem(sourceLang, sourceText, targetLang, translatedText) {
        const history = loadHistory();
        history.push({
            sourceLang: sourceLang,
            sourceText: sourceText,
            targetLang: targetLang,
            translatedText: translatedText,
            timestamp: Date.now()
        });
        saveHistory(history);
        renderHistory();
    }
    
    function quickBlink(btn) {
        btn.classList.add('blink-red');
        setTimeout(() => btn.classList.remove('blink-red'), 300);
    }
    
    // ========== HÀM ĐIỀU KHIỂN CHẾ ĐỘ CHUẨN TRÊN MOBILE ==========
    function disableAllModes() {
        if (modeAnhVietActive) { modeAnhVietActive = false; btnAnhViet.classList.remove('active-mode'); if (window.stopAnhVietListening) window.stopAnhVietListening(); }
        if (modeVietAnhActive) { modeVietAnhActive = false; btnVietAnh.classList.remove('active-mode'); if (window.stopVietAnhListening) window.stopVietAnhListening(); }
        if (modeTrungVietActive) { modeTrungVietActive = false; btnTrungViet.classList.remove('active-mode'); if (window.stopTrungVietListening) window.stopTrungVietListening(); }
        if (modeVietTrungActive) { modeVietTrungActive = false; btnVietTrung.classList.remove('active-mode'); if (window.stopVietTrungListening) window.stopVietTrungListening(); }
        if (modeAnDoVietActive) { modeAnDoVietActive = false; btnAnDoViet.classList.remove('active-mode'); if (window.stopAnDoVietListening) window.stopAnDoVietListening(); }
        if (modeVietAnDoActive) { modeVietAnDoActive = false; btnVietAnDo.classList.remove('active-mode'); if (window.stopVietAnDoListening) window.stopVietAnDoListening(); }
        if (modeMalaiVietActive) { modeMalaiVietActive = false; btnMalaiViet.classList.remove('active-mode'); if (window.stopMalaiVietListening) window.stopMalaiVietListening(); }
        if (modeVietMalaiActive) { modeVietMalaiActive = false; btnVietMalai.classList.remove('active-mode'); if (window.stopVietMalaiListening) window.stopVietMalaiListening(); }
        if (modePhapVietActive) { modePhapVietActive = false; btnPhapViet.classList.remove('active-mode'); if (window.stopPhapVietListening) window.stopPhapVietListening(); }
        if (modeVietPhapActive) { modeVietPhapActive = false; btnVietPhap.classList.remove('active-mode'); if (window.stopVietPhapListening) window.stopVietPhapListening(); }
    }

    // Định nghĩa hành động kích hoạt an toàn với độ trễ (Safe Activation)
    function safeActivate(modeType, setupCallback) {
        if (!isOnline) { showToast('❌ Không thể dịch mới khi đang offline!'); return; }
        disableAllModes();
        
        // Đánh thức hệ thống âm thanh mobile bằng chuỗi rỗng
        if (window.speechSynthesis) {
            try { window.speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch(e){}
        }

        // Tạo độ trễ 200ms giúp phần cứng di động giải phóng micro cũ hoàn toàn trước khi gán luồng mới
        setTimeout(() => {
            setupCallback();
        }, 200);
    }

    // ========== ĐĂNG KÝ SỰ KIỆN CLICK CHO CÁC NÚT ==========
    
    btnAnhViet.addEventListener('click', () => {
        quickBlink(btnAnhViet);
        if (!modeAnhVietActive) {
            safeActivate('AnhViet', () => {
                modeAnhVietActive = true;
                btnAnhViet.classList.add('active-mode');
                if (window.startListeningAnhViet) {
                    window.startListeningAnhViet((spokenText, translatedText) => {
                        addHistoryItem('Anh', spokenText, 'Việt', translatedText);
                        speakWithLanguage(translatedText, 'Việt');
                    });
                }
            });
        } else {
            disableAllModes();
        }
    });
    
    btnVietAnh.addEventListener('click', () => {
        quickBlink(btnVietAnh);
        if (!modeVietAnhActive) {
            safeActivate('VietAnh', () => {
                modeVietAnhActive = true;
                btnVietAnh.classList.add('active-mode');
                if (window.startListeningVietAnh) {
                    window.startListeningVietAnh((spokenText, translatedText) => {
                        addHistoryItem('Việt', spokenText, 'Anh', translatedText);
                        speakWithLanguage(translatedText, 'Anh');
                    });
                }
            });
        } else {
            disableAllModes();
        }
    });
    
    btnTrungViet.addEventListener('click', () => {
        quickBlink(btnTrungViet);
        if (!modeTrungVietActive) {
            safeActivate('TrungViet', () => {
                modeTrungVietActive = true;
                btnTrungViet.classList.add('active-mode');
                if (window.startListeningTrungViet) {
                    window.startListeningTrungViet((spokenText, translatedText) => {
                        addHistoryItem('Trung', spokenText, 'Việt', translatedText);
                        speakWithLanguage(translatedText, 'Việt');
                    });
                }
            });
        } else {
            disableAllModes();
        }
    });
    
    btnVietTrung.addEventListener('click', () => {
        quickBlink(btnVietTrung);
        if (!modeVietTrungActive) {
            safeActivate('VietTrung', () => {
                modeVietTrungActive = true;
                btnVietTrung.classList.add('active-mode');
                if (window.startListeningVietTrung) {
                    window.startListeningVietTrung((spokenText, translatedText) => {
                        addHistoryItem('Việt', spokenText, 'Trung', translatedText);
                        speakWithLanguage(translatedText, 'Trung');
                    });
                }
            });
        } else {
            disableAllModes();
        }
    });
    
    btnAnDoViet.addEventListener('click', () => {
        quickBlink(btnAnDoViet);
        if (!modeAnDoVietActive) {
            safeActivate('AnDoViet', () => {
                modeAnDoVietActive = true;
                btnAnDoViet.classList.add('active-mode');
                if (window.startListeningAnDoViet) {
                    window.startListeningAnDoViet((spokenText, translatedText) => {
                        addHistoryItem('Ấn', spokenText, 'Việt', translatedText);
                        speakWithLanguage(translatedText, 'Việt');
                    });
                }
            });
        } else {
            disableAllModes();
        }
    });
    
    btnVietAnDo.addEventListener('click', () => {
        quickBlink(btnVietAnDo);
        if (!modeVietAnDoActive) {
            safeActivate('VietAnDo', () => {
                modeVietAnDoActive = true;
                btnVietAnDo.classList.add('active-mode');
                if (window.startListeningVietAnDo) {
                    window.startListeningVietAnDo((spokenText, translatedText) => {
                        addHistoryItem('Việt', spokenText, 'Ấn', translatedText);
                        speakWithLanguage(translatedText, 'Ấn');
                    });
                }
            });
        } else {
            disableAllModes();
        }
    });
    
    btnMalaiViet.addEventListener('click', () => {
        quickBlink(btnMalaiViet);
        if (!modeMalaiVietActive) {
            safeActivate('MalaiViet', () => {
                modeMalaiVietActive = true;
                btnMalaiViet.classList.add('active-mode');
                if (window.startListeningMalaiViet) {
                    window.startListeningMalaiViet((spokenText, translatedText) => {
                        addHistoryItem('Malai', spokenText, 'Việt', translatedText);
                        speakWithLanguage(translatedText, 'Việt');
                    });
                }
            });
        } else {
            disableAllModes();
        }
    });
    
    btnVietMalai.addEventListener('click', () => {
        quickBlink(btnVietMalai);
        if (!modeVietMalaiActive) {
            safeActivate('VietMalai', () => {
                modeVietMalaiActive = true;
                btnVietMalai.classList.add('active-mode');
                if (window.startListeningVietMalai) {
                    window.startListeningVietMalai((spokenText, translatedText) => {
                        addHistoryItem('Việt', spokenText, 'Malai', translatedText);
                        speakWithLanguage(translatedText, 'Malai');
                    });
                }
            });
        } else {
            disableAllModes();
        }
    });
    
    btnPhapViet.addEventListener('click', () => {
        quickBlink(btnPhapViet);
        if (!modePhapVietActive) {
            safeActivate('PhapViet', () => {
                modePhapVietActive = true;
                btnPhapViet.classList.add('active-mode');
                if (window.startListeningPhapViet) {
                    window.startListeningPhapViet((spokenText, translatedText) => {
                        addHistoryItem('Pháp', spokenText, 'Việt', translatedText);
                        speakWithLanguage(translatedText, 'Việt');
                    });
                }
            });
        } else {
            disableAllModes();
        }
    });
    
    btnVietPhap.addEventListener('click', () => {
        quickBlink(btnVietPhap);
        if (!modeVietPhapActive) {
            safeActivate('VietPhap', () => {
                modeVietPhapActive = true;
                btnVietPhap.classList.add('active-mode');
                if (window.startListeningVietPhap) {
                    window.startListeningVietPhap((spokenText, translatedText) => {
                        addHistoryItem('Việt', spokenText, 'Pháp', translatedText);
                        speakWithLanguage(translatedText, 'Pháp');
                    });
                }
            });
        } else {
            disableAllModes();
        }
    });
    
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearAllHistory);
    }
    
    if (!window.speechSynthesis) {
        showToast('⚠️ Trình duyệt không hỗ trợ phát âm thanh');
    } else {
        try {
            window.speechSynthesis.cancel();
            const dummy = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(dummy);
        } catch(e) {}
    }
    
    if (!isOnline) showToast('⚠️ Đang offline. Chỉ có thể xem lại lịch sử.');
    renderHistory();
});