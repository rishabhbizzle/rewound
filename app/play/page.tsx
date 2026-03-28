"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

function RedirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  useEffect(() => {
    if (id) {
      router.replace(`/v/${id}`);
    } else {
      router.replace("/");
    }
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
        </div>
      }
    >
      <RedirectContent />
    </Suspense>
  );
}
