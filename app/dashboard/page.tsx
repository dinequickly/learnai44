'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/navbar'
import { getStudySets, type StudySet } from '@/lib/supabase-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    }
  }

  // Use React Query for data fetching
  const { data: studySets = [], isLoading, error } = useQuery({
    queryKey: ['study-sets', userId],
    queryFn: () => getStudySets(userId!),
    enabled: !!userId,
  })

  const handleCardClick = (studySetId: string) => {
    router.push(`/study-set/${studySetId}`)
  }

  const handleCreateNew = () => {
    // TODO: Navigate to create study set page
    alert('Create new study set feature coming soon!')
  }

  if (isLoading || !userId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600 dark:text-gray-400">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Error loading study sets
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Please try refreshing the page
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Your Study Sets
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {studySets.length} {studySets.length === 1 ? 'set' : 'sets'} available
            </p>
          </div>
          <Button onClick={handleCreateNew}>
            Create New Set
          </Button>
        </div>

        {/* Study Sets Grid */}
        {studySets.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No study sets yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create your first study set to get started!
                </p>
                <Button onClick={handleCreateNew}>
                  Create Your First Set
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {studySets.map((set) => (
              <Card
                key={set.id}
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-blue-500"
                onClick={() => handleCardClick(set.id)}
              >
                <CardHeader>
                  <CardTitle className="text-xl line-clamp-2">
                    {set.title}
                  </CardTitle>
                  {set.description && (
                    <CardDescription className="line-clamp-2">
                      {set.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      <span>
                        {set.flashcard_count || 0} {set.flashcard_count === 1 ? 'card' : 'cards'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {new Date(set.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
