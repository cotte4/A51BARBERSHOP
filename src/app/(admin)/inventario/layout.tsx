export default function InventarioLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
