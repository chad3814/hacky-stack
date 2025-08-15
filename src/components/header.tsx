"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src="/hacky-stack.png"
              alt="HackyStack"
              width={32}
              height={32}
              className="rounded"
            />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                HackyStack
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
                Environment Management
              </p>
            </div>
          </Link>


          {/* User Menu */}
          <div className="flex items-center">
            {session ? (
              <UserMenu />
            ) : (
              <Link
                href="/auth/signin"
                className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

    </header>
  );
}