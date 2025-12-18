# Tối ưu tốc độ vs chất lượng (Llama local chấm TOEIC Writing)

## Mục tiêu
- Giữ feedback chi tiết, tiếng Việt, JSON chuẩn.
- Rút ngắn thời gian chấm 8 câu (hiện ~5 phút) để thân thiện hơn với người luyện tập và người review.

## Các hướng tối ưu
1) Prompt & tham số
- Rút gọn prompt (tiêu chí ngắn, vẫn yêu cầu JSON + tiếng Việt).
- Temperature thấp (0–0.3), giới hạn max tokens vừa đủ cho JSON + feedback (~120-150 từ).
- Tiếp tục dùng format JSON để giảm lạc đề.

2) Pipeline chấm 8 câu
- Chấm song song từng câu (8 worker) thay vì gộp 8 câu vào 1 prompt.
- Nếu cần 1 request: batch 2-3 câu/lần để prompt không quá dài.
- Cache theo (prompt, answer) để lần chấm lại gần như tức thời.

3) Mô hình
- Thử model nhỏ hơn/quant (vd: llama3.1:7b, q4/q5) để giảm latency; bù bằng prompt rõ + fallback tự sinh.
- Nếu GPU yếu/không ổn định: cân nhắc chạy CPU với quant nhẹ + song song nhiều process nhỏ.
- Nếu đủ tài nguyên: dùng bản instruct tối ưu tốc độ (nếu có) thay bản base.

4) Cấu hình Ollama
- Điều chỉnh num_thread phù hợp, tránh oversubscribe CPU.
- Giữ context ngắn (prompt gọn, max tokens giới hạn).
- Preload model (gọi dummy) khi khởi động service để tránh cold start.

5) UX che giấu độ trễ
- Hiển thị tiến trình “đang chấm X/8”, stream kết quả từng câu ngay khi xong.
- Cho phép xem “feedback ngắn” trước, “feedback đầy đủ” sau (2 mức dung lượng token).

6) Khuyến nghị thực hiện trước
- Chuyển chấm sang song song từng câu + thử model nhỏ (7B hoặc quant q4/q5).
- Đặt feedback target ~120-150 từ để đủ sâu nhưng không quá dài.
- Giữ fallback tự sinh khi model trả thiếu để đảm bảo tối thiểu chất lượng.
 - Thử hybrid song song: Gemini trả điểm nhanh, Llama chỉ lo feedback (hoặc chạy song song, hiển thị điểm trước, feedback sau).

## Việc cần làm (đề xuất)
- Triển khai song song chấm 8 câu ở service local, giới hạn max tokens, test lại thời gian.
- Benchmark model 7B/q4 so với 8B hiện tại (độ dài feedback + latency).

## Tiến độ cập nhật
- Đã triển khai luồng hybrid: Gemini lấy điểm tổng nhanh, Llama local trả feedback chi tiết; kết quả Llama được đính kèm state để hiển thị ở trang review.
- Tách riêng giao diện `attemptWritingPage.jsx` với CSS mới, nút “Nộp bài” mở dropdown gọn gàng, toàn bộ copy tiếng Việt (UTF-8).
- Fix hiển thị câu hỏi/feedback để tránh lỗi font và tràn layout khi hiện nhiều lựa chọn nộp bài.
