import Link from "next/link";

export default function AuthErrorPage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams.error ?? "Unknown";

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
      <p className="mb-4">Error: {error}</p>
      <Link href="/auth/signin" className="text-blue-500 underline">Back to Sign In</Link>
    </div>
  );
}
