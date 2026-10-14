import { SubmitButton } from "@/components/submit-button";

/** Nút thao tác 1 chạm: form chứa đường dẫn quay lại + nút xác nhận (tùy chọn) */
export function ActionButton({ action, back, label, className, confirm }: {
  action: (form: FormData) => void;
  back: string;
  label: string;
  className: string;
  confirm?: string;
}) {
  return (
    <form action={action} className="inline">
      <input type="hidden" name="back" value={back} />
      <SubmitButton className={className} confirm={confirm}>{label}</SubmitButton>
    </form>
  );
}
