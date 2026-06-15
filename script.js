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
        if (modeAnhVietActive) disableAnhVietMode();
        if (modeVietAnhActive) disableVietAnhMode();
        if (modeTrungVietActive) disableTrungVietMode();
        if (modeVietTrungActive) disableVietTrungMode();
        if (modeAnDoVietActive) disableAnDoVietMode();
        if (modeVietAnDoActive) disableVietAnDoMode();
        if (modeMalaiVietActive) disableMalaiVietMode();
        if (modeVietMalaiActive) disableVietMalaiMode();
        if (modePhapVietActive) disablePhapVietMode();
        if (modeVietPhapActive) disableVietPhapMode();
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
    
    // Hàm phát âm thanh với đúng ngôn ngữ
    function speakWithLanguage(text, targetLang) {
        if (!text || text.trim() === '') {
            showToast('⚠️ Không có nội dung để phát');
            return;
        }
        
        // Xử lý riêng cho tiếng Malaysia
        if (targetLang.toUpperCase() === 'MALAI') {
            if (window.speakMalay) {
                window.speakMalay(text, showToast);
            } else {
                showToast('⚠️ Chưa tải xong giọng đọc Malaysia');
            }
            return;
        }
        
        // Xử lý riêng cho tiếng Pháp
        if (targetLang.toUpperCase() === 'PHÁP') {
            if (window.speakFrench) {
                window.speakFrench(text, showToast);
            } else {
                showToast('⚠️ Chưa tải xong giọng đọc Pháp');
            }
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
            
            console.log(`Phát âm: "${text}" | Ngôn ngữ: ${langCode} (${targetLang})`);
            
            utterance.onerror = (event) => {
                console.error('Phát âm lỗi:', event);
                showToast(`⚠️ Không thể phát âm thanh cho ${targetLang}`);
            };
            
            setTimeout(() => {
                window.speechSynthesis.speak(utterance);
            }, 50);
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
        
        history.forEach((item, index) => {
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
            
            // Tối ưu nút Phát lại trên Mobile
            const handlePlay = (e) => {
                e.preventDefault();
                e.stopPropagation();
                speakWithLanguage(item.translatedText, item.targetLang);
            };
            playBtn.addEventListener('touchend', handlePlay);
            playBtn.addEventListener('click', handlePlay);
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'action-btn';
            copyBtn.innerHTML = '📋 Copy';
            
            const handleCopy = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    await navigator.clipboard.writeText(item.translatedText);
                    copyBtn.innerHTML = '✅ Đã copy';
                    setTimeout(() => { copyBtn.innerHTML = '📋 Copy'; }, 1500);
                } catch (err) {
                    alert('Không thể copy');
                }
            };
            copyBtn.addEventListener('touchend', handleCopy);
            copyBtn.addEventListener('click', handleCopy);
            
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
    
    // ========== ANH - VIỆT ==========
    function enableAnhVietMode() {
        if (!isOnline) { showToast('❌ Không thể dịch mới khi đang offline!'); return; }
        modeAnhVietActive = true;
        btnAnhViet.classList.add('active-mode');
        if (window.startListeningAnhViet) {
            window.startListeningAnhViet((spokenText, translatedText) => {
                addHistoryItem('Anh', spokenText, 'Việt', translatedText);
                speakWithLanguage(translatedText, 'Việt');
            });
        }
    }
    
    function disableAnhVietMode() {
        modeAnhVietActive = false;
        btnAnhViet.classList.remove('active-mode');
        if (window.stopAnhVietListening) window.stopAnhVietListening();
    }
    
    // ========== VIỆT - ANH ==========
    function enableVietAnhMode() {
        if (!isOnline) { showToast('❌ Không thể dịch mới khi đang offline!'); return; }
        modeVietAnhActive = true;
        btnVietAnh.classList.add('active-mode');
        if (window.startListeningVietAnh) {
            window.startListeningVietAnh((spokenText, translatedText) => {
                addHistoryItem('Việt', spokenText, 'Anh', translatedText);
                speakWithLanguage(translatedText, 'Anh');
            });
        }
    }
    
    function disableVietAnhMode() {
        modeVietAnhActive = false;
        btnVietAnh.classList.remove('active-mode');
        if (window.stopVietAnhListening) window.stopVietAnhListening();
    }
    
    // ========== TRUNG - VIỆT ==========
    function enableTrungVietMode() {
        if (!isOnline) { showToast('❌ Không thể dịch mới khi đang offline!'); return; }
        modeTrungVietActive = true;
        btnTrungViet.classList.add('active-mode');
        if (window.startListeningTrungViet) {
            window.startListeningTrungViet((spokenText, translatedText) => {
                addHistoryItem('Trung', spokenText, 'Việt', translatedText);
                speakWithLanguage(translatedText, 'Việt');
            });
        }
    }
    
    function disableTrungVietMode() {
        modeTrungVietActive = false;
        btnTrungViet.classList.remove('active-mode');
        if (window.stopTrungVietListening) window.stopTrungVietListening();
    }
    
    // ========== VIỆT - TRUNG ==========
    function enableVietTrungMode() {
        if (!isOnline) { showToast('❌ Không thể dịch mới khi đang offline!'); return; }
        modeVietTrungActive = true;
        btnVietTrung.classList.add('active-mode');
        if (window.startListeningVietTrung) {
            window.startListeningVietTrung((spokenText, translatedText) => {
                addHistoryItem('Việt', spokenText, 'Trung', translatedText);
                speakWithLanguage(translatedText, 'Trung');
            });
        }
    }
    
    function disableVietTrungMode() {
        modeVietTrungActive = false;
        btnVietTrung.classList.remove('active-mode');
        if (window.stopVietTrungListening) window.stopVietTrungListening();
    }
    
    // ========== ẤN - VIỆT ==========
    function enableAnDoVietMode() {
        if (!isOnline) { showToast('❌ Không thể dịch mới khi đang offline!'); return; }
        modeAnDoVietActive = true;
        btnAnDoViet.classList.add('active-mode');
        if (window.startListeningAnDoViet) {
            window.startListeningAnDoViet((spokenText, translatedText) => {
                addHistoryItem('Ấn', spokenText, 'Việt', translatedText);
                speakWithLanguage(translatedText, 'Việt');
            });
        }
    }
    
    function disableAnDoVietMode() {
        modeAnDoVietActive = false;
        btnAnDoViet.classList.remove('active-mode');
        if (window.stopAnDoVietListening) window.stopAnDoVietListening();
    }
    
    // ========== VIỆT - ẤN ==========
    function enableVietAnDoMode() {
        if (!isOnline) { showToast('❌ Không thể dịch mới khi đang offline!'); return; }
        modeVietAnDoActive = true;
        btnVietAnDo.classList.add('active-mode');
        if (window.startListeningVietAnDo) {
            window.startListeningVietAnDo((spokenText, translatedText) => {
                addHistoryItem('Việt', spokenText, 'Ấn', translatedText);
                speakWithLanguage(translatedText, 'Ấn');
            });
        }
    }
    
    function disableVietAnDoMode() {
        modeVietAnDoActive = false;
        btnVietAnDo.classList.remove('active-mode');
        if (window.stopVietAnDoListening) window.stopVietAnDoListening();
    }
    
    // ========== MALAI - VIỆT ==========
    function enableMalaiVietMode() {
        if (!isOnline) { showToast('❌ Không thể dịch mới khi đang offline!'); return; }
        modeMalaiVietActive = true;
        btnMalaiViet.classList.add('active-mode');
        if (window.startListeningMalaiViet) {
            window.startListeningMalaiViet((spokenText, translatedText) => {
                addHistoryItem('Malai', spokenText, 'Việt', translatedText);
                speakWithLanguage(translatedText, 'Việt');
            });
        }
    }
    
    function disableMalaiVietMode() {
        modeMalaiVietActive = false;
        btnMalaiViet.classList.remove('active-mode');
        if (window.stopMalaiVietListening) window.stopMalaiVietListening();
    }
    
    // ========== VIỆT - MALAI ==========
    function enableVietMalaiMode() {
        if (!isOnline) { showToast('❌ Không thể dịch mới khi đang offline!'); return; }
        modeVietMalaiActive = true;
        btnVietMalai.classList.add('active-mode');
        if (window.startListeningVietMalai) {
            window.startListeningVietMalai((spokenText, translatedText) => {
                addHistoryItem('Việt', spokenText, 'Malai', translatedText);
                speakWithLanguage(translatedText, 'Malai');
            });
        }
    }
    
    function disableVietMalaiMode() {
        modeVietMalaiActive = false;
        btnVietMalai.classList.remove('active-mode');
        if (window.stopVietMalaiListening) window.stopVietMalaiListening();
    }
    
    // ========== PHÁP - VIỆT ==========
    function enablePhapVietMode() {
        if (!isOnline) { showToast('❌ Không thể dịch mới khi đang offline!'); return; }
        modePhapVietActive = true;
        btnPhapViet.classList.add('active-mode');
        if (window.startListeningPhapViet) {
            window.startListeningPhapViet((spokenText, translatedText) => {
                addHistoryItem('Pháp', spokenText, 'Việt', translatedText);
                speakWithLanguage(translatedText, 'Việt');
            });
        }
    }
    
    function disablePhapVietMode() {
        modePhapVietActive = false;
        btnPhapViet.classList.remove('active-mode');
        if (window.stopPhapVietListening) window.stopPhapVietListening();
    }
    
    // ========== VIỆT - PHÁP ==========
    function enableVietPhapMode() {
        if (!isOnline) { showToast('❌ Không thể dịch mới khi đang offline!'); return; }
        modeVietPhapActive = true;
        btnVietPhap.classList.add('active-mode');
        if (window.startListeningVietPhap) {
            window.startListeningVietPhap((spokenText, translatedText) => {
                addHistoryItem('Việt', spokenText, 'Pháp', translatedText);
                speakWithLanguage(translatedText, 'Pháp');
            });
        }
    }
    
    function disableVietPhapMode() {
        modeVietPhapActive = false;
        btnVietPhap.classList.remove('active-mode');
        if (window.stopVietPhapListening) window.stopVietPhapListening();
    }
    
    // ========== GÁN SỰ KIỆN NÚT ==========
    function disableAllModes() {
        if (modeAnhVietActive) disableAnhVietMode();
        if (modeVietAnhActive) disableVietAnhMode();
        if (modeTrungVietActive) disableTrungVietMode();
        if (modeVietTrungActive) disableVietTrungMode();
        if (modeAnDoVietActive) disableAnDoVietMode();
        if (modeVietAnDoActive) disableVietAnDoMode();
        if (modeMalaiVietActive) disableMalaiVietMode();
        if (modeVietMalaiActive) disableVietMalaiMode();
        if (modePhapVietActive) disablePhapVietMode();
        if (modeVietPhapActive) disableVietPhapMode();
    }
    
    // Hàm phụ trợ gán bộ lắng nghe đa nền tảng (Tương thích tốt Touch mobile và Click desktop)
    function bindVoiceButtonEvent(btn, modeActiveVar, enableFunc, disableFunc) {
        if (!btn) return;
        
        const handler = (e) => {
            e.preventDefault(); // Ngăn hành vi kích hoạt trùng lặp trên mobile
            quickBlink(btn);
            
            // Mẹo kích hoạt Audio context rỗng trên iOS di động ngay khi chạm vào nút
            if (window.speechSynthesis) {
                try {
                    const dummy = new SpeechSynthesisUtterance('');
                    window.speechSynthesis.speak(dummy);
                } catch(err) {}
            }
            
            if (!modeActiveVar()) {
                disableAllModes();
                enableFunc();
            } else {
                disableFunc();
            }
        };
        
        btn.addEventListener('touchend', handler);
        btn.addEventListener('click', handler);
    }
    
    // Gán sự kiện đồng bộ cho tất cả các cặp nút ngôn ngữ
    bindVoiceButtonEvent(btnAnhViet, () => modeAnhVietActive, enableAnhVietMode, disableAnhVietMode);
    bindVoiceButtonEvent(btnVietAnh, () => modeVietAnhActive, enableVietAnhMode, disableVietAnhMode);
    bindVoiceButtonEvent(btnTrungViet, () => modeTrungVietActive, enableTrungVietMode, disableTrungVietMode);
    bindVoiceButtonEvent(btnVietTrung, () => modeVietTrungActive, enableVietTrungMode, disableVietTrungMode);
    bindVoiceButtonEvent(btnAnDoViet, () => modeAnDoVietActive, enableAnDoVietMode, disableAnDoVietMode);
    bindVoiceButtonEvent(btnVietAnDo, () => modeVietAnDoActive, enableVietAnDoMode, disableVietAnDoMode);
    bindVoiceButtonEvent(btnMalaiViet, () => modeMalaiVietActive, enableMalaiVietMode, disableMalaiVietMode);
    bindVoiceButtonEvent(btnVietMalai, () => modeVietMalaiActive, enableVietMalaiMode, disableVietMalaiMode);
    bindVoiceButtonEvent(btnPhapViet, () => modePhapVietActive, enablePhapVietMode, disablePhapVietMode);
    bindVoiceButtonEvent(btnVietPhap, () => modeVietPhapActive, enableVietPhapMode, disableVietPhapMode);
    
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearAllHistory);
    }
    
    if (!window.speechSynthesis) {
        showToast('⚠️ Trình duyệt không hỗ trợ phát âm thanh');
    } else {
        try {
            const dummy = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(dummy);
            window.speechSynthesis.cancel();
        } catch(e) {}
    }
    
    if (!isOnline) showToast('⚠️ Đang offline. Chỉ có thể xem lại lịch sử.');
    renderHistory();
});