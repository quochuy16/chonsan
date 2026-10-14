export const metadata = { title: "Chính sách quyền riêng tư" };

export default function PolicyPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="h1 mb-4">Chính sách quyền riêng tư</h1>
      <div className="card space-y-4 text-sm leading-relaxed text-gray-700">
        <p className="rounded-xl bg-amber-50 p-3 text-amber-800">Bản nháp cho môi trường thử nghiệm. Cần luật sư rà soát trước khi ra mắt chính thức.</p>
        <section><h2 className="h2 mb-1">1. Dữ liệu chúng tôi thu thập</h2><p>Họ tên, email, số điện thoại, khu vực, trình độ; lịch đặt sân; thông tin đội bóng và thu chi quỹ đội mà bạn hoặc đội trưởng nhập.</p></section>
        <section><h2 className="h2 mb-1">2. Mục đích</h2><p>Để bạn đặt sân, chủ sân liên hệ xác nhận, đội bóng quản lý thành viên và quỹ, và các đội liên hệ nhau khi đã chốt kèo. Chúng tôi không bán dữ liệu của bạn.</p></section>
        <section><h2 className="h2 mb-1">3. Ai thấy số điện thoại của bạn</h2><p>Chủ sân và nhân viên của sân bạn đặt; đội trưởng đội đã chốt kèo với đội bạn; người đăng bài tìm người khi đã nhận bạn vào đá.</p></section>
        <section><h2 className="h2 mb-1">4. Thanh toán</h2><p>ChọnSân không giữ tiền. Tiền cọc và quỹ đội được chuyển khoản trực tiếp tới tài khoản chủ sân hoặc thủ quỹ qua mã VietQR.</p></section>
        <section><h2 className="h2 mb-1">5. Quyền của bạn (Nghị định 13/2023/NĐ-CP)</h2><p>Bạn có quyền xem, sửa và xóa dữ liệu cá nhân trong trang Tài khoản, và rút lại sự đồng ý bất kỳ lúc nào bằng cách xóa tài khoản.</p></section>
        <section><h2 className="h2 mb-1">6. Nội dung bị cấm</h2><p>Mọi hình thức cá cược, &quot;kèo có độ&quot;, lừa đảo, bạo lực. Vi phạm sẽ bị ẩn bài và khóa tài khoản.</p></section>
      </div>
    </div>
  );
}
