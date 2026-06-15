// config.js - Cấu hình chung cho toàn bộ dự án

// ========== CẤU HÌNH MODEL ==========
const MODEL_NAME = "llama3-70b-8192";

// ========== CẤU HÌNH API ==========
const WORKER_URL = "/api/groq-proxy";

// ========== HÀM GỌI API DÙNG CHUNG ==========
async function callApi(prompt, modelName = MODEL_NAME) {
    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelName,
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
                max_tokens: 300
            })
        });
        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            let translated = data.choices[0].message.content.trim();
            translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '');
            translated = translated.replace(/^(dịch|translation|translate|kết quả|result|answer|double-checking|Double-checking):\s*/i, '');
            translated = translated.replace(/^["']|["']$/g, '');
            
            if (translated.includes('\n')) {
                const lines = translated.split('\n');
                translated = lines[lines.length - 1].trim();
            }
            return translated;
        }
        return "[Lỗi dịch]";
    } catch (err) {
        console.error("API error:", err);
        return "[Lỗi kết nối]";
    }
}

// 👇 EXPORT CẢ 2 TÊN HÀM để tương thích
const callGroqAPI = callApi;
const callApi = callApi;  // Thêm dòng này