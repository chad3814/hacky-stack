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

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/applications"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Applications
            </Link>
            <Link
              href="/environments"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Environments
            </Link>
          </nav>

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

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-slate-200 dark:border-slate-700">
        <nav className="px-4 py-3 space-y-1">
          <Link
            href="/"
            className="block text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/applications"
            className="block text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Applications
          </Link>
          <Link
            href="/environments"
            className="block text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Environments
          </Link>
        </nav>
      </div>
    </header>
  );
}