export default function MediosDePagoLayout({
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
