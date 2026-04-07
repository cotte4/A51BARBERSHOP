import MusicHeartbeat from "@/components/MusicHeartbeat";
import RoleBottomNav from "@/components/navigation/RoleBottomNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MusicHeartbeat />
      <div className="pb-28">{children}</div>
      <RoleBottomNav isAdmin />
    </>
  );
}
