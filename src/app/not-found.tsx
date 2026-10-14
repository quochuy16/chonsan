import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page max-w-md py-20 text-center">
      <p className="text-5xl">🥅</p>
      <h1 className="h1 mt-3">Bóng ra ngoài biên rồi!</h1>
      <p className="muted mt-2">Trang bạn tìm không tồn tại hoặc bạn không có quyền xem.</p>
      <Link href="/" className="btn-primary mt-5">Về trang chủ</Link>
    </div>
  );
}
