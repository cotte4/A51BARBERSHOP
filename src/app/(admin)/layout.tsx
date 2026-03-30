import AdminBottomNav from "@/components/admin/AdminBottomNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-28">{children}</div>
      <AdminBottomNav />
    </>
  );
}
