"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 py-4 text-center text-emerald-400 text-xs">
      powered by{" "}
      <Link href="https://buildfastwithai.com">Build Fast with AI</Link> •{" "}
      {new Date().getFullYear()}
    </footer>
  );
}
