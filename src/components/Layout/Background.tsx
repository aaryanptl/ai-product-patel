"use client";

export default function Background() {
  return (
    <div className="fixed inset-0 z-0 opacity-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent_70%)]" />
      <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
      <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
      <div className="absolute left-0 h-full w-px bg-gradient-to-b from-transparent via-emerald-500 to-transparent" />
      <div className="absolute right-0 h-full w-px bg-gradient-to-b from-transparent via-emerald-500 to-transparent" />
    </div>
  );
}
