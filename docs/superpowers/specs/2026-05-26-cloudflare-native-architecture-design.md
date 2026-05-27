# Bản thiết kế: Kiến trúc Cloudflare Native (Stock Assistant)

## 1. Mục tiêu (Objective)
Tối ưu hóa hoàn toàn dự án để chạy ổn định trên hạ tầng Cloudflare, loại bỏ các thành phần mã nguồn cũ không còn giá trị sử dụng, và tạo ra cấu trúc thư mục dễ quản lý cho nhà phát triển.

## 2. Kiến trúc Hệ thống (System Architecture)
Hệ thống được chia làm 3 thành phần chính chạy hoàn toàn trên Cloudflare:
- **Frontend:** Ứng dụng React (Vite) triển khai trên **Cloudflare Pages**. Kết nối với Backend thông qua biến môi trường `VITE_API_URL`.
- **Backend:** API Serverless sử dụng framework **Hono**, triển khai trên **Cloudflare Workers**. Xử lý logic AI (Gemini), trích xuất dữ liệu chứng khoán và xác thực người dùng.
- **Database:** Sử dụng **Cloudflare D1** để lưu trữ thông tin người dùng và lịch sử trò chuyện.

## 3. Cấu trúc Thư mục (Directory Structure)
```text
/ (Project Root)
├── frontend/             # Giao diện người dùng (Cloudflare Pages)
│   ├── src/              # Mã nguồn React/TypeScript
│   └── dist/             # Dữ liệu sau khi build
├── worker-backend/       # Logic xử lý (Cloudflare Workers)
│   ├── src/index.js      # Điểm đầu vào API (Hono)
│   ├── src/utils.js      # Tiện ích xây dựng Prompt & xử lý tin nhắn
│   └── wrangler.toml     # Cấu hình triển khai Worker & D1
├── database/             # Quản lý cơ sở dữ liệu
│   └── schema.sql        # Cấu trúc bảng cho Cloudflare D1
├── knowledge/            # Dữ liệu kiến thức hỗ trợ AI
└── DEPLOYMENT.md         # Hướng dẫn vận hành và triển khai duy nhất
```

## 4. Kế hoạch Thực hiện (Implementation Plan)

### Giai đoạn 1: Dọn dẹp (Cleanup)
- Xóa bỏ thư mục `backend/` (Node.js cũ).
- Xóa bỏ thư mục `claude-code-templates/` (Các mẫu không sử dụng).
- Loại bỏ các file cấu hình thừa tại thư mục gốc.

### Giai đoạn 2: Cố định Cấu hình (Finalizing Configuration)
- Đảm bảo `worker-backend/wrangler.toml` chứa đúng `database_id`.
- Kiểm tra các Secrets trên Cloudflare (`GOOGLE_API_KEY`, `VNSTOCK_API_KEY`) đã khớp với file `.env` cũ.
- Cập nhật `frontend/src/App.tsx` để mặc định sử dụng URL Worker.

### Giai đoạn 3: Kiểm thử & Bàn giao (Validation & Handover)
- Chạy thử nghiệm local bằng `wrangler dev`.
- Triển khai bản "sạch" cuối cùng lên Cloudflare.
- Cập nhật README.md với cấu trúc mới.

## 5. Success Criteria
- [ ] Truy cập được [https://stock-assistant-web.pages.dev](https://stock-assistant-web.pages.dev)
- [ ] Đăng nhập/Đăng ký thành công (Dữ liệu lưu vào D1).
- [ ] Chatbot trả lời đầy đủ, không bị cắt ngắn, sử dụng model Gemini 3.5 Flash.
- [ ] Thư mục gốc dự án gọn gàng, chỉ còn lại code thực sự chạy.
