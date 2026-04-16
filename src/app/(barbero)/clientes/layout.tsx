export default function ClientesLayout({
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
