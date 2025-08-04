'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ApplicationDetailsModal from '@/components/application-details-modal'

interface ApplicationDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ApplicationDetailsPage({ params }: ApplicationDetailsPageProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)

  useEffect(() => {
    params.then(resolvedParams => {
      setApplicationId(resolvedParams.id)
    })
  }, [params])

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Open modal after component mounts
    setIsOpen(true)
  }, [session, status, router])

  const handleClose = () => {
    setIsOpen(false)
    // Small delay to allow modal close animation before navigation
    setTimeout(() => {
      router.push('/')
    }, 150)
  }

  if (status === 'loading') {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <p className="text-lg text-slate-600 dark:text-slate-300">Loading...</p>
        </div>
      </main>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      {/* Background page content (dashboard) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <p className="text-slate-600 dark:text-slate-400">
            Loading application details...
          </p>
        </div>
      </main>

      {/* Modal overlay */}
      {applicationId && (
        <ApplicationDetailsModal
          applicationId={applicationId}
          isOpen={isOpen}
          onClose={handleClose}
        />
      )}
    </>
  )
}