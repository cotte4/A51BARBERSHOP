import MarcianoResetPage from "@/app/marciano/(public)/reset/page";

type MarcianosResetEntryPageProps = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

export default async function MarcianosResetEntryPage({
  searchParams,
}: MarcianosResetEntryPageProps) {
  return <MarcianoResetPage searchParams={searchParams} />;
}
