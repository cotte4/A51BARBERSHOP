import RoleBottomNav from "@/components/navigation/RoleBottomNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-28">{children}</div>
      <RoleBottomNav isAdmin />
    </>
  );
}
