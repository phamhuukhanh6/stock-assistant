# Hướng dẫn Triển khai VN30Stock Analysist Chatbot

Tài liệu này hướng dẫn bạn cách đưa toàn bộ ứng dụng VN30Stock Analysist Chatbot (bao gồm Frontend, Backend và Database) lên hạ tầng Cloudflare.

## 1. Yêu cầu chuẩn bị
- Đã cài đặt [Node.js](https://nodejs.org/) (phiên bản 18 trở lên).
- Có tài khoản [Cloudflare](https://dash.cloudflare.com/).
- Đã cài đặt `wrangler` (Cloudflare CLI): `npm install -g wrangler`

---

## 2. Triển khai Cơ sở dữ liệu (Cloudflare D1)

1. **Đăng nhập vào Cloudflare:**
   ```bash
   npx wrangler login
   ```

2. **Tạo Database D1:**
   ```bash
   npx wrangler d1 create vn30stock-analysist-db
   ```
   *Lưu ý: Sau khi tạo, hãy copy `database_id` và dán vào file `worker-backend/wrangler.toml` tại dòng `database_id = "..."`.*

3. **Khởi tạo cấu trúc bảng (Schema):**
   ```bash
   npx wrangler d1 execute vn30stock-analysist-db --file=database/schema.sql
   ```

---

## 3. Triển khai Backend (Cloudflare Workers)

1. **Cài đặt thư viện cho Backend:**
   ```bash
   cd worker-backend
   npm install
   ```

2. **Cấu hình các biến bí mật (Secrets):**
   Bạn cần nạp các API Key của mình vào Cloudflare Workers một cách bảo mật:
   ```bash
   npx wrangler secret put GOOGLE_API_KEY
   npx wrangler secret put VNSTOCK_API_KEY
   npx wrangler secret put JWT_SECRET
   ```

3. **Deploy Backend:**
   ```bash
   npx wrangler deploy
   ```
   *Sau khi lệnh hoàn tất, bạn sẽ nhận được một URL của Worker (ví dụ: `https://vn30stock-analysist-api.yourname.workers.dev`). Hãy copy URL này.*

---

## 4. Triển khai Frontend (Cloudflare Pages)

1. **Cài đặt thư viện cho Frontend:**
   ```bash
   cd ../frontend
   npm install
   ```

2. **Build dự án với URL API mới:**
   Sử dụng URL Worker bạn vừa nhận được ở bước trên (thêm `/api` vào cuối):
   ```bash
   VITE_API_URL=https://vn30stock-analysist-api.yourname.workers.dev/api npm run build
   ```

3. **Triển khai lên Cloudflare Pages:**
   ```bash
   npx wrangler pages deploy dist --project-name=stock-assistant-web
   ```

---

## 5. Hoàn tất
Chúc mừng! Ứng dụng của bạn hiện đã chạy hoàn toàn trên Cloudflare.
- **Frontend:** Truy cập qua URL của Cloudflare Pages.
- **Backend:** Chạy trên Cloudflare Workers.
- **Database:** Lưu trữ trên Cloudflare D1.

Nếu bạn có bất kỳ thay đổi nào về code trong tương lai, chỉ cần chạy lại lệnh `deploy` tương ứng.
