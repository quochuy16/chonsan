import { requireUser } from "@/lib/server/auth";
import { Flash } from "@/components/flash";
import { TeamForm } from "../team-form";
import { createTeamAction } from "../actions";

export const metadata = { title: "Tạo đội bóng" };

export default async function NewTeamPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireUser("/doi/moi");
  const sp = await searchParams;
  return (
    <div className="container-page max-w-2xl py-8">
      <h1 className="h1 mb-1">Tạo đội bóng</h1>
      <p className="muted mb-5">Bạn sẽ là đội trưởng. Sau đó gửi link mời cho anh em vào đội.</p>
      <Flash searchParams={sp} />
      <div className="card"><TeamForm action={createTeamAction} submitLabel="Tạo đội" /></div>
    </div>
  );
}
