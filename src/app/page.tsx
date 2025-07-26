"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  
  if (status === "loading") {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <p className="text-lg text-slate-600 dark:text-slate-300">Loading...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
              Welcome to HackyStack
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Manage your applications&apos; environments and deployments with ease. 
              Deploy to Kubernetes on AWS EC2 instances with confidence.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
              Get Started
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Sign in to start managing your applications and deployments.
            </p>
            <Link 
              href="/auth/signin"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Application Management</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Organize and track your apps</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Environment Control</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Manage dev, staging, production</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Secure Secrets</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Safely store configuration</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            Welcome back, {session?.user?.name}!
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Manage your applications&apos; environments and deployments with ease. 
            Deploy to Kubernetes on AWS EC2 instances with confidence.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors">
              <h3 className="font-medium text-blue-900 dark:text-blue-100">Create Application</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Set up a new application</p>
            </button>
            <button className="p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800 transition-colors">
              <h3 className="font-medium text-green-900 dark:text-green-100">View Applications</h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">Manage existing applications</p>
            </button>
          </div>
        </div>

        {/* Stats or recent activity could go here */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Applications</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Environments</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Secrets</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
