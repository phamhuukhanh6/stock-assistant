# Stock Assistant (Cloudflare Native) 🚀

Chatbot phân tích chứng khoán Việt Nam chuyên nghiệp cho nhà đầu tư F0, chạy hoàn toàn trên hạ tầng Cloudflare.

## 🏗️ Kiến trúc Hệ thống
- **Frontend:** React + Vite (Triển khai trên Cloudflare Pages)
- **Backend:** Hono Framework (Triển khai trên Cloudflare Workers)
- **Database:** Cloudflare D1 (Serverless SQL)
- **AI:** Google Gemini 3.5 Flash

## 📂 Cấu trúc Thư mục
- `/frontend`: Mã nguồn giao diện người dùng.
- `/worker-backend`: Logic xử lý API và AI (Đầu não của hệ thống).
- `/database`: Chứa schema để quản lý cấu trúc dữ liệu trên D1.
- `/knowledge`: Thư viện kiến thức bổ trợ cho AI.

## 🛠️ Quản lý & Vận hành

### 1. Thay đổi Giao diện (Frontend)
```bash
cd frontend
# Sửa code xong thì deploy
npx wrangler pages deploy dist --project-name=stock-assistant-web
```

### 2. Thay đổi Logic AI (Backend)
```bash
cd worker-backend
# Sửa code xong thì deploy
npx wrangler deploy
```

### 3. Thử nghiệm Local (An toàn)
Trong thư mục `worker-backend`, gõ:
```bash
npx wrangler dev
```

---
*Phát triển bởi Stock Assistant Team - 2026*
